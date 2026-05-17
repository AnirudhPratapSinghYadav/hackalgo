/**
 * AlgoVault Guardian — Telegram operational alerting + interactive commands.
 * Run: npm run bot  OR  npm run dev:stack
 */
process.env.NTBA_FIX_319 = '1'

import express from 'express'
import TelegramBot from 'node-telegram-bot-api'
import { config } from './config.js'
import { registerTelegramHandlers } from './telegramHandlers.js'
import { setNotifier } from './services/notificationService.js'
import { startOpsAlertEngine, runOpsAlertStartupPing } from './services/opsAlertEngine.js'
import { opsChannelConfigured } from './services/telegramOpsChannel.js'
import { setTelegramBot } from './services/telegramRichSend.js'
import type { BotChannel } from './stores/subscriptionStore.js'

async function main() {
  console.log('=== AlgoVault Guardian (Telegram) ===')
  console.log('Network:', config.network)
  console.log('DisasterVault app:', config.disasterAppId || '(not set)')
  console.log('Appeals app:', config.appealsAppId || '(not set)')
  console.log('Ops Telegram chat:', config.telegramChatId || '(not set)')
  console.log('Strict mode:', config.demoStrict)

  if (!config.telegramToken.trim()) {
    console.error('[bot] TELEGRAM_BOT_TOKEN missing — set in .env and restart.')
    process.exit(1)
  }

  const app = express()
  app.use(express.urlencoded({ extended: false }))
  app.use(express.json())

  let telegramBot: TelegramBot | null = null

  telegramBot = new TelegramBot(config.telegramToken, { polling: true })
  setTelegramBot(telegramBot)
  registerTelegramHandlers(telegramBot)

  setNotifier(async (channel: BotChannel, userId: string, text: string) => {
    if (channel === 'telegram' && telegramBot) {
      try {
        await telegramBot.sendMessage(Number(userId), text, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        })
      } catch {
        await telegramBot.sendMessage(Number(userId), text.replace(/\*/g, ''))
      }
    }
  })

  telegramBot.on('polling_error', (err) => {
    console.error('[telegram] polling_error', err.message)
  })

  console.log('[telegram] @' + (process.env.VITE_TELEGRAM_BOT_USERNAME || 'bot') + ' polling active')

  app.get('/bot/health', (_req, res) => {
    res.json({
      telegram: Boolean(telegramBot),
      opsChat: Boolean(config.telegramChatId.trim()),
      polling: Boolean(telegramBot?.isPolling()),
      disasterAppId: config.disasterAppId,
      appealsAppId: config.appealsAppId,
      strict: config.demoStrict,
    })
  })

  startOpsAlertEngine()

  if (!config.telegramChatId.trim()) {
    console.warn('[bot] TELEGRAM_CHAT_ID not set — ops pushes disabled. Message @userinfobot for your id.')
  } else if (opsChannelConfigured() && telegramBot) {
    setTimeout(() => {
      void runOpsAlertStartupPing().catch((e) =>
        console.error('[bot] startup ping failed', e instanceof Error ? e.message : e),
      )
    }, 2000)
  }

  app.listen(config.port, () => {
    console.log(`[bot] HTTP http://localhost:${config.port}`)
    console.log(`[bot] Health http://localhost:${config.port}/bot/health`)
    console.log('[bot] Proactive alerts → TELEGRAM_CHAT_ID + /subscribe topics')
  })
}

main().catch((e) => {
  console.error('[bot] fatal', e)
  process.exit(1)
})
