import test from 'node:test';
import assert from 'node:assert/strict';

import { buildProofLinks } from '../src/proof-links.js';

const config = {
  deepBookPoolKey: 'SUI_DBUSDC',
  deepBookIndexerUrl: 'https://deepbook-indexer.testnet.mystenlabs.com/',
};

test('builds proof links for explorer and DeepBook indexer evidence', () => {
  const links = buildProofLinks({
    config,
    digest: '0xdigest',
    balanceManagerId: '0xmanager',
    policyId: '0xpolicy',
    orderId: '123',
  });

  assert.deepEqual(
    links.map((link) => [link.key, link.href]),
    [
      ['sui-transaction', 'https://testnet.suivision.xyz/txblock/0xdigest'],
      ['deepbook-orders', 'https://deepbook-indexer.testnet.mystenlabs.com/orders/SUI_DBUSDC/0xmanager?limit=10'],
      [
        'deepbook-updates',
        'https://deepbook-indexer.testnet.mystenlabs.com/order_updates/SUI_DBUSDC?limit=10&balance_manager_id=0xmanager',
      ],
      ['balance-manager', 'https://testnet.suivision.xyz/object/0xmanager'],
      ['guard-policy', 'https://testnet.suivision.xyz/object/0xpolicy'],
    ],
  );
});

test('omits links that do not have required ids yet', () => {
  const links = buildProofLinks({
    config,
    digest: '',
    balanceManagerId: '',
    policyId: '0xpolicy',
    orderId: '',
  });

  assert.deepEqual(
    links.map((link) => link.key),
    ['guard-policy'],
  );
});
