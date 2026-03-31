import { useEffect, useState } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { getBalance } from '../services/algorand';

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
      if (wallets) {
          wallets.forEach(w => {
              if (w.isConnected) {
                  w.disconnect();
              }
          });
      }
  };

  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const HeaderLogo = () => (
    <div className="flex items-center gap-2 mb-2">
      <svg className="w-6 h-6 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <span className="font-bold text-xl text-[#111827]">AlgoVault</span>
    </div>
  );

  const FooterText = () => (
    <div className="mt-8">
      {!activeAddress && (
        <p className="text-center text-sm text-[#6B7280] mb-2">
          New to Algorand? <a href="https://perawallet.app/" target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">Create a wallet</a>
        </p>
      )}
      <p className="text-center text-xs text-[#6B7280] mt-4">
        Built on Algorand &middot; Powered by AlgoVault
      </p>
    </div>
  );

  if (activeAddress) {
    return (
      <div className="flex flex-col w-full">
        <HeaderLogo />
        <p className="text-[#6B7280] text-sm mb-10">AI-Powered Savings Vault Tracker</p>

        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 border border-[#E5E7EB] rounded-2xl w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
             <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-xl font-bold text-green-600 mb-1">Connected</h2>
          <p className="text-sm font-mono text-gray-600 mb-4 bg-gray-200 px-3 py-1 rounded">
            {truncateAddress(activeAddress)}
          </p>
          <div className="flex flex-col items-center mb-6">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Balance</span>
            <span className="text-3xl font-bold text-gray-900">{balance !== null ? balance : "..."} <span className="text-base text-gray-500 font-normal">ALGO</span></span>
          </div>
          
          <button 
            onClick={handleDisconnect}
            className="text-sm text-red-500 hover:text-red-600 underline"
          >
            Disconnect
          </button>
        </div>
        
        <FooterText />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <HeaderLogo />
      <p className="text-[#6B7280] text-sm mb-8">AI-Powered Savings Vault Tracker</p>
      
      <h2 className="font-bold text-2xl text-[#111827] mb-2">Connect wallet</h2>
      <p className="text-sm text-[#6B7280] mb-6">
        Connect through your wallet provider or <a href="https://perawallet.app/" target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">Create Wallet</a> if you don't have one
      </p>

      <div className="flex flex-col border-t border-[#E5E7EB]">
        
        {/* Pera Wallet */}
        <div 
          className={`flex items-center border-b border-[#E5E7EB] py-4 px-2 -mx-2 rounded transition-colors group ${isConnecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 hover:shadow-sm'}`}
          onClick={() => handleConnect('pera')}
        >
          <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center mr-3 flex-shrink-0">
             {isConnecting === 'pera' ? (
               <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
             ) : (
               <span className="text-white text-xs font-bold">P</span>
             )}
          </div>
          <span className="font-medium text-[#111827]">
            {isConnecting === 'pera' ? 'Connecting...' : 'Pera Wallet'}
          </span>
          <svg className="w-5 h-5 ml-auto text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        </div>

        {/* Defly Wallet */}
        <div 
          className={`flex items-center border-b border-[#E5E7EB] py-4 px-2 -mx-2 rounded transition-colors group ${isConnecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 hover:shadow-sm'}`}
          onClick={() => handleConnect('defly')}
        >
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center mr-3 flex-shrink-0">
             {isConnecting === 'defly' ? (
               <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
             ) : (
               <span className="text-white text-xs font-bold">D</span>
             )}
          </div>
          <span className="font-medium text-[#111827]">
            {isConnecting === 'defly' ? 'Connecting...' : 'Defly Wallet'}
          </span>
          <svg className="w-5 h-5 ml-auto text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        </div>

        {/* WalletConnect */}
        <div 
          className={`flex items-center border-b border-[#E5E7EB] py-4 px-2 -mx-2 rounded transition-colors group ${isConnecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 hover:shadow-sm'}`}
          onClick={() => handleConnect('walletconnect')}
        >
          <div className="w-8 h-8 rounded-full bg-[#3B99FC] flex items-center justify-center mr-3 flex-shrink-0">
             {isConnecting === 'walletconnect' ? (
               <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
             ) : (
               <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
             )}
          </div>
          <span className="font-medium text-[#111827]">
            {isConnecting === 'walletconnect' ? 'Connecting...' : 'WalletConnect'}
          </span>
          <svg className="w-5 h-5 ml-auto text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        </div>

      </div>

      <FooterText />
    </div>
  );
}
