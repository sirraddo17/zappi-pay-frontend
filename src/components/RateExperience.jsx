import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { shouldAskFeedback, sendFeedback, markFeedbackShared } from '../api';
import { useAuth } from '../context/AuthContext';

const SNOOZE_KEY = 'zappipay_feedback_snooze';
const SERVICE_WORDS = { AIRTIME: 'airtime', DATA: 'data', ELECTRICITY: 'electricity', CABLE: 'my TV subscription', EDUCATION: 'exam PINs', INTERNET: 'internet', BETTING: 'bet funding' };

let askCache = null; // one check per app session

function snoozed() {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY) || 0) > Date.now();
  } catch {
    return false;
  }
}
function snooze(days) {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + days * 24 * 3600 * 1000));
  } catch {
    // ignore
  }
}

// After a successful purchase: "How was it?" Happy customers are
// invited to share ZAPPI PAY with their referral link; unhappy ones can
// tell us what went wrong (low ratings alert the admin).
export default function RateExperience({ order, flush = false, maxAgeMs = 24 * 3600 * 1000 }) {
  const { customer } = useAuth();
  const [info, setInfo] = useState(null);
  const [stage, setStage] = useState('ask'); // ask | comment | share | thanks | hidden
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [feedbackId, setFeedbackId] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!order || order.status !== 'SUCCESS' || snoozed()) return;
    if (Date.now() - new Date(order.createdAt).getTime() > maxAgeMs) return;
    if (!askCache) askCache = shouldAskFeedback().catch(() => ({ ask: false }));
    askCache.then((r) => r.ask && setInfo(r));
  }, [order?.id, order?.status]);

  if (!info || stage === 'hidden') return null;

  const code = customer?.username;
  const link = code ? `${window.location.origin}/signup?ref=${code}` : `${window.location.origin}/`;
  const what = SERVICE_WORDS[order.service] || 'a bill';
  const shareText = `I just paid for ${what} on ZAPPI PAY in seconds ⚡ Airtime, data, electricity, TV and exam PINs, all in one app.${code ? ` Join with my code ${code}:` : ''} ${link}`;

  async function rate(n) {
    setRating(n);
    if (n >= 4) {
      try {
        const r = await sendFeedback({ rating: n, orderId: order.id });
        setFeedbackId(r.id);
      } catch {
        // still show the share step
      }
      askCache = Promise.resolve({ ask: false });
      setStage('share');
    } else {
      setStage('comment');
    }
  }

  async function submitComment(e) {
    e.preventDefault();
    try {
      await sendFeedback({ rating, orderId: order.id, comment: comment.trim() || undefined });
    } catch {
      // ignore
    }
    askCache = Promise.resolve({ ask: false });
    setStage('thanks');
  }

  function shared() {
    if (feedbackId) markFeedbackShared(feedbackId).catch(() => {});
  }

  async function nativeShare() {
    shared();
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ZAPPI PAY', text: shareText });
        return;
      } catch {
        // cancelled
      }
    }
    copy();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      shared();
    } catch {
      // ignore
    }
  }

  const box = { margin: flush ? '0 0 16px' : '0 16px 16px', border: '1px solid var(--purple)', background: 'rgba(134,59,255,0.08)' };
  const chip = { width: 'auto', padding: '8px 12px', fontSize: 13, textDecoration: 'none' };
  const brand = (bg) => ({ ...chip, background: bg, color: '#fff', border: 'none' });

  if (stage === 'ask') {
    return (
      <div className="card" style={box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <b style={{ fontSize: 15 }}>How was your purchase?</b>
          <button type="button" aria-label="Not now" onClick={() => { snooze(3); setStage('hidden'); }} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }} role="group" aria-label="Rate 1 to 5 stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => rate(n)} style={{ background: 'none', border: 'none', fontSize: 32, cursor: 'pointer', padding: 0, lineHeight: 1, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))' }}>
              ⭐
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (stage === 'comment') {
    return (
      <form className="card" style={box} onSubmit={submitComment}>
        <b style={{ fontSize: 15 }}>Sorry it wasn't great. What went wrong?</b>
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          placeholder="Tell us so we can fix it"
          style={{ width: '100%', boxSizing: 'border-box', marginTop: 8, fontFamily: 'inherit', fontSize: 14, background: 'var(--slate-900)', border: '1px solid var(--slate-700)', borderRadius: 8, color: 'var(--slate-100)', padding: 8 }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <button className="btn" type="submit" style={chip}>Send</button>
          {rating <= 2 && <span style={{ fontSize: 13, color: 'var(--slate-400)', alignSelf: 'center' }}>Our team will see this straight away.</span>}
        </div>
      </form>
    );
  }

  if (stage === 'thanks') {
    return (
      <div className="card" style={box}>
        <b>Thank you — we've got it. 💜</b>
        <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 0' }}>If you need help with this order, tap “Report an Issue” below or use the ? help button.</p>
      </div>
    );
  }

  return (
    <div className="card" style={box}>
      <b style={{ fontSize: 15 }}>Glad you loved it! 🎉</b>
      <p style={{ fontSize: 13, color: 'var(--slate-300, #cbd5e1)', margin: '4px 0 10px' }}>
        Share ZAPPI PAY with friends{info.referralEnabled && info.referralBonus > 0 ? ` — you earn ₦${info.referralBonus.toLocaleString()} when they sign up with your code and make their first purchase` : ''}.
      </p>
      {!code && (
        <p style={{ fontSize: 13, margin: '0 0 10px' }}>
          <Link to="/refer" style={{ color: 'var(--purple)', fontWeight: 600 }}>Choose a username first</Link> to get your referral code.
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a className="btn" style={brand('#25D366')} href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" onClick={shared}>WhatsApp</a>
        <a className="btn" style={brand('#000')} href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" onClick={shared}>Post on X</a>
        <a className="btn" style={brand('#1877F2')} href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer" onClick={shared}>Facebook</a>
        <button type="button" className="btn btn-secondary" style={chip} onClick={nativeShare}>{copied ? 'Copied!' : 'More…'}</button>
      </div>
    </div>
  );
}
