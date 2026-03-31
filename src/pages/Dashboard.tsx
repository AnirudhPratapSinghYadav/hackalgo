import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
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
  { id: 'personal', icon: '\u{1F3E6}', name: 'Personal Savings', desc: 'Build your wealth' },
  { id: 'harvest', icon: '\u{1F33E}', name: 'Harvest Vault', desc: 'For seasonal earners' },
  { id: 'emergency', icon: '\u{1F6A8}', name: 'Emergency Fund', desc: 'Disaster-ready savings' },
  { id: 'remittance', icon: '\u{1F4B8}', name: 'Remittance Vault', desc: 'Send across borders' },
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
  const { activeAddress, wallets } = useWallet()

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

  const handleOptIn = async () => {
    if (!activeWallet) return
    setOptingIn(true)
    try {
      await optInToVault(activeWallet, activeAddress)
      setOptedIn(true)
    } catch (e) {
      console.error('Opt-in failed:', e)
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

      <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
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
          <h2 className="text-gray-900 font-bold text-lg mb-3 tracking-tight">Choose Vault Type</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {VAULT_TYPES.map((v) => (
              <button
                key={v.id}
                onClick={() => setVaultType(v.id)}
                className={`text-left p-4 rounded-2xl border-2 transition-all duration-200 group ${
                  vaultType === v.id
                    ? 'border-[#2563EB] bg-blue-50/60 card-shadow glow-blue'
                    : 'border-gray-100 hover:border-gray-200 bg-white hover:card-shadow'
                }`}
              >
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform inline-block">{v.icon}</div>
                <div className="font-semibold text-sm text-gray-900">{v.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{v.desc}</div>
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

        {/* AI SAVINGS COACH */}
        <SavingsCoach
          totalSaved={savedAlgo}
          streak={userStats.streak}
          milestone={userStats.milestone}
          vaultType={vaultType}
        />

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
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#2563EB] to-[#7c3aed] rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPct}%` }}
              />
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
    </div>
  )
}
