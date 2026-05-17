import { StatusBadge, type StatusBadgeVariant } from '../ui'
import type { CrisisStatus } from '../../types/crisis'

const STATUS_MAP: Record<CrisisStatus, { variant: StatusBadgeVariant; label: string }> = {
  verified: { variant: 'verified', label: 'Verified' },
  funded: { variant: 'operational', label: 'Funded' },
  under_review: { variant: 'pending', label: 'Under review' },
  pending: { variant: 'pending', label: 'Pending' },
  rejected: { variant: 'critical', label: 'Rejected' },
}

export default function CrisisStatusBadge({ status }: { status: CrisisStatus }) {
  const { variant, label } = STATUS_MAP[status]
  return (
    <StatusBadge variant={variant} dot>
      {label}
    </StatusBadge>
  )
}
