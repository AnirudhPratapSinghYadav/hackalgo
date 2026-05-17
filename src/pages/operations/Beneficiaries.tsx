import OpsLayout from '../../components/ops/OpsLayout'
import ComplianceBanner from '../../components/ComplianceBanner'
import { MetricCard } from '../../components/ui'
import BeneficiaryImport from './BeneficiaryImport'
import { usePlatformStore } from '../../store/platformStore'

export default function Beneficiaries() {
  const pending = usePlatformStore((s) => s.pendingBeneficiaryPayouts)

  return (
    <OpsLayout title="Beneficiaries" description="CSV import for bulk USDC disbursement via DisasterVault.">
      <ComplianceBanner />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Loaded payouts" value={String(pending.length)} variant="accent" />
        <MetricCard
          label="Total USDC (import)"
          value={(pending.reduce((s, r) => s + r.amountMicroUsdc, 0) / 1_000_000).toFixed(2)}
        />
      </div>
      <BeneficiaryImport />
    </OpsLayout>
  )
}
