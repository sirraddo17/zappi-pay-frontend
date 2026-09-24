// Turns a past order (or a saved beneficiary) into a /buy/... link with
// the form pre-filled, for "Buy again" buttons.
export const SERVICE_SLUG = {
  AIRTIME: 'airtime',
  DATA: 'data',
  ELECTRICITY: 'electricity',
  CABLE: 'cable',
  EDUCATION: 'education',
  INTERNET: 'internet',
  BETTING: 'betting',
};

export const SERVICE_LABEL = {
  AIRTIME: 'Airtime',
  DATA: 'Data',
  ELECTRICITY: 'Electricity',
  CABLE: 'Cable TV',
  EDUCATION: 'Education',
  INTERNET: 'Internet',
  BETTING: 'Bet Funding',
};

export function buyAgainLink(order) {
  const slug = SERVICE_SLUG[order.service];
  if (!slug) return null;
  const q = new URLSearchParams();
  if (order.provider) q.set('provider', order.provider);
  if (order.recipient) q.set('recipient', order.recipient);
  if (order.variationCode) q.set('variation', order.variationCode);
  else if (order.costAmount) q.set('amount', String(Math.round(Number(order.costAmount))));
  if (order.meterType) q.set('meterType', order.meterType);
  return `/buy/${slug}?${q.toString()}`;
}

export function beneficiaryLink(b) {
  const slug = SERVICE_SLUG[b.service];
  if (!slug) return null;
  const q = new URLSearchParams({ provider: b.serviceID, recipient: b.billersCode });
  if (b.meterType) q.set('meterType', b.meterType);
  return `/buy/${slug}?${q.toString()}`;
}

export const FREQUENCY_LABEL = { DAILY: 'Every day', WEEKLY: 'Every week', MONTHLY: 'Every month' };
