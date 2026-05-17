import { config, explorerTxUrl } from '../config.js'
import { fetchRecentDisasterActivity } from '../chain/indexer.js'
import { readCampaign } from '../chain/disasterVault.js'
import { isTxProcessed, markTxProcessed } from '../stores/processedEventsStore.js'
import { getSubscribersForAlert } from '../stores/subscriptionStore.js'
import { notifySubscribersRaw, notifyUser } from './notificationService.js'
import { getApprover } from '../stores/approverStore.js'
import type { BotChannel } from '../stores/subscriptionStore.js'

async function notifyCampaignRegion(campaignId: number, message: string): Promise<void> {
  try {
    await readCampaign(campaignId)
    const subs = getSubscribersForAlert('all', 'all')
    await notifySubscribersRaw(subs, message)
  } catch {
    await notifySubscribersRaw(getSubscribersForAlert('all', 'all'), message)
  }
}

export function startChainEventListener(): void {
  const tick = async () => {
    if (!config.disasterAppId) return
    try {
      const { disbursements, approvals } = await fetchRecentDisasterActivity()
      for (const d of disbursements) {
        if (isTxProcessed(d.txId)) continue
        markTxProcessed(d.txId)
        const msg = [
          `✅ *Campaign disbursed*`,
          d.campaignId ? `Campaign #${d.campaignId}` : 'DisasterVault',
          `Explorer: ${explorerTxUrl(d.txId)}`,
        ].join('\n')
        console.log('[chain]', msg)
        if (d.campaignId) await notifyCampaignRegion(d.campaignId, msg)
        else await notifySubscribersRaw(getSubscribersForAlert('all', 'all'), msg)
      }
      for (const a of approvals) {
        if (isTxProcessed(`apr-${a.txId}`)) continue
        markTxProcessed(`apr-${a.txId}`)
        let detail = ''
        if (a.campaignId) {
          try {
            const c = await readCampaign(a.campaignId)
            detail = `\nApprovals: ${c.approvalCount}/${c.threshold}`
          } catch {
            /* ignore */
          }
        }
        const msg = [
          `📝 *Approval submitted*`,
          a.campaignId ? `Campaign #${a.campaignId}` : '',
          `By: ${a.sender.slice(0, 8)}…`,
          detail,
          `Tx: ${explorerTxUrl(a.txId)}`,
          `Other approvers: /approve ${a.campaignId ?? ''}`,
        ]
          .filter(Boolean)
          .join('\n')
        console.log('[chain]', msg)
        if (a.campaignId) await notifyCampaignRegion(a.campaignId, msg)
      }
    } catch (e) {
      console.error('[chain-listener]', e instanceof Error ? e.message : e)
    }
  }
  void tick()
  setInterval(tick, config.indexerPollMs)
  console.log(`[chain] indexer poll every ${config.indexerPollMs / 1000}s`)
}

export async function notifyApproverPending(
  channel: BotChannel,
  userId: string,
  campaignId: number,
): Promise<void> {
  const rec = getApprover(channel, userId)
  if (!rec) return
  await notifyUser(
    channel,
    userId,
    `Reminder: campaign #${campaignId} may need your approval.\n/approve ${campaignId}`,
  )
}
