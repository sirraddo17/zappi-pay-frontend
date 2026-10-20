import { useEffect, useState } from 'react';
import { getPlanFixes, savePlanFix, deletePlanFix } from '../../api';
import { useAdminAuth } from '../../context/AdminAuthContext';

const fmtHours = (h) => (h == null ? '' : h < 24 ? `${h} hour${h === 1 ? '' : 's'}` : h % 24 === 0 ? `${h / 24} day${h === 24 ? '' : 's'}` : `${h} hours`);

// "Plan details wrong?" on a data/internet order: VTpass sometimes names a
// plan wrongly (e.g. "1 Day" for a 2-hour plan). Set the real validity, a
// note customers see, or hide the plan. Applies to every customer at once.
export function PlanFixForm({ serviceID, variationCode, name, onSaved }) {
  const [open, setOpen] = useState(false);
  const [num, setNum] = useState('');
  const [unit, setUnit] = useState('hours');
  const [note, setNote] = useState('');
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const { isOwner } = useAdminAuth();
  if (!serviceID || !variationCode || !isOwner) return null;
  async function save() {
    setBusy(true); setErr(''); setMsg('');
    try {
      const n = Number(num);
      const validityHours = num === '' ? null : unit === 'days' ? Math.round(n * 24) : Math.round(n);
      await savePlanFix({ serviceID, variationCode, name, validityHours, note, hidden });
      setMsg('Saved — customers now see the corrected details on this plan.');
      onSaved?.();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  if (!open) return <button type="button" onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--gold, #FFB830)', cursor: 'pointer', padding: 0, fontSize: 12, textAlign: 'left' }}>✏️ Plan details wrong? (e.g. it lasts hours, not a day)</button>;
  return (
    <div style={{ border: '1px solid var(--slate-700)', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>Correct <b>{name || variationCode}</b> for all customers. The VTpass name stays, with your correction shown next to it.</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 13 }}>Really lasts</span>
        <input type="number" min="1" value={num} onChange={(e) => setNum(e.target.value)} placeholder="2" style={{ width: 80 }} />
        <select value={unit} onChange={(e) => setUnit(e.target.value)} style={{ width: 'auto' }}><option value="hours">hours</option><option value="days">days</option></select>
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={160} placeholder="Note customers see (optional), e.g. Glo gives this for 2 hours only" />
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}><input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} style={{ width: 'auto' }} /> Hide this plan from customers</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn" style={{ width: 'auto', padding: '6px 14px' }} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save correction'}</button>
        <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 14px' }} onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {msg && <p style={{ color: 'var(--green-500)', fontSize: 13, margin: 0 }}>{msg}</p>}
      {err && <p className="error-text" style={{ margin: 0 }}>{err}</p>}
    </div>
  );
}

// List of all corrections (top of Admin → Orders).
export default function PlanFixesList() {
  const [fixes, setFixes] = useState(null);
  const [err, setErr] = useState('');
  const load = () => getPlanFixes().then((d) => setFixes(d.fixes || [])).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  if (fixes === null) return null;
  return (
    <details className="card" style={{ margin: '0 0 12px' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>📋 Data plan corrections ({fixes.length})</summary>
      <p style={{ color: 'var(--slate-400)', fontSize: 12 }}>When a plan's VTpass name is wrong (for example it says 1 day but the network gives 2 hours), open that order below and tap "Plan details wrong?". Corrections show on the plan card and before paying, for every customer.</p>
      {err && <p className="error-text">{err}</p>}
      {!fixes.length && <p style={{ color: 'var(--slate-400)', fontSize: 13, margin: 0 }}>No corrections yet.</p>}
      {fixes.map((f) => (
        <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderTop: '1px solid var(--slate-700)', fontSize: 13 }}>
          <div style={{ minWidth: 0 }}>
            <div><b>{f.name || f.variationCode}</b> <span style={{ color: 'var(--slate-400)' }}>({f.serviceID})</span></div>
            <div style={{ color: 'var(--slate-400)' }}>{[f.validityHours ? `Really lasts ${fmtHours(f.validityHours)}` : null, f.note, f.hidden ? 'Hidden from customers' : null].filter(Boolean).join(' · ')}</div>
          </div>
          <button type="button" onClick={async () => { try { await deletePlanFix(f.id); load(); } catch (e) { setErr(e.message); } }} style={{ background: 'none', border: 'none', color: 'var(--red-500)', cursor: 'pointer', fontSize: 12 }}>Remove</button>
        </div>
      ))}
    </details>
  );
}
