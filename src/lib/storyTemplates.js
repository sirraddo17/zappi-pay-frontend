// Ready-made Story videos — one per live service. Only true claims (no
// prices, user numbers or testimonials); the owner checks before posting.
// kind: photo (AI picture / own photo), clip (screen recording), card, logo.

const logo = (title, say) => ({ kind: 'logo', seconds: 3, title, sub: 'www.zappipay.com.ng', say });
const shot = (caption, say, prompt, seconds = 3) => ({ kind: 'photo', seconds, caption, say, prompt });
const rec = (caption, say, screens, seconds = 4) => ({ kind: 'clip', seconds, caption, say, prompt: `Screen recording: ${screens}` });
const card = (title, sub, say, seconds = 3) => ({ kind: 'card', seconds, title, sub, say });

export const STORY_TEMPLATES = [
  {
    key: 'easy', label: '⭐ ZAPPI PAY — all services (30s)', service: null,
    caption: 'Light, airtime, data, TV and exam PINs — all in one app ⚡ Pay in seconds and earn cashback every time 💰 👉 www.zappipay.com.ng #ZAPPIPAY #PayBills #Nigeria',
    scenes: null, // uses the main 30-second template
  },
  {
    key: 'airtime', label: '📱 Airtime', service: 'AIRTIME',
    caption: 'Airtime finish at the wrong time? 😩 Top up MTN, Airtel, Glo or 9mobile in seconds with ZAPPI PAY — and earn cashback 💰 👉 www.zappipay.com.ng #ZAPPIPAY #Airtime #Recharge',
    scenes: [
      shot('Airtime finish for middle of call? 😩', 'Airtime finish for the middle of an important call?', 'Young Nigerian man on a phone call looking surprised as the call drops, on a busy street'),
      rec('Top up in seconds ⚡', 'Open ZAPPI PAY, pick your network, enter the amount, done.', 'Home → Airtime → choose network → enter number and amount → pay with PIN'),
      card('All networks', 'MTN • Airtel • Glo • 9mobile', 'MTN, Airtel, Glo and 9mobile — all in one place.'),
      shot('Buy for family too 💜', 'Buy for yourself or send to your family.', 'Smiling Nigerian mother receiving a phone notification at home'),
      card('Cashback', 'on every purchase 💰', 'And you earn cashback every time.'),
      logo('Recharge the easy way', 'ZAPPI PAY. Recharge the easy way.'),
    ],
  },
  {
    key: 'data', label: '📶 Data', service: 'DATA',
    caption: 'Data finish? No wahala 😄 Buy data for any network in seconds, and let ZAPPI PAY find the best plan for your budget 📶 👉 www.zappipay.com.ng #ZAPPIPAY #BuyData #DataBundle',
    scenes: [
      shot('Data finish again? 😤', 'Data finish again, right in the middle of your video?', 'Nigerian young woman frowning at a buffering video on her phone on a sofa'),
      rec('Buy data in seconds 📶', 'With ZAPPI PAY, choose your plan and your data lands in seconds.', 'Home → Data → choose network → pick a plan → pay'),
      rec('Best data for your budget 🔍', 'Not sure which plan? Tell ZAPPI PAY your budget and it shows you the best one.', 'More → Best data deals → enter budget → see plans'),
      card('Any network', 'MTN • Airtel • Glo • 9mobile', 'Any network, any time.'),
      shot('Back to streaming 🎬', 'Back to your video, no wahala.', 'The same Nigerian young woman smiling and watching a video on her phone'),
      logo('Data finish? No wahala', 'ZAPPI PAY. Data finish? No wahala.'),
    ],
  },
  {
    key: 'electricity', label: '⚡ Electricity token', service: 'ELECTRICITY',
    caption: 'NEPA took light and your meter don finish? 💡 Buy your prepaid token or pay postpaid in seconds — any time, day or night ⚡ 👉 www.zappipay.com.ng #ZAPPIPAY #Electricity #PrepaidMeter',
    scenes: [
      shot('Meter don finish at night 😫', 'Your meter finished at night and the vendor shop is closed?', 'Nigerian family sitting in a dark living room at night with only a phone torch on'),
      rec('Token in seconds ⚡', 'Open ZAPPI PAY, enter your meter number, pay, and your token comes in seconds.', 'Home → Electricity → choose Disco → enter meter number → verify name → pay → token'),
      card('Prepaid & postpaid', 'all major Discos', 'Prepaid or postpaid, for the major Discos.'),
      shot('Light is back 💡', 'Type the token, and the light is back.', 'Nigerian family in a bright living room smiling as the lights come back on'),
      card('Saved meters', 'buy again in one tap', 'Save your meter and buy again in one tap next time.'),
      logo('Light, any time', 'ZAPPI PAY. Light, any time.'),
    ],
  },
  {
    key: 'cable', label: '📺 Cable TV', service: 'CABLE',
    caption: 'Don\'t miss the match because of subscription 📺⚽ Renew DStv, GOtv or Startimes in seconds — and get a reminder before it expires 🔔 👉 www.zappipay.com.ng #ZAPPIPAY #DStv #GOtv #Startimes',
    scenes: [
      shot('Match about to start… ⚽', 'The big match is about to start…', 'Group of Nigerian friends on a sofa excited in front of a TV, evening'),
      shot('…and subscription don expire 😱', '…and your subscription has expired.', 'The same Nigerian friends shocked looking at a blank TV screen'),
      rec('Renew in seconds 📺', 'Open ZAPPI PAY, enter your smartcard number, choose your bouquet, pay.', 'Home → Cable TV → choose DStv/GOtv → enter smartcard → verify → choose bouquet → pay'),
      card('DStv • GOtv • Startimes', 'renew any time', 'DStv, GOtv and Startimes, any time.'),
      card('Reminders', 'before it expires 🔔', 'ZAPPI PAY can even remind you before it expires.'),
      logo('Never miss the match', 'ZAPPI PAY. Never miss the match.'),
    ],
  },
  {
    key: 'exam', label: '🎓 WAEC & JAMB PINs', service: 'EDUCATION',
    caption: 'Results are out! 🎓 Get your WAEC result checker or JAMB PIN instantly on ZAPPI PAY — no need to queue at a café 📲 👉 www.zappipay.com.ng #ZAPPIPAY #WAEC #JAMB',
    scenes: [
      shot('Results are out! 🎓', 'WAEC results are out!', 'Nigerian secondary school leaver in a neat shirt looking excited at a phone, outdoors'),
      shot('No need to queue at café 🙅', 'No need to queue at a business centre for a scratch card.', 'Long queue of people outside a small Nigerian business centre, daytime'),
      rec('PIN in seconds 📲', 'Buy your WAEC result checker or JAMB PIN on ZAPPI PAY, and it shows instantly.', 'Home → Education → choose WAEC or JAMB → pay → PIN appears'),
      card('WAEC & JAMB', 'result checker • UTME • DE', 'WAEC result checker, JAMB UTME and Direct Entry.'),
      shot('Check your result anywhere 🎉', 'Check your result from anywhere.', 'Happy Nigerian student celebrating with family at home holding a phone'),
      logo('Exam PINs made easy', 'ZAPPI PAY. Exam PINs made easy.'),
    ],
  },
  {
    key: 'internet', label: '🌐 Smile & Spectranet', service: 'INTERNET',
    caption: 'Working from home? 💻 Renew your Smile or Spectranet internet in seconds on ZAPPI PAY 🌐 👉 www.zappipay.com.ng #ZAPPIPAY #Smile #Spectranet #WorkFromHome',
    scenes: [
      shot('Internet down before meeting? 😬', 'Your internet expired just before your online meeting?', 'Nigerian professional at a home desk with a laptop looking worried at the screen'),
      rec('Renew in seconds 🌐', 'Renew Smile or Spectranet on ZAPPI PAY in seconds.', 'Home → Internet → choose Smile or Spectranet → enter account → choose plan → pay'),
      card('Smile & Spectranet', 'renew from your phone', 'Smile and Spectranet, right from your phone.'),
      shot('Back online ✅', 'Back online, just in time.', 'The same Nigerian professional smiling on a video call on the laptop'),
      logo('Stay connected', 'ZAPPI PAY. Stay connected.'),
    ],
  },
  {
    key: 'printcards', label: '🖨️ Print recharge cards', service: 'PRINT_CARDS',
    caption: 'Shop owners 👀 Print MTN, Airtel, Glo and 9mobile recharge cards from your phone and sell them in your shop. Agents get a discount 💰 👉 www.zappipay.com.ng #ZAPPIPAY #RechargeCard #SmallBusiness',
    scenes: [
      shot('Customers keep asking for cards? 🤔', 'Customers keep asking for recharge cards in your shop?', 'Friendly Nigerian woman in a small kiosk with customers asking for something'),
      rec('Print in seconds 🖨️', 'With ZAPPI PAY, buy recharge card PINs and print them in seconds.', 'More → Print Cards → choose network and amount → quantity → print'),
      card('All networks', '₦100 • ₦200 • ₦500', 'MTN, Airtel, Glo and 9mobile — one hundred, two hundred or five hundred naira.'),
      shot('Sell and make profit 💰', 'Sell them in your shop and make profit.', 'Nigerian kiosk owner handing a printed recharge card to a smiling customer'),
      card('Agent discount', 'more profit on every card', 'Agents get a discount, so you earn more on every card.'),
      logo('Print cards. Make profit.', 'ZAPPI PAY. Print cards, make profit.'),
    ],
  },
  {
    key: 'bulk', label: '👥 Bulk airtime & data', service: 'BULK',
    caption: 'Paying staff, church workers or your team? 👥 Send airtime or data to up to 50 numbers at once on ZAPPI PAY ⚡ 👉 www.zappipay.com.ng #ZAPPIPAY #BulkAirtime #SmallBusiness',
    scenes: [
      shot('Sending airtime to your team? 👥', 'Do you send airtime or data to your staff or team every month?', 'Nigerian small business owner at a desk with a list on paper and a phone'),
      shot('One by one? 😓', 'One by one? That takes forever.', 'The same business owner tired, typing on a phone, many sticky notes'),
      rec('Up to 50 numbers at once ⚡', 'With ZAPPI PAY, add up to fifty numbers and top them all up at once.', 'More → Bulk airtime & data → add numbers → choose amounts → pay'),
      card('50 numbers', 'one payment', 'Fifty numbers, one payment.'),
      logo('Top up everyone at once', 'ZAPPI PAY. Top up everyone at once.'),
    ],
  },
  {
    key: 'airtimecash', label: '🔄 Airtime to Cash', service: 'AIRTIME_CASH',
    caption: 'Got extra airtime you don\'t need? 🔄 Turn it into wallet money on ZAPPI PAY and use it to pay your bills 💸 👉 www.zappipay.com.ng #ZAPPIPAY #AirtimeToCash',
    scenes: [
      shot('Too much airtime? 🤔', 'Got extra airtime you don’t need?', 'Nigerian young man looking at his phone with a puzzled smile, at a bus stop'),
      rec('Turn it into money 🔄', 'With ZAPPI PAY Airtime to Cash, send it and get wallet money.', 'More → Airtime to Cash → choose network → enter amount → follow the steps'),
      card('Airtime → Cash', 'straight to your wallet', 'It goes straight into your wallet.'),
      shot('Use it for bills 💡', 'Then use it for light, data or TV.', 'The same young man smiling, paying on his phone at home'),
      logo('Your airtime, your money', 'ZAPPI PAY. Your airtime, your money.'),
    ],
  },
  {
    key: 'refer', label: '🎁 Refer & Earn', service: 'REFER',
    caption: 'Share ZAPPI PAY with your friends and earn when they join and buy 🎁 Get your link in the app 👉 www.zappipay.com.ng #ZAPPIPAY #ReferAndEarn',
    scenes: [
      shot('Your friends pay bills too 👀', 'Your friends buy airtime, data and light every week.', 'Group of young Nigerian friends laughing together, each holding a phone, outdoor café'),
      rec('Share your link 🔗', 'Share your ZAPPI PAY link from the app.', 'More → Refer & Earn → copy or share link'),
      card('Refer & Earn', 'earn when friends join & buy 🎁', 'When they join and buy, you earn.'),
      logo('Share and earn', 'ZAPPI PAY. Share and earn.'),
    ],
  },
  {
    key: 'safety', label: '🔒 Safe & secure', service: null,
    caption: 'Your money, your PIN 🔒 Every ZAPPI PAY payment needs your PIN or fingerprint — and you can freeze your account yourself if your phone is lost 📵 👉 www.zappipay.com.ng #ZAPPIPAY #SafePayments',
    scenes: [
      shot('Worried about your money? 😟', 'Worried about paying bills with your phone?', 'Nigerian woman looking thoughtfully at her phone in a quiet office'),
      rec('PIN or fingerprint 🔒', 'Every payment on ZAPPI PAY needs your PIN or your fingerprint.', 'Any purchase → PIN / fingerprint screen → success'),
      card('Phone lost?', 'freeze your account yourself 📵', 'Lost your phone? Freeze your account yourself in seconds.'),
      rec('Fund from any bank 🏦', 'And fund your wallet from any bank, to your own account number.', 'Wallet → your account number'),
      logo('Safe. Simple. Fast.', 'ZAPPI PAY. Safe, simple, fast.'),
    ],
  },
];
