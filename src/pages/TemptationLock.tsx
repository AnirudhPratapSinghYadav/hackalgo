import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { disableTemptationLock, getExplorerTransactionUrl, getUserExtraState, getUserStats, setTemptationLock } from '../services/algorand'
import { generateTemptationLockGuide } from '../services/aiService'

const DESTINATIONS = [
  { id: 'burn', label: 'Burn Forever', desc: 'Tokens destroyed permanently', icon: '🔥', address: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ' },
  { id: 'charity', label: 'Charity Wallet', desc: 'Donated to a cause', icon: '💚', address: '' },
  { id: 'custom', label: 'Custom Address', desc: 'Send to a friend or wallet', icon: '🎯', address: '' },
] as const

export default function TemptationLock() {
  const { activeAddress, signTransactions, wallets } = useWallet()

  const [goalAlgo, setGoalAlgo] = useState('')
  const [penaltyPct, setPenaltyPct] = useState<number | null>(null)
  const [destType, setDestType] = useState<string>('burn')
  const [customAddress, setCustomAddress] = useState('')
  const [status, setStatus] = useState('')
  const [txId, setTxId] = useState('')
  const [busy, setBusy] = useState(false)
  const [currentLock, setCurrentLock] = useState<{ lockEnabled: number; goalAmountMicro: number; penaltyBps: number; penaltySink: string } | null>(null)
  const [loadingLock, setLoadingLock] = useState(false)
  const [guideOpen, setGuideOpen] = useState(true)
  const [guideLoading, setGuideLoading] = useState(false)
  const [guideText, setGuideText] = useState<string>('')
  const [guideError, setGuideError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeAddress) return
    setLoadingLock(true)
    getUserExtraState(activeAddress)
      .then((s) => {
        setCurrentLock({ lockEnabled: s.lockEnabled, goalAmountMicro: s.goalAmountMicro, penaltyBps: s.penaltyBps, penaltySink: s.penaltySink })
        if (s.penaltyBps > 0) setPenaltyPct(s.penaltyBps / 100)
        if (s.goalAmountMicro > 0) setGoalAlgo(String(s.goalAmountMicro / 1_000_000))
        if (s.penaltySink && s.penaltySink !== activeAddress) setCustomAddress(s.penaltySink)
        if (s.penaltyBps === 0 && s.goalAmountMicro === 0) {
          setPenaltyPct(null)
          setGoalAlgo('')
        }
      })
      .catch(() => undefined)
      .finally(() => setLoadingLock(false))
  }, [activeAddress])

  if (!activeAddress) return <Navigate to="/" replace />

  const truncated = `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`
  const disconnect = () => { wallets?.forEach((w) => { if (w.isConnected) w.disconnect() }) }

  const getSinkAddress = () => {
    if (destType === 'burn') return DESTINATIONS[0].address
    if (destType === 'custom') return customAddress
    return activeAddress
  }

  const onSaveLock = async () => {
    const sink = getSinkAddress()
    if (!sink || sink.length !== 58) { setStatus('Enter a valid penalty destination address'); return }
    if (!goalAlgo || !Number.isFinite(Number(goalAlgo)) || Number(goalAlgo) <= 0) { setStatus('Enter a valid savings goal'); return }
    if (penaltyPct === null || !Number.isFinite(Number(penaltyPct)) || Number(penaltyPct) <= 0) { setStatus('Select a penalty percentage'); return }
    setBusy(true); setStatus('Waiting for wallet...')
    try {
      const bps = Math.round(penaltyPct * 100)
      const id = await setTemptationLock(signTransactions, activeAddress, Number(goalAlgo), bps, sink)
      setTxId(id); setStatus('Temptation lock activated on-chain!')
      getUserExtraState(activeAddress).then((s) => setCurrentLock({ lockEnabled: s.lockEnabled, goalAmountMicro: s.goalAmountMicro, penaltyBps: s.penaltyBps, penaltySink: s.penaltySink })).catch(() => undefined)
    } catch (e: any) { setStatus(e?.message || 'Failed') } finally { setBusy(false) }
  }

  const onDisable = async () => {
    setBusy(true); setStatus('Disabling...')
    try {
      const id = await disableTemptationLock(signTransactions, activeAddress)
      setTxId(id); setStatus('Lock disabled')
      setCurrentLock((prev) => prev ? { ...prev, lockEnabled: 0 } : null)
    } catch (e: any) { setStatus(e?.message || 'Failed') } finally { setBusy(false) }
  }

  const lockActive = currentLock?.lockEnabled === 1
  const pct = penaltyPct ?? 0

  const onExplain = async () => {
    if (!activeAddress) return
    setGuideOpen(true)
    setGuideLoading(true)
    setGuideError(null)
    setGuideText('')
    try {
      const goalNum = Number(goalAlgo)
      const pctNum = Number(penaltyPct ?? 0)
      if (!Number.isFinite(goalNum) || goalNum <= 0) throw new Error('Enter a valid savings goal first.')
      if (!Number.isFinite(pctNum) || pctNum <= 0) throw new Error('Select a penalty percentage first.')
      const sink = getSinkAddress()
      const stats = await getUserStats(activeAddress)
      const text = await generateTemptationLockGuide(
        {
          goalAlgo: goalNum,
          penaltyPct: pctNum,
          penaltySink: sink,
          lockEnabled: lockActive,
        },
        {
          totalSaved: stats.totalSaved / 1_000_000,
          streak: stats.streak,
          milestone: stats.milestone,
          lockEnabled: lockActive,
          goalAmount: goalNum,
          penaltyPct: pctNum,
          recentDeposits: 'unknown',
        },
      )
      setGuideText(text)
    } catch (e: any) {
      setGuideError(e?.message ?? 'Could not generate explanation.')
    } finally {
      setGuideLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] font-sans">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#7c3aed] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <span className="font-bold text-lg text-gray-900">AlgoVault</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-sm text-gray-500 hover:text-[#2563EB] font-medium">&larr; Dashboard</Link>
            <div className="text-sm font-mono text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">{truncated}</div>
            <button onClick={disconnect} className="text-gray-400 hover:text-red-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* HERO */}
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-orange-500 to-amber-500" />
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative px-8 py-10 lg:px-12 lg:py-14">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <div>
                <h1 className="text-white text-3xl font-bold tracking-tight">Temptation Lock</h1>
                <p className="text-orange-100 text-sm mt-1">Nobel Prize behavioral economics on Algorand</p>
              </div>
            </div>
            <p className="text-white/70 text-sm max-w-2xl leading-relaxed">Design your own consequences for breaking discipline. Set a savings goal and a penalty rate. If you withdraw before reaching it, the smart contract automatically enforces your self-imposed penalty — to charity, a burn address, or a friend. Loss aversion makes you save more.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FORM */}
          <div className="lg:col-span-2 rounded-2xl bg-white border border-gray-100 card-shadow overflow-hidden">
            <div className="px-7 pt-7 pb-2">
              <h2 className="font-bold text-gray-900 text-lg">Configure Your Lock</h2>
              <p className="text-sm text-gray-500 mt-1">Changes are persisted in your local state on the Algorand smart contract.</p>
            </div>
            <div className="px-7 pb-7 pt-4 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Savings Goal</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="w-full rounded-xl border border-gray-200 px-5 py-4 text-3xl font-bold text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-gray-50/50 pr-20"
                    value={goalAlgo}
                    onChange={(e) => setGoalAlgo(e.target.value)}
                    placeholder={loadingLock ? 'Loading on-chain lock…' : 'Enter goal amount'}
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-lg font-semibold text-gray-400">ALGO</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Early Withdrawal Penalty</label>
                <div className="bg-gradient-to-r from-green-50 via-yellow-50 to-red-50 rounded-xl p-5 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-4xl font-bold text-gray-900">{penaltyPct === null ? '—' : `${penaltyPct}%`}</span>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${pct <= 5 ? 'bg-green-100 text-green-700' : pct <= 20 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {penaltyPct === null ? 'Not set' : pct <= 5 ? 'Gentle' : pct <= 20 ? 'Moderate' : 'Aggressive'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={pct}
                    onChange={(e) => setPenaltyPct(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-orange-500"
                    style={{ background: `linear-gradient(to right, #22c55e ${(pct / 50) * 30}%, #eab308 ${(pct / 50) * 60}%, #ef4444 ${(pct / 50) * 100}%)` }}
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-2 font-semibold"><span>1%</span><span>25%</span><span>50%</span></div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Where does the penalty go?</label>
                <div className="grid grid-cols-3 gap-3">
                  {DESTINATIONS.map((d) => (
                    <button key={d.id} onClick={() => setDestType(d.id)} className={`p-4 rounded-xl border-2 text-left transition-all ${destType === d.id ? 'border-orange-400 bg-orange-50/60 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                      <span className="text-xl mb-2 block">{d.icon}</span>
                      <p className="text-sm font-bold text-gray-900">{d.label}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{d.desc}</p>
                    </button>
                  ))}
                </div>
                {destType === 'custom' && <input className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-mono mt-3 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-gray-50/50" placeholder="Enter Algorand wallet address" value={customAddress} onChange={(e) => setCustomAddress(e.target.value)} />}
                {destType === 'charity' && <p className="text-xs text-gray-400 mt-2">Enter a charity wallet address or use the same address as custom.</p>}
                {(destType === 'charity') && <input className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-mono mt-2 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-gray-50/50" placeholder="Charity wallet address" value={customAddress} onChange={(e) => setCustomAddress(e.target.value)} />}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={onSaveLock} disabled={busy} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold text-sm disabled:opacity-50 shadow-md shadow-red-500/20 transition-all">
                  {busy ? 'Signing...' : 'Activate Temptation Lock'}
                </button>
                <button onClick={onDisable} disabled={busy} className="px-6 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 disabled:opacity-50 transition-all">
                  Disable
                </button>
              </div>
              {status && <div className={`rounded-xl px-4 py-3 text-sm font-medium ${status.includes('fail') || status.includes('Enter') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-orange-50 text-orange-700 border border-orange-100'}`}>{status}</div>}
              {txId && <a className="inline-flex items-center gap-1.5 text-sm text-orange-600 font-semibold hover:underline" href={getExplorerTransactionUrl(txId)} target="_blank" rel="noreferrer">View on Lora Explorer <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a>}
            </div>
          </div>

          {/* STATUS + GUIDE SIDEBAR */}
          <div className="space-y-6">
            <div className="rounded-2xl bg-white border border-gray-100 p-6 card-shadow h-fit">
              <h3 className="font-bold text-gray-900 text-sm mb-5 uppercase tracking-wider">Lock Status</h3>
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-4 h-4 rounded-full ${lockActive ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`} />
                <span className={`text-lg font-bold ${lockActive ? 'text-red-600' : 'text-gray-400'}`}>{lockActive ? 'LOCKED' : 'UNLOCKED'}</span>
              </div>
              {currentLock && currentLock.goalAmountMicro > 0 ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-500">Goal</span><span className="font-bold text-gray-900">{(currentLock.goalAmountMicro / 1_000_000).toFixed(0)} ALGO</span></div>
                  <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-500">Penalty Rate</span><span className="font-bold text-red-600">{(currentLock.penaltyBps / 100).toFixed(0)}%</span></div>
                  {currentLock.penaltySink && <div className="pt-2"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Penalty Destination</p><p className="text-xs text-gray-600 font-mono break-all bg-gray-50 rounded-lg px-3 py-2">{currentLock.penaltySink}</p></div>}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No lock configured yet. Set one above.</p>
              )}
            </div>

            <div className="rounded-2xl bg-white border border-gray-100 p-6 card-shadow">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Lock Summary (Gemini)</h3>
                <button onClick={() => setGuideOpen((v) => !v)} className="text-xs font-semibold text-gray-500 hover:text-gray-900 hover:underline">
                  {guideOpen ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Explanation is generated from your on-chain lock + current inputs. No made-up data.</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={onExplain}
                  disabled={guideLoading}
                  className="px-4 py-2 rounded-xl bg-orange-50 text-orange-700 border border-orange-100 text-xs font-bold hover:bg-orange-100 disabled:opacity-50"
                >
                  {guideLoading ? 'Explaining…' : 'Explain this lock'}
                </button>
              </div>
              {guideOpen && (
                <div className="mt-3">
                  {guideError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{guideError}</p>}
                  {guideText && (
                    <div className="text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 whitespace-pre-wrap leading-relaxed">
                      {guideText}
                    </div>
                  )}
                  {!guideText && !guideError && <p className="text-xs text-gray-500">Tap “Explain this lock” to generate a concise, verifiable summary.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
