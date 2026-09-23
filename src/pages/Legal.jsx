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
        <p>These Terms & Conditions ("Terms") govern your use of the ZappiPay mobile and web application ("the App"), operated by Sirraddo Venture ("we", "us", "our"). By creating an account or using the App, you agree to these Terms.</p>
        <h3>1. Eligibility</h3>
        <p>You must be at least 18 years old, or the age of majority in your jurisdiction, and legally able to enter into a binding agreement to use ZappiPay.</p>
        <h3>2. Your Account</h3>
        <p>You are responsible for keeping your login details (password and, where applicable, username) confidential. You must provide accurate information when signing up and keep it up to date. You're responsible for all activity carried out from your account.</p>
        <h3>3. Wallet Funding and Balance</h3>
        <p>Your ZappiPay wallet balance is funded by you and used solely to pay for services within the App. Funds in your wallet are not interest-bearing and do not constitute a bank deposit.</p>
        <h3>4. Service Purchases</h3>
        <p>When you buy airtime, data, electricity, cable TV, education pins, internet, or bet funding through the App, we route the transaction to our licensed payment/billing partner for delivery. Once a service is successfully delivered (e.g. airtime credited, token generated), the transaction is final and non-refundable, except where the purchase fails to deliver, in which case the amount is refunded to your wallet.</p>
        <h3>5. Prohibited Use</h3>
        <p>You agree not to use ZappiPay for any unlawful purpose, to defraud us or any third party, or to attempt to gain unauthorized access to any part of the App or other users' accounts.</p>
        <h3>6. Suspension and Termination</h3>
        <p>We may suspend or close your account if we reasonably believe you have violated these Terms, engaged in fraud, or if required by law or regulation.</p>
        <h3>7. Limitation of Liability</h3>
        <p>ZappiPay is provided "as is". While we work to keep the service reliable, we are not liable for losses arising from service interruptions, third-party payment or network provider failures, or incorrect details entered by you when making a purchase.</p>
        <h3>8. Changes to These Terms</h3>
        <p>We may update these Terms from time to time. Continued use of the App after changes take effect means you accept the updated Terms.</p>
        <h3>9. Governing Law</h3>
        <p>These Terms are governed by the laws of the Federal Republic of Nigeria.</p>
        <p>If you have questions about these Terms, contact us at support@zappipay.com.ng.</p>
      </>
    ),
  },
  privacy: {
    title: 'Privacy Policy',
    body: (
      <>
        <p>This Privacy Policy explains how Sirraddo Venture ("we", "us", "our") collects, uses, and protects your information when you use ZappiPay.</p>
        <h3>1. Information We Collect</h3>
        <p>We collect information you provide directly, such as your name, phone number, email address, and (if you choose to provide it) identity verification details like BVN or NIN. We also collect transaction data, such as the services you purchase, amounts, and timestamps, and basic device/usage information to keep the App secure and working properly.</p>
        <h3>2. How We Use Your Information</h3>
        <p>We use your information to create and manage your account, process wallet funding and purchases, verify your identity where required for certain features, send you transaction receipts and notifications, respond to support requests, and improve and secure the App.</p>
        <h3>3. Sharing Your Information</h3>
        <p>We share the minimum information necessary with our payment and billing partners (such as VTpass and our banking/payment providers) to process your transactions. We do not sell your personal information to third parties. We may disclose information where required by law or to protect the rights, safety, or property of ZappiPay, our users, or others.</p>
        <h3>4. Data Security</h3>
        <p>We use reasonable technical and organizational measures to protect your information, including encrypted connections and access controls. No system is completely secure, and we encourage you to keep your login details private.</p>
        <h3>5. Data Retention</h3>
        <p>We retain your information for as long as your account is active and for a reasonable period afterward, as needed to comply with legal, regulatory, and record-keeping obligations.</p>
        <h3>6. Your Choices</h3>
        <p>You can review and update your profile information in the App at any time. To request account closure or data deletion, contact us using the details below, subject to any records we are legally required to keep.</p>
        <h3>7. Changes to This Policy</h3>
        <p>We may update this Privacy Policy from time to time. We'll notify you of material changes through the App.</p>
        <p>Questions about this Privacy Policy can be sent to support@zappipay.com.ng.</p>
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
