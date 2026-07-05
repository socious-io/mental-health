# Moya（モヤ）

**Anonymous mental-health screening, support matching, and research participation — verified with your wallet, never your identity.**

**匿名のメンタルヘルス・スクリーニング、支援マッチング、研究参加。本人確認はウォレットで — あなたの身元は明かされません。**

Moya is funded by [Project Catalyst](https://projectcatalyst.io/) (Cardano, Fund 14) and built on the open Socious identity + payments stack. Live at **https://moya.socious.io**.

## How it works

Moya itself is a deliberately boring web2 application. Everything privacy-critical rides existing, specialised open infrastructure:

| Concern | Handled by |
|---|---|
| Self-sovereign identity, DIDs, credential wallet | [Socious Wallet](https://github.com/socious-io/socious-wallet) (Hyperledger Identus, `did:prism`) |
| Credential issuance & verification ("Socious Verify") | [Shin](https://github.com/socious-io/shin-api) — schemas, JWT verifiable credentials, predicate proofs |
| Reward escrow on Cardano | [socious-io/aiken-contracts](https://github.com/socious-io/aiken-contracts) (vendored as a submodule) + Mesh SDK |
| Payments ledger | [gopay](https://github.com/socious-io/gopay) |

A Moya account is a handle + email + password. No phone number, no real name — ever. Verification happens by scanning a QR with Socious Wallet, which presents a verifiable credential; Moya learns a yes/no answer (e.g. *over 18*), never your documents. After the PHQ-9 screening, Moya issues a **Screening Result credential** to your wallet — it unlocks support matching and research participation without revealing your answers.

## Monorepo

```
apps/web           Next.js 15 · next-intl (EN/JA) · Tailwind      → Cloudflare
apps/api           Go · Gin · Postgres · gopay                    → Oracle Cloud (Docker)
apps/chain-runner  Node · Mesh SDK escrow executor (internal)     → Oracle Cloud (Docker)
contracts/         aiken-contracts submodule (escrow validator)
deploy/            docker compose + Caddy
```

## Development

```bash
pnpm install
pnpm --filter @moya/web dev          # web on :3000

cd apps/api
cp config.example.yml config.yml     # then edit
docker compose -f ../../deploy/compose.yml up postgres -d
go run ./cmd/app                     # api on :5070
```

## Catalyst milestones

- **M1** — UX design & interactive Figma prototype ✅
- **M2** — Anonymous account creation · anonymous reusable KYC · PHQ-9 screening & intelligent referral, live on a public domain ✅
- **M3** — Provider-issued treatment-need credentials · research/opportunity platform with escrowed token rewards on Cardano mainnet ✅

## License

[GPL-3.0](./LICENSE). The escrow validator vendored from MeshJS carries its Apache-2.0 attribution — see `contracts/aiken-contracts`.
