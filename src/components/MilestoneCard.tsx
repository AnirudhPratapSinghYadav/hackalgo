import { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { claimBadge } from '../services/algorand'

interface MilestoneData {
  level: number
  name: string
  threshold: number
  icon: string
  gradient: string
  glowClass: string
  progressColor: string
}

const MILESTONES: MilestoneData[] = [
  {
    level: 1, name: 'Vault Starter', threshold: 10, icon: '\u{1F949}',
    gradient: 'from-amber-400 to-orange-500',
    glowClass: 'shadow-[0_0_20px_rgba(245,158,11,0.25)]',
    progressColor: 'from-amber-400 to-orange-500',
  },
  {
    level: 2, name: 'Vault Builder', threshold: 50, icon: '\u{1F948}',
    gradient: 'from-gray-300 to-gray-500',
    glowClass: 'shadow-[0_0_20px_rgba(156,163,175,0.3)]',
    progressColor: 'from-gray-400 to-gray-600',
  },
  {
    level: 3, name: 'Vault Master', threshold: 100, icon: '\u{1F947}',
    gradient: 'from-yellow-300 to-yellow-500',
    glowClass: 'shadow-[0_0_20px_rgba(234,179,8,0.3)]',
    progressColor: 'from-yellow-400 to-yellow-600',
  },
]

interface Props {
  savedAlgo: number
  currentMilestone: number
  onBadgeClaimed: () => void
}

export default function MilestoneCards({ savedAlgo, currentMilestone, onBadgeClaimed }: Props) {
  return (
    <div>
      <h2 className="font-bold text-gray-900 text-lg mb-3 tracking-tight">Milestone Badges</h2>
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

  const borderStyle = claimed
    ? 'border-green-300 glow-green'
    : unlocked
      ? `border-[#2563EB]/40 glow-blue`
      : 'border-gray-100'

  return (
    <>
      <div className={`rounded-2xl border-2 p-5 bg-white transition-all duration-300 hover:card-shadow-hover card-shadow ${borderStyle}`}>
        {/* Badge icon + status */}
        <div className="flex items-center justify-between mb-4">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${milestone.gradient} flex items-center justify-center ${unlocked || claimed ? milestone.glowClass : ''}`}>
            <span className="text-2xl">{milestone.icon}</span>
          </div>
          {claimed ? (
            <span className="text-xs font-bold bg-green-50 text-green-600 px-3 py-1.5 rounded-full border border-green-100">CLAIMED</span>
          ) : unlocked ? (
            <span className="text-xs font-bold bg-blue-50 text-[#2563EB] px-3 py-1.5 rounded-full border border-blue-100 animate-pulse">UNLOCKED</span>
          ) : (
            <span className="text-xs font-bold bg-gray-50 text-gray-400 px-3 py-1.5 rounded-full border border-gray-100">LOCKED</span>
          )}
        </div>

        <h3 className="font-bold text-gray-900 text-base mb-0.5">{milestone.name}</h3>
        <p className="text-sm text-gray-500 mb-4">{milestone.threshold} ALGO threshold</p>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-medium text-gray-600">{savedAlgo.toFixed(2)} ALGO</span>
            <span className="font-medium text-gray-400">{milestone.threshold} ALGO</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${
                claimed ? 'from-green-400 to-emerald-500' :
                unlocked ? 'from-[#2563EB] to-[#7c3aed]' :
                'from-gray-200 to-gray-300'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5 font-medium">{progress.toFixed(0)}% complete</p>
        </div>

        {error && (
          <p className="text-xs text-red-600 mb-2 bg-red-50 rounded-lg px-2.5 py-1.5">{error}</p>
        )}

        {canClaim && (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full py-3 bg-gradient-to-r from-[#2563EB] to-[#7c3aed] hover:from-[#1d4ed8] hover:to-[#6d28d9] text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 shadow-sm"
          >
            {claiming ? 'Minting NFT...' : 'Claim Badge'}
          </button>
        )}

        {claimed && txId && (
          <a
            href={`https://lora.algokit.io/testnet/transaction/${txId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 text-xs text-[#2563EB] hover:underline font-semibold mt-2"
          >
            View on Lora
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        )}
      </div>

      {/* Achievement Share Card */}
      {showShare && txId && activeAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowShare(false)}>
          <div className="mx-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-[#1e3a5f] rounded-2xl p-7 text-center shadow-2xl border border-white/5">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${milestone.gradient} flex items-center justify-center mx-auto mb-5 ${milestone.glowClass}`}>
                <span className="text-4xl">{milestone.icon}</span>
              </div>
              <h3 className="text-white font-bold text-2xl mb-2">Achievement Unlocked!</h3>
              <p className="text-gray-400 text-sm mb-5">
                I just earned <span className="text-white font-semibold">{milestone.name}</span> on AlgoVault!
              </p>
              <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-4 mb-5">
                <p className="text-gray-500 text-xs font-mono">{activeAddress.slice(0, 8)}...{activeAddress.slice(-6)}</p>
                <p className="text-white text-2xl font-bold mt-1.5">{savedAlgo.toFixed(2)} <span className="text-base text-gray-400 font-normal">ALGO saved</span></p>
              </div>
              <div className="text-gray-600 text-xs">
                Powered by Algorand Testnet &middot; App {import.meta.env.VITE_APP_ID}
              </div>
            </div>
            <div className="flex gap-2.5 mt-4">
              <button
                onClick={() => {
                  const text = `I just earned the ${milestone.name} badge on AlgoVault! ${savedAlgo.toFixed(2)} ALGO saved on Algorand Testnet. #Algorand #AlgoVault #Web3`
                  navigator.clipboard.writeText(text)
                }}
                className="flex-1 py-3 bg-white text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors"
              >
                Copy Share Text
              </button>
              <button
                onClick={() => setShowShare(false)}
                className="flex-1 py-3 bg-gradient-to-r from-[#2563EB] to-[#7c3aed] text-white text-sm font-semibold rounded-xl hover:from-[#1d4ed8] hover:to-[#6d28d9] transition-all"
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
