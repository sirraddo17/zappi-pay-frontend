import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { request } from '../api';
import { useAuth } from '../context/AuthContext';
import { ResultBadge } from '../components/Celebrate';
import BottomNav from '../components/BottomNav';

// Where Monnify sends customers back after paying at checkout.
export default function CheckoutReturn() {
  const { ref } = useParams();
  const navigate = useNavigate();
  const { refreshCustomer } = useAuth();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let stop = false; let n = 0;
    const tick = () => request(`/api/checkout/${encodeURIComponent(ref)}`).then((x) => {
      if (stop) return;
      setD(x);
      if (x.status === 'DONE' && x.orderId) { Promise.resolve(refreshCustomer?.()).catch(() => {}); navigate(`/orders/${x.orderId}?new=1`, { replace: true }); return; }
      if (['PENDING', 'PAID'].includes(x.status) && n++ < 30) setTimeout(tick, 3000);
      if (x.status === 'PURCHASE_FAILED') Promise.resolve(refreshCustomer?.()).catch(() => {});
    }).catch((e) => setErr(e.message));
    tick();
    return () => { stop = true; };
  }, [ref]);
  const st = d?.status;
  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <div className="card pop-in" style={{ textAlign: 'center', marginTop: 32 }}>
        <ResultBadge status={st === 'DONE' ? 'SUCCESS' : ['EXPIRED', 'FAILED', 'PURCHASE_FAILED'].includes(st) ? 'FAILED' : 'PENDING'} />
        {err && <p className="error-text">{err}</p>}
        {!d ? <p>Checking your payment…</p> : (
          <>
            <b style={{ fontSize: 17 }}>{st === 'PURCHASE_FAILED' ? 'Payment received — purchase not completed' : ['EXPIRED', 'FAILED'].includes(st) ? 'Payment not completed' : 'Confirming your payment…'}</b>
            <p style={{ fontSize: 14, color: 'var(--slate-400)' }}>
              {st === 'PURCHASE_FAILED' ? `Your money is safe in your wallet. ${d.message || ''}` : ['EXPIRED', 'FAILED'].includes(st) ? 'You weren’t charged. You can try again or fund your wallet.' : `${d.label} — this takes a few seconds.`}
            </p>
            {st === 'PENDING' && d.checkoutUrl && <a href={d.checkoutUrl} className="btn btn-secondary" style={{ display: 'inline-block', width: 'auto', textDecoration: 'none' }}>Go back to payment</a>}
            {['EXPIRED', 'FAILED', 'PURCHASE_FAILED'].includes(st) && <Link to="/" className="btn" style={{ display: 'inline-block', width: 'auto', textDecoration: 'none' }}>Back home</Link>}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
