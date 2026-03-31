import type { ReportData } from './reportData'

export function buildSummaryText(data: ReportData): string {
  return [
    `AlgoVault Savings Report`,
    `Wallet: ${data.truncatedAddress}`,
    `Total Saved: ${data.totalSaved.toFixed(2)} ALGO`,
    `Streak: ${data.streak} deposits`,
    `Milestone: ${data.milestoneLabel}`,
    `Period: ${data.periodLabel}`,
    `Deposited: ${data.totalDepositedPeriod.toFixed(2)} ALGO`,
    `Network: Algorand ${data.network}`,
    `App ID: ${data.appId}`,
    '',
    'Verified on-chain via Lora Explorer.',
  ].join('\n')
}

export function shareOnWhatsApp(data: ReportData): void {
  const text = [
    `My AlgoVault Savings Report`,
    `${data.totalSaved.toFixed(2)} ALGO saved on Algorand`,
    `${data.streak} deposit streak`,
    `${data.milestoneLabel}`,
    `Verified on-chain: ${data.network}`,
    '',
    '#AlgoVault #Algorand #Web3',
  ].join('\n')

  const encoded = encodeURIComponent(text)
  window.open(`https://wa.me/?text=${encoded}`, '_blank')
}

export async function shareNative(data: ReportData): Promise<void> {
  const text = buildSummaryText(data)
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'AlgoVault Savings Report',
        text,
      })
      return
    } catch {
      // fallback below
    }
  }
  await navigator.clipboard.writeText(text)
}

export function copySummary(data: ReportData): void {
  navigator.clipboard.writeText(buildSummaryText(data))
}
