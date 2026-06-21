# DeepBook Risk Console - Sui Overflow 2026 Submission

## One-line pitch

A wallet-connected DeepBookV3 risk console that turns price predictions and LP guardrails into tiny guarded testnet maker orders with on-chain receipts.

## Selected track

DeepBook

## Problem

Builders and users need a Sui-native product that turns the concept into an inspectable workflow instead of a generic Web3 wrapper. The current alternatives usually hide policy, storage, execution, or auditability off-chain.

## Solution

DeepBook Risk Console packages the workflow into Sui-friendly objects, readable product flows, and a judge-ready demo. The MVP focuses on the smallest credible loop that proves why Sui matters.

## Sui-native architecture

- DeepBookV3 order book data makes pool risk inspectable.
- Sui objects can hold guard policies and execution receipts.
- Wallet-signed PTBs can combine risk receipts with DeepBook order actions.

## MVP features

- Pool risk console.
- Predict scenario scorer.
- LP guardrail policy and receipt flow.
- Guarded testnet order, cancel, and unused-SUI recovery path.

## Demo script

1. Open the demo and show the product visual.
2. Walk through: Connect a testnet wallet -> Load SUI/DBUSDC risk inputs -> Create a guard policy -> Place and cancel a guarded maker order -> Withdraw unused SUI back to the wallet.
3. Highlight Risk decision: PASS.
4. Show the sidecar video and bilingual subtitles in `media/`.

## Chinese subtitle summary

它把 DeepBookV3 价格判断和 LP 风控规则组合成钱包签名的小额 testnet 挂单、撤单、资金回收和链上风控收据。

## Deliverables in this folder

- Static demo app: `index.html`, `src/main.jsx`, `src/styles.css`
- Submission write-up: `SUBMISSION.md`
- Visual and video assets: `media/`
- HyperFrames brief: `hyperframes-brief.md`
