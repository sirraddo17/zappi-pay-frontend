import { useEffect, useState } from 'react';
import { getWalletBalance, getWalletTransactions, submitFundRequest } from '../api';
import BottomNav from '../components/BottomNav';

function fmtMoney(n) {
  return `₦${Number(n).toLocaleString()}`;
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Wallet() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    Promise.all([getWalletBalance(), getWalletTransactions()])
      .then(([b, t]) => {
        setBalance(b.walletBalance);
        setTransactions(t.transactions);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setSubmitting(true);
    try {
      await submitFundRequest({ amount: Number(amount), reference: reference.trim() || undefined, note: note.trim() || undefined });
      setAmount('');
      setReference('');
      setNote('');
      setSuccessMessage('Funding request submitted. It will reflect once approved.');
      load();
    } catch (err) {
      setError(err.message || 'Could not submit funding request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="page-header">
        <h1>Wallet</h1>
        <p>Fund your wallet and track your transactions</p>
      </div>

      <div className="card stat-card">
        <div className="label">Wallet Balance</div>
        <div className="value">{fmtMoney(balance)}</div>
      </div>

      {error && <p className="error-text">{error}</p>}
      {successMessage && <p style={{ color: 'var(--green-500)', fontSize: 14, margin: '0 16px 12px' }}>{successMessage}</p>}

      <form className="card" onSubmit={handleSubmit}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Fund Wallet</h2>
        <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: -8 }}>
          Send a bank transfer, then submit the details below for approval.
        </p>
        <div className="field">
          <label htmlFor="amount">Amount (₦)</label>
          <input id="amount" type="number" min="100" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="reference">Transfer reference (optional)</label>
          <input id="reference" type="text" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="note">Note (optional)</label>
          <input id="note" type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. sent from GTBank" />
        </div>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Funding Request'}
        </button>
      </form>

      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Transaction History</h2>
        {transactions === null ? (
          <p className="empty-state">Loading…</p>
        ) : transactions.length === 0 ? (
          <p className="empty-state">No transactions yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td>{fmtDate(t.createdAt)}</td>
                  <td>{String(t.type).replace(/_/g, ' ')}</td>
                  <td>{fmtMoney(t.amount)}</td>
                  <td>{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
