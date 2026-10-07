import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOpenAiExtras, makeAdImage, makeVoiceover } from '../../api';
import { THEMES, videoSupported } from '../../lib/adRender';
import { SIZES, KINDS, TEMPLATE, drawScene, loadClip, loadImage, recordStory, sceneSeconds, totalSeconds, voiceScript, audioSeconds } from '../../lib/storyVideo';
import { shareFile } from '../../lib/shareCard';

const MAX_MB = 60;
const newId = () => Math.random().toString(36).slice(2, 9);
const withIds = (list) => list.map((s) => ({ ...s, id: newId(), media: null }));
const small = { fontSize: 12, color: 'var(--slate-400)' };
const mini = { width: 'auto', padding: '4px 10px', fontSize: 12 };

function save(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// Ad Studio → 🎞️ Story video: one full ad from many scenes, in the browser.
export default function StoryVideoPanel() {
  const [scenes, setScenes] = useState(() => withIds(TEMPLATE));
  const [pick, setPick] = useState(0);
  const [size, setSize] = useState('tall');
  const [theme, setTheme] = useState('purple');
  const [ox, setOx] = useState(null);
  const [voiceText, setVoiceText] = useState(() => voiceScript(TEMPLATE));
  const [lang, setLang] = useState('en');
  const [voiceName, setVoiceName] = useState('');
  const [voice, setVoice] = useState(null); // { blob, url, seconds, from }
  const [music, setMusic] = useState(null); // { blob, name }
  const [musicVol, setMusicVol] = useState(0.2);
  const [recMic, setRecMic] = useState(null);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState(null);
  const [out, setOut] = useState(null);
  const preview = useRef(null);
  const mediaCache = useRef(new Map());

  useEffect(() => { getOpenAiExtras().then(setOx).catch(() => setOx(null)); }, []);
  useEffect(() => () => { scenes.forEach((s) => s.media?.url && URL.revokeObjectURL(s.media.url)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const total = useMemo(() => totalSeconds(scenes), [scenes]);
  const s = scenes[pick] || scenes[0];
  const ttsReady = Boolean(ox?.keySet && ox?.tts?.enabled);
  const imgReady = Boolean(ox?.images?.ready);

  // Small preview of the chosen scene (middle of the scene).
  useEffect(() => {
    let off = false;
    const c = preview.current;
    if (!c || !s) return undefined;
    const { w, h } = SIZES[size];
    c.width = w / 4;
    c.height = h / 4;
    const draw = (m) => {
      if (off) return;
      const ctx = c.getContext('2d');
      ctx.save();
      ctx.scale(0.25, 0.25);
      drawScene(ctx, s, m, w, h, 0.6, theme, { hint: true });
      ctx.restore();
    };
    const url = s.media?.url;
    if (!url || s.kind === 'card' || s.kind === 'logo') { draw(null); return () => { off = true; }; }
    const cached = mediaCache.current.get(url);
    if (cached) draw(cached);
    else {
      (s.media.type === 'video' ? loadClip(url).then((v) => new Promise((r) => { v.currentTime = Math.min(1, (v.duration || 2) / 2); v.onseeked = () => r(v); })) : loadImage(url))
        .then((m) => { mediaCache.current.set(url, m); draw(m); })
        .catch(() => draw(null));
    }
    return () => { off = true; };
  }, [s, size, theme]);

  const update = (i, patch) => setScenes((list) => list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  function move(i, d) {
    const j = i + d;
    if (j < 0 || j >= scenes.length) return;
    setScenes((list) => { const n = [...list]; [n[i], n[j]] = [n[j], n[i]]; return n; });
    setPick(j);
  }
  function remove(i) {
    if (scenes.length <= 1) return;
    const m = scenes[i].media;
    if (m?.url) URL.revokeObjectURL(m.url);
    setScenes((list) => list.filter((_, j) => j !== i));
    setPick(Math.max(0, i - 1));
  }
  function addScene() {
    setScenes((list) => [...list.slice(0, -1), { id: newId(), kind: 'photo', seconds: 3, caption: 'New scene', say: '', media: null }, ...list.slice(-1)]);
    setPick(Math.max(0, scenes.length - 1));
  }

  function attach(i, file) {
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) { setMsg({ ok: false, text: `That file is over ${MAX_MB} MB. Trim it first (CapCut, or your phone's editor).` }); return; }
    const type = file.type.startsWith('video') ? 'video' : 'image';
    const old = scenes[i].media;
    if (old?.url) URL.revokeObjectURL(old.url);
    const url = URL.createObjectURL(file);
    update(i, { media: { type, url, name: file.name }, kind: type === 'video' ? 'clip' : 'photo' });
    if (type === 'video') {
      loadClip(url).then((v) => { if (v.duration && v.duration < sceneSeconds(scenes[i])) update(i, { seconds: Math.max(1, Math.floor(v.duration * 10) / 10) }); }).catch(() => {});
    }
  }

  async function aiPicture(i) {
    const sc = scenes[i];
    const price = ox?.images?.prices?.tall;
    if (!window.confirm(`Make an AI picture for scene ${i + 1}? It costs about $${Number(price || 0).toFixed(3)}.`)) return;
    setBusy(`pic-${i}`);
    setMsg(null);
    try {
      const r = await makeAdImage({ prompt: sc.prompt || sc.caption, shape: size === 'square' ? 'square' : 'tall' });
      const blob = await (await fetch(r.image)).blob();
      const url = URL.createObjectURL(blob);
      if (sc.media?.url) URL.revokeObjectURL(sc.media.url);
      update(i, { media: { type: 'image', url, name: 'AI picture' }, kind: 'photo' });
      getOpenAiExtras().then(setOx).catch(() => {});
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy('');
    }
  }

  async function setVoiceBlob(blob, from) {
    const seconds = await audioSeconds(blob).catch(() => 0);
    if (voice?.url) URL.revokeObjectURL(voice.url);
    setVoice({ blob, url: URL.createObjectURL(blob), seconds, from });
    if (seconds && Math.abs(seconds - total) > 1.5) setMsg({ ok: true, text: `The voice is ${seconds.toFixed(1)}s and the scenes are ${total}s — tap “Fit scenes to the voice”.` });
  }

  async function aiVoice() {
    const chars = voiceText.trim().length;
    const usd = ((ox?.tts?.usdPer1kChars || 0.015) * chars) / 1000;
    if (!window.confirm(`Make the AI voiceover? About $${usd.toFixed(3)} (${chars} letters).`)) return;
    setBusy('voice');
    setMsg(null);
    try {
      await setVoiceBlob(await makeVoiceover({ text: voiceText, language: lang, voice: voiceName || undefined }), 'AI voice');
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy('');
    }
  }

  async function startMic() {
    setMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const types = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
      const mimeType = types.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || '';
      const r = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecMic(null);
        setVoiceBlob(new Blob(chunks, { type: (mimeType || 'audio/webm').split(';')[0] }), 'My voice');
      };
      r.start(200);
      setRecMic(r);
    } catch {
      setMsg({ ok: false, text: 'Could not use the microphone. Allow it in the browser and try again.' });
    }
  }

  function fitToVoice() {
    if (!voice?.seconds) return;
    const k = voice.seconds / total;
    setScenes((list) => list.map((x) => ({ ...x, seconds: Math.max(1, Math.round(sceneSeconds(x) * k * 10) / 10) })));
    setMsg({ ok: true, text: 'Scene lengths now match the voice.' });
  }

  async function make() {
    const missing = scenes.map((x, i) => ((x.kind === 'photo' || x.kind === 'clip') && !x.media ? i + 1 : 0)).filter(Boolean);
    if (missing.length && !window.confirm(`Scene ${missing.join(', ')} has no picture or clip yet — it will show as a text card. Make the video anyway?`)) return;
    setBusy('make');
    setMsg(null);
    setProgress(0);
    try {
      const r = await recordStory({ scenes, size, theme, voice: voice?.blob, music: music?.blob, musicVolume: musicVol, onProgress: setProgress });
      if (out?.url) URL.revokeObjectURL(out.url);
      setOut({ ...r, url: URL.createObjectURL(r.blob), name: `zappipay-story-${size}.${r.ext}` });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy('');
    }
  }

  if (!videoSupported()) {
    return <div className="card"><b>🎞️ Story video</b><p style={small}>This browser can’t make videos. Open Ad Studio in Chrome on a computer or an Android phone.</p></div>;
  }

  const caption = `${scenes.map((x) => x.caption).filter(Boolean).slice(2, 5).join(' • ')} 👉 www.zappipay.com.ng #ZAPPIPAY #Nigeria #PayBills`;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <b>🎞️ Story video — a full TikTok / Reels ad</b>
      <p style={{ ...small, margin: '4px 0 10px' }}>Join scenes into one video with captions, your logo, a voice and music. Use your own photos, phone screen recordings, HeyGen clips or AI pictures. Keep this tab open while it records (it takes as long as the video).</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <select value={size} onChange={(e) => setSize(e.target.value)} style={{ width: 'auto' }} aria-label="Size">{Object.entries(SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <select value={theme} onChange={(e) => setTheme(e.target.value)} style={{ width: 'auto' }} aria-label="Colour">{Object.keys(THEMES).map((k) => <option key={k} value={k}>{k[0].toUpperCase() + k.slice(1)} colour</option>)}</select>
        <button type="button" className="btn btn-secondary" style={mini} onClick={() => { if (window.confirm('Start again from the 30-second template?')) { setScenes(withIds(TEMPLATE)); setVoiceText(voiceScript(TEMPLATE)); setPick(0); } }}>↺ Template</button>
        <span style={{ ...small, alignSelf: 'center' }}>{scenes.length} scenes · {total.toFixed(1).replace(/\.0$/, '')}s</span>
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          {scenes.map((x, i) => (
            <div key={x.id} onClick={() => setPick(i)} style={{ border: `1px solid ${i === pick ? 'var(--purple)' : 'var(--slate-700, #334155)'}`, borderRadius: 10, padding: 10, marginBottom: 8, cursor: 'pointer', background: i === pick ? 'rgba(134,59,255,0.08)' : 'transparent' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <b style={{ fontSize: 13 }}>{i + 1}.</b>
                <select value={x.kind} onChange={(e) => update(i, { kind: e.target.value })} style={{ width: 'auto', fontSize: 12, padding: '4px 6px' }} aria-label="Scene type">{Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <input type="number" min="1" max="20" step="0.5" value={x.seconds} onChange={(e) => update(i, { seconds: e.target.value })} style={{ width: 64, fontSize: 12, padding: '4px 6px' }} aria-label="Seconds" /><span style={small}>s</span>
                <span style={{ flex: 1 }} />
                <button type="button" className="btn btn-secondary" style={mini} onClick={(e) => { e.stopPropagation(); move(i, -1); }} aria-label="Move up">↑</button>
                <button type="button" className="btn btn-secondary" style={mini} onClick={(e) => { e.stopPropagation(); move(i, 1); }} aria-label="Move down">↓</button>
                <button type="button" className="btn btn-secondary" style={mini} onClick={(e) => { e.stopPropagation(); remove(i); }} aria-label="Delete scene">✕</button>
              </div>
              {(x.kind === 'card' || x.kind === 'logo') ? (
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <input value={x.title || ''} onChange={(e) => update(i, { title: e.target.value })} placeholder={x.kind === 'logo' ? 'Slogan' : 'Big text'} style={{ fontSize: 13 }} />
                  <input value={x.sub || ''} onChange={(e) => update(i, { sub: e.target.value })} placeholder={x.kind === 'logo' ? 'Website / button' : 'Small text'} style={{ fontSize: 13 }} />
                </div>
              ) : (
                <>
                  <input value={x.caption || ''} onChange={(e) => update(i, { caption: e.target.value })} placeholder="Caption on screen" style={{ fontSize: 13, marginTop: 6 }} />
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
                    <label className="btn btn-secondary" style={{ ...mini, cursor: 'pointer', margin: 0 }}>
                      {x.media ? '🔁 Change' : x.kind === 'clip' ? '⬆ Add clip' : '⬆ Add photo / clip'}
                      <input type="file" accept="image/*,video/*" onChange={(e) => { attach(i, e.target.files?.[0]); e.target.value = ''; }} style={{ display: 'none' }} />
                    </label>
                    {imgReady && x.kind === 'photo' && <button type="button" className="btn btn-secondary" style={mini} disabled={busy === `pic-${i}`} onClick={(e) => { e.stopPropagation(); aiPicture(i); }}>{busy === `pic-${i}` ? 'Making…' : '✨ AI picture'}</button>}
                    {x.media && <span style={{ ...small, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{x.media.type === 'video' ? '🎬' : '🖼️'} {x.media.name}</span>}
                  </div>
                  {x.prompt && !x.media && (
                    <div style={{ ...small, marginTop: 6 }}>
                      Idea: {x.prompt}{' '}
                      {!x.prompt.toLowerCase().startsWith("screen recording") && <button type="button" style={{ background: 'none', border: 'none', color: 'var(--purple)', cursor: 'pointer', padding: 0, fontSize: 12 }} onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(`Vertical 9:16 realistic video, ${x.prompt}, natural light, cinematic`).then(() => setMsg({ ok: true, text: 'Prompt copied — paste it into Google Veo, Kling or Runway, then add the clip here.' })).catch(() => {}); }}>copy AI-video prompt</button>}
                    </div>
                  )}
                </>
              )}
              <input value={x.say || ''} onChange={(e) => update(i, { say: e.target.value })} placeholder="What the voice says here (optional)" style={{ fontSize: 12, marginTop: 6 }} />
            </div>
          ))}
          <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={addScene}>＋ Add scene</button>
        </div>

        <div style={{ flex: '0 0 auto', textAlign: 'center' }}>
          <canvas ref={preview} style={{ width: size === 'square' ? 220 : 180, borderRadius: 10, display: 'block', background: '#000' }} aria-label={`Preview of scene ${pick + 1}`} />
          <div style={{ ...small, marginTop: 4 }}>Scene {pick + 1} preview</div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--slate-800)', marginTop: 14, paddingTop: 12 }}>
        <b style={{ fontSize: 14 }}>🎙️ Voice</b>
        <textarea rows={3} value={voiceText} onChange={(e) => setVoiceText(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', marginTop: 6 }} aria-label="Voiceover script" />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
          <button type="button" className="btn btn-secondary" style={mini} onClick={() => setVoiceText(voiceScript(scenes))}>↻ From scenes</button>
          {ttsReady ? (
            <>
              <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ width: 'auto', fontSize: 12, padding: '4px 6px' }} aria-label="Voice language"><option value="en">English</option><option value="pcm">Pidgin</option></select>
              <select value={voiceName} onChange={(e) => setVoiceName(e.target.value)} style={{ width: 'auto', fontSize: 12, padding: '4px 6px' }} aria-label="Voice"><option value="">Default voice ({ox.tts.voice})</option>{(ox.tts.voices || []).map((v) => <option key={v} value={v}>{v}</option>)}</select>
              <button type="button" className="btn" style={mini} disabled={busy === 'voice' || !voiceText.trim()} onClick={aiVoice}>{busy === 'voice' ? 'Making…' : '✨ AI voice'}</button>
            </>
          ) : (
            <span style={small}>AI voice: turn on Natural voice in <Link to="/admin/settings" style={{ color: 'var(--purple)' }}>Settings → AI Assistant</Link>.</span>
          )}
          {recMic
            ? <button type="button" className="btn" style={{ ...mini, background: 'var(--red-500)' }} onClick={() => recMic.stop()}>■ Stop recording</button>
            : <button type="button" className="btn btn-secondary" style={mini} onClick={startMic}>🎤 Record my voice</button>}
          <label className="btn btn-secondary" style={{ ...mini, cursor: 'pointer', margin: 0 }}>⬆ Upload voice<input type="file" accept="audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setVoiceBlob(f, f.name); e.target.value = ''; }} style={{ display: 'none' }} /></label>
        </div>
        {voice && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            <audio src={voice.url} controls style={{ height: 34, maxWidth: '100%' }} />
            <span style={small}>{voice.from} · {voice.seconds ? `${voice.seconds.toFixed(1)}s` : ''}</span>
            {voice.seconds > 0 && Math.abs(voice.seconds - total) > 0.5 && <button type="button" className="btn btn-secondary" style={mini} onClick={fitToVoice}>⇔ Fit scenes to the voice</button>}
            <button type="button" className="btn btn-secondary" style={mini} onClick={() => { URL.revokeObjectURL(voice.url); setVoice(null); }}>Remove</button>
          </div>
        )}

        <b style={{ fontSize: 14, display: 'block', marginTop: 12 }}>🎵 Music (optional)</b>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
          <label className="btn btn-secondary" style={{ ...mini, cursor: 'pointer', margin: 0 }}>{music ? '🔁 Change music' : '⬆ Add music'}<input type="file" accept="audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setMusic({ blob: f, name: f.name }); e.target.value = ''; }} style={{ display: 'none' }} /></label>
          {music && <><span style={small}>{music.name}</span><label style={{ ...small, display: 'flex', gap: 6, alignItems: 'center' }}>Volume<input type="range" min="0.05" max="0.8" step="0.05" value={musicVol} onChange={(e) => setMusicVol(Number(e.target.value))} style={{ width: 100 }} /></label><button type="button" className="btn btn-secondary" style={mini} onClick={() => setMusic(null)}>Remove</button></>}
        </div>
        <p style={{ ...small, margin: '4px 0 0' }}>Only use music you’re allowed to: royalty-free tracks (YouTube Audio Library, Pixabay Music) — or add a TikTok/Instagram sound when you post.</p>
      </div>

      {msg && <p style={{ fontSize: 13, color: msg.ok ? 'var(--green-500)' : 'var(--red-500)', margin: '10px 0 0' }}>{msg.text}</p>}
      <button type="button" className="btn" style={{ marginTop: 12 }} disabled={busy === 'make' || Boolean(recMic)} onClick={make}>
        {busy === 'make' ? `Recording… ${Math.round(progress * 100)}% — keep this tab open` : `🎬 Make the ${total.toFixed(0)}-second video`}
      </button>

      {out && (
        <div role="dialog" aria-label="Story video" onClick={(e) => e.target === e.currentTarget && setOut(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: `min(${size === 'square' ? 460 : 340}px, 100%)`, maxHeight: '100%', overflow: 'auto', background: 'var(--slate-800)', borderRadius: 16, padding: 14 }}>
            <video src={out.url} controls autoPlay playsInline style={{ width: '100%', borderRadius: 10, display: 'block' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button type="button" className="btn" onClick={() => shareFile(out.blob, out.name, caption)}>Share</button>
              <button type="button" className="btn btn-secondary" onClick={() => save(out.blob, out.name)}>Download</button>
              <button type="button" className="btn btn-secondary" onClick={() => setOut(null)}>Close</button>
            </div>
            <p style={{ ...small, margin: '10px 0 0' }}>
              {out.ext === 'webm' ? 'Saved as WebM — TikTok and Instagram accept it; if WhatsApp won’t, open it in CapCut and export MP4. ' : ''}
              When you post: if you used AI pictures, clips or voice, switch on the platform’s “AI-generated” label. Don’t show AI people as real customers.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
