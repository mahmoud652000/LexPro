import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { UpdateNotification } from './components/UpdateNotification';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuthStore } from './store/auth';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Cases from './pages/Cases';
import CaseDetail from './pages/CaseDetail';
import Sessions from './pages/Sessions';
import Announcements from './pages/Announcements';
import Tasks from './pages/Tasks';
import Fees from './pages/Fees';
import FeeDetail from './pages/FeeDetail';
import Expenses from './pages/Expenses';
import Courts from './pages/Courts';
import CaseTypes from './pages/CaseTypes';
import AnnouncementTypes from './pages/AnnouncementTypes';
import Templates from './pages/Templates';
import RecycleBin from './pages/RecycleBin';
import LawyerProfile from './pages/LawyerProfile';
import CustomerDossier from './pages/CustomerDossier';
import CourtDossier from './pages/CourtDossier';
import Notifications from './pages/Notifications';
import Backup from './pages/Backup';
import Users from './pages/Users';
import Profile from './pages/Profile';

function ProtectedLayout() {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Layout />;
}

export default function App() {
  return (
    <>
    <UpdateNotification />
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
        <Route path="/customers" element={<ErrorBoundary><Customers /></ErrorBoundary>} />
        <Route path="/customers/:id" element={<ErrorBoundary><CustomerDetail /></ErrorBoundary>} />
        <Route path="/cases" element={<ErrorBoundary><Cases /></ErrorBoundary>} />
        <Route path="/cases/:id" element={<ErrorBoundary><CaseDetail /></ErrorBoundary>} />
        <Route path="/sessions" element={<ErrorBoundary><Sessions /></ErrorBoundary>} />
        <Route path="/announcements" element={<ErrorBoundary><Announcements /></ErrorBoundary>} />
        <Route path="/tasks" element={<ErrorBoundary><Tasks /></ErrorBoundary>} />
        <Route path="/fees" element={<ErrorBoundary><Fees /></ErrorBoundary>} />
        <Route path="/fees/:id" element={<ErrorBoundary><FeeDetail /></ErrorBoundary>} />
        <Route path="/expenses" element={<ErrorBoundary><Expenses /></ErrorBoundary>} />
        <Route path="/customer-dossier" element={<ErrorBoundary><CustomerDossier /></ErrorBoundary>} />
        <Route path="/court-dossier" element={<ErrorBoundary><CourtDossier /></ErrorBoundary>} />
        <Route path="/notifications" element={<ErrorBoundary><Notifications /></ErrorBoundary>} />
        <Route path="/templates" element={<ErrorBoundary><Templates /></ErrorBoundary>} />
        <Route path="/recycle-bin" element={<ErrorBoundary><RecycleBin /></ErrorBoundary>} />
        <Route path="/settings/courts" element={<ErrorBoundary><Courts /></ErrorBoundary>} />
        <Route path="/settings/case-types" element={<ErrorBoundary><CaseTypes /></ErrorBoundary>} />
        <Route path="/settings/announcement-types" element={<ErrorBoundary><AnnouncementTypes /></ErrorBoundary>} />
        <Route path="/settings/lawyer-profile" element={<ErrorBoundary><LawyerProfile /></ErrorBoundary>} />
        <Route path="/settings/backup" element={<ErrorBoundary><Backup /></ErrorBoundary>} />
        <Route path="/users" element={<ErrorBoundary><Users /></ErrorBoundary>} />
        <Route path="/profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
    </>
  );
}
