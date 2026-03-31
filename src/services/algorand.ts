import algosdk from 'algosdk';

const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', 443);

export const getBalance = async (address: string): Promise<string> => {
  try {
    const accountInfo = await algodClient.accountInformation(address).do() as { amount?: number };
    const microAlgos = accountInfo.amount ?? 0;
    return (microAlgos / 1000000).toFixed(2);
  } catch (error) {
    console.error('Failed to fetch balance:', error);
    return '0.00';
  }
};
