const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
// Use a widely-available model alias; avoid newer aliases that may 404 for some keys.
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

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
  globalDeposited?: number
  globalContributors?: number
  milestones?: { m1Algo: number; m2Algo: number; m3Algo: number }
}

function buildSystemPrompt(ctx: UserContext): string {
  const milestoneLine = ctx.milestones
    ? `- Milestone thresholds (on-chain global state): ${ctx.milestones.m1Algo} / ${ctx.milestones.m2Algo} / ${ctx.milestones.m3Algo} ALGO`
    : '- Milestone thresholds: not available (on-chain global state not loaded)'

  return `You are AlgoVault AI — a friendly, knowledgeable advisor for a blockchain savings and community protection platform built on Algorand.

REAL USER DATA (from Algorand blockchain, not hardcoded):
- Wallet savings: ${ctx.totalSaved.toFixed(2)} ALGO
- Deposit streak: ${ctx.streak} consecutive deposits
- Milestone badge level: ${ctx.milestone}/3
${milestoneLine}
- Temptation Lock: ${ctx.lockEnabled ? `ACTIVE — goal ${ctx.goalAmount.toFixed(0)} ALGO, ${ctx.penaltyPct}% early withdrawal penalty` : 'Not set'}
- Recent deposits: ${ctx.recentDeposits || 'none yet'}
${typeof ctx.globalDeposited === 'number' && typeof ctx.globalContributors === 'number'
  ? `\nGLOBAL CONTEXT (from on-chain global state):\n- Total contributed (all users): ${ctx.globalDeposited.toFixed(2)} ALGO\n- Total contributors: ${ctx.globalContributors}`
  : ''}

PLATFORM CONTEXT:
AlgoVault is not just a savings app — it is a promise-and-protection platform with three real-world use cases:
1. Education Guardian Vault — multiple contributors save for a child's education. Beneficiary receives funds when conditions are met.
2. Community Disaster Reserve — villagers pool savings into a transparent emergency fund for floods, cyclones, or crises.
3. Savings Pact & Protection — partner accountability with self-imposed penalties, temptation locks, and visual goal tracking.
Every deposit is an atomic grouped transaction (payment + app call). Badges are real ASA NFTs minted by the smart contract via inner transactions.

YOUR PERSONALITY:
- Warm, encouraging, and specific — always reference the user's actual numbers
- You understand Algorand blockchain: ~3.3s finality, <0.001 ALGO fees, ARC-4 ABI, ASA tokens, atomic transactions
- You can explain how guardian vaults, disaster reserves, and pacts work
- You give actionable savings advice grounded in behavioral economics
- Keep responses concise (2-4 sentences) unless the user asks for detail
- You can respond in Hindi, Telugu, or English — match the user's language

IMPORTANT: Never make up data. Only reference the numbers above. If asked something you don't know, say so honestly.`
}

export type VaultSummaryType = 'personal' | 'guardian' | 'community' | 'pact'

function buildVaultSummaryRequest(vault: VaultSummaryType): string {
  const vaultLabel =
    vault === 'guardian'
      ? 'Education Guardian Vault'
      : vault === 'community'
        ? 'Community Disaster Reserve'
        : vault === 'pact'
          ? 'Savings Pact & Protection'
          : 'Personal Savings Vault'

  return [
    `Create a concise, product-grade summary for the user about: ${vaultLabel}.`,
    'Format strictly as 6 bullet points, each bullet 1 sentence.',
    'Each bullet must include at least one concrete number from the REAL USER DATA above (or from GLOBAL CONTEXT if present).',
    'Do not speculate about features not proven by those numbers; if something is unknown, say "Not enough on-chain data yet."',
    'Avoid hype. Use financial product language. Mention that transactions are verifiable on Lora where relevant.',
  ].join('\n')
}

export async function generateVaultSummary(vault: VaultSummaryType, ctx: UserContext): Promise<string> {
  return await sendChatMessage([], buildVaultSummaryRequest(vault), ctx)
}

export async function generatePactGuide(
  params: {
    requiredAlgo: number
    cadenceDays: number
    penaltyAlgo: number
    partnerAddress?: string
    pactStatus?: 'pending' | 'active' | 'none'
  },
  ctx: UserContext,
): Promise<string> {
  const { requiredAlgo, cadenceDays, penaltyAlgo, partnerAddress, pactStatus } = params
  const request = [
    'Explain this Savings Pact to the user in a step-by-step, action-oriented way.',
    'Use only the real numbers provided below. Do not invent any values.',
    '',
    `Pact parameters (on-chain or user-entered for the next on-chain transaction):`,
    `- required amount: ${requiredAlgo.toFixed(2)} ALGO`,
    `- cadence: ${Math.round(cadenceDays)} days`,
    `- penalty: ${penaltyAlgo.toFixed(2)} ALGO`,
    `- partner address: ${partnerAddress ? partnerAddress : 'not set'}`,
    `- current pact status: ${pactStatus ?? 'unknown'}`,
    '',
    'Output format:',
    '- 6 bullets max',
    '- Each bullet should be 1 sentence',
    '- Include at least 2 explicit next actions (e.g., "Create pact", "Ask partner to accept", "Make first deposit")',
    '- Mention that enforcement is on-chain and verifiable on Lora',
  ].join('\n')
  return await sendChatMessage([], request, ctx)
}

