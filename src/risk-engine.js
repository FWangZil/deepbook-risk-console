export const DEFAULT_RISK_INPUT = {
  midPrice: 3.42,
  orderPrice: 3.76,
  quantity: 1,
  maxNotional: 5,
  minSpreadBps: 50,
  maxBandDistanceBps: 1500,
  inventoryBase: 0.1,
  inventoryQuote: 20,
  maxInventorySkewBps: 7000,
  active: true,
};

export function normalizeRiskInput(input) {
  const merged = { ...DEFAULT_RISK_INPUT, ...input };
  return {
    midPrice: numberValue(merged.midPrice),
    orderPrice: numberValue(merged.orderPrice),
    quantity: numberValue(merged.quantity),
    maxNotional: numberValue(merged.maxNotional),
    minSpreadBps: numberValue(merged.minSpreadBps),
    maxBandDistanceBps: numberValue(merged.maxBandDistanceBps),
    inventoryBase: numberValue(merged.inventoryBase),
    inventoryQuote: numberValue(merged.inventoryQuote),
    maxInventorySkewBps: numberValue(merged.maxInventorySkewBps),
    active: Boolean(merged.active),
  };
}

export function evaluateRisk(rawInput) {
  const input = normalizeRiskInput(rawInput);
  const notional = input.orderPrice * input.quantity;
  const spreadBps = input.midPrice > 0 ? Math.abs(input.orderPrice - input.midPrice) / input.midPrice * 10_000 : Number.POSITIVE_INFINITY;
  const bandDistanceBps = spreadBps;
  const baseValue = input.inventoryBase * input.midPrice;
  const exposureDenominator = Math.max(baseValue + input.inventoryQuote, 0.000001);
  const inventorySkewBps = baseValue / exposureDenominator * 10_000;

  const checks = {
    policy: checkPolicy(input.active),
    notional: thresholdCheck({
      label: 'Notional cap',
      value: notional,
      blockAt: input.maxNotional,
      warnAt: input.maxNotional * 0.8,
      direction: 'max',
      unit: 'DBUSDC',
    }),
    spread: thresholdCheck({
      label: 'Maker spread',
      value: spreadBps,
      blockAt: input.minSpreadBps,
      warnAt: input.minSpreadBps * 1.5,
      direction: 'min',
      unit: 'bps',
    }),
    band: thresholdCheck({
      label: 'Prediction band',
      value: bandDistanceBps,
      blockAt: input.maxBandDistanceBps,
      warnAt: input.maxBandDistanceBps * 0.8,
      direction: 'max',
      unit: 'bps',
    }),
    inventory: thresholdCheck({
      label: 'Base exposure',
      value: inventorySkewBps,
      blockAt: input.maxInventorySkewBps,
      warnAt: input.maxInventorySkewBps * 0.8,
      direction: 'max',
      unit: 'bps',
    }),
  };

  const values = Object.values(checks);
  const blocked = values.some((check) => check.status === 'BLOCK');
  const warned = values.some((check) => check.status === 'WARN');
  const status = blocked ? 'BLOCK' : warned ? 'WARN' : 'PASS';
  const warnings = values.filter((check) => check.status === 'WARN').map((check) => check.label);
  const blocks = values.filter((check) => check.status === 'BLOCK').map((check) => check.label);
  const scoreBps = Math.min(10_000, Math.round(
    notionalRatio(notional, input.maxNotional) * 2200 +
    minRatio(input.minSpreadBps, spreadBps) * 2200 +
    notionalRatio(bandDistanceBps, input.maxBandDistanceBps) * 2200 +
    notionalRatio(inventorySkewBps, input.maxInventorySkewBps) * 2200 +
    (input.active ? 0 : 1200),
  ));

  return {
    input,
    status,
    blocked,
    warnings,
    blocks,
    scoreBps,
    metrics: {
      notional,
      spreadBps,
      bandDistanceBps,
      inventorySkewBps,
    },
    checks,
    summary: summaryFor(status, warnings, blocks),
  };
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function checkPolicy(active) {
  return active
    ? { label: 'Policy active', status: 'PASS', detail: 'The guard policy is enabled.' }
    : { label: 'Policy active', status: 'BLOCK', detail: 'The guard policy is inactive.' };
}

function thresholdCheck({ label, value, blockAt, warnAt, direction, unit }) {
  if (direction === 'max') {
    if (value > blockAt) return { label, status: 'BLOCK', detail: `${format(value)} ${unit} exceeds ${format(blockAt)} ${unit}.` };
    if (value >= warnAt) return { label, status: 'WARN', detail: `${format(value)} ${unit} is close to ${format(blockAt)} ${unit}.` };
    return { label, status: 'PASS', detail: `${format(value)} ${unit} is inside the guardrail.` };
  }
  if (value < blockAt) return { label, status: 'BLOCK', detail: `${format(value)} ${unit} is below ${format(blockAt)} ${unit}.` };
  if (value <= warnAt) return { label, status: 'WARN', detail: `${format(value)} ${unit} barely clears the minimum.` };
  return { label, status: 'PASS', detail: `${format(value)} ${unit} clears the minimum.` };
}

function notionalRatio(value, limit) {
  if (limit <= 0) return 1;
  return Math.max(0, Math.min(1.25, value / limit));
}

function minRatio(minimum, value) {
  if (minimum <= 0) return 0;
  return Math.max(0, Math.min(1.25, minimum / Math.max(value, 0.000001)));
}

function summaryFor(status, warnings, blocks) {
  if (status === 'PASS') return 'All configured guardrails pass.';
  if (status === 'WARN') return `Review before signing: ${warnings.join(', ')}.`;
  return `Blocked by guardrails: ${blocks.join(', ')}.`;
}

function format(value) {
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 4 });
}
