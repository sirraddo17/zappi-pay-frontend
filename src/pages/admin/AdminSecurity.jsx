import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { getSecurityOverview, unblockAddress, blockAddress } from '../../api';

const PERIODS = [[24, 'Last 24 hours'], [168, 'Last 7 days'], [720, 'Last 30 days']];
const LEVEL = { HIGH: ['var(--red-500)', '🔴'], MEDIUM: ['var(--gold)', '🟠'], LOW: ['var(--green-500)', '🟢'] };
const fmt = (d) => new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Admin → 🛡️ Security: what the attack watch saw and blocked.
export default function AdminSecurity() {
  const [hours, setHours] = useState(24);
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({ ip: '', hours: '24', reason: '' });

  const load = () => getSecurityOverview(hours).then(setD).catch((e) => setErr(e.message));
  useEffect(() => { setD(null); load(); }, [hours]);

  async function unblock(b) {
    if (!window.confirm(`Unblock ${b.ip}?`)) return;
    try { await unblockAddress(b.id); setMsg({ ok: true, text: `${b.ip} unblocked.` }); load(); } catch (e) { setMsg({ ok: false, text: e.message }); }
  }
  async function block(e, ip) {
    e?.preventDefault();
    const target = ip || form.ip.trim();
    if (!target || !window.confirm(`Block ${target} for ${form.hours} hours?`)) return;
    try {
      await blockAddress({ ip: target, hours: Number(form.hours), reason: form.reason || 'blocked by the owner' });
      setMsg({ ok: true, text: `${target} blocked.` });
      setForm({ ip: '', hours: '24', reason: '' });
      load();
    } catch (e2) { setMsg({ ok: false, text: e2.message }); }
  }

  const [color, dot] = LEVEL[d?.level] || LEVEL.LOW;
  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Security</h1>
        <p>Attack attempts the server saw, and addresses it blocked automatically</p>
      </div>
      <div className="admin-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {PERIODS.map(([h, l]) => <button key={h} type="button" className={hours === h ? 'btn' : 'btn btn-secondary'} style={{ width: 'auto', padding: '6px 14px' }} onClick={() => setHours(h)}>{l}</button>)}
        <Link to={`/admin/assistant?ask=${encodeURIComponent('Is anyone trying to hack us? Explain the security events simply and tell me what to do.')}`} className="btn btn-secondary" style={{ width: 'auto', padding: '6px 14px', textDecoration: 'none' }}>✨ Ask the AI</Link>
      </div>
      {err && <p className="error-text">{err}</p>}
      {msg && <p style={{ color: msg.ok ? 'var(--green-500)' : 'var(--red-500)' }}>{msg.text}</p>}
      {!d ? <p className="empty-state">Loading…</p> : (
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="card" style={{ margin: 0, border: `1px solid ${color}` }}>
            <b style={{ fontSize: 16 }}>{dot} {d.levelText}</b>
            <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '6px 0 0' }}>
              Automatic blocking is <b style={{ color: d.autoBlocking ? 'var(--green-500)' : 'var(--gold)' }}>{d.autoBlocking ? 'ON' : 'OFF'}</b> (Settings → Security). {d.blocksInPeriod} block{d.blocksInPeriod === 1 ? '' : 's'} in this period.
            </p>
            {d.needsAttention.length > 0 && <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 14 }}>{d.needsAttention.map((x) => <li key={x}>{x}</li>)}</ul>}
          </div>

          <div className="card" style={{ margin: 0 }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Blocked now ({d.activeBlocks.length})</h2>
            {d.activeBlocks.length === 0 ? <p className="empty-state" style={{ margin: 0 }}>No address is blocked.</p> : (
              <table className="table">
                <thead><tr><th>Address</th><th>Why</th><th>Until</th><th /></tr></thead>
                <tbody>{d.activeBlocks.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontFamily: 'monospace' }}>{b.ip}<div style={{ fontSize: 11, color: 'var(--slate-400)', fontFamily: 'inherit' }}>{b.scope === 'ADMIN' ? 'Admin pages only' : 'Whole app'}{b.auto ? ' · automatic' : ' · by you'}</div></td>
                    <td style={{ fontSize: 13 }}>{b.reason}</td>
                    <td style={{ fontSize: 13 }}>{fmt(b.until)}</td>
                    <td><button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }} onClick={() => unblock(b)}>Unblock</button></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>

          <div className="card" style={{ margin: 0 }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>What was tried</h2>
            {d.counts.length === 0 ? <p className="empty-state" style={{ margin: 0 }}>Nothing unusual.</p> : (
              <div style={{ display: 'grid', gap: 4, fontSize: 14 }}>
                {d.counts.map((c) => <div key={c.kind} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>{c.label}</span><b>{c.count}</b></div>)}
              </div>
            )}
          </div>

          {d.topAddresses.length > 0 && (
            <div className="card" style={{ margin: 0 }}>
              <h2 style={{ marginTop: 0, fontSize: 16 }}>Busiest addresses</h2>
              <p style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: -6 }}>Many customers can share one mobile-network address — only block one that is clearly attacking.</p>
              <table className="table">
                <thead><tr><th>Address</th><th>What</th><th /></tr></thead>
                <tbody>{d.topAddresses.map((a) => (
                  <tr key={a.ip}>
                    <td style={{ fontFamily: 'monospace' }}>{a.ip}</td>
                    <td style={{ fontSize: 13 }}>{a.kinds}</td>
                    <td>{!d.activeBlocks.some((b) => b.ip === a.ip) && <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }} onClick={() => block(null, a.ip)}>Block 24h</button>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {d.recent.length > 0 && (
            <div className="card" style={{ margin: 0 }}>
              <h2 style={{ marginTop: 0, fontSize: 16 }}>Latest events</h2>
              <div style={{ display: 'grid', gap: 6 }}>
                {d.recent.map((r, i) => (
                  <div key={i} style={{ fontSize: 13, background: 'var(--slate-800)', borderRadius: 8, padding: '6px 10px' }}>
                    <b>{r.label}</b>{r.count > 1 ? ` ×${r.count}` : ''} <span style={{ color: 'var(--slate-400)' }}>· {fmt(r.at)} · {r.ip || '—'}</span>
                    {(r.path || r.detail) && <div style={{ color: 'var(--slate-400)', fontSize: 12, wordBreak: 'break-all' }}>{r.detail || ''}{r.detail && r.path ? ' · ' : ''}{r.path || ''}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <form className="card" style={{ margin: 0 }} onSubmit={block}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Block an address yourself</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              <div className="field"><label htmlFor="bIp">Address (IP)</label><input id="bIp" value={form.ip} onChange={(e) => setForm((f) => ({ ...f, ip: e.target.value }))} placeholder="e.g. 102.89.1.23" /></div>
              <div className="field"><label htmlFor="bH">Hours</label><input id="bH" type="number" min="0.25" max="720" value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))} /></div>
              <div className="field"><label htmlFor="bR">Reason</label><input id="bR" maxLength={120} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} /></div>
            </div>
            <button className="btn" type="submit" style={{ width: 'auto' }} disabled={!form.ip.trim()}>Block</button>
          </form>
          <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: 0 }}>Floods that try to take the whole site down are stopped before they reach the server — that needs Cloudflare on your domain. Payment messages from Monnify are never blocked.</p>
        </div>
      )}
    </AdminLayout>
  );
}
