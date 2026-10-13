import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDisputes } from '../api';

// Home: "Someone says they sent you money by mistake" — so the recipient
// sees the request (and the hold) straight away.
export default function DisputeBanner() {
  const [w, setW] = useState([]);
  useEffect(() => { getDisputes().then((d) => setW(d.waiting || [])).catch(() => {}); }, []);
  if (!w.length) return null;
  const x = w[0];
  return (
    <Link to={`/disputes/${x.id}`} className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit', border: '1px solid var(--gold)', background: 'rgba(245,184,46,.08)' }}>
      <b>⚠️ Money sent to you by mistake?</b>
      <div style={{ fontSize: 13, color: 'var(--slate-300)', marginTop: 4 }}>
        Someone says ₦{Number(x.amount).toLocaleString()} they sent you was a mistake{x.held > 0 ? ` — ₦${Number(x.held).toLocaleString()} is on hold` : ''}. Please answer by {new Date(x.holdUntil).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}.
      </div>
    </Link>
  );
}
