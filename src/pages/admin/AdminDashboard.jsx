import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { getCustomers, getPendingFunding, getAdminOrders } from '../../api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getCustomers(), getPendingFunding(), getAdminOrders()])
      .then(([c, f, o]) => {
        setStats({
          customers: c.customers.length,
          pendingFunding: f.transactions.length,
          orders: o.orders.length,
          successfulOrders: o.orders.filter((x) => x.status === 'SUCCESS').length,
        });
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Overview</h1>
        <p>A quick look at ZAPPI PAY</p>
      </div>

      {error && <p className="error-text" style={{ margin: '0 0 12px' }}>{error}</p>}

      {stats && (
        <div className="grid">
          <div className="card stat-card" style={{ margin: 0 }}>
            <div className="label">Customers</div>
            <div className="value">{stats.customers}</div>
          </div>
          <div className="card stat-card" style={{ margin: 0 }}>
            <div className="label">Pending Funding</div>
            <div className="value">{stats.pendingFunding}</div>
          </div>
          <div className="card stat-card" style={{ margin: 0 }}>
            <div className="label">Total Orders</div>
            <div className="value">{stats.orders}</div>
          </div>
          <div className="card stat-card" style={{ margin: 0 }}>
            <div className="label">Successful Orders</div>
            <div className="value">{stats.successfulOrders}</div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
