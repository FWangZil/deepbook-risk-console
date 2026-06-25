import { deepbook } from '@mysten/deepbook-v3';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { toBase64 } from '@mysten/utils';
import { projectConfig } from './integrations/config.js';

export function createDeepBookClient({ address, balanceManagerId = projectConfig.deepBookBalanceManagerId, tradeCapId = projectConfig.deepBookTradeCapId } = {}) {
  if (!address) throw new Error('Connect a wallet before creating a DeepBook client.');
  return new SuiGrpcClient({ network: 'testnet', baseUrl: projectConfig.rpcUrl }).$extend(
    deepbook({
      address,
      balanceManagers: balanceManagerId
        ? {
            [projectConfig.deepBookManagerKey]: {
              address: balanceManagerId,
              tradeCap: tradeCapId || undefined,
            },
          }
        : undefined,
    }),
  );
}

export async function fetchOpenOrders(client, poolKey = projectConfig.deepBookPoolKey, managerKey = projectConfig.deepBookManagerKey) {
  if (!client?.deepbook) throw new Error('DeepBook client is not initialized.');
  return client.deepbook.accountOpenOrders(poolKey, managerKey);
}

export async function buildWalletTransactionPayload(transaction, client, sender) {
  transaction.setSenderIfNotSet(sender);
  const bytes = await transaction.build({ client });
  return toBase64(bytes);
}

export function isStaleObjectVersionError(error) {
  const message = String(error?.message || error || '');
  return /needs to be rebuilt|version .* unavailable|current version/i.test(message);
}

export function normalizeOrderId(order) {
  if (order == null) return '';
  if (typeof order === 'string' || typeof order === 'number' || typeof order === 'bigint') return String(order);
  return String(order.orderId || order.order_id || order.id || order.order_id_id || '');
}

export async function fetchOrderBookRange(client, { poolKey = projectConfig.deepBookPoolKey, midPrice = 3.42, width = 0.4, isBid = false } = {}) {
  if (!client?.deepbook) throw new Error('DeepBook client is not initialized.');
  return client.deepbook.getLevel2Range(poolKey, Math.max(0.0001, midPrice - width), midPrice + width, isBid);
}

export async function fetchMarketQuote(client, { poolKey = projectConfig.deepBookPoolKey, ticks = 10 } = {}) {
  if (!client?.deepbook) throw new Error('DeepBook client is not initialized.');
  const [midResult, level2] = await Promise.allSettled([
    client.deepbook.midPrice(poolKey),
    client.deepbook.getLevel2TicksFromMid(poolKey, ticks),
  ]);

  const ticksData = level2.status === 'fulfilled' ? level2.value : null;
  const bestBid = bestPrice(ticksData?.bid_prices, 'bid');
  const bestAsk = bestPrice(ticksData?.ask_prices, 'ask');

  let midPrice = midResult.status === 'fulfilled' ? toFiniteNumber(midResult.value) : null;
  if (midPrice == null && bestBid != null && bestAsk != null) {
    midPrice = Number(((bestBid + bestAsk) / 2).toFixed(9));
  }

  if (midPrice == null && bestBid == null && bestAsk == null) {
    throw new Error('DeepBook returned no market price for this pool.');
  }

  return { poolKey, midPrice, bestBid, bestAsk };
}

function bestPrice(prices, side) {
  if (!Array.isArray(prices)) return null;
  const valid = prices.map(toFiniteNumber).filter((value) => value != null && value > 0);
  if (!valid.length) return null;
  return side === 'bid' ? Math.max(...valid) : Math.min(...valid);
}

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function ensureTransactionDetails(client, result) {
  const changedObjects = result?.effects?.changedObjects || result?.effects?.changed_objects || [];
  if (changedObjects.length && result?.objectTypes) return result;
  if (!result?.digest || !client?.getTransaction) return result;

  const hydrated = await client.getTransaction({
    digest: result.digest,
    include: { effects: true, objectTypes: true, events: true, transaction: true },
  });

  return hydrated.Transaction || result;
}

export function extractCreatedObjectId(result, typeNeedle) {
  const objectTypes = result.objectTypes || result.effects?.objectTypes || {};
  const changed = result.effects?.changedObjects || result.effects?.changed_objects || [];
  for (const object of changed) {
    const id = object.objectId || object.object_id;
    const operation = object.idOperation || object.id_operation;
    const type = objectTypes[id] || object.objectType || object.object_type || '';
    if (operation === 'Created' && String(type).includes(typeNeedle)) return id;
  }
  return '';
}
