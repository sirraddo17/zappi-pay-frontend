// Shared bits for the Ajo Circle screens.
export const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
export const PER = { DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month' };
export const OFTEN = { DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly' };
export const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const STATUS = {
  FORMING: { label: 'Gathering members', color: 'var(--gold, #f5b82e)' },
  ACTIVE: { label: 'Running', color: 'var(--green-500)' },
  COMPLETED: { label: 'Completed', color: 'var(--slate-400)' },
  CANCELLED: { label: 'Stopped', color: 'var(--red-500)' },
};

export function Agreement({ terms }) {
  return (
    <div style={{ fontSize: 13, lineHeight: 1.5 }}>
      {(terms || []).map((s) => (
        <div key={s.h} style={{ marginBottom: 10 }}>
          <b>{s.h}</b>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{s.p.map((x) => <li key={x} style={{ marginBottom: 3 }}>{x}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}

export function RulesSummary({ c }) {
  const row = (k, v) => <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '5px 0', borderTop: '1px solid var(--slate-800)', fontSize: 13 }}><span style={{ color: 'var(--slate-400)' }}>{k}</span><b style={{ textAlign: 'right' }}>{v}</b></div>;
  return (
    <div>
      {row('Each member pays', `${naira(c.amount)} every ${PER[c.frequency]}`)}
      {row('Members', c.size)}
      {row('Each payout', `${naira(c.pot)}${c.payoutFee > 0 ? ` − ${naira(c.payoutFee)} fee` : ''}`)}
      {row('Payout fee', c.payoutFee > 0 ? `${naira(c.payoutFee)} per payout (${100 - c.appShare}% creator, ${c.appShare}% ZAPPI PAY)` : 'Free')}
      {row('Late fee', c.penaltyFee > 0 ? `${naira(c.penaltyFee)} after ${c.graceHours} hours (goes into the pot)` : `None (late after ${c.graceHours} hours = a strike)`)}
      {row('Move to the end after', `${c.strikesToLast} missed payment${c.strikesToLast === 1 ? '' : 's'}`)}
      {row('First payment day', fmtDay(c.startAt))}
    </div>
  );
}

export function HowItWorks() {
  const steps = [
    ['👥', 'Gather your people', 'Create a circle, share the link or invite by username. Everyone reads the rules and agrees with their PIN.'],
    ['🔢', 'Set the payout order', 'The creator sets who gets paid 1st, 2nd, 3rd… (or shuffles). Everyone sees it.'],
    ['⚡', 'Automatic payments', 'On each payment day the amount is taken from every wallet — with reminders 3 days before.'],
    ['🔒', 'Locked pot', 'Money waits in the pot where all can see it. Nobody can touch it — not even the creator.'],
    ['💸', 'Paid in turn', 'When everyone has paid, the pot goes to the member whose turn it is. Repeat until everyone is paid.'],
  ];
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {steps.map(([e, t, d], i) => (
        <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(134,59,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{e}</div>
          <div><b style={{ fontSize: 14 }}>{i + 1}. {t}</b><div style={{ fontSize: 13, color: 'var(--slate-400)' }}>{d}</div></div>
        </div>
      ))}
    </div>
  );
}
