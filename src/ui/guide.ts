// Renders a guide page (Tutorial, Rules of thumb) from its markdown: a table of
// contents, sections with optional live demos and pictures, and help-card links.

import { h } from './dom';
import { HelpPanel, renderMd, inline } from './help';
import { liveDemo, type Demo } from './demo';
import { demos, guides, images, type Guide } from '../data/guides';
import * as save from './save';

interface Heading {
  level: 2 | 3;
  text: string;
  id: string;
}

const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function parseHeading(line: string): Heading | null {
  const m = /^(##|###)\s+(.+?)(?:\s+\{#([a-z0-9-]+)\})?\s*$/.exec(line);
  if (!m) return null;
  return { level: m[1] === '##' ? 2 : 3, text: m[2], id: m[3] ?? slug(m[2]) };
}

export function guidePage(id: Guide['id'], host: HTMLElement, anchor?: string): () => void {
  const md = guides[id].md;
  const help = new HelpPanel();
  const running: Demo[] = [];
  const lines = md.split(/\r?\n/);
  const title = /^#\s+(.+)$/m.exec(md)?.[1] ?? id;

  const body = h('div', { class: 'guide-body' });
  const toc = h('ol', { class: 'guide-toc' });
  let tocSub: HTMLElement | null = null;
  let buf: string[] = [];
  let intro = true;
  const introBox = h('div', { class: 'lede' });
  let target: HTMLElement = introBox;

  const flush = () => {
    const text = buf.join('\n').trim();
    buf = [];
    if (text) target.appendChild(renderMd(text));
  };

  for (const line of lines) {
    if (/^#\s/.test(line)) continue;
    const hd = parseHeading(line);
    if (hd) {
      flush();
      intro = false;
      const el = h(hd.level === 2 ? 'h2' : 'h3', { id: `g-${hd.id}`, tabindex: '-1' });
      el.innerHTML = inline(hd.text);
      if (hd.level === 2) {
        const sec = h('section', { class: 'guide-section' }, el);
        body.appendChild(sec);
        target = sec;
        tocSub = null;
        toc.appendChild(h('li', {}, h('a', { href: `#/${id}/${hd.id}` }, hd.text)));
      } else {
        const sub = h('div', { class: 'guide-rule' }, el);
        (target.closest('section') ?? body).appendChild(sub);
        target = sub;
        if (!tocSub) {
          tocSub = h('ol', {});
          toc.lastElementChild?.appendChild(tocSub);
        }
        tocSub.appendChild(h('li', {}, h('a', { href: `#/${id}/${hd.id}` }, hd.text.replace(/^\d+\.\s*/, ''))));
      }
      continue;
    }
    const widget = /^\{\{(demo|img):([a-z0-9-]+)\}\}\s*$/.exec(line.trim());
    if (widget) {
      flush();
      if (widget[1] === 'demo' && demos[widget[2]]) {
        const d = liveDemo(demos[widget[2]], (cid) => help.show(cid));
        running.push(d);
        target.appendChild(d.root);
      } else if (widget[1] === 'img' && images[widget[2]]) {
        const im = images[widget[2]];
        target.appendChild(h('figure', { class: 'guide-shot' }, h('img', { src: im.src, alt: im.alt, loading: 'lazy' }), h('figcaption', { class: 'small muted' }, im.caption)));
      }
      continue;
    }
    if (intro) target = introBox;
    buf.push(line);
  }
  flush();

  const other = id === 'tutorial' ? { href: '#/basics', label: 'Next: Rules of thumb →' } : { href: '#/m/1.1', label: 'Start mission 1.1 →' };
  const page = h(
    'article',
    { class: 'guide' },
    h('h1', {}, title),
    introBox,
    h('nav', { class: 'guide-nav card', 'aria-label': 'On this page' }, h('h2', { class: 'small' }, 'On this page'), toc),
    body,
    h('div', { class: 'guide-foot' }, h('a', { href: '#/', class: 'btn' }, '← Missions'), h('a', { href: other.href, class: 'btn primary' }, other.label)),
  );
  // help-card links anywhere on the page open the drawer
  page.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest('a[data-card]');
    if (!a) return;
    e.preventDefault();
    help.show(a.getAttribute('data-card') as string);
  });
  host.append(page, help.root);

  const s = save.load();
  const seen = new Set(s.settings.seenGuides ?? []);
  if (!seen.has(id)) {
    seen.add(id);
    s.settings.seenGuides = [...seen];
    save.persist();
  }

  if (anchor) {
    const el = document.getElementById(`g-${anchor}`);
    if (el) {
      el.scrollIntoView();
      el.focus({ preventScroll: true });
    }
  }
  return () => running.forEach((d) => d.stop());
}
