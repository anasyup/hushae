import { Fragment } from 'react';

/* ============================================================================
 * BLOGMARKDOWN — tiny Markdown renderer for blog articles.
 *
 * WHY A SECOND PROSE RENDERER
 *   ProseBody is deliberately plain (headings / paragraphs / lists) because a
 *   returns policy does not need inline formatting. A blog article does:
 *   bold, italic, links, images, quotes, ordered lists, code. That is the
 *   difference between "a document" and "an article".
 *
 * SECURITY — same rule as ProseBody: nothing is ever passed to
 *   dangerouslySetInnerHTML. Inline runs are parsed into React elements, so a
 *   <script> typed into the editor renders as visible text, never as a script.
 *   Link hrefs are sanitised to http/https/mailto — javascript: URLs are
 *   dropped on the floor.
 *
 * SUPPORTED — a pragmatic subset, enough for a fashion blog:
 *   # / ## / ### headings, paragraphs, **bold**, *italic*, `code`, [link](url),
 *   ![alt](url), - unordered lists, 1. ordered lists, > quotes, --- rule.
 * ========================================================================== */

const HREF_OK = /^(https?:|mailto:)/i;

function sanitizeHref(href) {
  const h = String(href || '').trim();
  return HREF_OK.test(h) ? h : null;
}

/* Parse inline content: **bold**, *italic*, `code`, [text](url), ![alt](url).
   Returns an array of React-ready nodes. */
function inline(text, keyBase) {
  const out = [];
  let i = 0;
  let k = 0;
  const rest = String(text || '');

  const push = (node) => { out.push(node); };

  while (i < rest.length) {
    // Image ![alt](url)
    if (rest.startsWith('![', i)) {
      const close = rest.indexOf('](', i + 2);
      const end = close > -1 ? rest.indexOf(')', close + 2) : -1;
      if (close > -1 && end > -1) {
        const alt = rest.slice(i + 2, close);
        const url = sanitizeHref(rest.slice(close + 2, end));
        if (url) push(<img key={`${keyBase}-${k++}`} src={url} alt={alt || ''} loading="lazy" />);
        i = end + 1;
        continue;
      }
    }
    // Link [text](url)
    if (rest.startsWith('[', i)) {
      const close = rest.indexOf('](', i + 1);
      const end = close > -1 ? rest.indexOf(')', close + 2) : -1;
      if (close > -1 && end > -1) {
        const label = rest.slice(i + 1, close);
        const url = sanitizeHref(rest.slice(close + 2, end));
        if (url) push(<a key={`${keyBase}-${k++}`} href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 decoration-line hover:decoration-ink">{inline(label, `${keyBase}-a${k}`)}</a>);
        i = end + 1;
        continue;
      }
    }
    // Bold **text**
    if (rest.startsWith('**', i)) {
      const end = rest.indexOf('**', i + 2);
      if (end > -1) {
        push(<strong key={`${keyBase}-${k++}`} className="font-semibold">{inline(rest.slice(i + 2, end), `${keyBase}-b${k}`)}</strong>);
        i = end + 2;
        continue;
      }
    }
    // Italic *text*
    if (rest[i] === '*') {
      const end = rest.indexOf('*', i + 1);
      if (end > -1) {
        push(<em key={`${keyBase}-${k++}`}>{inline(rest.slice(i + 1, end), `${keyBase}-i${k}`)}</em>);
        i = end + 1;
        continue;
      }
    }
    // Inline code `code`
    if (rest[i] === '`') {
      const end = rest.indexOf('`', i + 1);
      if (end > -1) {
        push(<code key={`${keyBase}-${k++}`} className="rounded bg-satin px-1.5 py-0.5 font-mono text-[0.9em]">{rest.slice(i + 1, end)}</code>);
        i = end + 1;
        continue;
      }
    }
    // Plain character — accumulate a run for performance.
    let j = i;
    while (j < rest.length && !'*`[!'.includes(rest[j])) j += 1;
    if (j > i) {
      push(<Fragment key={`${keyBase}-${k++}`}>{rest.slice(i, j)}</Fragment>);
      i = j;
    } else {
      push(<Fragment key={`${keyBase}-${k++}`}>{rest[i]}</Fragment>);
      i += 1;
    }
  }
  return out;
}

function blockquote(text, keyBase) {
  return (
    <blockquote key={keyBase} className="my-6 border-l-2 border-obsidian pl-5 italic text-ash">
      {inline(text, keyBase)}
    </blockquote>
  );
}

export default function BlogMarkdown({ text, headingLevel = 2 }) {
  const raw = String(text || '').replace(/\r\n/g, '\n');
  if (!raw.trim()) return null;

  const H = `h${Math.min(6, Math.max(2, headingLevel))}`;
  const lines = raw.split('\n');
  const blocks = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push(<hr key={k++} className="my-8 border-line" />);
      i += 1;
      continue;
    }
    // Headings
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = Math.min(h[1].length + headingLevel - 1, 6);
      const Tag = `h${level}`;
      blocks.push(<Tag key={k++} className="mt-10 mb-4 font-display text-2xl leading-snug first:mt-0">{inline(h[2], `h${k}`)}</Tag>);
      i += 1;
      continue;
    }
    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      blocks.push(blockquote(quote.join(' '), k++));
      continue;
    }
    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i += 1;
      }
      blocks.push(
        <ul key={k++} className="my-4 list-disc space-y-1.5 pl-6">
          {items.map((it, idx) => <li key={idx}>{inline(it, `ul${k}-${idx}`)}</li>)}
        </ul>
      );
      continue;
    }
    // Ordered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''));
        i += 1;
      }
      blocks.push(
        <ol key={k++} className="my-4 list-decimal space-y-1.5 pl-6">
          {items.map((it, idx) => <li key={idx}>{inline(it, `ol${k}-${idx}`)}</li>)}
        </ol>
      );
      continue;
    }
    // Blank line — skip
    if (/^\s*$/.test(line)) {
      i += 1;
      continue;
    }
    // Paragraph — gather consecutive non-blank, non-special lines
    const para = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,3})\s/.test(lines[i]) && !/^\s*>\s?/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+[.)]\s+/.test(lines[i])) {
      para.push(lines[i].trim());
      i += 1;
    }
    if (para.length) {
      blocks.push(<p key={k++} className="my-4 leading-relaxed text-[15px]">{inline(para.join(' '), `p${k}`)}</p>);
    }
  }

  return <div className="mt-6 text-obsidian">{blocks}</div>;
}
