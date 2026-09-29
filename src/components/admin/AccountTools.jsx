import { useState } from 'react';
import { customerAccountTool } from '../../api';

// Owner-only fixes for the things customers most often ask support to
// reset. Always check it's really them first ("Check it's really them").
export default function AccountTools({ customer, onDone }) {
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  async function run(action, confirmText, extra = {}) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(action);
    setErr('');
    setMsg('');
    try {
      const r = await customerAccountTool(customer.id, { action, ...extra });
      setMsg(`✓ ${r.message}. ${customer.name.split(' ')[0]} was notified.`);
      setPhone('');
      setEmail('');
      onDone?.();
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(null);
    }
  }

  const row = (title, why, button, onClick, disabled) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--slate-700)' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{why}</div>
      </div>
      <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 13, flexShrink: 0 }} disabled={busy !== null || disabled} onClick={onClick}>{button}</button>
    </div>
  );
  const first = customer.name.split(' ')[0];

  return (
    <div className="card" style={{ margin: '0 0 16px' }}>
      <h2 style={{ marginTop: 0, fontSize: 16 }}>🔧 Account tools</h2>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: -6 }}>What customers most often ask support to reset. Check it’s really them first (panel above). Each action is logged and the customer is notified. Password reset is further down.</p>
      {err && <p className="error-text" style={{ margin: '0 0 8px' }}>{err}</p>}
      {msg && <p style={{ color: 'var(--green-500)', fontSize: 14, margin: '0 0 8px' }}>{msg}</p>}

      {row('Forgot transaction PIN', customer.hasPin ? 'Clears the PIN (and quick login). They create a new one in Security.' : 'No PIN set yet — nothing to reset.', 'Reset PIN',
        () => run('RESET_PIN', `Reset ${first}'s PIN? They'll create a new one before their next payment.`), !customer.hasPin)}
      {customer.pinLocked && row('PIN locked (too many wrong tries)', 'Unlocks it now instead of waiting 15 minutes.', 'Unlock PIN', () => run('UNLOCK_PIN'))}
      {row('Lost or changed phone', `Turns off quick login (${customer.quickLoginDevices ?? 0}) and fingerprint (${customer.fingerprintLogins ?? 0}) on every device. They log in with their password.`, 'Remove devices',
        () => run('REMOVE_DEVICES', `Remove quick login and fingerprint from all of ${first}'s devices?`), !(customer.quickLoginDevices || customer.fingerprintLogins))}
      {row('Forgot security answer / wrong date of birth', customer.hasDob || customer.hasSecurityAnswer ? 'Clears both. They set them again in Profile → Security details.' : 'Not set yet — nothing to reset.', 'Reset',
        () => run('RESET_SECURITY', `Reset ${first}'s date of birth and security question?`), !(customer.hasDob || customer.hasSecurityAnswer))}

      <div style={{ padding: '10px 0', borderTop: '1px solid var(--slate-700)' }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>New phone number or email</div>
        <div style={{ fontSize: 12, color: 'var(--slate-400)', marginBottom: 6 }}>Now: {customer.phone}{customer.email ? ` · ${customer.email}` : ' · no email'}. They log in with the new phone number afterwards.</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input aria-label="New phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="New phone (optional)" style={{ flex: '1 1 150px' }} />
          <input aria-label="New email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="New email (optional)" style={{ flex: '1 1 180px' }} />
          <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} disabled={busy !== null || (!phone.trim() && !email.trim())}
            onClick={() => run('CHANGE_CONTACT', `Change ${first}'s ${[phone && 'phone', email && 'email'].filter(Boolean).join(' and ')}? Only do this after checking it's really them.`, { phone: phone.trim() || undefined, email: email.trim() || undefined })}>
            Save
          </button>
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '8px 0 0' }}>Also on this page: username (top), agent status, freeze/reactivate (Customers list), reset password and wallet corrections (below).</p>
    </div>
  );
}
