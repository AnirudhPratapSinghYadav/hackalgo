import algosdk from 'algosdk'
import type { BotContext } from './types.js'
import { config, explorerTxUrl, peraTxnDeeplink, requireDisasterApp } from '../config.js'
import {
  addSubscription,
  listSubscriptions,
  removeSubscription,
} from '../stores/subscriptionStore.js'
import {
  buildDonateUnsignedTxns,
  isTxnConfirmed,
} from '../chain/disasterVault.js'
import { createAppealOnChain, readAppeal } from '../chain/communityHub.js'
import { fetchAppTransactions } from '../chain/indexer.js'
import { helpKeyboard } from './helpKeyboard.js'
import { handleStart } from './handleStart.js'
import { handleStatus } from './handleStatus.js'
import { handleEvents } from './handleEvents.js'
import { handleCampaignsList, handleCampaignDetail } from './handleCampaigns.js'
import { handleRegister } from './handleRegister.js'
import { handleVerify } from './handleVerify.js'
import { handleApprove } from './handleApprove.js'

function parseAppealMessage(text: string): {
  title: string
  targetAlgo: number
  beneficiary: string
  metadataUri: string
} | null {
  const m = text.match(/^!appeal\s+"([^"]+)"\s+([\d.]+)\s+([A-Z2-7]{58})(?:\s+(\S+))?/i)
  if (!m) return null
  return {
    title: m[1],
    targetAlgo: Number(m[2]),
    beneficiary: m[3],
    metadataUri: m[4] ?? `ipfs://algovault-appeal/${Date.now()}`,
  }
}

