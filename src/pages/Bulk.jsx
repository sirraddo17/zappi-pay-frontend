import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getVtpassServices, getVtpassVariations, getPricing, startBulkPurchase, getBulkJob } from '../api';
import PinConfirm from '../components/PinConfirm';
import BottomNav from '../components/BottomNav';
import PlanGrid from '../components/PlanGrid';
import { SvcHero, Step, NetChips, Summary, Trust } from '../components/ServiceKit';
import { detectNetwork, networkOf, NETWORK_STYLE } from '../lib/network';

const MAX = 50;
const AMOUNTS = [100, 200, 500, 1000, 2000, 5000];
const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

// Same price formula as the Buy page (display only; the server
// recomputes it for every number).
function priceFor(base, service, pricing) {
  const markup = Number(pricing?.markupPercentByService?.[service] || 0);
  const discountPct = Math.min(100, Math.max(0, Number(pricing?.discountPercentByService?.[service] || 0)));
  const cap = Number(pricing?.markupCapByService?.[service] || 0);
  const raw = (Number(base || 0) * markup) / 100;
  const markedUp = Math.round(Number(base || 0) + (cap > 0 ? Math.min(raw, cap) : raw));
  return Math.max(0, markedUp - Math.round(markedUp * (discountPct / 100)));
}

function parsePhones(text) {
  const out = [];
  const bad = [];
  // One number per line or comma; spaces inside a number are fine
  // ("0803 123 4567"). A line with several numbers split by spaces also works.
  const entries = [];
  for (const chunk of text.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean)) {
    const digits = chunk.replace(/\D/g, '');
    if (/^(0\d{10}|234\d{10})$/.test(digits)) entries.push(chunk);
    else entries.push(...chunk.split(/\s+/));
  }
  for (const p of entries.filter(Boolean)) {
    let n = p.replace(/\D/g, '');
    if (n.startsWith('234') && n.length === 13) n = `0${n.slice(3)}`;
    if (/^0\d{10}$/.test(n)) {
      if (!out.includes(n)) out.push(n);
    } else bad.push(p);
  }
  return { phones: out, bad };
}

const STATUS = {
  waiting: ['Waiting', 'wait'],
  success: ['Sent ✓', 'ok'],
  pending: ['Processing', 'wait'],
  failed: ['Failed · refunded', 'no'],
  skipped: ['Not bought', 'no'],
};

