import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { DailyBucket } from './reportData'

interface ChartProps {
  buckets: DailyBucket[]
}

export function DepositAmountChart({ buckets }: ChartProps) {
  if (buckets.length === 0) return <EmptyChart label="No deposit data available" />
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <Tooltip
            contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #e5e7eb' }}
            formatter={(v) => [`${Number(v).toFixed(2)} ALGO`, 'Deposited']}
          />
          <Bar dataKey="depositAmount" fill="#2563EB" radius={[6, 6, 0, 0]} name="Deposited" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DepositCountChart({ buckets }: ChartProps) {
  if (buckets.length === 0) return <EmptyChart label="No deposit count data" />
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #e5e7eb' }}
            formatter={(v) => [Number(v), 'Deposits']}
          />
          <Bar dataKey="deposits" fill="#7c3aed" radius={[6, 6, 0, 0]} name="Deposits" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BalanceChart({ buckets }: ChartProps) {
  if (buckets.length === 0) return <EmptyChart label="No balance data available" />

  let running = 0
  const balanceData = buckets.map((b) => {
    running += b.depositAmount - b.withdrawAmount
    return { label: b.label, balance: Math.max(0, running) }
  })

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={balanceData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <Tooltip
            contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #e5e7eb' }}
            formatter={(v) => [`${Number(v).toFixed(2)} ALGO`, 'Cumulative']}
          />
          <Line type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ActivityGrid({ buckets }: ChartProps) {
  const allDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const activityMap = new Map<number, number>()
  for (const b of buckets) {
    const d = new Date(b.date + 'T12:00:00')
    const day = d.getDay()
    activityMap.set(day, (activityMap.get(day) ?? 0) + b.deposits)
  }

  return (
    <div className="flex items-center gap-2">
      {allDays.map((name, i) => {
        const count = activityMap.get(i) ?? 0
        const intensity = count === 0 ? 'bg-gray-100' : count === 1 ? 'bg-emerald-200' : count <= 3 ? 'bg-emerald-400' : 'bg-emerald-600'
        return (
          <div key={name} className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-lg ${intensity} transition-colors`} title={`${name}: ${count} deposits`} />
            <span className="text-[9px] text-gray-400 font-medium">{name}</span>
          </div>
        )
      })}
    </div>
  )
}

export function MilestoneProgress({
  milestone,
  totalSaved,
  milestonesAlgo,
}: {
  milestone: number
  totalSaved: number
  milestonesAlgo: { m1: number; m2: number; m3: number }
}) {
  const milestones = [
    { level: 1, name: 'Vault Starter', threshold: milestonesAlgo.m1 },
    { level: 2, name: 'Vault Builder', threshold: milestonesAlgo.m2 },
    { level: 3, name: 'Vault Master', threshold: milestonesAlgo.m3 },
  ]

  return (
    <div className="space-y-3">
      {milestones.map((m) => {
        const pct = Math.min(100, (totalSaved / m.threshold) * 100)
        const earned = milestone >= m.level
        return (
          <div key={m.level}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-semibold ${earned ? 'text-emerald-700' : 'text-gray-600'}`}>
                {m.name} ({m.threshold} ALGO)
              </span>
              <span className={`text-xs font-bold ${earned ? 'text-emerald-600' : 'text-gray-400'}`}>
                {earned ? 'Earned' : `${pct.toFixed(0)}%`}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${earned ? 'bg-emerald-500' : 'bg-blue-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-52 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100">
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  )
}
