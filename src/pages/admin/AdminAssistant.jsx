import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { adminAiChat, getAdminAiStatus, getAiBriefing } from '../../api';
import ImageAttach from '../../components/ImageAttach';
import AiActionCard from '../../components/admin/AiActionCard';
import AiDesignCard from '../../components/admin/AiDesignCard';

const SUGGESTIONS = [
  'How did we do today?',
  'Any fraud or risk flags I should look at?',
  'Summarise open support tickets and draft replies',
  'How long will my VTpass balance last?',
  'Explain my money check in simple words',
  'Did VTpass change any prices or commissions?',
  'Which in-app ads are working?',
  'Plan a campaign to win back customers who stopped buying',
  'What questions keep coming up in support? Add them to the Help Centre',
  'Check my discounts and rewards are safe for my margins',
  'Set the rewards split to 30% and make the referral bonus ₦100',
  'Create a challenge: buy data 5 times this month for ₦20',
  'Design a Christmas data promo post and WhatsApp status',
  'Make a 728×90 web banner for cheap data',
  'Anything that needs my attention?',
  'Compare this week with last week',
  'Which service made the most profit this month?',
  'Show failed orders today and why',
  'Who are my top 5 customers this month?',
  'How much did I really make this month, line by line?',
  'If customers spend ₦1,000 on each service, how much do I keep?',
];

// Ask about the business in plain English. It can also propose reward,
// pricing and promotion changes (applied only when the owner taps Apply)
// and design adverts at any size.
export default function AdminAssistant() {
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    getAdminAiStatus().then(setStatus).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function ask(text) {
    const q = text.trim() || (images.length ? 'What does this picture show? Check it against our records if relevant.' : '');
    if (!q || busy) return;
    const pics = images;
    const next = [...messages, { role: 'user', content: q, pics }];
    setMessages(next);
    setInput('');
    setImages([]);
    setBusy(true);
    setError('');
    try {
      const res = await adminAiChat(next.map(({ role, content }) => ({ role, content })), pics.length ? pics : undefined);
      setMessages((m) => [...m, { role: 'assistant', content: res.reply, actions: res.actions || [], designs: res.designs || [] }]);
    } catch (err) {
      setError(err.message || 'The assistant could not answer.');
      setMessages(messages);
      setInput(q);
      setImages(pics);
    } finally {
      setBusy(false);
    }
  }

  const off = status && !status.adminEnabled;

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1>AI Assistant</h1>
          <p>Ask about sales, profit and customers — or tell it to change rewards, discounts and promotions, or design an ad. Changes only happen when you tap Apply. It can't touch keys, bank accounts, payouts, security or customer wallets.</p>
        </div>
        {!off && status && (
          <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 14px' }} disabled={busy} onClick={async () => {
            setBusy(true);
            setError('');
            try {
              const r = await getAiBriefing();
              setMessages((m) => [...m, { role: 'user', content: '✨ Today’s briefing' }, { role: 'assistant', content: r.briefing }]);
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}>
            ✨ Today’s briefing
          </button>
        )}
        {messages.length > 0 && (
          <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 14px' }} onClick={() => { setMessages([]); setError(''); }}>
            New chat
          </button>
        )}
      </div>

      {off && (
        <div className="card" style={{ margin: '0 0 16px', border: '1px solid var(--orange, #f97316)' }}>
          <strong>The AI assistant is off.</strong>
          <p style={{ color: 'var(--slate-400)', fontSize: 14, margin: '4px 0 0' }}>
            {status.keySet ? 'Turn on "Admin assistant"' : 'Paste your Claude API key and turn on "Admin assistant"'} in{' '}
            <Link to="/admin/settings" style={{ color: 'var(--purple)' }}>Settings → AI Assistant</Link>.
          </p>
        </div>
      )}

      <div className="card" style={{ margin: 0, display: 'flex', flexDirection: 'column', minHeight: 420, maxWidth: 820 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: '60vh', paddingBottom: 8 }}>
          {messages.length === 0 && (
            <div>
              <p style={{ color: 'var(--slate-400)', fontSize: 14, marginTop: 0 }}>Try one of these:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }} disabled={off || busy} onClick={() => ask(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%' }}>
              <div
                style={{
                  background: m.role === 'user' ? 'var(--purple)' : 'var(--slate-900)',
                  color: m.role === 'user' ? '#fff' : 'var(--slate-100)',
                  padding: '10px 14px',
                  borderRadius: 12,
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.pics?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                    {m.pics.map((src, j) => <img key={j} src={src} alt="" style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8 }} />)}
                  </div>
                )}
                {m.content}
              </div>
              {m.actions?.map((a) => <AiActionCard key={a.id} action={a} />)}
              {m.designs?.map((d, j) => <AiDesignCard key={j} design={d} />)}
            </div>
          ))}
          {busy && <div style={{ color: 'var(--slate-400)', fontSize: 14 }}>Looking it up…</div>}
          <div ref={endRef} />
        </div>

        {error && <p className="error-text" style={{ margin: '8px 0' }}>{error}</p>}

        <form
          onSubmit={(e) => { e.preventDefault(); ask(input); }}
          style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--slate-700)', paddingTop: 12, marginTop: 8 }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={2000}
            placeholder="e.g. Raise the delivery promise bonus to ₦15, or design a data promo"
            aria-label="Question"
            disabled={off}
          />
          <button className="btn" type="submit" style={{ width: 'auto', padding: '8px 18px' }} disabled={off || busy || (!input.trim() && !images.length)}>
            Ask
          </button>
        </form>
        {!off && <ImageAttach value={images} onChange={setImages} label="📷 Add a picture (e.g. a customer's screenshot)" />}
        <p style={{ color: 'var(--slate-400)', fontSize: 11, margin: '8px 0 0' }}>AI can make mistakes. Double-check numbers on the Overview and Orders pages before acting on them.</p>
      </div>
    </AdminLayout>
  );
}
