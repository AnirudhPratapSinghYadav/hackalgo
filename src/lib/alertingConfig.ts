/** Public Telegram Guardian links for Settings (Vite env). */

export function getTelegramBotUsername(): string {
  return (import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '').replace(/^@/, '').trim()
}

export function isTelegramConfigured(): boolean {
  return getTelegramBotUsername().length > 0
}

export function getTelegramBotUrl(startParam?: string): string | null {
  const user = getTelegramBotUsername()
  if (!user) return null
  const base = `https://t.me/${user}`
  const start = startParam?.trim()
  return start ? `${base}?start=${encodeURIComponent(start)}` : base
}
