import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { getCustomerList, setCustomerActive, adjustWallet } from '../../api';

const TABS = [
  { key: 'active', label: 'Active' },
  { key: 'deactivated', label: 'Deactivated' },
  { key: 'deletion', label: 'Deletion requests' },
  { key: 'deleted', label: 'Deleted' },
];

function fmtMoney(n) {
  return `₦${Number(n).toLocaleString()}`;
}

export default function AdminCustomers() {
  const [view, setView] = useState('active');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [browseAll, setBrowseAll] = useState(false);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState(null);
  const customers = result?.customers ?? null;
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const latest = useRef(0);

  const [adjustingCustomer, setAdjustingCustomer] = useState(null);
  const [adjustType, setAdjustType] = useState('CREDIT');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  // Wait until typing pauses before searching.
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => { setPage(0); }, [view, search, browseAll]);

  function load() {
    const n = ++latest.current;
    getCustomerList({ view, q: search, all: browseAll, page })
      .then((data) => { if (n === latest.current) { setResult(data); setError(''); } })
      .catch((err) => { if (n === latest.current) setError(err.message); });
  }

  useEffect(load, [view, search, browseAll, page]);

  function pickTab(key) {
    if (key === view) return;
    setResult(null);
    setView(key);
  }

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
        <p>Search by name, phone number, username or email</p>
      </div>

      <div className="admin-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" className={view === t.key ? 'btn' : 'btn btn-secondary'} style={{ width: 'auto', padding: '6px 14px' }} onClick={() => pickTab(t.key)}>
            {t.label}{result?.counts ? ` (${Number(result.counts[t.key] || 0).toLocaleString()})` : ''}
          </button>
        ))}
      </div>

      <div className="field" style={{ maxWidth: 480, marginBottom: 12 }}>
        <input
          type="search"
          aria-label="Search customers"
          placeholder="🔍 Search name, phone, username or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {result && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '0 0 8px', fontSize: 13, color: 'var(--slate-400)' }}>
          <span>
            {result.mode === 'top' && 'Top 5 most active customers (successful orders in the last 30 days). Search to find anyone else.'}
            {result.mode === 'search' && `${result.total.toLocaleString()} match${result.total === 1 ? '' : 'es'} for "${result.q}"`}
            {result.mode === 'all' && `${result.total.toLocaleString()} customer${result.total === 1 ? '' : 's'}`}
          </span>
          {view === 'active' && !search && (
            <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '4px 12px', fontSize: 13 }} onClick={() => { setResult(null); setBrowseAll((b) => !b); }}>
              {browseAll ? 'Show top 5 only' : 'Browse all active'}
            </button>
          )}
        </div>
      )}

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
          <p className="empty-state">
            {search ? 'No customer matches that search in this tab.'
              : result?.mode === 'top' ? 'No purchases in the last 30 days yet. Use search or "Browse all active".'
                : 'No customers here.'}
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                {result?.mode === 'top' && <th>Orders (30d)</th>}
                <th>Balance</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/admin/customers/${c.id}`} style={{ color: 'var(--orange)' }}>{c.name}</Link>
                    {c.username && <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>@{c.username}</div>}
                  </td>
                  <td>{c.deletedAt ? '—' : c.phone}</td>
                  {result?.mode === 'top' && <td>{c.orders30d}</td>}
                  <td>{fmtMoney(c.walletBalance)}</td>
                  <td>
                    {c.deletedAt ? `Deleted ${new Date(c.deletedAt).toLocaleDateString('en-NG')}` : c.active ? 'Active' : 'Deactivated'}
                    {!c.deletedAt && c.deletionRequestedAt && <div style={{ fontSize: 12, color: 'var(--red-500)' }}>Wants deletion</div>}
                  </td>
                  <td>
                    {!c.deletedAt && (
                    <div className="admin-actions">
                    <button className="btn-secondary btn" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} onClick={() => openAdjust(c)}>
                      Adjust Wallet
                    </button>
                    <button className="btn-secondary btn" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} onClick={() => toggleActive(c)} disabled={busyId === c.id}>
                      {c.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                    </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {result && result.mode !== 'top' && result.total > result.pageSize && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 12, fontSize: 13 }}>
          <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 14px' }} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹ Prev</button>
          <span>Page {page + 1} of {Math.ceil(result.total / result.pageSize)}</span>
          <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 14px' }} disabled={(page + 1) * result.pageSize >= result.total} onClick={() => setPage((p) => p + 1)}>Next ›</button>
        </div>
      )}
    </AdminLayout>
  );
}
