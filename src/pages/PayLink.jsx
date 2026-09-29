import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getQuickLogin } from '../lib/quickLogin';

// zappipay.com.ng/pay/<username> — the link inside every customer's QR.
export default function PayLink() {
  const { username } = useParams();
  const { customer, loading } = useAuth();
  const u = String(username || '').replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (loading) return <div className="page-loading">Loading…</div>;
  if (customer) return <Navigate to={`/transfer?to=${encodeURIComponent(u)}`} replace />;
  if (getQuickLogin() || localStorage.getItem('zappipay_customer_token')) return <Navigate to="/login" replace />;
  return <Navigate to={`/signup?ref=${encodeURIComponent(u)}`} replace />;
}
