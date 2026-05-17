import type { BotContext } from './types.js'
import { config } from '../config.js'
import { fetchGdacsEvents } from '../services/gdacsFeed.js'
import { helpKeyboard } from './helpKeyboard.js'

export async function handleEvents(ctx: BotContext): Promise<void> {
  const events = await fetchGdacsEvents()
  if (events.length === 0) {
    await ctx.reply('No incidents returned from GDACS. Retry shortly.')
    return
  }
  const lines = ['*GDACS incident register*', '']
  for (const e of events.slice(0, 5)) {
    lines.push(`• ${e.region} — ${e.type} (${e.severity}) · confidence ${e.confidence}%`)
  }
  lines.push('', `${config.publicAppUrl}/operations/events`)
  await ctx.reply(lines.join('\n'), helpKeyboard())
}
