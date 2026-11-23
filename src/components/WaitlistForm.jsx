import { useState } from 'react';
import { joinWaitlist } from '../api';

const INTERESTS = [
  ['airtime', 'Airtime'], ['data', 'Data'], ['electricity', 'Electricity'], ['cable', 'Cable TV'],
  ['exam', 'Exam PINs'], ['betting', 'Bet funding'], ['transfer', 'Send money'], ['savings', 'Savings'],
];

// "Tell me when it launches" form on the welcome page. Shown while ZAPPI PAY is still in testing.
export default function WaitlistForm() {
  const [f, setF] = useState({ name: '', phone: '', email: '', interests: [], website: '' });
  const [state, setState] = useState({ busy: false, done: false, error: '' });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const toggle = (k) => setF((x) => ({ ...x, interests: x.interests.includes(k) ? x.interests.filter((i) => i !== k) : [...x.interests, k] }));

  async function submit(e) {
    e.preventDefault();
    setState({ busy: true, done: false, error: '' });
    try {
      let source = '';
      try { source = new URLSearchParams(window.location.search).get('utm_source') || new URLSearchParams(window.location.search).get('src') || ''; } catch { /* ignore */ }
      await joinWaitlist({ ...f, source });
      setState({ busy: false, done: true, error: '' });
    } catch (err) {
      setState({ busy: false, done: false, error: err.message || 'Could not save. Please try again.' });
    }
  }

  const input = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--slate-700)', background: 'rgba(255,255,255,0.04)', color: 'inherit', fontSize: 15 };

  return (
    <section className="lp-section" id="waitlist">
      <div className="lp-wrap" style={{ maxWidth: 560 }}>
        <h2>Be first when we launch</h2>
        <p style={{ color: 'var(--slate-400)', margin: '0 0 18px' }}>
          Leave your name and number and we’ll tell you the moment ZAPPI PAY is fully live. No spam, just one message.
        </p>
        {state.done ? (
          <div className="card" role="status" style={{ padding: 18, borderRadius: 14, border: '1px solid var(--green-500, #22c55e)' }}>
            <b>You’re on the list 🎉</b>
            <div style={{ color: 'var(--slate-400)', marginTop: 6, fontSize: 14 }}>We’ll message {f.phone}{f.email ? ` and ${f.email}` : ''} when we launch.</div>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
            <input aria-label="Your name" placeholder="Your name" value={f.name} onChange={set('name')} autoComplete="name" required maxLength={60} style={input} />
            <input aria-label="Phone number" placeholder="Phone number (e.g. 08012345678)" value={f.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" required maxLength={20} style={input} />
            <input aria-label="Email (optional)" placeholder="Email (optional)" type="email" value={f.email} onChange={set('email')} autoComplete="email" maxLength={120} style={input} />
            {/* Robots fill this in; people never see it. */}
            <input tabIndex={-1} aria-hidden="true" autoComplete="off" value={f.website} onChange={set('website')} name="website" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }} />
            <div style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>What will you use it for? (optional)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {INTERESTS.map(([k, label]) => {
                const on = f.interests.includes(k);
                return (
                  <button key={k} type="button" onClick={() => toggle(k)} aria-pressed={on}
                    style={{ padding: '7px 12px', borderRadius: 999, border: `1px solid ${on ? 'var(--purple, #7c3aed)' : 'var(--slate-700)'}`, background: on ? 'var(--purple, #7c3aed)' : 'transparent', color: on ? '#fff' : 'inherit', fontSize: 13, cursor: 'pointer' }}>
                    {label}
                  </button>
                );
              })}
            </div>
            {state.error && <div role="alert" style={{ color: 'var(--red-500, #ef4444)', fontSize: 14 }}>{state.error}</div>}
            <button type="submit" className="lp-btn lp-btn-primary" disabled={state.busy} style={{ marginTop: 6 }}>
              {state.busy ? 'Saving…' : 'Notify me at launch'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
