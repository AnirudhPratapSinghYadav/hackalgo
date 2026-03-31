import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { getExplorerTransactionUrl, getUserExtraState, getUserStats, setDreamBoard } from '../services/algorand'

export default function DreamBoard() {
  const { activeAddress, signTransactions, wallets } = useWallet()

  const [dreamTitle, setDreamTitle] = useState('')
  const [dreamUri, setDreamUri] = useState('')
  const [status, setStatus] = useState('')
  const [txId, setTxId] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<{ title: string; uri: string } | null>(null)
  const [savedAlgo, setSavedAlgo] = useState(0)
  const [goalAlgo, setGoalAlgo] = useState(100)

  useEffect(() => {
    if (!activeAddress) return
    getUserExtraState(activeAddress).then((state) => {
      if (state.dreamTitle || state.dreamUri) {
        setSaved({ title: state.dreamTitle, uri: state.dreamUri })
        setDreamTitle(state.dreamTitle)
        setDreamUri(state.dreamUri)
      }
      if (state.goalAmountMicro > 0) setGoalAlgo(state.goalAmountMicro / 1_000_000)
    }).catch(() => undefined)
    getUserStats(activeAddress).then((s) => setSavedAlgo(s.totalSaved / 1_000_000)).catch(() => undefined)
  }, [activeAddress])

  if (!activeAddress) return <Navigate to="/" replace />

  const truncated = `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`
  const disconnect = () => { wallets?.forEach((w) => { if (w.isConnected) w.disconnect() }) }

  const progress = Math.min(100, (savedAlgo / Math.max(goalAlgo, 1)) * 100)
  const blurPx = Math.max(0, 24 - (progress / 100) * 24)
  const previewUri = dreamUri || saved?.uri

  const onSaveDream = async () => {
    if (!dreamUri || !dreamTitle) { setStatus('Please fill in both title and image URL'); return }
    setBusy(true); setStatus('Storing dream on Algorand...')
    try {
      const id = await setDreamBoard(signTransactions, activeAddress, dreamUri, dreamTitle)
      setTxId(id)
      setSaved({ title: dreamTitle, uri: dreamUri })
      setStatus('Dream board saved immutably on-chain!')
    } catch (e: any) { setStatus(e?.message || 'Failed to save') } finally { setBusy(false) }
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
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700" />
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 60% 40%, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div className="relative px-8 py-10 lg:px-12 lg:py-14">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <h1 className="text-white text-3xl font-bold tracking-tight">Dream Board</h1>
                <p className="text-cyan-100 text-sm mt-1">Goal visualization powered by blockchain persistence</p>
              </div>
            </div>
            <p className="text-white/70 text-sm max-w-2xl leading-relaxed">Upload the image of what you're saving for. It starts completely blurred and becomes crystal clear as your vault balance grows toward your goal. Your dream title and image URI are stored immutably on Algorand — a permanent record of your ambition.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT — FORM */}
          <div className="rounded-2xl bg-white border border-gray-100 card-shadow overflow-hidden">
            <div className="px-7 pt-7 pb-2">
              <h2 className="font-bold text-gray-900 text-lg">Set Your Dream</h2>
              <p className="text-sm text-gray-500 mt-1">This is stored in your local state on the Algorand smart contract.</p>
            </div>
            <div className="px-7 pb-7 pt-4 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">What are you saving for?</label>
                <input className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all bg-gray-50/50" placeholder="e.g. MacBook Pro, Goa Trip 2026, First Car" value={dreamTitle} onChange={(e) => setDreamTitle(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Dream Image URL</label>
                <input className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm font-mono focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all bg-gray-50/50" placeholder="https://images.unsplash.com/..." value={dreamUri} onChange={(e) => setDreamUri(e.target.value)} />
                <p className="text-[10px] text-gray-400 mt-1.5">Paste any public image URL. Search Unsplash for free HD images.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm border border-gray-100">
                <div className="flex justify-between"><span className="text-gray-500">Currently saved</span><span className="font-bold text-gray-900">{savedAlgo.toFixed(2)} ALGO</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Goal (from lock)</span><span className="font-bold text-gray-900">{goalAlgo.toFixed(0)} ALGO</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Image clarity</span><span className="font-bold text-cyan-600">{progress.toFixed(0)}%</span></div>
              </div>
              <button onClick={onSaveDream} disabled={busy} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold text-sm disabled:opacity-50 shadow-md shadow-cyan-500/20 transition-all">
                {busy ? 'Signing...' : 'Save Dream On-Chain'}
              </button>
              <p className="text-xs text-center text-gray-400">Immutably stored on Algorand blockchain</p>
              {status && <div className={`rounded-xl px-4 py-3 text-sm font-medium ${status.includes('fail') || status.includes('Please') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-cyan-50 text-cyan-700 border border-cyan-100'}`}>{status}</div>}
              {txId && <a className="inline-flex items-center gap-1.5 text-sm text-cyan-600 font-semibold hover:underline" href={getExplorerTransactionUrl(txId)} target="_blank" rel="noreferrer">View on Lora Explorer <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a>}
            </div>
          </div>

          {/* RIGHT — PREVIEW */}
          <div className="space-y-5">
            <div className="rounded-2xl bg-white border border-gray-100 card-shadow overflow-hidden">
              {previewUri ? (
                <div className="relative">
                  <img
                    src={previewUri}
                    alt={dreamTitle || 'Dream'}
                    className="w-full h-[400px] object-cover transition-all duration-1000"
                    style={{ filter: `blur(${blurPx}px)` }}
                  />
                  {/* Center overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="bg-black/60 backdrop-blur-md rounded-3xl px-8 py-6 text-center border border-white/10">
                      <p className="text-6xl font-black text-white tracking-tight">{progress.toFixed(0)}%</p>
                      <p className="text-white/60 text-sm mt-2 font-medium">{progress >= 100 ? 'Dream Revealed!' : progress >= 50 ? 'Getting clearer...' : 'Keep saving to reveal'}</p>
                    </div>
                  </div>
                  {/* Bottom progress bar */}
                  <div className="absolute bottom-0 left-0 right-0">
                    <div className="h-1.5 bg-black/30">
                      <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="bg-black/40 backdrop-blur-sm px-5 py-3 flex items-center justify-between">
                      <span className="text-white font-semibold text-sm">{dreamTitle || saved?.title || 'Your Dream'}</span>
                      <span className="text-white/60 text-xs">{savedAlgo.toFixed(2)} / {goalAlgo.toFixed(0)} ALGO</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[400px] bg-gradient-to-br from-gray-100 via-gray-50 to-cyan-50/30 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <p className="text-gray-500 font-medium">Paste an image URL to see the blur effect</p>
                  <p className="text-xs text-gray-400 mt-1">Your dream reveals as savings grow</p>
                </div>
              )}
            </div>

            {previewUri && (
              <div className="rounded-2xl bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-100 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-sm font-bold text-cyan-800">How blur-to-clear works</span>
                </div>
                <p className="text-xs text-cyan-700 leading-relaxed">At 0% savings your image has maximum blur (24px). Every ALGO you deposit reduces the blur proportionally. At 100% of your goal, the image is crystal clear. This creates an emotional connection between saving and seeing your dream materialize.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
