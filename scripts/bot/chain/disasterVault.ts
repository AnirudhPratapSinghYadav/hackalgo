import algosdk from 'algosdk'
import { config, requireDisasterApp } from '../config.js'
import { getAlgod, suggestedParams } from './network.js'
import { loadArc56, methodByName } from './arc56.js'

const spec = loadArc56('DisasterVault')

function campaignBoxName(campaignId: number): Uint8Array {
  const name = new Uint8Array(8)
  new DataView(name.buffer).setBigUint64(0, BigInt(campaignId))
  return name
}

function campaignBoxRef(appId: number, campaignId: number): algosdk.BoxReference {
  return { appIndex: appId, name: campaignBoxName(campaignId) }
}

export function statusLabel(code: number): string {
  if (code === 1) return 'active (awaiting approvals)'
  if (code === 2) return 'approved (ready to disburse)'
  if (code === 3) return 'disbursed'
  if (code === 4) return 'expired'
  return `unknown (${code})`
}

export async function readCampaignCount(): Promise<number> {
  const appId = requireDisasterApp()
  const info = await getAlgod().getApplicationByID(appId).do()
  const gs = info.params['global-state'] as { key: string; value: { uint: number } }[] | undefined
  const key = Buffer.from('campaign_count').toString('base64')
  return gs?.find((e) => e.key === key)?.value?.uint ?? 0
}

export async function readCampaign(campaignId: number): Promise<{
  target: number
  raised: number
  approvalCount: number
  threshold: number
  status: number
}> {
  const appId = requireDisasterApp()
  const sp = await suggestedParams()
  const atc = new algosdk.AtomicTransactionComposer()
  const sender = algosdk.getApplicationAddress(appId).toString()
  await atc.addMethodCall({
    appID: appId,
    sender,
    signer: algosdk.makeEmptyTransactionSigner(),
    method: methodByName(spec, 'get_campaign'),
    methodArgs: [BigInt(campaignId)],
    boxes: [campaignBoxRef(appId, campaignId)],
    suggestedParams: sp,
  })
  const result = await atc.simulate(getAlgod())
  const raw = result.methodResults[0]?.returnValue
  if (!(raw instanceof Uint8Array)) throw new Error(`Campaign #${campaignId} not found or simulate failed`)
  const d = algosdk.ABIType.from('(uint64,uint64,uint64,uint64,uint64)').decode(raw) as bigint[]
  return {
    target: Number(d[0]),
    raised: Number(d[1]),
    approvalCount: Number(d[2]),
    threshold: Number(d[3]),
    status: Number(d[4]),
  }
}

export async function listActiveCampaignIds(limit = 5): Promise<number[]> {
  const count = await readCampaignCount()
  const ids: number[] = []
  for (let id = count; id >= 1 && ids.length < limit; id--) {
    try {
      const c = await readCampaign(id)
      if (c.status === 1 || c.status === 2) ids.push(id)
    } catch {
      /* skip missing */
    }
  }
  return ids
}

/** Build unsigned submit_approval txn for Pera deeplink signing */
export async function buildApprovalUnsignedTxn(approverAddress: string, campaignId: number): Promise<Uint8Array> {
  const appId = requireDisasterApp()
  const sp = await suggestedParams(3000)
  const atc = new algosdk.AtomicTransactionComposer()
  await atc.addMethodCall({
    appID: appId,
    sender: approverAddress,
    signer: algosdk.makeEmptyTransactionSigner(),
    method: methodByName(spec, 'submit_approval'),
    methodArgs: [BigInt(campaignId)],
    boxes: [campaignBoxRef(appId, campaignId)],
    suggestedParams: sp,
  })
  const group = await atc.buildGroup()
  if (group.length !== 1) throw new Error('Expected single-txn approval group')
  return algosdk.encodeUnsignedTransaction(group[0])
}

/** Build unsigned USDC donate group (axfer + donate) */
export async function buildDonateUnsignedTxns(
  donorAddress: string,
  campaignId: number,
  amountMicroUsdc: number,
): Promise<Uint8Array[]> {
  const appId = requireDisasterApp()
  const assetId = config.stablecoinAssetId
  const appAddr = algosdk.getApplicationAddress(appId).toString()
  const sp = await suggestedParams(1000)
  const axfer = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: donorAddress,
    to: appAddr,
    assetIndex: assetId,
    amount: amountMicroUsdc,
    suggestedParams: { ...sp, fee: 1000 },
  })
  const atc = new algosdk.AtomicTransactionComposer()
  atc.addTransaction({ txn: axfer, signer: algosdk.makeEmptyTransactionSigner() })
  await atc.addMethodCall({
    appID: appId,
    sender: donorAddress,
    signer: algosdk.makeEmptyTransactionSigner(),
    method: methodByName(spec, 'donate'),
    methodArgs: [BigInt(campaignId), { txn: axfer, signer: algosdk.makeEmptyTransactionSigner() }],
    boxes: [campaignBoxRef(appId, campaignId)],
    appForeignAssets: [assetId],
    suggestedParams: { ...sp, fee: 3000 },
  })
  const group = await atc.buildGroup()
  return group.map((txn) => algosdk.encodeUnsignedTransaction(txn))
}

export async function waitForTxn(txId: string, rounds = 4): Promise<void> {
  await algosdk.waitForConfirmation(getAlgod(), txId, rounds)
}

export async function isTxnConfirmed(txId: string): Promise<boolean> {
  try {
    const pending = await getAlgod().pendingTransactionInformation(txId).do()
    return Boolean(pending['confirmed-round'])
  } catch {
    return false
  }
}
