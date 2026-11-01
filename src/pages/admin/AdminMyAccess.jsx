import AdminLayout from '../../components/AdminLayout';
import { useAdminAuth } from '../../context/AdminAuthContext';

// Admin → 🔒 Access & roles: what each admin role can and can't do. The
// server enforces it (lib/staffAccess.js — support is deny-by-default);
// this page just explains it.
const ROWS = [
  ['Look up customers (summary, balance, last orders, status)', 'Yes (read-only)', 'Yes'],
  ['Look up orders by reference, see status and history', 'Yes', 'Yes'],
  ['Re-check an order with the provider ("Check now")', 'Yes', 'Yes'],
  ['Refund a failed order', 'Request only — with a reason', 'Approves requests / refunds'],
  ['Credit or debit a wallet', 'Request only — with a reason', 'Approves requests'],
  ['Reply to and resolve support tickets', 'Yes', 'Yes'],
  ['Freeze an account that looks hacked', 'Yes', 'Yes'],
  ['Unfreeze, reset PIN / password, change contact details', 'Request only', 'Yes'],
  ['See supplier prices, margins, pricing and discounts', 'No', 'Yes'],
  ['Settings, API keys, IP whitelist, webhooks', 'No', 'Yes'],
  ['Money check, ledger, profit, partner balances', 'No', 'Yes'],
  ['Staff, security log, audit log', 'No', 'Yes'],
];

export default function AdminMyAccess() {
  const { admin, isOwner } = useAdminAuth();
  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 12 }}>
        <h1>🔒 Access &amp; roles</h1>
        <p>You are signed in as <b>{isOwner ? 'Owner' : 'Support staff'}</b>{admin?.name ? ` (${admin.name})` : ''}. The server checks every request against this — hidden buttons are not the only protection.</p>
      </div>
      <div className="card" style={{ margin: 0, padding: 0, overflowX: 'auto', maxWidth: 760 }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead><tr style={{ textAlign: 'left', color: 'var(--slate-400)' }}><th style={{ padding: 10 }}>What</th><th>Support staff</th><th>Owner</th></tr></thead>
          <tbody>
            {ROWS.map(([what, support, owner]) => (
              <tr key={what} style={{ borderTop: '1px solid var(--slate-800)' }}>
                <td style={{ padding: 10 }}>{what}</td>
                <td style={{ color: /^No/.test(support) ? 'var(--red-500)' : /^Request/.test(support) ? 'var(--gold)' : 'var(--green-500)' }}>{support}</td>
                <td>{owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: 'var(--slate-400)', maxWidth: 760 }}>Requests appear in ✅ Approvals; the owner sees the reason and approves or rejects. Every admin action is saved in the audit log with the admin’s name. Admin sessions end after 12 hours; two-step login can be required for owners.</p>
    </AdminLayout>
  );
}
