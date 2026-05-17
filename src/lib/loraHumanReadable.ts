/** Plain-language labels for Lora / contract state — for NGO operators, not developers. */

export const GLOBAL_STATE_LABELS: Record<string, string> = {
  admin: 'Platform administrator wallet',
  campaign_count: 'Number of relief campaigns created',
  usdc_asset: 'USDC token used for payouts',
}

export const CAMPAIGN_FIELD_LABELS: Record<string, string> = {
  target: 'Fundraising target (USDC)',
  raised: 'Raised so far (USDC)',
  approval_count: 'Approver signatures collected',
  threshold: 'Signatures required before release',
  status: 'Campaign status',
  region: 'Region code',
  expiry_round: 'Campaign expiry (block round)',
}

export function campaignStatusExplanation(code: number): string {
  switch (code) {
    case 1:
      return 'Awaiting approver signatures — funds are not released yet.'
    case 2:
      return 'Ready to pay — enough approvers have signed; you may disburse to beneficiaries.'
    case 3:
      return 'Paid out — USDC was sent to beneficiaries on-chain.'
    case 4:
      return 'Closed — campaign expired or was closed without full payout.'
    default:
      return `Unknown status (${code}).`
  }
}

export function campaignStatusShort(code: number): string {
  switch (code) {
    case 1:
      return 'Awaiting approval'
    case 2:
      return 'Ready to pay'
    case 3:
      return 'Disbursed'
    case 4:
      return 'Closed'
    default:
      return 'Unknown'
  }
}

export function explainGlobalState(raw: Record<string, unknown>): string[] {
  const lines: string[] = []
  for (const [key, value] of Object.entries(raw)) {
    const label = GLOBAL_STATE_LABELS[key] ?? key.replace(/_/g, ' ')
    if (key === 'admin' && (value === 0 || value === '0')) {
      lines.push(`${label}: not set — run bootstrap from deployment scripts.`)
      continue
    }
    lines.push(`${label}: ${formatValue(value)}`)
  }
  return lines
}

export function explainCampaignState(state: {
  target?: number
  raised?: number
  approvalCount?: number
  threshold?: number
  status?: number
}): string[] {
  const lines: string[] = []
  if (state.target != null) {
    lines.push(`${CAMPAIGN_FIELD_LABELS.target}: ${(state.target / 1_000_000).toFixed(2)}`)
  }
  if (state.raised != null) {
    lines.push(`${CAMPAIGN_FIELD_LABELS.raised}: ${(state.raised / 1_000_000).toFixed(2)}`)
  }
  if (state.approvalCount != null && state.threshold != null) {
    lines.push(
      `${CAMPAIGN_FIELD_LABELS.approval_count}: ${state.approvalCount} of ${state.threshold} required signatures.`,
    )
  }
  if (state.status != null) {
    lines.push(campaignStatusExplanation(state.status))
  }
  return lines
}

export function txnHumanSentence(action: string, entityId?: string, amount?: number): string {
  const amt = amount != null ? ` (${amount.toLocaleString()} ALGO/USDC units)` : ''
  const who = entityId ? ` for ${entityId}` : ''
  switch (action.toLowerCase()) {
    case 'create_campaign':
      return `A new relief campaign was created on the humanitarian contract${who}.`
    case 'submit_approval':
      return `An authorized approver signed to release funds${who}.`
    case 'disburse':
      return `USDC was sent to beneficiaries${who}${amt}.`
    case 'donate':
      return `A donor contributed to a community appeal${who}${amt}.`
    case 'admin_approve':
      return `An operator approved a community appeal${who}.`
    default:
      return `${action.replace(/_/g, ' ')}${who}${amt}.`
  }
}

function formatValue(value: unknown): string {
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'number' && value > 1_000_000) return `${(value / 1_000_000).toFixed(2)} (micro-units: ${value})`
  return String(value)
}
