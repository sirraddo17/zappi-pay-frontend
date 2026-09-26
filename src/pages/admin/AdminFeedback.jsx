import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import ShowMore, { FIRST_COUNT } from '../../components/ShowMore';
import { getAdminFeedback } from '../../api';

export default function AdminFeedback() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [shown, setShown] = useState(FIRST_COUNT * 2);

  useEffect(() => {
    getAdminFeedback().then(setData).catch((err) => setError(err.message));
  }, []);

  const list = (data?.feedback || []).filter((f) => filter === 'all' || (filter === 'low' ? f.rating <= 3 : f.rating >= 4));

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Feedback</h1>
        <p>What customers say after a purchase</p>
      </div>
      {error && <p className="error-text">{error}</p>}
      {data && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div className="card stat" style={{ margin: 0, flex: '1 1 160px' }}><div className="label">Average (30 days)</div><div className="value">{data.average ? `${data.average} ★` : '—'}</div></div>
          <div className="card stat" style={{ margin: 0, flex: '1 1 160px' }}><div className="label">Ratings (30 days)</div><div className="value">{data.count}</div></div>
          <div className="card stat" style={{ margin: 0, flex: '1 1 160px' }}><div className="label">Shared their link</div><div className="value">{data.shared}</div></div>
          <div className="card" style={{ margin: 0, flex: '2 1 260px', fontSize: 13 }}>
            {[5, 4, 3, 2, 1].map((r) => {
              const n = data.byRating?.[r] || 0;
              const pct = data.count ? Math.round((n / data.count) * 100) : 0;
              return (
                <div key={r} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ width: 24 }}>{r}★</span>
                  <div style={{ flex: 1, height: 8, background: 'var(--slate-700)', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: r >= 4 ? 'var(--green-500)' : r === 3 ? '#f59e0b' : 'var(--red-500)' }} /></div>
                  <span style={{ width: 30, textAlign: 'right' }}>{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="admin-actions" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[['all', 'All'], ['low', '1–3 ★'], ['high', '4–5 ★']].map(([k, l]) => (
          <button key={k} type="button" className={filter === k ? 'btn' : 'btn btn-secondary'} style={{ width: 'auto', padding: '6px 14px' }} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>
      {data === null ? <p className="empty-state">Loading…</p> : list.length === 0 ? <p className="empty-state">No feedback here yet.</p> : (
        <>
          {list.slice(0, shown).map((f) => (
            <div key={f.id} className="card" style={{ margin: '0 0 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ color: '#f59e0b', letterSpacing: 2 }}>{'★'.repeat(f.rating)}<span style={{ color: 'var(--slate-600, #475569)' }}>{'★'.repeat(5 - f.rating)}</span></span>
                <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>{new Date(f.createdAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {f.comment && <p style={{ margin: '6px 0', fontSize: 14 }}>{f.comment}</p>}
              <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>
                {f.customer ? <Link to={`/admin/customers/${f.customerId}`} style={{ color: 'var(--purple)' }}>{f.customer.name}</Link> : 'Customer'} {f.customer?.phone}
                {f.shared && ' · shared their link 🎉'}
              </div>
            </div>
          ))}
          <ShowMore total={list.length} shown={shown} setShown={setShown} />
        </>
      )}
    </AdminLayout>
  );
}
