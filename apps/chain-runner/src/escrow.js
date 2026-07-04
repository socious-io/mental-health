// Escrow operations against the Socious escrow validator
// (contracts/aiken-contracts — GPL-3.0, ported from MeshJS escrow).
// Datum/redeemer layout per lib/escrow/types.ak:
//   Initiation{initiator, initiator_assets, fee_address, fee_assets}      (constr 0)
//   ActiveEscrow{initiator, initiator_assets, recipient, recipient_assets,
//                fee_address, fee_assets}                                  (constr 1)
//   RecipientDeposit{recipient, recipient_assets} | CancelTrade | CompleteTrade
const fs = require('node:fs');
const path = require('node:path');
const {
  BlockfrostProvider,
  MeshWallet,
  MeshTxBuilder,
  serializePlutusScript,
  conStr0,
  conStr1,
  conStr2,
  pubKeyAddress,
  value,
  DEFAULT_REDEEMER_BUDGET,
} = require('@meshsdk/core');
const { deserializeAddress } = require('@meshsdk/core');

const plutus = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../contracts/aiken-contracts/plutus.json'), 'utf8'),
);

const NETWORK = process.env.CARDANO_NETWORK || 'preprod';
const NETWORK_ID = NETWORK === 'mainnet' ? 1 : 0;

function escrowScript() {
  const v = plutus.validators.find((x) => x.title === 'escrow.escrow');
  return { code: v.compiledCode, hash: v.hash, version: 'V2' };
}

function escrowAddress() {
  const { code } = escrowScript();
  return serializePlutusScript({ code, version: 'V2' }, undefined, NETWORK_ID).address;
}

function provider() {
  const key = process.env.BLOCKFROST_API_KEY;
  if (!key) throw new Error('BLOCKFROST_API_KEY not set');
  return new BlockfrostProvider(key);
}

const WALLETS_DIR = process.env.WALLETS_DIR || '/app/wallets';

function readOrBrew(name) {
  const file = path.join(WALLETS_DIR, `${name}.json`);
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, 'utf8')).mnemonic;
  }
  const mnemonic = MeshWallet.brew();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ mnemonic }), { mode: 0o600 });
  return mnemonic;
}

async function loadOrCreateWallet(name) {
  const bf = provider();
  const w = new MeshWallet({
    networkId: NETWORK_ID,
    fetcher: bf,
    submitter: bf,
    key: { type: 'mnemonic', words: readOrBrew(name) },
  });
  return w;
}

async function walletAddressOffline(name) {
  // Address derivation without a Blockfrost key (selftest / wallet creation).
  const w = new MeshWallet({ networkId: NETWORK_ID, key: { type: 'mnemonic', words: readOrBrew(name) } });
  return await w.getChangeAddress();
}

function mAddress(bech32) {
  const { pubKeyHash, stakeCredentialHash } = deserializeAddress(bech32);
  return pubKeyAddress(pubKeyHash, stakeCredentialHash || undefined);
}
const emptyAssets = [];

const lovelaceValue = (n) => [{ unit: 'lovelace', quantity: String(n) }];

// Blockfrost can't serve a UTxO until its tx is on-chain — poll up to ~4 min.
async function waitForUtxo(bf, txHash, outputIndex) {
  for (let i = 0; i < 24; i++) {
    try {
      const utxos = await bf.fetchUTxOs(txHash);
      const u = utxos.find((x) => x.input.outputIndex === Number(outputIndex));
      if (u) return u;
    } catch { /* not yet indexed */ }
    await new Promise((r) => setTimeout(r, 10_000));
  }
  throw new Error(`utxo ${txHash}#${outputIndex} not found after waiting`);
}
// JSON-typed constructors exactly as the vendored offchain.ts builds them.
function initiationDatum(orgAddr, lovelace, feeAddr, feeLovelace) {
  return conStr0([mAddress(orgAddr), value(lovelaceValue(lovelace)), mAddress(feeAddr), value(lovelaceValue(feeLovelace))]);
}

function activeDatum(orgAddr, lovelace, recipientAddr, feeAddr, feeLovelace) {
  return conStr1([
    mAddress(orgAddr), value(lovelaceValue(lovelace)),
    mAddress(recipientAddr), value(emptyAssets),
    mAddress(feeAddr), value(lovelaceValue(feeLovelace)),
  ]);
}

const recipientDepositRedeemer = (recipientAddr) => conStr0([mAddress(recipientAddr), value(emptyAssets)]);
const cancelRedeemer = () => conStr1([]);
const completeRedeemer = () => conStr2([]);

const FEE_LOVELACE = 1_500_000; // platform fee kept minimal for milestone evidence

async function newTxBuilder(bf) {
  return new MeshTxBuilder({ fetcher: bf, submitter: bf, verbose: false });
}

// Step 1 — org locks the reward at the script with Initiation datum.
async function initiate({ lovelace }) {
  const bf = provider();
  const org = await loadOrCreateWallet('org');
  const admin = await loadOrCreateWallet('admin');
  const orgAddr = (await org.getUsedAddresses())[0] ?? (await org.getUnusedAddresses())[0];
  const adminAddr = (await admin.getUsedAddresses())[0] ?? (await admin.getUnusedAddresses())[0];
  const utxos = await org.getUtxos();
  const total = Number(lovelace) + FEE_LOVELACE;
  const txb = await newTxBuilder(bf);
  await txb
    .txOut(escrowAddress(), lovelaceValue(total))
    .txOutInlineDatumValue(initiationDatum(orgAddr, lovelace, adminAddr, FEE_LOVELACE), 'JSON')
    .changeAddress(orgAddr)
    .selectUtxosFrom(utxos)
    .complete();
  const signed = await org.signTx(txb.txHex);
  const txHash = await org.submitTx(signed);
  return { tx_hash: txHash, utxo: `${txHash}#0`, escrow_address: escrowAddress(), org_addr: orgAddr };
}

