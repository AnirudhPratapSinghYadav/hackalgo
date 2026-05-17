import { readJson, writeJson } from './jsonStore.js'

export type BotChannel = 'telegram'

export interface Subscription {
  channel: BotChannel
  userId: string
  topics: string[]
  createdAt: string
}

interface SubscriptionDb {
  subscriptions: Subscription[]
}

const FILE = 'subscriptions.json'

function load(): SubscriptionDb {
  return readJson<SubscriptionDb>(FILE, { subscriptions: [] })
}

function save(db: SubscriptionDb): void {
  writeJson(FILE, db)
}

function key(channel: BotChannel, userId: string): string {
  return `${channel}:${userId}`
}

export function addSubscription(channel: BotChannel, userId: string, topic: string): Subscription {
  const db = load()
  const t = topic.trim().toLowerCase()
  let sub = db.subscriptions.find((s) => s.channel === channel && s.userId === userId)
  if (!sub) {
    sub = { channel, userId, topics: [], createdAt: new Date().toISOString() }
    db.subscriptions.push(sub)
  }
  if (!sub.topics.includes(t)) sub.topics.push(t)
  save(db)
  return sub
}

export function removeSubscription(channel: BotChannel, userId: string, topic: string): boolean {
  const db = load()
  const sub = db.subscriptions.find((s) => s.channel === channel && s.userId === userId)
  if (!sub) return false
  const t = topic.trim().toLowerCase()
  sub.topics = sub.topics.filter((x) => x !== t)
  if (sub.topics.length === 0) {
    db.subscriptions = db.subscriptions.filter((s) => key(s.channel, s.userId) !== key(channel, userId))
  }
  save(db)
  return true
}

export function listSubscriptions(channel: BotChannel, userId: string): string[] {
  const db = load()
  return db.subscriptions.find((s) => s.channel === channel && s.userId === userId)?.topics ?? []
}

/** Match topic like `flood`, `region:kerala`, or `all` */
export function getSubscribersForAlert(disasterType: string, region: string): Subscription[] {
  const db = load()
  const type = disasterType.toLowerCase()
  const reg = region.toLowerCase()
  return db.subscriptions.filter((s) =>
    s.topics.some((topic) => {
      if (topic === 'all') return true
      if (topic.startsWith('region:') && reg.includes(topic.slice(7))) return true
      if (type.includes(topic) || topic.includes(type)) return true
      return false
    }),
  )
}

export function allSubscribers(): Subscription[] {
  return load().subscriptions
}
