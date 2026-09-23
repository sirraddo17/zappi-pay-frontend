import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { lookupRecipient, sendTransfer } from '../api';
import BottomNav from '../components/BottomNav';

export default function Transfer() {
  const { refreshCustomer } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('user');

  const [identifier, setIdentifier] = useState('');
  const [recipient, setRecipient] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sending, setSending] = useState(false);

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setRecipient(null);
    if (!identifier.trim()) return;
    setVerifying(true);
    try {
      const data = await lookupRecipient(identifier.trim());
      setRecipient(data.recipient);
    } catch (err) {
      setError(err.message || 'Could not find that user.');
    } finally {
      setVerifying(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSending(true);
    try {
      await sendTransfer({ identifier: identifier.trim(), amount: Number(amount), note: note.trim() || undefined });
      setSuccess(`₦${Number(amount).toLocaleString()} sent to ${recipient.name}.`);
      setIdentifier('');
      setRecipient(null);
      setAmount('');
      setNote('');
      refreshCustomer();
    } catch (err) {
      setError(err.message || 'Could not complete transfer.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="page-header">
        <Link to="/" style={{ color: 'var(--purple, var(--orange))', textDecoration: 'none', fontSize: 14 }}>
          &larr; Back
        </Link>
        <h1>Send Money</h1>
        <p>Transfer to another ZappiPay user or a bank account</p>
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '0 16px 16px' }}>
        <button
          type="button"
          onClick={() => { setTab('user'); setError(''); setSuccess(''); }}
          className={tab === 'user' ? 'btn' : 'btn-secondary btn'}
          style={{ flex: 1 }}
        >
          ZappiPay User
        </button>
        <button
          type="button"
          onClick={() => { setTab('bank'); setError(''); setSuccess(''); }}
          className={tab === 'bank' ? 'btn' : 'btn-secondary btn'}
          style={{ flex: 1 }}
        >
          Bank Account
        </button>
      </div>

      {error && <p className="error-text" style={{ margin: '0 16px 12px' }}>{error}</p>}
      {success && <p style={{ color: 'var(--green-500)', fontSize: 14, margin: '0 16px 12px' }}>{success}</p>}

      {tab === 'user' ? (
        <div className="card" style={{ margin: '0 16px 90px' }}>
          {!recipient ? (
            <form onSubmit={handleVerify}>
              <div className="field">
                <label htmlFor="identifier">Recipient's phone number or username</label>
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  placeholder="080... or username"
                />
              </div>
              <button className="btn" type="submit" disabled={verifying}>
                {verifying ? 'Checking…' : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSend}>
              <div
                style={{
                  background: 'rgba(134,59,255,0.1)',
                  border: '1px solid var(--purple, var(--orange))',
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>Sending to</div>
                  <div style={{ fontWeight: 600 }}>{recipient.name}</div>
                </div>
                <button
                  type="button"
                  onClick={() => { setRecipient(null); setIdentifier(''); }}
                  className="btn-secondary btn"
                  style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
                >
                  Change
                </button>
              </div>
              <div className="field">
                <label htmlFor="amount">Amount (₦)</label>
                <input
                  id="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="note">Note (optional)</label>
                <input id="note" type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What's this for?" />
              </div>
              <button className="btn" type="submit" disabled={sending}>
                {sending ? 'Sending…' : 'Send Money'}
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="card" style={{ margin: '0 16px 90px', textAlign: 'center' }}>
          <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>
            Sending to other banks is coming soon — this is pending approval of our payment provider (Monnify) integration.
          </p>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
