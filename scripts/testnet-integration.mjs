import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Secp256k1Keypair } from '@mysten/sui/keypairs/secp256k1';
import { Secp256r1Keypair } from '@mysten/sui/keypairs/secp256r1';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { SuiGrpcClient } from '@mysten/sui/grpc';

export function parseDotEnv(content) {
  const values = {};
  for (const rawLine of String(content || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

export function loadIntegrationEnv({ files = [], processEnv = process.env } = {}) {
  return Object.assign({}, ...files, processEnv);
}

export async function loadIntegrationEnvFromDisk({ cwd = process.cwd(), processEnv = process.env } = {}) {
  const files = [];
  for (const name of ['.env', '.env.local']) {
    const path = new URL(name, `file://${cwd.endsWith('/') ? cwd : `${cwd}/`}`);
    if (existsSync(path)) {
      files.push(parseDotEnv(await readFile(path, 'utf8')));
    }
  }
  return loadIntegrationEnv({ files, processEnv });
}

export function assertIntegrationConfig(env) {
  if (!env.SUI_SECRET_KEY) {
    throw new Error('SUI_SECRET_KEY is required for the funded-wallet testnet runner.');
  }
  const network = env.VITE_SUI_NETWORK || 'testnet';
  if (network !== 'testnet') {
    throw new Error('DeepBook Risk Console integration runner is testnet only.');
  }
  const guardPackageId = env.VITE_GUARD_PACKAGE_ID || env.VITE_PACKAGE_ID || '';
  if (!guardPackageId) {
    throw new Error('VITE_GUARD_PACKAGE_ID is required. Publish the guard Move package first.');
  }
  return {
    secretKey: env.SUI_SECRET_KEY,
    network,
    rpcUrl: env.VITE_SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',
    guardPackageId,
    guardPolicyId: env.VITE_GUARD_POLICY_ID || env.VITE_PRIMARY_OBJECT_ID || '',
    deepBookPoolKey: env.VITE_DEEPBOOK_POOL_KEY || 'SUI_DBUSDC',
    deepBookManagerKey: env.VITE_DEEPBOOK_MANAGER_KEY || 'MANAGER_1',
    deepBookBalanceManagerId: env.VITE_DEEPBOOK_BALANCE_MANAGER_ID || '',
    deepBookTradeCapId: env.VITE_DEEPBOOK_TRADE_CAP_ID || '',
    depositSui: numberEnv(env.DEEPBOOK_INTEGRATION_DEPOSIT_SUI, 1.2),
    minBalanceMist: BigInt(env.DEEPBOOK_INTEGRATION_MIN_BALANCE_MIST || '2000000000'),
    dryRun: env.DEEPBOOK_INTEGRATION_DRY_RUN === '1',
    skipDeposit: env.DEEPBOOK_INTEGRATION_SKIP_DEPOSIT === '1',
  };
}

export function buildIntegrationPlan(config) {
  return [
    { name: 'check-funded-wallet', minBalanceMist: config.minBalanceMist.toString() },
    { name: 'create-guard-policy', packageId: config.guardPackageId },
    { name: 'create-balance-manager', managerKey: config.deepBookManagerKey },
    ...(config.skipDeposit ? [] : [{ name: 'deposit-sui', amountSui: config.depositSui }]),
    { name: 'place-guarded-maker-ask', poolKey: config.deepBookPoolKey },
    { name: 'refresh-open-orders', managerKey: config.deepBookManagerKey },
    { name: 'cancel-order', poolKey: config.deepBookPoolKey },
    { name: 'withdraw-unused-sui', managerKey: config.deepBookManagerKey },
  ];
}

export function findCreatedObject(result, typeNeedle) {
  const objectTypes = result?.objectTypes || result?.effects?.objectTypes || {};
  const changed = [
    ...(result?.effects?.changedObjects || []),
    ...(result?.effects?.changed_objects || []),
  ];
  for (const object of changed) {
    const id = object.objectId || object.object_id;
    const operation = object.idOperation || object.id_operation;
    const type = objectTypes[id] || object.objectType || object.object_type || '';
    if (operation === 'Created' && String(type).includes(typeNeedle)) return id;
  }
  for (const change of result?.objectChanges || result?.object_changes || []) {
    const id = change.objectId || change.object_id;
    const type = change.objectType || change.object_type || '';
    if (change.type === 'created' && String(type).includes(typeNeedle)) return id;
  }
  return '';
}

export function keypairFromSecretKey(secretKey) {
  const decoded = decodeSuiPrivateKey(secretKey);
  switch (decoded.scheme) {
    case 'ED25519':
    case 'Ed25519':
      return Ed25519Keypair.fromSecretKey(decoded.secretKey);
    case 'Secp256k1':
      return Secp256k1Keypair.fromSecretKey(decoded.secretKey);
    case 'Secp256r1':
      return Secp256r1Keypair.fromSecretKey(decoded.secretKey);
    default:
      throw new Error(`Unsupported Sui private key scheme: ${decoded.scheme}`);
  }
}

export function normalizeOrderId(order) {
  if (order == null) return '';
  if (typeof order === 'string' || typeof order === 'number' || typeof order === 'bigint') return String(order);
  return String(order.orderId || order.order_id || order.id || order.order_id_id || '');
}

export async function runIntegration(config) {
  Object.assign(process.env, {
    VITE_SUI_NETWORK: 'testnet',
    VITE_SUI_RPC_URL: config.rpcUrl,
    VITE_GUARD_PACKAGE_ID: config.guardPackageId,
    VITE_GUARD_POLICY_ID: config.guardPolicyId,
    VITE_DEEPBOOK_POOL_KEY: config.deepBookPoolKey,
    VITE_DEEPBOOK_MANAGER_KEY: config.deepBookManagerKey,
    VITE_DEEPBOOK_BALANCE_MANAGER_ID: config.deepBookBalanceManagerId,
    VITE_DEEPBOOK_TRADE_CAP_ID: config.deepBookTradeCapId,
  });

  const [
    { DEFAULT_RISK_INPUT, evaluateRisk },
    { createDeepBookClient, fetchOpenOrders },
    {
      buildCancelOrderTransaction,
      buildCreateBalanceManagerTransaction,
      buildCreatePolicyTransaction,
      buildDepositSuiTransaction,
      buildGuardedLimitOrderTransaction,
      buildWithdrawSuiTransaction,
    },
  ] = await Promise.all([
    import('../src/risk-engine.js'),
    import('../src/deepbook-client.js'),
    import('../src/guard-tx.js'),
  ]);

  const keypair = keypairFromSecretKey(config.secretKey);
  const address = keypair.toSuiAddress();
  const client = new SuiGrpcClient({ network: 'testnet', baseUrl: config.rpcUrl });
  const balance = await client.getBalance({ owner: address });
  const totalBalance = BigInt(balance.totalBalance || 0);
  if (totalBalance < config.minBalanceMist) {
    throw new Error(`Funded wallet balance is too low: ${totalBalance} MIST < ${config.minBalanceMist} MIST.`);
  }

  const summary = {
    address,
    balanceMist: totalBalance.toString(),
    policyId: config.guardPolicyId,
    balanceManagerId: config.deepBookBalanceManagerId,
    orderId: '',
    transactions: [],
  };

  const guard = DEFAULT_RISK_INPUT;
  const risk = evaluateRisk(guard);
  if (risk.blocked) {
    throw new Error(`Default guarded order is blocked before signing: ${risk.summary}`);
  }

  if (!summary.policyId) {
    const policyResult = await executeTx(client, keypair, buildCreatePolicyTransaction({
      config: {
        guardPackageId: config.guardPackageId,
        deepBookPoolKey: config.deepBookPoolKey,
      },
      guard,
    }), 'create-guard-policy');
    summary.transactions.push(policyResult);
    summary.policyId = findCreatedObject(policyResult.raw, 'GuardPolicy');
    if (!summary.policyId) throw new Error('GuardPolicy transaction confirmed, but no GuardPolicy object id was found.');
  }

  let deepbookClient = createDeepBookClient({
    address,
    balanceManagerId: summary.balanceManagerId,
    tradeCapId: config.deepBookTradeCapId,
  });

  if (!summary.balanceManagerId) {
    const managerResult = await executeTx(client, keypair, buildCreateBalanceManagerTransaction({
      deepbookClient,
    }), 'create-balance-manager');
    summary.transactions.push(managerResult);
    summary.balanceManagerId = findCreatedObject(managerResult.raw, 'BalanceManager');
    if (!summary.balanceManagerId) throw new Error('BalanceManager transaction confirmed, but no BalanceManager object id was found.');
    deepbookClient = createDeepBookClient({
      address,
      balanceManagerId: summary.balanceManagerId,
      tradeCapId: config.deepBookTradeCapId,
    });
  }

  if (!config.skipDeposit && config.depositSui > 0) {
    summary.transactions.push(await executeTx(client, keypair, buildDepositSuiTransaction({
      deepbookClient,
      managerKey: config.deepBookManagerKey,
      coinKey: 'SUI',
      amount: config.depositSui,
    }), 'deposit-sui'));
  }

  summary.transactions.push(await executeTx(client, keypair, buildGuardedLimitOrderTransaction({
    deepbookClient,
    config: {
      guardPackageId: config.guardPackageId,
      deepBookPoolKey: config.deepBookPoolKey,
      deepBookManagerKey: config.deepBookManagerKey,
    },
    policyId: summary.policyId,
    guard,
    risk,
  }), 'place-guarded-maker-ask'));

  const openOrders = await fetchOpenOrders(deepbookClient, config.deepBookPoolKey, config.deepBookManagerKey);
  summary.orderId = normalizeOrderId(openOrders?.[0]);
  if (!summary.orderId) {
    throw new Error('Guarded order transaction confirmed, but no open order id was returned by DeepBook.');
  }

  summary.transactions.push(await executeTx(client, keypair, buildCancelOrderTransaction({
    deepbookClient,
    config: {
      guardPackageId: config.guardPackageId,
      deepBookPoolKey: config.deepBookPoolKey,
      deepBookManagerKey: config.deepBookManagerKey,
    },
    policyId: summary.policyId,
    orderId: summary.orderId,
    guard,
    risk,
  }), 'cancel-order'));

  summary.transactions.push(await executeTx(client, keypair, buildWithdrawSuiTransaction({
    deepbookClient,
    managerKey: config.deepBookManagerKey,
    coinKey: 'SUI',
    recipient: address,
  }), 'withdraw-unused-sui'));

  return summary;
}

async function executeTx(client, signer, transaction, label) {
  const result = await client.signAndExecuteTransaction({
    signer,
    transaction,
    include: {
      effects: true,
      events: true,
      objectTypes: true,
      balanceChanges: true,
    },
  });
  const confirmed = await client.waitForTransaction({
    result,
    include: {
      effects: true,
      events: true,
      objectTypes: true,
      balanceChanges: true,
    },
  });
  const digest = confirmed.digest || result.digest;
  console.log(`${label}: ${digest}`);
  return { label, digest, raw: confirmed };
}

function numberEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function main() {
  const env = await loadIntegrationEnvFromDisk();
  const config = assertIntegrationConfig(env);
  const plan = buildIntegrationPlan(config);
  if (config.dryRun) {
    console.log(JSON.stringify({ dryRun: true, plan }, null, 2));
    return;
  }
  const summary = await runIntegration(config);
  console.log(JSON.stringify({ dryRun: false, plan, summary }, null, 2));
}

const entrypoint = process.argv[1] ? fileURLToPath(import.meta.url) === process.argv[1] : false;
if (entrypoint) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
