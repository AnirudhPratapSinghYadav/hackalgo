import { useEffect, useState } from 'react'
import { getTransactionHistory } from '../services/algorand'

interface Props {
  address: string
}

interface Txn {
  txId: string
  amount: number
  type: string
  timestamp: number
  loraUrl: string
}

function formatTime(ts: number) {
  if (!ts) return '—'
  const d = new Date(ts * 1000)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function txTypeLabel(type: string) {
  switch (type) {
    case 'pay': return 'Payment'
    case 'appl': return 'App Call'
    case 'axfer': return 'Asset Transfer'
    default: return type.toUpperCase()
  }
}

export default function TransactionHistory({ address }: Props) {
  const [txns, setTxns] = useState<Txn[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getTransactionHistory(address, 15)
      .then(setTxns)
      .catch(() => setTxns([]))
      .finally(() => setLoading(false))
  }, [address])

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">Transaction History</h3>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-gray-400">Loading transactions...</div>
      ) : txns.length === 0 ? (
        <div className="p-8 text-center">
          <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          <p className="text-sm text-gray-500 font-medium">No transactions yet</p>
          <p className="text-xs text-gray-400 mt-1">Deposit ALGO to see your history here</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="px-5 py-3 font-medium">Time</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
                <th className="px-5 py-3 font-medium">Transaction</th>
                <th className="px-5 py-3 font-medium text-right">Explorer</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.txId} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{formatTime(t.timestamp)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      t.type === 'pay' ? 'bg-blue-50 text-blue-700' :
                      t.type === 'appl' ? 'bg-purple-50 text-purple-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {txTypeLabel(t.type)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">
                    {t.amount > 0 ? `${(t.amount / 1_000_000).toFixed(2)} ALGO` : '—'}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">
                    {t.txId.slice(0, 8)}...{t.txId.slice(-4)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <a
                      href={t.loraUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:underline font-medium"
                    >
                      View
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
