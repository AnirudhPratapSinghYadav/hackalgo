/**
 * Unified proactive alerts: GDACS, on-chain campaigns, approvals, disbursements, appeals, anticipatory triggers.
 * Used by the interactive bot (no second Telegram polling client).
 */
import algosdk from 'algosdk'
import { buildEventBrief } from '../../../server/eventBriefHandler.js'
import { loadAllCampaignMeta, updateCampaignMeta } from '../../../server/campaignMetaStore.js'
import { buildFloodForecast } from '../../../server/floodHubHandler.js'
import { config, explorerTxUrl, loraTxUrl } from '../config.js'
import { fetchGdacsEvents } from './gdacsFeed.js'
import { fetchRecentDisasterActivity, fetchAppTransactions } from '../chain/indexer.js'
import { readCampaign } from '../chain/disasterVault.js'
import {
  isAnticipatoryTriggered,
  isAppealProcessed,
  isGdacsProcessed,
  isTxProcessed,
  markAnticipatoryTriggered,
  markAppealProcessed,
  markGdacsProcessed,
  markTxProcessed,
} from '../stores/processedEventsStore.js'
import { appButton, opsKeyboard } from './telegramRichSend.js'
import {
  broadcastOpsAndSubscribers,
  notifyOpsChannel,
  opsChannelConfigured,
} from './telegramOpsChannel.js'

function isHighSeverityGdacs(severity: string): boolean {
  const sev = severity.toLowerCase()
  return (
    sev.includes('orange') ||
    sev.includes('red') ||
    sev.includes('high') ||
    sev.includes('critical')
  )
}

function regionMatches(eventLocation: string, campaignRegion: string): boolean {
  const a = eventLocation.toLowerCase()
  const b = campaignRegion.toLowerCase()
  return a.includes(b) || b.includes(a) || a.split(',')[0].includes(b)
}

function metricFromEvent(
  e: { confidence: number; severity: string },
  param: 'flood_depth' | 'wind_speed' | 'rainfall',
): number {
  if (param === 'rainfall') return e.confidence / 20
  if (param === 'wind_speed') return e.confidence / 15
  return e.confidence / 25
}

function createCampaignSelectorB64(): string {
  const m = new algosdk.ABIMethod({
    name: 'create_campaign',
    args: [
      { type: 'byte[]', name: 'name' },
      { type: 'uint64', name: 'target' },
      { type: 'byte[]', name: 'region' },
      { type: 'address[]', name: 'approvers' },
      { type: 'uint64', name: 'threshold' },
      { type: 'uint64', name: 'expiry_round' },
    ],
    returns: { type: 'uint64' },
  })
  return Buffer.from(m.getSelector()).toString('base64')
}

async function pollGdacsOps(): Promise<void> {
  const events = await fetchGdacsEvents()
  for (const e of events) {
    const id = e.externalId || e.id
    if (isGdacsProcessed(id)) continue
    markGdacsProcessed(id)

    if (!isHighSeverityGdacs(e.severity)) continue

    let briefLine = ''
    try {
      const brief = await buildEventBrief({
        location: e.region,
        type: e.type,
        severity: e.severity,
        alertScore: e.confidence,
      })
      if (brief.summary) briefLine = `\n${brief.summary.split('\n')[0]}`
    } catch {
      /* skip */
    }

    const msg = [
      `*DISASTER ALERT — GDACS*`,
      `Location: ${e.region}`,
      `Type: ${e.type} · Severity: ${e.severity}`,
      `Confidence: ${e.confidence}%`,
      briefLine,
      ``,
      `Operations: ${config.publicAppUrl}/operations/events`,
    ]
      .filter(Boolean)
      .join('\n')

    const flood = buildFloodForecast({
      lat: e.latitude,
      lon: e.longitude,
      severityHint: e.severity,
      alertScore: e.confidence,
    })
    if (flood.available && flood.maxProbability > 70) {
      await broadcastOpsAndSubscribers(
        e.type,
        e.region,
        [
          `*ELEVATED FLOOD RISK — 7 DAY*`,
          `${e.region}`,
          flood.message,
          `Anticipatory campaign: ${config.publicAppUrl}/operations/events`,
        ].join('\n'),
      )
    }

    const { ops, subscribers } = await broadcastOpsAndSubscribers(e.type, e.region, msg)
    console.log(`[ops-alert] GDACS ${id} → ops=${ops} subs=${subscribers}`)
  }
}

