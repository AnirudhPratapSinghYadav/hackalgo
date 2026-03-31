import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { disableTemptationLock, getExplorerTransactionUrl, getUserExtraState, setTemptationLock } from '../services/algorand'

const PENALTY_DESTINATIONS = [
  { id: 'charity', label: 'Charity Wallet', address: 'CHARITYWALLET' },
  { id: 'burn', label: 'Burn Address', address: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ' },
  { id: 'custom', label: 'Custom Address', address: '' },
] as const

export default function TemptationLock() {
  const { activeAddress, signTransactions, wallets } = useWallet()
  const [goalAlgo, setGoalAlgo] = useState('100')
  const [penaltyPct, setPenaltyPct] = useState(10)
  const [destType, setDestType] = useState<'charity' | 'burn' | 'custom'>('burn')
  const [customAddress, setCustomAddress] = useState('')
  const [status, setStatus] = useState('')
  const [txId, setTxId] = useState('')
  const [busy, setBusy] = useState(false)
  const [currentLock, setCurrentLock] = useState<{ lockEnabled: number; goalAmountMicro: number; penaltyBps: number; penaltySink: string } | null>(null)

  useEffect(() => {
    if (!activeAddress) return
    getUserExtraState(activeAddress).then((s) => {
      setCurrentLock({ lockEnabled: s.lockEnabled, goalAmountMicro: s.goalAmountMicro, penaltyBps: s.penaltyBps, penaltySink: s.penaltySink })
      if (s.penaltySink && s.penaltySink !== activeAddress) setCustomAddress(s.penaltySink)
    }).catch(() => undefined)
  }, [activeAddress])

  if (!activeAddress) return <Navigate to="/" replace />

  const truncated = `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`
  const disconnect = () => { wallets?.forEach((w) => { if (w.isConnected) w.disconnect() }) }

  const getSinkAddress = () => {
    if (destType === 'burn') return PENALTY_DESTINATIONS[1].address
    if (destType === 'custom') return customAddress
    return activeAddress
  }

  const onSaveLock = async () => {
    const sink = getSinkAddress()
    if (!sink || sink.length !== 58) { setStatus('Invalid penalty destination address'); return }
    setBusy(true); setStatus('Waiting for wallet...')
    try {
      const bps = Math.round(penaltyPct * 100)
      const id = await setTemptationLock(signTransactions, activeAddress, Number(goalAlgo), bps, sink)
      setTxId(id); setStatus('Temptation lock saved on-chain!')
      getUserExtraState(activeAddress).then((s) => setCurrentLock({ lockEnabled: s.lockEnabled, goalAmountMicro: s.goalAmountMicro, penaltyBps: s.penaltyBps, penaltySink: s.penaltySink })).catch(() => undefined)
    } catch (e: any) { setStatus(e?.message || 'Failed') } finally { setBusy(false) }
  }

  const onDisable = async () => {
    setBusy(true); setStatus('Disabling lock...')
    try {
      const id = await disableTemptationLock(signTransactions, activeAddress)
      setTxId(id); setStatus('Lock disabled')
      setCurrentLock((prev) => prev ? { ...prev, lockEnabled: 0 } : null)
    } catch (e: any) { setStatus(e?.message || 'Failed') } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] font-sans">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#7c3aed] flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <span className="font-bold text-lg text-gray-900 tracking-tight">AlgoVault</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-sm font-mono text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">{truncated}</div>
            <button onClick={disconnect} className="text-sm text-gray-400 hover:text-red-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 p-8 text-white card-shadow">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">&#128274;</span>
            <h1 className="text-2xl font-bold">Temptation Lock</h1>
          </div>
          <p className="text-red-100 text-sm max-w-lg">Design your own punishment for early withdrawal. Set a savings goal and a penalty percentage. If you withdraw before reaching your goal, the penalty is automatically deducted on-chain.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 rounded-2xl bg-white border border-gray-100 p-6 card-shadow space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Savings Goal (ALGO)</label>
              <input type="number" min="1" step="1" className="w-full rounded-xl border border-gray-200 px-4 py-4 text-2xl font-bold text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" value={goalAlgo} onChange={(e) => setGoalAlgo(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Early Withdrawal Penalty: <span className="text-orange-600">{penaltyPct}%</span></label>
              <input type="range" min="0" max="50" step="1" value={penaltyPct} onChange={(e) => setPenaltyPct(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-orange-500" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>0%</span><span>25%</span><span>50%</span></div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Penalty Destination</label>
              <div className="grid grid-cols-3 gap-2">
                {PENALTY_DESTINATIONS.map((d) => (
                  <button key={d.id} onClick={() => setDestType(d.id as any)} className={`px-3 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${destType === d.id ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}>
                    {d.label}
                  </button>
                ))}
              </div>
              {destType === 'custom' && (
                <input className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm mt-3" placeholder="Custom wallet address" value={customAddress} onChange={(e) => setCustomAddress(e.target.value)} />
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={onSaveLock} disabled={busy} className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold text-sm disabled:opacity-50 shadow-sm transition-all">
                {busy ? 'Signing...' : 'Save Lock'}
              </button>
              <button onClick={onDisable} disabled={busy} className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 disabled:opacity-50 transition-all">
                Disable Lock
              </button>
            </div>

            {status && <p className="text-sm font-medium text-gray-700">{status}</p>}
            {txId && (
              <a className="inline-flex items-center gap-1 text-sm text-orange-600 font-semibold hover:underline" href={getExplorerTransactionUrl(txId)} target="_blank" rel="noreferrer">
                View on Lora Explorer &rarr;
              </a>
            )}
          </div>

          <div className="lg:col-span-2 rounded-2xl bg-white border border-gray-100 p-6 card-shadow">
            <h3 className="font-bold text-gray-900 mb-4">Current Lock Status</h3>
            {currentLock ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${currentLock.lockEnabled ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                    {currentLock.lockEnabled ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Goal</span><span className="font-semibold">{(currentLock.goalAmountMicro / 1_000_000).toFixed(2)} ALGO</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Penalty</span><span className="font-semibold text-red-600">{(currentLock.penaltyBps / 100).toFixed(0)}%</span></div>
                  {currentLock.penaltySink && <div className="pt-2 border-t border-gray-100"><p className="text-xs text-gray-400 font-mono break-all">Sink: {currentLock.penaltySink}</p></div>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Loading status...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
