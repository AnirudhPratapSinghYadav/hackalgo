import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import PublicHeader from '../components/layout/PublicHeader'
import ComplianceBanner from '../components/ComplianceBanner'
import { OpsPanel, Button } from '../components/ui'
import { ROUTES } from '../config/routes'
import { useCommunityStore } from '../store/communityStore'
import {
  withdrawAppeal,
  isAppealsHubConfigured,
  getExplorerTransactionUrl,
} from '../services/communityDonation'

export default function AppealWithdraw() {
  const { id } = useParams<{ id: string }>()
  const crisis = useCommunityStore((s) => s.crises.find((c) => c.id === id))
  const { activeAddress, signTransactions } = useWallet()
  const [txId, setTxId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!crisis) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <PublicHeader />
        <p className="p-10 text-text-secondary">Appeal not found.</p>
      </div>
    )
  }

  const appealId = crisis.onChainAppealId
  const canWithdraw =
    isAppealsHubConfigured() &&
    appealId != null &&
    crisis.chainStatus === 'active' &&
    activeAddress === crisis.beneficiaryWallet

  const handleWithdraw = async () => {
    if (!activeAddress || !signTransactions || appealId == null) return
    setBusy(true)
    setErr(null)
    try {
      const tx = await withdrawAppeal(activeAddress, signTransactions, appealId)
      setTxId(tx)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Withdraw failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <PublicHeader subtitle="Beneficiary withdraw" />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 pb-16 space-y-6">
        <ComplianceBanner />
        <Link to={ROUTES.communityDetail(crisis.id)} className="text-sm text-accent-primary font-mono">
          ← {crisis.title}
        </Link>
        <h1 className="font-serif text-2xl text-text-primary">Withdraw raised ALGO</h1>
        <OpsPanel title="Appeal status">
          <p className="font-mono text-xs text-text-tertiary">On-chain appeal #{appealId ?? '—'}</p>
          <p className="font-mono text-xs text-text-tertiary mt-2 break-all">Beneficiary: {crisis.beneficiaryWallet}</p>
          {!isAppealsHubConfigured() ? (
            <p className="mt-4 text-sm text-alert-critical">VITE_APPEALS_APP_ID not configured.</p>
          ) : !activeAddress ? (
            <p className="mt-4 text-sm text-text-secondary">Connect the beneficiary wallet to withdraw.</p>
          ) : activeAddress !== crisis.beneficiaryWallet ? (
            <p className="mt-4 text-sm text-alert-critical">Connected wallet is not the registered beneficiary.</p>
          ) : crisis.chainStatus !== 'active' ? (
            <p className="mt-4 text-sm text-text-secondary">Appeal must be admin-approved (active) before withdraw.</p>
          ) : null}
        </OpsPanel>
        {txId ? (
          <p className="text-sm text-alert-success font-mono">
            Confirmed:{' '}
            <a href={getExplorerTransactionUrl(txId)} target="_blank" rel="noopener noreferrer" className="underline">
              {txId.slice(0, 20)}…
            </a>
          </p>
        ) : (
          <Button variant="primary" fullWidth disabled={!canWithdraw || busy} onClick={() => void handleWithdraw()}>
            {busy ? 'Signing…' : 'Withdraw to beneficiary wallet'}
          </Button>
        )}
        {err ? <p className="text-xs text-alert-critical font-mono">{err}</p> : null}
      </div>
    </div>
  )
}
