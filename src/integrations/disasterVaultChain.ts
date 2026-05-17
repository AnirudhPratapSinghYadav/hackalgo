/**
 * DisasterVault chain layer — ARC-56 / algosdk v2 ATC (USDC ASA + multi-approver).
 * Enable with VITE_USE_REAL_CONTRACT=true and VITE_DISASTER_APP_ID.
 */

import algosdk from 'algosdk'
import type { SignTransactionsFn } from '../services/algorand'
import { getExplorerApplicationUrl, getExplorerTransactionUrl } from '../services/algorand'
import { getNetworkConfig } from '../services/networkConfig'
import { executeAtcAndConfirm, makeSigner } from '../services/txPipeline'
import disasterSpec from '../contracts/DisasterVault.arc56.json'

const APP_ID = Number(import.meta.env.VITE_DISASTER_APP_ID) || 0
const DEFAULT_ASA = Number(import.meta.env.VITE_STABLECOIN_ASSET_ID || 31566704)

type Arc56Method = { name: string; args: { type: string; name: string }[]; returns: { type: string } }

const METHODS = disasterSpec.methods as Arc56Method[]

export function isRealContractEnabled(): boolean {
  return import.meta.env.VITE_USE_REAL_CONTRACT === 'true' && APP_ID > 0
}

export function getDisasterVaultConfig() {
  return {
    appId: APP_ID,
    assetId: DEFAULT_ASA,
    enabled: isRealContractEnabled(),
    network: import.meta.env.VITE_NETWORK ?? 'testnet',
  }
}

function methodByName(name: string): algosdk.ABIMethod {
  const m = METHODS.find((x) => x.name === name)
  if (!m) throw new Error(`Method ${name} not in DisasterVault spec`)
  return new algosdk.ABIMethod({
    name: m.name,
    args: m.args.map((a) => ({ type: a.type, name: a.name })),
    returns: m.returns,
  })
}

function getAlgod(): algosdk.Algodv2 {
  const { algod } = getNetworkConfig()
  return new algosdk.Algodv2(algod.token, algod.server, algod.port)
}

async function suggestedParams(): Promise<algosdk.SuggestedParams> {
  const sp = await getAlgod().getTransactionParams().do()
  return { ...sp, flatFee: true, fee: 2000 }
}

function campaignBoxName(campaignId: number): Uint8Array {
  const name = new Uint8Array(8)
  const view = new DataView(name.buffer)
  view.setBigUint64(0, BigInt(campaignId))
  return name
}

function campaignBoxRef(campaignId: number): algosdk.BoxReference {
  return { appIndex: APP_ID, name: campaignBoxName(campaignId) }
}

function decodeGlobalKey(key: string | Uint8Array): string {
  try {
    if (key instanceof Uint8Array) {
      return new TextDecoder().decode(key).replace(/\0/g, '')
    }
    return Buffer.from(key, 'base64').toString('utf8').replace(/\0/g, '')
  } catch {
    return ''
  }
}

function bytesToUint8Array(bytesField: string | Uint8Array | undefined): Uint8Array | null {
  if (!bytesField) return null
  if (bytesField instanceof Uint8Array) return bytesField
  try {
    return Uint8Array.from(Buffer.from(bytesField, 'base64'))
  } catch {
    return null
  }
}

async function readGlobalState(): Promise<
  { key: string | Uint8Array; value: { uint?: number; bytes?: string | Uint8Array } }[]
> {
  const info = await getAlgod().getApplicationByID(APP_ID).do()
  return (
    (info.params['global-state'] as {
      key: string | Uint8Array
      value: { uint?: number; bytes?: string | Uint8Array }
    }[]) ?? []
  )
}

async function readCampaignCount(): Promise<number> {
  const gs = await readGlobalState()
  const entry = gs.find((e) => decodeGlobalKey(e.key) === 'campaign_count')
  return entry?.value?.uint ?? 0
}

