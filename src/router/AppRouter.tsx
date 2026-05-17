import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { OpsAuthGuard } from '../context/OpsSessionContext'
import { ROUTES } from '../config/routes'

import Landing from '../pages/Landing'
import Access from '../pages/Access'
import About from '../pages/About'
import Protocol from '../pages/Protocol'
import Terms from '../pages/Legal/Terms'
import Privacy from '../pages/Legal/Privacy'
import Disclaimers from '../pages/Legal/Disclaimers'
import CommunityLayout from '../components/community/CommunityLayout'
import CommunityFeedPage from '../pages/community/CommunityFeedPage'
import CommunityCampaignsPage from '../pages/community/CommunityCampaignsPage'
import CommunityCrisesPage from '../pages/community/CommunityCrisesPage'
import CommunityCrisisDetail from '../pages/CommunityCrisisDetail'
import SubmitCrisis from '../pages/SubmitCrisis'
import VerifyCrisis from '../pages/VerifyCrisis'
import CrisisDonate from '../pages/CrisisDonate'
import AppealWithdraw from '../pages/AppealWithdraw'

import CommandCenter from '../pages/operations/CommandCenter'
import Events from '../pages/operations/Events'
import Verification from '../pages/operations/Verification'
import CommunityQueue from '../pages/operations/CommunityQueue'
import Disbursements from '../pages/operations/Disbursements'
import MapView from '../pages/operations/MapView'
import Settings from '../pages/operations/Settings'

import Dashboard from '../pages/Dashboard'
import GuardianVault from '../pages/GuardianVault'
import CommunityReserve from '../pages/CommunityReserve'
import SavingsPact from '../pages/SavingsPact'
import TemptationLock from '../pages/TemptationLock'
import DreamBoard from '../pages/DreamBoard'
import WeeklySavingsReport from '../report/WeeklySavingsReport'
import ProtocolExplorer from '../pages/ProtocolExplorer'
import ChainBootstrapGate from '../components/ChainBootstrapGate'

function OpsRoute({ children }: { children: React.ReactNode }) {
  return <OpsAuthGuard>{children}</OpsAuthGuard>
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <ChainBootstrapGate>
      <Routes>
        <Route path={ROUTES.home} element={<Landing />} />
        <Route path={ROUTES.access} element={<Access />} />
        <Route path={ROUTES.about} element={<About />} />
        <Route path={ROUTES.protocol} element={<Protocol />} />
        <Route path={ROUTES.terms} element={<Terms />} />
        <Route path={ROUTES.privacy} element={<Privacy />} />
        <Route path={ROUTES.disclaimers} element={<Disclaimers />} />

        <Route path="/community" element={<CommunityLayout />}>
          <Route index element={<Navigate to="feed" replace />} />
          <Route path="feed" element={<CommunityFeedPage />} />
          <Route path="campaigns" element={<CommunityCampaignsPage />} />
          <Route path="crises" element={<CommunityCrisesPage />} />
          <Route path="activity" element={<Navigate to="feed" replace />} />
          <Route path="donations" element={<Navigate to="feed" replace />} />
        </Route>
        <Route path="/community/crises/:crisisId" element={<CommunityCrisisDetail />} />
        <Route path="/community/:crisisId" element={<CommunityCrisisDetail />} />
        <Route path={ROUTES.submitCrisis} element={<SubmitCrisis />} />
        <Route path="/verify-crisis/:id" element={<VerifyCrisis />} />
        <Route path="/crisis/:id/donate" element={<CrisisDonate />} />
        <Route path="/appeal/:id/donate" element={<CrisisDonate />} />
        <Route path="/appeal/:id/withdraw" element={<AppealWithdraw />} />

        <Route path={ROUTES.operations} element={<OpsRoute><CommandCenter /></OpsRoute>} />
        <Route path={ROUTES.operationsEvents} element={<OpsRoute><Events /></OpsRoute>} />
        <Route path={ROUTES.operationsVerification} element={<OpsRoute><Verification /></OpsRoute>} />
        <Route path={ROUTES.operationsCommunityQueue} element={<OpsRoute><CommunityQueue /></OpsRoute>} />
        <Route path={ROUTES.operationsDisbursements} element={<OpsRoute><Disbursements /></OpsRoute>} />
        <Route path={ROUTES.operationsBeneficiaries} element={<Navigate to={ROUTES.operationsDisbursements} replace />} />
        <Route path={ROUTES.operationsAudit} element={<Navigate to={`${ROUTES.operationsDisbursements}?tab=proof`} replace />} />
        <Route path={ROUTES.operationsMap} element={<OpsRoute><MapView /></OpsRoute>} />
        <Route path={ROUTES.operationsSettings} element={<OpsRoute><Settings /></OpsRoute>} />

        {/* Sandbox — hidden unless VITE_SHOW_SANDBOX=true */}
        {import.meta.env.VITE_SHOW_SANDBOX === 'true' && (
          <>
        <Route path={ROUTES.sandboxSavings} element={<Dashboard />} />
        <Route path="/sandbox/vault/guardian" element={<GuardianVault />} />
        <Route path="/sandbox/vault/community" element={<CommunityReserve />} />
        <Route path="/sandbox/pact" element={<SavingsPact />} />
        <Route path="/sandbox/temptation-lock" element={<TemptationLock />} />
        <Route path="/sandbox/dream-board" element={<DreamBoard />} />
        <Route path="/sandbox/report" element={<WeeklySavingsReport />} />
        <Route path={ROUTES.internalExplorer} element={<ProtocolExplorer />} />
          </>
        )}

        <Route path="/sandbox/*" element={<Navigate to={ROUTES.operations} replace />} />
        <Route path="/lab/*" element={<Navigate to={ROUTES.operations} replace />} />
        <Route path="/dashboard" element={<Navigate to={ROUTES.operations} replace />} />
        <Route path="/vault/*" element={<Navigate to={ROUTES.operations} replace />} />
        <Route path="/pact" element={<Navigate to={ROUTES.operations} replace />} />
        <Route path="/dream-board" element={<Navigate to={ROUTES.operations} replace />} />
        <Route path="/temptation-lock" element={<Navigate to={ROUTES.operations} replace />} />
        <Route path="/report" element={<Navigate to={ROUTES.operations} replace />} />

        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </Routes>
      </ChainBootstrapGate>
    </BrowserRouter>
  )
}
