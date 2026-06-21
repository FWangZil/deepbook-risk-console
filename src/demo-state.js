export const DEMO_STATE_KEY = 'deepbook-risk-console:demo-state';

const FIELDS = [
  'balanceManagerId',
  'policyId',
  'orderId',
  'digest',
  'guardReceiptId',
  'depositDone',
  'orderPlaced',
  'cancelDone',
  'withdrawDone',
];

export function loadDemoState(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(DEMO_STATE_KEY);
    if (!raw) return {};
    return sanitizeState(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function saveDemoState(storage = globalThis.localStorage, state) {
  if (!storage?.setItem) return;
  storage.setItem(DEMO_STATE_KEY, JSON.stringify(sanitizeState(state)));
}

export function applyOpenOrderRecovery(detectedOrderId) {
  const orderId = String(detectedOrderId || '');
  if (orderId) {
    return {
      orderId,
      orderPlaced: true,
      cancelDone: false,
    };
  }
  return {
    orderId: '',
    orderPlaced: true,
    cancelDone: true,
  };
}

function sanitizeState(state = {}) {
  return FIELDS.reduce((result, field) => {
    if (typeof state[field] === 'boolean') {
      result[field] = state[field];
    } else if (state[field]) {
      result[field] = String(state[field]);
    }
    return result;
  }, {});
}
