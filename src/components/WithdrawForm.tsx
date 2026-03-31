import { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { withdrawFromVault } from '../services/algorand'

interface Props {
  onClose: () => void
  onSuccess: () => void
  currentBalanceMicro: number
}

export default function WithdrawForm({ onClose, onSuccess, currentBalanceMicro }: Props) {
  const { activeAddress, wallets } = useWallet()
  const activeWallet = wallets?.find((w) => w.isActive) ?? wallets?.find((w) => w.isConnected)

  const maxAlgo = currentBalanceMicro / 1_000_000
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<'idle' | 'signing' | 'confirming' | 'done' | 'error'>('idle')
  const [txId, setTxId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const numAmount = Number(amount)
  const valid = numAmount > 0 && numAmount <= maxAlgo && !isNaN(numAmount)
  const busy = status === 'signing' || status === 'confirming'

  const handleWithdraw = async () => {
    if (!activeWallet || !activeAddress || !valid) return
    setStatus('signing')
    setError(null)
    try {
      setStatus('confirming')
      const id = await withdrawFromVault(activeWallet, activeAddress, numAmount)
      setTxId(id)
      setStatus('done')
    } catch (e: any) {
      const msg = e?.message ?? 'Withdrawal failed'
      if (msg.includes('rejected')) {
        setError('Transaction was rejected by wallet.')
      } else if (msg.includes('underflow')) {
        setError('Cannot withdraw more than your vault balance.')
      } else {
        setError(msg)
      }
      setStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }}
      >
        {status === 'done' ? (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Withdrawal Successful</h3>
            <p className="text-sm text-gray-500 mb-1">{numAmount} ALGO withdrawn from vault</p>
            <p className="text-xs text-gray-400 font-mono mb-5 break-all bg-gray-50 rounded-lg px-3 py-2 mt-3">TxID: {txId}</p>
            <a
              href={`https://lora.algokit.io/testnet/transaction/${txId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-[#2563EB] hover:underline font-semibold mb-6"
            >
              View on Lora Explorer
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
            <button onClick={onSuccess} className="w-full py-3.5 bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] text-white font-semibold rounded-xl shadow-sm">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-4 4m4-4l4 4" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Withdraw from Vault</h3>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors" disabled={busy}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <p className="text-sm text-gray-500 ml-[46px]">Current vault balance: <span className="font-semibold text-gray-900">{maxAlgo.toFixed(2)} ALGO</span></p>
            </div>

            <div className="px-6 pb-6">
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (ALGO)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.001"
                    max={maxAlgo}
                    step="0.1"
                    placeholder={`Max ${maxAlgo.toFixed(2)} ALGO`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-gray-900 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 bg-gray-50/50 pr-20 transition-all"
                    disabled={busy}
                  />
                  <button
                    onClick={() => setAmount(maxAlgo.toString())}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#2563EB] bg-blue-50 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl px-4 py-3 mb-5 flex items-start gap-2.5">
                <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs text-amber-800 leading-relaxed">Withdrawing may reduce your deposit streak and delay milestone progress.</p>
              </div>

              {error && (
                <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {error}
                  {status === 'error' && (
                    <button onClick={() => { setStatus('idle'); setError(null) }} className="block mt-1.5 text-xs font-semibold text-red-700 underline">
                      Try Again
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={handleWithdraw}
                disabled={!valid || busy}
                className="w-full py-3.5 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {status === 'signing'
                  ? 'Waiting for wallet...'
                  : status === 'confirming'
                    ? 'Confirming on-chain...'
                    : 'Withdraw'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
