import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { getDatabaseHealth } from '../../api';

// Admin → Database: is the database (Neon) healthy, how big, how busy —
// and, with a Neon API key in the server settings, Neon's own usage
// figures (compute hours, storage, transfer). Read-only.
const LIGHT = { bad: ['🔴', 'var(--red-500)'], warn: ['🟠', 'var(--gold)'], info: ['ℹ️', 'var(--slate-400)'] };
const time = (d) => (d ? new Date(d).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' }) : '—');
const day = (d) => (d ? new Date(d).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short' }) : '');

function Bar({ pct }) {
  if (pct === null || pct === undefined) return null;
  const color = pct >= 95 ? 'var(--red-500)' : pct >= 80 ? 'var(--gold)' : 'var(--green-500)';
  return (
    <div style={{ height: 8, background: 'var(--slate-800)', borderRadius: 4, marginTop: 6, overflow: 'hidden' }} aria-label={`${pct}% used`}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color }} />
    </div>
  );
}

function Stat({ label, value, sub, pct }) {
  return (
    <div className="card" style={{ margin: 0, padding: 14 }}>
      <div style={{ fontSize: 12, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 2 }}>{sub}</div>}
      <Bar pct={pct} />
    </div>
  );
}

export default function AdminDatabase() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async (fresh) => {
    setErr('');
    setBusy(true);
    try { setD(await getDatabaseHealth(fresh)); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  useEffect(() => { load(false); }, []);

  const db = d?.database;
  const nx = d?.neon;
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, maxWidth: 680, margin: '0 0 16px' };

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>🗄️ Database</h1>
        <p>Health, size and usage of your database (Neon). Checked about every hour — you’re alerted if anything needs you.</p>
      </div>

      {err && <p className="error-text">{err}</p>}
      {!d && !err && <p className="empty-state">Checking the database…</p>}

      {d && (
        <>
          <div className="card" style={{ margin: '0 0 16px', maxWidth: 680, borderColor: !db.ok ? 'var(--red-500)' : d.warnings.some((w) => w.level !== 'info') ? 'var(--gold)' : 'var(--green-500)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: !db.ok ? 'var(--red-500)' : 'var(--green-500)' }}>
              {!db.ok ? '🔴 The database is not answering' : `✅ Healthy · answered in ${db.pingMs} ms (${db.speed})`}
            </div>
            {d.warnings.map((w, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: 13, color: LIGHT[w.level][1] }}>
                <span aria-hidden="true">{LIGHT[w.level][0]}</span><span>{w.text}</span>
              </div>
            ))}
            <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 8 }}>Checked {time(db.checkedAt)}</div>
            <button type="button" className="btn btn-secondary" style={{ width: 'auto', marginTop: 10 }} disabled={busy} onClick={() => load(true)}>{busy ? 'Checking…' : '↻ Check again'}</button>
          </div>

          {db.ok && (
            <>
              <div style={grid}>
                <Stat label="Database size" value={db.sizeGb >= 1 ? `${db.sizeGb} GB` : `${db.sizeMb} MB`} sub={db.storageLimitGb ? `of ${db.storageLimitGb} GB (${db.storageUsedPct}%)` : 'Set NEON_STORAGE_LIMIT_GB for % used'} pct={db.storageUsedPct} />
                <Stat label="Connections" value={`${db.connections.used} / ${db.connections.max}`} sub={db.connections.longRunningQueries ? `${db.connections.longRunningQueries} slow query(ies)` : 'No slow queries'} pct={db.connections.max ? Math.round((db.connections.used / db.connections.max) * 100) : null} />
                <Stat label="Speed" value={`${db.pingMs} ms`} sub={db.speed === 'slow' ? 'Slow — often just waking up' : db.speed === 'ok' ? 'OK' : 'Fast'} />
              </div>

              <div className="card" style={{ margin: '0 0 16px', maxWidth: 680 }}>
                <b style={{ fontSize: 15 }}>Biggest tables</b>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 13, marginTop: 8, borderCollapse: 'collapse' }}>
                    <thead><tr style={{ textAlign: 'left', color: 'var(--slate-400)' }}><th style={{ padding: '4px 0' }}>Table</th><th>Size</th><th>Rows</th></tr></thead>
                    <tbody>
                      {db.biggestTables.map((t) => (
                        <tr key={t.name} style={{ borderTop: '1px solid var(--slate-800)' }}>
                          <td style={{ padding: '6px 0', wordBreak: 'break-all' }}>{t.name}</td>
                          <td>{t.mb} MB</td>
                          <td>{t.rows.toLocaleString('en-NG')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 6 }}>{db.postgres} · {db.database}</div>
              </div>
            </>
          )}

          <div className="card" style={{ margin: '0 0 16px', maxWidth: 680 }}>
            <b style={{ fontSize: 15 }}>Neon account</b>
            {!nx.connected ? (
              <div style={{ fontSize: 13, color: 'var(--slate-300)', marginTop: 8 }}>
                {nx.error ? <p className="error-text" style={{ margin: '0 0 8px' }}>{nx.error}</p> : <p style={{ margin: '0 0 8px' }}>Not connected yet — connect it to see compute hours, storage and data transfer for this month.</p>}
                {nx.howTo && <p style={{ margin: 0 }}>{nx.howTo}</p>}
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>
                  {nx.project.name}{nx.project.region ? ` · ${nx.project.region}` : ''}{nx.project.plan ? ` · ${nx.project.plan} plan` : ''}{nx.period.start ? ` · ${day(nx.period.start)} – ${day(nx.period.end)}` : ''}
                </div>
                <div style={{ ...grid, margin: '12px 0 0' }}>
                  <Stat label="Compute this month" value={`${nx.computeHours} h`} sub={nx.computeLimitHours ? `of ${nx.computeLimitHours} h (${nx.computeUsedPct}%)` : `${nx.activeHours} h awake`} pct={nx.computeUsedPct} />
                  <Stat label="Storage" value={`${nx.storageGb} GB`} sub={nx.storageLimitGb ? `of ${nx.storageLimitGb} GB (${nx.storageUsedPct}%)` : 'incl. history Neon keeps'} pct={nx.storageUsedPct} />
                  <Stat label="Data transfer" value={`${nx.transferGb} GB`} sub={`${nx.writtenGb} GB written`} />
                  {nx.estimate && <Stat label="Bill estimate" value={`${nx.estimate.currency}${nx.estimate.monthProjected ?? nx.estimate.soFar}`} sub={`so far ${nx.estimate.currency}${nx.estimate.soFar} · rough`} />}
                </div>
                {nx.computes.map((c, i) => (
                  <div key={i} style={{ fontSize: 13, marginTop: 10 }}>
                    {c.state === 'active' ? '🟢 Awake' : '😴 Asleep'} · {c.type === 'read_write' ? 'main' : c.type} compute · {c.size}{c.sleepsAfterSec > 0 ? ` · sleeps after ${Math.round(c.sleepsAfterSec / 60)} min idle` : ''}
                  </div>
                ))}
                <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 8 }}>Last active {time(nx.lastActive)}. {nx.note}</div>
              </>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
