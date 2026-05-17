/** Map GDACS alertlevel (Green/Orange/Red) and alertscore to a numeric tier 1–3. */

const COLOR_LEVEL: Record<string, number> = {
  green: 1,
  orange: 2,
  red: 3,
}

export function gdacsAlertTier(props: Record<string, unknown>): number {
  const score = parseInt(String(props.alertscore ?? ''), 10)
  if (Number.isFinite(score) && score >= 1 && score <= 3) return score

  const levelRaw = String(props.alertlevel ?? props.icon ?? '').toLowerCase()
  for (const [color, tier] of Object.entries(COLOR_LEVEL)) {
    if (levelRaw.includes(color)) return tier
  }

  const numeric = parseInt(String(props.alertlevel ?? ''), 10)
  if (Number.isFinite(numeric) && numeric >= 1 && numeric <= 3) return numeric

  return 1
}

export function confidenceFromGdacsTier(tier: number): number {
  const t = Math.min(3, Math.max(1, tier))
  return Math.min(95, 55 + t * 12)
}

export function severityFromGdacsTier(tier: number): 'Critical' | 'High' | 'Medium' | 'Low' {
  if (tier >= 3) return 'Critical'
  if (tier === 2) return 'High'
  if (tier === 1) return 'Medium'
  return 'Low'
}
