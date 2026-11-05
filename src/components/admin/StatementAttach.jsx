import { useState } from 'react';
import { PARTNERS, MAX_ROWS, readStatement } from '../../lib/statementParse';

// Owner only (AI Assistant): attach a partner statement (CSV or Excel).
// It is read in the browser; only date, reference, amount, credit/debit
// and narration are sent with the question (max 5000 rows). The check is
// read-only — it never credits or changes anything.
export default function StatementAttach({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [partner, setPartner] = useState('nomba');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function pick(file) {
    setBusy(true); setErr('');
    try {
      const r = await readStatement(file, partner);
      if (r.error) setErr(r.error);
      else { onChange({ partner: r.partner, fileName: r.fileName, rows: r.rows, columns: r.columns, skipped: r.skipped }); setOpen(false); }
    } catch {
      setErr('Couldn’t read that file. Try exporting it again as CSV or .xlsx.');
    } finally {
      setBusy(false);
    }
  }

  const name = (k) => PARTNERS.find(([p]) => p === k)?.[1] || k;
  if (value) {
    return (
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
        <span style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--slate-900)', border: '1px solid var(--slate-700)' }}>
          📄 {value.fileName} · {name(value.partner)} · {value.rows.length.toLocaleString()} row{value.rows.length === 1 ? '' : 's'}{value.rows.length >= MAX_ROWS ? ' (first 5,000)' : ''}
        </span>
        <span style={{ color: 'var(--slate-400)', fontSize: 12 }}>Columns used: {value.columns.join(', ')}</span>
        <button type="button" onClick={() => onChange(null)} disabled={disabled} style={{ background: 'none', border: 'none', color: 'var(--red-500)', cursor: 'pointer', fontSize: 12 }}>Remove</button>
      </div>
    );
  }
  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} disabled={disabled} style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--purple)', cursor: 'pointer', padding: 0, fontSize: 13, textAlign: 'left' }}>📄 Add a partner statement (CSV or Excel) to check against our records</button>;
  }
  return (
    <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
      <select value={partner} onChange={(e) => setPartner(e.target.value)} aria-label="Statement from" style={{ width: 'auto' }} disabled={busy}>
        {PARTNERS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <input type="file" accept=".csv,.xlsx,.xls,text/csv" aria-label="Statement file" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) pick(f); }} style={{ width: 'auto' }} />
      <button type="button" onClick={() => { setOpen(false); setErr(''); }} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
      {busy && <span style={{ color: 'var(--slate-400)' }}>Reading…</span>}
      {err && <p className="error-text" style={{ margin: 0, width: '100%' }}>{err}</p>}
      <p style={{ color: 'var(--slate-400)', fontSize: 11, margin: 0, width: '100%' }}>Read on this device. Only date, reference, amount, credit/debit and narration are sent (max 5,000 rows). Checking never credits or changes anything.</p>
    </div>
  );
}
