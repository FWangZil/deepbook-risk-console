# DeepBook Risk Console

A wallet-connected DeepBookV3 risk console that turns price predictions and LP guardrails into tiny guarded testnet maker orders with on-chain receipts.

## Track

DeepBook

## MVP

- Pool risk console.
- Predict scenario scorer.
- LP guardrail policy and receipt flow.
- Guarded testnet order, cancel, and unused-SUI recovery path.

## Run the demo

```bash
npm install
cp .env.example .env.local
npm run dev
```

Connect a Sui wallet on testnet. Publish the Move package and set VITE_GUARD_PACKAGE_ID before creating policies or signing guarded DeepBook transactions. The operator flow ends by withdrawing unused SUI from the BalanceManager back to the connected wallet.

## Standalone commands

- Run app: `npm run dev`
- Build app: `npm run build`
- Risk tests: `npm run test:risk`
- Funded-wallet runner tests: `npm run test:integration-runner`
- Local verification: `npm run verify`
- Real testnet integration: `npm run testnet:integration`
- Build Move package: `npm run build:move`
- Publish Move package: `npm run publish:move`
- Sui RPC check: `npm run check:sui`
- Render HyperFrames video: `npm run video:render`

## Submission artifacts

- Product README: `README.md`
- Judge submission: `SUBMISSION.md`
- Real infrastructure notes: `REAL_INFRA.md`
- Demo app: `index.html`, `src/main.jsx`, `src/styles.css`
- Runtime configuration template: `.env.example`
- Risk engine tests: `tests/risk-engine.test.mjs`
- Testnet integration runner: `scripts/testnet-integration.mjs`
- Move 2024 package: `move/`
- Media assets: `media/`
