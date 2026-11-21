# Chapter 3 onward: plan only (not built)

Theme: **AmeriPro's operator screens are web pages, and now you build them.** The player has spent two chapters inside machines; now they build the screens operators use, ending with a web HMI for the press.

## Chapter 3: JavaScript basics
- An in-game code editor beside a live preview (sandboxed iframe), wired to the Chapter 2 sim through a tiny `plc.read('Tag')` / `plc.write('Tag', v)` API.
- Missions: change a lamp color on an HMI page; show a tank level as a number, then as a bar; make a Start button send a pulse; format a timer's ACC as mm:ss.
- Concepts: variables, functions, if/else, events, the DOM.

## Chapter 4: Browser dev tools and debugging
- Callouts again, but in code: an HMI page that shows the wrong level (a units bug), a button that sends two starts (no debounce, the web version of ONS), a page that freezes (an infinite loop).
- Concepts: console, breakpoints, the network tab, reading an error message.

## Chapter 5: Git
- An in-browser repository of the HMI project (isomorphic-git or a small simulator).
- Missions: commit a fix with a good message; branch to try a new layout; read a diff to find who broke the alarm banner; revert a bad change.

## Chapter 6: Game-loop thinking
- State, update, render: the same shape as the PLC scan (read inputs, solve, write outputs).
- Missions: animate the mixing tank from sim data; build a trend chart of the level; make the animation frame-rate independent.

## Chapter 7: Python automation (later)
- Pyodide in the browser.
- Missions: parse a run log CSV from the press; compute run hours per screw; flag shifts with undosed feed.

## Capstone
A web HMI for the PJDL-302: mode and start/stop, run and fault lamps, mixing tank level, the polymer alarm with acknowledge, the run-on countdown, and a simple trend, driven by the player's own Chapter 2 ladder program.
