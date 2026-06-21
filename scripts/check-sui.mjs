import { SuiGrpcClient } from '@mysten/sui/grpc';

const network = process.env.VITE_SUI_NETWORK || 'testnet';
const baseUrl = process.env.VITE_SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443';
const owner = process.env.VITE_OWNER_ADDRESS;

const client = new SuiGrpcClient({ network, baseUrl });
const referenceGasPrice = await client.getReferenceGasPrice();
console.log(JSON.stringify({ network, baseUrl, referenceGasPrice }, null, 2));

if (owner) {
  const balance = await client.getBalance({ owner });
  console.log(JSON.stringify({ owner, balance }, null, 2));
}
