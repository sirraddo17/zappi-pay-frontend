import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { getCustomers, setCustomerActive, adjustWallet } from '../../api';

function fmtMoney(n) {
  return `₦${Number(n).toLocaleString()}`;
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [adjustingCustomer, setAdjustingCustomer] = useState(null);
  const [adjustType, setAdjustType] = useState('CREDIT');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState('');

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

  function openAdjust(customer) {
    setAdjustingCustomer(customer);
    setAdjustType('CREDIT');
    setAdjustAmount('');
    setAdjustNote('');
    setAdjustError('');
  }

  async function handleAdjustSubmit(e) {
    e.preventDefault();
    setAdjustError('');
    setAdjustSubmitting(true);
    try {
      await adjustWallet(adjustingCustomer.id, {
        type: adjustType,
        amount: Number(adjustAmount),
        note: adjustNote.trim() || undefined,
      });
      setAdjustingCustomer(null);
      load();
    } catch (err) {
      setAdjustError(err.message || 'Could not adjust wallet.');
    } finally {
      setAdjustSubmitting(false);
    }
  }

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Customers</h1>
        <p>Everyone with a ZAPPI PAY account</p>
      </div>

      {error && <p className="error-text" style={{ margin: '0 0 12px' }}>{error}</p>}

      {adjustingCustomer && (
        <form className="card" style={{ margin: '0 0 16px', maxWidth: 400 }} onSubmit={handleAdjustSubmit}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Adjust Wallet — {adjustingCustomer.name}</h2>
          {adjustError && <p className="error-text" style={{ margin: '0 0 12px' }}>{adjustError}</p>}
          <div className="field">
            <label htmlFor="adjustType">Type</label>
            <select id="adjustType" value={adjustType} onChange={(e) => setAdjustType(e.target.value)}>
              <option value="CREDIT">Credit (add funds)</option>
              <option value="DEBIT">Debit (remove funds)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="adjustAmount">Amount (₦)</label>
            <input id="adjustAmount" type="number" min="1" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="adjustNote">Reason (optional)</label>
            <input id="adjustNote" type="text" value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} placeholder="e.g. refund for failed order" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" type="submit" disabled={adjustSubmitting}>
              {adjustSubmitting ? 'Saving…' : 'Apply Adjustment'}
            </button>
            <button className="btn-secondary btn" type="button" onClick={() => setAdjustingCustomer(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

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
                  <td><Link to={`/admin/customers/${c.id}`} style={{ color: 'var(--orange)' }}>{c.name}</Link></td>
                  <td>{c.phone}</td>
                  <td>{fmtMoney(c.walletBalance)}</td>
                  <td>{c.active ? 'Active' : 'Deactivated'}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-secondary btn" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} onClick={() => openAdjust(c)}>
                      Adjust Wallet
                    </button>
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
