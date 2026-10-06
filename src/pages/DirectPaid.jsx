import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getDirectPaid } from '../api';
import Celebrate, { ResultBadge } from '../components/Celebrate';
import BottomNav from '../components/BottomNav';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

// Where Monnify sends people back after paying dues / spray / a pay-me link by card.
export default function DirectPaid() {
  const { ref } = useParams();
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let stop = false; let n = 0;
    const tick = () => getDirectPaid(ref).then((x) => {
      if (stop) return;
      setD(x);
      if (x.status === 'PENDING' && n++ < 30) setTimeout(tick, 3000);
      if (x.status === 'PAID' && x.kind === 'SPRAY') setTimeout(() => !stop && navigate(x.returnPath, { replace: true }), 1800);
    }).catch((e) => setErr(e.message));
    tick();
    return () => { stop = true; };
  }, [ref]);
  const st = d?.status;
  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      {st === 'PAID' && <Celebrate />}
      <div className="card pop-in" style={{ textAlign: 'center', marginTop: 32 }}>
        <ResultBadge status={st === 'PAID' ? 'SUCCESS' : ['EXPIRED', 'FAILED'].includes(st) ? 'FAILED' : 'PENDING'} />
        {err && <p className="error-text">{err}</p>}
        {!d ? <p>Checking your payment…</p> : (
          <>
            <b style={{ fontSize: 17 }}>{st === 'PAID' ? (d.kind === 'SPRAY' ? 'Spray budget ready — go and spray! 💃' : 'Payment successful 🎉') : ['EXPIRED', 'FAILED'].includes(st) ? 'Payment not completed' : 'Confirming your payment…'}</b>
            <p style={{ fontSize: 14, color: 'var(--slate-400)' }}>{st === 'PAID' ? `${naira(d.amount)} paid to ${d.to}.` : ['EXPIRED', 'FAILED'].includes(st) ? 'You weren’t charged. You can try again.' : d.description}</p>
            {st === 'PENDING' && d.checkoutUrl && <a href={d.checkoutUrl} className="btn btn-secondary" style={{ display: 'inline-block', width: 'auto', textDecoration: 'none' }}>Go back to payment</a>}
            {st !== 'PENDING' && <Link to={d.returnPath || '/'} className="btn" style={{ display: 'inline-block', width: 'auto', textDecoration: 'none' }}>Continue</Link>}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
