/**
 * Verify humanitarian contracts are deployed and funded on testnet.
 */
import algosdk from 'algosdk'
import * as dotenv from 'dotenv'

dotenv.config()

const USDC = Number(process.env.VITE_STABLECOIN_ASSET_ID || 31566704)
const MIN_ALGO = 100_000 // 0.1 ALGO (microalgos)

async function main() {
  const disasterId = Number(process.env.VITE_DISASTER_APP_ID)
  const appealsId = Number(process.env.VITE_APPEALS_APP_ID)
  const admin = process.env.VITE_ADMIN_ADDRESS

  if (!disasterId || !appealsId) {
    console.error('FAIL: Set VITE_DISASTER_APP_ID and VITE_APPEALS_APP_ID in .env')
    process.exit(1)
  }

  const algod = new algosdk.Algodv2(
    process.env.ALGOD_TOKEN || '',
    process.env.ALGOD_SERVER || process.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
    process.env.ALGOD_PORT || '443',
  )

  let ok = true
  const check = (label: string, pass: boolean, detail?: string) => {
    console.log(pass ? `OK  ${label}` : `FAIL ${label}`, detail ?? '')
    if (!pass) ok = false
  }

  for (const [name, appId] of [
    ['DisasterVault', disasterId],
    ['CommunityDonationHub', appealsId],
  ] as const) {
    const appAddr = algosdk.getApplicationAddress(appId)
    const info = await algod.accountInformation(appAddr).do()
    const algo = Number(info.amount)
    check(`${name} app ${appId} ALGO balance`, algo >= MIN_ALGO, `${algo / 1e6} ALGO`)

    if (name === 'DisasterVault') {
      const assets = (info.assets as { 'asset-id': number; amount: number }[]) ?? []
      const usdc = assets.find((a) => a['asset-id'] === USDC)
      check('DisasterVault USDC opt-in', Boolean(usdc), usdc ? `${usdc.amount} micro` : 'not opted in')
    }
  }

  if (admin) {
    const adminInfo = await algod.accountInformation(admin).do()
    check('Admin wallet funded', Number(adminInfo.amount) >= MIN_ALGO)
  } else {
    check('VITE_ADMIN_ADDRESS set', false)
  }

  for (const key of ['VITE_DISASTER_APPROVER_0', 'VITE_DISASTER_APPROVER_1', 'VITE_DISASTER_APPROVER_2']) {
    const addr = process.env[key]
    if (!addr) {
      check(`${key} set`, false)
      continue
    }
    const info = await algod.accountInformation(addr).do()
    check(`${key} funded`, Number(info.amount) >= MIN_ALGO, addr.slice(0, 12))
  }

  check('VITE_USE_REAL_CONTRACT=true', process.env.VITE_USE_REAL_CONTRACT === 'true')
  check('VITE_DEMO_STRICT', process.env.VITE_DEMO_STRICT === 'true', process.env.VITE_DEMO_STRICT)

  process.exit(ok ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
