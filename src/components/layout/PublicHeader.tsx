import { Link } from 'react-router-dom'
import { DEMO_CORE_FOCUS } from '../../config/demoFocus'

interface PublicHeaderProps {
  subtitle?: string
  action?: { label: string; to: string }
}

export default function PublicHeader({ subtitle, action }: PublicHeaderProps) {
  return (
    <header className="bg-bg-surface border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
        <div>
          <Link to="/" className="font-serif text-xl text-text-primary hover:text-accent-primary transition-colors">
            ALGOVAULT
          </Link>
          {subtitle ? <p className="text-sm text-text-secondary mt-1">{subtitle}</p> : null}
        </div>
        <nav className="flex items-center gap-3 sm:gap-4 text-sm">
          {!DEMO_CORE_FOCUS ? (
            <Link to="/community" className="text-text-secondary hover:text-text-primary hidden sm:inline">
              Community
            </Link>
          ) : null}
          <Link to="/access" className="text-text-secondary hover:text-text-primary hidden sm:inline">
            Access
          </Link>
          <Link to="/legal/disclaimers" className="text-text-secondary hover:text-text-primary hidden md:inline text-xs">
            Legal
          </Link>
          {action ? (
            <Link
              to={action.to}
              className="px-4 sm:px-6 py-2.5 bg-accent-primary text-text-inverse font-medium text-sm hover:bg-accent-hover transition-colors whitespace-nowrap"
            >
              {action.label}
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  )
}
