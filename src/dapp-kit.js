import { createDAppKit } from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { projectConfig } from './integrations/config.js';

export const dAppKit = createDAppKit({
  networks: ['testnet'],
  createClient: () => new SuiGrpcClient({ network: 'testnet', baseUrl: projectConfig.rpcUrl }),
});
