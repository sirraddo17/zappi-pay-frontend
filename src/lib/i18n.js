import { useSyncExternalStore } from 'react';

// App languages. English is the source; the others translate the main
// screens (Home, Buy, Wallet, Profile, the bottom bar). Anything not in
// a dictionary shows in English. Translations should be checked by a
// native speaker before promoting them.
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'pcm', label: 'Pidgin' },
  { code: 'yo', label: 'Yorùbá' },
  { code: 'ha', label: 'Hausa' },
  { code: 'ig', label: 'Igbo' },
];

// [English, Pidgin, Yoruba, Hausa, Igbo]
const ROWS = [
  ['Home', 'Home', 'Ilé', 'Gida', 'Ụlọ'],
  ['Wallet', 'Wallet', 'Àpamọ́wọ́', 'Walat', 'Akpa ego'],
  ['Orders', 'Wetin I Buy', 'Àwọn Rírà', 'Sayayya', 'Ihe m zụrụ'],
  ['Profile', 'My Profile', 'Profaili', 'Bayanai', 'Profaịlụ'],
  ['Hi, {name} 👋', 'How far, {name} 👋', 'Ẹ n lẹ́, {name} 👋', 'Sannu, {name} 👋', 'Ndeewo, {name} 👋'],
  ['What would you like today?', 'Wetin you wan do today?', 'Kí ni ẹ fẹ́ ṣe lónìí?', 'Me kake so ka yi yau?', 'Gịnị ka ị chọrọ ime taa?'],
  ['Wallet Balance', 'Money wey dey your wallet', 'Owó inú àpamọ́wọ́', 'Kuɗin walat', 'Ego dị n’akpa ego'],
  ['Fund Wallet', 'Put money for wallet', 'Fi owó sí àpamọ́wọ́', 'Saka kuɗi a walat', 'Tinye ego n’akpa ego'],
  ['Services', 'Wetin you fit buy', 'Àwọn iṣẹ́', 'Ayyuka', 'Ọrụ'],
  ['Recent Transactions', 'Wetin happen recently', 'Àwọn ìṣòwò àìpẹ́', 'Mu’amaloli na baya-bayan nan', 'Azụmahịa ndị na-adịbeghị anya'],
  ['Buy again', 'Buy am again', 'Rà á lẹ́ẹ̀kan sí i', 'Sake saya', 'Zụta ọzọ'],
  ['Airtime', 'Airtime', 'Airtime', 'Airtime', 'Airtime'],
  ['Data', 'Data', 'Dátà', 'Data', 'Data'],
  ['Electricity', 'Light (NEPA)', 'Iná mànàmáná', 'Wutar lantarki', 'Ọkụ eletrik'],
  ['Cable TV', 'Cable TV', 'Tẹlifíṣọ̀n', 'Talabijin', 'Televishọn'],
  ['Education', 'Exam PIN', 'Ẹ̀kọ́', 'Ilimi', 'Agụmakwụkwọ'],
  ['Send Money', 'Send Money', 'Fi owó ránṣẹ́', 'Tura kuɗi', 'Ziga ego'],
  ['Internet', 'Internet', 'Íntánẹ́ẹ̀tì', 'Intanet', 'Ịntanetị'],
  ['Bet Funding', 'Fund Bet', 'Owó tẹ́tẹ́', 'Kuɗin bet', 'Ego bet'],
  ['Airtime to Cash', 'Change Airtime to Cash', 'Airtime sí owó', 'Airtime zuwa kuɗi', 'Airtime gaa ego'],
  ['Bulk airtime & data', 'Airtime & data for plenty numbers', 'Airtime àti dátà fún ọ̀pọ̀ nọ́mbà', 'Airtime da data ga lambobi da yawa', 'Airtime na data maka ọtụtụ nọmba'],
  ['Send to up to 50 numbers at once', 'Send reach 50 numbers at once', 'Fi ránṣẹ́ sí nọ́mbà 50 lẹ́ẹ̀kan', 'Tura zuwa lambobi har 50 a lokaci ɗaya', 'Ziga ruo nọmba 50 otu mgbe'],
  ['🔎 Best data for your budget', '🔎 Best data for your money', '🔎 Dátà tó dára jù fún owó rẹ', '🔎 Data mafi kyau don kuɗinka', '🔎 Data kacha mma maka ego gị'],
  ['Tell us how much — we find the most data on every network', 'Tell us how much you get — we go find the data wey pass for all network', 'Sọ iye tí o ní — a ó wá dátà tó pọ̀ jù lórí gbogbo nẹ́tíwọ̀ọ̀kì', 'Faɗa mana nawa kake da shi — za mu nemo data mafi yawa a kowane layi', 'Gwa anyị ego ole ị nwere — anyị ga-achọta data kacha ukwuu na netwọk niile'],
  ['⏰ Coming up for renewal', '⏰ E don near to renew', '⏰ Ó ti kù díẹ̀ láti sọ di tuntun', '⏰ Lokacin sabuntawa ya kusa', '⏰ Oge imeghari eruola nso'],
  ['Renew', 'Renew am', 'Sọ di tuntun', 'Sabunta', 'Megharịa'],
  ['Back', 'Go back', 'Padà', 'Koma', 'Laghachi'],
  ['Buy {service}', 'Buy {service}', 'Ra {service}', 'Saya {service}', 'Zụta {service}'],
  ['Pay from your wallet balance', 'Pay from the money for your wallet', 'Sanwó láti inú àpamọ́wọ́ rẹ', 'Biya daga kuɗin walat ɗinka', 'Kwụọ ụgwọ site n’akpa ego gị'],
  ['{service} provider', '{service} company', 'Olùpèsè {service}', 'Mai samar da {service}', 'Onye na-enye {service}'],
  ['Select…', 'Choose…', 'Yan…', 'Zaɓa…', 'Họrọ…'],
  ['Phone number', 'Phone number', 'Nọ́mbà fóònù', 'Lambar waya', 'Nọmba ekwentị'],
  ['Meter number', 'Meter number', 'Nọ́mbà mítà', 'Lambar mita', 'Nọmba mita'],
  ['Smartcard / IUC number', 'Smartcard / IUC number', 'Nọ́mbà Smartcard / IUC', 'Lambar Smartcard / IUC', 'Nọmba Smartcard / IUC'],
  ['Meter type', 'Meter type', 'Irú mítà', 'Irin mita', 'Ụdị mita'],
  ['Data plan', 'Data plan', 'Ètò dátà', 'Tsarin data', 'Atụmatụ data'],
  ['Package', 'Package', 'Àpò', 'Kunshi', 'Ngwugwu'],
  ['Amount (₦)', 'How much (₦)', 'Iye owó (₦)', 'Adadin kuɗi (₦)', 'Ego ole (₦)'],
  ['Total', 'Total', 'Àpapọ̀', 'Jimla', 'Ngụkọta'],
  ['Pay {amount}', 'Pay {amount}', 'San {amount}', 'Biya {amount}', 'Kwụọ {amount}'],
  ['Processing…', 'E dey go…', 'Ó ń lọ…', 'Ana aiki…', 'Ọ na-aga…'],
  ['Repeat this purchase automatically', 'Make e dey repeat by itself', 'Tún rírà yìí ṣe fúnra rẹ̀', 'Maimaita wannan sayayya kai tsaye', 'Mee ka ịzụta a na-emeghachi onwe ya'],
  ['🎁 Send as a gift with a message', '🎁 Send am as gift with message', '🎁 Fi ránṣẹ́ bí ẹ̀bùn pẹ̀lú ọ̀rọ̀', '🎁 Aika a matsayin kyauta tare da saƙo', '🎁 Ziga ya dị ka onyinye na ozi'],
  ['Fund your wallet and track your transactions', 'Put money for wallet and see wetin you don do', 'Fi owó sí àpamọ́wọ́ kí o sì tọpinpin ìṣòwò rẹ', 'Saka kuɗi a walat kuma ka bibiyi mu’amalolinka', 'Tinye ego n’akpa ego ma soro azụmahịa gị'],
  ['Transaction History', 'All wetin you don do', 'Ìtàn ìṣòwò', 'Tarihin mu’amala', 'Akụkọ azụmahịa'],
  ['Language', 'Language', 'Èdè', 'Harshe', 'Asụsụ'],
  ['Security', 'Security', 'Ààbò', 'Tsaro', 'Nchekwa'],
  ['Account Statement', 'Account Statement', 'Àkọsílẹ̀ àkántì', 'Bayanin asusu', 'Nkwupụta akaụntụ'],
  ['Refer & Earn', 'Bring person, collect bonus', 'Pe ọ̀rẹ́, gba ẹ̀bùn', 'Gayyato abokai, sami lada', 'Kpọọ ndị enyi, nweta ego'],
  ['Support', 'Help', 'Ìrànlọ́wọ́', 'Taimako', 'Enyemaka'],
  ['Change Password', 'Change Password', 'Yí ọ̀rọ̀ aṣínà padà', 'Canza kalmar sirri', 'Gbanwee okwuntughe'],
  ['Choose the language for the main screens. Some pages stay in English for now.', 'Choose the language for the main screens. Some pages still dey for English.', 'Yan èdè fún àwọn ojú-ìwé pàtàkì. Àwọn ojú-ìwé kan ṣì wà ní Gẹ̀ẹ́sì.', 'Zaɓi harshe don manyan shafuka. Wasu shafuka suna cikin Turanci har yanzu.', 'Họrọ asụsụ maka isi ihuenyo. Ụfọdụ ibe ka dị n’asụsụ Bekee.'],
];

const DICT = {};
LANGUAGES.forEach(({ code }, i) => {
  if (i === 0) return;
  DICT[code] = Object.fromEntries(ROWS.map((r) => [r[0], r[i]]));
});

const KEY = 'zappipay_lang';
const listeners = new Set();
let current = (() => {
  try {
    const v = localStorage.getItem(KEY);
    return LANGUAGES.some((l) => l.code === v) ? v : 'en';
  } catch {
    return 'en';
  }
})();
if (typeof document !== 'undefined') document.documentElement.lang = current === 'pcm' ? 'pcm' : current;

export function getLang() {
  return current;
}

export function setLang(code) {
  if (!LANGUAGES.some((l) => l.code === code)) return;
  current = code;
  try {
    localStorage.setItem(KEY, code);
  } catch { /* private mode */ }
  document.documentElement.lang = code;
  listeners.forEach((fn) => fn());
}

export function t(text, vars) {
  let out = (current !== 'en' && DICT[current]?.[text]) || text;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replace(`{${k}}`, t(String(v)));
  return out;
}

// Re-renders the component when the language changes.
export function useLang() {
  useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn); }, () => current, () => 'en');
  return t;
}