async function pollAnticipatoryOps(): Promise<void> {
  const metas = loadAllCampaignMeta().filter((m) => m.kind === 'anticipatory' && !m.autoTriggered)
  if (metas.length === 0) return
  const events = await fetchGdacsEvents()
  for (const meta of metas) {
    const match = events.find((ev) => regionMatches(ev.region, meta.region))
    if (!match || !meta.triggerParameter || meta.triggerThreshold == null) continue
    const current = metricFromEvent(match, meta.triggerParameter)
    updateCampaignMeta(meta.onChainCampaignId, { currentTriggerValue: current })
    if (current < meta.triggerThreshold) continue
    if (isAnticipatoryTriggered(meta.onChainCampaignId)) continue
    markAnticipatoryTriggered(meta.onChainCampaignId)
    updateCampaignMeta(meta.onChainCampaignId, {
      autoTriggered: true,
      monitoringStatus: 'Trigger crossed — auto-disbursement alert sent',
    })
    const text = [
      `*ANTICIPATORY TRIGGER — THRESHOLD CROSSED*`,
      `Campaign: ${meta.name}`,
      `${meta.triggerParameter}: ${current.toFixed(1)} ≥ ${meta.triggerThreshold}`,
      `Pre-positioned funds may release per campaign rules (demo).`,
      `Release desk: ${config.publicAppUrl}/operations/disbursements`,
    ].join('\n')
    await broadcastOpsAndSubscribers('anticipatory', meta.region, text)
    console.log('[ops-alert] anticipatory', meta.onChainCampaignId)
  }
}

async function pollChainOps(): Promise<void> {
  if (!config.disasterAppId) return
  const { disbursements, approvals } = await fetchRecentDisasterActivity(50)
  const txns = await fetchAppTransactions(config.disasterAppId, 30)
  const createSel = createCampaignSelectorB64()

  for (const tx of txns) {
    if (isTxProcessed(tx.id)) continue
    const appArgs = (tx as unknown as { 'application-transaction'?: { 'application-args'?: string[] } })[
      'application-transaction'
    ]?.['application-args']
    if (!appArgs?.length) continue
    if (appArgs[0] === createSel) {
      markTxProcessed(tx.id)
      const msg = [
        `*CAMPAIGN CREATED — ON-CHAIN*`,
        `A new institutional relief campaign is live.`,
        `Approvals: ${config.publicAppUrl}/operations/verification`,
        `Ledger proof: ${explorerTxUrl(tx.id)}`,
      ].join('\n')
      await notifyOpsChannel(msg)
      console.log('[ops-alert] campaign created', tx.id)
    }
  }

  for (const a of approvals) {
    const key = `apr-${a.txId}`
    if (isTxProcessed(key)) continue
    markTxProcessed(key)
    let detail = ''
    let ready = false
    if (a.campaignId) {
      try {
        const c = await readCampaign(a.campaignId)
        detail = `\nApprovals: ${c.approvalCount}/${c.threshold}`
        ready = c.approvalCount >= c.threshold
      } catch {
        /* ignore */
      }
    }
    const msg = ready && a.campaignId
      ? [
          `*CAMPAIGN APPROVED — READY TO DISBURSE*`,
          `Campaign #${a.campaignId}`,
          `Required approver signatures received.`,
          `Release: ${config.publicAppUrl}/operations/disbursements`,
        ].join('\n')
      : [
          `*APPROVAL RECORDED*`,
          a.campaignId ? `Campaign #${a.campaignId}` : '',
          detail,
          `Ledger proof: ${explorerTxUrl(a.txId)}`,
        ]
          .filter(Boolean)
          .join('\n')
    await notifyOpsChannel(msg)
  }

  for (const d of disbursements) {
    if (isTxProcessed(d.txId)) continue
    markTxProcessed(d.txId)
    const msg = [
      `*RELIEF DISBURSED — ON-CHAIN*`,
      d.campaignId ? `Campaign #${d.campaignId}` : 'Disaster relief vault',
      `Ledger proof: ${loraTxUrl(d.txId)}`,
    ].join('\n')
    await notifyOpsChannel(msg)
    console.log('[ops-alert] disbursement', d.txId)
  }
}

