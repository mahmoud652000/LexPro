import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { UpdateNotification } from './components/UpdateNotification';
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
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/cases/:id" element={<CaseDetail />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/fees" element={<Fees />} />
        <Route path="/fees/:id" element={<FeeDetail />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/customer-dossier" element={<CustomerDossier />} />
        <Route path="/court-dossier" element={<CourtDossier />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/recycle-bin" element={<RecycleBin />} />
        <Route path="/settings/courts" element={<Courts />} />
        <Route path="/settings/case-types" element={<CaseTypes />} />
        <Route path="/settings/announcement-types" element={<AnnouncementTypes />} />
        <Route path="/settings/lawyer-profile" element={<LawyerProfile />} />
        <Route path="/settings/backup" element={<Backup />} />
        <Route path="/users" element={<Users />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
    </>
  );
}
