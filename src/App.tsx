import React from 'react';
import WalletConnect from './components/WalletConnect';

function App() {
  return (
    <div className="flex h-screen w-full bg-white font-sans overflow-hidden">
      {/* LEFT HALF */}
      <div className="relative w-1/2 h-full hidden lg:block">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80')" }}
        />
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Top-left badge */}
        <div className="absolute top-6 left-6 flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-xs font-semibold shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          Algorand Testnet
        </div>

        {/* Bottom-left text block */}
        <div className="absolute bottom-0 left-0 p-8 w-full max-w-xl">
          <h1 className="text-white font-bold text-3xl mb-3 leading-tight">
            Protecting global supply chains with AI & blockchain
          </h1>
          <p className="text-white/80 text-sm mb-6 leading-relaxed">
            Multi-agent risk assessment powered by Google Gemini, with immutable on-chain verification on Algorand.
          </p>
          
          <div className="flex flex-wrap gap-2 mt-4">
            {["Multi-Agent AI", "Box Storage", "Fraud Prevention", "Escrow Refunds"].map(pill => (
              <span key={pill} className="bg-white/20 text-white text-xs px-3 py-1 rounded-full whitespace-nowrap backdrop-blur-sm border border-white/10">
                {pill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT HALF */}
      <div className="w-full lg:w-1/2 h-full bg-white flex flex-col items-center justify-center relative">
        <div className="w-full max-w-[400px] px-6">
          <WalletConnect />
        </div>
      </div>
    </div>
  );
}

export default App;