export async function generateTemptationLockGuide(
  params: {
    goalAlgo: number
    penaltyPct: number
    penaltySink?: string
    lockEnabled?: boolean
  },
  ctx: UserContext,
): Promise<string> {
  const { goalAlgo, penaltyPct, penaltySink, lockEnabled } = params
  const request = [
    'Explain the Temptation Lock on this page using the real values below.',
    'Do not invent any data, rules, or outcomes.',
    '',
    'Lock parameters (from on-chain local state or user inputs for the next on-chain transaction):',
    `- status: ${lockEnabled ? 'ACTIVE' : 'NOT SET'}`,
    `- goal: ${Number.isFinite(goalAlgo) ? goalAlgo.toFixed(2) : 'unknown'} ALGO`,
    `- early-withdraw penalty: ${Number.isFinite(penaltyPct) ? penaltyPct.toFixed(2) : 'unknown'}%`,
    `- penalty destination: ${penaltySink ? penaltySink : 'unknown'}`,
    '',
    'Output format:',
    '- 6 bullets max',
    '- Each bullet should be 1 sentence',
    '- Include 2 explicit next actions (e.g., "Activate lock", "Make a deposit", "Withdraw only after goal")',
    '- Mention that enforcement is on-chain and verifiable on Lora',
    '- Be product-grade and concise (no hype)',
  ].join('\n')
  return await sendChatMessage([], request, ctx)
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

  if (msg === 'how are you' || msg === 'how r u' || msg === 'how are you?' || msg === 'hru' || msg === 'sup') {
    return `Doing great — and your vault is looking solid: ${totalSaved.toFixed(2)} ALGO saved, streak ${streak}, milestone ${milestone}/3. Want me to help you hit the next badge${remaining ? ` (only ${remaining} ALGO away)` : ''}?`
  }

  // Vault summary fallback: deterministic, non-repetitive, uses real numbers only.
  if (msg.includes('create a concise, product-grade summary') && msg.includes('format strictly as 6 bullet points')) {
    const labelMatch = message.match(/about:\s*(.+)\./i)
    const vaultLabel = String(labelMatch?.[1] ?? '').trim()
    const bullets: string[] = []

    const core = [
      `- On-chain personal savings: ${totalSaved.toFixed(2)} ALGO (verifiable on Lora).`,
      `- Deposit consistency: ${streak} deposit streak and milestone ${milestone}/3.`,
    ]
    const global =
      typeof ctx.globalDeposited === 'number' && typeof ctx.globalContributors === 'number'
        ? [`- Network-wide: ${ctx.globalDeposited.toFixed(2)} ALGO across ${ctx.globalContributors} contributors (global state).`]
        : [`- Network-wide totals: Not enough on-chain data yet.`]

    if (/education guardian vault/i.test(vaultLabel)) {
      bullets.push(
        ...core,
        ...global,
        `- Guardian intent: fund a beneficiary with transparent contributions (your current tracked balance is ${totalSaved.toFixed(2)} ALGO).`,
        `- Release control: emergency release can be triggered by the configured Guardian agent (not derived from your wallet stats).`,
        `- Next action: keep depositing toward your next milestone (${remaining ? `${remaining} ALGO away` : 'all milestones achieved'}).`,
      )
      return bullets.slice(0, 6).join('\n')
    }

    if (/community disaster reserve/i.test(vaultLabel)) {
      bullets.push(
        ...core,
        ...global,
        `- Reserve purpose: pooled emergency buffer; your contribution signal today is ${totalSaved.toFixed(2)} ALGO.`,
        `- Verification: releases should be justified by real-world evidence and verified via explorer links.`,
        `- Next action: build buffer cadence (streak ${streak}) and avoid breaking it.`,
      )
      return bullets.slice(0, 6).join('\n')
    }

    if (/savings pact/i.test(vaultLabel)) {
      bullets.push(
        ...core,
        ...global,
        `- Pact enforcement: penalties and transfers are on-chain and not manually editable (milestone ${milestone}/3 reflects your progress).`,
        `- Accountability lever: your streak (${streak}) is the strongest predictor for pact success.`,
        `- Next action: set/confirm pact terms and make the next scheduled deposit.`,
      )
      return bullets.slice(0, 6).join('\n')
    }

    // Personal Savings Vault (default)
    bullets.push(
      ...core,
      ...global,
      lockEnabled
        ? `- Temptation Lock: ACTIVE with goal ${goalAmount.toFixed(2)} ALGO and ${penaltyPct.toFixed(2)}% penalty.`
        : `- Temptation Lock: Not set (you can enable it to protect your ${totalSaved.toFixed(2)} ALGO balance).`,
      `- Next milestone: ${remaining ? `${remaining} ALGO remaining` : 'all milestones achieved'}.`,
    )
    return bullets.slice(0, 6).join('\n')
  }

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

  if (msg.includes('guardian') || msg.includes('education') || msg.includes('beneficiary'))
    return 'The Guardian Vault lets multiple people save together for one beneficiary — like a child\'s education fund. Contributions are tracked on Algorand with full transparency. When the goal is reached, the beneficiary can claim the funds.'

  if (msg.includes('community') || msg.includes('disaster') || msg.includes('reserve') || msg.includes('village') || msg.includes('emergency'))
    return 'The Community Disaster Reserve pools savings from multiple villagers into a transparent emergency fund on Algorand. The reserve health is tracked live — when disaster strikes, the fund is ready for release.'

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
