# Real Infrastructure - DeepBook Risk Console

This project is wired as a wallet-connected DeepBookV3 testnet project, not a pure mock demo.

## Infrastructure included

- React + Vite app using Sui dApp Kit wallet-extension signing.
- DeepBookV3 SDK adapter for testnet BalanceManager, deposit, post-only limit order, open-order refresh, cancel flow, and unused-SUI withdrawal.
- Move 2024 guard package with shared GuardPolicy objects, GuardReceipt objects, owner checks, guard-limit checks, and receipt events.
- Deterministic risk engine with PASS/WARN/BLOCK tests.
- Funded-wallet testnet integration runner for create-policy, create-BalanceManager, deposit, guarded order, open-order refresh, cancel, and withdraw-unused-SUI.

## Configuration

Copy .env.example to .env.local. Publish the Move package, set VITE_GUARD_PACKAGE_ID, then create a GuardPolicy in the app and keep the detected policy id in VITE_GUARD_POLICY_ID for repeat runs.

## Verification

```bash
npm install
npm run test:risk
npm run test:integration-runner
npm run build
npm run build:move
node scripts/check-sui.mjs
```

Run the real funded-wallet testnet flow only when you intentionally want to sign transactions:

```bash
SUI_SECRET_KEY=suiprivkey... VITE_GUARD_PACKAGE_ID=0x... npm run testnet:integration
```

## Live DeepBook notes

- v1 is testnet-only.
- The default pool key is SUI_DBUSDC.
- The live order path uses a tiny post-only ask and payWithDeep=false.
- The app requires a BalanceManager before depositing, placing, canceling, or withdrawing unused SUI.
- If the wallet or DeepBook SDK cannot infer the created object id from transaction effects, paste the object id into the visible input.
- The integration runner does not publish the guard package automatically; publish first with `npm run publish:move` or another deploy flow, then set `VITE_GUARD_PACKAGE_ID`.