// Send airtime or the same data plan to many numbers at once.
export default function Bulk() {
  const { customer, refreshCustomer } = useAuth();
  const [service, setService] = useState('AIRTIME');
  const [providers, setProviders] = useState([]);
  const [providerId, setProviderId] = useState('');
  const [plans, setPlans] = useState([]);
  const [plan, setPlan] = useState('');
  const [amount, setAmount] = useState('');
  const [text, setText] = useState('');
  const [pricing, setPricing] = useState(null);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [job, setJob] = useState(null);
  const poll = useRef(null);

  useEffect(() => {
    getPricing().then(setPricing).catch(() => {});
    return () => clearInterval(poll.current);
  }, []);

  useEffect(() => {
    setProviders([]);
    setProviderId('');
    setPlans([]);
    setPlan('');
    getVtpassServices(service === 'AIRTIME' ? 'airtime' : 'data')
      .then((d) => setProviders(Array.isArray(d.content) ? d.content : []))
      .catch((e) => setError(e.message));
  }, [service]);

  useEffect(() => {
    setPlans([]);
    setPlan('');
    if (service !== 'DATA' || !providerId) return;
    getVtpassVariations(providerId)
      .then((d) => setPlans(d.content?.varations || d.content?.variations || []))
      .catch((e) => setError(e.message));
  }, [providerId, service]);

  const { phones, bad } = parsePhones(text);
  const chosenNet = networkOf(providerId);
  const otherNet = chosenNet ? phones.filter((n) => { const d = detectNetwork(n); return d && d !== chosenNet; }) : [];
  // First number typed picks the network (they can still change it).
  useEffect(() => {
    if (providerId || !providers.length || !phones.length) return;
    const d = detectNetwork(phones[0]);
    const p = d && providers.find((x) => networkOf(x.serviceID) === d);
    if (p) setProviderId(p.serviceID);
  }, [phones[0], providers]);
  const removeNum = (n) => setText(phones.filter((x) => x !== n).join('\n'));
  async function pasteNums() {
    try { const t = await navigator.clipboard.readText(); if (t) setText((x) => (x.trim() ? `${x.trim()}\n${t}` : t)); } catch { setError('Your phone blocked pasting — long-press the box and paste instead.'); }
  }
  const selectedPlan = plans.find((p) => p.variation_code === plan);
  const base = service === 'AIRTIME' ? Number(amount || 0) : Number(selectedPlan?.variation_amount || 0);
  const each = priceFor(base, service, pricing);
  const total = each * phones.length;
  const balance = Number(customer?.walletBalance || 0);

  function review(e) {
    e.preventDefault();
    setError('');
    if (!providerId) return setError('Choose a network.');
    if (!base) return setError(service === 'AIRTIME' ? 'Enter an amount.' : 'Choose a data plan.');
    if (bad.length) return setError(`Fix these numbers first: ${bad.slice(0, 5).join(', ')}`);
    if (!phones.length) return setError('Add at least one phone number.');
    if (phones.length > MAX) return setError(`You can send to up to ${MAX} numbers at once.`);
    if (total > balance) return setError(`You need ${naira(total)} but your wallet has ${naira(balance)}. Fund your wallet first.`);
    setConfirmOpen(true);
  }

  async function start(auth) {
    const r = await startBulkPurchase({ service, serviceID: providerId, variationCode: service === 'DATA' ? plan : undefined, amount: service === 'AIRTIME' ? Number(amount) : undefined, phones, ...auth });
    setConfirmOpen(false);
    setJob({ id: r.jobId, total: r.total, done: 0, status: 'running', results: phones.map((phone) => ({ phone, status: 'waiting' })) });
    clearInterval(poll.current);
    poll.current = setInterval(async () => {
      try {
        const j = await getBulkJob(r.jobId);
        setJob(j);
        if (j.status !== 'running') {
          clearInterval(poll.current);
          refreshCustomer?.();
        }
      } catch {
        /* keep polling */
      }
    }, 2000);
  }

  if (job) {
    const ok = job.results.filter((x) => x.status === 'success').length;
    return (
      <div className="app-shell">
        <div className="page-header">
          <h1>Bulk {service === 'AIRTIME' ? 'airtime' : 'data'}</h1>
          <p>{job.status === 'running' ? `Sending… ${job.done} of ${job.total}` : `Done: ${ok} of ${job.total} sent`}</p>
        </div>
        <div className="card" style={{ margin: '0 16px 12px' }}>
          <div style={{ height: 8, background: 'var(--slate-700)', borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ width: `${(job.done / job.total) * 100}%`, height: '100%', background: 'var(--purple)', transition: 'width .3s' }} />
          </div>
          {job.results.map((x) => {
            const st = NETWORK_STYLE[detectNetwork(x.phone)];
            return (
              <div key={x.phone} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 14 }}>
                <span className="hist-ico" style={{ width: 30, height: 30, borderRadius: '50%', fontSize: 8, background: st?.bg || 'var(--slate-700)', color: st?.fg || '#fff' }}>{st?.name?.slice(0, 4) || '•'}</span>
                <span style={{ flex: 1, fontVariantNumeric: 'tabular-nums' }}>{x.phone}{x.error && x.status === 'failed' && <small style={{ display: 'block', color: 'var(--slate-400)', fontSize: 11 }}>{x.error}</small>}</span>
                <span className={`pill ${STATUS[x.status]?.[1] || 'wait'}`}>{STATUS[x.status]?.[0] || x.status}</span>
              </div>
            );
          })}
          {job.status === 'stopped' && <p className="error-text" style={{ marginBottom: 0 }}>Stopped early (wallet balance or daily limit). Numbers marked "Not bought" were not charged.</p>}
        </div>
        {job.status !== 'running' && (
          <div style={{ display: 'flex', gap: 8, margin: '0 16px 90px' }}>
            <Link to="/orders" className="btn" style={{ textAlign: 'center', textDecoration: 'none' }}>View in Orders</Link>
            <button type="button" className="btn btn-secondary" onClick={() => { setJob(null); setText(''); }}>Send another</button>
          </div>
        )}
        <BottomNav />
      </div>
    );
  }

  const label = service === 'AIRTIME' ? 'airtime' : 'data';
  return (
    <div className="app-shell">
      <SvcHero icon="📲" color="#0D9488" title="Bulk airtime & data" sub="Top up staff, family or customers — one payment, up to 50 numbers." steps={['Choose airtime or data', 'Add the numbers', 'Pay once, we send to all']} />
      {error && <p className="error-text" style={{ margin: '0 16px 12px' }}>{error}</p>}
      <form className="card" style={{ margin: '0 16px 90px' }} onSubmit={review}>
        <div className="seg2" role="tablist">
          {['AIRTIME', 'DATA'].map((s2) => (
            <button key={s2} type="button" role="tab" aria-selected={service === s2} className={service === s2 ? 'on' : ''} onClick={() => setService(s2)}>
              {s2 === 'AIRTIME' ? '📞 Airtime' : '📶 Data'}
            </button>
          ))}
        </div>

        <Step n={1} title="Network" right="all numbers on one network">
          {providers.length ? (
            <NetChips items={providers.map((p) => ({ key: p.serviceID, net: networkOf(p.serviceID), label: (NETWORK_STYLE[networkOf(p.serviceID)]?.name) || p.name.replace(/\s*\b(Airtime|VTU|Data)\b/gi, '').trim() }))} value={providerId} onChange={setProviderId} />
          ) : <p style={{ color: 'var(--slate-400)', fontSize: 13, margin: 0 }}>Loading networks…</p>}
        </Step>

        {service === 'AIRTIME' ? (
          <Step n={2} title="Amount for each number">
            <div className="val-grid" style={{ marginBottom: 8 }}>
              {AMOUNTS.map((a2) => {
                const pay = priceFor(a2, 'AIRTIME', pricing);
                return (
                  <button key={a2} type="button" className={`val-tile${Number(amount) === a2 ? ' on' : ''}`} onClick={() => setAmount(String(a2))} aria-pressed={Number(amount) === a2}>
                    <b>{naira(a2)}</b>{pay !== a2 && <small>pay {naira(pay)}</small>}
                  </button>
                );
              })}
            </div>
            <input id="bamt" type="number" inputMode="numeric" min="50" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Or type an amount (min ₦50)" aria-label="Amount per number" />
          </Step>
        ) : (
          <Step n={2} title="Data plan for every number">
            {providerId ? <PlanGrid variations={plans} value={plan} onChange={setPlan} priceOf={(b) => ({ base: Number(b), total: priceFor(b, 'DATA', pricing) })} /> : <p style={{ color: 'var(--slate-400)', fontSize: 13, margin: 0 }}>Choose a network first.</p>}
          </Step>
        )}

        <Step n={3} title="Phone numbers" right={`${phones.length}/${MAX}`}>
          <textarea id="bphones" className="num-ta" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Type or paste numbers — one per line or comma\n08031234567, 08129876543'} aria-label="Phone numbers" />
          <div className="num-tools">
            <span>
              <button type="button" onClick={pasteNums}>📋 Paste</button>
              {customer?.phone && !phones.includes(customer.phone) && <> · <button type="button" onClick={() => setText((x) => (x.trim() ? `${x.trim()}\n${customer.phone}` : customer.phone))}>+ My number</button></>}
            </span>
            {text && <button type="button" onClick={() => setText('')} style={{ color: 'var(--slate-400)' }}>Clear</button>}
          </div>
          {(phones.length > 0 || bad.length > 0) && (
            <div className="num-list">
              {phones.map((n) => {
                const d = detectNetwork(n);
                const st = NETWORK_STYLE[d];
                return (
                  <span key={n} className={`num-chip${chosenNet && d && d !== chosenNet ? ' warn' : ''}`} title={chosenNet && d && d !== chosenNet ? `Looks like ${st?.name}` : undefined}>
                    <i style={{ background: st?.bg || 'var(--slate-700)', color: st?.fg || '#fff' }}>{st?.name?.slice(0, 4) || '?'}</i>{n}
                    <button type="button" onClick={() => removeNum(n)} aria-label={`Remove ${n}`}>×</button>
                  </span>
                );
              })}
              {bad.map((b2) => <span key={b2} className="num-chip bad">{b2} · not valid</span>)}
            </div>
          )}
          {otherNet.length > 0 && <p style={{ fontSize: 12, color: 'var(--gold)', margin: '8px 0 0' }}>⚠ {otherNet.length} number{otherNet.length === 1 ? ' looks' : 's look'} like another network (gold). Ported numbers are fine — otherwise remove them and send in a separate batch.</p>}
        </Step>

        {each > 0 && phones.length > 0 && (
          <Summary
            rows={[
              ['Network', NETWORK_STYLE[chosenNet]?.name || '—'],
              [service === 'AIRTIME' ? 'Airtime each' : 'Plan', service === 'AIRTIME' ? naira(base) : selectedPlan?.name],
              ['Each costs', naira(each)],
              ['Numbers', `× ${phones.length}`],
              ['Wallet balance', naira(balance), total > balance ? 'bad' : undefined],
            ]}
            total={naira(total)}
            note={total > balance ? undefined : each < base ? `You save ${naira((base - each) * phones.length)} in total` : undefined}
          />
        )}
        <button className="btn" type="submit" style={{ marginTop: 12 }}>{phones.length && each ? `Send ${label} to ${phones.length} number${phones.length === 1 ? '' : 's'} · ${naira(total)}` : 'Review & pay'}</button>
        <Trust>Each number is sent one by one. Any that fail are refunded to your wallet straight away.</Trust>
      </form>

      <PinConfirm
        open={confirmOpen}
        title={`Send ${label} to ${phones.length} numbers`}
        details={{ rows: [['Network', NETWORK_STYLE[chosenNet]?.name || '—'], [service === 'AIRTIME' ? 'Airtime each' : 'Plan', service === 'AIRTIME' ? naira(base) : selectedPlan?.name || ''], ['Each costs', naira(each)], ['Numbers', `${phones.length}`]], total: naira(total), note: 'Failed numbers are refunded instantly.' }}
        onSubmit={start}
        onError={(err) => setError(err.message || 'Could not start.')}
        onClose={() => setConfirmOpen(false)}
      />
      <BottomNav />
    </div>
  );
}
