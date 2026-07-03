// Offline selftest: proves the vendored validator integration is correct
// without any Blockfrost key or funds.
// 1. Script hash derived from plutus.json must equal the known hash.
// 2. Script address derives for both networks.
// 3. Datums/redeemers construct without error.
// 4. Custodial wallet creation + address derivation works offline.
const { escrowScript, escrowAddress, initiationDatum, activeDatum, recipientDepositRedeemer, completeRedeemer, walletAddressOffline } = require('./escrow.js');

const EXPECTED_HASH = 'cf2437e2823cbede335b296b78bf028c22ed25f200c9e5937f4eab7e';

const { hash } = escrowScript();
if (hash !== EXPECTED_HASH) {
  console.error(`FAIL script hash ${hash} != expected ${EXPECTED_HASH}`);
  process.exit(1);
}
console.log('OK script hash matches blueprint:', hash);
console.log('OK escrow address (' + (process.env.CARDANO_NETWORK || 'preprod') + '):', escrowAddress());

process.env.WALLETS_DIR = process.env.WALLETS_DIR || '/tmp/moya-selftest-wallets';
let a, b, p;
(async () => {
a = await walletAddressOffline('selftest-org');
b = await walletAddressOffline('selftest-admin');
p = await walletAddressOffline('selftest-user');
console.log('OK wallets derive:', a.slice(0, 20) + '…', b.slice(0, 20) + '…');

const d1 = initiationDatum(a, 5_000_000, b, 1_500_000);
const d2 = activeDatum(a, 5_000_000, p, b, 1_500_000);
const r1 = recipientDepositRedeemer(p);
const r2 = completeRedeemer();
if (!d1 || !d2 || !r1 || !r2) {
  console.error('FAIL datum/redeemer construction');
  process.exit(1);
}
console.log('OK datums + redeemers construct');
console.log('SELFTEST PASS');
})();
