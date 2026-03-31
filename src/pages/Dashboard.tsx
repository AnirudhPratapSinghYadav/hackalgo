import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import {
  getBalance,
  getUserStats,
  getGlobalStats,
  isOptedIn,
  optInToVault,
} from '../services/algorand'
import DepositForm from '../components/DepositForm'
import WithdrawForm from '../components/WithdrawForm'
import TransactionHistory from '../components/TransactionHistory'
import MilestoneCards from '../components/MilestoneCard'
import SavingsCoach from '../components/SavingsCoach'

const VAULT_TYPES = [
  { id: 'personal', icon: '\u{1F3E6}', name: 'Personal Savings', desc: 'Long-term wealth building', accent: 'from-blue-500 to-indigo-600', border: 'border-blue-400', bg: 'bg-blue-50', tag: 'Steady Growth' },
  { id: 'harvest', icon: '\u{1F33E}', name: 'Harvest Vault', desc: 'Seasonal income protection', accent: 'from-amber-500 to-yellow-500', border: 'border-amber-400', bg: 'bg-amber-50', tag: 'Seasonal' },
  { id: 'emergency', icon: '\u{1F6A8}', name: 'Emergency Fund', desc: 'Crisis-proof blockchain reserve', accent: 'from-red-500 to-rose-500', border: 'border-red-400', bg: 'bg-red-50', tag: 'Safety Net' },
  { id: 'remittance', icon: '\u{1F4B8}', name: 'Remittance Vault', desc: 'Cross-border transfer buffer', accent: 'from-emerald-500 to-teal-500', border: 'border-emerald-400', bg: 'bg-emerald-50', tag: 'Global' },
] as const

const MILESTONES = [
  { level: 1, name: 'Vault Starter', threshold: 10 },
  { level: 2, name: 'Vault Builder', threshold: 50 },
  { level: 3, name: 'Vault Master', threshold: 100 },
]

function badgeName(level: number) {
  return MILESTONES.find((m) => m.level === level)?.name ?? 'None'
}

function nextMilestone(currentAlgo: number) {
  for (const m of MILESTONES) {
    if (currentAlgo < m.threshold) return m
  }
  return null
}

