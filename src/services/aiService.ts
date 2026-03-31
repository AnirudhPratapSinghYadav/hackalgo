const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export interface ChatMessage {
  role: 'user' | 'model'
  text: string
}

export interface UserContext {
  totalSaved: number
  streak: number
  milestone: number
  lockEnabled: boolean
  goalAmount: number
  penaltyPct: number
  recentDeposits: string
}

function buildSystemPrompt(ctx: UserContext): string {
  return `You are AlgoVault AI — a friendly, knowledgeable financial advisor for a blockchain savings app built on Algorand.

REAL USER DATA (from Algorand blockchain, not hardcoded):
- Wallet savings: ${ctx.totalSaved.toFixed(2)} ALGO
- Deposit streak: ${ctx.streak} consecutive deposits
- Milestone badge level: ${ctx.milestone}/3 (10 ALGO = Starter, 50 = Builder, 100 = Master)
- Temptation Lock: ${ctx.lockEnabled ? `ACTIVE — goal ${ctx.goalAmount.toFixed(0)} ALGO, ${ctx.penaltyPct}% early withdrawal penalty` : 'Not set'}
- Recent deposits: ${ctx.recentDeposits || 'none yet'}

YOUR PERSONALITY:
- Warm, encouraging, and specific — always reference the user's actual numbers
- You understand Algorand blockchain: ~3.3s finality, <0.001 ALGO fees, ARC-4 ABI, ASA tokens, atomic transactions
- You can explain how the smart contract works (opt-in, grouped deposit, badge minting via inner transactions, penalty enforcement)
- You give actionable savings advice grounded in behavioral economics
- You can answer questions about crypto savings, DeFi basics, and Algorand
- Keep responses concise (2-4 sentences) unless the user asks for detail
- You can respond in Hindi, Telugu, or English — match the user's language

IMPORTANT: Never make up data. Only reference the numbers above. If asked something you don't know, say so honestly.`
}

export async function sendChatMessage(
  history: ChatMessage[],
  newMessage: string,
  ctx: UserContext,
): Promise<string> {
  if (!GEMINI_KEY) {
    return getSmartFallback(newMessage, ctx)
  }

  try {
    const contents = history.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }))
    contents.push({ role: 'user', parts: [{ text: newMessage }] })

    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemPrompt(ctx) }] },
        contents,
        generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
      }),
    })

    if (!res.ok) {
      console.error('Gemini API error:', res.status)
      return getSmartFallback(newMessage, ctx)
    }

    const json = await res.json()
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
    if (typeof text === 'string' && text.length > 0) return text.trim()
    return getSmartFallback(newMessage, ctx)
  } catch (e) {
    console.error('AI chat error:', e)
    return getSmartFallback(newMessage, ctx)
  }
}

function getSmartFallback(message: string, ctx: UserContext): string {
  const msg = message.toLowerCase()
  const { totalSaved, streak, milestone, lockEnabled, goalAmount, penaltyPct } = ctx
  const nextBadge = milestone < 1 ? 10 : milestone < 2 ? 50 : milestone < 3 ? 100 : null
  const remaining = nextBadge ? (nextBadge - totalSaved).toFixed(2) : null

  if (msg.includes('how much') || msg.includes('balance') || msg.includes('saved'))
    return `You currently have ${totalSaved.toFixed(2)} ALGO saved in your vault, recorded immutably on Algorand. ${remaining ? `You need ${remaining} more ALGO to reach your next milestone badge.` : 'All milestones achieved!'}`

  if (msg.includes('badge') || msg.includes('milestone') || msg.includes('nft'))
    return `You're at milestone level ${milestone}/3. ${remaining ? `Deposit ${remaining} more ALGO to mint your next badge NFT — a real ASA token created by the smart contract via inner transaction.` : 'You\'ve earned all 3 badge NFTs! Each is a real Algorand Standard Asset in your wallet.'}`

  if (msg.includes('streak'))
    return `Your deposit streak is ${streak}. Each consecutive deposit increments this counter on-chain. ${streak > 0 ? 'Keep it going — consistency is the key to building wealth!' : 'Make your first deposit to start your streak!'}`

  if (msg.includes('withdraw') || msg.includes('penalty') || msg.includes('lock'))
    return lockEnabled
      ? `Your Temptation Lock is active with a ${goalAmount.toFixed(0)} ALGO goal and ${penaltyPct}% penalty. If you withdraw before reaching the goal, the smart contract automatically deducts ${penaltyPct}% and sends it to your penalty sink address. You can't bypass it — it's enforced in the contract's withdraw method.`
      : 'You don\'t have a Temptation Lock set. Go to the Temptation Lock module to set a savings goal and self-imposed penalty — the contract will enforce it automatically on early withdrawal.'

  if (msg.includes('algorand') || msg.includes('blockchain') || msg.includes('how'))
    return 'AlgoVault runs on Algorand — a pure proof-of-stake blockchain with ~3.3 second finality and fees under 0.001 ALGO. Every deposit, withdrawal, badge mint, and penalty is an on-chain transaction you can verify on Lora Explorer.'

  if (msg.includes('tip') || msg.includes('advice') || msg.includes('suggest'))
    return totalSaved === 0
      ? 'Start with just 1 ALGO! Your first deposit opts you into the savings loop — streak tracking begins, milestone progress starts, and every ALGO is recorded permanently on Algorand.'
      : `Great discipline with ${totalSaved.toFixed(2)} ALGO saved! ${streak > 0 ? `Your ${streak}-deposit streak shows real commitment.` : ''} ${remaining ? `Just ${remaining} ALGO to your next badge — consider setting a Temptation Lock to stay accountable.` : 'All badges earned — you\'re an Algorand savings master.'}`

  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey'))
    return `Hey! I'm your AlgoVault AI advisor. You have ${totalSaved.toFixed(2)} ALGO saved on Algorand. Ask me anything about your savings, badges, or how the smart contract works.`

  return `You have ${totalSaved.toFixed(2)} ALGO saved with a ${streak}-deposit streak, at milestone ${milestone}/3. ${remaining ? `${remaining} ALGO to your next badge.` : 'All milestones achieved!'} Ask me anything about your vault, Algorand, or savings strategy.`
}
