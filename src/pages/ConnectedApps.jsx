import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getConnectedApps, createConnectedApp, removeConnectedApp, getPayoutRequests } from '../api';
import BottomNav from '../components/BottomNav';
import PinConfirm from '../components/PinConfirm';
import { SvcHero, naira } from '../components/ServiceKit';
import { useFeatures } from '../components/ServiceNotices';

const when = (d) => (d ? new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const PILL = { AWAITING_APPROVAL: ['Waiting for you', 'wait'], PROCESSING: ['Paying…', 'wait'], DONE: ['Paid', 'ok'], PARTIAL: ['Some failed', 'wait'], FAILED: ['Failed', 'no'], DECLINED: ['Declined', 'no'], EXPIRED: ['Expired', 'no'] };

function Copy({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }}
      onClick={() => navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {})}>
      {done ? 'Copied ✓' : 'Copy'}
    </button>
  );
}

// Profile → Connected apps: connect StoreWatch (or another business app)
// so it can send supplier payments for you to approve.
export default function ConnectedApps() {
  const feat = useFeatures();
  const [apps, setApps] = useState(null);
  const [reqs, setReqs] = useState([]);
  const [name, setName] = useState('StoreWatch');
  const [callbackUrl, setCallbackUrl] = useState('');
  const [pinOpen, setPinOpen] = useState(false);
  const [made, setMade] = useState(null);
  const [err, setErr] = useState('');
  const load = () => {
    getConnectedApps().then((d) => setApps(d.apps)).catch((e) => setErr(e.message));
    getPayoutRequests().then((d) => setReqs(d.requests || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  if (feat.connectedApps === false) {
    return (
      <div className="app-shell" style={{ paddingBottom: 90 }}>
        <SvcHero back="/more" icon="🔗" color="#0D9488" title="Connected apps" sub="This isn’t available yet." />
        <BottomNav />
      </div>
    );
  }

  async function create(auth) {
    const d = await createConnectedApp({ name, callbackUrl: callbackUrl.trim() || undefined, ...auth });
    setPinOpen(false);
    setMade(d);
    load();
  }
  async function remove(a) {
    setErr('');
    try { await removeConnectedApp(a.id); load(); } catch (e) { setErr(e.message); }
  }

  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <SvcHero back="/more" backLabel="More" icon="🔗" color="#0D9488" title="Connected apps"
        sub="Let your business app (e.g. StoreWatch) send supplier payments here for you to approve."
        steps={['Connect the app with a key', 'It sends what each branch owes', 'You check and approve with your PIN']} />
      {err && <p className="error-text" style={{ margin: '0 16px 10px' }}>{err}</p>}

      {made && (
        <div className="card" style={{ border: '1px solid var(--gold)' }}>
          <b>🔑 {made.app.name} is connected</b>
          <p style={{ fontSize: 13, color: 'var(--slate-300)', margin: '6px 0 10px' }}>Paste these into {made.app.name}’s settings now. They are shown <b>only once</b> — if you lose them, remove the app and connect it again.</p>
          {[['API key', made.apiKey], ['Signing secret (for receipts sent back)', made.signingSecret]].map(([k, v]) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--slate-400)', marginBottom: 4 }}>{k}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <code style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere', fontSize: 12, background: 'var(--slate-800, #0f2a2c)', padding: '6px 8px', borderRadius: 8 }}>{v}</code>
                <Copy text={v} />
              </div>
            </div>
          ))}
          <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: 0 }}>The key can only <b>ask</b> for payments. Nothing leaves your wallet until you approve it here with your PIN.</p>
          <button type="button" className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => setMade(null)}>I’ve saved them</button>
        </div>
      )}

      <div className="card">
        <b>Your connected apps</b>
        {!apps ? <p className="empty-state">Loading…</p> : !apps.length ? <p style={{ fontSize: 14, color: 'var(--slate-400)' }}>No apps connected yet.</p> : apps.map((a) => (
          <div key={a.id} className="hist-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '10px 0', borderTop: '1px solid var(--slate-700)' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{a.name} <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>· key …{a.keyHint}</span></div>
              <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>Connected {when(a.createdAt)}{a.lastUsedAt ? ` · last used ${when(a.lastUsedAt)}` : ''}</div>
            </div>
            <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '5px 12px', fontSize: 13, color: 'var(--red-500)' }} onClick={() => remove(a)}>Remove</button>
          </div>
        ))}
      </div>

      <form className="card" onSubmit={(e) => { e.preventDefault(); setErr(''); setPinOpen(true); }}>
        <b>Connect an app</b>
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="caName">App name</label>
          <input id="caName" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
        </div>
        <div className="field">
          <label htmlFor="caCb">Receipt callback URL (optional)</label>
          <input id="caCb" type="url" value={callbackUrl} onChange={(e) => setCallbackUrl(e.target.value)} placeholder="https://your-storewatch-backend/api/zappipay/webhook" />
          <small style={{ color: 'var(--slate-400)' }}>Where ZAPPI PAY sends the result and receipts after you approve.</small>
        </div>
        <button className="btn" type="submit">Create key</button>
      </form>

      {reqs.length > 0 && (
        <div className="card">
          <b>Payment requests</b>
          {reqs.map((r) => {
            const [label, tone] = PILL[r.status] || [r.status, 'wait'];
            return (
              <Link key={r.id} to={`/approve/${r.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '10px 0', borderTop: '1px solid var(--slate-700)', color: 'inherit', textDecoration: 'none' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{r.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{r.app} · {r.count} payment{r.count === 1 ? '' : 's'} · {when(r.createdAt)}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700 }}>{naira(r.total)}</div>
                  <span className={`pill ${tone}`}>{label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <PinConfirm
        open={pinOpen}
        title="Confirm with your PIN"
        summary={`Create a key for ${name}. It can send you payment requests; you approve each one.`}
        onSubmit={create}
        onError={(e) => setErr(e.message || 'Could not connect the app.')}
        onClose={() => setPinOpen(false)}
      />
      <BottomNav />
    </div>
  );
}
