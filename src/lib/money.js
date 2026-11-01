// One way to show wallet money everywhere: ₦1,234.50 (always 2 decimals).
export function naira(n) {
  const v = Number(n);
  return `₦${(Number.isFinite(v) ? v : 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Cashback actually earned from purchases (not cashback given back after a failed order).
export function isEarnedCashback(e) {
  if (!(Number(e.amount) > 0)) return false;
  if (e.type) return e.type === 'EARNED';
  return !/^returned/i.test(String(e.note || ''));
}
