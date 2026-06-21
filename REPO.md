# DeepBook Risk Console as an Independent Repository

This directory is self-contained and can be pushed as a standalone Sui Overflow 2026 DeepBook submission.

## What this repo demonstrates

A wallet-connected DeepBookV3 risk console that turns price predictions and LP guardrails into tiny guarded testnet maker orders with on-chain receipts.

## Required local setup

- Node.js 20+
- npm 10+
- Sui CLI for Move builds and publish flows
- A Sui wallet extension connected to testnet for live signing
- Optional funded testnet SUI for publishing the guard package and depositing into a DeepBook BalanceManager

## First run

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Verify before submission

```bash
npm run verify
```

## Live testnet sequence

1. Publish the Move package and set VITE_GUARD_PACKAGE_ID.
2. Connect a Sui wallet on testnet.
3. Create a GuardPolicy.
4. Create or paste a BalanceManager object id.
5. Deposit a tiny SUI amount.
6. Place a guarded post-only ask.
7. Refresh open orders and cancel the order.
8. Withdraw unused SUI from the BalanceManager back to the connected wallet.

The same sequence can be run from a funded command-line wallet:

```bash
SUI_SECRET_KEY=suiprivkey... VITE_GUARD_PACKAGE_ID=0x... npm run testnet:integration
```
