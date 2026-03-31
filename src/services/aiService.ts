const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY ?? ''

interface CoachInput {
  totalSaved: number
  streak: number
  milestone: number
  recentDeposits: string
  vaultType: string
}

function buildPrompt(data: CoachInput): string {
  let base = `You are a friendly financial coach for an Algorand blockchain savings app called AlgoVault.

User data:
- Total saved: ${data.totalSaved} ALGO
- Current streak: ${data.streak} days
- Milestone level: ${data.milestone}/3
- Last 3 deposits: ${data.recentDeposits}
- Vault type: ${data.vaultType}

Give 2-3 sentences of personalized encouraging advice based on THEIR SPECIFIC DATA. Mention their actual numbers. Reference Algorand blockchain. Be warm and motivating. Max 60 words.`

  if (data.vaultType === 'emergency') {
    base += `\n\nThis is an Emergency/Disaster Fund. Give advice about emergency preparedness and why blockchain savings are reliable during crises like floods or infrastructure failures.`
  } else if (data.vaultType === 'harvest') {
    base += `\n\nThis is a Harvest Vault for seasonal earners. Give advice about managing seasonal income and building savings between harvest seasons.`
  } else if (data.vaultType === 'remittance') {
    base += `\n\nThis is a Remittance Vault for cross-border transfers. Give advice about building reserves for efficient international transfers on Algorand's fast, low-cost network.`
  }

  return base
}

export async function getCoachAdvice(data: CoachInput): Promise<string> {
  if (!API_KEY || API_KEY === 'your_key_here') {
    return getFallbackAdvice(data)
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [{ role: 'user', content: buildPrompt(data) }],
      }),
    })

    if (!response.ok) {
      throw new Error(`API ${response.status}`)
    }

    const json = await response.json()
    const text = json?.content?.[0]?.text
    if (typeof text === 'string' && text.length > 0) return text
    throw new Error('Empty response')
  } catch {
    return getFallbackAdvice(data)
  }
}

function getFallbackAdvice(data: CoachInput): string {
  const { totalSaved, streak, milestone, vaultType } = data
  const nextBadge = milestone < 1 ? 10 : milestone < 2 ? 50 : milestone < 3 ? 100 : null
  const remaining = nextBadge ? (nextBadge - totalSaved).toFixed(2) : null

  if (vaultType === 'emergency') {
    if (totalSaved === 0) return 'Start your emergency fund today! Even 1 ALGO on Algorand gives you a disaster-ready reserve that no bank outage can touch. Your future self will thank you.'
    return `Your emergency fund holds ${totalSaved.toFixed(2)} ALGO \u2014 securely on Algorand, accessible anytime, anywhere. ${remaining ? `Just ${remaining} ALGO to your next badge!` : 'All milestones complete!'} Keep building your safety net.`
  }

  if (vaultType === 'harvest') {
    if (totalSaved === 0) return 'Smart move choosing a Harvest Vault! Deposit your seasonal earnings now so they grow securely on Algorand between harvest cycles.'
    return `You've saved ${totalSaved.toFixed(2)} ALGO across harvest seasons \u2014 locked safely on Algorand. ${streak > 0 ? `${streak}-day streak shows great discipline!` : 'Start a deposit streak for bonus consistency.'} ${remaining ? `${remaining} ALGO to next milestone.` : ''}`
  }

  if (vaultType === 'remittance') {
    if (totalSaved === 0) return 'Your Remittance Vault is ready! Algorand\'s ~3-second finality makes cross-border transfers fast and cheap. Deposit ALGO to start building your reserve.'
    return `${totalSaved.toFixed(2)} ALGO in your remittance reserve \u2014 ready for instant cross-border transfers on Algorand. ${remaining ? `${remaining} ALGO to your next badge!` : 'All milestones unlocked!'}`
  }

  if (totalSaved === 0) return 'Welcome to AlgoVault! Your savings journey on Algorand starts with just 1 ALGO. Every deposit is recorded immutably on-chain. Start building your wealth today!'
  if (streak > 0 && remaining) return `Amazing \u2014 ${totalSaved.toFixed(2)} ALGO saved with a ${streak}-day streak! You're just ${remaining} ALGO away from your next milestone badge. Keep the momentum going on Algorand!`
  if (remaining) return `You've saved ${totalSaved.toFixed(2)} ALGO on Algorand \u2014 every deposit is permanently recorded on-chain. Only ${remaining} ALGO to your next milestone badge. You're doing great!`
  return `Incredible \u2014 ${totalSaved.toFixed(2)} ALGO saved and all milestones unlocked! You're an Algorand savings master. Your entire journey is verifiable on-chain forever.`
}
