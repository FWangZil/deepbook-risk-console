import { SuiGrpcClient } from '@mysten/sui/grpc';
import { projectConfig } from './config.js';

export function createSuiClient() {
  return new SuiGrpcClient({
    network: 'testnet',
    baseUrl: projectConfig.rpcUrl,
  });
}

export async function getTransaction(digest) {
  return createSuiClient().getTransaction({
    digest,
    include: {
      effects: true,
      transaction: true,
      events: true,
      objectTypes: true,
      balanceChanges: true,
    },
  });
}