// Step 2 — bind participant (RecipientDeposit, recipient deposits nothing).
async function bind({ escrow_utxo, participant_wallet, org_addr, lovelace }) {
  const bf = provider();
  const participant = await loadOrCreateWallet(participant_wallet);
  // Ensure the participant custodial wallet can pay fees + provide collateral.
  {
    const have = await participant.getUtxos();
    const total = have.reduce((n, u) => n + Number(u.output.amount.find((a) => a.unit === 'lovelace')?.quantity || 0), 0);
    if (total < 5_000_000) {
      const pAddr0 = (await participant.getUsedAddresses())[0] ?? (await participant.getUnusedAddresses())[0];
      await fundInternal({ to: pAddr0, lovelace: 6_000_000 });
      await new Promise((r) => setTimeout(r, 40_000)); // wait for confirmation
    }
  }
  const admin = await loadOrCreateWallet('admin');
  const pAddr = (await participant.getUsedAddresses())[0] ?? (await participant.getUnusedAddresses())[0];
  const adminAddr = (await admin.getUsedAddresses())[0] ?? (await admin.getUnusedAddresses())[0];
  const [txHash, idxStr] = escrow_utxo.split('#');
  const sUtxo = await waitForUtxo(bf, txHash, idxStr);
  const pUtxos = await participant.getUtxos();
  const { code } = escrowScript();
  const txb = await newTxBuilder(bf);
  await txb
    .spendingPlutusScriptV2()
    .txIn(txHash, Number(idxStr), sUtxo.output.amount, escrowAddress())
    .txInInlineDatumPresent()
    .txInRedeemerValue(recipientDepositRedeemer(pAddr), 'JSON', DEFAULT_REDEEMER_BUDGET)
    .txInScript(code)
    .txOut(escrowAddress(), sUtxo.output.amount)
    .txOutInlineDatumValue(activeDatum(org_addr, lovelace, pAddr, adminAddr, FEE_LOVELACE), 'JSON')
    .changeAddress(pAddr)
    .selectUtxosFrom(pUtxos)
    .requiredSignerHash(deserializeAddress(pAddr).pubKeyHash)
    .complete();
  const signed = await participant.signTx(txb.txHex);
  const newHash = await participant.submitTx(signed);
  return { tx_hash: newHash, utxo: `${newHash}#0` };
}

// Step 3 — admin (fee key) releases: reward -> participant, fee -> admin.
async function release({ escrow_utxo, reward_address, lovelace }) {
  const bf = provider();
  const admin = await loadOrCreateWallet('admin');
  const adminAddr = (await admin.getUsedAddresses())[0] ?? (await admin.getUnusedAddresses())[0];
  const [txHash, idxStr] = escrow_utxo.split('#');
  const sUtxo = await waitForUtxo(bf, txHash, idxStr);
  const aUtxos = await admin.getUtxos();
  const { code } = escrowScript();
  const txb = await newTxBuilder(bf);
  await txb
    .spendingPlutusScriptV2()
    .txIn(txHash, Number(idxStr), sUtxo.output.amount, escrowAddress())
    .txInInlineDatumPresent()
    .txInRedeemerValue(completeRedeemer(), 'JSON', DEFAULT_REDEEMER_BUDGET)
    .txInScript(code)
    .txOut(reward_address, lovelaceValue(lovelace))
    .txOut(adminAddr, lovelaceValue(FEE_LOVELACE))
    .changeAddress(adminAddr)
    .selectUtxosFrom(aUtxos)
    .requiredSignerHash(deserializeAddress(adminAddr).pubKeyHash)
    .complete();
  const signed = await admin.signTx(txb.txHex);
  const newHash = await admin.submitTx(signed);
  return { tx_hash: newHash };
}

module.exports = {
  NETWORK, escrowScript, escrowAddress, provider, loadOrCreateWallet,
  walletAddressOffline, initiationDatum, activeDatum,
  recipientDepositRedeemer, cancelRedeemer, completeRedeemer,
  initiate, bind, release,
};

// Simple payment from the org custodial wallet (funds admin/participant wallets
// for fees + collateral on preprod).
async function fundInternal({ to, lovelace }) {
  const bf = provider();
  const org = await loadOrCreateWallet('org');
  const orgAddr = (await org.getUsedAddresses())[0] ?? (await org.getUnusedAddresses())[0];
  const utxos = await org.getUtxos();
  const txb = await newTxBuilder(bf);
  await txb
    .txOut(to, [{ unit: 'lovelace', quantity: String(lovelace) }])
    .changeAddress(orgAddr)
    .selectUtxosFrom(utxos)
    .complete();
  const signed = await org.signTx(txb.txHex);
  const txHash = await org.submitTx(signed);
  return { tx_hash: txHash };
}
module.exports.fund = fundInternal;
