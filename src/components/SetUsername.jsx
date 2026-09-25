import { useEffect, useState } from 'react';
import { checkUsername, setMyUsername } from '../api';
import { useAuth } from '../context/AuthContext';

// For accounts created before usernames existed. The username is also
// the referral code, so it can be chosen only once.
export default function SetUsername({ onDone }) {
  const { refreshCustomer } = useAuth();
  const [value, setValue] = useState('');
  const [status, setStatus] = useState(null); // { available, error }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const clean = value.trim().toLowerCase().replace(/^@/, '');

  useEffect(() => {
    setStatus(null);
    if (clean.length < 3) return undefined;
    const t = setTimeout(() => {
      checkUsername(clean).then(setStatus).catch(() => setStatus(null));
    }, 400);
    return () => clearTimeout(t);
  }, [clean]);

  async function save(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await setMyUsername(clean);
      await refreshCustomer?.().catch(() => {});
      onDone?.(res.username);
    } catch (err) {
      setError(err.message || 'Could not save your username.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={save}>
      <b style={{ display: 'block', fontSize: 15 }}>Choose your username</b>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, margin: '4px 0 12px' }}>
        It becomes your referral code, and friends can also send you money with it. You can only set it once, so pick carefully.
      </p>
      <div className="field" style={{ marginBottom: 8 }}>
        <input
          aria-label="Username"
          placeholder="e.g. ridwan_ade"
          value={value}
          maxLength={21}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => setValue(e.target.value.replace(/\s/g, ''))}
        />
      </div>
      <p style={{ fontSize: 12, margin: '0 0 12px', minHeight: 16, color: status?.available ? 'var(--green-500)' : 'var(--red-500)' }}>
        {clean.length > 0 && clean.length < 3 && <span style={{ color: 'var(--slate-400)' }}>At least 3 characters: letters, numbers and _</span>}
        {status && (status.available ? `✓ @${clean} is available` : status.error)}
      </p>
      {error && <p className="error-text" style={{ margin: '0 0 12px' }}>{error}</p>}
      <button className="btn" type="submit" disabled={saving || !status?.available}>
        {saving ? 'Saving…' : 'Save username'}
      </button>
    </form>
  );
}
