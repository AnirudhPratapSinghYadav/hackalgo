type CoachPayload = {
  totalSaved: number
  streak: number
  milestone: number
  recentDeposits: string
  vaultType?: string
}

function buildPrompt(data: CoachPayload): string {
  return `You are a friendly AI savings coach for AlgoVault, a blockchain savings app on Algorand.

User data:
- Total saved: ${data.totalSaved} ALGO
- Current streak: ${data.streak} days
- Milestone level: ${data.milestone}/3
- Last 3 deposits: ${data.recentDeposits}

Give ONE specific, motivating piece of advice in 2-3 sentences max. Mention their actual numbers. Reference Algorand blockchain benefits (speed, transparency, immutability). Be warm. Max 60 words.`
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
