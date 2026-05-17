import algosdk from 'algosdk'
import type { BotContext } from './types.js'
import { startRegistration } from '../stores/approverStore.js'

export async function handleRegister(ctx: BotContext, addressArg: string | undefined): Promise<void> {
  const addr = addressArg
  if (!addr || !algosdk.isValidAddress(addr)) {
    await ctx.reply('Usage: /register <ALGORAND_ADDRESS>')
    return
  }
  const rec = startRegistration(ctx.channel, ctx.userId, addr)
  await ctx.reply(
    [
      `Sign this exact message with Pera (address ${addr}):`,
      `\`${rec.challenge}\``,
      '',
      'Then send: /verify <base64_signature>',
    ].join('\n'),
  )
}
