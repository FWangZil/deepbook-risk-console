import { OrderType, SelfMatchingOptions } from '@mysten/deepbook-v3';
import { Transaction } from '@mysten/sui/transactions';
import { projectConfig } from './integrations/config.js';

const encoder = new TextEncoder();

export function buildCreatePolicyTransaction({ config = projectConfig, guard }) {
  requireGuardPackage(config);
  const tx = new Transaction();
  tx.moveCall({
    target: `${config.guardPackageId}::deepbook_risk_console::create_policy`,
    arguments: [
      tx.pure.vector('u8', encoder.encode(config.deepBookPoolKey)),
      tx.pure.u64(toMicro(guard.maxNotional)),
      tx.pure.u64(Math.round(guard.minSpreadBps)),
      tx.pure.u64(Math.round(guard.maxInventorySkewBps)),
      tx.pure.u64(toMicro(guard.maxOrderSize ?? guard.quantity)),
    ],
  });
  return tx;
}

export function buildCreateBalanceManagerTransaction({ deepbookClient }) {
  const tx = new Transaction();
  deepbookClient.deepbook.balanceManager.createAndShareBalanceManager()(tx);
  return tx;
}

export function buildDepositSuiTransaction({ deepbookClient, managerKey = projectConfig.deepBookManagerKey, coinKey = 'SUI', amount = 1.2 }) {
  const tx = new Transaction();
  deepbookClient.deepbook.balanceManager.depositIntoManager(managerKey, coinKey, amount)(tx);
  return tx;
}

export function buildWithdrawSuiTransaction({
  deepbookClient,
  managerKey = projectConfig.deepBookManagerKey,
  coinKey = 'SUI',
  recipient,
}) {
  if (!recipient) throw new Error('A wallet recipient is required to withdraw BalanceManager funds.');
  const tx = new Transaction();
  deepbookClient.deepbook.balanceManager.withdrawAllFromManager(managerKey, coinKey, recipient)(tx);
  return tx;
}

export function buildGuardedLimitOrderTransaction({ deepbookClient, config = projectConfig, policyId, guard, risk }) {
  requirePolicy(config, policyId);
  const tx = new Transaction();
  const clientOrderId = createClientOrderId();
  deepbookClient.deepbook.deepBook.placeLimitOrder({
    poolKey: config.deepBookPoolKey,
    balanceManagerKey: config.deepBookManagerKey,
    clientOrderId,
    price: guard.orderPrice,
    quantity: guard.quantity,
    isBid: false,
    orderType: OrderType.POST_ONLY,
    selfMatchingOption: SelfMatchingOptions.CANCEL_TAKER,
    payWithDeep: false,
  })(tx);
  recordGuardedOrder(tx, { config, policyId, guard, risk, clientOrderId, action: 'place_limit_order' });
  return tx;
}

export function buildCancelOrderTransaction({ deepbookClient, config = projectConfig, policyId, orderId, guard, risk }) {
  requirePolicy(config, policyId);
  const tx = new Transaction();
  deepbookClient.deepbook.deepBook.cancelLiveOrder(config.deepBookPoolKey, config.deepBookManagerKey, orderId)(tx);
  tx.moveCall({
    target: `${config.guardPackageId}::deepbook_risk_console::record_cancel`,
    arguments: [
      tx.object(policyId),
      tx.pure.vector('u8', encoder.encode('ask')),
      tx.pure.u64(toMicro(guard.orderPrice)),
      tx.pure.u64(toMicro(guard.quantity)),
      tx.pure.vector('u8', encoder.encode(orderId)),
      tx.pure.vector('u8', encoder.encode(orderId)),
      tx.pure.u64(Math.round(risk.scoreBps)),
    ],
  });
  return tx;
}

function recordGuardedOrder(tx, { config, policyId, guard, risk, clientOrderId, action }) {
  tx.moveCall({
    target: `${config.guardPackageId}::deepbook_risk_console::record_guarded_order`,
    arguments: [
      tx.object(policyId),
      tx.pure.vector('u8', encoder.encode('ask')),
      tx.pure.u64(toMicro(guard.orderPrice)),
      tx.pure.u64(toMicro(guard.quantity)),
      tx.pure.u64(toMicro(guard.orderPrice * guard.quantity)),
      tx.pure.u64(Math.round(risk.metrics.spreadBps)),
      tx.pure.u64(Math.round(risk.metrics.inventorySkewBps)),
      tx.pure.vector('u8', encoder.encode(String(clientOrderId))),
      tx.pure.u64(Math.round(risk.scoreBps)),
      tx.pure.vector('u8', encoder.encode(action)),
    ],
  });
}

function requireGuardPackage(config) {
  if (!config.guardPackageId) throw new Error('Set VITE_GUARD_PACKAGE_ID after publishing the Move package.');
}

function requirePolicy(config, policyId) {
  requireGuardPackage(config);
  if (!policyId) throw new Error('Set or create a GuardPolicy object before building live DeepBook transactions.');
}

function toMicro(value) {
  return BigInt(Math.max(0, Math.round(Number(value) * 1_000_000)));
}

function createClientOrderId() {
  return Date.now() % 9_000_000_000;
}
