import { AlgorandClient } from '@algorandfoundation/algokit-utils';

export const algorandClient = AlgorandClient.fromConfig({
  algodConfig: {
    server: 'https://testnet-api.algonode.cloud',
    port: 443,
    token: ''
  },
  indexerConfig: {
    server: 'https://testnet-idx.algonode.cloud',
    port: 443,
    token: ''
  }
});

export const getBalance = async (address: string): Promise<string> => {
  try {
    const accountInfo = await algorandClient.client.algod.accountInformation(address).do() as any;
    return (accountInfo.amount / 1000000).toFixed(2);
  } catch (error) {
    console.error('Failed to fetch balance:', error);
    return '0.00';
  }
};
