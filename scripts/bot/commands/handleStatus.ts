import type { BotContext } from './types.js'
import { config } from '../config.js'
import { listSubscriptions } from '../stores/subscriptionStore.js'
import { helpKeyboard } from './helpKeyboard.js'

export async function handleStatus(ctx: BotContext): Promise<void> {
  const topics = listSubscriptions(ctx.channel, ctx.userId)
  await ctx.reply(
    [
      '*AlgoVault Guardian — status*',
      `Network: \`${config.network}\``,
      `DisasterVault: ${config.disasterAppId || 'not configured'}`,
      `Appeals hub: ${config.appealsAppId || 'not configured'}`,
      `Ops channel: ${config.telegramChatId ? 'armed' : 'not configured (set TELEGRAM_CHAT_ID)'}`,
      `Subscriptions: ${topics.length ? topics.join(', ') : 'none'}`,
      `GDACS sync: every ${config.gdacsPollMs / 60000} min`,
      `Ledger sync: every ${config.indexerPollMs / 1000}s`,
      `Console: ${config.publicAppUrl}/operations`,
    ].join('\n'),
    helpKeyboard(),
  )
}
