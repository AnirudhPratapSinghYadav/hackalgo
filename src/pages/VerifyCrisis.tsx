import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Shield, Upload } from 'lucide-react'
import PublicHeader from '../components/layout/PublicHeader'
import { OpsPanel, ConfidenceBar, Button, StatusBadge } from '../components/ui'
import { ROUTES } from '../config/routes'
import { useCommunityStore } from '../store/communityStore'

export default function VerifyCrisis() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const crisis = useCommunityStore((s) => s.crises.find((c) => c.id === id))
  const submitVerification = useCommunityStore((s) => s.submitVerification)
  const [stake, setStake] = useState('500')
  const [officerName, setOfficerName] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (!crisis) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <PublicHeader />
        <p className="p-10 text-text-secondary font-mono text-sm">Crisis not found.</p>
      </div>
    )
  }

  const handleStake = (e: React.FormEvent) => {
    e.preventDefault()
    submitVerification(crisis.id, {
      address: 'VER...FIELD',
      name: officerName || 'Field verifier',
      stake: Number(stake),
      proof: `Qm${Date.now().toString(36)}...geo`,
    })
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <PublicHeader subtitle="VerifyChain field verification" />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 pb-16">
        <Link to={ROUTES.communityDetail(crisis.id)} className="text-sm text-accent-primary font-mono">
          ← {crisis.id}
        </Link>
        <h1 className="font-serif text-3xl text-text-primary mt-6">Stake field verification</h1>
        <p className="mt-3 text-text-secondary text-sm leading-relaxed">
          Field verifiers stake USDC to attest on-ground evidence. False verification may result in stake slashing
          and removal from the VerifyChain network.
        </p>

        <OpsPanel title="Crisis summary" className="mt-8">
          <p className="text-text-primary font-medium">{crisis.title}</p>
          <div className="mt-4 flex items-center gap-2">
            <Shield size={16} className="text-accent-primary" />
            <span className="font-mono text-xs text-text-tertiary">Guardian AI</span>
            <ConfidenceBar value={crisis.guardianAIScore ?? 0} className="flex-1" />
          </div>
        </OpsPanel>

        {submitted ? (
          <div className="mt-8 p-6 bg-alert-success/15 border border-alert-success/40">
            <StatusBadge variant="verified" dot>
              Attestation recorded
            </StatusBadge>
            <p className="text-sm text-text-secondary mt-4">
              Demonstration mode: verification added to crisis dossier. Production deploys on-chain stake and
              geotagged proof to IPFS.
            </p>
            <Button variant="primary" className="mt-6" onClick={() => navigate(ROUTES.communityDetail(crisis.id))}>
              View updated dossier
            </Button>
          </div>
        ) : (
          <form onSubmit={handleStake} className="mt-8 space-y-6">
            <OpsPanel title="Verifier credentials">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Officer / NGO name</label>
                  <input
                    type="text"
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    className="w-full px-4 py-3 bg-bg-elevated border border-border-medium text-text-primary focus:border-accent-primary focus:outline-none min-h-[44px]"
                    placeholder="NDMA Field Officer — Assam"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Stake amount (USDC)</label>
                  <input
                    type="number"
                    min={100}
                    value={stake}
                    onChange={(e) => setStake(e.target.value)}
                    className="w-full px-4 py-3 bg-bg-elevated border border-border-medium font-mono text-text-primary focus:border-accent-primary focus:outline-none min-h-[44px]"
                    required
                  />
                  <p className="mt-2 text-xs text-text-tertiary font-mono">Minimum stake: 100 USDC</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Geotagged field proof</label>
                  <div className="border border-dashed border-border-medium p-6 text-center">
                    <Upload size={24} strokeWidth={1.5} className="mx-auto text-text-tertiary mb-2" />
                    <input type="file" accept="image/*" className="w-full text-sm text-text-secondary" />
                  </div>
                </div>
              </div>
            </OpsPanel>
            <Button type="submit" variant="primary" fullWidth>
              Submit verification with stake
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
