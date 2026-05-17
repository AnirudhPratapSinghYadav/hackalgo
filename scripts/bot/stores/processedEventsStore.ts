import { readJson, writeJson } from './jsonStore.js'

interface ProcessedDb {
  txIds: string[]
  gdacsIds: string[]
  appealsSeen: string[]
  autoTriggered: number[]
}

const FILE = 'processed-events.json'
const MAX_TX = 800
const MAX_GDACS = 500

function load(): ProcessedDb {
  const db = readJson<ProcessedDb>(FILE, { txIds: [], gdacsIds: [], appealsSeen: [], autoTriggered: [] })
  return {
    txIds: db.txIds ?? [],
    gdacsIds: db.gdacsIds ?? [],
    appealsSeen: db.appealsSeen ?? [],
    autoTriggered: db.autoTriggered ?? [],
  }
}

function save(db: ProcessedDb): void {
  db.txIds = db.txIds.slice(-MAX_TX)
  db.gdacsIds = db.gdacsIds.slice(-MAX_GDACS)
  db.appealsSeen = db.appealsSeen.slice(-400)
  writeJson(FILE, db)
}

export function isTxProcessed(txId: string): boolean {
  return load().txIds.includes(txId)
}

export function markTxProcessed(txId: string): void {
  const db = load()
  if (!db.txIds.includes(txId)) db.txIds.push(txId)
  save(db)
}

export function isGdacsProcessed(externalId: string): boolean {
  return load().gdacsIds.includes(externalId)
}

export function markGdacsProcessed(externalId: string): void {
  const db = load()
  if (!db.gdacsIds.includes(externalId)) db.gdacsIds.push(externalId)
  save(db)
}

export function isAppealProcessed(txId: string): boolean {
  return load().appealsSeen.includes(txId)
}

export function markAppealProcessed(txId: string): void {
  const db = load()
  if (!db.appealsSeen.includes(txId)) db.appealsSeen.push(txId)
  save(db)
}

export function isAnticipatoryTriggered(campaignId: number): boolean {
  return load().autoTriggered.includes(campaignId)
}

export function markAnticipatoryTriggered(campaignId: number): void {
  const db = load()
  if (!db.autoTriggered.includes(campaignId)) db.autoTriggered.push(campaignId)
  save(db)
}
