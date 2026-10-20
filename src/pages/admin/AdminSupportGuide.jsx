import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { getSupportGuide } from '../../api';

// Admin → 📘 Support guide: how ZAPPI PAY support handles each customer
// problem (the same guide the AI support helper follows). Read-only here;
// it is kept up to date with the app.

// **bold** inside a line.
function inline(text, key) {
  return String(text).split(/(\*\*[^*]+\*\*)/g).map((part, i) => (/^\*\*[^*]+\*\*$/.test(part) ? <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong> : <Fragment key={`${key}-${i}`}>{part.replace(/\\([[\]])/g, '$1')}</Fragment>));
}

// The small piece of Markdown the guide uses: ## headings, paragraphs,
// - and 1. lists, and | tables |.
function Markdown({ text }) {
  const out = [];
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i += 1; continue; }
    if (l.startsWith('## ')) { out.push(<h2 key={i} id={l.slice(3).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')} style={{ marginTop: 28 }}>{l.slice(3)}</h2>); i += 1; continue; }
    if (l.startsWith('# ')) { i += 1; continue; }
    if (l.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) { rows.push(lines[i]); i += 1; }
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      out.push(
        <div key={`t${i}`} className="admin-table-wrap" style={{ overflowX: 'auto', margin: '8px 0 12px' }}>
          <table>
            <thead><tr>{head.map((h, j) => <th key={j}>{inline(h, `h${i}${j}`)}</th>)}</tr></thead>
            <tbody>{body.map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j} style={{ textAlign: 'left', verticalAlign: 'top' }}>{inline(c, `c${i}${k}${j}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^(- |\d+\. )/.test(l)) {
      const ordered = /^\d+\. /.test(l);
      const items = [];
      while (i < lines.length && (ordered ? /^\d+\. /.test(lines[i]) : lines[i].startsWith('- '))) { items.push(lines[i].replace(/^(- |\d+\. )/, '')); i += 1; }
      const Tag = ordered ? 'ol' : 'ul';
      out.push(<Tag key={`l${i}`} style={{ paddingLeft: 22, margin: '6px 0 12px' }}>{items.map((x, k) => <li key={k} style={{ margin: '4px 0' }}>{inline(x, `li${i}${k}`)}</li>)}</Tag>);
      continue;
    }
    out.push(<p key={i} style={{ margin: '8px 0' }}>{inline(l, `p${i}`)}</p>);
    i += 1;
  }
  return out;
}

export default function AdminSupportGuide() {
  const [g, setG] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { getSupportGuide().then(setG).catch((e) => setErr(e.message)); }, []);

  // Search: show only the sections that mention every word typed.
  const shown = useMemo(() => {
    if (!g) return '';
    const parts = g.markdown.split(/\n(?=## )/).slice(1);
    const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    const keep = words.length ? parts.filter((p) => words.every((w) => p.toLowerCase().includes(w))) : parts;
    return keep.join('\n\n');
  }, [g, q]);

  return (
    <AdminLayout>
      <h1>📘 {g?.title || 'Support guide'}</h1>
      <p style={{ color: 'var(--slate-400)', marginTop: 4 }}>How to handle each customer problem: who can do what, the steps, the screens and ready replies. Not sure? Ask the <Link to="/admin/assistant">✨ assistant</Link> — it follows this guide and looks up the customer's records for you.</p>
      {err && <p className="error-text">{err}</p>}
      {!g && !err && <p className="empty-state">Loading…</p>}
      {g && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
            {g.sections.map((s) => <a key={s.id} href={`#${s.id}`} className="btn btn-secondary" style={{ width: 'auto', padding: '4px 12px', fontSize: 13, textDecoration: 'none' }} onClick={() => setQ('')}>{s.title}</a>)}
          </div>
          <div className="field" style={{ maxWidth: 420 }}>
            <label htmlFor="sg-q">Search the guide</label>
            <input id="sg-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. token, old account, chargeback, PIN" />
          </div>
          <div className="card" style={{ margin: 0 }}>
            {shown ? <Markdown text={shown} /> : <p className="empty-state">Nothing in the guide mentions that. Try other words, or ask the assistant.</p>}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
