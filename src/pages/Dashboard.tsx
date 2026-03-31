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
import ProgressJourney from '../components/ProgressJourney'
import AIChatbot from '../components/AIChatbot'
import { generateVaultSummary, type VaultSummaryType } from '../services/aiService'

const MILESTONES = [
  { level: 1, name: 'Vault Starter', threshold: 10 },
  { level: 2, name: 'Vault Builder', threshold: 50 },
  { level: 3, name: 'Vault Master', threshold: 100 },
]

function badgeName(level: number) {
  return MILESTONES.find((m) => m.level === level)?.name ?? 'None'
}

export default function Dashboard() {
  const { activeAddress, wallets, signTransactions } = useWallet()
  const navigate = useNavigate()

  const [balance, setBalance] = useState('...')
  const [userStats, setUserStats] = useState({ totalSaved: 0, milestone: 0, streak: 0, lastDeposit: 0 })
  const [globalStats, setGlobalStats] = useState({ totalDeposited: 0, totalUsers: 0 })
  const [optedIn, setOptedIn] = useState<boolean | null>(null)
  const [optingIn, setOptingIn] = useState(false)
  const [showDeposit, setShowDeposit] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryVault, setSummaryVault] = useState<VaultSummaryType>('personal')
  const [summaryText, setSummaryText] = useState<string>('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

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
  const questSteps = [
    { label: 'Connect wallet', done: !!activeAddress },
    { label: 'Opt in to vault', done: optedIn === true },
    { label: 'Make first deposit', done: userStats.totalSaved > 0 },
    { label: 'Claim first badge', done: userStats.milestone >= 1 },
  ]

  const openSummary = async (vault: VaultSummaryType) => {
    setSummaryOpen(true)
    setSummaryVault(vault)
    setSummaryLoading(true)
    setSummaryError(null)
    setSummaryText('')
    try {
      const recentDeposits = 'see AI panel'
      const text = await generateVaultSummary(vault, {
        totalSaved: savedAlgo,
        streak: userStats.streak,
        milestone: userStats.milestone,
        lockEnabled: false,
        goalAmount: 0,
        penaltyPct: 0,
        recentDeposits,
        globalDeposited: globalAlgo,
        globalContributors: globalStats.totalUsers,
      })
      setSummaryText(text)
    } catch (e: any) {
      setSummaryError(e?.message || 'Could not generate summary. Please try again.')
    } finally {
      setSummaryLoading(false)
    }
  }

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
      sub: `${globalStats.totalUsers} total contributors`,
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

  const VAULT_TYPES = [
    {
      title: 'Education Guardian Vault',
      desc: 'Fund a child\'s education. Multiple contributors, one beneficiary, transparent progress.',
      accent: 'from-blue-500 to-violet-600',
      border: 'border-blue-200/60 hover:border-blue-300',
      shadow: 'hover:shadow-blue-500/10',
      tag: 'Guardian',
      tagColor: 'text-blue-700 bg-blue-50 border-blue-100',
      link: '/vault/guardian',
      summaryType: 'guardian' as const,
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
      ),
    },
    {
      title: 'Community Disaster Reserve',
      desc: 'Village emergency fund. Transparent reserve health, community contributions, disaster readiness.',
      accent: 'from-emerald-500 to-teal-600',
      border: 'border-emerald-200/60 hover:border-emerald-300',
      shadow: 'hover:shadow-emerald-500/10',
      tag: 'Community',
      tagColor: 'text-emerald-700 bg-emerald-50 border-emerald-100',
      link: '/vault/community',
      summaryType: 'community' as const,
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      ),
    },
    {
      title: 'Savings Pact & Protection',
      desc: 'Lock accountability with a partner. Self-imposed penalties, temptation locks, and dream visualization.',
      accent: 'from-amber-500 to-orange-600',
      border: 'border-amber-200/60 hover:border-amber-300',
      shadow: 'hover:shadow-amber-500/10',
      tag: 'Accountability',
      tagColor: 'text-amber-700 bg-amber-50 border-amber-100',
      link: '/pact',
      summaryType: 'pact' as const,
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-[#f8f9fb] font-sans">
      {/* NAVBAR */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#7c3aed] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <span className="font-bold text-lg text-gray-900 tracking-tight">AlgoVault</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Testnet
            </div>
            <div className="text-sm font-mono text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">{truncated}</div>
            <div className="text-sm font-semibold text-gray-900 hidden sm:block">{balance} <span className="text-gray-400 font-normal">ALGO</span></div>
            <button onClick={disconnect} className="ml-1 text-gray-400 hover:text-red-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-8 pb-28 space-y-8">
        {/* OPT-IN BANNER */}
        {optedIn === false && (
          <div className="flex flex-col sm:flex-row items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl px-6 py-5 gap-4 card-shadow">
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
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all shadow-sm whitespace-nowrap"
            >
              {optingIn ? 'Opting in...' : 'Opt In Now'}
            </button>
          </div>
        )}

        {/* VAULT TYPES — Primary navigation */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-gray-900 font-bold text-lg tracking-tight">Choose Your Vault</h2>
              <p className="text-xs text-gray-500 mt-0.5">Real-world savings solutions powered by Algorand smart contracts</p>
            </div>
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live on Algorand
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {VAULT_TYPES.map((vt) => (
              <button
                key={vt.title}
                onClick={() => navigate(vt.link)}
                className={`group relative text-left rounded-2xl overflow-hidden border ${vt.border} transition-all duration-300 hover:shadow-lg ${vt.shadow} hover:-translate-y-0.5 bg-white`}
              >
                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${vt.accent} flex items-center justify-center shadow-lg`}>
                      {vt.icon}
                    </div>
                    <svg className="w-5 h-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base mb-1.5">{vt.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">{vt.desc}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${vt.tagColor}`}>
                      {vt.tag}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openSummary(vt.summaryType) }}
                      className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 hover:underline"
                    >
                      Gemini summary
                    </button>
                  </div>
                </div>
              </button>
            ))}
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

        {/* PROGRESS JOURNEY ENGINE */}
        <ProgressJourney
          savedAlgo={savedAlgo}
          currentMilestone={userStats.milestone}
          variant="personal"
        />

        {/* SAVINGS QUEST */}
        <div className="rounded-2xl border border-gray-100 p-5 bg-white card-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 text-base">Your Savings Journey</h3>
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

        {/* BEHAVIORAL TOOLS — Secondary navigation */}
        <div>
          <h2 className="text-gray-900 font-bold text-base mb-3 tracking-tight">Behavioral Tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button onClick={() => navigate('/pact')} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 hover:border-violet-200 hover:shadow-sm transition-all text-left group">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Savings Pact</p>
                <p className="text-xs text-gray-500">Partner accountability</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 ml-auto group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <button onClick={() => navigate('/temptation-lock')} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 hover:border-red-200 hover:shadow-sm transition-all text-left group">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Temptation Lock</p>
                <p className="text-xs text-gray-500">Self-imposed penalties</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 ml-auto group-hover:text-red-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <button onClick={() => navigate('/dream-board')} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 hover:border-cyan-200 hover:shadow-sm transition-all text-left group">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Dream Board</p>
                <p className="text-xs text-gray-500">Visual goal progress</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 ml-auto group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        {/* SAVINGS REPORT LINK */}
        <button
          onClick={() => navigate('/report')}
          className="w-full rounded-2xl border border-gray-100 bg-white p-5 card-shadow hover:card-shadow-hover transition-all flex items-center gap-4 text-left group"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#111827] to-[#1e3a5f] flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-gray-900">Live Savings Report</p>
            <p className="text-xs text-gray-500 mt-0.5">Charts, analytics, downloadable PDF, and WhatsApp share — all from live chain data</p>
          </div>
          <svg className="w-5 h-5 text-gray-300 group-hover:text-[#2563EB] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>

        {/* TRANSACTION HISTORY */}
        {activeAddress && <TransactionHistory address={activeAddress} />}

        <div className="text-xs text-gray-400 pb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Connected via {activeWallet?.metadata.name ?? 'wallet'} &middot; App {Number(import.meta.env.VITE_APP_ID)}
        </div>
      </div>

      {showDeposit && (
        <DepositForm
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

      <AIChatbot
        address={activeAddress}
        totalSaved={savedAlgo}
        streak={userStats.streak}
        milestone={userStats.milestone}
        onOpenDeposit={() => setShowDeposit(true)}
      />

      {summaryOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSummaryOpen(false)}>
          <div className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Gemini</p>
                <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Vault summary</h3>
              </div>
              <button onClick={() => setSummaryOpen(false)} className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-900">
                  {summaryVault === 'guardian'
                    ? 'Education Guardian Vault'
                    : summaryVault === 'community'
                      ? 'Community Disaster Reserve'
                      : summaryVault === 'pact'
                        ? 'Savings Pact & Protection'
                        : 'Personal Savings Vault'}
                </p>
                <button
                  className="text-sm font-semibold text-[#2563EB] hover:underline"
                  onClick={() => navigator.clipboard.writeText(summaryText || '')}
                  disabled={!summaryText}
                >
                  Copy
                </button>
              </div>

              {summaryLoading ? (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                  <p className="text-sm text-gray-600 font-medium">Generating summary from your live on-chain context…</p>
                  <p className="text-xs text-gray-500 mt-1">No hardcoded numbers. No guesses.</p>
                </div>
              ) : summaryError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                  <p className="text-sm text-red-700 font-semibold">Could not generate summary</p>
                  <p className="text-xs text-red-700/80 mt-1">{summaryError}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-100 bg-white p-5">
                  <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{summaryText}</div>
                  <p className="text-[11px] text-gray-400 mt-4">
                    Summary is grounded in your live stats and global on-chain totals. Verify transactions on Lora from History/Badges/Report.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