export default function Dashboard() {
  const { activeAddress, wallets, signTransactions } = useWallet()
  const navigate = useNavigate()

  const [balance, setBalance] = useState('...')
  const [userStats, setUserStats] = useState({ totalSaved: 0, milestone: 0, streak: 0, lastDeposit: 0 })
  const [globalStats, setGlobalStats] = useState({ totalDeposited: 0, totalUsers: 0 })
  const [optedIn, setOptedIn] = useState<boolean | null>(null)
  const [optingIn, setOptingIn] = useState(false)
  const [vaultType, setVaultType] = useState('personal')
  const [showDeposit, setShowDeposit] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)

  const activeWallet = wallets?.find((w) => w.isActive) ?? wallets?.find((w) => w.isConnected)

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

  useEffect(() => {
    refreshData()
  }, [refreshData])

  if (!activeAddress) return <Navigate to="/" replace />

  const disconnect = () => {
    wallets?.forEach((w) => { if (w.isConnected) w.disconnect() })
  }

  const truncated = `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`

  const savedAlgo = userStats.totalSaved / 1_000_000
  const globalAlgo = globalStats.totalDeposited / 1_000_000
  const next = nextMilestone(savedAlgo)
  const prevThreshold = next ? (MILESTONES.find((m) => m.level === next.level - 1)?.threshold ?? 0) : 100
  const progressPct = next
    ? Math.min(100, ((savedAlgo - prevThreshold) / (next.threshold - prevThreshold)) * 100)
    : 100
  const questSteps = [
    { label: 'Connect wallet', done: !!activeAddress },
    { label: 'Opt in to vault', done: optedIn === true },
    { label: 'Make first deposit', done: userStats.totalSaved > 0 },
    { label: 'Claim first badge', done: userStats.milestone >= 1 },
  ]

  const handleOptIn = async () => {
    if (!activeAddress) return
    setOptingIn(true)
    try {
      await optInToVault(signTransactions, activeAddress)
      setOptedIn(true)
      refreshData()
    } catch (e: any) {
      console.error('Opt-in failed:', e)
      alert(e?.message || 'Opt-in failed. Please try again.')
    } finally {
      setOptingIn(false)
    }
  }

  const STAT_CARDS = [
    {
      label: 'Your Savings',
      value: savedAlgo.toFixed(2),
      unit: 'ALGO',
      sub: 'Personal vault balance',
      gradient: 'from-blue-500 to-blue-600',
      bgLight: 'bg-blue-50',
      iconColor: 'text-blue-500',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
      ),
    },
    {
      label: 'Global Vault',
      value: globalAlgo.toFixed(2),
      unit: 'ALGO',
      sub: `${globalStats.totalUsers} total users`,
      gradient: 'from-emerald-500 to-green-600',
      bgLight: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      ),
    },
    {
      label: 'Your Streak',
      value: String(userStats.streak),
      unit: 'days',
      sub: 'Consecutive deposits',
      gradient: 'from-orange-400 to-orange-500',
      bgLight: userStats.streak > 0 ? 'bg-orange-50' : 'bg-gray-50',
      iconColor: userStats.streak > 0 ? 'text-orange-500' : 'text-gray-400',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>
      ),
    },
    {
      label: 'Milestone',
      value: `${userStats.milestone}`,
      unit: '/ 3',
      sub: badgeName(userStats.milestone),
      gradient: 'from-violet-500 to-purple-600',
      bgLight: 'bg-violet-50',
      iconColor: 'text-violet-500',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-[#f8f9fb] font-sans">
      {/* NAVBAR */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#7c3aed] flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <span className="font-bold text-lg text-gray-900 tracking-tight">AlgoVault</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Testnet
            </div>
            <div className="text-sm font-mono text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">{truncated}</div>
            <div className="text-sm font-semibold text-gray-900">{balance} <span className="text-gray-400 font-normal">ALGO</span></div>
            <button onClick={disconnect} className="ml-1 text-sm text-gray-400 hover:text-red-500 transition-colors font-medium">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8 pb-28 space-y-8">
        {/* OPT-IN BANNER */}
        {optedIn === false && (
          <div className="flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl px-6 py-5 card-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">Opt into the vault to get started</p>
                <p className="text-xs text-amber-700/70 mt-0.5">This one-time transaction enables deposits, badges, and streak tracking.</p>
              </div>
            </div>
            <button
              onClick={handleOptIn}
              disabled={optingIn}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all shadow-sm"
            >
              {optingIn ? 'Opting in...' : 'Opt In Now'}
            </button>
          </div>
        )}

        {/* VAULT TYPE SELECTOR */}
        <div>
          <h2 className="text-gray-900 font-bold text-lg mb-3 tracking-tight">Choose Your Vault Strategy</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {VAULT_TYPES.map((v) => {
              const selected = vaultType === v.id
              return (
                <button
                  key={v.id}
                  onClick={() => setVaultType(v.id)}
                  className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-300 group overflow-hidden ${
                    selected ? `${v.border} card-shadow` : 'border-gray-100 hover:border-gray-200 bg-white hover:card-shadow'
                  }`}
                >
                  {selected && <div className={`absolute inset-0 bg-gradient-to-br ${v.accent} opacity-[0.07]`} />}
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl group-hover:scale-110 transition-transform inline-block">{v.icon}</span>
                      {selected && <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-gradient-to-r ${v.accent} text-white`}>{v.tag}</span>}
                    </div>
                    <div className="font-bold text-sm text-gray-900">{v.name}</div>
                    <div className="text-xs text-gray-500 mt-1 leading-relaxed">{v.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* PACK A — WINNING FEATURES */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-gray-900 font-bold text-lg tracking-tight">Blockchain-Powered Features</h2>
              <p className="text-xs text-gray-500 mt-0.5">Real on-chain smart contract modules — not simulations</p>
            </div>
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live on Algorand
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* SAVINGS PACT */}
            <button onClick={() => navigate('/pact')} className="group relative text-left rounded-2xl overflow-hidden border border-violet-200/60 hover:border-violet-300 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10 hover:-translate-y-0.5">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-indigo-700 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <svg className="w-5 h-5 text-violet-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1.5">Savings Pact</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">Two wallets commit to saving together. Miss a deposit and the smart contract auto-penalizes you into your partner's vault.</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">Social Accountability</span>
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">2-Person</span>
                </div>
              </div>
            </button>

            {/* TEMPTATION LOCK */}
            <button onClick={() => navigate('/temptation-lock')} className="group relative text-left rounded-2xl overflow-hidden border border-red-200/60 hover:border-red-300 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10 hover:-translate-y-0.5">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-orange-500 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <svg className="w-5 h-5 text-red-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1.5">Temptation Lock</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">Set your goal and design your own punishment. Withdraw early and the penalty automatically goes to charity, burn, or a friend.</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">Behavioral Economics</span>
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">Self-Enforced</span>
                </div>
              </div>
            </button>

            {/* DREAM BOARD */}
            <button onClick={() => navigate('/dream-board')} className="group relative text-left rounded-2xl overflow-hidden border border-cyan-200/60 hover:border-cyan-300 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-0.5">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <svg className="w-5 h-5 text-cyan-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1.5">Dream Board</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">Upload your dream goal image. It starts fully blurred and becomes crystal clear as your savings grow. Stored on Algorand forever.</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-100">Goal Visualization</span>
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">On-Chain</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map((card) => (
            <div key={card.label} className="rounded-2xl border border-gray-100 p-5 bg-white card-shadow hover:card-shadow-hover transition-all duration-200 group">
              <div className="flex items-center gap-2.5 mb-4">
                <div className={`w-10 h-10 rounded-xl ${card.bgLight} flex items-center justify-center ${card.iconColor} group-hover:scale-105 transition-transform`}>
                  {card.icon}
                </div>
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{card.label}</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 tracking-tight">
                {card.value} <span className="text-sm font-normal text-gray-400">{card.unit}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1.5">{card.sub}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-100 p-5 bg-white card-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 text-base">Gamified Savings Quest</h3>
            <span className="text-xs text-gray-500">{questSteps.filter((s) => s.done).length}/4 complete</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
            {questSteps.map((step, i) => {
              const isNext = !step.done && (i === 0 || questSteps[i - 1].done)
              return (
                <div key={step.label} className={`rounded-xl px-3 py-2.5 border text-sm flex items-center gap-2 transition-all ${step.done ? 'bg-green-50 border-green-200 text-green-700' : isNext ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                  {step.done ? (
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  ) : isNext ? (
                    <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
                  ) : (
                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  )}
                  <span className={step.done ? 'line-through' : ''}>{step.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* PROGRESS SECTION */}
        <div className="rounded-2xl border border-gray-100 p-6 bg-white card-shadow">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-gray-900 text-lg tracking-tight">Progress to Next Milestone</h3>
            {next && (
              <span className="text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                Next: <span className="font-semibold text-gray-700">{next.name}</span> at {next.threshold} ALGO
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mb-3">
            <div className="text-sm font-bold text-gray-800 min-w-[60px]">{savedAlgo.toFixed(2)}</div>
            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-[#2563EB] to-[#7c3aed] rounded-full transition-all duration-700 ease-out relative"
                style={{ width: `${progressPct}%` }}
              >
                <div className="absolute inset-0 progress-shimmer rounded-full" />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-sm">{progressPct > 8 ? `${progressPct.toFixed(0)}%` : ''}</span>
              </div>
            </div>
            <div className="text-sm font-bold text-gray-800 min-w-[60px] text-right">{next?.threshold ?? 100} ALGO</div>
          </div>
          <div className="text-xs text-gray-500 mb-5">{progressPct.toFixed(0)}% complete</div>

          <div className="flex items-center gap-6 pt-4 border-t border-gray-50">
            {MILESTONES.map((m) => (
              <div key={m.level} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full transition-colors ${userStats.milestone >= m.level ? 'bg-gradient-to-br from-[#2563EB] to-[#7c3aed]' : 'bg-gray-200'}`} />
                <span className={`text-xs font-medium ${userStats.milestone >= m.level ? 'text-[#2563EB]' : 'text-gray-400'}`}>
                  {m.threshold} ALGO &middot; {m.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* MILESTONE BADGES */}
        <MilestoneCards
          savedAlgo={savedAlgo}
          currentMilestone={userStats.milestone}
          onBadgeClaimed={refreshData}
        />

        {/* DEPOSIT + WITHDRAW BUTTONS */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowDeposit(true)}
            disabled={optedIn === false}
            className="px-8 py-3.5 bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] hover:from-[#1d4ed8] hover:to-[#1e40af] text-white font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md glow-blue"
          >
            Deposit ALGO
          </button>
          <button
            onClick={() => setShowWithdraw(true)}
            disabled={optedIn === false || userStats.totalSaved === 0}
            className="px-6 py-3.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-sm"
          >
            Withdraw
          </button>
        </div>

        {/* TRANSACTION HISTORY */}
        {activeAddress && <TransactionHistory address={activeAddress} />}

        <div className="text-xs text-gray-400 pb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Connected via {activeWallet?.metadata.name ?? 'wallet'} &middot; App {Number(import.meta.env.VITE_APP_ID)}
        </div>
      </div>

      {showDeposit && (
        <DepositForm
          vaultType={vaultType}
          currentSavedAlgo={savedAlgo}
          onClose={() => setShowDeposit(false)}
          onSuccess={() => { setShowDeposit(false); refreshData() }}
        />
      )}

      {showWithdraw && (
        <WithdrawForm
          currentBalanceMicro={userStats.totalSaved}
          onClose={() => setShowWithdraw(false)}
          onSuccess={() => { setShowWithdraw(false); refreshData() }}
        />
      )}

      <SavingsCoach
        address={activeAddress}
        totalSaved={savedAlgo}
        streak={userStats.streak}
        milestone={userStats.milestone}
        vaultType={vaultType}
        onOpenDeposit={() => setShowDeposit(true)}
      />
    </div>
  )
}
