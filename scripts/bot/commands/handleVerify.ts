import algosdk from 'algosdk'
import type { BotContext } from './types.js'
import { addSubscription } from '../stores/subscriptionStore.js'
import {
  getPendingRegistration,
  verifyRegistration,
} from '../stores/approverStore.js'

export async function handleVerify(ctx: BotContext, sigB64: string | undefined): Promise<void> {
  const pending = getPendingRegistration(ctx.channel, ctx.userId)
  if (!pending?.challenge) {
    await ctx.reply('Run /register <address> first.')
    return
  }
  if (!sigB64) {
    await ctx.reply('Usage: /verify <base64_signature>')
    return
  }
  const msg = new TextEncoder().encode(pending.challenge)
  const sig = Uint8Array.from(Buffer.from(sigB64, 'base64'))
  const ok = algosdk.verifyBytes(msg, sig, pending.address)
  if (!ok) {
    await ctx.reply('Signature verification failed. Sign the challenge exactly.')
    return
  }
  verifyRegistration(ctx.channel, ctx.userId)
  addSubscription(ctx.channel, ctx.userId, 'approver')
  await ctx.reply(`Verified approver *${pending.address.slice(0, 8)}…*. You can /approve <campaign_id>.`)
}
