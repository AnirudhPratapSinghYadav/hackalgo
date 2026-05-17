import type { BotContext } from './types.js'
import { config } from '../config.js'
import { addSubscription } from '../stores/subscriptionStore.js'
import { helpKeyboard } from './helpKeyboard.js'
import { guardianUsage } from './usage.js'

export async function handleStart(ctx: BotContext): Promise<void> {
  addSubscription(ctx.channel, ctx.userId, 'all')
  const opsNote =
    config.telegramChatId && ctx.userId === config.telegramChatId.trim()
      ? '\n\n*Operations channel armed.* You receive GDACS and on-chain alerts.'
      : '\n\nSubscribed to disaster topics. Narrow with /subscribe flood.'
  await ctx.reply(guardianUsage() + opsNote, helpKeyboard())
}
