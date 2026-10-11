import { useEffect, useState } from 'react';
import { getAdminReferralProgress } from '../../api';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

// Friends still working toward the referral bonus, with ₦ spent — so you
// can see who's close (customers only see a %).
export default function ReferralProgressPanel() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { getAdminReferralProgress().then(setD).catch((e) => setErr(e.message)); }, []);
  return (
    <div className="card" style={{ margin: '16px 0', maxWidth: 720 }}>
      <div style={{ fontWeight: 700, fontSize: 16 }}>👥 Invited friends — progress</div>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, margin: '4px 0 10px' }}>Friends who joined with a code and haven't earned their referrer a bonus yet, closest first.{d?.target > 0 ? ` Target: ${naira(d.target)} in total.` : ''}</p>
      {err && <p className="error-text">{err}</p>}
      {!d && !err && <p style={{ fontSize: 13 }}>Loading…</p>}
      {d && d.rows.length === 0 && <p style={{ fontSize: 13, margin: 0 }}>No one is waiting right now.</p>}
      {d && d.rows.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--slate-400)' }}>
                <th style={{ padding: 4 }}>Friend</th><th style={{ padding: 4 }}>Invited by</th><th style={{ padding: 4 }}>Spent</th><th style={{ padding: 4 }}>Progress</th><th style={{ padding: 4 }}>BVN/NIN</th>
              </tr>
            </thead>
            <tbody>
              {d.rows.map((r, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--slate-700, #334155)' }}>
                  <td style={{ padding: 4 }}>{r.name}<div style={{ fontSize: 11, color: 'var(--slate-400)' }}>joined {new Date(r.joinedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</div></td>
                  <td style={{ padding: 4 }}>{r.referrer}</td>
                  <td style={{ padding: 4 }}>{naira(r.spent)}{r.target > 0 ? <span style={{ color: 'var(--slate-400)' }}> / {naira(r.target)}</span> : null}</td>
                  <td style={{ padding: 4 }}>{r.pct != null ? `${r.pct}%` : '—'}</td>
                  <td style={{ padding: 4 }}>{r.verified ? '✓' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
