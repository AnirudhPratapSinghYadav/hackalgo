import { useEffect, useState } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { getBalance } from '../services/algorand';

const WALLETS = [
  { id: 'pera', name: 'Pera Wallet', color: 'from-yellow-400 to-orange-400', letter: 'P' },
  { id: 'defly', name: 'Defly Wallet', color: 'from-violet-500 to-purple-600', letter: 'D' },
  { id: 'walletconnect', name: 'WalletConnect', color: 'from-blue-400 to-blue-600', letter: 'W' },
];

export default function WalletConnect() {
  const { wallets, activeAddress } = useWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  useEffect(() => {
    if (activeAddress) {
      getBalance(activeAddress).then(setBalance);
    } else {
      setBalance(null);
    }
  }, [activeAddress]);

  const handleConnect = async (walletId: string) => {
    if (isConnecting) return;
    const wallet = wallets?.find(w => w.id === walletId || w.id.toLowerCase() === walletId.toLowerCase());
    if (wallet) {
      if (wallet.isConnected) {
        wallet.setActive();
      } else {
        setIsConnecting(walletId);
        try {
          await wallet.connect();
        } catch (e) {
          console.error('Wallet connection failed:', e);
        } finally {
          setIsConnecting(null);
        }
      }
    }
  };

  const handleDisconnect = () => {
    wallets?.forEach(w => { if (w.isConnected) w.disconnect() });
  };

  const truncateAddress = (address: string) =>
    address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  if (activeAddress) {
    return (
      <div className="flex flex-col w-full">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#7c3aed] flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <span className="font-bold text-xl text-gray-900">AlgoVault</span>
        </div>
        <p className="text-gray-500 text-sm mb-8">AI-Powered Savings Vault Tracker</p>

        <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-b from-green-50 to-white border border-green-200/60 rounded-2xl w-full card-shadow">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 glow-green">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-xl font-bold text-green-600 mb-1">Connected</h2>
          <p className="text-sm font-mono text-gray-600 mb-4 bg-gray-100 px-3 py-1 rounded-lg">
            {truncateAddress(activeAddress)}
          </p>
          <div className="flex flex-col items-center mb-6">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Balance</span>
            <span className="text-3xl font-bold text-gray-900">{balance ?? '...'} <span className="text-base text-gray-400 font-normal">ALGO</span></span>
          </div>
          <button onClick={handleDisconnect} className="text-sm text-red-500 hover:text-red-600 font-medium hover:underline transition-colors">
            Disconnect
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          Built on Algorand &middot; Powered by AlgoVault
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#7c3aed] flex items-center justify-center">
          <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
        </div>
        <span className="font-bold text-xl text-gray-900">AlgoVault</span>
      </div>
      <p className="text-gray-500 text-sm mb-8">AI-Powered Savings Vault Tracker</p>

      <h2 className="font-bold text-2xl text-gray-900 mb-1.5">Connect wallet</h2>
      <p className="text-sm text-gray-500 mb-7">
        Choose a provider to get started or{' '}
        <a href="https://perawallet.app/" target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline font-medium">create a wallet</a>
      </p>

      <div className="flex flex-col gap-2">
        {WALLETS.map((w) => (
          <button
            key={w.id}
            onClick={() => handleConnect(w.id)}
            disabled={!!isConnecting}
            className={`flex items-center w-full p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:card-shadow transition-all group ${isConnecting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${w.color} flex items-center justify-center mr-3.5 flex-shrink-0`}>
              {isConnecting === w.id ? (
                <svg className="animate-spin w-5 h-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
              ) : (
                <span className="text-white text-sm font-bold">{w.letter}</span>
              )}
            </div>
            <div className="text-left">
              <span className="font-semibold text-gray-900 text-sm">
                {isConnecting === w.id ? 'Connecting...' : w.name}
              </span>
            </div>
            <svg className="w-5 h-5 ml-auto text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>
        ))}
      </div>

      <div className="mt-8">
        <p className="text-center text-sm text-gray-400 mb-2">
          New to Algorand?{' '}
          <a href="https://perawallet.app/" target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline font-medium">Get started</a>
        </p>
        <p className="text-center text-xs text-gray-400 mt-4">
          Built on Algorand &middot; Powered by AlgoVault
        </p>
      </div>
    </div>
  );
}
