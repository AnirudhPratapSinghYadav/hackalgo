import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { applyPactPenalty, getExplorerTransactionUrl, getPactConfig, setupSavingsPact } from '../services/algorand'

export default function SavingsPact() {
  const { activeAddress, signTransactions, wallets } = useWallet()
  const [partner, setPartner] = useState('')
  const [requiredAlgo, setRequiredAlgo] = useState('1')
  const [cadenceDays, setCadenceDays] = useState('7')
  const [penaltyAlgo, setPenaltyAlgo] = useState('0.1')
  const [status, setStatus] = useState('')
  const [txId, setTxId] = useState('')
  const [busy, setBusy] = useState(false)
  const [pact, setPact] = useState<{ enabled: number; requiredAmountMicro: number; cadenceSeconds: number; penaltyAmountMicro: number; userA: string; userB: string } | null>(null)

  useEffect(() => {
    getPactConfig().then(setPact).catch(() => undefined)
  }, [])

  if (!activeAddress) return <Navigate to="/" replace />

  const truncated = `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`

  const disconnect = () => {
    wallets?.forEach((w) => { if (w.isConnected) w.disconnect() })
  }

  const onCreatePact = async () => {
    if (!partner || partner.length !== 58) { setStatus('Invalid partner address (must be 58 chars)'); return }
    setBusy(true); setStatus('Waiting for wallet signature...')
    try {
      const id = await setupSavingsPact(signTransactions, activeAddress, partner, Number(requiredAlgo), Number(cadenceDays), Number(penaltyAlgo))
      setTxId(id); setStatus('Pact created on-chain!')
      getPactConfig().then(setPact).catch(() => undefined)
    } catch (e: any) {
      setStatus(e?.message || 'Failed to create pact')
    } finally { setBusy(false) }
  }

  const onApplyPenalty = async () => {
    if (!partner) { setStatus('Enter partner address first'); return }
    setBusy(true); setStatus('Applying penalty...')
    try {
      const id = await applyPactPenalty(signTransactions, activeAddress, partner, Number(penaltyAlgo))
      setTxId(id); setStatus('Penalty applied on-chain!')
    } catch (e: any) {
      setStatus(e?.message || 'Failed to apply penalty')
    } finally { setBusy(false) }
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
        <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-700 p-8 text-white card-shadow">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">&#9876;&#65039;</span>
            <h1 className="text-2xl font-bold">Savings Pact</h1>
          </div>
          <p className="text-violet-200 text-sm max-w-lg">Lock accountability with a partner on-chain. Both commit to saving. Miss a deposit cadence and the smart contract enforces a penalty directly into your partner's vault.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 rounded-2xl bg-white border border-gray-100 p-6 card-shadow space-y-5">
            <h2 className="font-bold text-gray-900 text-lg">Create or Update Pact</h2>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Partner's Wallet Address</label>
              <input className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all" placeholder="ALGO address (58 characters)" value={partner} onChange={(e) => setPartner(e.target.value)} />
              {partner.length > 0 && partner.length !== 58 && <p className="text-xs text-red-500 mt-1">Address must be exactly 58 characters</p>}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Required ALGO / period</label>
                <input type="number" min="1" step="0.1" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" value={requiredAlgo} onChange={(e) => setRequiredAlgo(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Cadence (days)</label>
                <input type="number" min="1" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" value={cadenceDays} onChange={(e) => setCadenceDays(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Penalty (ALGO)</label>
                <input type="number" min="0.01" step="0.01" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" value={penaltyAlgo} onChange={(e) => setPenaltyAlgo(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={onCreatePact} disabled={busy} className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold text-sm disabled:opacity-50 shadow-sm transition-all">
                {busy ? 'Signing...' : 'Create Savings Pact'}
              </button>
              <button onClick={onApplyPenalty} disabled={busy} className="px-6 py-3 rounded-xl border-2 border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 disabled:opacity-50 transition-all">
                Apply Penalty
              </button>
            </div>
            {status && <p className={`text-sm font-medium ${status.includes('fail') || status.includes('Invalid') ? 'text-red-600' : 'text-gray-700'}`}>{status}</p>}
            {txId && (
              <a className="inline-flex items-center gap-1 text-sm text-violet-600 font-semibold hover:underline" href={getExplorerTransactionUrl(txId)} target="_blank" rel="noreferrer">
                View on Lora Explorer &rarr;
              </a>
            )}
          </div>

          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-2xl bg-white border border-gray-100 p-6 card-shadow">
              <h3 className="font-bold text-gray-900 mb-3">How It Works</h3>
              <div className="space-y-3">
                {[
                  { step: '1', text: 'You and a partner both commit to saving a required amount every cadence period.' },
                  { step: '2', text: 'If either misses a deposit within the window, the penalty is enforced by the smart contract.' },
                  { step: '3', text: 'Penalty goes into the partner\'s vault. Streaks reset. Full accountability on-chain.' },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{s.step}</span>
                    <p className="text-sm text-gray-600">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-gray-100 p-6 card-shadow">
              <h3 className="font-bold text-gray-900 mb-3">Current Pact Status</h3>
              {pact?.enabled ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="text-green-600 font-semibold">Active</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Required</span><span className="font-medium">{(pact.requiredAmountMicro / 1_000_000).toFixed(2)} ALGO</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Cadence</span><span className="font-medium">{Math.round(pact.cadenceSeconds / 86400)} days</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Penalty</span><span className="font-medium text-red-600">{(pact.penaltyAmountMicro / 1_000_000).toFixed(2)} ALGO</span></div>
                  {pact.userA && <div className="pt-2 border-t border-gray-100"><p className="text-xs text-gray-400 font-mono break-all">User A: {pact.userA}</p></div>}
                  {pact.userB && <div><p className="text-xs text-gray-400 font-mono break-all">User B: {pact.userB}</p></div>}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No active pact. Create one to get started.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