export async function handleMessage(ctx: BotContext): Promise<void> {
  const raw = ctx.text.trim()
  const text = raw.startsWith('/') ? raw : raw.toLowerCase().startsWith('!appeal') ? raw : raw
  const parts = text.split(/\s+/)
  const cmd = parts[0].toLowerCase()

  try {
    if (cmd === '/start' || cmd === '/help') {
      await handleStart(ctx)
      return
    }

    if (cmd === '/ping') {
      await ctx.reply('Guardian online. Operational alerting active.', helpKeyboard())
      return
    }

    if (cmd === '/events') {
      await handleEvents(ctx)
      return
    }

    if (cmd === '/status') {
      await handleStatus(ctx)
      return
    }

    if (cmd === '/subscribe') {
      const topic = parts.slice(1).join(' ') || 'all'
      addSubscription(ctx.channel, ctx.userId, topic)
      await ctx.reply(`Subscribed to *${topic}*. GDACS alerts will be pushed when disasters match.`)
      return
    }

    if (cmd === '/unsubscribe') {
      const topic = parts.slice(1).join(' ')
      if (!topic) {
        await ctx.reply('Usage: /unsubscribe <topic>')
        return
      }
      removeSubscription(ctx.channel, ctx.userId, topic)
      await ctx.reply(`Unsubscribed from *${topic}*.`)
      return
    }

    if (cmd === '/subscriptions') {
      const topics = listSubscriptions(ctx.channel, ctx.userId)
      await ctx.reply(
        topics.length ? `Your topics:\n${topics.map((t) => `• ${t}`).join('\n')}` : 'No subscriptions. Try /subscribe flood',
      )
      return
    }

    if (cmd === '/list' || cmd === '/campaigns') {
      await handleCampaignsList(ctx)
      return
    }

    if (cmd === '/campaign') {
      await handleCampaignDetail(ctx, Number(parts[1]))
      return
    }

    if (cmd === '/register') {
      await handleRegister(ctx, parts[1])
      return
    }

    if (cmd === '/verify') {
      await handleVerify(ctx, parts[1])
      return
    }

    if (cmd === '/approve') {
      await handleApprove(ctx, Number(parts[1]))
      return
    }

    if (cmd === '/confirm') {
      const txId = parts[1]
      if (!txId || txId.length < 50) {
        await ctx.reply('Usage: /confirm <transaction_id>')
        return
      }
      const ok = await isTxnConfirmed(txId)
      if (ok) {
        await ctx.reply(`Confirmed on-chain.\n${explorerTxUrl(txId)}`)
      } else {
        await ctx.reply('Transaction not confirmed yet. Wait a few rounds and try again.')
      }
      return
    }

    if (cmd === '/donate') {
      const campaignId = Number(parts[1])
      const amount = Number(parts[2])
      const donorAddr = parts[3]
      if (!Number.isFinite(campaignId) || !Number.isFinite(amount) || amount <= 0) {
        await ctx.reply('Usage: /donate <campaign_id> <USDC_amount> [your_address]')
        return
      }
      if (!donorAddr || !algosdk.isValidAddress(donorAddr)) {
        await ctx.reply('Provide your Algorand address as 3rd arg.')
        return
      }
      requireDisasterApp()
      const micro = Math.round(amount * 1_000_000)
      const unsigned = await buildDonateUnsignedTxns(donorAddr, campaignId, micro)
      const links = unsigned.map((u, i) => `Txn ${i + 1}: ${peraTxnDeeplink(u)}`)
      await ctx.reply(
        [`*Donate ${amount} USDC to campaign #${campaignId}*`, ...links, '', 'Sign both txns in order in Pera.'].join('\n'),
      )
      return
    }

    if (cmd === '/audit') {
      const campaignId = Number(parts[1])
      if (!Number.isFinite(campaignId)) {
        await ctx.reply('Usage: /audit <campaign_id>')
        return
      }
      const appId = requireDisasterApp()
      const txns = await fetchAppTransactions(appId, 15)
      const lines = txns.slice(0, 5).map((t) => `${explorerTxUrl(t.id)}`)
      await ctx.reply(
        lines.length
          ? [`*Recent DisasterVault txs* (campaign #${campaignId} context):`, ...lines].join('\n')
          : 'No confirmed ledger transactions found.',
      )
      return
    }

    if (cmd === '/appeal') {
      await ctx.reply(
        'Submit an appeal on-chain:\n!appeal "Flood relief" 50 ALGO_ADDRESS [https://metadata...]',
      )
      return
    }

    if (text.toLowerCase().startsWith('!appeal')) {
      const parsed = parseAppealMessage(text)
      if (!parsed) {
        await ctx.reply('Format: !appeal "Title" <target_ALGO> <beneficiary_address> [metadata_uri]')
        return
      }
      if (!config.botMnemonic) {
        await ctx.reply('BOT_MNEMONIC not configured — cannot submit appeals from bot.')
        return
      }
      if (!algosdk.isValidAddress(parsed.beneficiary)) {
        await ctx.reply('Invalid beneficiary address.')
        return
      }
      const account = algosdk.mnemonicToSecretKey(config.botMnemonic)
      const sender = account.addr.toString()
      const micro = Math.round(parsed.targetAlgo * 1_000_000)
      const meta = JSON.stringify({ title: parsed.title, source: 'bot', uri: parsed.metadataUri })
      const { txId, appealId } = await createAppealOnChain(sender, account.sk, {
        targetMicroAlgo: micro,
        beneficiary: parsed.beneficiary,
        metadataUri: meta.slice(0, 120),
      })
      await ctx.reply(
        [
          `*Appeal #${appealId} created*`,
          `Title: ${parsed.title}`,
          `Target: ${parsed.targetAlgo} ALGO`,
          `Tx: ${explorerTxUrl(txId)}`,
          `Admin review: ${config.publicAppUrl}/operations/community-queue`,
        ].join('\n'),
      )
      return
    }

    if (text.toLowerCase().includes('appeal') && parts[0] === '/appealstatus') {
      const id = Number(parts[1])
      const a = await readAppeal(id)
      await ctx.reply(
        `Appeal #${id}: ${(a.raised / 1e6).toFixed(4)}/${(a.target / 1e6).toFixed(4)} ALGO · status ${a.status}`,
      )
      return
    }

    await ctx.reply('Unknown command. Send /help for humanitarian alerts and on-chain actions.')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed'
    if (config.demoStrict && /mock|simulated/i.test(msg)) {
      await ctx.reply('Network error: mock data disabled in strict mode.')
      return
    }
    await ctx.reply(`Error: ${msg}`)
  }
}
