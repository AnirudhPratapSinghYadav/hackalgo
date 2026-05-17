import type TelegramBot from 'node-telegram-bot-api'
import type { BotChannel } from '../stores/subscriptionStore.js'

export interface BotContext {
  channel: BotChannel
  userId: string
  text: string
  reply: (message: string, keyboard?: TelegramBot.InlineKeyboardMarkup) => Promise<void>
}
