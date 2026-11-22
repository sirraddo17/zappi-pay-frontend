// AI replies often use Markdown (**bold**, *italic*, "- " bullets, "# "
// headings, `code`). Show it as formatting instead of raw marks. Built
// from React elements only (no HTML injection), so it is safe for any text.

const INLINE = /(\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`|\*[^*\n]+\*|_[^_\n]+_)/g;

function inline(line, key) {
  return line.split(INLINE).map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p) || /^__[^_]+__$/.test(p)) return <b key={`${key}-${i}`}>{p.slice(2, -2)}</b>;
    if (/^`[^`]+`$/.test(p)) return <code key={`${key}-${i}`} style={{ fontSize: '0.95em' }}>{p.slice(1, -1)}</code>;
    if (/^\*[^*\s][^*]*\*$/.test(p) || /^_[^_\s][^_]*_$/.test(p)) return <i key={`${key}-${i}`}>{p.slice(1, -1)}</i>;
    return p;
  });
}

export function cleanMarkdown(text) {
  return String(text || '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/\*\*|__|`/g, '')
    .replace(/(^|\s)\*(\S[^*\n]*)\*/g, '$1$2');
}

export default function ChatText({ text }) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  return lines.map((raw, n) => {
    let line = raw;
    let heading = false;
    if (/^#{1,6}\s+/.test(line)) { line = line.replace(/^#{1,6}\s+/, ''); heading = true; }
    line = line.replace(/^(\s*)[-*+]\s+/, '$1• ');
    const body = inline(line, n);
    return (
      <span key={n}>
        {heading ? <b>{body}</b> : body}
        {n < lines.length - 1 ? '\n' : ''}
      </span>
    );
  });
}
