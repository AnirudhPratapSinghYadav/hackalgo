import { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { claimBadge, getExplorerAssetUrl, getExplorerTransactionUrl } from '../services/algorand'
import { badgeSvgToDataUri } from '../utils/badgeSvg'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface MilestoneData {
  level: number
  name: string
  threshold: number
  icon: string
  gradient: string
  glowClass: string
  progressColor: string
}

function buildMilestones(milestonesAlgo: { m1: number; m2: number; m3: number }): MilestoneData[] {
  return [
    {
      level: 1, name: 'Vault Starter', threshold: milestonesAlgo.m1, icon: '\u{1F949}',
      gradient: 'from-amber-400 to-orange-500',
      glowClass: 'shadow-[0_0_20px_rgba(245,158,11,0.25)]',
      progressColor: 'from-amber-400 to-orange-500',
    },
    {
      level: 2, name: 'Vault Builder', threshold: milestonesAlgo.m2, icon: '\u{1F948}',
      gradient: 'from-gray-300 to-gray-500',
      glowClass: 'shadow-[0_0_20px_rgba(156,163,175,0.3)]',
      progressColor: 'from-gray-400 to-gray-600',
    },
    {
      level: 3, name: 'Vault Master', threshold: milestonesAlgo.m3, icon: '\u{1F947}',
      gradient: 'from-yellow-300 to-yellow-500',
      glowClass: 'shadow-[0_0_20px_rgba(234,179,8,0.3)]',
      progressColor: 'from-yellow-400 to-yellow-600',
    },
  ]
}

interface Props {
  savedAlgo: number
  currentMilestone: number
  onBadgeClaimed: () => void
  milestonesAlgo: { m1: number; m2: number; m3: number }
}

export default function MilestoneCards({ savedAlgo, currentMilestone, onBadgeClaimed, milestonesAlgo }: Props) {
  const [openVault, setOpenVault] = useState(false)
  const MILESTONES = buildMilestones(milestonesAlgo)
  return (
    <div data-badge-vault-anchor="true">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-900 text-lg tracking-tight">Milestone Badges</h2>
        <button
          onClick={() => setOpenVault(true)}
          className="text-xs font-semibold text-[#2563EB] hover:underline"
        >
          Open Badge Vault
        </button>
      </div>
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

      {openVault && (
        <BadgeVaultModal
          onClose={() => setOpenVault(false)}
          currentMilestone={currentMilestone}
          savedAlgo={savedAlgo}
          milestonesAlgo={milestonesAlgo}
        />
      )}
    </div>
  )
}

function BadgeVaultModal({
  onClose,
  currentMilestone,
  savedAlgo,
  milestonesAlgo,
}: {
  onClose: () => void
  currentMilestone: number
  savedAlgo: number
  milestonesAlgo: { m1: number; m2: number; m3: number }
}) {
  const { activeAddress } = useWallet()
  const [tab, setTab] = useState<'certificates' | 'asa_badges'>('certificates')
  const [selected, setSelected] = useState<number>(0)
  const [downloading, setDownloading] = useState(false)

  const MILESTONES = buildMilestones(milestonesAlgo)
  const certificates = [
    { level: 0, name: 'Enrollment Certificate', icon: '📜', threshold: 0, desc: 'Certificate generated from your real application opt-in.' },
    ...MILESTONES.map((m) => ({ level: m.level, name: `${m.name} Certificate`, icon: m.icon, threshold: m.threshold, desc: `Certificate preview for reaching ${m.threshold} ALGO.` })),
  ]

  const asaBadges = MILESTONES.map((m) => ({
    level: m.level,
    name: m.name,
    icon: m.icon,
    threshold: m.threshold,
    desc: 'Minted on-chain as an ASA (total supply 1) by the smart contract.',
  }))

  const items = tab === 'certificates' ? certificates : asaBadges
  const current = items.find((b) => b.level === selected) ?? items[0]

  const isUnlocked = tab === 'certificates'
    ? (current.level === 0 ? true : savedAlgo >= current.threshold)
    : currentMilestone >= current.level

  const certificateElId = `certificate-render-${current.level}`

  const downloadPdf = async () => {
    if (tab !== 'certificates') return
    if (!activeAddress) return
    const el = document.getElementById(certificateElId)
    if (!el) return

    setDownloading(true)
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const margin = 36
      const maxW = pageW - margin * 2
      const maxH = pageH - margin * 2
      const scale = Math.min(maxW / canvas.width, maxH / canvas.height)
      const w = canvas.width * scale
      const h = canvas.height * scale
      const x = (pageW - w) / 2
      const y = (pageH - h) / 2
      pdf.addImage(imgData, 'PNG', x, y, w, h, undefined, 'FAST')
      const safe = current.name.replace(/[^a-z0-9]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      pdf.save(`AlgoVault-${safe}.pdf`)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-5xl bg-white rounded-2xl overflow-hidden border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Badge Vault</p>
            <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Your proofs of discipline</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="grid lg:grid-cols-12">
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500">Click to view certificate in badge vault</p>
              <div className="inline-flex rounded-xl border border-gray-100 bg-gray-50 p-1">
                <button
                  onClick={() => { setTab('certificates'); setSelected(0) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === 'certificates' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Certificates
                </button>
                <button
                  onClick={() => { setTab('asa_badges'); setSelected(1) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === 'asa_badges' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  ASA Badges
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((b) => {
                const unlockedItem = tab === 'certificates'
                  ? (b.level === 0 ? true : savedAlgo >= b.threshold)
                  : currentMilestone >= b.level
                const isSelected = selected === b.level
                return (
                  <button
                    key={b.level}
                    onClick={() => setSelected(b.level)}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      isSelected ? 'border-[#2563EB] bg-blue-50' : 'border-gray-100 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${unlockedItem ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {b.icon}
                    </div>
                    <p className="mt-3 text-sm font-bold text-gray-900 leading-snug">{b.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{b.level === 0 ? 'Level 0' : `${b.threshold} ALGO`}</p>
                    {!unlockedItem && <p className="text-[10px] text-gray-400 mt-1">To unlock, earn it.</p>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="lg:col-span-7 p-6">
            <div className={`rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-[#1e3a5f] p-7 text-white relative overflow-hidden ${isUnlocked ? 'opacity-100' : 'opacity-50'}`}>
              <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Preview</p>
                    <h4 className="text-2xl font-extrabold tracking-tight mt-1">{current.name}</h4>
                    <p className="text-white/60 text-sm mt-2 max-w-md">{current.desc}</p>
                  </div>
                  {activeAddress && current.level > 0 ? (
                    <img
                      src={badgeSvgToDataUri(activeAddress, current.level)}
                      alt={current.name}
                      className="w-16 h-16 rounded-2xl border border-white/10"
                    />
                  ) : (
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl border border-white/10 ${isUnlocked ? 'bg-white/10' : 'bg-white/5'}`}>
                      {current.icon}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-white/70 text-xs font-semibold">Your saved</p>
                    <p className="text-white font-bold">{savedAlgo.toFixed(2)} ALGO</p>
                  </div>
                  {current.level !== 0 && (
                    <>
                      <div className="h-2.5 bg-white/10 rounded-full overflow-hidden mt-3">
                        <div
                          className="h-full bg-gradient-to-r from-[#2563EB] to-[#7c3aed] rounded-full"
                          style={{ width: `${Math.min(100, (savedAlgo / current.threshold) * 100)}%` }}
                        />
                      </div>
                      <p className="text-white/50 text-xs mt-2">
                        {savedAlgo >= current.threshold ? (tab === 'certificates' ? 'Click to view certificate in badge vault.' : 'Unlocked — mint on-chain to claim.') : `${(current.threshold - savedAlgo).toFixed(2)} ALGO remaining to unlock.`}
                      </p>
                    </>
                  )}
                </div>

                {tab === 'certificates' && (
                  <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 p-4">
                    <p className="text-white/70 text-xs font-semibold">Certificate</p>
                    <div className="mt-3 bg-white rounded-xl p-5 text-gray-900" id={certificateElId}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">AlgoVault</p>
                          <h5 className="text-lg font-extrabold tracking-tight mt-1">{current.name}</h5>
                          <p className="text-xs text-gray-500 mt-1">App {Number(import.meta.env.VITE_APP_ID)} · Algorand Testnet</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-900 to-[#1e1b4b] flex items-center justify-center text-white text-xl">
                          {current.icon}
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Wallet</span>
                          <span className="text-[10px] font-mono text-gray-700">{activeAddress ? `${activeAddress.slice(0, 8)}...${activeAddress.slice(-6)}` : '—'}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Saved</span>
                          <span className="text-[10px] font-mono text-gray-700">{savedAlgo.toFixed(2)} ALGO</span>
                        </div>
                        {current.level !== 0 && (
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Milestone</span>
                            <span className="text-[10px] font-mono text-gray-700">{current.threshold} ALGO</span>
                          </div>
                        )}
                      </div>

                      {!isUnlocked && (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs font-semibold text-amber-900">To unlock, earn it.</p>
                          <p className="text-[11px] text-amber-800/80 mt-1">This certificate remains locked until your on-chain vault balance reaches the milestone.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {tab === 'certificates'
                  ? 'Certificates are generated from live chain-backed vault state. ASA badges are minted separately.'
                  : 'Badges level 1–3 are minted as real ASA NFTs by the smart contract.'}
              </p>
              {tab === 'certificates' ? (
                <button
                  onClick={downloadPdf}
                  disabled={downloading || !activeAddress}
                  className="text-sm font-semibold text-[#2563EB] hover:underline disabled:opacity-50"
                >
                  {downloading ? 'Preparing PDF...' : 'Download PDF'}
                </button>
              ) : (
                <button onClick={onClose} className="text-sm font-semibold text-gray-500 hover:text-gray-900">
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
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
  const { activeAddress, signTransactions } = useWallet()

  const [claiming, setClaiming] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)
  const [assetId, setAssetId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showShare, setShowShare] = useState(false)

  const progress = Math.min(100, (savedAlgo / milestone.threshold) * 100)
  const nearUnlock = !unlocked && progress >= 85

  const handleClaim = async () => {
    if (!activeAddress) return
    setClaiming(true)
    setError(null)
    try {
      const res = await claimBadge(signTransactions, activeAddress, milestone.level)
      setTxId(res.txId)
      setAssetId(res.assetId ?? null)
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
          {activeAddress ? (
            <img
              src={badgeSvgToDataUri(activeAddress, milestone.level)}
              alt={milestone.name}
              className={`w-14 h-14 rounded-xl ${unlocked || claimed ? milestone.glowClass : 'opacity-40 grayscale'}`}
            />
          ) : (
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${milestone.gradient} flex items-center justify-center ${unlocked || claimed ? milestone.glowClass : ''}`}>
              <span className="text-2xl">{milestone.icon}</span>
            </div>
          )}
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
        {nearUnlock && (
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 border border-amber-100 animate-pulse">
            <span>⚡</span>
            One deposit away
          </div>
        )}

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
          <div className="mt-2 space-y-1">
            <a
              href={getExplorerTransactionUrl(txId)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 text-xs text-[#2563EB] hover:underline font-semibold"
            >
              View mint transaction
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
            {assetId && (
              <a
                href={getExplorerAssetUrl(assetId)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 text-[11px] text-emerald-700 hover:underline font-semibold"
              >
                View ASA badge (Asset {assetId})
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            )}
          </div>
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
