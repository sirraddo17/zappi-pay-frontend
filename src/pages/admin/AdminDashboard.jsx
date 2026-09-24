import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import ProfitPanel from '../../components/ProfitPanel';
import { Link } from 'react-router-dom';
import { getCustomers, getPendingFunding, getAdminOrders, getMonnifyOverview, getDeletionRequests } from '../../api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [monnify, setMonnify] = useState(null);
  const [deletions, setDeletions] = useState([]);

  useEffect(() => {
    Promise.all([getCustomers(), getPendingFunding(), getAdminOrders()])
      .then(([c, f, o]) => {
        setStats({
          customers: c.customers.length,
          pendingFunding: f.transactions.length,
          orders: o.orders.length,
          successfulOrders: o.orders.filter((x) => x.status === 'SUCCESS').length,
          failedOrders: o.orders.filter((x) => x.status === 'FAILED').length,
          totalRevenue: o.orders
            .filter((x) => x.status === 'SUCCESS')
            .reduce((sum, x) => sum + Number(x.amount), 0),
        });
      })
      .catch((err) => setError(err.message));
    getMonnifyOverview().then(setMonnify).catch(() => setMonnify(null));
    getDeletionRequests().then((d) => setDeletions(d.customers)).catch(() => {});
  }, []);

  const low = monnify?.walletBalance != null && monnify.walletBalance < (monnify.lowBalanceThreshold || 10000);

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Overview</h1>
        <p>A quick look at ZAPPI PAY</p>
      </div>

      {error && <p className="error-text" style={{ margin: '0 0 12px' }}>{error}</p>}

      {monnify?.configured && (
        <div className="card" style={{ margin: '0 0 16px', border: low ? '1px solid var(--red-500)' : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>
                Monnify payout wallet · {monnify.mode === 'live' ? 'LIVE' : 'SANDBOX (test money)'}
              </div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>
                {monnify.walletBalance != null ? `₦${Number(monnify.walletBalance).toLocaleString()}` : monnify.walletAccount ? '—' : 'Not set up'}
              </div>
              {monnify.walletBalanceError && <div className="error-text" style={{ fontSize: 12, margin: 0 }}>Could not read balance: {monnify.walletBalanceError}</div>}
              {!monnify.walletAccount && <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>Add your wallet account number in Settings → Monnify.</div>}
              {low && (
                <div style={{ color: 'var(--red-500)', fontSize: 13, marginTop: 4 }}>
                  Low balance — fund your Monnify wallet or customer bank transfers will start failing (and be refunded).
                </div>
              )}
            </div>
            <div style={{ fontSize: 13 }}>
              <div>Send to Bank: <strong>{monnify.transfersEnabled ? 'On' : 'Off'}</strong></div>
              <div>Customers with account numbers: <strong>{monnify.accountsCount}</strong></div>
              {monnify.waitingOtp > 0 && (
                <div style={{ marginTop: 4 }}>
                  <Link to="/admin/bank-transfers" style={{ color: 'var(--orange, #f97316)' }}>{monnify.waitingOtp} transfer{monnify.waitingOtp === 1 ? '' : 's'} need your OTP →</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {deletions.length > 0 && (
        <div className="card" style={{ margin: '0 0 16px', border: '1px solid var(--red-500)' }}>
          <strong>{deletions.length} account deletion request{deletions.length === 1 ? '' : 's'}</strong>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            {deletions.map((c) => (
              <div key={c.id}>
                <Link to={`/admin/customers/${c.id}`} style={{ color: 'var(--purple)' }}>{c.name}</Link> · {c.phone} · wallet ₦{Number(c.walletBalance).toLocaleString()}
              </div>
            ))}
          </div>
        </div>
      )}

      <ProfitPanel />

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
          <div className="card stat-card" style={{ margin: 0 }}>
            <div className="label">Failed Orders</div>
            <div className="value">{stats.failedOrders}</div>
          </div>
          <div className="card stat-card" style={{ margin: 0 }}>
            <div className="label">Total Revenue</div>
            <div className="value">₦{stats.totalRevenue.toLocaleString()}</div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
