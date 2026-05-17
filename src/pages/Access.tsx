import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, Key } from 'lucide-react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useOpsSession } from '../context/OpsSessionContext'
import { usePlatformStore } from '../store/platformStore'
import { DEMO_CORE_FOCUS } from '../config/demoFocus'

export default function Access() {
  const navigate = useNavigate()
  const { wallets } = useWallet()
  const { connect, enterDemoMode } = useOpsSession()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const events = usePlatformStore((s) => s.disasterEvents)
  const disbursements = usePlatformStore((s) => s.disbursements)

  const opsSnapshot = useMemo(() => {
    const liveEvents = events.filter((e) => e.dataSource === 'live')
    const active = liveEvents.filter(
      (e) => e.opsStatus === 'detected' || e.opsStatus === 'in_operations' || e.opsStatus === 'verification_pending',
    ).length
    const pendingApprovals = events.filter((e) => e.opsStatus === 'approval_pending').length
    const lastConfirmed = disbursements
      .filter((d) => d.status === 'confirmed' && d.txnHash && !d.txnHash.startsWith('SIMULATED'))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    const lastDisbLabel = lastConfirmed
      ? formatDistanceToNow(new Date(lastConfirmed.timestamp), { addSuffix: true }).toUpperCase()
      : '—'
    return { active: liveEvents.length ? String(active) : '—', pendingApprovals: String(pendingApprovals), lastDisbLabel }
  }, [events, disbursements])

  const handleWallet = async (provider: 'pera' | 'defly' | 'wc') => {
    setError(null)
    setLoading(provider)
    try {
      await connect(provider)
      navigate('/operations')
    } catch {
      setError('Connection failed. Try again or use demonstration mode.')
    } finally {
      setLoading(null)
    }
  }

  const handleDemo = () => {
    enterDemoMode()
    navigate('/operations')
  }

  const pera = wallets?.find((w) => String(w.id).toLowerCase() === 'pera')
  const defly = wallets?.find((w) => String(w.id).toLowerCase() === 'defly')

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col lg:flex-row">
      <div className="relative lg:w-1/2 min-h-[40vh] lg:min-h-screen bg-bg-elevated overflow-hidden">
        <img
          src="/images/disaster/hero-aerial-flood.jpg"
          alt="Flood plains aerial at dawn"
          className="absolute inset-0 w-full h-full object-cover cinema-img"
        />
        <div className="absolute inset-0 bg-overlay-darker" />
        <div className="absolute inset-0 bg-accent-deep/10" />
        <div className="absolute bottom-6 left-6 right-6 max-w-sm p-5 bg-bg-surface border-l-[3px] border-l-accent-primary">
          <p className="font-mono text-[10px] uppercase tracking-label text-text-tertiary">Operations snapshot</p>
          <p className="mt-1 text-[9px] text-text-tertiary">From live feeds when available — not simulated counts</p>
          <ul className="mt-3 space-y-2 text-xs font-mono">
            <li className="flex justify-between">
              <span className="text-text-tertiary">Active signals</span>
              <span className="text-alert-warning">{opsSnapshot.active}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-text-tertiary">Pending approvals</span>
              <span className="text-text-primary">{opsSnapshot.pendingApprovals}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-text-tertiary">Last disbursement</span>
              <span className="text-accent-primary">{opsSnapshot.lastDisbLabel}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-text-tertiary">Network status</span>
              <span className="text-alert-success">TESTNET READY</span>
            </li>
          </ul>
          <p className="mt-4 font-mono text-[9px] text-text-tertiary">Algorand testnet · humanitarian ops</p>
        </div>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-bg-surface border border-border-medium p-8 sm:p-12">
          <p className="font-serif text-2xl text-text-primary">ALGOVAULT</p>
          <h1 className="font-serif text-3xl font-semibold text-text-primary mt-10">Access humanitarian operations</h1>
          <p className="mt-4 text-text-secondary text-sm leading-relaxed">
            Secure access for disaster response authorities, humanitarian partners, and field verification teams.
          </p>
          <hr className="my-8 border-border-subtle" />
          <p className="font-mono text-[10px] uppercase tracking-label text-text-tertiary">Institutional access</p>
          <div className="mt-4 space-y-3">
            {[
              { id: 'pera' as const, label: 'Continue with Pera', enabled: !!pera },
              { id: 'defly' as const, label: 'Continue with Defly', enabled: !!defly },
              { id: 'wc' as const, label: 'Continue with WalletConnect', enabled: false },
            ].map(({ id, label, enabled }) => (
              <button
                key={id}
                type="button"
                disabled={!enabled || !!loading}
                onClick={() => handleWallet(id)}
                className="w-full flex items-center justify-between px-5 py-4 bg-bg-elevated border border-border-medium hover:border-accent-primary transition-colors disabled:opacity-50 min-h-[44px]"
              >
                <span className="text-sm text-text-primary">{label}</span>
                <ArrowRight size={18} className="text-text-tertiary" />
              </button>
            ))}
            <button
              type="button"
              disabled
              className="w-full flex items-center justify-between px-5 py-4 bg-bg-elevated border border-border-medium opacity-50 min-h-[44px]"
            >
              <span className="flex items-center gap-2 text-sm text-text-primary">
                <Key size={16} />
                Institutional SSO
              </span>
              <span className="text-xs font-mono text-text-tertiary">Soon</span>
            </button>
          </div>
          {error ? <p className="mt-4 text-sm text-alert-critical">{error}</p> : null}
          <div className="my-8 flex items-center gap-3">
            <hr className="flex-1 border-border-subtle" />
            <span className="font-mono text-[10px] text-text-tertiary whitespace-nowrap">OR ACCESS TEST ENVIRONMENT</span>
            <hr className="flex-1 border-border-subtle" />
          </div>
          <button
            type="button"
            onClick={handleDemo}
            className="w-full py-4 bg-accent-primary text-text-inverse font-medium hover:bg-accent-hover transition-colors min-h-[44px]"
          >
            Enter demo operations console
          </button>
          {!DEMO_CORE_FOCUS ? (
            <Link
              to="/community"
              className="mt-4 block w-full py-3 text-center border border-border-medium text-text-secondary hover:border-accent-primary hover:text-text-primary text-sm transition-colors min-h-[44px] flex items-center justify-center"
            >
              Browse community crises (no login)
            </Link>
          ) : null}
          <p className="mt-6 text-xs text-text-tertiary text-center">
            Demo mode: explore the operations console without a wallet. On-chain actions require Pera.
          </p>
        </div>
      </div>
    </div>
  )
}
