import { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { claimBadge } from '../services/algorand'

interface MilestoneData {
  level: number
  name: string
  threshold: number
  color: string
  bgColor: string
  borderColor: string
  icon: string
}

const MILESTONES: MilestoneData[] = [
  { level: 1, name: 'Vault Starter', threshold: 10, color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-400', icon: '\u{1F949}' },
  { level: 2, name: 'Vault Builder', threshold: 50, color: 'text-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-400', icon: '\u{1F948}' },
  { level: 3, name: 'Vault Master', threshold: 100, color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-400', icon: '\u{1F947}' },
]

interface Props {
  savedAlgo: number
  currentMilestone: number
  onBadgeClaimed: () => void
}

export default function MilestoneCards({ savedAlgo, currentMilestone, onBadgeClaimed }: Props) {
  return (
    <div>
      <h2 className="font-bold text-gray-900 text-lg mb-3">Milestone Badges</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {MILESTONES.map((m) => (
          <SingleCard
            key={m.level}
            milestone={m}
            savedAlgo={savedAlgo}
            claimed={currentMilestone >= m.level}
            unlocked={savedAlgo >= m.threshold}
            canClaim={savedAlgo >= m.threshold && currentMilestone < m.level}
            onBadgeClaimed={onBadgeClaimed}
          />
        ))}
      </div>
    </div>
  )
}

function SingleCard({
  milestone,
  savedAlgo,
  claimed,
  unlocked,
  canClaim,
  onBadgeClaimed,
}: {
  milestone: MilestoneData
  savedAlgo: number
  claimed: boolean
  unlocked: boolean
  canClaim: boolean
  onBadgeClaimed: () => void
}) {
  const { activeAddress, wallets } = useWallet()
  const activeWallet = wallets?.find((w) => w.isActive) ?? wallets?.find((w) => w.isConnected)

  const [claiming, setClaiming] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showShare, setShowShare] = useState(false)

  const progress = Math.min(100, (savedAlgo / milestone.threshold) * 100)

  const handleClaim = async () => {
    if (!activeWallet || !activeAddress) return
    setClaiming(true)
    setError(null)
    try {
      const id = await claimBadge(activeWallet, activeAddress, milestone.level)
      setTxId(id)
      setShowShare(true)
      onBadgeClaimed()
    } catch (e: any) {
      setError(e?.message ?? 'Claim failed')
    } finally {
      setClaiming(false)
    }
  }

  const cardBorder = claimed
    ? 'border-green-400 shadow-[0_0_12px_rgba(34,197,94,0.15)]'
    : unlocked
      ? `${milestone.borderColor} shadow-[0_0_12px_rgba(59,130,246,0.1)]`
      : 'border-gray-200'

  return (
    <>
      <div className={`rounded-xl border-2 p-5 bg-white transition-all ${cardBorder}`}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-3xl">{milestone.icon}</span>
          {claimed ? (
            <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">CLAIMED</span>
          ) : unlocked ? (
            <span className="text-xs font-semibold bg-blue-100 text-[#2563EB] px-2.5 py-1 rounded-full">UNLOCKED</span>
          ) : (
            <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">LOCKED</span>
          )}
        </div>

        <h3 className="font-bold text-gray-900 mb-1">{milestone.name}</h3>
        <p className="text-sm text-gray-500 mb-3">{milestone.threshold} ALGO threshold</p>

        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{savedAlgo.toFixed(2)} ALGO</span>
            <span>{milestone.threshold} ALGO</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${claimed ? 'bg-green-500' : unlocked ? 'bg-[#2563EB]' : 'bg-gray-300'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{progress.toFixed(0)}% complete</p>
        </div>

        {error && (
          <p className="text-xs text-red-600 mb-2">{error}</p>
        )}

        {canClaim && (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {claiming ? 'Minting NFT...' : 'Claim Badge'}
          </button>
        )}

        {claimed && txId && (
          <a
            href={`https://lora.algokit.io/testnet/transaction/${txId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 text-xs text-[#2563EB] hover:underline font-medium mt-2"
          >
            View on Lora
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        )}
      </div>

      {/* ACHIEVEMENT SHARE CARD */}
      {showShare && txId && activeAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowShare(false)}>
          <div className="mx-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div id={`share-card-${milestone.level}`} className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-center shadow-2xl">
              <div className="text-5xl mb-4">{milestone.icon}</div>
              <h3 className="text-white font-bold text-xl mb-1">Achievement Unlocked!</h3>
              <p className="text-gray-300 text-sm mb-4">I just earned <span className="text-white font-semibold">{milestone.name}</span> on AlgoVault!</p>
              <div className="bg-white/10 rounded-lg px-4 py-3 mb-4">
                <p className="text-gray-400 text-xs font-mono">{activeAddress.slice(0, 8)}...{activeAddress.slice(-6)}</p>
                <p className="text-white text-lg font-bold mt-1">{savedAlgo.toFixed(2)} ALGO saved</p>
              </div>
              <div className="text-gray-500 text-xs">
                Powered by Algorand Testnet &middot; App {import.meta.env.VITE_APP_ID}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  const text = `I just earned the ${milestone.name} badge on AlgoVault! ${savedAlgo.toFixed(2)} ALGO saved on Algorand Testnet. #Algorand #AlgoVault #Web3`
                  navigator.clipboard.writeText(text)
                }}
                className="flex-1 py-2.5 bg-white text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-100"
              >
                Copy Share Text
              </button>
              <button
                onClick={() => setShowShare(false)}
                className="flex-1 py-2.5 bg-[#2563EB] text-white text-sm font-semibold rounded-lg hover:bg-[#1d4ed8]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
