import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildWalletTransactionPayload,
  ensureTransactionDetails,
  extractCreatedObjectId,
  isStaleObjectVersionError,
  normalizeOrderId,
} from '../src/deepbook-client.js';

test('hydrates wallet transaction results that only include a digest', async () => {
  const minimalResult = {
    digest: 'digest-only',
    status: { success: true, error: null },
  };
  const hydratedResult = {
    digest: 'digest-only',
    effects: {
      changedObjects: [{ objectId: '0xpolicy', idOperation: 'Created' }],
    },
    objectTypes: {
      '0xpolicy': '0xabc::deepbook_risk_console::GuardPolicy',
    },
  };
  const calls = [];
  const client = {
    async getTransaction(input) {
      calls.push(input);
      return { Transaction: hydratedResult };
    },
  };

  const result = await ensureTransactionDetails(client, minimalResult);

  assert.equal(result, hydratedResult);
  assert.deepEqual(calls, [
    {
      digest: 'digest-only',
      include: { effects: true, objectTypes: true, events: true, transaction: true },
    },
  ]);
  assert.equal(extractCreatedObjectId(result, 'GuardPolicy'), '0xpolicy');
});

test('does not refetch transaction details when effects and object types are already present', async () => {
  const fullResult = {
    digest: 'full-result',
    effects: {
      changedObjects: [{ objectId: '0xmanager', idOperation: 'Created' }],
    },
    objectTypes: {
      '0xmanager': '0xdee9::balance_manager::BalanceManager',
    },
  };
  const client = {
    async getTransaction() {
      throw new Error('should not fetch');
    },
  };

  assert.equal(await ensureTransactionDetails(client, fullResult), fullResult);
});

test('normalizes open-order identifiers returned by DeepBook SDK shapes', () => {
  assert.equal(normalizeOrderId('123'), '123');
  assert.equal(normalizeOrderId(123), '123');
  assert.equal(normalizeOrderId(123n), '123');
  assert.equal(normalizeOrderId({ orderId: 'order-id' }), 'order-id');
  assert.equal(normalizeOrderId({ order_id: 'order_id' }), 'order_id');
  assert.equal(normalizeOrderId({ id: 'id' }), 'id');
  assert.equal(normalizeOrderId({ order_id_id: 'legacy-id' }), 'legacy-id');
  assert.equal(normalizeOrderId(null), '');
});

test('builds a base64 wallet payload with an explicit sender', async () => {
  const calls = [];
  const tx = {
    setSenderIfNotSet(sender) {
      calls.push(['sender', sender]);
    },
    async build({ client }) {
      calls.push(['client', client.name]);
      return new Uint8Array([1, 2, 3, 4]);
    },
  };

  const payload = await buildWalletTransactionPayload(tx, { name: 'fresh-client' }, '0xsender');

  assert.equal(payload, 'AQIDBA==');
  assert.deepEqual(calls, [
    ['sender', '0xsender'],
    ['client', 'fresh-client'],
  ]);
});

test('detects stale Sui object version errors that need transaction rebuilds', () => {
  assert.equal(
    isStaleObjectVersionError(
      new Error('Transaction needs to be rebuilt because object 0x1 version 0x1 is unavailable for consumption, current version: 0x2'),
    ),
    true,
  );
  assert.equal(isStaleObjectVersionError(new Error('User rejected the request')), false);
});
