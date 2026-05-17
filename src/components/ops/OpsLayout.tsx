import { type ReactNode, useState } from 'react'
import { Sidebar, PageHeader } from '../ui'
import DemoBanner from './DemoBanner'
import { useOpsSession } from '../../context/OpsSessionContext'
import { useAlgodStatus } from '../../hooks/useAlgodStatus'

interface Props {
  children: ReactNode
  title: string
  description?: string
  breadcrumb?: string
  headerActions?: ReactNode
}

export default function OpsLayout({ children, title, description, breadcrumb, headerActions }: Props) {
  const { isDemoMode } = useOpsSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useAlgodStatus()

  return (
    <div className="min-h-screen bg-bg-primary">
      {isDemoMode ? <DemoBanner /> : null}
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="ops-main-shell flex min-h-screen flex-col">
        <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 border-b border-border-subtle bg-bg-surface px-4 py-3">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setSidebarOpen(true)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center border border-border-medium p-2 font-mono text-xs text-text-primary"
          >
            MENU
          </button>
          <span className="font-serif text-lg text-text-primary">ALGOVAULT</span>
        </div>
        <main className="flex-1 p-6 sm:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-6xl">
            <PageHeader title={title} description={description} breadcrumb={breadcrumb} actions={headerActions} />
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
