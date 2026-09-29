import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const WHATSAPP_LINK = 'https://wa.me/2348134209037?text=' + encodeURIComponent('Hello ZappiPay, I need help with');

const DOCS = {
  about: {
    title: 'About Us',
    body: (
      <>
        <p>ZappiPay is a digital wallet and bill payment platform built for the Nigerian market. We let you fund a wallet and instantly pay for airtime, data, electricity, cable TV subscriptions, education (WAEC/JAMB) pins, internet subscriptions, and bet wallet funding — all from one app.</p>
        <p>ZappiPay is operated by Sirraddo Venture, a registered business in Nigeria (BN 7524870), and is built on top of VTpass, a licensed payment solution service provider, for the delivery of airtime, data, and utility bill payments.</p>
        <p>Our goal is simple: make everyday bill payments fast, reliable, and available to everyone, whether you're topping up your own line or paying a bill for someone else.</p>
      </>
    ),
  },
  'how-it-works': {
    title: 'How It Works',
    body: (
      <>
        <p><strong>1. Create an account.</strong> Sign up with your name, phone number, and a password. You can also choose a unique username, which you can use to log in instead of your phone number.</p>
        <p><strong>2. Fund your wallet.</strong> Transfer money into your ZappiPay wallet using the bank details or reference shown in the app. Once confirmed, your balance updates and you're ready to transact.</p>
        <p><strong>3. Choose a service.</strong> From the home screen, pick Airtime, Data, Electricity, Cable TV, Education, Internet, or Bet Funding.</p>
        <p><strong>4. Enter the details.</strong> Provide the phone number, meter number, smartcard number, or account ID the payment is for, and choose an amount or plan.</p>
        <p><strong>5. Pay and confirm.</strong> The amount is deducted from your wallet and the service is delivered instantly. You'll get a receipt you can view, download, or share, and every transaction appears in your history.</p>
        <p>If a purchase ever fails on our end, the amount is automatically refunded to your wallet and you'll get a notification explaining what happened.</p>
      </>
    ),
  },
  terms: {
    title: 'Terms & Conditions',
    body: (
      <>
        <p style={{ color: 'var(--slate-400)' }}>Last updated: 30 September 2026</p>
        <p>These Terms & Conditions ("Terms") govern your use of the ZAPPI PAY mobile and web application ("the App"), operated by Sirraddo Venture, a business registered with the Corporate Affairs Commission of Nigeria (BN 7524870) ("we", "us", "our"). By creating an account or using the App, you agree to these Terms and to our <Link to="/legal/privacy" style={{ color: 'var(--purple)' }}>Privacy Policy</Link>.</p>
        <h3>1. Eligibility</h3>
        <p>You must be at least 18 years old and legally able to enter into a binding agreement. You must give accurate information when you sign up, including your name, phone number and date of birth, and keep it up to date.</p>
        <h3>2. Your account and security</h3>
        <p>You are responsible for keeping your password, transaction PIN, security answer and devices safe, and for all activity on your account. Never share your password, PIN or one-time codes — our staff will never ask for them. For your protection we may lock password login after repeated wrong attempts, log you out after a period of inactivity, ask for your PIN or fingerprint to confirm payments, and hold or review unusual transactions. You can see and log out the devices signed in to your account from the Security page. Tell us straight away if you think someone else has access to your account.</p>
        <h3>3. Wallet funding and balance</h3>
        <p>Your wallet is funded by bank transfer to the account numbers shown in the App (provided by our licensed payment partner) or by manual transfer to our business account for approval. A funding fee may apply; it is shown before you send money. Your wallet balance is used to pay for services in the App and to send money to other users or bank accounts. Wallet balances do not earn interest and are not a bank deposit. We may ask you to verify your identity (for example with your BVN or NIN) before you can use some features or higher limits, and daily limits may apply.</p>
        <h3>4. Purchases</h3>
        <p>When you buy airtime, data, electricity, cable TV, exam PINs, internet or bet funding, we pass the request to our licensed billing partner (VTpass) for delivery. Prices, including any service charge, are shown before you pay. Please check the phone number, meter number, smartcard or account ID before paying: once a service is delivered it cannot be reversed or refunded. If a purchase fails or is not delivered, the amount is refunded to your wallet. We may pause some or all services during maintenance or when a provider is unavailable.</p>
        <h3>5. Sending money</h3>
        <p>Transfers to other ZAPPI PAY users are instant and free. Transfers to bank accounts are processed through our licensed payment partner (Monnify); the fee is shown before you confirm. Always check the account name we display before confirming — once a transfer is completed it cannot be recalled by us. Transfers that fail are returned to your wallet. We may hold a transfer for review where we suspect fraud.</p>
        <h3>6. Rewards, promotions and challenges</h3>
        <p>We may offer cashback, loyalty points, referral bonuses, promo codes, wallet coupons, referral contests and challenges. Each has its own rules shown in the App (for example eligibility, minimum amounts, limits, budgets and end dates). Rewards have no cash value until credited to your wallet, may be reduced so they stay within our limits, and can be changed or ended at any time. Rewards obtained through fraud, fake or duplicate accounts, or abuse of a promotion may be cancelled or reversed, and the account suspended.</p>
        <h3>7. Agents</h3>
        <p>Approved agents may get agent prices to resell our services. Agent status can be removed if these Terms are broken or the account is misused.</p>
        <h3>8. Support and staff access</h3>
        <p>To help you, our support staff can view your account details and transaction history. Sensitive actions such as password resets, refunds and wallet adjustments need approval from an owner and are recorded. We may ask you to confirm your identity (for example your date of birth and security question) before helping.</p>
        <h3>9. Prohibited use</h3>
        <p>You must not use ZAPPI PAY for anything unlawful, including fraud, money laundering or financing terrorism; to deceive or harm other users; to create accounts in someone else’s name; or to interfere with or gain unauthorised access to the App.</p>
        <h3>10. Suspension and closure</h3>
        <p>We may freeze, restrict or close an account if we reasonably believe these Terms have been broken, to prevent fraud, or where required by law or a regulator. You can close your account from Profile at any time once your wallet balance has been spent or withdrawn.</p>
        <h3>11. Liability</h3>
        <p>We work to keep ZAPPI PAY available and accurate, but the App relies on network operators, billers, banks and payment partners. As far as the law allows, we are not liable for losses caused by their outages or delays, by incorrect details you enter, or by unauthorised use of your account resulting from you sharing your login details. Nothing in these Terms limits rights you have under Nigerian consumer protection law.</p>
        <h3>12. Complaints</h3>
        <p>If something goes wrong, report it from the purchase receipt ("Report Issue") or message support in the App. We aim to reply within 24 hours. If you’re not satisfied, email support@zappipay.com.ng.</p>
        <h3>13. Changes</h3>
        <p>We may update these Terms. We’ll tell you about important changes in the App before they take effect. Continuing to use the App after that means you accept the updated Terms.</p>
        <h3>14. Governing law</h3>
        <p>These Terms are governed by the laws of the Federal Republic of Nigeria.</p>
        <p>Questions about these Terms: support@zappipay.com.ng.</p>
      </>
    ),
  },
  privacy: {
    title: 'Privacy Policy',
    body: (
      <>
        <p style={{ color: 'var(--slate-400)' }}>Last updated: 30 September 2026</p>
        <p>This Privacy Policy explains how Sirraddo Venture ("we", "us", "our"), the operator of ZAPPI PAY, collects, uses, shares and protects your personal data, and your rights under the Nigeria Data Protection Act 2023 (NDPA). We are the data controller for the personal data described here.</p>
        <h3>1. Data we collect</h3>
        <ul>
          <li><b>Account details:</b> name, phone number, email, username, date of birth, profile photo (if you add one), and a security question with a scrambled (hashed) answer.</li>
          <li><b>Login and security data:</b> scrambled password and PIN, fingerprint/Face ID keys (the fingerprint itself never leaves your phone), device names, login history and times, and scrambled network identifiers used to spot fraud.</li>
          <li><b>Identity verification:</b> if you request a personal account number, your BVN or NIN is sent directly to our payment partner to verify you. We keep only which type was verified, not the number.</li>
          <li><b>Transactions:</b> wallet funding, purchases (including phone, meter and smartcard numbers you pay for), transfers, bank account details you send money to, rewards and refunds.</li>
          <li><b>Support:</b> messages and pictures you send us, and messages to the in-app assistant.</li>
          <li><b>Notifications:</b> push notification tokens if you turn notifications on.</li>
        </ul>
        <h3>2. Why we use it (and our legal basis)</h3>
        <ul>
          <li>To provide the App: create your account, process funding, purchases and transfers, send receipts (<i>performance of our contract with you</i>).</li>
          <li>To keep accounts and money safe: identity checks, fraud and abuse prevention, login protection (<i>legitimate interests and legal obligations</i>).</li>
          <li>To meet legal, tax, accounting and anti-money-laundering requirements (<i>legal obligation</i>).</li>
          <li>To give support and improve the App (<i>legitimate interests</i>).</li>
          <li>To send promotions and push notifications, which you can switch off at any time (<i>consent</i>).</li>
        </ul>
        <p>We do not make decisions that have legal or similarly significant effects on you based solely on automated processing, except automatic fraud checks that can hold a transaction for human review.</p>
        <h3>3. Who we share it with</h3>
        <p>We share only what each partner needs:</p>
        <ul>
          <li><b>VTpass (Broadshift Technologies)</b> — to deliver airtime, data, bills and PINs.</li>
          <li><b>Monnify (Moniepoint)</b> — personal account numbers, identity verification, bank transfers.</li>
          <li><b>Service providers</b> that host and run the App for us: database and server hosting (Neon, Render, Vercel), email delivery (Resend), and, if you use the in-app assistant, our AI provider (Anthropic).</li>
          <li><b>Authorities</b>, where the law requires it or to prevent fraud or protect users.</li>
        </ul>
        <p>We do not sell your personal data.</p>
        <h3>4. Transfers outside Nigeria</h3>
        <p>Some of our hosting, email and AI providers store or process data outside Nigeria (for example in the United States). Where this happens we rely on the safeguards the NDPA allows, such as contractual data protection commitments from those providers, and we transfer only what is needed.</p>
        <h3>5. How long we keep it</h3>
        <p>We keep your data while your account is open. When you close your account we remove or anonymise your personal details, but keep transaction records for as long as Nigerian law requires for financial and tax records. Login history and security logs are kept for a limited period.</p>
        <h3>6. Security</h3>
        <p>We use encrypted connections, scrambled (hashed) passwords, PINs and security answers, staff access controls with owner approval for sensitive actions, audit logs, login lockouts and automatic logout. No system is perfectly secure; if a breach puts your data at risk we will notify you and the Nigeria Data Protection Commission as the law requires.</p>
        <h3>7. Your rights</h3>
        <p>Under the NDPA you can ask to: see the data we hold about you; correct it; delete it (subject to records we must keep); restrict or object to how we use it; receive a copy in a portable format; and withdraw consent (for example to marketing) at any time. To use these rights, email support@zappipay.com.ng or message support in the App. We’ll confirm your identity and reply within the time the law requires. You can also complain to the Nigeria Data Protection Commission (NDPC).</p>
        <h3>8. Children</h3>
        <p>ZAPPI PAY is for people aged 18 and over. We don’t knowingly collect data from children.</p>
        <h3>9. Changes</h3>
        <p>We may update this Policy and will tell you about important changes in the App.</p>
        <p>Contact for privacy questions: support@zappipay.com.ng · Sirraddo Venture, Ibadan, Nigeria.</p>
      </>
    ),
  },
  contact: {
    title: 'Contact Us',
    body: (
      <>
        <p>We're here to help with anything related to your ZappiPay account or transactions.</p>
        <div className="card" style={{ margin: '16px 0' }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: 'var(--slate-400)', fontSize: 13 }}>Email</div>
            <a href="mailto:support@zappipay.com.ng" style={{ color: 'var(--purple)' }}>support@zappipay.com.ng</a>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: 'var(--slate-400)', fontSize: 13 }}>WhatsApp</div>
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--purple)' }}>Chat with us on WhatsApp</a>
          </div>
          <div>
            <div style={{ color: 'var(--slate-400)', fontSize: 13 }}>Address</div>
            <div>Ibadan, Nigeria</div>
          </div>
        </div>
      </>
    ),
  },
};

export default function Legal() {
  const { doc } = useParams();
  const entry = DOCS[doc];
  const { customer } = useAuth();
  // Logged-out visitors arrive here from the landing page footer.
  const back = customer ? { to: '/profile', label: 'Back to Profile' } : { to: '/welcome', label: 'Back to Home' };

  if (!entry) {
    return (
      <div className="app-shell">
        <div className="page-header">
          <h1>Not found</h1>
        </div>
        <Link to={back.to} className="btn" style={{ margin: '0 16px', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
          {back.label}
        </Link>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="page-header">
        <h1>{entry.title}</h1>
      </div>
      <div style={{ padding: '0 16px 40px', lineHeight: 1.6, fontSize: 14, color: 'var(--slate-100, #f1f5f9)' }}>
        {entry.body}
      </div>
      <Link to={back.to} style={{ display: 'block', margin: '0 16px 32px', color: 'var(--purple)', textAlign: 'center', textDecoration: 'none' }}>
        &larr; {back.label}
      </Link>
    </div>
  );
}
