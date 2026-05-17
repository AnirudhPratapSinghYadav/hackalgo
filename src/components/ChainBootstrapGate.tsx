import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { isPublicNarrativeRoute } from '../config/routes'
import { useChainBootstrap } from '../hooks/useChainBootstrap'

export default function ChainBootstrapGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const publicNarrative = isPublicNarrativeRoute(pathname)

  // Always warm chain/GDACS in background; never block the cinematic landing or legal pages.
  const { ready, error, isStrict } = useChainBootstrap()

  if (publicNarrative) {
    return <>{children}</>
  }

  if (!ready) {
    return (
      <div className="min-h-[30vh] flex items-center justify-center text-sm text-text-secondary">
        Loading live chain and GDACS data…
      </div>
    )
  }

  if (error && isStrict) {
    return (
      <div className="px-4">
        <div className="max-w-lg mx-auto mt-12 p-6 border border-amber-500/40 rounded-lg bg-bg-surface">
          <h2 className="font-serif text-lg text-text-primary">Live data unavailable</h2>
          <p className="mt-2 text-sm text-text-secondary">{error}</p>
          <p className="mt-2 text-xs text-text-tertiary">
            Deploy contracts and set VITE_DISASTER_APP_ID / VITE_APPEALS_APP_ID, or check GDACS connectivity.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
