import type TelegramBot from 'node-telegram-bot-api'
import type { BotContext } from './types.js'
import { config, requireDisasterApp } from '../config.js'
import { listActiveCampaignIds, readCampaign, statusLabel } from '../chain/disasterVault.js'
import { appButton, opsKeyboard } from '../services/telegramRichSend.js'
import { helpKeyboard } from './helpKeyboard.js'

export async function handleCampaignsList(ctx: BotContext): Promise<void> {
  requireDisasterApp()
  const ids = await listActiveCampaignIds(5)
  if (ids.length === 0) {
    await ctx.reply('No active campaigns on-chain yet. Check the operations console after admin creates one.')
    return
  }
  const lines: string[] = ['*Active campaigns*']
  const buttons: TelegramBot.InlineKeyboardButton[][] = []
  for (const id of ids) {
    const c = await readCampaign(id)
    lines.push(
      `#${id}: ${(c.raised / 1_000_000).toFixed(2)}/${(c.target / 1_000_000).toFixed(2)} USDC · approvals ${c.approvalCount}/${c.threshold} · ${statusLabel(c.status)}`,
    )
    buttons.push([{ text: `Campaign #${id}`, callback_data: `campaign:${id}` }])
  }
  lines.push('\nDetails: /campaign <id>')
  const base = config.publicAppUrl
  buttons.push([appButton('Open disbursements', '/operations/disbursements', base)])
  await ctx.reply(lines.join('\n'), opsKeyboard(buttons))
}

export async function handleCampaignDetail(ctx: BotContext, id: number): Promise<void> {
  if (!Number.isFinite(id) || id < 1) {
    await ctx.reply('Usage: /campaign <id>')
    return
  }
  requireDisasterApp()
  const c = await readCampaign(id)
  await ctx.reply(
    [
      `*Campaign #${id}*`,
      `Target: ${(c.target / 1_000_000).toFixed(4)} USDC`,
      `Raised: ${(c.raised / 1_000_000).toFixed(4)} USDC`,
      `Approvals: ${c.approvalCount} / ${c.threshold}`,
      `Status: ${statusLabel(c.status)}`,
      `Approve: /approve ${id}`,
    ].join('\n'),
    helpKeyboard(),
  )
}
