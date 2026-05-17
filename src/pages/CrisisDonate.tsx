import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import PublicHeader from '../components/layout/PublicHeader'
import ComplianceBanner from '../components/ComplianceBanner'
import { FundingProgress } from '../components/community'
import { OpsPanel, Button, TerminalLog } from '../components/ui'
import type { TerminalLogEntry } from '../components/ui/TerminalLog'
import { ROUTES } from '../config/routes'
import { useCommunityStore } from '../store/communityStore'
import { usePlatformStore } from '../store/platformStore'
import { truncateAddress } from '../lib/format'
import {
  donateToAppeal,
  isAppealsHubConfigured,
  getExplorerTransactionUrl,
} from '../services/communityDonation'

export default function CrisisDonate() {
  const { id } = useParams<{ id: string }>()
  const crisis = useCommunityStore((s) => s.crises.find((c) => c.id === id))
  const recordFromChain = usePlatformStore((s) => s.recordDonationFromChain)
  const { activeAddress, signTransactions } = useWallet()
  const [amount, setAmount] = useState('1')
  const [txnId, setTxnId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!crisis) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <PublicHeader />
        <p className="p-10 text-text-secondary font-mono text-sm">Crisis not found.</p>
      </div>
    )
  }

  const canDonate =
    isAppealsHubConfigured() &&
    crisis.chainStatus === 'active' &&
    crisis.onChainAppealId != null &&
    activeAddress &&
    signTransactions

  const remaining = Math.max(crisis.requiredAmount - crisis.raisedAmount, 0)

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canDonate || crisis.onChainAppealId == null) return
    const algo = Math.min(Number(amount), remaining)
    if (algo <= 0) return
    setBusy(true)
    setErr(null)
    try {
      const micro = Math.round(algo * 1_000_000)
      const tx = await donateToAppeal(activeAddress!, signTransactions!, crisis.onChainAppealId, micro)
      setTxnId(tx)
      recordFromChain(crisis.id, micro, tx, activeAddress!, crisis.onChainAppealId)
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Donation failed')
    } finally {
      setBusy(false)
    }
  }

  const successLog: TerminalLogEntry[] = txnId
    ? [
        {
          id: txnId,
          timestamp: new Date().toISOString().slice(11, 19) + ' UTC',
          level: 'success',
          message: `Donation ${amount} ALGO confirmed on-chain`,
          meta: truncateAddress(crisis.beneficiaryWallet),
        },
      ]
    : []

  return (
    <div className="min-h-screen bg-bg-primary">
      <PublicHeader subtitle="Direct release" />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-10 pb-16 space-y-6">
        <ComplianceBanner />
        <Link to={ROUTES.communityDetail(crisis.id)} className="text-sm text-accent-primary font-mono">
          ← {crisis.title}
        </Link>
        <h1 className="font-serif text-2xl sm:text-3xl text-text-primary">Donate ALGO</h1>
        <p className="text-sm text-text-secondary leading-relaxed">
          Admin-listed appeal — not medical or legal endorsement. Donations require on-chain active status.
        </p>

        <OpsPanel title="Appeal status">
          <FundingProgress raised={crisis.raisedAmount} required={crisis.requiredAmount} />
          <p className="mt-4 font-mono text-[10px] text-text-tertiary break-all">
            Beneficiary: {crisis.beneficiaryWallet}
          </p>
          <p className="mt-2 font-mono text-[10px] text-text-tertiary">
            On-chain: {crisis.chainStatus ?? 'none'} · appeal #{crisis.onChainAppealId ?? '—'}
          </p>
          {crisis.chainStatus !== 'active' ? (
            <p className="mt-3 text-xs text-alert-critical">Donations blocked until ops admin-approves on-chain.</p>
          ) : null}
        </OpsPanel>

        {txnId ? (
          <div>
            <TerminalLog entries={successLog} title="On-chain confirmation" />
            <a
              href={getExplorerTransactionUrl(txnId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent-primary mt-4 inline-block"
            >
              View on explorer →
            </a>
            <Link
              to={ROUTES.communityDetail(crisis.id)}
              className="inline-block mt-6 text-sm text-accent-primary hover:text-accent-hover"
            >
              Return to crisis dossier →
            </Link>
          </div>
        ) : (
          <form onSubmit={(e) => void handleDonate(e)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Amount (ALGO)</label>
              <input
                type="number"
                min={0.001}
                step="0.001"
                max={remaining}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 bg-bg-elevated border border-border-medium font-mono text-text-primary focus:border-accent-primary focus:outline-none min-h-[44px]"
                disabled={!canDonate || remaining <= 0}
              />
            </div>
            {!activeAddress ? (
              <p className="text-xs text-text-tertiary">Connect Pera or Defly wallet to donate.</p>
            ) : null}
            {err ? <p className="text-xs text-alert-critical font-mono">{err}</p> : null}
            <Button type="submit" variant="primary" fullWidth disabled={!canDonate || remaining <= 0 || busy}>
              {busy ? 'Signing…' : 'Confirm on-chain donation'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
