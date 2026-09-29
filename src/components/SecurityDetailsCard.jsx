import { useEffect, useState } from 'react';
import { getSecurityDetails, saveSecurityDetails } from '../api';
import { useAuth } from '../context/AuthContext';
import PasswordField from './PasswordField';
import SecurityDetailsFields from './SecurityDetailsFields';

// Profile → Security details. Customers who signed up before these
// existed add them here; others can change their security question.
export default function SecurityDetailsCard() {
  const { refreshCustomer } = useAuth();
  const [info, setInfo] = useState(null);
  const [open, setOpen] = useState(false);
  const [dob, setDob] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  function load() {
    getSecurityDetails().then(setInfo).catch(() => setInfo(null));
  }
  useEffect(load, []);
  useEffect(() => {
    if (info && window.location.hash === '#security-details') {
      document.getElementById('security-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [info]);
  if (!info) return null;
  const complete = info.hasDob && info.securityQuestion;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await saveSecurityDetails({ password, securityQuestion: question, securityAnswer: answer, ...(info.hasDob ? {} : { dateOfBirth: dob }) });
      setDone('Saved. Support can now confirm it\'s really you when you need help.');
      setOpen(false);
      setPassword('');
      setAnswer('');
      load();
      refreshCustomer?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="security-details" className="card" style={{ margin: '0 0 16px', border: complete ? undefined : '1px solid var(--gold, #f5b82e)' }}>
      <h2 style={{ marginTop: 0, fontSize: 16 }}>🔐 Security details</h2>
      {done && <p style={{ color: 'var(--green-500)', fontSize: 14, margin: '0 0 8px' }}>{done}</p>}
      {complete ? (
        <p style={{ color: 'var(--slate-400)', fontSize: 13, margin: 0 }}>
          ✓ Date of birth saved · ✓ Security question: <em>{info.securityQuestion}</em>
        </p>
      ) : (
        <p style={{ color: 'var(--slate-400)', fontSize: 13, margin: 0 }}>
          Add your date of birth and a security question. If you ever lose access or report a problem, support will ask these so nobody else can pretend to be you.
        </p>
      )}
      {!open ? (
        <button type="button" className={complete ? 'btn btn-secondary' : 'btn'} style={{ marginTop: 10 }} onClick={() => { setOpen(true); setDone(''); setQuestion(info.securityQuestion || ''); }}>
          {complete ? 'Change security question' : 'Add security details'}
        </button>
      ) : (
        <form onSubmit={submit} style={{ marginTop: 12 }}>
          {error && <p className="error-text" style={{ margin: '0 0 8px' }}>{error}</p>}
          <SecurityDetailsFields dob={dob} setDob={setDob} question={question} setQuestion={setQuestion} answer={answer} setAnswer={setAnswer} showDob={!info.hasDob} idPrefix="prof" />
          {info.hasDob && <p style={{ color: 'var(--slate-400)', fontSize: 12, marginTop: -4 }}>Your date of birth is already saved. To correct it, contact support.</p>}
          <div className="field">
            <label htmlFor="sd-pass">Your password (to confirm it's you)</label>
            <PasswordField id="sd-pass" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
