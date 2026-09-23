import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LogoIcon, Wordmark } from '../components/Logo';
import { PhoneIcon, WifiIcon, BoltIcon, TvIcon, CapIcon, BuildingIcon, GlobeIcon, TrophyIcon, FundIcon } from '../components/Icons';
import { getReferralInfo } from '../api';
import { SUPPORT_EMAIL, WHATSAPP_NUMBER } from '../assistant/knowledge';
import './landing.css';

const SERVICES = [
  { label: 'Airtime', desc: 'MTN, Airtel, Glo & 9mobile top-up', Icon: PhoneIcon, bg: '#863bff' },
  { label: 'Data', desc: 'Daily, weekly & monthly bundles', Icon: WifiIcon, bg: '#7a5a10' },
  { label: 'Electricity', desc: 'Prepaid tokens & postpaid bills', Icon: BoltIcon, bg: '#1f6b4a' },
  { label: 'Cable TV', desc: 'DStv, GOtv, StarTimes, Showmax', Icon: TvIcon, bg: '#2955a3' },
  { label: 'Education', desc: 'WAEC & JAMB PINs', Icon: CapIcon, bg: '#8c2f4a' },
  { label: 'Internet', desc: 'Smile, Spectranet & more', Icon: GlobeIcon, bg: '#c2540f' },
  { label: 'Bet Funding', desc: 'Fund your betting wallets', Icon: TrophyIcon, bg: '#a38a0a' },
  { label: 'Send Money', desc: 'Free transfers to ZappiPay users', Icon: BuildingIcon, bg: '#1a7a72' },
];

const FEATURES = [
  { emoji: '⚡', title: 'Instant delivery', text: 'Airtime, data and tokens are delivered in seconds, with a receipt you can download or share.' },
  { emoji: '↩️', title: 'Automatic refunds', text: 'If a purchase fails on our side, your money goes straight back to your wallet — no chasing anyone.' },
  { emoji: '🔒', title: 'PIN & fingerprint security', text: 'Every payment is confirmed with your PIN or fingerprint / Face ID on supported phones.' },
  { emoji: '🏷️', title: 'Discounts', text: 'Look out for “% OFF” deals on services — the discount is applied automatically at checkout.' },
  { emoji: '🔁', title: 'Airtime to Cash', text: 'Bought airtime by mistake? Convert it back to wallet cash for a small fee.' },
  { emoji: '💬', title: 'Real support', text: 'Chat with our in-app helper, message us on WhatsApp, or email the support team.' },
];

const FAQ = [
  ['Is it free to create an account?', 'Yes. Signing up is free — you only pay for the services you buy.'],
  ['How do I fund my wallet?', 'Transfer money to the account shown on the Wallet page, then submit the amount and your reference. Your balance updates once it is confirmed and you get a notification.'],
  ['What happens if a purchase fails?', 'The amount is refunded to your ZappiPay wallet automatically, and you get a notification explaining what happened.'],
  ['Can I use ZappiPay on my phone like an app?', 'Yes. Open zappipay.com.ng in your phone browser and choose “Add to Home Screen” (or “Install app”). It opens full-screen like a normal app.'],
  ['Who runs ZappiPay?', 'ZappiPay is operated by Sirraddo Venture, a registered business in Nigeria (BN 7524870). Bill payments are delivered through VTpass, a licensed payment service provider.'],
];

