// Partner statements (Nomba, Squad, Monnify, VTpass) for the admin AI:
// read a CSV or Excel file IN THE BROWSER and keep only the columns the
// check needs — date, reference, amount, credit/debit, narration — max
// 5,000 rows. Nothing else in the file is sent.

export const MAX_ROWS = 5000;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const PARTNERS = [['nomba', 'Nomba'], ['squad', 'Squad'], ['monnify', 'Monnify'], ['vtpass', 'VTpass']];

const COLS = {
  date: ['transaction date', 'date', 'date/time', 'created at', 'created', 'paid on', 'value date', 'time', 'timestamp'],
  reference: {
    nomba: ['session id', 'sessionid', 'session', 'transaction id', 'transaction ref', 'transaction reference', 'reference', 'ref'],
    squad: ['transaction reference', 'transaction_reference', 'transaction ref', 'reference', 'ref', 'transaction id'],
    monnify: ['transaction reference', 'transactionreference', 'payment reference', 'reference', 'ref'],
    vtpass: ['request id', 'request_id', 'requestid', 'transaction id', 'reference', 'ref'],
  },
  amount: ['amount', 'transaction amount', 'amount paid', 'value', 'total amount', 'total'],
  credit: ['credit', 'credit amount', 'money in', 'inflow', 'cr'],
  debit: ['debit', 'debit amount', 'money out', 'outflow', 'dr'],
  type: ['type', 'transaction type', 'dr/cr', 'cr/dr', 'direction', 'indicator', 'transaction indicator'],
  narration: ['narration', 'description', 'remarks', 'details', 'product', 'service', 'memo'],
};

const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

// Index of the best header cell for a list of names (exact first, then "contains").
function find(header, names) {
  for (const n of names) { const i = header.indexOf(n); if (i >= 0) return i; }
  for (const n of names.filter((x) => x.length > 3)) { const i = header.findIndex((h) => h.includes(n)); if (i >= 0) return i; }
  return -1;
}

export function parseCsv(text) {
  const src = String(text || '').replace(/^﻿/, '');
  const first = src.split(/\r?\n/, 1)[0] || '';
  const delim = [',', ';', '\t'].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i += 1; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => String(x).trim() !== ''));
}

const pad = (n) => String(n).padStart(2, '0');
// Excel dates come as Date objects in the phone's own time (Lagos).
const cellText = (v) => (v instanceof Date ? `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())} ${pad(v.getHours())}:${pad(v.getMinutes())}` : v);

// rows (array of arrays) → { rows: [{date, reference, amount, type, narration}], columns, skipped } or { error }
export function pickColumns(table, partner) {
  const refNames = COLS.reference[partner];
  if (!refNames) return { error: 'Choose the partner the statement is from.' };
  let h = -1;
  let idx = null;
  for (let r = 0; r < Math.min(20, table.length); r += 1) {
    const header = table[r].map(norm);
    const ref = find(header, refNames);
    const amount = find(header, COLS.amount);
    const credit = find(header, COLS.credit);
    const debit = find(header, COLS.debit);
    if (ref >= 0 && (amount >= 0 || credit >= 0 || debit >= 0)) {
      h = r;
      idx = { ref, amount, credit, debit, date: find(header, COLS.date), type: find(header, COLS.type), narration: find(header, COLS.narration) };
      break;
    }
  }
  if (h < 0) return { error: 'Couldn’t find a reference column and an amount column in the first rows of this file. Is it the partner’s transaction statement?' };
  const headerRow = table[h];
  const out = [];
  let skipped = 0;
  for (const r of table.slice(h + 1)) {
    const get = (i) => (i >= 0 ? cellText(r[i]) : '');
    const reference = String(get(idx.ref) ?? '').trim();
    let amount = get(idx.amount);
    let type = get(idx.type);
    if ((amount === '' || amount === undefined) && (idx.credit >= 0 || idx.debit >= 0)) {
      const cr = get(idx.credit);
      const dr = get(idx.debit);
      const has = (v) => v !== '' && v !== undefined && Number(String(v).replace(/[^\d.]/g, '')) > 0;
      if (has(cr)) { amount = cr; type = 'credit'; } else if (has(dr)) { amount = dr; type = 'debit'; }
    }
    if (!reference || amount === '' || amount === undefined) { skipped += 1; continue; }
    if (out.length >= MAX_ROWS) { skipped += 1; continue; }
    out.push({ date: String(get(idx.date) ?? '').slice(0, 40), reference: reference.slice(0, 120), amount: typeof amount === 'number' ? amount : String(amount).slice(0, 40), type: String(type ?? '').slice(0, 20), narration: String(get(idx.narration) ?? '').slice(0, 160) });
  }
  const label = (i) => (i >= 0 ? String(headerRow[i]).trim() : null);
  return { rows: out, skipped, columns: [label(idx.date), label(idx.ref), label(idx.amount) || [label(idx.credit), label(idx.debit)].filter(Boolean).join('/'), label(idx.type), label(idx.narration)].filter(Boolean) };
}

// File → table (CSV here; Excel through SheetJS, loaded only when needed).
export async function readStatement(file, partner) {
  if (!file) return { error: 'Choose a file.' };
  if (file.size > MAX_FILE_BYTES) return { error: 'That file is too big (max 10 MB). Export a shorter date range.' };
  const name = String(file.name || '').toLowerCase();
  let table;
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    table = parseCsv(await file.text());
  } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await import('xlsx');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    table = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  } else {
    return { error: 'Use a CSV or Excel (.xlsx) file.' };
  }
  const r = pickColumns(table, partner);
  if (r.error) return r;
  if (!r.rows.length) return { error: 'No rows with a reference and an amount were found.' };
  return { ...r, fileName: file.name, partner };
}
