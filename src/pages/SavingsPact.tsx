import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { applyPactPenalty, getExplorerTransactionUrl, getPactConfig, getUserStats, setupSavingsPact } from '../services/algorand'
import { generatePactGuide } from '../services/aiService'

export default function SavingsPact() {
  const { activeAddress, signTransactions, wallets } = useWallet()

  const [partner, setPartner] = useState('')
  const [requiredAlgo, setRequiredAlgo] = useState('')
  const [cadenceDays, setCadenceDays] = useState('')
  const [penaltyAlgo, setPenaltyAlgo] = useState('')
  const [status, setStatus] = useState('')
  const [txId, setTxId] = useState('')
  const [busyCreate, setBusyCreate] = useState(false)
  const [busyPenalty, setBusyPenalty] = useState(false)
  const [pact, setPact] = useState<{ enabled: number; requiredAmountMicro: number; cadenceSeconds: number; penaltyAmountMicro: number; userA: string; userB: string } | null>(null)
  const [guideOpen, setGuideOpen] = useState(true)
  const [guideLoading, setGuideLoading] = useState(false)
  const [guideText, setGuideText] = useState<string>('')
  const [guideError, setGuideError] = useState<string | null>(null)

  useEffect(() => {
    getPactConfig()
      .then((p) => {
        setPact(p)
        if (p?.enabled === 1) {
          setRequiredAlgo(String((p.requiredAmountMicro / 1_000_000).toFixed(2)))
          setCadenceDays(String(Math.round(p.cadenceSeconds / 86400)))
          setPenaltyAlgo(String((p.penaltyAmountMicro / 1_000_000).toFixed(2)))
          // If I'm a participant, default partner field for clarity.
          if (activeAddress && (p.userA === activeAddress || p.userB === activeAddress)) {
            const other = p.userA === activeAddress ? p.userB : p.userA
            if (other) setPartner(other)
          }
        }
      })
      .catch(() => undefined)
  }, [activeAddress])

  if (!activeAddress) return <Navigate to="/" replace />

  const truncated = `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`
  const disconnect = () => { wallets?.forEach((w) => { if (w.isConnected) w.disconnect() }) }

  const requiredNum = Number(requiredAlgo)
  const cadenceNum = Number(cadenceDays)
  const penaltyNum = Number(penaltyAlgo)
  const canCreate =
    partner.length === 58 &&
    Number.isFinite(requiredNum) && requiredNum > 0 &&
    Number.isFinite(cadenceNum) && cadenceNum > 0 &&
    Number.isFinite(penaltyNum) && penaltyNum > 0

  const onCreatePact = async () => {
    if (!canCreate) { setStatus('Fill all fields with valid on-chain values (partner, required, cadence, penalty).'); return }
    setBusyCreate(true); setStatus('Waiting for wallet signature...')
    try {
      const id = await setupSavingsPact(signTransactions, activeAddress, partner, requiredNum, cadenceNum, penaltyNum)
      setTxId(id); setStatus('Savings pact created on-chain!')
      getPactConfig().then(setPact).catch(() => undefined)
    } catch (e: any) { setStatus(e?.message || 'Transaction failed') } finally { setBusyCreate(false) }
  }

  const onApplyPenalty = async () => {
    if (!partner || partner.length !== 58) { setStatus('Enter partner address first'); return }
    if (!Number.isFinite(penaltyNum) || penaltyNum <= 0) { setStatus('Enter a valid penalty amount'); return }
    setBusyPenalty(true); setStatus('Checking on-chain conditions…')
    try {
      // Preflight: mirror contract asserts to avoid wasting a group submission.
      const [p, stats] = await Promise.all([getPactConfig(), getUserStats(activeAddress)])
      if (p.enabled !== 1) throw new Error('No active pact found on-chain.')
      if (activeAddress !== p.userA && activeAddress !== p.userB) throw new Error('Your wallet is not a participant in the active pact.')
      const expectedPartner = activeAddress === p.userA ? p.userB : p.userA
      if (expectedPartner && partner !== expectedPartner) throw new Error('Partner address does not match the on-chain pact pair.')
      const minPenaltyAlgo = p.penaltyAmountMicro / 1_000_000
      if (penaltyNum + 1e-9 < minPenaltyAlgo) throw new Error(`Penalty must be at least ${minPenaltyAlgo.toFixed(2)} ALGO (from on-chain pact config).`)
      const nowTs = Math.floor(Date.now() / 1000)
      const dueTs = (stats.lastDeposit || 0) + (p.cadenceSeconds || 0)
      if (stats.lastDeposit > 0 && p.cadenceSeconds > 0 && nowTs <= dueTs) {
        const minsLeft = Math.max(0, Math.ceil((dueTs - nowTs) / 60))
        throw new Error(`Cadence has not been missed yet. Try again in ~${minsLeft} minutes.`)
      }
      setStatus('Applying penalty (wallet signature required)…')
      const id = await applyPactPenalty(signTransactions, activeAddress, partner, penaltyNum)
      setTxId(id); setStatus('Penalty applied on-chain!')
    } catch (e: any) { setStatus(e?.message || 'Transaction failed') } finally { setBusyPenalty(false) }
  }

  const pactActive = pact?.enabled === 1
  const busy = busyCreate || busyPenalty
  const stepStatus = useMemo(() => {
    if (pactActive) return 'Active pact detected on-chain.'
    if (partner.length === 58 && requiredAlgo && cadenceDays && penaltyAlgo) return 'Ready to create on-chain.'
    return 'Configure pact parameters.'
  }, [pactActive, partner.length, requiredAlgo, cadenceDays, penaltyAlgo])

  const pactStatus: 'active' | 'none' = pactActive ? 'active' : 'none'

  const onExplain = async () => {
    setGuideOpen(true)
    setGuideLoading(true)
    setGuideError(null)
    setGuideText('')
    try {
      if (!Number.isFinite(requiredNum) || !Number.isFinite(cadenceNum) || !Number.isFinite(penaltyNum) || requiredNum <= 0 || cadenceNum <= 0 || penaltyNum <= 0) {
        throw new Error('Enter valid pact parameters first (required, cadence, penalty).')
      }
      const text = await generatePactGuide(
        {
          requiredAlgo: requiredNum,
          cadenceDays: cadenceNum,
          penaltyAlgo: penaltyNum,
          partnerAddress: partner.length === 58 ? partner : undefined,
          pactStatus,
        },
        {
          totalSaved: 0,
          streak: 0,
          milestone: 0,
          lockEnabled: false,
          goalAmount: 0,
          penaltyPct: 0,
          recentDeposits: 'unknown',
        },
      )
      setGuideText(text)
    } catch (e: any) {
      setGuideError(e?.message ?? 'Could not generate pact guide.')
    } finally {
      setGuideLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] font-sans">
      {/* NAVBAR */}
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
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700" />
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="relative px-8 py-10 lg:px-12 lg:py-14">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div>
                <h1 className="text-white text-3xl font-bold tracking-tight">Savings Pact</h1>
                <p className="text-violet-200 text-sm mt-1">Behavioral economics meets blockchain accountability</p>
              </div>
            </div>
            <p className="text-white/70 text-sm max-w-2xl leading-relaxed">Two wallets lock into a mutual savings commitment enforced by an Algorand smart contract. Miss your deposit cadence and the contract automatically transfers a penalty into your partner's vault. No intermediary. No excuses. Pure on-chain discipline.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FORM — LEFT 2 COLS */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl bg-white border border-gray-100 card-shadow overflow-hidden">
              <div className="px-7 pt-7 pb-2">
                <h2 className="font-bold text-gray-900 text-lg">Configure Your Pact</h2>
                <p className="text-sm text-gray-500 mt-1">Both parties must be opted into the vault. The pact is stored as global state on the smart contract.</p>
              </div>
              <div className="px-7 pb-7 pt-4 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Partner Wallet Address</label>
                  <input className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm font-mono focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all bg-gray-50/50" placeholder="Enter 58-character Algorand address" value={partner} onChange={(e) => setPartner(e.target.value)} />
                  {partner.length > 0 && partner.length !== 58 && <p className="text-xs text-red-500 mt-1.5">Must be exactly 58 characters</p>}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Required (ALGO)</label>
                    <input type="number" min="1" step="0.1" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all bg-gray-50/50" value={requiredAlgo} onChange={(e) => setRequiredAlgo(e.target.value)} />
                    <p className="text-[10px] text-gray-400 mt-1">Minimum deposit per period</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Cadence (days)</label>
                    <input type="number" min="1" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all bg-gray-50/50" value={cadenceDays} onChange={(e) => setCadenceDays(e.target.value)} />
                    <p className="text-[10px] text-gray-400 mt-1">Deposit window in days</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Penalty (ALGO)</label>
                    <input type="number" min="0.01" step="0.01" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all bg-gray-50/50" value={penaltyAlgo} onChange={(e) => setPenaltyAlgo(e.target.value)} />
                    <p className="text-[10px] text-gray-400 mt-1">Auto-transferred on miss</p>
                  </div>
                </div>
                <div className="flex gap-3 pt-3">
                  <button onClick={onCreatePact} disabled={busy || !canCreate} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold text-sm disabled:opacity-50 shadow-md shadow-violet-500/20 transition-all">
                    {busyCreate ? 'Signing...' : 'Create Savings Pact'}
                  </button>
                  <button onClick={onApplyPenalty} disabled={busy || !partner || partner.length !== 58} className="px-6 py-3.5 rounded-xl border-2 border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-all">
                    {busyPenalty ? 'Applying...' : 'Enforce Penalty'}
                  </button>
                </div>
                <p className="text-xs text-gray-500">{stepStatus}</p>
                {status && <div className={`rounded-xl px-4 py-3 text-sm font-medium ${status.includes('fail') || status.includes('Enter') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-violet-50 text-violet-700 border border-violet-100'}`}>{status}</div>}
                {txId && (
                  <a className="inline-flex items-center gap-1.5 text-sm text-violet-600 font-semibold hover:underline" href={getExplorerTransactionUrl(txId)} target="_blank" rel="noreferrer">
                    View transaction on Lora Explorer
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-6">
            {/* GEMINI PACT GUIDE */}
            <div className="rounded-2xl bg-white border border-gray-100 p-6 card-shadow">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Pact Guide (Gemini)</h3>
                <button
                  onClick={() => setGuideOpen((v) => !v)}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-900 hover:underline"
                >
                  {guideOpen ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Actionable explanation using your real pact parameters.</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={onExplain}
                  disabled={guideLoading}
                  className="px-4 py-2 rounded-xl bg-violet-50 text-violet-700 border border-violet-100 text-xs font-bold hover:bg-violet-100 disabled:opacity-50"
                >
                  {guideLoading ? 'Explaining…' : 'Explain this pact'}
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
                  {!guideText && !guideError && (
                    <p className="text-xs text-gray-400">Tap “Explain this pact” to generate a guide. No numbers are invented.</p>
                  )}
                </div>
              )}
            </div>

            {/* HOW IT WORKS */}
            <div className="rounded-2xl bg-white border border-gray-100 p-6 card-shadow">
              <h3 className="font-bold text-gray-900 text-sm mb-4 uppercase tracking-wider">How It Works</h3>
              <div className="space-y-4">
                {[
                  { icon: '01', title: 'Commit Together', desc: 'Both wallets agree on deposit amount, cadence, and penalty. Stored on Algorand.' },
                  { icon: '02', title: 'Deposit on Schedule', desc: 'Each partner must deposit the required ALGO within the cadence window.' },
                  { icon: '03', title: 'Miss = Auto Penalty', desc: 'If your last deposit is older than the cadence, the smart contract penalizes you into the partner\'s vault.' },
                ].map((s) => (
                  <div key={s.icon} className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{s.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PACT STATUS */}
            <div className="rounded-2xl bg-white border border-gray-100 p-6 card-shadow">
              <h3 className="font-bold text-gray-900 text-sm mb-4 uppercase tracking-wider">Current Pact Status</h3>
              {pactActive ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-bold text-green-700">Active Pact</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1.5 border-b border-gray-50"><span className="text-gray-500">Required</span><span className="font-semibold">{(pact.requiredAmountMicro / 1_000_000).toFixed(2)} ALGO</span></div>
                    <div className="flex justify-between py-1.5 border-b border-gray-50"><span className="text-gray-500">Cadence</span><span className="font-semibold">{Math.round(pact.cadenceSeconds / 86400)} days</span></div>
                    <div className="flex justify-between py-1.5 border-b border-gray-50"><span className="text-gray-500">Penalty</span><span className="font-semibold text-red-600">{(pact.penaltyAmountMicro / 1_000_000).toFixed(2)} ALGO</span></div>
                  </div>
                  {pact.userA && <div className="pt-3 space-y-1"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Participants</p><p className="text-xs text-gray-600 font-mono break-all">{pact.userA}</p>{pact.userB && <p className="text-xs text-gray-600 font-mono break-all">{pact.userB}</p>}</div>}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  </div>
                  <p className="text-sm text-gray-500">No active pact</p>
                  <p className="text-xs text-gray-400 mt-1">Create one to start</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
