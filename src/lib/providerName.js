// Order provider IDs → names customers recognise. Bet funding through
// ClubKonnect / Nomba uses "ck:CODE" / "nb:id" internally.
const NAMES = {
  bet9ja: 'Bet9ja', sportybet: 'SportyBet', betking: 'BetKing', nairabet: 'NairaBet', merrybet: 'MerryBet', '1xbet': '1xBet',
  bangbet: 'BangBet', betway: 'Betway', msport: 'MSport', '1960bet': '1960Bet', betland: 'Betland', livescorebet: 'LiveScore Bet',
  supabet: 'SupaBet', naijabet: 'NaijaBet', cloudbet: 'CloudBet', paripesa: 'PariPesa', betbonanza: 'BetBonanza', '360bets': '360bets',
};
// VTpass service IDs → names ("mtn-data" → "MTN Data").
const WORDS = {
  mtn: 'MTN', glo: 'Glo', airtel: 'Airtel', etisalat: '9mobile', '9mobile': '9mobile', dstv: 'DStv', gotv: 'GOtv', startimes: 'StarTimes', showmax: 'Showmax',
  waec: 'WAEC', jamb: 'JAMB', neco: 'NECO', nabteb: 'NABTEB', sme: 'SME', smile: 'Smile', spectranet: 'Spectranet', ikeja: 'Ikeja', eko: 'Eko', ibadan: 'Ibadan',
  abuja: 'Abuja', kano: 'Kano', kaduna: 'Kaduna', jos: 'Jos', enugu: 'Enugu', benin: 'Benin', aba: 'Aba', yola: 'Yola', phed: 'Port Harcourt', portharcourt: 'Port Harcourt',
  data: 'Data', electric: 'Electric', electricity: 'Electricity', registration: 'Registration', result: 'Result', checker: 'Checker', direct: 'Direct', foreign: 'International', airtime: 'Airtime',
};
const SERVICE_NAMES = { 'foreign-airtime': 'International airtime', 'ui-insure': 'Motor insurance', 'waec-registration': 'WAEC Registration', 'etisalat-data': '9mobile Data', 'smile-direct': 'Smile', 'spectranet': 'Spectranet' };
function vtpassName(id) {
  if (SERVICE_NAMES[id]) return SERVICE_NAMES[id];
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) return id;
  return id.split('-').map((w) => WORDS[w] || w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function providerName(provider) {
  const raw = String(provider || '');
  if (!/^(ck|nb):/i.test(raw)) return vtpassName(raw);
  const id = raw.slice(3).toLowerCase();
  return NAMES[id] || id.charAt(0).toUpperCase() + id.slice(1);
}
