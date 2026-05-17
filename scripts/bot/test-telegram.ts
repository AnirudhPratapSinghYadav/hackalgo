import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as dotenv from 'dotenv'
import TelegramBot from 'node-telegram-bot-api'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
dotenv.config({ path: path.join(root, '.env') })

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) throw new Error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID required')
  const bot = new TelegramBot(token, { polling: false })
  await bot.sendMessage(
    chatId,
    '🛡️ AlgoVault Guardian test — wiring OK. Send /status or /help to the bot.',
    { disable_web_page_preview: true },
  )
  console.log('Sent OK to chat', chatId)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
