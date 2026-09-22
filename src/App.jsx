import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Buy from './pages/Buy';
import Wallet from './pages/Wallet';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';

import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSettings from './pages/admin/AdminSettings';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminCustomerDetail from './pages/admin/AdminCustomerDetail';
import AdminPendingFunding from './pages/admin/AdminPendingFunding';
import AdminOrders from './pages/admin/AdminOrders';
import AdminSupport from './pages/admin/AdminSupport';
import AdminAuditLog from './pages/admin/AdminAuditLog';
import AdminStaff from './pages/admin/AdminStaff';

function RequireCustomer({ children }) {
  const { customer, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading…</div>;
  if (!customer) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { admin } = useAdminAuth();
  if (!admin) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <Routes>
          {/* Customer */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<RequireCustomer><Dashboard /></RequireCustomer>} />
          <Route path="/buy/:service" element={<RequireCustomer><Buy /></RequireCustomer>} />
          <Route path="/wallet" element={<RequireCustomer><Wallet /></RequireCustomer>} />
          <Route path="/orders" element={<RequireCustomer><Orders /></RequireCustomer>} />
          <Route path="/orders/:id" element={<RequireCustomer><OrderDetail /></RequireCustomer>} />
          <Route path="/notifications" element={<RequireCustomer><Notifications /></RequireCustomer>} />
          <Route path="/profile" element={<RequireCustomer><Profile /></RequireCustomer>} />

          {/* Admin */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
          <Route path="/admin/settings" element={<RequireAdmin><AdminSettings /></RequireAdmin>} />
          <Route path="/admin/customers" element={<RequireAdmin><AdminCustomers /></RequireAdmin>} />
          <Route path="/admin/customers/:id" element={<RequireAdmin><AdminCustomerDetail /></RequireAdmin>} />
          <Route path="/admin/pending-funding" element={<RequireAdmin><AdminPendingFunding /></RequireAdmin>} />
          <Route path="/admin/orders" element={<RequireAdmin><AdminOrders /></RequireAdmin>} />
          <Route path="/admin/support" element={<RequireAdmin><AdminSupport /></RequireAdmin>} />
          <Route path="/admin/audit-log" element={<RequireAdmin><AdminAuditLog /></RequireAdmin>} />
          <Route path="/admin/staff" element={<RequireAdmin><AdminStaff /></RequireAdmin>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminAuthProvider>
    </AuthProvider>
  );
}
