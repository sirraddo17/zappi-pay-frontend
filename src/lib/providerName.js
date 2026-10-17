// Order provider IDs → names customers recognise. Bet funding through
// ClubKonnect / Nomba uses "ck:CODE" / "nb:id" internally.
const NAMES = {
  bet9ja: 'Bet9ja', sportybet: 'SportyBet', betking: 'BetKing', nairabet: 'NairaBet', merrybet: 'MerryBet', '1xbet': '1xBet',
  bangbet: 'BangBet', betway: 'Betway', msport: 'MSport', '1960bet': '1960Bet', betland: 'Betland', livescorebet: 'LiveScore Bet',
  supabet: 'SupaBet', naijabet: 'NaijaBet', cloudbet: 'CloudBet', paripesa: 'PariPesa', betbonanza: 'BetBonanza', '360bets': '360bets',
};
export function providerName(provider) {
  const raw = String(provider || '');
  if (!/^(ck|nb):/i.test(raw)) return raw;
  const id = raw.slice(3).toLowerCase();
  return NAMES[id] || id.charAt(0).toUpperCase() + id.slice(1);
}
