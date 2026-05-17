import type TelegramBot from 'node-telegram-bot-api'

let bot: TelegramBot | null = null

export function setTelegramBot(instance: TelegramBot | null): void {
  bot = instance
}

export type InlineButton = { text: string; url?: string; callback_data?: string }

export function opsKeyboard(rows: InlineButton[][]): TelegramBot.InlineKeyboardMarkup {
  return { inline_keyboard: rows }
}

export function appButton(label: string, path: string, baseUrl: string): InlineButton {
  return { text: label, url: `${baseUrl.replace(/\/$/, '')}${path}` }
}

export async function sendTelegramRich(
  chatId: string | number,
  text: string,
  keyboard?: TelegramBot.InlineKeyboardMarkup,
): Promise<void> {
  if (!bot) throw new Error('Telegram bot not initialized')
  const id = typeof chatId === 'string' ? Number(chatId) : chatId
  try {
    await bot.sendMessage(id, text, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      reply_markup: keyboard,
    })
  } catch {
    await bot.sendMessage(id, text.replace(/\*/g, ''), { reply_markup: keyboard })
  }
}
