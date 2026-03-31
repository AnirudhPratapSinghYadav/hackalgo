import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { buildReportData, type ReportData } from './reportData'
import { downloadReportPdf } from './reportPdf'
import { shareOnWhatsApp, copySummary, shareNative } from './shareUtils'
import { DepositAmountChart, DepositCountChart, BalanceChart, ActivityGrid, MilestoneProgress } from './reportCharts'

const CHART_CONTAINER_ID = 'report-charts-container'

export default function WeeklySavingsReport() {
  const { activeAddress, wallets } = useWallet()

  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchReport = useCallback(async () => {
    if (!activeAddress) return
    setLoading(true)
    setError(null)
    try {
      const report = await buildReportData(activeAddress)
      setData(report)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load report data')
    } finally {
      setLoading(false)
    }
  }, [activeAddress])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  if (!activeAddress) return <Navigate to="/" replace />

  const truncated = `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`
  const disconnect = () => { wallets?.forEach((w) => { if (w.isConnected) w.disconnect() }) }

  const handleDownloadPdf = async () => {
    if (!data) return
    setDownloading(true)
    try {
      await downloadReportPdf(data, CHART_CONTAINER_ID)
    } finally {
      setDownloading(false)
    }
  }

  const handleCopy = () => {
    if (!data) return
    copySummary(data)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] font-sans">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link to="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#7c3aed] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <span className="font-bold text-lg text-gray-900 tracking-tight">AlgoVault</span>
            </Link>
            <span className="text-gray-300 hidden sm:inline">/</span>
            <span className="text-sm font-semibold text-[#2563EB] hidden sm:inline">Savings Report</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-sm text-gray-500 hover:text-[#2563EB] font-medium">&larr; Dashboard</Link>
            <div className="text-sm font-mono text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">{truncated}</div>
            <button onClick={disconnect} className="text-gray-400 hover:text-red-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-8 space-y-6 pb-20">
        {/* HERO */}
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#111827] to-[#1e3a5f]" />
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative px-8 py-10 lg:px-12 lg:py-14">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <div>
                <h1 className="text-white text-2xl sm:text-3xl font-bold tracking-tight">Live Savings Report</h1>
                <p className="text-white/50 text-sm mt-1">
                  {data ? data.periodLabel : 'Loading...'} · All data from Algorand blockchain
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={handleDownloadPdf}
                disabled={downloading || !data}
                className="px-5 py-2.5 bg-white text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-all disabled:opacity-50"
              >
                {downloading ? 'Generating...' : 'Download PDF'}
              </button>
              <button
                onClick={() => data && shareOnWhatsApp(data)}
                disabled={!data}
                className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                Share on WhatsApp
              </button>
              <button
                onClick={() => data && shareNative(data)}
                disabled={!data}
                className="px-5 py-2.5 bg-white/10 text-white text-sm font-semibold rounded-xl hover:bg-white/20 transition-all disabled:opacity-50 border border-white/10"
              >
                Share Report
              </button>
              <button
                onClick={handleCopy}
                disabled={!data}
                className="px-5 py-2.5 bg-white/10 text-white text-sm font-semibold rounded-xl hover:bg-white/20 transition-all disabled:opacity-50 border border-white/10"
              >
                {copied ? 'Copied!' : 'Copy Summary'}
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-gray-200 border-t-[#2563EB] rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-500">Loading on-chain data...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="text-red-700 font-semibold mb-2">Failed to load report</p>
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={fetchReport} className="mt-4 px-5 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl">
              Retry
            </button>
          </div>
        ) : !data?.hasData ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center card-shadow">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No activity yet</h3>
            <p className="text-sm text-gray-500 mb-6">Make your first deposit to generate a savings report.</p>
            <Link to="/dashboard" className="px-6 py-3 bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] text-white text-sm font-semibold rounded-xl">
              Go to Dashboard
            </Link>
          </div>
        ) : data && (
          <>
            {/* STAT CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Saved', value: `${data.totalSaved.toFixed(2)}`, unit: 'ALGO', color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Period Deposits', value: `${data.totalDepositedPeriod.toFixed(2)}`, unit: 'ALGO', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Deposit Streak', value: String(data.streak), unit: 'consecutive', color: 'text-orange-600', bg: 'bg-orange-50' },
                { label: 'Milestone', value: data.milestoneLabel, unit: `${data.milestone}/3`, color: 'text-violet-600', bg: 'bg-violet-50' },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl border border-gray-100 bg-white p-5 card-shadow">
                  <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center ${card.color} mb-3`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  </div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {card.value} <span className="text-sm font-normal text-gray-400">{card.unit}</span>
                  </p>
                </div>
              ))}
            </div>

            {/* CHARTS */}
            <div id={CHART_CONTAINER_ID} className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 card-shadow">
                  <h3 className="font-bold text-gray-900 text-base mb-4">Deposit Amount by Day</h3>
                  <DepositAmountChart buckets={data.dailyBuckets} />
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-6 card-shadow">
                  <h3 className="font-bold text-gray-900 text-base mb-4">Deposit Count by Day</h3>
                  <DepositCountChart buckets={data.dailyBuckets} />
                </div>
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 card-shadow">
                  <h3 className="font-bold text-gray-900 text-base mb-4">Cumulative Balance</h3>
                  <BalanceChart buckets={data.dailyBuckets} />
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-6 card-shadow">
                  <h3 className="font-bold text-gray-900 text-base mb-4">Weekly Activity</h3>
                  <div className="mb-6">
                    <ActivityGrid buckets={data.dailyBuckets} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-base mb-4">Milestone Progress</h3>
                  <MilestoneProgress milestone={data.milestone} totalSaved={data.totalSaved} />
                </div>
              </div>
            </div>

            {/* TRANSACTION PROOF TABLE */}
            <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden card-shadow">
              <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">Transaction Proof</h3>
                  <p className="text-xs text-gray-500 mt-0.5">All data verified on Algorand blockchain</p>
                </div>
                <span className="text-xs text-gray-400">{data.transactions.length} transactions</span>
              </div>
              {data.transactions.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm text-gray-400">No transactions in this period</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
                        <th className="px-6 py-3.5 font-semibold">Date</th>
                        <th className="px-6 py-3.5 font-semibold">Type</th>
                        <th className="px-6 py-3.5 font-semibold text-right">Amount</th>
                        <th className="px-6 py-3.5 font-semibold">Status</th>
                        <th className="px-6 py-3.5 font-semibold">Transaction</th>
                        <th className="px-6 py-3.5 font-semibold text-right">Explorer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.transactions.map((t) => (
                        <tr key={t.txId} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/60 transition-colors">
                          <td className="px-6 py-3.5 text-gray-600 whitespace-nowrap">{t.date}</td>
                          <td className="px-6 py-3.5">
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              t.action === 'Deposit' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'
                            }`}>
                              {t.action || t.type}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right font-semibold text-gray-900">
                            {t.amount > 0 ? `${(t.amount / 1_000_000).toFixed(2)} ALGO` : '—'}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Confirmed</span>
                          </td>
                          <td className="px-6 py-3.5 font-mono text-xs text-gray-400">
                            {t.txId.slice(0, 10)}...{t.txId.slice(-4)}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <a
                              href={t.loraUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:underline font-semibold"
                            >
                              Lora
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 card-shadow flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">Verified on-chain</span> · App {data.appId} · Algorand {data.network} · {new Date(data.generatedAt).toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="px-4 py-2 bg-gradient-to-r from-[#2563EB] to-[#7c3aed] text-white text-xs font-semibold rounded-xl disabled:opacity-50"
                >
                  {downloading ? 'Generating...' : 'Download PDF'}
                </button>
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 border border-gray-200 bg-white text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-50"
                >
                  {copied ? 'Copied!' : 'Copy Summary'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
