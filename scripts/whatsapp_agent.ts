import 'dotenv/config'

import algosdk from 'algosdk'
import bodyParser from 'body-parser'
import express from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai'
import twilio from 'twilio'

/**
 * AlgoVault — Agentic AI WhatsApp Bot (Twilio webhook) (Phase 3)
 *
 * Architecture:
 * - Twilio → POST /whatsapp (incoming WhatsApp message webhook)
 * - Gemini classifies: [RELEASE] or [DENY]
 * - If [RELEASE], sign+send ARC-4 app call to `agentic_release()` on TestNet using AGENT_MNEMONIC
 * - Reply back to WhatsApp with the decision + TxID link (Lora)
 *
 * UX feedback:
 * - Immediately sends "Analyzing…" as a WhatsApp message
 * - Then sends final decision / tx link
 */

function requiredEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing ${name} in environment`)
  return v
}

function getEnvNumber(name: string, fallback?: number): number {
  const v = process.env[name]
  if (!v) {
    if (typeof fallback === 'number') return fallback
    throw new Error(`Missing ${name} in environment`)
  }
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid ${name}: ${v}`)
  return n
}

function getLoraTxUrl(txId: string): string {
  return `https://lora.algokit.io/testnet/transaction/${txId}`
}

function buildGeminiPrompt(userMessage: string): string {
  return [
    'SYSTEM CONSTRAINT (STRICT):',
    "You are AlgoVault's Guardian AI. You have live internet access.",
    'Always search the web to verify if a reported disaster or weather event is currently happening in reality before deciding to output [RELEASE] or [DENY].',
    'If you cannot verify with a credible source, output [DENY].',
    'If it represents a valid disaster emergency (e.g., severe floods), output exactly:',
    '[RELEASE] <one sentence justification>',
    'If not, output exactly:',
    '[DENY] <one sentence reason>',
    '',
    'MESSAGE:',
    userMessage,
  ].join('\n')
}

async function callGeminiDecision(geminiKey: string, userMessage: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(geminiKey)
  // Inject Google Search tool (grounding) for live verification.
  // NOTE: Typed support may vary by SDK version; keep this additive and safe.
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', tools: [{ googleSearch: {} }] } as any)
  const res = await model.generateContent(buildGeminiPrompt(userMessage))
  return String(res.response.text() ?? '').trim()
}

async function sendAgenticReleaseTx(params: {
  appId: number
  agentMnemonic: string
  algodServer: string
  algodPort: number
  algodToken: string
}): Promise<{ txId: string }> {
  const { appId, agentMnemonic, algodServer, algodPort, algodToken } = params

  const agent = algosdk.mnemonicToSecretKey(agentMnemonic)
  const algod = new algosdk.Algodv2(algodToken, algodServer, algodPort)

  const sp = await algod.getTransactionParams().do()
  sp.flatFee = true
  sp.fee = 4000

  const selector = new algosdk.ABIMethod({
    name: 'agentic_release',
    args: [],
    returns: { type: 'void' },
  }).getSelector()

  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    from: agent.addr,
    appIndex: appId,
    appArgs: [selector],
    suggestedParams: sp,
  })

  const signed = txn.signTxn(agent.sk)
  const { txId } = await algod.sendRawTransaction(signed).do()
  await algosdk.waitForConfirmation(algod, txId, 4)
  return { txId }
}

async function main() {
  const PORT = Number(process.env.PORT ?? 3000)

  const TWILIO_ACCOUNT_SID = requiredEnv('TWILIO_ACCOUNT_SID')
  const TWILIO_AUTH_TOKEN = requiredEnv('TWILIO_AUTH_TOKEN')
  const TWILIO_WHATSAPP_NUMBER = requiredEnv('TWILIO_WHATSAPP_NUMBER') // e.g. "whatsapp:+14155238886"

  const GEMINI_API_KEY = requiredEnv('GEMINI_API_KEY')
  const AGENT_MNEMONIC = requiredEnv('AGENT_MNEMONIC')
  const APP_ID = getEnvNumber('APP_ID')

  const ALGOD_SERVER = process.env.ALGOD_SERVER ?? 'https://testnet-api.algonode.cloud'
  const ALGOD_PORT = Number(process.env.ALGOD_PORT ?? 443)
  const ALGOD_TOKEN = process.env.ALGOD_TOKEN ?? ''

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

  const app = express()
  // Twilio sends x-www-form-urlencoded by default
  app.use(bodyParser.urlencoded({ extended: false }))

  app.get('/health', (_req, res) => res.status(200).send('ok'))

  app.post('/whatsapp', async (req, res) => {
    // Respond fast to Twilio to avoid retries/timeouts
    res.status(200).type('text/plain').send('ok')

    const from = String(req.body?.From ?? '') // e.g. "whatsapp:+91..."
    const body = String(req.body?.Body ?? '').trim()
    if (!from || !body) return

    // UX: quick status ping
    try {
      await client.messages.create({
        from: TWILIO_WHATSAPP_NUMBER,
        to: from,
        body: 'Analyzing…',
      })
    } catch {
      // ignore status ping failure
    }

    let decision = ''
    try {
      decision = await callGeminiDecision(GEMINI_API_KEY, body)
    } catch (e: any) {
      const err = String(e?.message ?? e)
      await client.messages.create({
        from: TWILIO_WHATSAPP_NUMBER,
        to: from,
        body: `Gemini error: ${err}`,
      })
      return
    }

    const normalized = decision.replace(/\r/g, '').trim()
    const tag = normalized.startsWith('[RELEASE]') ? '[RELEASE]' : normalized.startsWith('[DENY]') ? '[DENY]' : 'UNKNOWN'

    if (tag === '[DENY]') {
      await client.messages.create({
        from: TWILIO_WHATSAPP_NUMBER,
        to: from,
        body: normalized,
      })
      return
    }

    if (tag !== '[RELEASE]') {
      await client.messages.create({
        from: TWILIO_WHATSAPP_NUMBER,
        to: from,
        body: `Unexpected Gemini output. Expected [RELEASE] or [DENY]. Raw:\n${normalized}`,
      })
      return
    }

    // Autonomous on-chain execution
    try {
      await client.messages.create({
        from: TWILIO_WHATSAPP_NUMBER,
        to: from,
        body: 'Emergency verified. Executing on-chain release…',
      })

      const { txId } = await sendAgenticReleaseTx({
        appId: APP_ID,
        agentMnemonic: AGENT_MNEMONIC,
        algodServer: ALGOD_SERVER,
        algodPort: Number.isFinite(ALGOD_PORT) ? ALGOD_PORT : 443,
        algodToken: ALGOD_TOKEN,
      })

      await client.messages.create({
        from: TWILIO_WHATSAPP_NUMBER,
        to: from,
        body: `✅ Emergency verified. Funds released.\nTxID: ${txId}\nLora: ${getLoraTxUrl(txId)}`,
      })
    } catch (e: any) {
      const err = String(e?.message ?? e)
      await client.messages.create({
        from: TWILIO_WHATSAPP_NUMBER,
        to: from,
        body: `Release failed: ${err}`,
      })
    }
  })

  app.listen(PORT, () => {
    console.log('[whatsapp-agent] listening on', PORT)
    console.log('[whatsapp-agent] APP_ID:', APP_ID)
    console.log('[whatsapp-agent] Algod:', ALGOD_SERVER, ALGOD_PORT)
    console.log('[whatsapp-agent] webhook route: POST /whatsapp')
  })
}

main().catch((e) => {
  console.error('[whatsapp-agent] fatal:', e)
  process.exit(1)
})