async function pollAppealsOps(): Promise<void> {
  if (!config.appealsAppId) return
  const txns = await fetchAppTransactions(config.appealsAppId, 20)
  for (const tx of txns) {
    if (isAppealProcessed(tx.id)) continue
    markAppealProcessed(tx.id)
    const msg = [
      `*COMMUNITY APPEAL — PENDING REVIEW*`,
      `A verified humanitarian appeal was submitted on-chain.`,
      `Review queue: ${config.publicAppUrl}/operations/community`,
    ].join('\n')
    await notifyOpsChannel(msg)
    console.log('[ops-alert] appeal', tx.id)
  }
}

async function runGdacsTick(): Promise<void> {
  try {
    await pollGdacsOps()
    await pollAnticipatoryOps()
  } catch (e) {
    console.error('[ops-alert] gdacs tick', e instanceof Error ? e.message : e)
  }
}

async function runChainTick(): Promise<void> {
  try {
    await pollChainOps()
    await pollAppealsOps()
  } catch (e) {
    console.error('[ops-alert] chain tick', e instanceof Error ? e.message : e)
  }
}

export async function runOpsAlertStartupPing(): Promise<void> {
  if (!opsChannelConfigured()) return
  const lines = [
    `*AlgoVault Guardian — online*`,
    `Operational alerting for disaster response.`,
    `Network: ${config.network} · Demo strict: ${config.demoStrict ? 'yes' : 'no'}`,
    config.disasterAppId ? `DisasterVault: \`${config.disasterAppId}\`` : 'DisasterVault: not configured',
    config.appealsAppId ? `Appeals hub: \`${config.appealsAppId}\`` : '',
    ``,
    `GDACS sync: ${config.gdacsPollMs / 60000} min · Ledger sync: ${config.indexerPollMs / 1000}s`,
    `Commands: /status · /events · /list`,
    `Console: ${config.publicAppUrl}/operations`,
  ].filter(Boolean)
  const kb = opsKeyboard([
    [
      appButton('🗺 Events', '/operations/events', config.publicAppUrl),
      { text: '📡 Status', callback_data: 'refresh:status' },
    ],
  ])
  await notifyOpsChannel(lines.join('\n'), kb)
}

export function startOpsAlertEngine(): void {
  if (!config.telegramToken) {
    console.warn('[ops-alert] TELEGRAM_BOT_TOKEN missing — proactive alerts disabled')
    return
  }
  if (!config.telegramChatId.trim()) {
    console.warn('[ops-alert] TELEGRAM_CHAT_ID missing — ops pushes disabled (subscribers still work)')
  }

  console.log(
    `[ops-alert] engine started · GDACS ${config.gdacsPollMs / 60000}m · chain ${config.indexerPollMs / 1000}s · ops chat ${config.telegramChatId || '—'}`,
  )

  void runGdacsTick()
  void runChainTick()

  setInterval(() => void runGdacsTick(), config.gdacsPollMs)
  setInterval(() => void runChainTick(), config.indexerPollMs)
}
