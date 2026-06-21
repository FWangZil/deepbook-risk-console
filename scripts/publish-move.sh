#!/usr/bin/env bash
set -euo pipefail

sui move build --path move --build-env testnet
sui client publish move --gas-budget "${SUI_GAS_BUDGET:-100000000}" --json
