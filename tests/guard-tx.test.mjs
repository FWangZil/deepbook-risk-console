import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCancelOrderTransaction,
  buildGuardedLimitOrderTransaction,
  buildWithdrawSuiTransaction,
} from '../src/guard-tx.js';

const config = {
  guardPackageId: '0xf24f1556edab0ba9eb7cf5b0b8961b1618479ae61fbdd3a1693309675bb37be4',
  deepBookPoolKey: 'SUI_DBUSDC',
  deepBookManagerKey: 'MANAGER_1',
};

const guard = {
  orderPrice: 3.76,
  quantity: 1,
};

const risk = {
  scoreBps: 100,
  metrics: {
    spreadBps: 994,
    inventorySkewBps: 168,
  },
};

test('builds guarded limit order with the current DeepBook SDK transaction namespace', () => {
  const calls = [];
  const deepbookClient = {
    deepbook: {
      placeLimitOrder() {
        throw new Error('old top-level namespace should not be used');
      },
      deepBook: {
        placeLimitOrder(params) {
          calls.push(params);
          return () => {};
        },
      },
    },
  };

  buildGuardedLimitOrderTransaction({
    deepbookClient,
    config,
    policyId: '0xpolicy',
    guard,
    risk,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].poolKey, 'SUI_DBUSDC');
  assert.equal(calls[0].balanceManagerKey, 'MANAGER_1');
  assert.equal(calls[0].isBid, false);
  assert.equal(calls[0].payWithDeep, false);
  assert.equal(typeof calls[0].clientOrderId, 'number');
});

test('builds cancel with the current DeepBook SDK transaction namespace', () => {
  const calls = [];
  const deepbookClient = {
    deepbook: {
      cancelLiveOrder() {
        throw new Error('old top-level namespace should not be used');
      },
      deepBook: {
        cancelLiveOrder(poolKey, balanceManagerKey, orderId) {
          calls.push({ poolKey, balanceManagerKey, orderId });
          return () => {};
        },
      },
    },
  };

  buildCancelOrderTransaction({
    deepbookClient,
    config,
    policyId: '0xpolicy',
    orderId: '123',
    guard,
    risk,
  });

  assert.deepEqual(calls, [{ poolKey: 'SUI_DBUSDC', balanceManagerKey: 'MANAGER_1', orderId: '123' }]);
});

test('builds withdraw all SUI from the BalanceManager back to the wallet', () => {
  const calls = [];
  const deepbookClient = {
    deepbook: {
      balanceManager: {
        withdrawAllFromManager(managerKey, coinKey, recipient) {
          calls.push({ managerKey, coinKey, recipient });
          return () => {};
        },
      },
    },
  };

  buildWithdrawSuiTransaction({
    deepbookClient,
    managerKey: 'MANAGER_1',
    recipient: '0xwallet',
  });

  assert.deepEqual(calls, [{ managerKey: 'MANAGER_1', coinKey: 'SUI', recipient: '0xwallet' }]);
});
