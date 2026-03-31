import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import {
  getBalance,
  getUserStats,
  getGlobalStats,
  isOptedIn,
  optInToVault,
  depositToVault,
  getExplorerTransactionUrl,
} from '../services/algorand'
import ProgressJourney from '../components/ProgressJourney'
import TransactionHistory from '../components/TransactionHistory'
import AIChatbot from '../components/AIChatbot'
import confetti from 'canvas-confetti'

const RESERVE_MILESTONES = [
  { label: 'Seed Fund', threshold: 10, icon: '\u{1F331}' },
  { label: 'Ready Reserve', threshold: 50, icon: '\u{1F6E1}\uFE0F' },
  { label: 'Full Protection', threshold: 100, icon: '\u{1F3D8}\uFE0F' },
]

export default function CommunityReserve() {
  const { activeAddress, wallets, signTransactions } = useWallet()
  const navigate = useNavigate()

  const [balance, setBalance] = useState('...')
  const [userStats, setUserStats] = useState({ totalSaved: 0, milestone: 0, streak: 0, lastDeposit: 0 })
  const [globalStats, setGlobalStats] = useState({ totalDeposited: 0, totalUsers: 0 })
  const [optedIn, setOptedIn] = useState<boolean | null>(null)
  const [optingIn, setOptingIn] = useState(false)

  const [depositAmount, setDepositAmount] = useState('')
  const [depositing, setDepositing] = useState(false)
  const [depositTxId, setDepositTxId] = useState<string | null>(null)
  const [depositError, setDepositError] = useState<string | null>(null)

  const refreshData = useCallback(async () => {
    if (!activeAddress) return
    const [bal, stats, global, opted] = await Promise.all([
      getBalance(activeAddress),
      getUserStats(activeAddress).catch(() => ({ totalSaved: 0, milestone: 0, streak: 0, lastDeposit: 0 })),
      getGlobalStats().catch(() => ({ totalDeposited: 0, totalUsers: 0 })),
      isOptedIn(activeAddress).catch(() => false),
    ])
    setBalance(bal)
    setUserStats(stats)
    setGlobalStats(global)
    setOptedIn(opted)
  }, [activeAddress])

  useEffect(() => { refreshData() }, [refreshData])

  if (!activeAddress) { navigate('/'); return null }

  const disconnect = () => { wallets?.forEach((w) => { if (w.isConnected) w.disconnect() }) }
  const truncated = `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`
  const savedAlgo = userStats.totalSaved / 1_000_000
  const globalAlgo = globalStats.totalDeposited / 1_000_000
  const reserveTarget = 100
  const reserveHealthPct = Math.min(100, (globalAlgo / reserveTarget) * 100)
  const reserveStatus = reserveHealthPct >= 80 ? 'Ready' : reserveHealthPct >= 40 ? 'Building' : 'Needs Funding'
  const statusColor = reserveHealthPct >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : reserveHealthPct >= 40 ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-red-600 bg-red-50 border-red-100'

  const handleOptIn = async () => {
    setOptingIn(true)
    try {
      await optInToVault(signTransactions, activeAddress)
      setOptedIn(true)
      refreshData()
    } catch (e: any) {
      alert(e?.message || 'Opt-in failed')
    } finally {
      setOptingIn(false)
    }
  }

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount)
    if (!amt || amt < 1) { setDepositError('Minimum 1 ALGO'); return }
    setDepositing(true)
    setDepositError(null)
    setDepositTxId(null)
    try {
      const txId = await depositToVault(signTransactions, activeAddress, amt)
      setDepositTxId(txId)
      setDepositAmount('')
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#10b981', '#059669', '#34d399'] })
      refreshData()
    } catch (e: any) {
      setDepositError(e?.message || 'Deposit failed')
    } finally {
      setDepositing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] font-sans">
      {/* NAVBAR */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#7c3aed] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <span className="font-bold text-lg text-gray-900 tracking-tight">AlgoVault</span>
            </button>
            <span className="text-gray-300 hidden sm:inline">/</span>
            <span className="text-sm font-semibold text-emerald-600 hidden sm:inline">Community Reserve</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Testnet
            </div>
            <div className="text-sm font-mono text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">{truncated}</div>
            <div className="text-sm font-semibold text-gray-900 hidden sm:block">{balance} <span className="text-gray-400 font-normal">ALGO</span></div>
            <button onClick={disconnect} className="text-gray-400 hover:text-red-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </nav>

      {/* HERO HEADER */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="mx-auto max-w-6xl px-5 sm:px-6 py-8 sm:py-12 relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Community Disaster Reserve</span>
          </div>
          <h1 className="text-white font-extrabold text-2xl sm:text-3xl tracking-tight mb-2">
            When disaster strikes, the fund is already ready.
          </h1>
          <p className="text-white/60 text-sm sm:text-base max-w-2xl leading-relaxed">
            A transparent, community-owned emergency reserve. Multiple villagers contribute, progress is public,
            and every ALGO is traceable on Algorand.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-8 space-y-6 pb-28">
        {/* OPT-IN BANNER */}
        {optedIn === false && (
          <div className="flex flex-col sm:flex-row items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl px-6 py-5 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">Join the community reserve</p>
                <p className="text-xs text-amber-700/70 mt-0.5">Opt in to start contributing to the disaster fund.</p>
              </div>
            </div>
            <button onClick={handleOptIn} disabled={optingIn} className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all shadow-sm whitespace-nowrap">
              {optingIn ? 'Opting in...' : 'Join Now'}
            </button>
          </div>
        )}

        {/* RESERVE HEALTH */}
        <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 card-shadow">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900 text-lg">Reserve Health</h2>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border ${statusColor}`}>
              {reserveStatus}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{globalAlgo.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">ALGO Pooled</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{globalStats.totalUsers}</p>
              <p className="text-xs text-gray-500 mt-1">Community Members</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{reserveHealthPct.toFixed(0)}%</p>
              <p className="text-xs text-gray-500 mt-1">Target Reached</p>
            </div>
          </div>
          <div className="h-4 bg-white rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 relative ${
                reserveHealthPct >= 80 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                reserveHealthPct >= 40 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                'bg-gradient-to-r from-red-400 to-red-600'
              }`}
              style={{ width: `${reserveHealthPct}%` }}
            >
              <div className="absolute inset-0 progress-shimmer rounded-full" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Target: {reserveTarget} ALGO community reserve</p>
        </div>

        {/* JOURNEY */}
        <ProgressJourney
          savedAlgo={savedAlgo}
          milestones={RESERVE_MILESTONES}
          currentMilestone={userStats.milestone}
          variant="community"
        />

        <div className="grid lg:grid-cols-2 gap-6">
          {/* LEFT */}
          <div className="space-y-6">
            {/* CONTRIBUTE */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 card-shadow">
              <h2 className="font-bold text-gray-900 text-lg mb-1">Contribute to Reserve</h2>
              <p className="text-xs text-gray-500 mb-4">Every contribution strengthens the community safety net.</p>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Amount in ALGO (min 1)"
                  min="1"
                  step="0.1"
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                />
                <button onClick={handleDeposit} disabled={depositing || optedIn === false} className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all shadow-sm whitespace-nowrap">
                  {depositing ? 'Sending...' : 'Deposit'}
                </button>
              </div>
              {depositError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{depositError}</p>}
              {depositTxId && (
                <a href={getExplorerTransactionUrl(depositTxId)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-emerald-600 hover:underline mt-3">
                  Contribution confirmed! View on Lora
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              )}
            </div>

            {/* YOUR CONTRIBUTION */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 card-shadow">
              <h3 className="font-bold text-gray-900 text-base mb-4">Your Contribution</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Amount Contributed</p>
                  <p className="text-xl font-bold text-gray-900">{savedAlgo.toFixed(2)} <span className="text-sm text-gray-400 font-normal">ALGO</span></p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Deposit Streak</p>
                  <p className="text-xl font-bold text-gray-900">{userStats.streak} <span className="text-sm text-gray-400 font-normal">days</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            {/* HOW IT WORKS */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 card-shadow">
              <h3 className="font-bold text-gray-900 text-base mb-4">How Community Reserve Works</h3>
              <div className="space-y-3">
                {[
                  { step: '1', text: 'Community members opt in and contribute ALGO regularly' },
                  { step: '2', text: 'Reserve health is tracked publicly — everyone sees progress' },
                  { step: '3', text: 'When an emergency occurs, funds can be released transparently' },
                  { step: '4', text: 'All transactions are on Algorand — auditable, trustless, permanent' },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 text-xs font-bold text-emerald-600">{s.step}</div>
                    <p className="text-sm text-gray-600 pt-0.5">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* TRUST */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 card-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Transparent & Trustless</p>
                  <p className="text-xs text-gray-500">No middleman controls the fund. Smart contract rules enforce every deposit and release.</p>
                </div>
              </div>
              <div className="text-xs text-gray-400 font-mono pt-2 border-t border-gray-50">
                App ID: {import.meta.env.VITE_APP_ID} &middot; Algorand Testnet
              </div>
            </div>

            {/* EMERGENCY READINESS */}
            <div className={`rounded-2xl border p-5 card-shadow ${
              reserveHealthPct >= 80 ? 'border-emerald-200 bg-emerald-50' :
              reserveHealthPct >= 40 ? 'border-amber-200 bg-amber-50' :
              'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                  reserveHealthPct >= 80 ? 'bg-emerald-100' : reserveHealthPct >= 40 ? 'bg-amber-100' : 'bg-red-100'
                }`}>
                  {reserveHealthPct >= 80 ? '\u{2705}' : reserveHealthPct >= 40 ? '\u{26A0}\uFE0F' : '\u{1F6A8}'}
                </div>
                <div>
                  <p className={`text-sm font-bold ${
                    reserveHealthPct >= 80 ? 'text-emerald-800' : reserveHealthPct >= 40 ? 'text-amber-800' : 'text-red-800'
                  }`}>
                    Emergency Readiness: {reserveStatus}
                  </p>
                  <p className={`text-xs ${
                    reserveHealthPct >= 80 ? 'text-emerald-600' : reserveHealthPct >= 40 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {reserveHealthPct >= 80
                      ? 'Reserve is well-funded and ready for emergencies.'
                      : reserveHealthPct >= 40
                        ? 'Reserve is building. Continue contributing to reach readiness.'
                        : 'Reserve needs more funding. Every ALGO counts.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TRANSACTION HISTORY */}
        <TransactionHistory address={activeAddress} />
      </div>

      <AIChatbot
        address={activeAddress}
        totalSaved={savedAlgo}
        streak={userStats.streak}
        milestone={userStats.milestone}
        onOpenDeposit={() => {}}
      />
    </div>
  )
}
