import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertIntegrationConfig,
  buildIntegrationPlan,
  findCreatedObject,
  loadIntegrationEnv,
  parseDotEnv,
} from '../scripts/testnet-integration.mjs';

test('parses dotenv content without clobbering explicit process overrides', () => {
  const parsed = parseDotEnv(`SUI_SECRET_KEY=from_file
VITE_GUARD_PACKAGE_ID=0xabc
# ignored
`);
  const env = loadIntegrationEnv({
    files: [parsed],
    processEnv: {
      SUI_SECRET_KEY: 'from_process',
      VITE_DEEPBOOK_MANAGER_KEY: 'MANAGER_TEST',
    },
  });

  assert.equal(env.SUI_SECRET_KEY, 'from_process');
  assert.equal(env.VITE_GUARD_PACKAGE_ID, '0xabc');
  assert.equal(env.VITE_DEEPBOOK_MANAGER_KEY, 'MANAGER_TEST');
});

test('requires funded wallet secret, guard package, and testnet network', () => {
  assert.throws(
    () => assertIntegrationConfig({ VITE_SUI_NETWORK: 'mainnet' }),
    /SUI_SECRET_KEY/,
  );
  assert.throws(
    () =>
      assertIntegrationConfig({
        SUI_SECRET_KEY: 'suiprivkey_fake',
        VITE_SUI_NETWORK: 'mainnet',
        VITE_GUARD_PACKAGE_ID: '0xabc',
      }),
    /testnet only/,
  );
  assert.throws(
    () =>
      assertIntegrationConfig({
        SUI_SECRET_KEY: 'suiprivkey_fake',
        VITE_SUI_NETWORK: 'testnet',
      }),
    /VITE_GUARD_PACKAGE_ID/,
  );
});

test('finds created objects across Sui SDK result shapes', () => {
  const result = {
    objectTypes: {
      '0xpolicy': '0xabc::deepbook_risk_console::GuardPolicy',
      '0xmanager': '0xdee9::balance_manager::BalanceManager',
    },
    effects: {
      changedObjects: [
        { objectId: '0xpolicy', idOperation: 'Created' },
        { objectId: '0xmanager', idOperation: 'Created' },
      ],
    },
  };

  assert.equal(findCreatedObject(result, 'GuardPolicy'), '0xpolicy');
  assert.equal(findCreatedObject(result, 'BalanceManager'), '0xmanager');
});

test('builds a dry integration plan from validated env', () => {
  const config = assertIntegrationConfig({
    SUI_SECRET_KEY: 'suiprivkey_fake',
    VITE_SUI_NETWORK: 'testnet',
    VITE_SUI_RPC_URL: 'https://fullnode.testnet.sui.io:443',
    VITE_GUARD_PACKAGE_ID: '0xabc',
    VITE_DEEPBOOK_POOL_KEY: 'SUI_DBUSDC',
    VITE_DEEPBOOK_MANAGER_KEY: 'MANAGER_1',
    DEEPBOOK_INTEGRATION_DEPOSIT_SUI: '1.2',
  });
  const plan = buildIntegrationPlan(config);

  assert.deepEqual(plan.map((step) => step.name), [
    'check-funded-wallet',
    'create-guard-policy',
    'create-balance-manager',
    'deposit-sui',
    'place-guarded-maker-ask',
    'refresh-open-orders',
    'cancel-order',
    'withdraw-unused-sui',
  ]);
  assert.equal(plan.find((step) => step.name === 'deposit-sui').amountSui, 1.2);
});
