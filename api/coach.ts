type CoachPayload = {
  totalSaved: number
  streak: number
  milestone: number
  recentDeposits: string
  vaultType: string
}

function buildPrompt(data: CoachPayload): string {
  let base = `You are a friendly financial coach for an Algorand blockchain savings app called AlgoVault.

User data:
- Total saved: ${data.totalSaved} ALGO
- Current streak: ${data.streak} days
- Milestone level: ${data.milestone}/3
- Last 3 deposits: ${data.recentDeposits}
- Vault type: ${data.vaultType}

Give 2-3 sentences of personalized encouraging advice based on THEIR SPECIFIC DATA.
Mention their actual numbers. Reference Algorand blockchain.
Be warm and motivating. Max 60 words.`

  if (data.vaultType === 'emergency') {
    base += `\n\nThis is an Emergency/Disaster Fund. Give advice about emergency preparedness and why blockchain savings are reliable during crises like floods or infrastructure failures.`
  } else if (data.vaultType === 'harvest') {
    base += `\n\nThis is a Harvest Vault for seasonal earners. Give advice about managing seasonal income and building savings between harvest seasons.`
  } else if (data.vaultType === 'remittance') {
    base += `\n\nThis is a Remittance Vault for cross-border transfers. Give advice about building reserves for efficient international transfers on Algorand's fast, low-cost network.`
  }

  return base
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    res.status(503).json({ error: 'Missing GEMINI_API_KEY' })
    return
  }

  try {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as CoachPayload
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        generationConfig: {
          maxOutputTokens: 180,
          temperature: 0.7,
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: buildPrompt(body) }],
          },
        ],
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      res.status(502).json({ error: `Gemini error: ${response.status}`, detail: text.slice(0, 300) })
      return
    }

    const json: any = await response.json()
    const advice = json?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!advice || typeof advice !== 'string') {
      res.status(502).json({ error: 'Invalid AI response' })
      return
    }

    res.status(200).json({ advice })
  } catch (error: any) {
    res.status(500).json({ error: 'Coach generation failed', detail: String(error?.message || error) })
  }
}
