import type { BotChannel } from '../stores/subscriptionStore.js'
import { getSubscribersForAlert, type Subscription } from '../stores/subscriptionStore.js'
import { getApproverByAddress } from '../stores/approverStore.js'

export type NotifyFn = (channel: BotChannel, userId: string, text: string) => Promise<void>

let notifyFn: NotifyFn | null = null

export function setNotifier(fn: NotifyFn): void {
  notifyFn = fn
}

export async function notifyUser(channel: BotChannel, userId: string, text: string): Promise<void> {
  if (!notifyFn) {
    console.log(`[notify] ${channel}:${userId}`, text.slice(0, 120))
    return
  }
  await notifyFn(channel, userId, text)
}

export async function broadcastDisasterAlert(
  disasterType: string,
  region: string,
  message: string,
): Promise<number> {
  const subs = getSubscribersForAlert(disasterType, region)
  await Promise.all(subs.map((s) => notifyUser(s.channel, s.userId, message)))
  return subs.length
}

export async function notifyApproversExcept(
  approverAddress: string,
  message: string,
): Promise<void> {
  const subs: Subscription[] = []
  const all = getSubscribersForAlert('approver', 'all')
  for (const s of all) {
    if (s.topics.includes('approver')) subs.push(s)
  }
  const otherApprovers = getSubscribersForAlert('approval', 'all')
  const targets = [...subs, ...otherApprovers]
  const sender = approverAddress.toUpperCase()
  for (const t of targets) {
    const rec = getApproverByAddress(sender)
    if (rec && t.userId === rec.userId) continue
    await notifyUser(t.channel, t.userId, message)
  }
}

export async function notifySubscribersRaw(
  subscribers: Subscription[],
  message: string,
): Promise<void> {
  await Promise.all(subscribers.map((s) => notifyUser(s.channel, s.userId, message)))
}
