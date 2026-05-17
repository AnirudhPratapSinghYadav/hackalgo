import { readJson, writeJson } from './jsonStore.js'
import type { BotChannel } from './subscriptionStore.js'

export interface ApproverRecord {
  channel: BotChannel
  userId: string
  address: string
  verified: boolean
  challenge?: string
  nonce?: string
  registeredAt: string
}

interface ApproverDb {
  approvers: ApproverRecord[]
}

const FILE = 'registrations.json'
const LEGACY_FILE = 'approvers.json'

function load(): ApproverDb {
  const primary = readJson<ApproverDb>(FILE, { approvers: [] })
  if (primary.approvers.length > 0) return primary
  const legacy = readJson<ApproverDb>(LEGACY_FILE, { approvers: [] })
  if (legacy.approvers.length > 0) {
    writeJson(FILE, legacy)
    return legacy
  }
  return { approvers: [] }
}

function save(db: ApproverDb): void {
  writeJson(FILE, db)
}

export function startRegistration(channel: BotChannel, userId: string, address: string): ApproverRecord {
  const db = load()
  const nonce = Math.random().toString(36).slice(2, 12)
  const challenge = `AlgoVault-BOT-${nonce}`
  const existing = db.approvers.find((a) => a.channel === channel && a.userId === userId)
  const record: ApproverRecord = {
    channel,
    userId,
    address,
    verified: false,
    challenge,
    nonce,
    registeredAt: new Date().toISOString(),
  }
  if (existing) {
    Object.assign(existing, record)
  } else {
    db.approvers.push(record)
  }
  save(db)
  return record
}

export function verifyRegistration(channel: BotChannel, userId: string): ApproverRecord | undefined {
  const db = load()
  const rec = db.approvers.find((a) => a.channel === channel && a.userId === userId)
  if (!rec) return undefined
  rec.verified = true
  rec.challenge = undefined
  save(db)
  return rec
}

export function getApprover(channel: BotChannel, userId: string): ApproverRecord | undefined {
  return load().approvers.find((a) => a.channel === channel && a.userId === userId && a.verified)
}

export function getApproverByAddress(address: string): ApproverRecord | undefined {
  const addr = address.toUpperCase()
  return load().approvers.find((a) => a.verified && a.address.toUpperCase() === addr)
}

export function getPendingRegistration(channel: BotChannel, userId: string): ApproverRecord | undefined {
  return load().approvers.find((a) => a.channel === channel && a.userId === userId && !a.verified)
}
