// App shell: header, hash router, mission map, save menu.

import { clear, h, modal, toast } from './dom';
import { chapters, missionById, missions } from '../data';
import { missionScreen } from './missionScreen';
import * as save from './save';
import { HelpPanel, cards } from './help';
import logoUrl from '../../assets/ameripro_logo.jpg';

export function startApp(root: HTMLElement) {
  const main = h('main', { id: 'main' });
  const header = h(
    'header',
    { class: 'top' },
    h('a', { href: '#/', class: 'brand', 'aria-label': 'Control Room home' }, h('img', { src: logoUrl, alt: 'AmeriPro', class: 'logo' }), h('span', { class: 'brand-name' }, 'Control Room')),
    h(
      'nav',
      { class: 'top-nav' },
      h('a', { href: '#/', class: 'btn small ghost' }, 'Missions'),
      h('a', { href: '#/help', class: 'btn small ghost' }, 'Help cards'),
      h('button', { class: 'btn small ghost', onclick: () => saveMenu() }, 'Save'),
    ),
  );
  root.append(header, main);
  let teardown: (() => void) | null = null;

  const route = () => {
    teardown?.();
    teardown = null;
    clear(main);
    window.scrollTo(0, 0);
    const hash = location.hash || '#/';
    const m = /^#\/m\/(.+)$/.exec(hash);
    if (m) {
      const mission = missionById(decodeURIComponent(m[1]));
      if (mission) {
        document.title = `${mission.id} ${mission.title} · Control Room`;
        teardown = missionScreen(mission, main, (hh) => (location.hash = hh));
        return;
      }
    }
    if (hash === '#/help') {
      document.title = 'Help cards · Control Room';
      helpIndex(main);
      return;
    }
    document.title = 'Control Room';
    home(main);
  };
  window.addEventListener('hashchange', route);
  route();
}

function unlocked(id: string): boolean {
  // Missions open in order within a chapter; Chapter 2 opens after 1.9.
  const i = missions.findIndex((m) => m.id === id);
  if (i <= 0) return true;
  const prev = missions[i - 1];
  if (save.load().missions[prev.id]?.status === 'done') return true;
  if (save.load().missions[id]) return true;
  return false;
}

function home(main: HTMLElement) {
  const s = save.load();
  const done = missions.filter((m) => s.missions[m.id]?.status === 'done').length;
  main.appendChild(
    h(
      'section',
      { class: 'hero' },
      h('h1', {}, 'Control Room'),
      h(
        'p',
        { class: 'lede' },
        "You're AmeriPro's new controls technician. Each work order is one of our machines: a truck's transfer pump, a lift station, the hood-wash rig, the PJDL-302 screw press, and a water treatment trailer. Wire it, run it, break it, fix it.",
      ),
      h('p', { class: 'small muted' }, `${done} of ${missions.length} missions commissioned.`),
    ),
  );
  for (const ch of chapters) {
    const list = missions.filter((m) => m.chapter === ch.n);
    main.appendChild(
      h(
        'section',
        { class: 'chapter' },
        h('h2', {}, `Chapter ${ch.n}: ${ch.title}`),
        h('p', { class: 'muted' }, ch.blurb),
        list.length === 0
          ? h('p', { class: 'muted small' }, 'Coming soon.')
          : h(
              'ol',
              { class: 'mission-grid' },
              list.map((m) => {
                const st = s.missions[m.id]?.status;
                const open = unlocked(m.id);
                return h(
                  'li',
                  {},
                  h(
                    'a',
                    { href: open ? `#/m/${m.id}` : undefined, class: `mission-card ${st ?? ''} ${open ? '' : 'locked'}`, 'aria-disabled': open ? undefined : 'true' },
                    h('span', { class: 'mission-id' }, m.id),
                    h('span', { class: 'kind' }, m.kind === 'build' ? 'Build' : m.kind === 'callout' ? 'Callout' : 'Investigate'),
                    h('strong', {}, m.title),
                    h('span', { class: 'site small' }, m.site),
                    h('span', { class: 'status small' }, st === 'done' ? '✓ Commissioned' : !open ? 'Locked' : st ? 'In progress' : ''),
                  ),
                );
              }),
            ),
      ),
    );
  }
  main.appendChild(
    h(
      'section',
      { class: 'chapter' },
      h('h2', {}, 'Chapter 3 and on: Operator screens are web pages'),
      h('p', { class: 'muted' }, 'Planned: JavaScript, browser dev tools, git, game-loop thinking and Python, ending with a web HMI for the press. Not built yet.'),
    ),
  );
  main.appendChild(
    h(
      'footer',
      { class: 'foot small muted' },
      h('p', {}, 'Control Room uses Allen-Bradley instruction names as a learning convention. It is not affiliated with Rockwell Automation and does not replace Studio 5000, Connected Components Workbench, or real training. Nothing here is a safe procedure for the real press: lockout/tagout, hardwired E-stops and a qualified electrician still apply.'),
    ),
  );
}

function helpIndex(main: HTMLElement) {
  const panel = new HelpPanel();
  const list = Object.values(cards).sort((a, b) => a.title.localeCompare(b.title));
  main.appendChild(
    h(
      'section',
      { class: 'chapter' },
      h('h1', {}, 'Help cards'),
      h('p', { class: 'muted' }, 'Every part, instruction and safety idea in the game, with how it shows up in real Allen-Bradley software.'),
      h('div', { class: 'card-index' }, list.map((c) => h('button', { class: 'btn', onclick: () => panel.show(c.id) }, c.title))),
    ),
  );
  main.appendChild(panel.root);
}

function saveMenu() {
  const file = h('input', { type: 'file', accept: 'application/json,.json', class: 'visually-hidden', id: 'import-file' });
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (!f) return;
    const err = await save.importSave(f);
    if (err) toast(err, 'warn');
    else {
      toast('Save loaded.');
      location.hash = '#/';
      location.reload();
    }
  });
  const body = h(
    'div',
    { class: 'stack' },
    h('p', {}, 'Progress is kept in this browser. Export it to move to another device or keep a backup.'),
    h('div', { class: 'insp-row' }, h('button', { class: 'btn', onclick: () => save.exportSave() }, 'Export save'), h('label', { class: 'btn', for: 'import-file' }, 'Import save'), file),
    h('button', {
      class: 'btn danger small',
      onclick: () =>
        modal('Erase all progress?', h('p', {}, 'This cannot be undone unless you exported a save.'), [
          { label: 'Cancel' },
          { label: 'Erase', primary: true, onClick: () => { save.resetAll(); location.hash = '#/'; location.reload(); } },
        ]),
    }, 'Erase progress'),
  );
  modal('Save', body);
}
