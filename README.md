# learn

AmeriPro's learning projects. The first is **Control Room**, a browser game that teaches relay logic, then Allen-Bradley-style PLC ladder programming, using our own equipment as the missions. It's published at **https://jefrix.github.io/learn/**.

## Play it locally
You need Node.js 20 or newer.

```
npm install
npm run dev
```

Then open the address it prints (http://localhost:5173/learn/).

## Test and build
```
npm test        # engine tests, Allen-Bradley instruction tests, and every mission solved by its reference
npm run build   # type-check and build the static site into dist/
```

## Deploy
`.github/workflows/deploy.yml` tests, builds and publishes to GitHub Pages on every push to `main`. One-time setup in the GitHub repo: **Settings → Pages → Source: GitHub Actions**.

## Add a mission
Missions, machines and help cards are data:
- `src/data/missions/ch1/*.ts`, `ch2/*.ts`: one or more missions per file (default export). Each has a brief, a starter, test scenarios with plain-language failure sentences, and a reference solution.
- `src/data/machines/*.ts`: the plant parts and their screen positions, relay devices, hardwired circuits and PLC I/O.
- `src/data/help/*.md`: help cards. Link between them with `[[card-id]]`; every card needs a `## Real world` (or `## Safety`) section.

`npm test` fails if a new mission's reference solution doesn't pass its own tests.

## Contents
| Path | What it is |
|---|---|
| `src/engine/` | Relay solver, ladder scan engine, process physics, sim clock, mission runner. No DOM. |
| `src/ui/` | Editor, machine view, mission screen, help panel, save. |
| `src/data/` | Missions, machines, help cards. |
| `tests/` | Vitest tests. |
| `docs/DESIGN.md` | The approved design. |
| `docs/SIMPLIFICATIONS.md` | Everywhere the game simplifies real hardware or our press. |
| `docs/CHAPTER3_PLAN.md` | Plan for the software chapters. |
| `reference/` | Source material: press drawings and photos, operator guide, MWTP documents. Not part of the game. |
| `assets/` | AmeriPro logo. |
| `PROMPT.md` | The original brief. |

The reference files are copies taken on 2026-11-21. The originals live in [jefrix/ameripro](https://github.com/jefrix/ameripro), where the screw press guide is maintained.

## Learning order
1. Relay logic (Chapter 1, built)
2. Allen-Bradley PLC programming (Chapter 2, built): Connected Components Workbench and its Micro800 Simulator to start, Studio 5000 concepts after
3. JavaScript core
4. Browser dev tools and debugging
5. Git beyond the basics
6. Game-loop thinking
7. Python, later

Control Room uses Allen-Bradley instruction names as a learning convention. It isn't affiliated with Rockwell Automation and doesn't replace its software or training. Nothing in it is a safe procedure for the real press.
