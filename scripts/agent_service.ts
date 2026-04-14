import 'dotenv/config'

import algosdk from 'algosdk'
import bodyParser from 'body-parser'
import express from 'express'
import TelegramBot from 'node-telegram-bot-api'
import { GoogleGenerativeAI } from '@google/generative-ai'
import twilio from 'twilio'

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
  // Keep deterministic for demo: always TestNet.
  return `https://lora.algokit.io/testnet/transaction/${txId}`
}

function buildGeminiPrompt(userMessage: string): string {
  return [
    'You are the AlgoVault Guardian.',
    'Use Google Search to verify if a disaster/emergency is real and currently happening.',
    'If real, output exactly:',
    '[RELEASE] <one sentence reason>',
    'If not, output exactly:',
    '[DENY] <one sentence reason>',
    '',
    'MESSAGE:',
    userMessage,
  ].join('\n')
}

async function callGeminiDecision(geminiKey: string, userMessage: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(geminiKey)
  // Inject Google Search tool (grounding). Typed support varies by SDK; keep safe.
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

function normalizeWhatsAppFrom(from: string | undefined): string | null {
  const s = String(from ?? '').trim()
  if (!s) return null
  // Twilio sends "whatsapp:+123..."
  return s.startsWith('whatsapp:') ? s : `whatsapp:${s}`
}

function shouldRelease(decisionText: string): boolean {
  return String(decisionText).toUpperCase().startsWith('[RELEASE]')
}

async function main() {
  const PORT = Number(process.env.PORT ?? 3000)

  // Shared env
  const GEMINI_API_KEY = requiredEnv('GEMINI_API_KEY')
  const AGENT_MNEMONIC = requiredEnv('AGENT_MNEMONIC')
  const APP_ID = getEnvNumber('APP_ID')
  const ALGOD_SERVER = process.env.ALGOD_SERVER ?? 'https://testnet-api.algonode.cloud'
  const ALGOD_PORT = Number(process.env.ALGOD_PORT ?? 443)
  const ALGOD_TOKEN = process.env.ALGOD_TOKEN ?? ''

  // Telegram (optional)
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
  const telegramBot =
    TELEGRAM_BOT_TOKEN && TELEGRAM_BOT_TOKEN.trim().length > 0
      ? new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })
      : null

  // Twilio WhatsApp (optional)
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
  const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER // e.g. "whatsapp:+14155238886"
  const twilioClient =
    TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : null

  // Express server for Twilio webhook
  const app = express()
  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(bodyParser.json())

  app.get('/health', (_req, res) => res.status(200).send('ok'))

  app.post('/whatsapp', async (req, res) => {
    // Twilio expects a fast 200; we also send messages async.
    res.status(200).send('ok')

    if (!twilioClient) return
    if (!TWILIO_WHATSAPP_NUMBER) return

    const from = normalizeWhatsAppFrom(req.body?.From)
    const body = String(req.body?.Body ?? '').trim()
    if (!from || !body) return

    try {
      await twilioClient.messages.create({
        from: TWILIO_WHATSAPP_NUMBER,
        to: from,
        body: 'Analyzing… (verifying with live web sources)',
      })

      const decision = await callGeminiDecision(GEMINI_API_KEY, body)
      if (shouldRelease(decision)) {
        const { txId } = await sendAgenticReleaseTx({
          appId: APP_ID,
          agentMnemonic: AGENT_MNEMONIC,
          algodServer: ALGOD_SERVER,
          algodPort: ALGOD_PORT,
          algodToken: ALGOD_TOKEN,
        })
        await twilioClient.messages.create({
          from: TWILIO_WHATSAPP_NUMBER,
          to: from,
          body: `${decision}\n\nTx: ${getLoraTxUrl(txId)}`,
        })
      } else {
        await twilioClient.messages.create({
          from: TWILIO_WHATSAPP_NUMBER,
          to: from,
          body: decision,
        })
      }
    } catch (e: any) {
      try {
        await twilioClient.messages.create({
          from: TWILIO_WHATSAPP_NUMBER,
          to: from,
          body: `Guardian error: ${String(e?.message ?? e)}`,
        })
      } catch {
        // ignore
      }
    }
  })

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[agent_service] listening on http://localhost:${PORT}`)
    // eslint-disable-next-line no-console
    console.log(`[agent_service] whatsapp webhook POST /whatsapp`)
  })

  if (telegramBot) {
    telegramBot.on('message', async (msg) => {
      const chatId = msg.chat.id
      const userText = String(msg.text ?? '').trim()
      if (!userText) return

      try {
        await telegramBot.sendChatAction(chatId, 'typing')
        const decision = await callGeminiDecision(GEMINI_API_KEY, userText)

        if (shouldRelease(decision)) {
          const { txId } = await sendAgenticReleaseTx({
            appId: APP_ID,
            agentMnemonic: AGENT_MNEMONIC,
            algodServer: ALGOD_SERVER,
            algodPort: ALGOD_PORT,
            algodToken: ALGOD_TOKEN,
          })
          await telegramBot.sendMessage(chatId, `${decision}\n\nTx: ${getLoraTxUrl(txId)}`)
        } else {
          await telegramBot.sendMessage(chatId, decision)
        }
      } catch (e: any) {
        await telegramBot.sendMessage(chatId, `Guardian error: ${String(e?.message ?? e)}`)
      }
    })
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e)
  process.exit(1)
})
