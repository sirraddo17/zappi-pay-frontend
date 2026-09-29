import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { getServiceStatus } from '../api';

// Public status page (status.zappipay.com.ng and /status).
const STATE = {
  OPERATIONAL: { label: 'Working', icon: '✓', color: 'var(--green-500)' },
  DEGRADED: { label: 'Slow / some failures', icon: '!', color: 'var(--gold)' },
  MAINTENANCE: { label: 'Paused for maintenance', icon: '⏸', color: '#3b82f6' },
  DOWN: { label: 'Not working', icon: '✕', color: 'var(--red-500)' },
};
const OVERALL = {
  OPERATIONAL: 'All services are working',
  DEGRADED: 'Some services are having problems',
  MAINTENANCE: 'Some services are paused for maintenance',
  DOWN: 'Some services are not working right now',
};

export default function Status() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);

  function load() {
    getServiceStatus().then((d) => { setData(d); setErr(false); }).catch(() => setErr(true));
  }
  useEffect(() => {
    document.title = 'ZAPPI PAY status';
    load();
    const t = setInterval(load, 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const overall = err ? 'DOWN' : data?.overall;
  const o = overall ? STATE[overall] : null;

  return (
    <div className="app-shell" style={{ paddingBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 16px 8px' }}>
        <Link to="/welcome" style={{ textDecoration: 'none' }} aria-label="ZAPPI PAY home"><Logo iconSize={32} wordmarkSize={18} /></Link>
        <span style={{ fontSize: 13, color: 'var(--slate-400)' }}>Service status</span>
      </div>

      {!data && !err && <p className="empty-state">Checking services…</p>}

      {o && (
        <div className="card" style={{ border: `1px solid ${o.color}`, display: 'flex', gap: 12, alignItems: 'center' }}>
          <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: '50%', background: o.color, color: '#0f1628', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{o.icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{err ? 'We can’t reach ZAPPI PAY right now' : OVERALL[overall]}</div>
            <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>
              {err ? 'The server may be restarting — this page checks again every minute.' : `Checked ${new Date(data.checkedAt).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })} · updates every minute`}
            </div>
          </div>
        </div>
      )}

      {data?.services && (
        <div className="card" style={{ padding: 0 }}>
          {data.services.map((s, i) => {
            const st = STATE[s.state] || STATE.DOWN;
            return (
              <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderTop: i ? '1px solid var(--slate-700)' : 'none' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{s.label}</div>
                  {s.note && <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{s.note}</div>}
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap', color: 'var(--slate-100)' }}>
                  <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: '50%', background: st.color, color: '#0f1628', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800 }}>{st.icon}</span>
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ padding: '0 16px', fontSize: 13, color: 'var(--slate-400)', lineHeight: 1.6 }}>
        <p>If a purchase fails, your wallet is refunded automatically. Money you send to your ZAPPI PAY account number is never lost — if funding is slow, it arrives once the service recovers.</p>
        <p>Still stuck? <Link to="/help" style={{ color: 'var(--purple)' }}>Help Centre</Link> · <Link to="/legal/contact" style={{ color: 'var(--purple)' }}>Contact us</Link></p>
      </div>
    </div>
  );
}
