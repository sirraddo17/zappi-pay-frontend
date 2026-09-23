import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrder, submitSupportTicket } from '../api';

const STATUS_COLORS = {
  DELIVERED: 'var(--green-500)',
  SUCCESS: 'var(--green-500)',
  PENDING: 'var(--orange)',
  FAILED: '#ef4444',
};

function fmtMoney(n) {
  return `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  const [reportOpen, setReportOpen] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    getOrder(id)
      .then((data) => setOrder(data.order))
      .catch((err) => setError(err.message || 'Could not load this receipt.'));
  }, [id]);

  function handleDownload() {
    window.print();
  }

  async function handleShare() {
    if (!order) return;
    const text = `ZAPPI PAY Receipt\n${order.service} - ${order.recipient}\nAmount: ${fmtMoney(order.amount)}\nStatus: ${order.status}\nDate: ${fmtDate(order.createdAt)}\nRef: ${order.vtpassRequestId || order.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ZAPPI PAY Receipt', text });
      } catch {
        // person cancelled the share sheet — nothing to do
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setReportSuccess('');
        alert('Receipt copied to clipboard.');
      } catch {
        alert('Could not share or copy this receipt.');
      }
    }
  }

  async function handleReportSubmit(e) {
    e.preventDefault();
    setReportError('');
    setReportSuccess('');
    setSubmittingReport(true);
    try {
      await submitSupportTicket({ message: reportMessage.trim(), orderId: id });
      setReportMessage('');
      setReportOpen(false);
      setReportSuccess('Your report has been submitted. Our team will get back to you.');
    } catch (err) {
      setReportError(err.message || 'Could not submit your report.');
    } finally {
      setSubmittingReport(false);
    }
  }

  if (error) {
    return (
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '24px 16px' }}>
        <p className="error-text">{error}</p>
        <Link to="/orders">Back to Orders</Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '24px 16px' }}>
        <p className="empty-state">Loading…</p>
      </div>
    );
  }

  return (
    <div className="receipt" style={{ maxWidth: 420, margin: '0 auto', padding: '24px 16px 90px' }}>
      <Link to="/orders" className="no-print" style={{ display: 'inline-block', marginBottom: 16, color: 'var(--slate-400)', fontSize: 14 }}>
        &larr; Back to Orders
      </Link>

      {reportSuccess && (
        <p className="no-print" style={{ color: 'var(--green-500)', fontSize: 14, margin: '0 0 12px' }}>{reportSuccess}</p>
      )}

      <div className="card" style={{ margin: '0 0 16px', textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 18 }}>ZAPPI PAY</h1>
        <p style={{ margin: '0 0 20px', color: 'var(--slate-400)', fontSize: 13 }}>Payment Receipt</p>

        <div style={{ fontSize: 28, fontWeight: 700, margin: '0 0 4px' }}>{fmtMoney(order.amount)}</div>
        <div style={{ color: STATUS_COLORS[order.status] || 'var(--slate-400)', fontWeight: 600, marginBottom: 20 }}>
          {order.status}
        </div>

        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--slate-400)' }}>Service</span>
            <span>{order.service}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--slate-400)' }}>Provider</span>
            <span>{order.provider}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--slate-400)' }}>Recipient</span>
            <span>{order.recipient}</span>
          </div>
          {Number(order.discountAmount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--slate-400)' }}>Discount</span>
              <span style={{ color: 'var(--green-500)' }}>−{fmtMoney(order.discountAmount)}</span>
            </div>
          )}
          {order.recipientName && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--slate-400)' }}>Name</span>
              <span>{order.recipientName}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--slate-400)' }}>Date</span>
            <span>{fmtDate(order.createdAt)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--slate-400)' }}>Reference</span>
            <span style={{ fontSize: 12 }}>{order.vtpassRequestId || order.id}</span>
          </div>
        </div>
      </div>

      <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn-secondary btn" type="button" onClick={handleDownload}>
          Download
        </button>
        <button className="btn-secondary btn" type="button" onClick={handleShare}>
          Share
        </button>
      </div>

      {order.service === 'AIRTIME' && order.status === 'SUCCESS' && (
        <Link
          to={`/airtime-cash?order=${order.id}`}
          className="btn-secondary btn no-print"
          style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginBottom: 8, boxSizing: 'border-box' }}
        >
          Bought by mistake? Convert to cash
        </Link>
      )}

      {!reportOpen ? (
        <button className="btn-secondary btn no-print" type="button" onClick={() => setReportOpen(true)}>
          Report Issue
        </button>
      ) : (
        <form className="card no-print" style={{ margin: 0 }} onSubmit={handleReportSubmit}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Report an Issue</h2>
          {reportError && <p className="error-text" style={{ margin: '0 0 12px' }}>{reportError}</p>}
          <div className="field">
            <label htmlFor="reportMessage">What went wrong?</label>
            <textarea
              id="reportMessage"
              rows={4}
              value={reportMessage}
              onChange={(e) => setReportMessage(e.target.value)}
              required
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" type="submit" disabled={submittingReport}>
              {submittingReport ? 'Submitting…' : 'Submit Report'}
            </button>
            <button className="btn-secondary btn" type="button" onClick={() => setReportOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