const ZERO_ADDR = algosdk.encodeAddress(new Uint8Array(32))

/** Returns on-chain admin address, or null if unset / zero. */
export async function readVaultAdmin(): Promise<string | null> {
  if (!APP_ID) return null
  const gs = await readGlobalState()
  const entry = gs.find((e) => decodeGlobalKey(e.key) === 'admin')
  const raw = bytesToUint8Array(entry?.value?.bytes)
  if (!raw || raw.length !== 32) return null
  const addr = algosdk.encodeAddress(raw)
  if (addr === ZERO_ADDR) return null
  return addr
}

export function uniqueApprovers(): string[] {
  const raw = [
    import.meta.env.VITE_DISASTER_APPROVER_0,
    import.meta.env.VITE_DISASTER_APPROVER_1,
    import.meta.env.VITE_DISASTER_APPROVER_2,
    import.meta.env.VITE_ADMIN_ADDRESS,
  ].filter(Boolean) as string[]
  const out: string[] = []
  const seen = new Set<string>()
  for (const a of raw) {
    if (!algosdk.isValidAddress(a)) continue
    const k = a.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(a)
    if (out.length >= 5) break
  }
  return out
}

async function executeAtc(atc: algosdk.AtomicTransactionComposer): Promise<{
  txId: string
  methodResults: algosdk.ABIResult[]
}> {
  const { txId, methodResults } = await executeAtcAndConfirm(atc)
  return { txId, methodResults }
}

export interface CreateCampaignParams {
  name: string
  targetMicroUsdc: number
  region: string
  approvers: string[]
  threshold: number
  expiryRound: number
  assetId?: number
}

export async function createCampaignOnChain(
  adminSender: string,
  signTransactions: SignTransactionsFn,
  params: CreateCampaignParams,
): Promise<{ txId: string; campaignId: number }> {
  if (!isRealContractEnabled()) throw new Error('Real contract disabled (VITE_USE_REAL_CONTRACT)')
  const sp = await suggestedParams()
  const nextId = (await readCampaignCount()) + 1
  const atc = new algosdk.AtomicTransactionComposer()
  await atc.addMethodCall({
    appID: APP_ID,
    sender: adminSender,
    signer: makeSigner(signTransactions),
    method: methodByName('create_campaign'),
    methodArgs: [
      params.name,
      BigInt(params.targetMicroUsdc),
      params.region,
      params.approvers,
      BigInt(params.threshold),
      BigInt(params.expiryRound),
      BigInt(params.assetId ?? DEFAULT_ASA),
    ],
    boxes: [campaignBoxRef(nextId)],
    suggestedParams: { ...sp, fee: 8000 },
  })
  const { txId, methodResults } = await executeAtc(atc)
  const ret = methodResults[0]?.returnValue
  if (!(ret instanceof Uint8Array)) throw new Error('create_campaign returned no campaign id')
  const campaignId = Number(algosdk.ABIType.from('uint64').decode(ret))
  if (!campaignId) throw new Error('Invalid campaign id from chain')
  return { txId, campaignId }
}

export async function donateToCampaignOnChain(
  sender: string,
  signTransactions: SignTransactionsFn,
  campaignId: number,
  amountMicroUsdc: number,
  assetId: number = DEFAULT_ASA,
): Promise<string> {
  if (!isRealContractEnabled()) throw new Error('Real contract disabled')
  const sp = await suggestedParams()
  const appAddr = algosdk.getApplicationAddress(APP_ID).toString()
  const axfer = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: sender,
    to: appAddr,
    assetIndex: assetId,
    amount: amountMicroUsdc,
    suggestedParams: { ...sp, fee: 1000 },
  })
  const atc = new algosdk.AtomicTransactionComposer()
  atc.addTransaction({ txn: axfer, signer: makeSigner(signTransactions) })
  await atc.addMethodCall({
    appID: APP_ID,
    sender,
    signer: makeSigner(signTransactions),
    method: methodByName('donate'),
    methodArgs: [BigInt(campaignId), { txn: axfer, signer: makeSigner(signTransactions) }],
    boxes: [campaignBoxRef(campaignId)],
    appForeignAssets: [assetId],
    suggestedParams: { ...sp, fee: 3000 },
  })
  const { txId } = await executeAtc(atc)
  return txId
}

