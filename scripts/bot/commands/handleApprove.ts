import type { BotContext } from './types.js'
import { peraTxnDeeplink, requireDisasterApp } from '../config.js'
import { getApprover } from '../stores/approverStore.js'
import { buildApprovalUnsignedTxn } from '../chain/disasterVault.js'

export async function handleApprove(ctx: BotContext, campaignId: number): Promise<void> {
  if (!Number.isFinite(campaignId)) {
    await ctx.reply('Usage: /approve <campaign_id>')
    return
  }
  const approver = getApprover(ctx.channel, ctx.userId)
  if (!approver) {
    await ctx.reply('Register first: /register <address> then /verify <signature>')
    return
  }
  requireDisasterApp()
  const unsigned = await buildApprovalUnsignedTxn(approver.address, campaignId)
  const link = peraTxnDeeplink(unsigned)
  await ctx.reply(
    [
      `*Approve campaign #${campaignId}*`,
      'Open Pera to sign:',
      link,
      '',
      'After signing, confirm with: /confirm <txid>',
    ].join('\n'),
  )
}
