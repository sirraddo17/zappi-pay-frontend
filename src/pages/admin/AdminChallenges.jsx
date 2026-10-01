import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { useShowMore } from '../../components/ShowMore';
import { getAdminChallenges, previewChallenge, createChallenge, updateChallenge } from '../../api';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const SERVICES = [['', 'Any service'], ['AIRTIME', 'Airtime'], ['DATA', 'Data'], ['ELECTRICITY', 'Electricity'], ['CABLE', 'Cable TV'], ['EDUCATION', 'Exam PINs'], ['INTERNET', 'Internet'], ['BETTING', 'Betting'], ['INTERNATIONAL', 'International airtime'], ['INSURANCE', 'Car insurance']];
const KINDS = [['COUNT', 'Buy a number of times'], ['SPEND', 'Spend a total amount'], ['STREAK', 'Buy on days in a row']];
const PERIODS = [['MONTHLY', 'Every month (resets on the 1st)'], ['WEEKLY', 'Every week (resets on Monday)'], ['ONCE', 'One time only (between dates)']];

const EMPTY = { title: '', description: '', kind: 'COUNT', service: 'DATA', target: '5', minAmount: '500', reward: '50', period: 'MONTHLY', startsAt: '', endsAt: '', budget: '' };
const TEMPLATES = [
  { label: 'Data 5× a month → ₦50', v: { title: 'Buy data 5 times this month', kind: 'COUNT', service: 'DATA', target: '5', minAmount: '1000', reward: '50', period: 'MONTHLY' } },
  { label: '₦10k electricity → ₦50', v: { title: 'Spend ₦10,000 on electricity', kind: 'SPEND', service: 'ELECTRICITY', target: '10000', minAmount: '0', reward: '50', period: 'MONTHLY' } },
  { label: '5-day streak → ₦20', v: { title: 'Buy something 5 days in a row', kind: 'STREAK', service: '', target: '5', minAmount: '500', reward: '20', period: 'WEEKLY' } },
];

function toBody(f) {
  return {
    title: f.title,
    description: f.description,
    kind: f.kind,
    service: f.service || null,
    target: Number(f.target),
    minAmount: Number(f.minAmount || 0),
    reward: Number(f.reward),
    period: f.period,
    startsAt: f.startsAt ? new Date(`${f.startsAt}T00:00:00+01:00`).toISOString() : null,
    endsAt: f.endsAt ? new Date(`${f.endsAt}T23:59:59+01:00`).toISOString() : null,
    budget: f.budget === '' ? null : Number(f.budget),
  };
}

function goal(c) {
  const what = SERVICES.find(([k]) => k === (c.service || ''))?.[1].toLowerCase() || 'any service';
  const min = c.minAmount > 0 ? `, ${naira(c.minAmount)}+ each` : '';
  if (c.kind === 'COUNT') return `Buy ${what} ${c.target}×${min}`;
  if (c.kind === 'SPEND') return `Spend ${naira(c.target)} on ${what}${min}`;
  return `${what} ${c.target} days in a row${min}`;
}

