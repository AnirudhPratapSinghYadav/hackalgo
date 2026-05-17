import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { usePlatformStore } from './platformStore'

export type SystemHealthStatus = 'operational' | 'attention' | 'critical'

export interface SystemHealthItem {
  id: string
  label: string
  status: SystemHealthStatus
  detail: string
}

interface OpsUiState {
  isDemoMode: boolean
  networkLabel: string
  networkBlock: number
  systemHealth: SystemHealthItem[]
  setDemoMode: (enabled: boolean) => void
  setNetworkBlock: (block: number) => void
}

export const useOpsStore = create<OpsUiState>()(
  persist(
    (set) => ({
      isDemoMode: false,
      networkLabel: 'Algorand',
      networkBlock: 0,
      systemHealth: [],
      setDemoMode: (enabled) => {
        set({ isDemoMode: enabled })
        usePlatformStore.getState().setSessionMode(enabled ? 'demo' : 'wallet')
      },
      setNetworkBlock: (block) => set({ networkBlock: block }),
    }),
    {
      name: 'algovault-ops',
      partialize: (s) => ({ isDemoMode: s.isDemoMode }),
    },
  ),
)

/** Operational data — always read from platform store */
export function useOpsData() {
  const events = usePlatformStore((s) => s.disasterEvents)
  const disbursements = usePlatformStore((s) => s.disbursements)
  const approvals = usePlatformStore((s) => s.approvals)
  const approvalRecords = usePlatformStore((s) => s.approvalRecords)
  const batches = usePlatformStore((s) => s.disbursementBatches)
  const auditEntries = usePlatformStore((s) => s.auditEntries)
  const campaigns = usePlatformStore((s) => s.campaigns)
  const platformDataMode = usePlatformStore((s) => s.platformDataMode)
  const pendingApprovals = events.filter((e) => e.opsStatus === 'approval_pending').length
  const verifiedEvents = events.filter((e) => e.opsStatus !== 'detected' && e.opsStatus !== 'approval_pending').length
  return {
    events,
    disbursements,
    approvals,
    approvalRecords,
    batches,
    auditEntries,
    campaigns,
    platformDataMode,
    pendingApprovals,
    verifiedEvents,
  }
}
