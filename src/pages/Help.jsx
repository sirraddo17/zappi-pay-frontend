import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { getExtraFaqs } from '../api';

// Help Centre — public, so people (and search engines) can find answers
// without an account. Also published as FAQ structured data.
export const FAQ = [
  {
    topic: 'Getting started',
    items: [
      ['What is ZAPPI PAY?', 'ZAPPI PAY is a wallet app for everyday payments in Nigeria. Fund your wallet once, then buy airtime and data, pay electricity (prepaid and postpaid), renew DStv, GOtv and Startimes, buy WAEC, NECO and JAMB PINs, fund betting wallets, send money to friends on ZAPPI PAY and send to any Nigerian bank. It is run by Sirraddo Venture, a registered Nigerian business (BN 7524870).'],
      ['How do I create an account?', 'Tap “Create free account”, enter your name, phone number, date of birth, a security question and a strong password. You can then choose a username so friends can send you money with it.'],
      ['Is ZAPPI PAY safe?', 'Your password, PIN and security answer are stored scrambled, so not even our staff can see them. Payments need your transaction PIN or fingerprint, the account locks after 5 wrong passwords, you’re logged out after 10 minutes of no activity, and you can see and log out every device that’s logged in from Security. Purchases are delivered through VTpass and bank payments go through Monnify, both licensed Nigerian payment companies.'],
      ['Can I use ZAPPI PAY in Pidgin, Yoruba, Hausa or Igbo?', 'Yes. Go to Profile → Language and pick one. The main screens switch straight away; a few detailed pages are still in English.'],
      ['The app is slow on my network. What can I do?', 'Turn on Lite mode in Profile. It hides ads and promos, turns off animations and checks for updates less often, so it uses less data and loads faster.'],
      ['Can I buy or send money by typing in the Help chat?', 'Yes, when the AI assistant is on. Type something like “₦500 MTN airtime for 0803…” or “send ₦2,000 to 0123456789 GTBank, John Okafor”. It checks the real name on the account, tells you if it doesn’t match, and shows a card for you to check. Nothing is bought or sent until you tap the button and enter your PIN.'],
      ['Do you have a mobile app?', 'Yes. Open zappipay.com.ng on your phone and tap “Install” (or “Add to Home screen”) to install it like an app. It works on Android and iPhone.'],
    ],
  },
  {
    topic: 'Funding your wallet',
    items: [
      ['How do I fund my wallet?', 'Go to Wallet. You get your own bank account numbers — send money to any of them from your bank app and your wallet is credited automatically, usually within a minute. You can also send to our business account and submit the transfer for approval.'],
      ['Is there a fee for funding?', 'Our payment partner charges a small fee for receiving bank transfers. The Wallet page shows the exact fee and how much to send to get the amount you want before you send anything.'],
      ['I sent money but my wallet wasn’t credited', 'Most transfers arrive within a minute; some banks take up to 30 minutes. Tap “I’ve sent money — check now” on the Wallet page. If it still hasn’t arrived, message support in the app (Profile → Support) with a screenshot of your bank alert and we’ll trace it. Money sent to your ZAPPI PAY account number is never lost.'],
      ['Why do I need BVN or NIN for an account number?', 'Nigerian banking rules require identity verification for personal account numbers. Your BVN or NIN is sent securely to our licensed payment partner to create the account; we don’t store the number itself.'],
    ],
  },
  {
    topic: 'Purchases',
    items: [
      ['My purchase failed. Do I get my money back?', 'Yes. If a purchase fails, the full amount goes back to your wallet automatically and you get a notification. Sometimes a purchase shows “pending” for a few minutes while the provider confirms — it then either succeeds or is refunded.'],
      ['Where do I find my electricity token?', 'Open Orders, tap the electricity purchase and your token is on the receipt. You can copy it, or share the receipt on WhatsApp.'],
      ['I bought for the wrong number or meter', 'Once airtime, data or a token is delivered it can’t be reversed, so always check the number before you pay. If you bought airtime by mistake, you may be able to use Airtime to Cash to turn it back into wallet money for a small fee.'],
      ['Something is wrong with a purchase', 'Open the purchase in Orders and tap “Report Issue”. The purchase details are attached automatically, so we know exactly which one you mean.'],
      ['Can I schedule top-ups?', 'Yes. When buying, tick “Repeat this purchase automatically” to renew daily, weekly or monthly. We remind you the day before if your wallet can’t cover it.'],
      ['What is the delivery promise?', 'When you see “⚡ Delivered in 60s or ₦20 back” on the Buy page, it means that if that purchase takes longer than the time shown to arrive, we add the bonus to your wallet automatically. It applies to purchases from the minimum amount shown, once per customer per day. If a slow purchase fails, you get your refund plus the bonus.'],
      ['Can I send airtime or data as a gift?', 'Yes. When buying airtime or data for someone else, tick “Send as a gift with a message”, pick a style and write a note. You get a gift card link to send on WhatsApp. You can also turn a past purchase into a gift from its receipt in Orders.'],
      ['Will you remind me before my DStv or data runs out?', 'Yes. After you renew DStv, GOtv or Startimes we remind you 3 days before it expires, and after a data plan we remind you a day before it ends. Turn this off in Notifications.'],
      ['Can I buy for many numbers at once?', 'Yes. Use Bulk airtime & data on the Home page to send to up to 50 numbers in one go.'],
    ],
  },
  {
    topic: 'Sending money',
    items: [
      ['How do I send money to a friend?', 'Tap Send Money and enter their ZAPPI PAY username or phone number. It arrives instantly and is free between ZAPPI PAY users.'],
      ['How do I send to a bank account?', 'Tap Send Money → Bank Account. Choose the bank, enter the account number, check the account name we show you, then confirm with your PIN. The fee is shown before you confirm.'],
      ['My bank transfer hasn’t arrived', 'Most bank transfers arrive within minutes. Large first transfers may be held for a short security check. If it fails, the money comes back to your wallet automatically. Contact support with the transfer receipt if you need help.'],
    ],
  },
  {
    topic: 'Rewards',
    items: [
      ['How do referral bonuses work?', 'Share your referral code from Refer & Earn. When a friend signs up with it and makes their first qualifying purchase, you get the bonus shown in the app.'],
      ['What are challenges?', 'Challenges reward you for buying — for example “buy data 5 times this month, get ₦50”. Your progress shows on the Home page and the reward is added to your wallet automatically once you finish.'],
      ['How do I use a promo code or coupon?', 'Discount codes are entered when you buy. Wallet coupons are redeemed on the Wallet page under “Have a coupon code?”. Each code has its own rules, such as a minimum amount or expiry date.'],
    ],
  },
  {
    topic: 'Account & security',
    items: [
      ['How does Family work?', 'Go to Profile → Family and add a family member by their ZAPPI PAY username or phone number. Once they accept, you can send them a weekly or monthly allowance from your wallet and set a daily spending limit, which services they can buy, and whether they can send money out. They can always send money back to you, and either of you can end the link at any time.'],
      ['I forgot my password', 'Tap “Forgot password” on the login page to get a reset link by email. If you can’t use email, message support — we’ll confirm it’s you with your date of birth and security question before helping.'],
      ['I forgot my PIN', 'Message support in the app (Profile → Support). After we confirm it’s you, we reset your PIN and you create a new one.'],
      ['I lost my phone', 'Log in on another device, go to Security → Where you’re logged in and tap “Log out all other devices”, then change your password. Or contact support and we can remove quick login from your lost phone.'],
      ['How do I change my phone number or email?', 'Message support in the app. For your safety we confirm it’s really you before changing contact details.'],
      ['How do I delete my account?', 'Go to Profile → “Delete my account”. Spend or withdraw any wallet balance first. We keep transaction records for as long as the law requires, but remove your personal details.'],
    ],
  },
  {
    topic: 'Agents & business',
    items: [
      ['How do I become an agent?', 'Go to Profile → Become an agent and tell us your business name and shop address. Approved agents get cheaper prices to resell airtime, data and bills.'],
    ],
  },
];

