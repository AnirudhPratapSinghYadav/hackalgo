import WalletConnect from './components/WalletConnect';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useWallet } from '@txnlab/use-wallet-react';
import Dashboard from './pages/Dashboard';
import SavingsPact from './pages/SavingsPact';
import TemptationLock from './pages/TemptationLock';
import DreamBoard from './pages/DreamBoard';

function FloatingCard({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <div className={`absolute glass rounded-2xl border border-white/10 shadow-2xl ${className}`}>
      {children}
    </div>
  );
}

function Landing() {
  return (
    <div className="flex h-screen w-full font-sans overflow-hidden">
      {/* LEFT HALF — illustrative hero */}
      <div className="relative w-1/2 h-full hidden lg:flex flex-col bg-[#0a0e27]">
        {/* Abstract background image — blockchain / digital finance themed */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1400&q=80')" }}
        />
        {/* Multi-layer gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e27] via-[#0f172a]/60 to-[#2563EB]/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e27] via-transparent to-transparent" />

        {/* Decorative grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        {/* Decorative glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-violet-500/10 rounded-full blur-[80px]" />

        {/* Top bar */}
        <div className="relative z-10 p-7 flex items-center justify-between">
          <div className="flex items-center gap-2 glass px-4 py-2 rounded-full border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/90 text-xs font-semibold tracking-wide">Algorand Testnet</span>
          </div>
          <div className="glass px-4 py-2 rounded-full text-white/50 text-xs font-mono border border-white/10">
            App ID: {import.meta.env.VITE_APP_ID}
          </div>
        </div>

        {/* Floating illustrative cards */}
        <div className="relative z-10 flex-1">
          {/* Vault balance card */}
          <FloatingCard className="top-[12%] left-[8%] p-4 w-56 animate-[float_6s_ease-in-out_infinite]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <span className="text-white/70 text-xs font-medium">Vault Balance</span>
            </div>
            <div className="text-white text-2xl font-bold">247.50 <span className="text-sm text-white/40 font-normal">ALGO</span></div>
            <div className="flex items-center gap-1 mt-1.5">
              <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
              <span className="text-emerald-400 text-xs font-semibold">+12.5%</span>
              <span className="text-white/30 text-xs ml-1">this week</span>
            </div>
          </FloatingCard>

          {/* Badge achievement card */}
          <FloatingCard className="top-[8%] right-[10%] p-3.5 w-48 animate-[float_7s_ease-in-out_infinite_0.5s]">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-lg shadow-lg shadow-amber-500/20">
                {'\u{1F3C6}'}
              </div>
              <div>
                <div className="text-white text-xs font-bold">Vault Builder</div>
                <div className="text-white/40 text-[10px]">Badge Unlocked!</div>
              </div>
            </div>
          </FloatingCard>

          {/* Streak card */}
          <FloatingCard className="top-[45%] right-[6%] p-3.5 w-44 animate-[float_5s_ease-in-out_infinite_1s]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>
              </div>
              <span className="text-white/60 text-[10px] font-semibold uppercase tracking-wider">Streak</span>
            </div>
            <div className="text-white text-xl font-bold">14 <span className="text-xs text-white/30 font-normal">days</span></div>
          </FloatingCard>

          {/* Transaction confirmation */}
          <FloatingCard className="bottom-[32%] left-[12%] p-3 w-52 animate-[float_8s_ease-in-out_infinite_2s]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <div className="text-white/90 text-xs font-semibold">Deposit Confirmed</div>
                <div className="text-white/30 text-[10px] font-mono">5.00 ALGO &middot; 2.4s</div>
              </div>
            </div>
          </FloatingCard>
        </div>

        {/* Bottom content */}
        <div className="relative z-10 p-10 pb-10">
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-5 border border-white/10">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            <span className="text-white/80 text-xs font-semibold">Secured by Algorand Blockchain</span>
          </div>

          <h1 className="text-white font-bold text-[2.75rem] leading-[1.1] mb-4 tracking-tight">
            AI-Powered Savings<br />
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">Vault on Algorand</span>
          </h1>
          <p className="text-white/45 text-base leading-relaxed max-w-md mb-6">
            Earn milestone badges, track your deposit streak, and grow your savings with full on-chain transparency and AI coaching.
          </p>

          <div className="flex flex-wrap gap-2 mb-8">
            {[
              { label: 'Milestone Badges', icon: '\u{1F3C6}' },
              { label: 'Atomic Deposits', icon: '\u{26A1}' },
              { label: 'AI Coach', icon: '\u{1F9E0}' },
              { label: 'NFT Rewards', icon: '\u{1F3A8}' },
            ].map(pill => (
              <span key={pill.label} className="glass text-white/70 text-xs px-3.5 py-1.5 rounded-full border border-white/[0.06] flex items-center gap-1.5 hover:bg-white/[0.06] hover:border-white/10 transition-all cursor-default">
                <span>{pill.icon}</span>
                {pill.label}
              </span>
            ))}
          </div>

          <div className="flex gap-10 pt-5 border-t border-white/[0.06]">
            <div>
              <div className="text-white font-bold text-2xl tracking-tight">3</div>
              <div className="text-white/30 text-xs mt-0.5">Badge Tiers</div>
            </div>
            <div>
              <div className="text-white font-bold text-2xl tracking-tight">100%</div>
              <div className="text-white/30 text-xs mt-0.5">On-Chain</div>
            </div>
            <div>
              <div className="text-white font-bold text-2xl tracking-tight">&lt;3s</div>
              <div className="text-white/30 text-xs mt-0.5">Finality</div>
            </div>
            <div>
              <div className="text-white font-bold text-2xl tracking-tight">AI</div>
              <div className="text-white/30 text-xs mt-0.5">Powered</div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT HALF */}
      <div className="w-full lg:w-1/2 h-full bg-white flex flex-col items-center justify-center relative">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle, #2563EB 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="w-full max-w-[420px] px-8 relative z-10">
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
        <Route path="/pact" element={activeAddress ? <SavingsPact /> : <Navigate to="/" replace />} />
        <Route path="/temptation-lock" element={activeAddress ? <TemptationLock /> : <Navigate to="/" replace />} />
        <Route path="/dream-board" element={activeAddress ? <DreamBoard /> : <Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
