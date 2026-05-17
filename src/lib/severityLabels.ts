/** Plain-English severity labels for ops UI (no raw GDACS tokens). */

export function severityDisplayLabel(severity: string): string {
  const s = severity.trim().toLowerCase()
  if (s === 'critical' || s === 'red') return 'Critical — Immediate Action'
  if (s === 'high') return 'High Risk — Action Required'
  if (s === 'medium') return 'Moderate Risk'
  if (s === 'low') return 'Low Risk'
  if (s === 'green') return 'Monitoring'
  if (s === 'orange') return 'Elevated Risk'
  return severity
}

export function severityRiskSentence(severity: string): string {
  const s = severity.trim().toLowerCase()
  if (s === 'critical' || s === 'red') return 'Severe impact — immediate relief coordination recommended.'
  if (s === 'high' || s === 'orange') return 'High risk — pre-position relief funds and monitor closely.'
  if (s === 'medium') return 'Moderate risk — monitoring recommended; prepare contingency plans.'
  if (s === 'green' || s === 'low') return 'Situation is being monitored; escalation possible.'
  return 'Severity under review — confirm with field teams.'
}

export function campaignStatusLabel(code: number): string {
  if (code === 1) return 'Awaiting Approvals'
  if (code === 2) return 'Approved — Ready to Disburse'
  if (code === 3) return 'Funds Disbursed'
  if (code === 4) return 'Expired'
  return 'Unknown'
}

export function approvalProgressLabel(count: number, threshold: number): string {
  if (threshold <= 0) return 'Awaiting approver signatures'
  if (count >= threshold) return `${threshold} of ${threshold} — ready to disburse`
  return `${count} of ${threshold} approvals received`
}
