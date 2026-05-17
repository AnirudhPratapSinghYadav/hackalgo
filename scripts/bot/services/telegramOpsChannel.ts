import type TelegramBot from 'node-telegram-bot-api'
import { config } from '../config.js'
import { notifyUser } from './notificationService.js'
import { broadcastDisasterAlert } from './notificationService.js'
import { appButton, opsKeyboard, sendTelegramRich } from './telegramRichSend.js'

export type OpsKeyboard = TelegramBot.InlineKeyboardMarkup

/** Default quick actions for ops disaster / chain alerts */
export function defaultOpsKeyboard(): OpsKeyboard {
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
      appButton('Appeals', '/operations/community', base),
    ],
  ])
}

/** Push to the operations Telegram chat from TELEGRAM_CHAT_ID in .env */
export async function notifyOpsChannel(
  text: string,
  keyboard: OpsKeyboard = defaultOpsKeyboard(),
): Promise<boolean> {
  const chatId = config.telegramChatId.trim()
  if (!chatId) {
    console.warn('[telegram-ops] TELEGRAM_CHAT_ID not set — skip ops push')
    return false
  }
  try {
    await sendTelegramRich(chatId, text, keyboard)
    return true
  } catch (e) {
    try {
      await notifyUser('telegram', chatId, text)
      return true
    } catch (e2) {
      console.error('[telegram-ops] send failed', e instanceof Error ? e.message : e, e2)
      return false
    }
  }
}

/** Ops channel + topic subscribers (deduped by notifyUser per user id) */
export async function broadcastOpsAndSubscribers(
  disasterType: string,
  region: string,
  text: string,
  keyboard?: OpsKeyboard,
): Promise<{ ops: boolean; subscribers: number }> {
  const ops = await notifyOpsChannel(text, keyboard ?? defaultOpsKeyboard())
  const subscribers = await broadcastDisasterAlert(disasterType, region, text)
  return { ops, subscribers }
}

export function opsChannelConfigured(): boolean {
  return Boolean(config.telegramChatId.trim() && config.telegramToken)
}
