/**
 * Export on-chain verification bundle for judges (JSON + Lora URLs).
 * npx tsx scripts/export_lora_verification.ts
 */
import algosdk from 'algosdk'
import * as fs from 'node:fs'
import * as dotenv from 'dotenv'

dotenv.config()

const DISASTER = Number(process.env.VITE_DISASTER_APP_ID)
const APPEALS = Number(process.env.VITE_APPEALS_APP_ID)
const USDC = Number(process.env.VITE_STABLECOIN_ASSET_ID || 31566704)

function decodeGlobal(gs: { key: string; value: { type: number; uint?: number; bytes?: string } }[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const e of gs ?? []) {
    const key = Buffer.from(e.key, 'base64').toString('utf8')
    if (e.value.type === 1) out[key] = e.value.uint
    else if (e.value.bytes) out[key] = Buffer.from(e.value.bytes, 'base64').toString('hex')
  }
  return out
}

async function appBundle(appId: number, label: string) {
  const algod = new algosdk.Algodv2('', process.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud', 443)
  const info = await algod.getApplicationByID(appId).do()
  const addr = algosdk.getApplicationAddress(appId).toString()
  const acct = await algod.accountInformation(addr).do()
  return {
    label,
    appId,
    applicationAddress: addr,
    loraApplicationUrl: `https://lora.algokit.io/testnet/application/${appId}`,
    loraAccountUrl: `https://lora.algokit.io/testnet/account/${addr}`,
    globalState: decodeGlobal(info.params['global-state'] as never),
    account: {
      algoMicro: Number(acct.amount),
      algo: Number(acct.amount) / 1e6,
      assets: ((acct.assets as { 'asset-id': number; amount: number }[]) ?? []).map((a) => ({
        assetId: a['asset-id'],
        amount: a.amount,
        isUsdc: a['asset-id'] === USDC,
      })),
    },
    schema: info.params['global-state-schema'],
  }
}

async function main() {
  if (!DISASTER || !APPEALS) throw new Error('Set VITE_DISASTER_APP_ID and VITE_APPEALS_APP_ID')
  const bundle = {
    network: 'testnet',
    verifiedAt: new Date().toISOString(),
    stablecoinAssetId: USDC,
    contracts: [await appBundle(DISASTER, 'DisasterVault'), await appBundle(APPEALS, 'CommunityDonationHub')],
    loraHint: 'Open loraApplicationUrl → Application tab shows ARC-56 ABI JSON; Global State tab shows decoded key-values.',
  }
  const path = 'scripts/bot/data/lora-verification.json'
  fs.mkdirSync('scripts/bot/data', { recursive: true })
  fs.writeFileSync(path, JSON.stringify(bundle, null, 2))
  console.log(JSON.stringify(bundle, null, 2))
  console.log('\nWritten:', path)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
