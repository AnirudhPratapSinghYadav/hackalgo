import type TelegramBot from 'node-telegram-bot-api'
import { handleMessage } from './commands/handleMessage.js'
import { handleCallbackQuery } from './commands/handleCallback.js'
import type { BotChannel } from './stores/subscriptionStore.js'

export function registerTelegramHandlers(bot: TelegramBot): void {
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id
    const userId = String(msg.from?.id ?? chatId)
    const text = msg.text?.trim()
    if (!text) return

    const reply = async (message: string, extra?: TelegramBot.SendMessageOptions) => {
      await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        ...extra,
      })
    }

    try {
      await handleMessage({
        channel: 'telegram' as BotChannel,
        userId,
        text,
        reply: async (m, keyboard) => {
          try {
            await reply(m, keyboard ? { reply_markup: keyboard } : undefined)
          } catch {
            await bot.sendMessage(chatId, m.replace(/\*/g, ''), keyboard ? { reply_markup: keyboard } : undefined)
          }
        },
      })
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Handler error'
      await bot.sendMessage(chatId, `Bot error: ${err}`)
    }
  })

  bot.on('callback_query', async (query) => {
    try {
      await handleCallbackQuery(bot, query)
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Callback error'
      if (query.id) {
        await bot.answerCallbackQuery(query.id, { text: err.slice(0, 180), show_alert: true })
      }
    }
  })

  bot.on('polling_error', (err) => {
    console.error('[telegram] polling_error', err.message)
  })

  console.log('[telegram] handlers registered (messages + inline keyboards)')
}
