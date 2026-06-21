const SUIVISION_TESTNET_URL = 'https://testnet.suivision.xyz';

export function buildProofLinks({ config, digest, balanceManagerId, policyId, guardReceiptId }) {
  const poolKey = config.deepBookPoolKey;
  const indexerUrl = trimTrailingSlash(config.deepBookIndexerUrl || '');
  const links = [];

  if (digest) {
    links.push({
      key: 'sui-transaction',
      label: 'SuiVision transaction',
      description: 'Last signed testnet transaction',
      href: `${SUIVISION_TESTNET_URL}/txblock/${digest}`,
    });
  }

  if (poolKey && balanceManagerId && indexerUrl) {
    links.push({
      key: 'deepbook-orders',
      label: 'DeepBook orders',
      description: 'Order id, side, price, quantity, status',
      href: `${indexerUrl}/orders/${poolKey}/${balanceManagerId}?limit=10`,
    });
    links.push({
      key: 'deepbook-updates',
      label: 'DeepBook updates',
      description: 'Placed and canceled order history',
      href: `${indexerUrl}/order_updates/${poolKey}?limit=10&balance_manager_id=${balanceManagerId}`,
    });
  }

  if (balanceManagerId) {
    links.push({
      key: 'balance-manager',
      label: 'BalanceManager object',
      description: 'DeepBook account object used by this demo',
      href: `${SUIVISION_TESTNET_URL}/object/${balanceManagerId}`,
    });
  }

  if (policyId) {
    links.push({
      key: 'guard-policy',
      label: 'GuardPolicy object',
      description: 'On-chain risk policy for guarded receipts',
      href: `${SUIVISION_TESTNET_URL}/object/${policyId}`,
    });
  }

  if (guardReceiptId) {
    links.push({
      key: 'guard-receipt',
      label: 'GuardReceipt object',
      description: 'Latest policy-bound execution receipt',
      href: `${SUIVISION_TESTNET_URL}/object/${guardReceiptId}`,
    });
  }

  return links;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}
