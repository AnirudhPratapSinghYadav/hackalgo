import { NavLink, Outlet } from 'react-router-dom'
import PublicHeader from '../layout/PublicHeader'
import { ROUTES } from '../../config/routes'

const NAV = [
  { to: ROUTES.communityFeed, label: 'Feed' },
  { to: ROUTES.communityCampaigns, label: 'Campaigns' },
  { to: ROUTES.communityCrises, label: 'Crises' },
] as const

export default function CommunityLayout() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <PublicHeader subtitle="Verified humanitarian appeals" />
      <div className="border-b border-border-subtle bg-bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-tertiary">Public transparency</p>
          <h1 className="font-serif text-2xl sm:text-3xl text-text-primary mt-2">Community</h1>
          <p className="mt-2 text-sm text-text-secondary max-w-2xl">
            Post, verify, fund, update, and close — local appeals with on-chain proof. Not a social feed.
          </p>
          <nav className="mt-6 flex flex-wrap gap-1 border-t border-border-subtle pt-4">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-2 text-sm font-mono uppercase tracking-wide transition-colors ${
                    isActive
                      ? 'text-accent-primary border-b-2 border-accent-primary'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
      <Outlet />
    </div>
  )
}
