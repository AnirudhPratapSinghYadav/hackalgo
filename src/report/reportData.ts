import { getTransactionHistory, getUserStats, getGlobalStats } from '../services/algorand'
import { getNetworkConfig } from '../services/networkConfig'

export interface ReportTxn {
  txId: string
  amount: number
  type: string
  action: string
  timestamp: number
  loraUrl: string
  date: string
}

export interface DailyBucket {
  date: string
  label: string
  deposits: number
  depositAmount: number
  withdrawals: number
  withdrawAmount: number
}

export interface ReportData {
  address: string
  truncatedAddress: string
  appId: number
  network: string
  generatedAt: string
  periodLabel: string
  totalSaved: number
  totalDepositedPeriod: number
  totalWithdrawnPeriod: number
  streak: number
  milestone: number
  milestoneLabel: string
  milestonesAlgo: { m1: number; m2: number; m3: number }
  globalDeposited: number
  globalUsers: number
  transactions: ReportTxn[]
  dailyBuckets: DailyBucket[]
  hasData: boolean
}

const MILESTONE_NAMES: Record<number, string> = {
  0: 'No badge yet',
  1: 'Vault Starter',
  2: 'Vault Builder',
  3: 'Vault Master',
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function dateKey(ts: number): string {
  const d = new Date(ts * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dayLabel(key: string): string {
  const d = new Date(key + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export async function buildReportData(address: string): Promise<ReportData> {
  const appId = Number(import.meta.env.VITE_APP_ID)
  const network = getNetworkConfig().network

  const [rawTxns, userStats, globalStats] = await Promise.all([
    getTransactionHistory(address, 50),
    getUserStats(address).catch(() => ({ totalSaved: 0, milestone: 0, streak: 0, lastDeposit: 0 })),
    getGlobalStats(),
  ])

  const now = Math.floor(Date.now() / 1000)
  const sevenDaysAgo = now - 7 * 24 * 60 * 60

  const recentTxns = rawTxns
    .filter((t) => t.timestamp > 0)
    .sort((a, b) => b.timestamp - a.timestamp)

  const periodTxns = recentTxns.filter((t) => t.timestamp >= sevenDaysAgo)

  const transactions: ReportTxn[] = recentTxns.slice(0, 30).map((t) => ({
    ...t,
    date: formatDate(t.timestamp),
  }))

  const effectiveTxns = periodTxns.length > 0 ? periodTxns : recentTxns.slice(0, 10)
  const periodLabel = periodTxns.length > 0
    ? 'Last 7 days'
    : recentTxns.length > 0
      ? 'Available Activity Window'
      : 'No activity yet'

  let totalDepositedPeriod = 0
  let totalWithdrawnPeriod = 0

  const bucketMap = new Map<string, DailyBucket>()

  for (const t of effectiveTxns) {
    const key = dateKey(t.timestamp)
    if (!bucketMap.has(key)) {
      bucketMap.set(key, { date: key, label: dayLabel(key), deposits: 0, depositAmount: 0, withdrawals: 0, withdrawAmount: 0 })
    }
    const bucket = bucketMap.get(key)!
    const algoAmount = t.amount / 1_000_000

    if (t.action === 'Deposit' && t.amount > 0) {
      bucket.deposits++
      bucket.depositAmount += algoAmount
      totalDepositedPeriod += algoAmount
    } else if (t.type === 'pay' && t.amount > 0) {
      bucket.withdrawals++
      bucket.withdrawAmount += algoAmount
      totalWithdrawnPeriod += algoAmount
    }
  }

  const dailyBuckets = Array.from(bucketMap.values()).sort((a, b) => a.date.localeCompare(b.date))

  return {
    address,
    truncatedAddress: `${address.slice(0, 8)}...${address.slice(-6)}`,
    appId,
    network,
    generatedAt: new Date().toISOString(),
    periodLabel,
    totalSaved: userStats.totalSaved / 1_000_000,
    totalDepositedPeriod,
    totalWithdrawnPeriod,
    streak: userStats.streak,
    milestone: userStats.milestone,
    milestoneLabel: MILESTONE_NAMES[userStats.milestone] ?? `Level ${userStats.milestone}`,
    milestonesAlgo: {
      m1: globalStats.milestones.m1 / 1_000_000,
      m2: globalStats.milestones.m2 / 1_000_000,
      m3: globalStats.milestones.m3 / 1_000_000,
    },
    globalDeposited: globalStats.totalDeposited / 1_000_000,
    globalUsers: globalStats.totalUsers,
    transactions,
    dailyBuckets,
    hasData: recentTxns.length > 0,
  }
}
