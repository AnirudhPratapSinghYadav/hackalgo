import { Link, useLocation, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { OPS_NAV_ITEMS } from '../../config/opsNav'
import { ROUTES } from '../../config/routes'
import { useOpsSession } from '../../context/OpsSessionContext'
import { useOpsStore } from '../../store/opsStore'
import StatusBadge from './StatusBadge'

interface SidebarProps {
  mobileOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { address, disconnect } = useOpsSession()
  const networkLabel = useOpsStore((s) => s.networkLabel)
  const networkBlock = useOpsStore((s) => s.networkBlock)

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path)

  const body = (
    <>
      <div className="p-5 border-b border-border-subtle">
        <Link
          to={ROUTES.home}
          className="font-serif text-lg text-text-primary hover:text-accent-primary transition-colors"
          onClick={onClose}
        >
          ALGOVAULT
        </Link>
        <div className="mt-5 flex items-center gap-3">
          <div
            className="w-9 h-9 shrink-0 bg-accent-primary flex items-center justify-center text-text-inverse text-xs font-mono font-medium"
            aria-hidden
          >
            RO
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary">Operations Console</p>
            <p className="text-[11px] font-mono text-text-tertiary truncate mt-0.5">
              {address ? `${address.slice(0, 6)}…` : 'Not connected'}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2" aria-label="Operations navigation">
        {OPS_NAV_ITEMS.map(({ path, label, icon: Icon, exact }) => {
          const active = isActive(path, exact)
          return (
            <Link
              key={path}
              to={path}
              onClick={onClose}
              className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors border-l-[3px] ${
                active
                  ? 'bg-bg-elevated border-accent-primary text-text-primary'
                  : 'border-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
              }`}
            >
              <Icon size={18} strokeWidth={1.5} className="shrink-0" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-5 border-t border-border-subtle bg-bg-surface">
        <StatusBadge variant="operational" dot className="mb-2">
          {networkLabel}
        </StatusBadge>
        <p className="font-mono text-[10px] text-text-tertiary">Block {networkBlock.toLocaleString()}</p>
        <button
          type="button"
          onClick={() => {
            disconnect()
            navigate(ROUTES.access)
          }}
          className="mt-4 text-xs text-text-tertiary hover:text-text-primary transition-colors"
        >
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <>
      <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-sidebar flex-col border-r border-border-subtle bg-bg-surface-secondary shadow-[4px_0_28px_rgba(21,28,24,0.35)]">
        {body}
      </aside>
      {mobileOpen ? (
        <div className="lg:hidden fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-overlay-darker"
            aria-label="Close navigation"
            onClick={onClose}
          />
          <aside className="relative flex flex-col w-sidebar max-w-[85vw] h-full bg-bg-surface border-r border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1 text-text-tertiary hover:text-text-primary z-10"
              aria-label="Close menu"
            >
              <X size={20} strokeWidth={1.5} />
            </button>
            {body}
          </aside>
        </div>
      ) : null}
    </>
  )
}