export default function Help() {
  const { customer } = useAuth();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const [extra, setExtra] = useState([]);
  useEffect(() => { getExtraFaqs().then((d) => setExtra(d.faqs || [])).catch(() => {}); }, []);
  // Built-in answers plus any added from the admin (Help Centre from tickets).
  const ALL = useMemo(() => {
    if (!extra.length) return FAQ;
    const list = FAQ.map((t) => ({ ...t, items: [...t.items] }));
    for (const f of extra) {
      const t = list.find((x) => x.topic.toLowerCase() === String(f.topic).toLowerCase());
      if (t) t.items.push([f.question, f.answer]);
      else list.push({ topic: f.topic, items: [[f.question, f.answer]] });
    }
    return list;
  }, [extra]);

  useEffect(() => {
    document.title = 'Help Centre · ZAPPI PAY';
    const meta = document.querySelector('meta[name="description"]') || Object.assign(document.createElement('meta'), { name: 'description' });
    meta.content = 'Answers about ZAPPI PAY: funding your wallet, airtime and data, electricity tokens, refunds, sending money, rewards and account security.';
    if (!meta.parentNode) document.head.appendChild(meta);
    // FAQ rich results for search engines.
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.id = 'faq-ld';
    ld.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: ALL.flatMap((t) => t.items).map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })),
    });
    document.getElementById('faq-ld')?.remove();
    document.head.appendChild(ld);
    return () => { ld.remove(); document.title = 'ZAPPI PAY'; };
  }, [ALL]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return ALL;
    return ALL.map((t) => ({ ...t, items: t.items.filter(([qq, a]) => `${qq} ${a}`.toLowerCase().includes(s)) })).filter((t) => t.items.length);
  }, [q, ALL]);

  return (
    <div className="app-shell" style={{ paddingBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 16px 0' }}>
        <Link to={customer ? '/' : '/welcome'} style={{ textDecoration: 'none' }} aria-label="ZAPPI PAY home"><Logo iconSize={32} wordmarkSize={18} /></Link>
        <Link to="/status" style={{ fontSize: 13, color: 'var(--purple)', textDecoration: 'none' }}>Service status ›</Link>
      </div>
      <div className="page-header">
        <h1>Help Centre</h1>
        <p>Quick answers about ZAPPI PAY</p>
      </div>
      <div style={{ padding: '0 16px 12px' }}>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, e.g. refund, token, PIN" aria-label="Search help" />
      </div>
      {results.length === 0 && <p className="empty-state">No answers match “{q}”. Message support below.</p>}
      {results.map((t) => (
        <section key={t.topic} style={{ marginBottom: 8 }}>
          <h2 className="section-label" style={{ fontSize: 12, fontWeight: 600 }}>{t.topic}</h2>
          <div className="card" style={{ padding: 0 }}>
            {t.items.map(([question, answer], i) => {
              const id = `${t.topic}-${i}`;
              const isOpen = open === id || Boolean(q.trim());
              return (
                <div key={id} style={{ borderTop: i ? '1px solid var(--slate-700)' : 'none' }}>
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpen(open === id ? null : id)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: 'var(--slate-100)', padding: '12px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span>{question}</span>
                    <span aria-hidden="true" style={{ color: 'var(--slate-400)' }}>{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && <p style={{ margin: 0, padding: '0 16px 14px', fontSize: 14, lineHeight: 1.6, color: 'var(--slate-300)' }}>{answer}</p>}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Still need help?</div>
        <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '0 0 12px' }}>{customer ? 'Message us in the app — we usually reply within a few hours.' : 'Log in and message us from Profile → Support, or reach us on WhatsApp or email.'}</p>
        {customer ? <Link to="/profile" className="btn" style={{ display: 'block', textDecoration: 'none' }}>Message support</Link> : <Link to="/legal/contact" className="btn" style={{ display: 'block', textDecoration: 'none' }}>Contact us</Link>}
      </div>
    </div>
  );
}
