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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        {status === 'done' ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Withdrawal Successful</h3>
            <p className="text-sm text-gray-500 mb-1">{numAmount} ALGO withdrawn from vault</p>
            <p className="text-xs text-gray-400 font-mono mb-4 break-all">TxID: {txId}</p>
            <a
              href={`https://lora.algokit.io/testnet/transaction/${txId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-[#2563EB] hover:underline font-medium mb-6"
            >
              View on Lora
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
            <button onClick={onSuccess} className="w-full py-3 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold rounded-xl">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-gray-900">Withdraw from Vault</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={busy}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-5">Current vault balance: <span className="font-medium text-gray-900">{maxAlgo.toFixed(2)} ALGO</span></p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (ALGO)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0.001"
                  max={maxAlgo}
                  step="0.1"
                  placeholder={`Max ${maxAlgo.toFixed(2)} ALGO`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent pr-16"
                  disabled={busy}
                />
                <button
                  onClick={() => setAmount(maxAlgo.toString())}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#2563EB] hover:underline"
                >
                  MAX
                </button>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5">
              <p className="text-xs text-amber-800">Withdrawing may reduce your deposit streak and delay milestone progress.</p>
            </div>

            {error && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
                {status === 'error' && (
                  <button onClick={() => { setStatus('idle'); setError(null) }} className="block mt-1 text-xs font-medium text-red-700 underline">
                    Try Again
                  </button>
                )}
              </div>
            )}

            <button
              onClick={handleWithdraw}
              disabled={!valid || busy}
              className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'signing'
                ? 'Waiting for wallet...'
                : status === 'confirming'
                  ? 'Confirming on-chain...'
                  : 'Withdraw'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