export default function AdminChallenges() {
  const [data, setData] = useState(null);
  const [f, setF] = useState(EMPTY);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const timer = useRef(null);

  function load() {
    getAdminChallenges().then(setData).catch((e) => setErr(e.message));
  }
  useEffect(load, []);
  const page = useShowMore(data?.challenges, []);

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  useEffect(() => {
    clearTimeout(timer.current);
    if (!f.title || !f.target || !f.reward) {
      setPreview(null);
      return undefined;
    }
    timer.current = setTimeout(() => {
      previewChallenge(toBody(f)).then(setPreview).catch((e) => setPreview({ note: e.message, fits: false, error: true }));
    }, 400);
    return () => clearTimeout(timer.current);
  }, [f]);

  async function save(e) {
    e.preventDefault();
    if (preview && !preview.fits && !preview.error && !window.confirm('This reward is bigger than the safety limit allows, so customers will get less than you advertise. Create it anyway?')) return;
    setBusy('create');
    setErr('');
    setMsg('');
    try {
      await createChallenge(toBody(f));
      setMsg(`“${f.title}” is live. Customers see it on their Home page.`);
      setF(EMPTY);
      load();
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy('');
    }
  }

  async function toggle(c) {
    setBusy(c.id);
    try {
      await updateChallenge(c.id, { active: !c.active });
      load();
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy('');
    }
  }

  const targetLabel = f.kind === 'SPEND' ? 'Total to spend (₦)' : f.kind === 'STREAK' ? 'Days in a row' : 'Number of purchases';

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Challenges</h1>
        <p>Reward customers for buying — “buy data 5 times this month, get ₦50”. Paid automatically into their wallet when they finish, once per period. Rewards come from your earnings and your <Link to="/admin/settings" style={{ color: 'var(--purple)' }}>giveaway safety limit</Link>{data?.safetyLimit != null ? ` (${data.safetyLimit}%)` : ''} keeps them from going over. For money back on every purchase, use Settings → Cashback instead.</p>
      </div>

      <form className="card" style={{ maxWidth: 720, margin: '0 0 16px' }} onSubmit={save}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>New challenge</h2>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {TEMPLATES.map((t) => (
            <button key={t.label} type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '5px 10px', fontSize: 12 }} onClick={() => setF({ ...EMPTY, ...t.v })}>{t.label}</button>
          ))}
        </div>
        {err && <p className="error-text" style={{ margin: '0 0 8px' }}>{err}</p>}
        {msg && <p style={{ color: 'var(--green-500)', fontSize: 14, margin: '0 0 8px' }}>{msg}</p>}
        <div className="field">
          <label htmlFor="c-title">Title customers see</label>
          <input id="c-title" value={f.title} onChange={set('title')} maxLength={80} placeholder="e.g. Buy data 5 times this month" required />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: '1 1 200px' }}>
            <label htmlFor="c-kind">What they must do</label>
            <select id="c-kind" value={f.kind} onChange={set('kind')}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </div>
          <div className="field" style={{ flex: '1 1 160px' }}>
            <label htmlFor="c-svc">On</label>
            <select id="c-svc" value={f.service} onChange={set('service')}>{SERVICES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </div>
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label htmlFor="c-target">{targetLabel}</label>
            <input id="c-target" type="number" min="1" value={f.target} onChange={set('target')} required />
          </div>
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label htmlFor="c-min">Each purchase at least (₦)</label>
            <input id="c-min" type="number" min="0" value={f.minAmount} onChange={set('minAmount')} />
          </div>
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label htmlFor="c-reward">Reward (₦)</label>
            <input id="c-reward" type="number" min="1" value={f.reward} onChange={set('reward')} required />
          </div>
          <div className="field" style={{ flex: '1 1 220px' }}>
            <label htmlFor="c-period">How often</label>
            <select id="c-period" value={f.period} onChange={set('period')}>{PERIODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </div>
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label htmlFor="c-start">Starts (optional)</label>
            <input id="c-start" type="date" value={f.startsAt} onChange={set('startsAt')} />
          </div>
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label htmlFor="c-end">Ends {f.period === 'ONCE' ? '(required)' : '(optional)'}</label>
            <input id="c-end" type="date" value={f.endsAt} onChange={set('endsAt')} required={f.period === 'ONCE'} />
          </div>
          <div className="field" style={{ flex: '1 1 160px' }}>
            <label htmlFor="c-budget">Total budget (₦, optional)</label>
            <input id="c-budget" type="number" min="1" value={f.budget} onChange={set('budget')} placeholder="No limit" />
          </div>
        </div>
        <div className="field">
          <input aria-label="Description" value={f.description} onChange={set('description')} maxLength={200} placeholder="Short description (optional) — shown instead of the automatic one" />
        </div>
        {preview && (
          <div style={{ fontSize: 13, padding: 10, borderRadius: 10, margin: '0 0 10px', background: preview.fits ? 'rgba(34,197,94,0.1)' : 'rgba(255,184,48,0.12)', border: `1px solid ${preview.fits ? 'var(--green-500)' : 'var(--gold)'}` }}>
            {preview.fits ? '✅ ' : '⚠️ '}{preview.note}
          </div>
        )}
        <button className="btn" type="submit" style={{ width: 'auto' }} disabled={busy === 'create'}>{busy === 'create' ? 'Creating…' : 'Create challenge'}</button>
        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '8px 0 0' }}>Only successful purchases count; refunded ones don’t. If the safety limit trims a reward, the customer gets the smaller amount and the rest waits until they buy more that period. To change a challenge, pause it and create a new one.</p>
      </form>

      {data === null ? <p className="empty-state">Loading…</p> : data.challenges.length === 0 ? <p className="empty-state">No challenges yet — try a template above.</p> : (
        <div style={{ display: 'grid', gap: 10, maxWidth: 720 }}>
          {page.visible.map((c) => (
            <div key={c.id} className="card" style={{ margin: 0, borderLeft: `4px solid ${c.running ? 'var(--green-500)' : 'var(--slate-600)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <b>{c.title}</b> · <span style={{ color: 'var(--gold)' }}>{naira(c.reward)}</span>
                  <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>
                    {goal(c)} · {c.period === 'MONTHLY' ? 'monthly' : c.period === 'WEEKLY' ? 'weekly' : 'one time'}
                    {c.endsAt ? ` · ends ${new Date(c.endsAt).toLocaleDateString('en-NG')}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c.running ? 'var(--green-500)' : 'var(--slate-400)' }}>{c.running ? 'Running' : c.active ? 'Not running now' : 'Paused'}</span>
                  <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }} disabled={busy === c.id} onClick={() => toggle(c)}>{c.active ? 'Pause' : 'Resume'}</button>
                </div>
              </div>
              <div style={{ fontSize: 13, marginTop: 6 }}>
                {c.completions} completed · {naira(c.paidTotal)} paid{c.budget != null ? ` of ${naira(c.budget)} budget` : ''}
              </div>
              {c.preview && <div style={{ fontSize: 12, marginTop: 4, color: c.preview.fits ? 'var(--slate-400)' : 'var(--gold)' }}>{c.preview.fits ? '' : '⚠️ '}{c.preview.note}</div>}
            </div>
          ))}
          {page.more}
        </div>
      )}
    </AdminLayout>
  );
}
