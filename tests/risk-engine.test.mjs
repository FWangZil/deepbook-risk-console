import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_RISK_INPUT,
  evaluateRisk,
  normalizeRiskInput,
} from '../src/risk-engine.js';

test('passes a tiny maker order inside the guard envelope', () => {
  const result = evaluateRisk({
    ...DEFAULT_RISK_INPUT,
    midPrice: 3.42,
    orderPrice: 3.66,
    quantity: 0.08,
    maxNotional: 1,
    minSpreadBps: 25,
    maxBandDistanceBps: 1_000,
    inventoryBase: 0.2,
    inventoryQuote: 30,
    maxInventorySkewBps: 8_000,
    active: true,
  });

  assert.equal(result.status, 'PASS');
  assert.equal(result.blocked, false);
});

test('warns when a maker order is valid but close to configured limits', () => {
  const result = evaluateRisk({
    ...DEFAULT_RISK_INPUT,
    midPrice: 3.42,
    orderPrice: 3.47,
    quantity: 0.24,
    maxNotional: 1,
    minSpreadBps: 120,
    maxBandDistanceBps: 700,
    inventoryBase: 2.2,
    inventoryQuote: 11,
    maxInventorySkewBps: 5_000,
    active: true,
  });

  assert.equal(result.status, 'WARN');
  assert.equal(result.blocked, false);
  assert.ok(result.warnings.length >= 1);
});

test('blocks when notional is too high', () => {
  const result = evaluateRisk({
    ...DEFAULT_RISK_INPUT,
    midPrice: 3.42,
    orderPrice: 3.66,
    quantity: 5,
    maxNotional: 1,
  });

  assert.equal(result.status, 'BLOCK');
  assert.equal(result.blocked, true);
  assert.equal(result.checks.notional.status, 'BLOCK');
});

test('blocks when maker spread is below minimum', () => {
  const result = evaluateRisk({
    ...DEFAULT_RISK_INPUT,
    midPrice: 3.42,
    orderPrice: 3.43,
    minSpreadBps: 100,
  });

  assert.equal(result.status, 'BLOCK');
  assert.equal(result.checks.spread.status, 'BLOCK');
});

test('blocks when order is outside the allowed price band', () => {
  const result = evaluateRisk({
    ...DEFAULT_RISK_INPUT,
    midPrice: 3.42,
    orderPrice: 4.6,
    maxBandDistanceBps: 500,
  });

  assert.equal(result.status, 'BLOCK');
  assert.equal(result.checks.band.status, 'BLOCK');
});

test('blocks when base inventory exposure is above the LP guardrail', () => {
  const result = evaluateRisk({
    ...DEFAULT_RISK_INPUT,
    inventoryBase: 20,
    inventoryQuote: 1,
    maxInventorySkewBps: 2_000,
  });

  assert.equal(result.status, 'BLOCK');
  assert.equal(result.checks.inventory.status, 'BLOCK');
});

test('blocks when the guard policy is inactive', () => {
  const result = evaluateRisk({
    ...DEFAULT_RISK_INPUT,
    active: false,
  });

  assert.equal(result.status, 'BLOCK');
  assert.equal(result.checks.policy.status, 'BLOCK');
});

test('normalizes numeric form input without losing zero values', () => {
  const normalized = normalizeRiskInput({
    quantity: '0',
    inventoryBase: '0',
    maxNotional: '1.5',
    active: false,
  });

  assert.equal(normalized.quantity, 0);
  assert.equal(normalized.inventoryBase, 0);
  assert.equal(normalized.active, false);
  assert.equal(normalized.maxNotional, 1.5);
});
