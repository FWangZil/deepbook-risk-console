const env = typeof import.meta.env === 'undefined' ? process.env : import.meta.env;

export const projectConfig = {
  id: 'deepbook-risk-console',
  title: "DeepBook Risk Console",
  network: 'testnet',
  rpcUrl: env.VITE_SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',
  deepBookPoolKey: env.VITE_DEEPBOOK_POOL_KEY || 'SUI_DBUSDC',
  deepBookManagerKey: env.VITE_DEEPBOOK_MANAGER_KEY || 'MANAGER_1',
  deepBookBalanceManagerId: env.VITE_DEEPBOOK_BALANCE_MANAGER_ID || '',
  deepBookTradeCapId: env.VITE_DEEPBOOK_TRADE_CAP_ID || '',
  guardPackageId: env.VITE_GUARD_PACKAGE_ID || env.VITE_PACKAGE_ID || '',
  guardPolicyId: env.VITE_GUARD_POLICY_ID || env.VITE_PRIMARY_OBJECT_ID || '',
  deepBookIndexerUrl: env.VITE_DEEPBOOK_INDEXER_URL || 'https://deepbook-indexer.testnet.mystenlabs.com/',
};
