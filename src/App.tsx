import WalletConnect from './components/WalletConnect';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useWallet } from '@txnlab/use-wallet-react';
import Dashboard from './pages/Dashboard';

function Landing() {
  return (
    <div className="flex h-screen w-full bg-[#fafbfc] font-sans overflow-hidden">
      {/* LEFT HALF — hero with gradient overlay */}
      <div className="relative w-1/2 h-full hidden lg:flex flex-col">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f]/90 via-[#0f172a]/80 to-[#2563EB]/70" />

        {/* Top-left badge */}
        <div className="relative z-10 p-8 flex items-center justify-between">
          <div className="flex items-center gap-2 glass px-4 py-2 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/90 text-xs font-semibold tracking-wide">Algorand Testnet</span>
          </div>
          <div className="glass px-4 py-2 rounded-full text-white/70 text-xs font-medium">
            App ID: {import.meta.env.VITE_APP_ID}
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 flex-1 flex flex-col justify-end p-10 pb-12">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-6">
              <svg className="w-4 h-4 text-[#60a5fa]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              <span className="text-white/90 text-xs font-semibold">Secured by Algorand</span>
            </div>
            <h1 className="text-white font-bold text-4xl leading-[1.15] mb-4 tracking-tight">
              AI-Powered Savings<br />Vault on Algorand
            </h1>
            <p className="text-white/60 text-base leading-relaxed max-w-md">
              Earn milestone badges, track your streak, and grow your savings with full on-chain transparency.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Milestone Badges', icon: '\u{1F3C6}' },
              { label: 'Atomic Deposits', icon: '\u{26A1}' },
              { label: 'On-Chain Stats', icon: '\u{1F4CA}' },
              { label: 'NFT Rewards', icon: '\u{1F3A8}' },
            ].map(pill => (
              <span key={pill.label} className="glass text-white/80 text-xs px-3.5 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5 hover:bg-white/10 transition-colors">
                <span>{pill.icon}</span>
                {pill.label}
              </span>
            ))}
          </div>

          {/* Stats row */}
          <div className="flex gap-8 mt-8 pt-6 border-t border-white/10">
            <div>
              <div className="text-white font-bold text-2xl">3</div>
              <div className="text-white/50 text-xs">Badge Tiers</div>
            </div>
            <div>
              <div className="text-white font-bold text-2xl">100%</div>
              <div className="text-white/50 text-xs">On-Chain</div>
            </div>
            <div>
              <div className="text-white font-bold text-2xl">&lt;3s</div>
              <div className="text-white/50 text-xs">Finality</div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT HALF */}
      <div className="w-full lg:w-1/2 h-full bg-white flex flex-col items-center justify-center relative">
        <div className="w-full max-w-[420px] px-8">
          <WalletConnect />
        </div>
      </div>
    </div>
  );
}

function App() {
  const { activeAddress } = useWallet();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={activeAddress ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/dashboard" element={activeAddress ? <Dashboard /> : <Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
