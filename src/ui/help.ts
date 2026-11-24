// Help cards: Markdown files in src/data/help, one per concept or instruction.
// A tiny renderer covers what the cards use: # title, ## sections, lists,
// **bold**, `code`, and [[card-id]] links to other cards.

import { h } from './dom';

const files = import.meta.glob('../data/help/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export interface Card {
  id: string;
  title: string;
  md: string;
}

export const cards: Record<string, Card> = {};
for (const [path, md] of Object.entries(files)) {
  const id = path.split('/').pop()!.replace(/\.md$/, '');
  const title = /^#\s+(.+)$/m.exec(md)?.[1] ?? id;
  cards[id] = { id, title, md };
}

function esc(t: string) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function inline(t: string): string {
  return esc(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[\[([a-z0-9-]+)\]\]/g, (_, id) => `<a href="#" data-card="${id}">${esc(cards[id]?.title ?? id)}</a>`)
    // [text](#/route): links to other pages of the game only
    .replace(/\[([^\]]+)\]\((#\/[A-Za-z0-9./_-]*)\)/g, '<a href="$2">$1</a>');
}

export function renderMd(md: string): HTMLElement {
  const out = h('div', { class: 'md' });
  const lines = md.split(/\r?\n/);
  let para: string[] = [];
  let list: HTMLElement | null = null;
  let section: HTMLElement = out;
  const flush = () => {
    if (para.length) {
      const p = h('p', {});
      p.innerHTML = inline(para.join(' '));
      section.appendChild(p);
      para = [];
    }
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^#\s/.test(line)) {
      flush();
      continue; // title shown by the caller
    }
    const m2 = /^##\s+(.+)$/.exec(line);
    if (m2) {
      flush();
      const isReal = /^real world/i.test(m2[1]);
      const isSafety = /^safety/i.test(m2[1]);
      section = h('section', { class: isReal ? 'real-world' : isSafety ? 'safety' : '' }, h('h4', {}, m2[1]));
      out.appendChild(section);
      continue;
    }
    const li = /^\s*(?:[-*]|(\d+)\.)\s+(.+)$/.exec(line);
    if (li) {
      if (para.length) flush();
      const tagName: 'ol' | 'ul' = li[1] ? 'ol' : 'ul';
      if (list && list.tagName.toLowerCase() !== tagName) list = null;
      if (!list) {
        list = h(tagName, {});
        section.appendChild(list);
      }
      const item = h('li', {});
      item.innerHTML = inline(li[2]);
      list.appendChild(item);
      continue;
    }
    if (line.trim() === '') {
      flush();
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return out;
}

/** The help drawer: shows one card at a time, with links between cards. */
export class HelpPanel {
  root: HTMLElement;
  private body: HTMLElement;
  private title: HTMLElement;
  private back: string[] = [];
  private current = '';

  constructor() {
    this.title = h('h3', {});
    this.body = h('div', { class: 'help-body' });
    this.root = h(
      'aside',
      { class: 'help-panel', hidden: true, 'aria-label': 'Help card' },
      h(
        'div',
        { class: 'help-head' },
        h('button', { class: 'btn small', onclick: () => this.goBack(), 'aria-label': 'Back' }, '←'),
        this.title,
        h('button', { class: 'btn small', onclick: () => this.hide(), 'aria-label': 'Close help' }, '✕'),
      ),
      this.body,
    );
    this.body.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest('a[data-card]');
      if (!a) return;
      e.preventDefault();
      this.show(a.getAttribute('data-card') as string);
    });
  }

  show(id: string, push = true) {
    const c = cards[id];
    if (push && this.current && this.current !== id) this.back.push(this.current);
    this.current = id;
    this.title.textContent = c ? c.title : id;
    this.body.replaceChildren(c ? renderMd(c.md) : h('p', {}, `No help card called "${id}" yet.`));
    this.root.hidden = false;
    this.body.scrollTop = 0;
  }

  /** Show arbitrary content (a mission's Real-world note). */
  showContent(title: string, md: string) {
    if (this.current) this.back.push(this.current);
    this.current = '';
    this.title.textContent = title;
    this.body.replaceChildren(renderMd(md));
    this.root.hidden = false;
  }

  private goBack() {
    const prev = this.back.pop();
    if (prev) this.show(prev, false);
  }

  hide() {
    this.root.hidden = true;
  }
}
