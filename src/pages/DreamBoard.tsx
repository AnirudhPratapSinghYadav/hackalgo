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
  const blurPx = Math.max(0, 20 - (progress / 100) * 20)

  const onSaveDream = async () => {
    if (!dreamUri || !dreamTitle) { setStatus('Please fill in both title and image URL'); return }
    setBusy(true); setStatus('Saving dream on-chain...')
    try {
      const id = await setDreamBoard(signTransactions, activeAddress, dreamUri, dreamTitle)
      setTxId(id)
      setSaved({ title: dreamTitle, uri: dreamUri })
      setStatus('Dream board saved on Algorand!')
    } catch (e: any) { setStatus(e?.message || 'Failed to save dream board') } finally { setBusy(false) }
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT - Form */}
          <div className="space-y-5">
            <div className="rounded-2xl bg-white border border-gray-100 p-6 card-shadow space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">Your Dream &#127775;</h2>
                <p className="text-sm text-gray-500 mt-1">Attach a goal to your vault. As you save more, the image becomes clearer.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Dream Title</label>
                <input className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="e.g. Goa Trip 2026" value={dreamTitle} onChange={(e) => setDreamTitle(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Dream Image URL</label>
                <input className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="https://images.unsplash.com/..." value={dreamUri} onChange={(e) => setDreamUri(e.target.value)} />
              </div>

              <button onClick={onSaveDream} disabled={busy} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7c3aed] hover:from-[#1d4ed8] hover:to-[#6d28d9] text-white font-semibold text-sm disabled:opacity-50 shadow-sm transition-all">
                {busy ? 'Signing...' : 'Save Dream On-Chain'}
              </button>
              <p className="text-xs text-gray-400 text-center">Your dream is stored immutably on Algorand</p>

              {status && <p className="text-sm font-medium text-gray-700">{status}</p>}
              {txId && (
                <a className="inline-flex items-center gap-1 text-sm text-[#2563EB] font-semibold hover:underline" href={getExplorerTransactionUrl(txId)} target="_blank" rel="noreferrer">
                  View on Lora Explorer &rarr;
                </a>
              )}
            </div>
          </div>

          {/* RIGHT - Preview */}
          <div className="space-y-5">
            <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden card-shadow">
              {(saved?.uri || dreamUri) ? (
                <div className="relative">
                  <img
                    src={saved?.uri || dreamUri}
                    alt={saved?.title || dreamTitle || 'Dream'}
                    className="w-full h-80 object-cover transition-all duration-700"
                    style={{ filter: `blur(${blurPx}px)` }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-6 py-4 text-center">
                      <p className="text-white text-3xl font-bold">{progress.toFixed(0)}%</p>
                      <p className="text-white/70 text-sm mt-1">{progress >= 100 ? 'Dream revealed!' : 'Keep saving to reveal your dream'}</p>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/20">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-violet-500 transition-all duration-700" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : (
                <div className="h-80 bg-gradient-to-br from-gray-100 to-gray-50 flex flex-col items-center justify-center text-gray-400">
                  <svg className="w-16 h-16 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-sm font-medium">Add an image URL to preview your dream</p>
                </div>
              )}
              <div className="px-5 py-4 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{saved?.title || dreamTitle || 'Untitled Dream'}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>{savedAlgo.toFixed(2)} / {goalAlgo.toFixed(0)} ALGO saved</span>
                  <span>{progress.toFixed(0)}% clarity</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
