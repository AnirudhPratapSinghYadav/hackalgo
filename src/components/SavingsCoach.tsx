import { useCallback, useEffect, useState } from 'react'
import { getCoachAdvice } from '../services/aiService'

interface Props {
  totalSaved: number
  streak: number
  milestone: number
  vaultType: string
}

export default function SavingsCoach({ totalSaved, streak, milestone, vaultType }: Props) {
  const [advice, setAdvice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchAdvice = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const text = await getCoachAdvice({
        totalSaved,
        streak,
        milestone,
        recentDeposits: totalSaved > 0 ? 'recent activity' : 'none yet',
        vaultType,
      })
      setAdvice(text)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [totalSaved, streak, milestone, vaultType])

  useEffect(() => {
    fetchAdvice()
  }, [fetchAdvice])

  return (
    <div className="rounded-2xl border border-gray-100 bg-white card-shadow overflow-hidden">
      {/* Header with gradient accent */}
      <div className="bg-gradient-to-r from-violet-50 via-blue-50 to-cyan-50 px-6 py-4 flex items-center justify-between border-b border-gray-100/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Your AI Savings Coach</h3>
            <p className="text-xs text-gray-500">Personalized advice for your journey</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-violet-600 bg-violet-100 px-2.5 py-1 rounded-full border border-violet-200/60 uppercase tracking-wider">
            Powered by Claude AI
          </span>
          <button
            onClick={fetchAdvice}
            disabled={loading}
            className="w-8 h-8 rounded-lg hover:bg-white/80 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
            title="Refresh advice"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        {loading ? (
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-violet-300 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-cyan-300 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm text-gray-400">Thinking...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-sm text-gray-500">Coach unavailable right now. Try refreshing.</p>
            </div>
            <button
              onClick={fetchAdvice}
              className="text-xs text-[#2563EB] font-semibold hover:underline"
            >
              Retry
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-700 leading-relaxed">{advice}</p>
        )}
      </div>
    </div>
  )
}
