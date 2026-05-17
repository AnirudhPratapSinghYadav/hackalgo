import type { LucideIcon } from 'lucide-react'
import {
  Home,
  AlertTriangle,
  CheckCircle,
  ArrowRightCircle,
  Map,
  Settings,
  Layers,
} from 'lucide-react'
import { ROUTES } from './routes'
import { DEMO_CORE_FOCUS } from './demoFocus'

export interface OpsNavItem {
  path: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

const ALL_OPS_NAV_ITEMS: OpsNavItem[] = [
  { path: ROUTES.operations, label: 'Overview', icon: Home, exact: true },
  { path: ROUTES.operationsEvents, label: 'Active Events', icon: AlertTriangle },
  { path: ROUTES.operationsVerification, label: 'Approvals', icon: CheckCircle },
  { path: ROUTES.operationsDisbursements, label: 'Release & proof', icon: ArrowRightCircle },
  { path: ROUTES.operationsMap, label: 'Incident Map', icon: Map },
  { path: ROUTES.operationsSettings, label: 'Settings', icon: Settings },
]

/** Community appeals queue — hidden during core disaster demo. */
const COMMUNITY_OPS_NAV: OpsNavItem = {
  path: ROUTES.operationsCommunityQueue,
  label: 'Appeals',
  icon: Layers,
}

export const OPS_NAV_ITEMS: OpsNavItem[] = DEMO_CORE_FOCUS
  ? ALL_OPS_NAV_ITEMS
  : [
      ...ALL_OPS_NAV_ITEMS.slice(0, 3),
      COMMUNITY_OPS_NAV,
      ...ALL_OPS_NAV_ITEMS.slice(3),
    ]
