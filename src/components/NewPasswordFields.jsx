import PasswordField from './PasswordField';
import { passwordChecks } from '../lib/passwordRules';

// New password + "type it again", with a live checklist of the rules.
export default function NewPasswordFields({ password, setPassword, confirm, setConfirm, idPrefix = 'np', label = 'Password' }) {
  const checks = passwordChecks(password);
  const mismatch = confirm.length > 0 && confirm !== password;
  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-pw`}>{label}</label>
        <PasswordField id={`${idPrefix}-pw`} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
        {password.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', fontSize: 12, display: 'grid', gap: 2 }}>
            {checks.map((c) => (
              <li key={c.label} style={{ color: c.ok ? 'var(--green-500)' : 'var(--slate-400)' }}>
                {c.ok ? '✓' : '○'} {c.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-confirm`}>Type the password again</label>
        <PasswordField id={`${idPrefix}-confirm`} value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
        {mismatch && <p style={{ color: 'var(--red-500)', fontSize: 12, margin: '4px 0 0' }}>The two passwords don't match.</p>}
        {!mismatch && confirm.length > 0 && confirm === password && <p style={{ color: 'var(--green-500)', fontSize: 12, margin: '4px 0 0' }}>✓ Passwords match</p>}
      </div>
    </>
  );
}
