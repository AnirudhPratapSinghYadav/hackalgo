import type TelegramBot from 'node-telegram-bot-api'
import { config } from '../config.js'
import { appButton, opsKeyboard } from '../services/telegramRichSend.js'

/** Inline keyboard for /start and /help — matches ops console sections. */
export function helpKeyboard(): TelegramBot.InlineKeyboardMarkup {
  const base = config.publicAppUrl
  return opsKeyboard([
    [
      appButton('Events', '/operations/events', base),
      appButton('Command', '/operations', base),
    ],
    [
      appButton('Approvals', '/operations/verification', base),
      appButton('Disburse', '/operations/disbursements', base),
    ],
    [
      appButton('Audit', '/operations/disbursements?tab=proof', base),
      appButton('Appeals', '/operations/community-queue', base),
    ],
    [{ text: '📡 Refresh status', callback_data: 'refresh:status' }],
  ])
}
