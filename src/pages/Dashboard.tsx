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

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* NAVBAR */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-7 h-7 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            <span className="font-bold text-lg text-gray-900">AlgoVault</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Testnet
            </div>
            <div className="text-sm font-mono text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">{truncated}</div>
            <div className="text-sm text-gray-900 font-medium">{balance} <span className="text-gray-500 font-normal">ALGO</span></div>
            <button onClick={disconnect} className="text-sm text-red-500 hover:text-red-600 font-medium">Disconnect</button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* OPT-IN BANNER */}
        {optedIn === false && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-sm text-amber-800 font-medium">You need to opt into the vault before you can deposit or earn badges.</span>
            </div>
            <button
              onClick={handleOptIn}
              disabled={optingIn}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {optingIn ? 'Opting in...' : 'Opt In'}
            </button>
          </div>
        )}

        {/* VAULT TYPE SELECTOR */}
        <div>
          <h2 className="text-gray-900 font-bold text-lg mb-3">Choose Vault Type</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {VAULT_TYPES.map((v) => (
              <button
                key={v.id}
                onClick={() => setVaultType(v.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  vaultType === v.id
                    ? 'border-[#2563EB] bg-blue-50/50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="text-2xl mb-2">{v.icon}</div>
                <div className="font-semibold text-sm text-gray-900">{v.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{v.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Your Savings */}
          <div className="rounded-xl border border-gray-200 p-5 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              </div>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Your Savings</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{savedAlgo.toFixed(2)} <span className="text-sm font-normal text-gray-500">ALGO</span></div>
            <div className="text-xs text-gray-500 mt-1">Personal vault balance</div>
          </div>

          {/* Global Vault */}
          <div className="rounded-xl border border-gray-200 p-5 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Global Vault</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{globalAlgo.toFixed(2)} <span className="text-sm font-normal text-gray-500">ALGO</span></div>
            <div className="text-xs text-gray-500 mt-1">Total locked by all users</div>
          </div>

          {/* Your Streak */}
          <div className="rounded-xl border border-gray-200 p-5 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${userStats.streak > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                <svg className={`w-5 h-5 ${userStats.streak > 0 ? 'text-orange-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>
              </div>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Your Streak</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{userStats.streak} <span className="text-sm font-normal text-gray-500">days</span></div>
            <div className="text-xs text-gray-500 mt-1">Consecutive deposits</div>
          </div>

          {/* Milestone Level */}
          <div className="rounded-xl border border-gray-200 p-5 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
              </div>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Milestone</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{userStats.milestone} <span className="text-sm font-normal text-gray-500">/ 3</span></div>
            <div className="text-xs text-gray-500 mt-1">{badgeName(userStats.milestone)}</div>
          </div>
        </div>

        {/* PROGRESS SECTION */}
        <div className="rounded-xl border border-gray-200 p-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Progress to Next Milestone</h3>
            {next && (
              <span className="text-sm text-gray-500">
                Next: <span className="font-medium text-gray-700">{next.name}</span> at {next.threshold} ALGO
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mb-2">
            <div className="text-sm font-medium text-gray-700">{savedAlgo.toFixed(2)} ALGO</div>
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2563EB] rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="text-sm font-medium text-gray-700">{next?.threshold ?? 100} ALGO</div>
          </div>
          <div className="text-xs text-gray-500">{progressPct.toFixed(0)}% complete</div>

          <div className="flex items-center gap-6 mt-5">
            {MILESTONES.map((m) => (
              <div key={m.level} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${userStats.milestone >= m.level ? 'bg-[#2563EB]' : 'bg-gray-300'}`} />
                <span className={`text-xs font-medium ${userStats.milestone >= m.level ? 'text-[#2563EB]' : 'text-gray-500'}`}>
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

        {/* DEPOSIT + WITHDRAW */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowDeposit(true)}
            disabled={optedIn === false}
            className="px-8 py-3 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Deposit ALGO
          </button>
          <button
            onClick={() => setShowWithdraw(true)}
            disabled={optedIn === false || userStats.totalSaved === 0}
            className="text-sm text-gray-500 hover:text-gray-700 underline disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Withdraw
          </button>
        </div>

        {/* TRANSACTION HISTORY */}
        {activeAddress && <TransactionHistory address={activeAddress} />}

        <div className="text-xs text-gray-400 pb-4">
          Connected via {activeWallet?.metadata.name ?? 'wallet'} &middot; App {Number(import.meta.env.VITE_APP_ID)}
        </div>
      </div>

      {/* DEPOSIT MODAL */}
      {showDeposit && (
        <DepositForm
          vaultType={vaultType}
          onClose={() => setShowDeposit(false)}
          onSuccess={() => { setShowDeposit(false); refreshData() }}
        />
      )}

      {/* WITHDRAW MODAL */}
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
