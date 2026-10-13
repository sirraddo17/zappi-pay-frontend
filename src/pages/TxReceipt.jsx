import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getWalletTransaction } from '../api';
import BottomNav from '../components/BottomNav';
import { Summary, naira } from '../components/ServiceKit';
import { SkeletonRows } from '../components/Skeleton';
import { shareReceipt, downloadReceipt } from '../lib/receipt';
import { isCredit, txLabel, typeLabel } from '../lib/txMeta';

const when = (d) => new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });

// History → any wallet line: view, share or download its receipt again.
export default function TxReceipt() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  useEffect(() => { getWalletTransaction(id).then(setD).catch((e) => setErr(e.message)); }, [id]);

  if (err) return <div className="app-shell"><div className="page-header"><Link to="/orders" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>← History</Link></div><p className="error-text" style={{ margin: 16 }}>{err}</p><BottomNav /></div>;
  if (!d) return <div className="app-shell"><div style={{ margin: 16 }}><SkeletonRows rows={5} /></div><BottomNav /></div>;
  const t = d.transaction;
  const b = d.bank;
  const credit = isCredit(t.type);
  const status = t.status === 'APPROVED' ? 'SUCCESS' : t.status;
  const rows = [
    ['Type', typeLabel(t.type)],
    ['Details', txLabel(t)],
    b && ['Beneficiary', b.accountName],
    b && ['Bank', `${b.bankName || ''} ${b.accountNumber}`.trim()],
    b && b.fee > 0 && ['Transfer fee', naira(b.fee)],
    b?.narration && ['Narration', b.narration],
    ['Date', when(t.createdAt)],
    ['Reference', t.reference],
  ].filter(Boolean);
  const receipt = { title: `${typeLabel(t.type)} receipt`, amount: t.amount, status, rows };

  async function act(kind) {
    setBusy(kind);
    try { if (kind === 'share') await shareReceipt(receipt, `zappipay-${t.id}.png`); else await downloadReceipt(receipt, `zappipay-${t.id}.png`); } finally { setBusy(''); }
  }

  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <div className="page-header">
        <Link to="/orders" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>← History</Link>
        <h1>{typeLabel(t.type)}</h1>
      </div>
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: credit ? 'var(--green-500)' : 'inherit' }}>{credit ? '+' : '−'}{naira(t.amount)}</div>
        <span className={`pill ${status === 'SUCCESS' ? 'ok' : status === 'PENDING' ? 'wait' : 'no'}`} style={{ marginTop: 6 }}>{status === 'SUCCESS' ? 'Successful' : status === 'PENDING' ? 'Pending' : 'Not successful'}</span>
        <div style={{ textAlign: 'left', marginTop: 12 }}><Summary rows={rows} /></div>
      </div>
      <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button type="button" className="btn" disabled={Boolean(busy)} onClick={() => act('share')}>{busy === 'share' ? 'Preparing…' : '📤 Share'}</button>
        <button type="button" className="btn btn-secondary" disabled={Boolean(busy)} onClick={() => act('download')}>{busy === 'download' ? 'Preparing…' : '⬇️ Download'}</button>
      </div>
      {(t.type === 'TRANSFER_OUT') && <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '0 16px' }}>Sent to the wrong person or account? <Link to="/disputes/new" style={{ color: 'var(--gold)' }}>Report it</Link></p>}
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '8px 16px' }}>Something wrong with this transaction? <Link to="/help" style={{ color: 'var(--purple)' }}>Get help</Link></p>
      <BottomNav />
    </div>
  );
}