function PhoneMockup() {
  const tiles = [
    ['Airtime', PhoneIcon, '#863bff'],
    ['Data', WifiIcon, '#7a5a10'],
    ['Power', BoltIcon, '#1f6b4a'],
    ['Cable', TvIcon, '#2955a3'],
    ['Exams', CapIcon, '#8c2f4a'],
    ['Send', BuildingIcon, '#1a7a72'],
    ['Internet', GlobeIcon, '#c2540f'],
    ['A2Cash', FundIcon, '#5b3fa8'],
  ];
  return (
    <div className="lp-phone" aria-hidden="true">
      <div className="lp-screen">
        <div className="lp-screen-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <LogoIcon size={22} />
            <Wordmark size={13} />
          </div>
          <div style={{ marginTop: 12, fontWeight: 700 }}>Hi there 👋</div>
          <small>What would you like today?</small>
        </div>
        <div className="lp-screen-balance">
          <small style={{ color: 'var(--slate-400)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wallet balance</small>
          <div className="amt">₦25,400.00</div>
        </div>
        <div className="lp-screen-grid">
          {tiles.map(([label, Icon, bg]) => (
            <div key={label}>
              <i style={{ background: bg }}>
                <Icon size={18} color="#fff" />
              </i>
              {label}
            </div>
          ))}
        </div>
        <div className="lp-toast">
          <span style={{ fontSize: 18 }}>✅</span>
          <div>
            <b style={{ display: 'block' }}>Data purchase successful</b>
            <span style={{ color: 'var(--slate-400)' }}>2GB delivered to 0803•••••12</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const [searchParams] = useSearchParams();
  const [referral, setReferral] = useState(null);
  const ref = searchParams.get('ref');
  const signupTo = ref ? `/signup?ref=${encodeURIComponent(ref)}` : '/signup';

  useEffect(() => {
    // An invite link to the home page (zappipay.com.ng/?ref=code) is
    // remembered so the code is still filled in at signup.
    if (ref) {
      try {
        localStorage.setItem('zappipay_ref', ref);
      } catch {
        // ignore
      }
    }
    getReferralInfo(ref || undefined)
      .then(setReferral)
      .catch(() => {});
  }, [ref]);

  useEffect(() => {
    document.title = 'ZAPPI PAY — Airtime, Data & Bill Payments in Nigeria';
    return () => {
      document.title = 'ZAPPI PAY';
    };
  }, []);

  return (
    <div className="lp">
      <nav className="lp-nav">
        <div className="lp-wrap">
          <Link to="/welcome" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }} aria-label="ZAPPI PAY home">
            <LogoIcon size={32} />
            <Wordmark size={18} />
          </Link>
          <div className="lp-nav-links">
            <Link to="/login" className="lp-btn lp-btn-ghost lp-btn-sm">Log in</Link>
            <Link to={signupTo} className="lp-btn lp-btn-primary lp-btn-sm">Sign up</Link>
          </div>
        </div>
      </nav>

      <header className="lp-wrap lp-hero">
        <div>
          {referral?.referrerFirstName ? (
            <span className="lp-pill">🎉 {referral.referrerFirstName} invited you to ZappiPay</span>
          ) : (
            <span className="lp-pill">Made for Nigeria 🇳🇬</span>
          )}
          <h1>
            Airtime, data &amp; bills — <span>paid in seconds.</span>
          </h1>
          <p className="lead">
            ZappiPay is one wallet for everyday payments. Top up airtime and data, buy electricity tokens, renew cable TV, get exam PINs and
            send money to friends — fast, secure and with automatic refunds if anything fails.
          </p>
          <div className="lp-cta">
            <Link to={signupTo} className="lp-btn lp-btn-primary">Create free account</Link>
            <Link to="/login" className="lp-btn lp-btn-ghost">I already have an account</Link>
          </div>
          <div className="lp-trust">
            <span>Free to join</span>
            <span>Instant delivery</span>
            <span>Auto refunds</span>
            <span>PIN &amp; fingerprint protected</span>
          </div>
        </div>
        <PhoneMockup />
      </header>

      <section className="lp-section" id="services">
        <div className="lp-wrap">
          <h2>Everything you pay for, in one place</h2>
          <p className="sub">Fund your wallet once and pay for any of these whenever you need — for yourself or for someone else.</p>
          <div className="lp-services">
            {SERVICES.map(({ label, desc, Icon, bg }) => (
              <div className="lp-service" key={label}>
                <i style={{ background: bg }}>
                  <Icon size={20} color="#fff" />
                </i>
                <div>
                  <b>{label}</b>
                  <span>{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section" id="why">
        <div className="lp-wrap">
          <h2>Why people use ZappiPay</h2>
          <p className="sub">Built to be quick, reliable and safe with your money.</p>
          <div className="lp-features">
            {FEATURES.map((f) => (
              <div className="lp-feature" key={f.title}>
                <div className="emoji">{f.emoji}</div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section" id="how">
        <div className="lp-wrap">
          <h2>Get started in 3 steps</h2>
          <p className="sub">It takes about a minute to set up.</p>
          <div className="lp-steps">
            <div className="lp-step">
              <h3>Create your account</h3>
              <p>Sign up free with your name, phone number and a password.</p>
            </div>
            <div className="lp-step">
              <h3>Fund your wallet</h3>
              <p>Transfer to your ZappiPay wallet from any Nigerian bank.</p>
            </div>
            <div className="lp-step">
              <h3>Pay for anything</h3>
              <p>Pick a service, enter the number, confirm with your PIN — done.</p>
            </div>
          </div>
        </div>
      </section>

      {referral?.enabled && referral.bonusAmount > 0 && (
        <section className="lp-section" style={{ paddingTop: 10 }}>
          <div className="lp-wrap">
            <div className="lp-refer">
              <div>
                <h2>Refer friends, earn ₦{Number(referral.bonusAmount).toLocaleString()}</h2>
                <p>
                  Share your referral code. When a friend signs up with it and makes their first purchase of ₦
                  {Number(referral.minPurchase).toLocaleString()} or more, the bonus lands in your wallet.
                </p>
              </div>
              <Link to={signupTo} className="lp-btn">Join &amp; start earning</Link>
            </div>
          </div>
        </section>
      )}

      <section className="lp-section lp-faq" id="faq">
        <div className="lp-wrap" style={{ maxWidth: 760 }}>
          <h2>Questions</h2>
          <p className="sub">Can't find your answer? Email us at {SUPPORT_EMAIL}.</p>
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="lp-final">
        <div className="lp-wrap">
          <h2 style={{ fontSize: 'clamp(24px, 5vw, 36px)', margin: '0 0 10px' }}>Ready when you are.</h2>
          <p style={{ color: 'var(--slate-400)', margin: '0 0 22px' }}>Join ZappiPay and pay your next bill in seconds.</p>
          <div className="lp-cta">
            <Link to={signupTo} className="lp-btn lp-btn-primary">Sign up free</Link>
            <Link to="/login" className="lp-btn lp-btn-ghost">Log in</Link>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="cols">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LogoIcon size={26} />
                <Wordmark size={15} />
              </div>
              <p style={{ margin: '10px 0 0', lineHeight: 1.5, maxWidth: 380 }}>
                ZappiPay is operated by Sirraddo Venture (BN 7524870), Ibadan, Nigeria. Bill payments are delivered through VTpass.
              </p>
            </div>
            <div>
              <h4>Company</h4>
              <ul>
                <li><Link to="/legal/about">About us</Link></li>
                <li><Link to="/legal/how-it-works">How it works</Link></li>
                <li><Link to="/legal/terms">Terms &amp; Conditions</Link></li>
                <li><Link to="/legal/privacy">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4>Support</h4>
              <ul>
                <li><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></li>
                <li>
                  <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hello ZappiPay, I need help with')}`} target="_blank" rel="noopener noreferrer">
                    WhatsApp us
                  </a>
                </li>
                <li><Link to="/legal/contact">Contact page</Link></li>
              </ul>
            </div>
          </div>
          <p style={{ marginTop: 24 }}>© {new Date().getFullYear()} Sirraddo Venture. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
