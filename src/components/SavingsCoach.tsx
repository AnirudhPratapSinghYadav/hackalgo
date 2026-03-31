import { useCallback, useEffect, useState } from 'react'
import { getCoachAdvice } from '../services/aiService'
import { getRecentDepositsSummary } from '../services/algorand'

interface Props {
  address: string
  totalSaved: number
  streak: number
  milestone: number
  vaultType: string
  onOpenDeposit: () => void
}

export default function SavingsCoach({ address, totalSaved, streak, milestone, vaultType, onOpenDeposit }: Props) {
  const [advice, setAdvice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [open, setOpen] = useState(false)

  const fetchAdvice = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const recentDeposits = await getRecentDepositsSummary(address, 3)
      const text = await getCoachAdvice({
        totalSaved,
        streak,
        milestone,
        recentDeposits,
        vaultType,
      })
      setAdvice(text)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [address, totalSaved, streak, milestone, vaultType])

  useEffect(() => {
    if (open) fetchAdvice()
  }, [open, fetchAdvice])

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(false)} />
      )}

      {open && (
        <div className="fixed right-5 bottom-24 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white card-shadow overflow-hidden">
          <div className="bg-gradient-to-r from-violet-50 via-blue-50 to-cyan-50 px-5 py-4 flex items-center justify-between border-b border-gray-100/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 7h14a2 2 0 012 2v4H3V9a2 2 0 012-2z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Vault AI Coach</h3>
                <p className="text-xs text-gray-500">Powered by Gemini</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-lg hover:bg-white/70 flex items-center justify-center text-gray-500"
              aria-label="Close coach"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="px-5 py-4">
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-violet-300 animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse [animation-delay:300ms]" />
                </div>
                <span className="text-sm text-gray-400">Thinking...</span>
              </div>
            ) : error ? (
              <p className="text-sm text-gray-500">Coach unavailable right now. Try refresh.</p>
            ) : (
              <p className="text-sm text-gray-700 leading-relaxed">{advice}</p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={fetchAdvice}
                disabled={loading}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                Refresh Advice
              </button>
              <button
                onClick={() => {
                  setOpen(false)
                  onOpenDeposit()
                }}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
              >
                Deposit Now
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed right-5 bottom-5 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 text-white shadow-[0_10px_30px_rgba(37,99,235,0.35)] hover:scale-105 transition-transform"
        aria-label="Open AI coach"
      >
        <svg className="w-7 h-7 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 7h14a2 2 0 012 2v4H3V9a2 2 0 012-2z" /></svg>
      </button>
    </>
  )
}
