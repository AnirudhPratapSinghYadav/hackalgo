export interface CoachInput {
  totalSaved: number
  streak: number
  milestone: number
  recentDeposits: string
  vaultType?: string
}

export function buildCoachPrompt(data: CoachInput): string {
  return `You are a friendly AI savings coach for AlgoVault, a blockchain savings app on Algorand.

User data:
- Total saved: ${data.totalSaved} ALGO
- Current streak: ${data.streak} days
- Milestone level: ${data.milestone}/3
- Last 3 deposits: ${data.recentDeposits}

Give ONE specific, motivating piece of advice in 2-3 sentences max. Mention their actual numbers. Reference Algorand blockchain benefits (speed, transparency, immutability). Be warm. Max 60 words.`
}

export async function getCoachAdvice(data: CoachInput): Promise<string> {
  try {
    const response = await fetch('/api/coach', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`API ${response.status}`)
    }

    const json = await response.json()
    const text = json?.advice
    if (typeof text === 'string' && text.length > 0) return text
    throw new Error('Empty response')
  } catch {
    return getFallbackAdvice(data)
  }
}

function getFallbackAdvice(data: CoachInput): string {
  const { totalSaved, streak, milestone } = data
  const nextBadge = milestone < 1 ? 10 : milestone < 2 ? 50 : milestone < 3 ? 100 : null
  const remaining = nextBadge ? (nextBadge - totalSaved).toFixed(2) : null

  if (totalSaved === 0) return 'Welcome to AlgoVault! Your savings journey on Algorand starts with just 1 ALGO. Every deposit is recorded immutably on-chain. Start building your wealth today!'
  if (streak > 0 && remaining) return `Amazing \u2014 ${totalSaved.toFixed(2)} ALGO saved with a ${streak}-day streak! You're just ${remaining} ALGO away from your next milestone badge. Keep the momentum going on Algorand!`
  if (remaining) return `You've saved ${totalSaved.toFixed(2)} ALGO on Algorand \u2014 every deposit is permanently recorded on-chain. Only ${remaining} ALGO to your next milestone badge. You're doing great!`
  return `Incredible \u2014 ${totalSaved.toFixed(2)} ALGO saved and all milestones unlocked! You're an Algorand savings master. Your entire journey is verifiable on-chain forever.`
}
