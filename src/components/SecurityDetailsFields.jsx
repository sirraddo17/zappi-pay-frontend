import PasswordField from './PasswordField';
import { SECURITY_QUESTIONS, maxDob } from '../lib/passwordRules';

// Date of birth + security question/answer. Support uses these to
// confirm it's really you before helping with your account.
export default function SecurityDetailsFields({ dob, setDob, question, setQuestion, answer, setAnswer, showDob = true, idPrefix = 'sd' }) {
  return (
    <>
      {showDob && (
        <div className="field">
          <label htmlFor={`${idPrefix}-dob`}>Date of birth</label>
          <input id={`${idPrefix}-dob`} type="date" value={dob} max={maxDob()} min="1915-01-01" onChange={(e) => setDob(e.target.value)} required />
          <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '4px 0 0' }}>Support may ask for this to confirm it's really you. It can't be changed later, so enter it correctly.</p>
        </div>
      )}
      <div className="field">
        <label htmlFor={`${idPrefix}-q`}>Security question</label>
        <select id={`${idPrefix}-q`} value={question} onChange={(e) => setQuestion(e.target.value)} required>
          <option value="">Choose a question…</option>
          {SECURITY_QUESTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-a`}>Your answer</label>
        <PasswordField id={`${idPrefix}-a`} value={answer} onChange={(e) => setAnswer(e.target.value)} required autoComplete="off" />
        <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '4px 0 0' }}>Pick an answer only you know and will remember. Capital letters don't matter. We never show it to anyone, including our staff.</p>
      </div>
    </>
  );
}
