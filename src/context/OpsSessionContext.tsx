import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { ROUTES } from '../config/routes'
import type { PlatformRole } from '../domain/platform'
import { useOpsStore } from '../store/opsStore'
import { usePlatformStore } from '../store/platformStore'

export type WalletProviderId = 'pera' | 'defly' | 'wc'

const ROLE_LABELS: Record<PlatformRole, string> = {
  admin: 'System administrator',
  ngo_coordinator: 'NGO coordinator',
  district_officer: 'District officer',
  verifier: 'Field verifier',
  donor: 'Donor',
  public_viewer: 'Public viewer',
  auditor: 'Auditor',
  beneficiary_operator: 'Beneficiary operator',
}

interface OpsSession {
  address: string | null
  isDemoMode: boolean
  role: PlatformRole
  roleLabel: string
  organizationId: string | null
  connect: (provider: WalletProviderId) => Promise<void>
  enterDemoMode: () => void
  disconnect: () => void
}

const OpsSessionContext = createContext<OpsSession | null>(null)

export function OpsSessionProvider({ children }: { children: ReactNode }) {
  const { wallets, activeAddress } = useWallet()
  const isDemoMode = useOpsStore((s) => s.isDemoMode)
  const setDemoMode = useOpsStore((s) => s.setDemoMode)
  const session = usePlatformStore((s) => s.session)
  const setSessionWallet = usePlatformStore((s) => s.setSessionWallet)

  useEffect(() => {
    if (!isDemoMode) setSessionWallet(activeAddress ?? null)
  }, [activeAddress, isDemoMode, setSessionWallet])

  const connect = useCallback(
    async (provider: WalletProviderId) => {
      const id = provider === 'wc' ? 'walletconnect' : provider
      const wallet = wallets?.find((w) => String(w.id).toLowerCase() === id)
      if (!wallet) {
        throw new Error(`Wallet ${provider} is not configured`)
      }
      setDemoMode(false)
      if (wallet.isConnected) {
        wallet.setActive()
      } else {
        await wallet.connect()
      }
    },
    [wallets, setDemoMode],
  )

  const enterDemoMode = useCallback(() => {
    wallets?.forEach((w) => {
      if (w.isConnected) void w.disconnect()
    })
    setDemoMode(true)
  }, [wallets, setDemoMode])

  const disconnect = useCallback(() => {
    setDemoMode(false)
    wallets?.forEach((w) => {
      if (w.isConnected) void w.disconnect()
    })
  }, [wallets, setDemoMode])

  const address = isDemoMode ? null : activeAddress ?? null

  const roleLabel = useMemo(() => {
    const roleName = ROLE_LABELS[session.role]
    if (isDemoMode) return `Demo — ${roleName}`
    if (activeAddress) {
      const short = `${activeAddress.slice(0, 6)}…${activeAddress.slice(-4)}`
      return `${roleName} — ${short}`
    }
    return 'Not connected'
  }, [isDemoMode, activeAddress, session.role])

  const value = useMemo(
    () => ({
      address,
      isDemoMode,
      role: session.role,
      roleLabel,
      organizationId: session.organizationId,
      connect,
      enterDemoMode,
      disconnect,
    }),
    [address, isDemoMode, session.role, session.organizationId, roleLabel, connect, enterDemoMode, disconnect],
  )

  return <OpsSessionContext.Provider value={value}>{children}</OpsSessionContext.Provider>
}

export function useOpsSession() {
  const ctx = useContext(OpsSessionContext)
  if (!ctx) throw new Error('useOpsSession must be used within OpsSessionProvider')
  return ctx
}

export function OpsAuthGuard({ children }: { children: ReactNode }) {
  const { isDemoMode } = useOpsSession()
  const { activeAddress } = useWallet()
  const navigate = useNavigate()
  if (!activeAddress && !isDemoMode) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <p className="font-mono text-xs uppercase tracking-label text-text-tertiary">Access required</p>
          <h1 className="font-serif text-2xl text-text-primary mt-3">Operations console</h1>
          <p className="text-text-secondary mt-2 text-sm">
            Connect institutional credentials or enter demonstration mode.
          </p>
          <button
            type="button"
            onClick={() => navigate(ROUTES.access)}
            className="mt-6 px-6 py-3 bg-accent-primary text-text-inverse font-medium hover:bg-accent-hover transition-colors"
          >
            Go to access portal
          </button>
        </div>
      </div>
    )
  }
  return <>{children}</>
}
