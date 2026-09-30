import { useState } from 'react';
import { applyAiAction, undoAiAction, dismissAiAction } from '../../api';

const KIND_ICON = { SETTINGS: '⚙️', CHALLENGE: '🎯', PROMO: '🏷️', NOTICE: '📢', BROADCAST: '📣' };

// A change the admin assistant proposed. Nothing happens until Apply.
export default function AiActionCard({ action }) {
  const [a, setA] = useState(action);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  async function run(kind) {
    if (kind === 'apply' && a.kind === 'BROADCAST' && !window.confirm('Send this notification to customers now? This cannot be undone.')) return;
    setBusy(kind);
    setErr('');
    try {
      if (kind === 'dismiss') {
        await dismissAiAction(a.id);
        setA({ ...a, status: 'DISMISSED' });
      } else {
        const r = await (kind === 'apply' ? applyAiAction(a.id) : undoAiAction(a.id));
        setA(r.action);
      }
    } catch (e) {
      setErr(e.message);
      if (/refused|30 minutes/i.test(e.message)) setA({ ...a, status: 'FAILED' });
    } finally {
      setBusy('');
    }
  }

  const done = a.status === 'APPLIED';
  const border = done ? 'var(--green-500)' : a.status === 'PENDING' ? 'var(--purple)' : 'var(--slate-700)';
  return (
    <div style={{ marginTop: 8, border: `1.5px solid ${border}`, borderRadius: 12, padding: 12, background: 'rgba(134,59,255,0.06)', maxWidth: 560 }}>
      <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{a.status === 'PENDING' ? 'Please check before applying' : a.status === 'APPLIED' ? '✅ Applied' : a.status === 'UNDONE' ? '↩️ Undone' : a.status === 'DISMISSED' ? 'Dismissed' : a.status === 'FAILED' ? 'Not applied' : a.status}</div>
      <div style={{ fontWeight: 700, margin: '2px 0 8px' }}>{KIND_ICON[a.kind] || '⚙️'} {a.summary}</div>
      <div style={{ display: 'grid', gap: 6 }}>
        {(a.changes || []).map((c, i) => (
          <div key={i} style={{ fontSize: 13, display: 'grid', gridTemplateColumns: 'minmax(120px, 38%) 1fr', gap: 8 }}>
            <span style={{ color: 'var(--slate-400)' }}>{c.label}</span>
            <span>{c.from && c.from !== '—' ? <><s style={{ color: 'var(--slate-500, #64748b)' }}>{c.from}</s> → </> : null}<b>{c.to}</b></span>
          </div>
        ))}
      </div>
      {a.warnings?.length > 0 && (
        <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--gold)' }}>
          {a.warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      )}
      {err && <p className="error-text" style={{ fontSize: 13, margin: '8px 0 0' }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        {a.status === 'PENDING' && (
          <>
            <button type="button" className="btn" style={{ width: 'auto', padding: '6px 16px' }} disabled={Boolean(busy)} onClick={() => run('apply')}>{busy === 'apply' ? 'Applying…' : a.kind === 'BROADCAST' ? 'Send now' : 'Apply'}</button>
            <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 16px' }} disabled={Boolean(busy)} onClick={() => run('dismiss')}>Dismiss</button>
          </>
        )}
        {done && a.canUndo && <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 16px' }} disabled={Boolean(busy)} onClick={() => run('undo')}>{busy === 'undo' ? 'Undoing…' : 'Undo'}</button>}
      </div>
    </div>
  );
}
