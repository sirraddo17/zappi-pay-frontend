import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { getCustomers, setCustomerActive } from '../../api';

function fmtMoney(n) {
  return `₦${Number(n).toLocaleString()}`;
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  function load() {
    getCustomers()
      .then((data) => setCustomers(data.customers))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function toggleActive(customer) {
    setBusyId(customer.id);
    setError('');
    try {
      await setCustomerActive(customer.id, !customer.active);
      load();
    } catch (err) {
      setError(err.message || 'Could not update customer.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Customers</h1>
        <p>Everyone with a ZAPPI PAY account</p>
      </div>

      {error && <p className="error-text" style={{ margin: '0 0 12px' }}>{error}</p>}

      <div className="card admin-table-wrap" style={{ margin: 0 }}>
        {customers === null ? (
          <p className="empty-state">Loading…</p>
        ) : customers.length === 0 ? (
          <p className="empty-state">No customers yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Balance</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{fmtMoney(c.walletBalance)}</td>
                  <td>{c.active ? 'Active' : 'Deactivated'}</td>
                  <td>
                    <button className="btn-secondary btn" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} onClick={() => toggleActive(c)} disabled={busyId === c.id}>
                      {c.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