export async function approveCampaignOnChain(
  approver: string,
  signTransactions: SignTransactionsFn,
  campaignId: number,
): Promise<string> {
  if (!isRealContractEnabled()) throw new Error('Real contract disabled')
  const sp = await suggestedParams()
  const atc = new algosdk.AtomicTransactionComposer()
  await atc.addMethodCall({
    appID: APP_ID,
    sender: approver,
    signer: makeSigner(signTransactions),
    method: methodByName('submit_approval'),
    methodArgs: [BigInt(campaignId)],
    boxes: [campaignBoxRef(campaignId)],
    suggestedParams: sp,
  })
  const { txId } = await executeAtc(atc)
  return txId
}

export async function disburseCampaignOnChain(
  sender: string,
  signTransactions: SignTransactionsFn,
  campaignId: number,
  beneficiaries: string[],
  amountsMicroUsdc: number[],
): Promise<string> {
  if (!isRealContractEnabled()) throw new Error('Real contract disabled')
  const sp = await suggestedParams()
  const atc = new algosdk.AtomicTransactionComposer()
  await atc.addMethodCall({
    appID: APP_ID,
    sender,
    signer: makeSigner(signTransactions),
    method: methodByName('disburse'),
    methodArgs: [BigInt(campaignId), beneficiaries, amountsMicroUsdc.map((a) => BigInt(a))],
    boxes: [campaignBoxRef(campaignId)],
    suggestedParams: { ...sp, fee: 12000 },
  })
  const { txId } = await executeAtc(atc)
  return txId
}

export async function expireCampaignOnChain(
  sender: string,
  signTransactions: SignTransactionsFn,
  campaignId: number,
): Promise<string> {
  if (!isRealContractEnabled()) throw new Error('Real contract disabled')
  const sp = await suggestedParams()
  const atc = new algosdk.AtomicTransactionComposer()
  await atc.addMethodCall({
    appID: APP_ID,
    sender,
    signer: makeSigner(signTransactions),
    method: methodByName('expire'),
    methodArgs: [BigInt(campaignId)],
    suggestedParams: sp,
  })
  const { txId } = await executeAtc(atc)
  return txId
}

export async function readCampaignOnChain(campaignId: number): Promise<{
  target: number
  raised: number
  approvalCount: number
  threshold: number
  status: number
}> {
  const sp = await suggestedParams()
  const atc = new algosdk.AtomicTransactionComposer()
  const sender = algosdk.getApplicationAddress(APP_ID).toString()
  await atc.addMethodCall({
    appID: APP_ID,
    sender,
    signer: algosdk.makeEmptyTransactionSigner(),
    method: methodByName('get_campaign'),
    methodArgs: [BigInt(campaignId)],
    suggestedParams: sp,
  })
  const result = await atc.simulate(getAlgod())
  const raw = result.methodResults[0]?.returnValue
  if (!(raw instanceof Uint8Array)) throw new Error('simulate failed')
  const d = algosdk.ABIType.from('(uint64,uint64,uint64,uint64,uint64)').decode(raw) as bigint[]
  return {
    target: Number(d[0]),
    raised: Number(d[1]),
    approvalCount: Number(d[2]),
    threshold: Number(d[3]),
    status: Number(d[4]),
  }
}

export function statusLabel(code: number): string {
  if (code === 1) return 'Awaiting Approvals'
  if (code === 2) return 'Approved — Ready to Disburse'
  if (code === 3) return 'Funds Disbursed'
  if (code === 4) return 'Expired'
  return 'Unknown'
}

export { getExplorerTransactionUrl, getExplorerApplicationUrl }
