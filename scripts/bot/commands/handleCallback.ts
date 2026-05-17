import type TelegramBot from 'node-telegram-bot-api'
import { config, explorerTxUrl } from '../config.js'
import { readCampaign } from '../chain/disasterVault.js'
import { appButton, opsKeyboard } from '../services/telegramRichSend.js'

export async function handleCallbackQuery(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery,
): Promise<void> {
  const data = query.data?.trim()
  if (!data || !query.id) return

  const chatId = query.message?.chat.id
  const answer = (text?: string) => bot.answerCallbackQuery(query.id, { text })

  if (data === 'refresh:status') {
    await answer('Refreshing…')
    if (chatId) {
      await bot.sendMessage(
        chatId,
        [
          `Network: ${config.network}`,
          `DisasterVault: ${config.disasterAppId || '—'}`,
          `Ops chat armed: ${Boolean(config.telegramChatId)}`,
        ].join('\n'),
      )
    }
    return
  }

  const campaignMatch = data.match(/^campaign:(\d+)$/)
  if (campaignMatch && chatId) {
    const id = Number(campaignMatch[1])
    await answer()
    try {
      const c = await readCampaign(id)
      const base = config.publicAppUrl
      await bot.sendMessage(
        chatId,
        [
          `Campaign #${id}`,
          `Raised ${(c.raised / 1_000_000).toFixed(2)} / ${(c.target / 1_000_000).toFixed(2)} USDC`,
          `Approvals ${c.approvalCount}/${c.threshold}`,
        ].join('\n'),
        {
          reply_markup: opsKeyboard([
            [appButton('Approve in app', '/operations/verification', base)],
            [appButton('Disburse', '/operations/disbursements', base)],
          ]),
        },
      )
    } catch {
      await bot.sendMessage(chatId, `Campaign #${id} not found on-chain.`)
    }
    return
  }

  const txMatch = data.match(/^tx:(.+)$/)
  if (txMatch && chatId) {
    await answer('Opening explorer…')
    await bot.sendMessage(chatId, explorerTxUrl(txMatch[1]))
    return
  }

  await answer('Unknown action')
}
