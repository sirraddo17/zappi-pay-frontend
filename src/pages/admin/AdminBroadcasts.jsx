import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { getAdminBroadcasts, createBroadcast, endBroadcast } from '../../api';

const TYPES = [
  { value: 'INFO', label: 'Info' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
];

const TYPE_COLORS = { INFO: 'var(--purple)', WARNING: 'var(--gold)', MAINTENANCE: '#ef4444' };

function fmtDate(d) {
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AdminBroadcasts() {
  const [broadcasts, setBroadcasts] = useState(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('INFO');
  const [showBanner, setShowBanner] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [endingId, setEndingId] = useState('');

  function load() {
    getAdminBroadcasts()
      .then((data) => setBroadcasts(data.broadcasts || []))
      .catch((err) => {
        setError(err.message);
        setBroadcasts([]);
      });
  }

  useEffect(load, []);

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required.');
      return;
    }
    // Sending reaches every customer and can't be unsent, so the
    // first click only asks for confirmation (in-page, no browser
    // dialog) and the second one actually sends.
    setConfirming(true);
  }

  async function handleSend() {
    setSending(true);
    setError('');
    try {
      const data = await createBroadcast({ title: title.trim(), message: message.trim(), type, showBanner });
      setSuccess(`Sent to ${data.broadcast.recipientCount} customer${data.broadcast.recipientCount === 1 ? '' : 's'}.`);
      setTitle('');
      setMessage('');
      setType('INFO');
      setShowBanner(true);
      setConfirming(false);
      load();
    } catch (err) {
      setError(err.message || 'Could not send broadcast.');
    } finally {
      setSending(false);
    }
  }

  async function handleEnd(id) {
    setEndingId(id);
    setError('');
    try {
      await endBroadcast(id);
      load();
    } catch (err) {
      setError(err.message || 'Could not end broadcast.');
    } finally {
      setEndingId('');
    }
  }

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Broadcasts</h1>
        <p>Send an announcement to every customer</p>
      </div>

      {error && <p className="error-text" style={{ margin: '0 0 12px' }}>{error}</p>}
      {success && <p style={{ color: 'var(--green-500)', fontSize: 14, margin: '0 0 12px' }}>{success}</p>}

      <form className="card" style={{ margin: '0 0 16px', maxWidth: 480 }} onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="bc-type">Type</label>
          <select id="bc-type" value={type} onChange={(e) => { setType(e.target.value); setConfirming(false); }}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bc-title">Title</label>
          <input
            id="bc-title"
            type="text"
            maxLength={100}
            value={title}
            onChange={(e) => { setTitle(e.target.value); setConfirming(false); }}
            placeholder="e.g. Scheduled maintenance tonight"
          />
        </div>
        <div className="field">
          <label htmlFor="bc-message">Message</label>
          <textarea
            id="bc-message"
            rows={4}
            maxLength={1000}
            value={message}
            onChange={(e) => { setMessage(e.target.value); setConfirming(false); }}
            placeholder="e.g. Purchases will be unavailable from 10pm to 12am while we upgrade our systems."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              resize: 'vertical',
              fontFamily: 'inherit',
              fontSize: 15,
              background: 'var(--slate-900)',
              border: '1px solid var(--slate-700)',
              borderRadius: 8,
              color: 'var(--slate-100)',
              padding: '10px 12px',
            }}
          />
          <div style={{ color: 'var(--slate-400)', fontSize: 12, textAlign: 'right' }}>{message.length}/1000</div>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 16, cursor: 'pointer' }}>
          <input type="checkbox" checked={showBanner} onChange={(e) => setShowBanner(e.target.checked)} style={{ width: 'auto' }} />
          Also pin as a banner on the customer dashboard (until you end it)
        </label>

        {!confirming ? (
          <button className="btn" type="submit">Send Broadcast</button>
        ) : (
          <div>
            <p style={{ fontSize: 14, margin: '0 0 10px' }}>
              This goes to <strong>every active customer</strong> and can't be unsent. Send it now?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" type="button" onClick={handleSend} disabled={sending}>
                {sending ? 'Sending…' : 'Yes, send'}
              </button>
              <button className="btn-secondary btn" type="button" onClick={() => setConfirming(false)} disabled={sending}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </form>

      <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>Sent broadcasts</h2>
      {broadcasts === null ? (
        <p className="empty-state">Loading…</p>
      ) : broadcasts.length === 0 ? (
        <p className="empty-state">No broadcasts sent yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 640 }}>
          {broadcasts.map((b) => (
            <div key={b.id} className="card" style={{ margin: 0, borderLeft: `4px solid ${TYPE_COLORS[b.type] || 'var(--purple)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{b.title}</div>
                  <div style={{ fontSize: 13, marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{b.message}</div>
                  <div style={{ color: 'var(--slate-400)', fontSize: 12, marginTop: 8 }}>
                    {b.type.charAt(0) + b.type.slice(1).toLowerCase()} · {fmtDate(b.createdAt)} · {b.recipientCount} recipient{b.recipientCount === 1 ? '' : 's'} ·{' '}
                    {b.showBanner ? (b.active ? 'Banner live' : `Banner ended${b.endedAt ? ` ${fmtDate(b.endedAt)}` : ''}`) : 'Bell only'}
                  </div>
                </div>
                {b.showBanner && b.active && (
                  <button
                    type="button"
                    className="btn-secondary btn"
                    style={{ width: 'auto', padding: '6px 12px', fontSize: 13, flexShrink: 0 }}
                    onClick={() => handleEnd(b.id)}
                    disabled={endingId === b.id}
                  >
                    {endingId === b.id ? 'Ending…' : 'End banner'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
