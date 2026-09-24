import { Link } from 'react-router-dom';
import { SUPPORT_EMAIL } from '../assistant/knowledge';

// Public page (no login) explaining how to delete a ZappiPay account.
// Google Play requires a web link like this for apps with accounts.
export default function DeleteAccountInfo() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 60px', lineHeight: 1.6 }}>
      <Link to="/welcome" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>&larr; ZappiPay home</Link>
      <h1 style={{ marginBottom: 4 }}>Delete your ZappiPay account</h1>
      <p style={{ color: 'var(--slate-400)', marginTop: 0 }}>ZappiPay is operated by Sirraddo Venture (BN 7524870), Nigeria.</p>

      <h2 style={{ fontSize: 18 }}>In the app (fastest)</h2>
      <ol>
        <li>Log in to ZappiPay at <a href="https://www.zappipay.com.ng" style={{ color: 'var(--purple)' }}>www.zappipay.com.ng</a> or in the app.</li>
        <li>Spend or withdraw any money left in your wallet.</li>
        <li>Go to <strong>Profile → Delete my account</strong>, enter your password and confirm.</li>
      </ol>
      <p>We process requests within 7 days.</p>

      <h2 style={{ fontSize: 18 }}>By email</h2>
      <p>
        Email <a href={`mailto:${SUPPORT_EMAIL}?subject=Delete my account`} style={{ color: 'var(--purple)' }}>{SUPPORT_EMAIL}</a> from the email
        address on your account (or include your registered phone number) with the subject “Delete my account”.
      </p>

      <h2 style={{ fontSize: 18 }}>What is deleted and what is kept</h2>
      <ul>
        <li><strong>Deleted:</strong> your name, phone number, email, username, profile photo, PIN, saved numbers, scheduled top-ups, trusted devices and personal account numbers.</li>
        <li><strong>Kept:</strong> records of past transactions (amounts, dates, references), because financial record-keeping rules require us to keep them. They are no longer linked to your name or contact details.</li>
      </ul>
      <p>
        See our <Link to="/legal/privacy" style={{ color: 'var(--purple)' }}>Privacy Policy</Link> for more.
      </p>
    </div>
  );
}
