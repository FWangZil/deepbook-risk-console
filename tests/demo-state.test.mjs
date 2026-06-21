import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyOpenOrderRecovery,
  loadDemoState,
  saveDemoState,
} from '../src/demo-state.js';

test('persists and restores the wallet execution state needed after reload', () => {
  const storage = createStorage();
  saveDemoState(storage, {
    balanceManagerId: '0xmanager',
    policyId: '0xpolicy',
    orderId: '123',
    digest: '0xdigest',
    guardReceiptId: '0xreceipt',
    depositDone: true,
    orderPlaced: true,
    cancelDone: true,
    withdrawDone: false,
  });

  assert.deepEqual(loadDemoState(storage), {
    balanceManagerId: '0xmanager',
    policyId: '0xpolicy',
    orderId: '123',
    digest: '0xdigest',
    guardReceiptId: '0xreceipt',
    depositDone: true,
    orderPlaced: true,
    cancelDone: true,
    withdrawDone: false,
  });
});

test('recovers cancel path when an open order is found after reload', () => {
  assert.deepEqual(applyOpenOrderRecovery('123'), {
    orderId: '123',
    orderPlaced: true,
    cancelDone: false,
  });
});

test('recovers withdraw path when no open orders remain after reload', () => {
  assert.deepEqual(applyOpenOrderRecovery(''), {
    orderId: '',
    orderPlaced: true,
    cancelDone: true,
  });
});

function createStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.get(key) ?? null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
  };
}
