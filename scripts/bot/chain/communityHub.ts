import algosdk from 'algosdk'
import { requireAppealsApp } from '../config.js'
import { getAlgod, suggestedParams } from './network.js'
import { loadArc56, methodByName } from './arc56.js'

const spec = loadArc56('CommunityDonationHub')

function appealBoxName(appealId: number): Uint8Array {
  const name = new Uint8Array(8)
  new DataView(name.buffer).setBigUint64(0, BigInt(appealId))
  return name
}

function appealBoxRef(appId: number, appealId: number): algosdk.BoxReference {
  return { appIndex: appId, name: appealBoxName(appealId) }
}

export async function readAppealCount(): Promise<number> {
  const appId = requireAppealsApp()
  const info = await getAlgod().getApplicationByID(appId).do()
  const gs = info.params['global-state'] as { key: string; value: { uint: number } }[] | undefined
  const key = Buffer.from('appeal_count').toString('base64')
  return gs?.find((e) => e.key === key)?.value?.uint ?? 0
}

export async function readAppeal(appealId: number): Promise<{ target: number; raised: number; status: number }> {
  const appId = requireAppealsApp()
  const sp = await suggestedParams()
  const atc = new algosdk.AtomicTransactionComposer()
  const sender = algosdk.getApplicationAddress(appId).toString()
  await atc.addMethodCall({
    appID: appId,
    sender,
    signer: algosdk.makeEmptyTransactionSigner(),
    method: methodByName(spec, 'get_appeal'),
    methodArgs: [BigInt(appealId)],
    boxes: [appealBoxRef(appId, appealId)],
    suggestedParams: sp,
  })
  const result = await atc.simulate(getAlgod())
  const raw = result.methodResults[0]?.returnValue
  if (!(raw instanceof Uint8Array)) throw new Error(`Appeal #${appealId} not found`)
  const d = algosdk.ABIType.from('(uint64,uint64,uint64)').decode(raw) as bigint[]
  return { target: Number(d[0]), raised: Number(d[1]), status: Number(d[2]) }
}

export async function createAppealOnChain(
  sender: string,
  senderSk: Uint8Array,
  input: { targetMicroAlgo: number; beneficiary: string; metadataUri: string },
): Promise<{ txId: string; appealId: number }> {
  const appId = requireAppealsApp()
  const count = await readAppealCount()
  const nextId = count + 1
  const sp = await suggestedParams()
  const atc = new algosdk.AtomicTransactionComposer()
  const signer: algosdk.TransactionSigner = async (txnGroup, indexes) =>
    indexes.map((i) => txnGroup[i].signTxn(senderSk))
  await atc.addMethodCall({
    appID: appId,
    sender,
    signer,
    method: methodByName(spec, 'create_appeal'),
    methodArgs: [BigInt(input.targetMicroAlgo), input.beneficiary, input.metadataUri],
    boxes: [appealBoxRef(appId, nextId)],
    suggestedParams: sp,
  })
  const result = await atc.execute(getAlgod(), 4)
  const txId = result.txIDs[0]
  if (!txId) throw new Error('No tx id from create_appeal')
  const ret = result.methodResults[0]?.returnValue
  const appealId =
    ret instanceof Uint8Array ? Number(algosdk.ABIType.from('uint64').decode(ret)) : nextId
  return { txId, appealId }
}

export function appealStatusLabel(status: number): string {
  if (status === 0) return 'pending admin approval'
  if (status === 1) return 'active (donations open)'
  if (status === 2) return 'closed'
  return `unknown (${status})`
}
