import { useCallback, useEffect, useState } from 'react'
import { getTransactionHistory } from '../services/algorand'

interface Props {
  address: string
}

interface Txn {
  txId: string
  amount: number
  type: string
  action: string
  timestamp: number
  loraUrl: string
}

function formatTime(ts: number) {
  if (!ts) return '\u2014'
  const d = new Date(ts * 1000)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const TX_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  Deposit: { label: 'Deposit', bg: 'bg-blue-50', text: 'text-blue-700' },
  'App Call': { label: 'App Call', bg: 'bg-violet-50', text: 'text-violet-700' },
  pay: { label: 'Payment', bg: 'bg-blue-50', text: 'text-blue-700' },
  appl: { label: 'App Call', bg: 'bg-violet-50', text: 'text-violet-700' },
  axfer: { label: 'Asset Transfer', bg: 'bg-emerald-50', text: 'text-emerald-700' },
}

function txStyle(action: string, type: string) {
  return TX_STYLES[action] ?? TX_STYLES[type] ?? { label: action || type.toUpperCase(), bg: 'bg-gray-50', text: 'text-gray-600' }
}

export default function TransactionHistory({ address }: Props) {
  const [txns, setTxns] = useState<Txn[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHistory = useCallback(() => {
    setLoading(true)
    getTransactionHistory(address, 15)
      .then(setTxns)
      .catch(() => setTxns([]))
      .finally(() => setLoading(false))
  }, [address])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden card-shadow">
      <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <h3 className="font-bold text-gray-900">Transaction History</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-medium">{txns.length} transactions</span>
          <button onClick={fetchHistory} className="text-xs font-semibold text-[#2563EB] hover:underline">
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-[#2563EB] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading transactions...</p>
        </div>
      ) : txns.length === 0 ? (
        <div className="p-10 text-center">
          <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <p className="text-sm text-gray-600 font-medium">No transactions yet</p>
          <p className="text-xs text-gray-400 mt-1">Deposit ALGO to see your history here</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
                <th className="px-6 py-3.5 font-semibold">Time</th>
                <th className="px-6 py-3.5 font-semibold">Type</th>
                <th className="px-6 py-3.5 font-semibold text-right">Amount</th>
                <th className="px-6 py-3.5 font-semibold">Transaction</th>
                <th className="px-6 py-3.5 font-semibold text-right">Explorer</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => {
                const style = txStyle(t.action, t.type)
                return (
                  <tr key={t.txId} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{formatTime(t.timestamp)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      {t.amount > 0 ? `${(t.amount / 1_000_000).toFixed(2)} ALGO` : '\u2014'}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">
                      {t.txId.slice(0, 8)}...{t.txId.slice(-4)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={t.loraUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:underline font-semibold"
                      >
                        View
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
