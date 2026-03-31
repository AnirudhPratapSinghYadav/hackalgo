import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useWallet } from '@txnlab/use-wallet-react';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import GuardianVault from './pages/GuardianVault';
import CommunityReserve from './pages/CommunityReserve';
import SavingsPact from './pages/SavingsPact';
import TemptationLock from './pages/TemptationLock';
import DreamBoard from './pages/DreamBoard';
import WeeklySavingsReport from './report/WeeklySavingsReport';

function App() {
  const { activeAddress } = useWallet();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={activeAddress ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/dashboard" element={activeAddress ? <Dashboard /> : <Navigate to="/" replace />} />
        <Route path="/vault/guardian" element={activeAddress ? <GuardianVault /> : <Navigate to="/" replace />} />
        <Route path="/vault/community" element={activeAddress ? <CommunityReserve /> : <Navigate to="/" replace />} />
        <Route path="/pact" element={activeAddress ? <SavingsPact /> : <Navigate to="/" replace />} />
        <Route path="/temptation-lock" element={activeAddress ? <TemptationLock /> : <Navigate to="/" replace />} />
        <Route path="/dream-board" element={activeAddress ? <DreamBoard /> : <Navigate to="/" replace />} />
        <Route path="/report" element={activeAddress ? <WeeklySavingsReport /> : <Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
