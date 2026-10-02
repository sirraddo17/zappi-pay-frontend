import { useState } from 'react';
import { vtpassSelfTest } from '../../api';

// Settings → VTpass: asks VTpass to check its own sandbox test numbers and
// shows exactly what it answers. No money moves.
export default function VtpassSelfTest() {
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function run() {
    setBusy(true); setErr(''); setRes(null);
    try { setRes(await vtpassSelfTest()); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <div className="card" style={{ margin: '16px 0 0', maxWidth: 560 }}>
      <b>🧪 Test VTpass number checks</b>
      <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '6px 0 10px' }}>Checks VTpass’s sandbox test numbers (meter, DStv, JAMB, Smile) and shows VTpass’s exact answer. Nothing is bought.</p>
      <button type="button" className="btn btn-secondary" disabled={busy} onClick={run}>{busy ? 'Checking…' : 'Run test'}</button>
      {err && <p className="error-text" style={{ margin: '8px 0 0' }}>{err}</p>}
      {res && (
        <div style={{ marginTop: 10, fontSize: 13 }}>
          <div style={{ color: 'var(--slate-400)', marginBottom: 6 }}>Mode: {res.mode === 'live' ? 'LIVE (these test numbers only work in sandbox)' : 'Sandbox'}</div>
          {res.results.map((r) => (
            <div key={r.label} style={{ padding: '6px 0', borderTop: '1px solid var(--slate-800)' }}>
              <div>{r.ok ? '✅' : '❌'} {r.label}{r.name ? ` → ${r.name}` : ''}</div>
              {!r.ok && <div style={{ color: 'var(--slate-400)', fontSize: 12 }}>{r.message || 'No name came back'} (code {String(r.code ?? '—')})</div>}
              {!r.ok && <details style={{ fontSize: 11, color: 'var(--slate-400)' }}><summary>VTpass reply</summary><pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{r.reply}</pre></details>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
