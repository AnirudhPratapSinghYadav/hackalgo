import { useCallback, useEffect, useRef, useState } from 'react'
import { sendChatMessage, type ChatMessage, type UserContext } from '../services/aiService'
import { getRecentDepositsSummary, getUserExtraState } from '../services/algorand'

interface Props {
  address: string
  totalSaved: number
  streak: number
  milestone: number
  onOpenDeposit: () => void
}

const SUGGESTIONS = [
  'How much have I saved?',
  'When do I get my next badge?',
  'What happens if I withdraw now?',
  'Give me a savings tip',
  'Explain how AlgoVault works',
  'What is my streak?',
]

export default function AIChatbot({ address, totalSaved, streak, milestone, onOpenDeposit }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [ctx, setCtx] = useState<UserContext>({
    totalSaved, streak, milestone,
    lockEnabled: false, goalAmount: 0, penaltyPct: 0,
    recentDeposits: 'loading...',
  })
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setCtx((prev) => ({ ...prev, totalSaved, streak, milestone }))
  }, [totalSaved, streak, milestone])

  useEffect(() => {
    if (!address) return
    getUserExtraState(address).then((s) => {
      setCtx((prev) => ({
        ...prev,
        lockEnabled: s.lockEnabled === 1,
        goalAmount: s.goalAmountMicro / 1_000_000,
        penaltyPct: s.penaltyBps / 100,
      }))
    }).catch(() => undefined)
    getRecentDepositsSummary(address, 3).then((r) => {
      setCtx((prev) => ({ ...prev, recentDeposits: r }))
    }).catch(() => undefined)
  }, [address])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: ChatMessage = { role: 'user', text: text.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const response = await sendChatMessage([...messages, userMsg].slice(-10), text.trim(), ctx)
      setMessages((prev) => [...prev, { role: 'model', text: response }])
    } catch {
      setMessages((prev) => [...prev, { role: 'model', text: 'Sorry, I couldn\'t process that. Try again.' }])
    } finally {
      setLoading(false)
    }
  }, [messages, ctx, loading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    send(input)
  }

  return (
    <>
      {/* BACKDROP */}
      {open && <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={() => setOpen(false)} />}

      {/* CHAT PANEL */}
      {open && (
        <div className="fixed right-4 bottom-20 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-7rem)] rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-black/10 flex flex-col overflow-hidden">
          {/* HEADER */}
          <div className="bg-gradient-to-r from-[#2563EB] to-[#7c3aed] px-5 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">AlgoVault AI</h3>
                <p className="text-white/60 text-[10px] font-medium">Reads your real on-chain data</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-white/80 bg-white/15 px-2 py-1 rounded-full border border-white/10">Gemini</span>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center text-white/80 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* MESSAGES */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-4 pt-2">
                <div className="bg-gradient-to-br from-blue-50 to-violet-50 rounded-xl p-4 border border-blue-100/60">
                  <p className="text-sm text-gray-700 font-medium mb-1">Welcome to AlgoVault AI</p>
                  <p className="text-xs text-gray-500 leading-relaxed">I can see your real blockchain data — {totalSaved.toFixed(2)} ALGO saved, {streak} deposit streak, level {milestone}/3. Ask me anything about your vault, savings strategy, or how Algorand works.</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Suggested questions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => send(q)}
                        className="text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-gradient-to-r from-[#2563EB] to-[#4f46e5] text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {messages.length > 0 && !loading && (
              <div className="pt-1">
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.slice(0, 3).map((q) => (
                    <button key={q} onClick={() => send(q)} className="text-[10px] px-2.5 py-1 rounded-full border border-gray-100 bg-white text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-all">
                      {q}
                    </button>
                  ))}
                  <button onClick={() => { setOpen(false); onOpenDeposit() }} className="text-[10px] px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 font-semibold border border-blue-100 hover:bg-blue-100 transition-all">
                    Deposit ALGO
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* INPUT */}
          <form onSubmit={handleSubmit} className="flex-shrink-0 border-t border-gray-100 px-4 py-3 flex gap-2 bg-white">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your savings, badges, penalties..."
              className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4f46e5] text-white flex items-center justify-center disabled:opacity-40 hover:shadow-md transition-all flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </form>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed right-4 bottom-4 z-50 h-14 w-14 rounded-full text-white shadow-xl transition-all duration-300 flex items-center justify-center ${
          open
            ? 'bg-gray-800 hover:bg-gray-700 rotate-0'
            : 'bg-gradient-to-br from-[#2563EB] to-[#7c3aed] hover:shadow-2xl hover:shadow-blue-500/30 hover:scale-105'
        }`}
        aria-label="Open AI advisor"
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        )}
      </button>
    </>
  )
}
