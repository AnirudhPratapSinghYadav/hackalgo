import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import {
  getBalance,
  getUserStats,
  getGlobalStats,
  isOptedIn,
  optInToVault,
  depositToVault,
  setDreamBoard,
  setTemptationLock,
  getExplorerTransactionUrl,
  getUserExtraState,
} from '../services/algorand'
import ProgressJourney from '../components/ProgressJourney'
import QRClaimCard from '../components/QRClaimCard'
import TransactionHistory from '../components/TransactionHistory'
import AIChatbot from '../components/AIChatbot'
import confetti from 'canvas-confetti'

export default function GuardianVault() {
  const { activeAddress, wallets, signTransactions } = useWallet()
  const navigate = useNavigate()

  const [balance, setBalance] = useState('...')
  const [userStats, setUserStats] = useState({ totalSaved: 0, milestone: 0, streak: 0, lastDeposit: 0 })
  const [globalStats, setGlobalStats] = useState({ totalDeposited: 0, totalUsers: 0 })
  const [milestones, setMilestones] = useState<{ m1: number; m2: number; m3: number } | null>(null)
  const [milestoneError, setMilestoneError] = useState<string | null>(null)
  const [extraState, setExtraState] = useState({ lockEnabled: 0, goalAmountMicro: 0, penaltyBps: 0, penaltySink: '', dreamUri: '', dreamTitle: '' })
  const [optedIn, setOptedIn] = useState<boolean | null>(null)
  const [optingIn, setOptingIn] = useState(false)
  const [optInError, setOptInError] = useState<string | null>(null)

  // Contribution form
  const [depositAmount, setDepositAmount] = useState('')
  const [depositing, setDepositing] = useState(false)
  const [depositTxId, setDepositTxId] = useState<string | null>(null)
  const [depositError, setDepositError] = useState<string | null>(null)

  // Vault setup form
  const [beneficiaryName, setBeneficiaryName] = useState('')
  const [beneficiaryPurpose, setBeneficiaryPurpose] = useState('')
  const [goalAmount, setGoalAmount] = useState('')
  const [savingSetup, setSavingSetup] = useState(false)
  const [setupTxId, setSetupTxId] = useState<string | null>(null)
  const [setupError, setSetupError] = useState<string | null>(null)

  // QR card
  const [showQR, setShowQR] = useState(false)

  const refreshData = useCallback(async () => {
    if (!activeAddress) return
    const [bal, stats, opted] = await Promise.all([
      getBalance(activeAddress),
      getUserStats(activeAddress).catch(() => ({ totalSaved: 0, milestone: 0, streak: 0, lastDeposit: 0 })),
      isOptedIn(activeAddress).catch(() => false),
    ])
    setBalance(bal)
    setUserStats(stats)
    setOptedIn(opted)

    getUserExtraState(activeAddress).then(setExtraState).catch(() => {})

    try {
      const global = await getGlobalStats()
      setGlobalStats({ totalDeposited: global.totalDeposited, totalUsers: global.totalUsers })
      setMilestones(global.milestones)
      setMilestoneError(null)
    } catch (e: any) {
      setMilestoneError(e?.message ?? 'Failed to load milestone thresholds from on-chain global state.')
      setMilestones(null)
      setGlobalStats({ totalDeposited: 0, totalUsers: 0 })
    }
  }, [activeAddress])

  useEffect(() => { refreshData() }, [refreshData])

  if (!activeAddress) { navigate('/'); return null }

  const disconnect = () => { wallets?.forEach((w) => { if (w.isConnected) w.disconnect() }) }
  const truncated = `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`
  const savedAlgo = userStats.totalSaved / 1_000_000
  const globalAlgo = globalStats.totalDeposited / 1_000_000
  const milestonesAlgo = milestones ? [milestones.m1, milestones.m2, milestones.m3].map((m) => m / 1_000_000) : null
  const journeyMilestones = useMemo(() => {
    if (!milestonesAlgo) return null
    return [
      { label: 'Vault Starter', threshold: milestonesAlgo[0], icon: '🥉' },
      { label: 'Vault Builder', threshold: milestonesAlgo[1], icon: '🥈' },
      { label: 'Vault Master', threshold: milestonesAlgo[2], icon: '🥇' },
    ]
  }, [milestonesAlgo?.[0], milestonesAlgo?.[1], milestonesAlgo?.[2]])
  const goalAlgo = extraState.goalAmountMicro / 1_000_000
  const goalProgressPct = goalAlgo > 0 ? Math.min(100, (savedAlgo / goalAlgo) * 100) : 0

  const handleOptIn = async () => {
    setOptingIn(true)
    setOptInError(null)
    try {
      await optInToVault(signTransactions, activeAddress)
      setOptedIn(true)
      refreshData()
    } catch (e: any) {
      setOptInError(e?.message || 'Opt-in failed')
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
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } })
      refreshData()
    } catch (e: any) {
      setDepositError(e?.message || 'Deposit failed')
    } finally {
      setDepositing(false)
    }
  }

  const handleSetupVault = async () => {
    if (!beneficiaryName.trim()) { setSetupError('Beneficiary name required'); return }
    setSavingSetup(true)
    setSetupError(null)
    setSetupTxId(null)
    try {
      const txId1 = await setDreamBoard(signTransactions, activeAddress, beneficiaryPurpose || 'Education Fund', beneficiaryName.trim())
      const goal = parseFloat(goalAmount)
      if (goal > 0) {
        await setTemptationLock(signTransactions, activeAddress, goal, 1000, activeAddress)
      }
      setSetupTxId(txId1)
      refreshData()
    } catch (e: any) {
      setSetupError(e?.message || 'Setup failed')
    } finally {
      setSavingSetup(false)
    }
  }

  const hasVaultSetup = extraState.dreamTitle.length > 0

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
            <span className="text-sm font-semibold text-blue-600 hidden sm:inline">Guardian Vault</span>
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
      <div className="bg-gradient-to-r from-[#2563EB] to-[#7c3aed] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="mx-auto max-w-6xl px-5 sm:px-6 py-8 sm:py-12 relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Guardian Vault</span>
          </div>
          <h1 className="text-white font-extrabold text-2xl sm:text-3xl tracking-tight mb-2">
            Fund a future. Keep a promise.
          </h1>
          <p className="text-white/60 text-sm sm:text-base max-w-2xl leading-relaxed">
            Multiple contributors save together for one beneficiary — a child's education, elder care, or any promise worth keeping.
            Every rupee is on-chain, transparent, and unstoppable.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-8 space-y-6 pb-28">
        {/* OPT-IN BANNER */}
        {optedIn === false && (
          <div className="flex flex-col bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl px-6 py-5 gap-3">
            {optInError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-semibold text-red-700">Opt-in failed</p>
                <p className="text-xs text-red-600 mt-1 break-words">{optInError}</p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">Opt into the vault first</p>
                <p className="text-xs text-amber-700/70 mt-0.5">One-time transaction to enable contributions and tracking.</p>
              </div>
            </div>
            <button onClick={handleOptIn} disabled={optingIn} className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all shadow-sm whitespace-nowrap">
              {optingIn ? 'Opting in...' : 'Opt In Now'}
            </button>
            </div>
          </div>
        )}

        {/* PROGRESS JOURNEY */}
        {milestoneError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-semibold text-red-700">Milestone thresholds unavailable</p>
            <p className="text-xs text-red-600 mt-1">{milestoneError}</p>
          </div>
        ) : !milestonesAlgo ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-sm font-semibold text-gray-700">Loading milestone thresholds from on-chain global state…</p>
            <p className="text-xs text-gray-500 mt-1">This app does not use hardcoded milestone values.</p>
          </div>
        ) : (
          <ProgressJourney
            savedAlgo={savedAlgo}
            currentMilestone={userStats.milestone}
            variant="guardian"
            milestones={journeyMilestones!}
          />
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* VAULT SETUP */}
            {!hasVaultSetup ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 card-shadow">
                <h2 className="font-bold text-gray-900 text-lg mb-1">Set Up Guardian Vault</h2>
                <p className="text-xs text-gray-500 mb-5">Name the beneficiary and purpose. Stored permanently on Algorand.</p>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Beneficiary Name</label>
                    <input type="text" value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} placeholder="e.g. Priya's Education Fund" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Purpose</label>
                    <input type="text" value={beneficiaryPurpose} onChange={(e) => setBeneficiaryPurpose(e.target.value)} placeholder="e.g. College tuition by 2030" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Savings Goal (ALGO)</label>
                    <input type="number" value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} placeholder="e.g. 100" min="1" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                  </div>
                  {setupError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{setupError}</p>}
                  {setupTxId && (
                    <a href={getExplorerTransactionUrl(setupTxId)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                      Vault created! View on Lora
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  )}
                  <button onClick={handleSetupVault} disabled={savingSetup || optedIn === false} className="w-full py-3 bg-gradient-to-r from-[#2563EB] to-[#7c3aed] text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all shadow-sm">
                    {savingSetup ? 'Saving on-chain...' : 'Create Guardian Vault'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50 to-violet-50 p-6 card-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900 text-lg">Vault Active</h2>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-wider">Live</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Beneficiary</span>
                    <span className="font-semibold text-gray-900">{extraState.dreamTitle}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Purpose</span>
                    <span className="font-semibold text-gray-900">{extraState.dreamUri || 'Education Fund'}</span>
                  </div>
                  {goalAlgo > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Goal</span>
                        <span className="font-semibold text-gray-900">{goalAlgo.toFixed(2)} ALGO</span>
                      </div>
                      <div>
                        <div className="h-2.5 bg-white rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-700" style={{ width: `${goalProgressPct}%` }} />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{goalProgressPct.toFixed(0)}% of goal reached</p>
                      </div>
                    </>
                  )}
                  <button onClick={() => setShowQR(true)} className="w-full py-2.5 border border-blue-200 text-blue-600 text-sm font-semibold rounded-xl hover:bg-blue-50 transition-all">
                    Generate Beneficiary QR Card
                  </button>
                </div>
              </div>
            )}

            {/* CONTRIBUTE */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 card-shadow">
              <h2 className="font-bold text-gray-900 text-lg mb-1">Contribute ALGO</h2>
              <p className="text-xs text-gray-500 mb-4">Atomic grouped transaction — payment + state update together.</p>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Amount in ALGO (min 1)"
                  min="1"
                  step="0.1"
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
                <button onClick={handleDeposit} disabled={depositing || optedIn === false} className="px-6 py-3 bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all shadow-sm whitespace-nowrap">
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
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {/* LIVE STATS */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-100 bg-white p-4 card-shadow">
                <p className="text-xs text-gray-500 font-semibold mb-1">Your Contribution</p>
                <p className="text-2xl font-bold text-gray-900">{savedAlgo.toFixed(2)} <span className="text-sm text-gray-400 font-normal">ALGO</span></p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-4 card-shadow">
                <p className="text-xs text-gray-500 font-semibold mb-1">Total Vault</p>
                <p className="text-2xl font-bold text-gray-900">{globalAlgo.toFixed(2)} <span className="text-sm text-gray-400 font-normal">ALGO</span></p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-4 card-shadow">
                <p className="text-xs text-gray-500 font-semibold mb-1">Contributors</p>
                <p className="text-2xl font-bold text-gray-900">{globalStats.totalUsers}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-4 card-shadow">
                <p className="text-xs text-gray-500 font-semibold mb-1">Deposit Streak</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.streak} <span className="text-sm text-gray-400 font-normal">days</span></p>
              </div>
            </div>

            {/* HOW IT WORKS */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 card-shadow">
              <h3 className="font-bold text-gray-900 text-base mb-4">How Guardian Vault Works</h3>
              <div className="space-y-3">
                {[
                  { step: '1', text: 'Name the beneficiary and set a savings goal on-chain' },
                  { step: '2', text: 'Multiple people contribute ALGO to the same vault' },
                  { step: '3', text: 'Progress is tracked live — milestone badges are earned' },
                  { step: '4', text: 'When the goal is reached, beneficiary receives the funds' },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-xs font-bold text-blue-600">{s.step}</div>
                    <p className="text-sm text-gray-600 pt-0.5">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* TRUST INDICATORS */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 card-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">On-Chain Transparency</p>
                  <p className="text-xs text-gray-500">Every contribution is an Algorand transaction — verifiable by anyone on Lora Explorer.</p>
                </div>
              </div>
              <div className="text-xs text-gray-400 font-mono pt-2 border-t border-gray-50">
                App ID: {import.meta.env.VITE_APP_ID} &middot; Algorand Testnet
              </div>
            </div>
          </div>
        </div>

        {/* TRANSACTION HISTORY */}
        <TransactionHistory address={activeAddress} />
      </div>

      {/* QR CLAIM CARD MODAL */}
      {showQR && (
        <QRClaimCard
          vaultName={extraState.dreamTitle || beneficiaryName || 'Guardian Vault'}
          purpose={extraState.dreamUri || beneficiaryPurpose || 'Education Fund'}
          goalAlgo={goalAlgo}
          savedAlgo={savedAlgo}
          appId={Number(import.meta.env.VITE_APP_ID)}
          onClose={() => setShowQR(false)}
        />
      )}

      <AIChatbot
        address={activeAddress}
        totalSaved={savedAlgo}
        streak={userStats.streak}
        milestone={userStats.milestone}
        milestonesAlgo={milestonesAlgo ? { m1: milestonesAlgo[0], m2: milestonesAlgo[1], m3: milestonesAlgo[2] } : null}
        onOpenDeposit={() => {}}
        onOpenPact={() => navigate('/pact')}
        onOpenLock={() => navigate('/temptation-lock')}
      />
    </div>
  )
}
