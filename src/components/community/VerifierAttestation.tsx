import type { CrisisVerifier } from '../../types/crisis'
import { StatusBadge } from '../ui'

interface VerifierAttestationProps {
  verifier: CrisisVerifier
}

export default function VerifierAttestation({ verifier }: VerifierAttestationProps) {
  return (
    <li className="p-5 bg-bg-surface border border-border-subtle border-l-[3px] border-l-accent-primary">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-text-primary">{verifier.name}</p>
          <p className="font-mono text-[10px] text-text-tertiary mt-1">{verifier.address}</p>
        </div>
        <StatusBadge variant="verified" dot>
          Staked
        </StatusBadge>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs">
        <div>
          <dt className="text-text-tertiary uppercase tracking-wide text-[10px]">Stake</dt>
          <dd className="text-text-primary mt-0.5">{verifier.stake} USDC</dd>
        </div>
        <div>
          <dt className="text-text-tertiary uppercase tracking-wide text-[10px]">Verified</dt>
          <dd className="text-text-primary mt-0.5">{new Date(verifier.verifiedAt).toLocaleString()}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-text-tertiary uppercase tracking-wide text-[10px]">Proof hash</dt>
          <dd className="text-text-secondary mt-0.5 break-all">{verifier.proof}</dd>
        </div>
      </dl>
    </li>
  )
}
