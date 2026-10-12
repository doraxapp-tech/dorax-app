/* Dorax Finance — switches that glide and folds that slide (v202, owner, 2026-10-12: "la mayoría de estos switches, cuando cambio de vista, no
   hacen una transición fluida, ni en computadora ni en la versión móvil; también el botón de más opciones").
   Each action draws the page again, so a switch's choice used to jump and a fold to snap open. This bridges the two drawings:
     1. a switch (a row of buttons with one pressed: .seg and its kinds, the summary's .bq-kind, the side's switch, the home page's): its pressed pill
        slides from the old choice to the new one while the two words trade colours; the page before and after cross-fade (glideRun);
     2. "More options" in a panel: it slides open and shut (its height and its fade), its arrow turning.
   Nothing moves when the person asks for less motion (reducedMotion). Called from app/events.js (switches) and the two fold actions
   (features/transactions/transactions.actions.js: tx-more, app/shell.actions.js: form-more). Styles: css/base/motion.css. */

const GLIDE_GROUPS = '.seg, .bq-kind, .side-seg, .l2-seg';
const GLIDE_STILL = '.rv-dec, .ip-dec, .umenu .seg, .side-seg';      // a choice for one row, the theme, the side: only the pill moves, nothing after it fades
const GLIDE_T = { duration: 280, easing: 'cubic-bezier(.45, 0, .2, 1)' };      // moving on the screen: an even start and a soft landing, so the eye follows the pill (a quick-start curve read as a jump)

/** Before a click's action: where the switch's pressed pill is, and each word's colour. null when the click is not on a switch. */
function glideBefore(el) {
  if (!el || !el.hasAttribute || !el.hasAttribute('aria-pressed') || el.getAttribute('aria-pressed') === 'true' || reducedMotion()) return null;
  const g = el.parentElement; if (!g || !g.matches(GLIDE_GROUPS)) return null;
  const btns = [...g.children].filter(b => b.hasAttribute('aria-pressed')), was = btns.findIndex(b => b.getAttribute('aria-pressed') === 'true');
  if (btns.length < 2 || was < 0) return null;
  const gr = g.getBoundingClientRect(), b = btns[was].getBoundingClientRect();
  return { cls: g.className, label: g.getAttribute('aria-label') || '', gx: gr.left, gy: gr.top, n: btns.length, was, from: { x: b.left - gr.left - g.clientLeft, w: b.width }, colors: btns.map(x => getComputedStyle(x).color) };
}
/** The same switch in the new drawing: the one of its kind nearest to where it was. */
function glideFind(st) {
  const near = [...document.querySelectorAll(GLIDE_GROUPS)].filter(g => g.className.replace(/ ?glide-(on|still)/g, '') === st.cls && (g.getAttribute('aria-label') || '') === st.label)
    .map(g => { const r = g.getBoundingClientRect(); return [Math.abs(r.left - st.gx) + Math.abs(r.top - st.gy), g]; }).sort((a, b) => a[0] - b[0])[0];
  return near && near[1];
}
/** A click on a switch, run as one smooth change (owner, same day: "el contenido que muestran no aparece de manera fluida, hace un brinco raro como un
    glitch"). Where the browser can (View Transitions):
      - each part of what the switch shows (the panel's body, or the page under the top bar), as far as it is on screen, goes from where and what it
        was to where and what it is: it moves to its new place and its old look cross-fades into the new one, so nothing pops in from nothing and
        nothing jumps when the page above it grows or shrinks; a part that is new fades in, one that is gone fades out;
      - the switch itself is drawn live over it, so its pill is seen sliding; the bars and the side menu stay still;
      - the theme's switch (and the side's) cross-fades the whole page instead; a choice for one row only slides its pill.
    Elsewhere the pill slides and what follows it comes in from a little faded. Not a switch, or less motion asked for: the action as it was. */
/** What a click is on. While a switch's change is being set up (the page before kept as a picture) the browser hands clicks to the page's root; the
    click then goes to what is under the pointer, so a second quick click is not lost. */
function glideTarget(e) {
  const t = e.target, root = document.documentElement;
  if (t !== root || !root.classList.contains('glide-vt')) return t;
  // the browser's own hit test is not to be trusted then (it can answer the root alone): the smallest button or link the point is in, in the panel
  // on top when there is one
  const x = e.clientX, y = e.clientY, area = r => r.width * r.height;
  const pick = scope => [...scope.querySelectorAll('[data-a], a[href^="#"]')].map(n => [n, n.getBoundingClientRect()]).filter(([, r]) => r.width && r.height && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom).sort((a, b) => area(a[1]) - area(b[1]))[0];
  const ov = $('overlay'), hit = (ov && ov.children.length && pick(ov)) || pick(document);
  return hit ? hit[0] : t;
}
let glideWait = null;      // a switch's change waiting for its page-before to be kept: the clicks that come meanwhile go after it, in their order
function glideRun(el, run) {
  if (glideWait) return glideWait.then(run);
  const st = glideBefore(el); if (!st) return run();
  const g0 = el.parentElement, how = g0.closest('.umenu') || g0.matches('.side-seg') ? 'page' : g0.matches('.rv-dec, .ip-dec') ? 'pill' : 'area';
  if (how === 'pill' || !document.startViewTransition) { run(); return glideAfter(st, how === 'pill'); }
  const root = document.documentElement, named = [];
  const name = (n, v) => { if (n) { n.style.viewTransitionName = v; named.push(n); } };
  const clear = () => { named.splice(0).forEach(n => { n.style.viewTransitionName = ''; }); };
  // the parts of the panel's body or of the page that are on screen, each by a name of its own (its id, or its kind and its place among its kind):
  // the switch's neighbours at each level up to the body or the page, so a figure beside it and the list under it each go their own way, and the
  // block that holds it (its background)
  const parts = g => { if (how !== 'area') return; const scope = g.closest('.drawer .body, .sheet') || $('view'); if (!scope || !scope.contains(g)) return; const seen = {};
    const one = c => { const base = String(c.id || `${c.tagName}-${c.classList[0] || 'x'}`).toLowerCase().replace(/[^a-z0-9-]/g, '-'), k = seen[base] = (seen[base] || 0) + 1, r = c.getBoundingClientRect();
      if (r.width && r.height && r.bottom > 0 && r.top < innerHeight && getComputedStyle(c).position !== 'fixed') name(c, `glide-${base}-${k}`); };
    let top = g; for (let n = g; n.parentElement && n !== scope; n = n.parentElement) { [...n.parentElement.children].forEach(c => { if (c !== n && !c.matches('.glide-thumb')) one(c); }); if (n.parentElement === scope) { top = n; break; } }
    if (top !== g) one(top); };
  name(g0, 'glide-seg'); parts(g0); root.classList.add('glide-vt', 'glide-vt-' + how);
  let vt; try { vt = document.startViewTransition(() => { clear(); run(); const g = glideFind(st); if (g) { name(g, 'glide-seg'); parts(g); } glideAfter(st, true); }); }
  catch (e) { clear(); root.classList.remove('glide-vt', 'glide-vt-' + how); run(); return glideAfter(st); }
  const wait = glideWait = vt.updateCallbackDone.catch(() => { }).then(() => { if (glideWait === wait) glideWait = null; });
  vt.finished.catch(() => { }).then(() => { clear(); root.classList.remove('glide-vt', 'glide-vt-' + how); });
}
/** After it: the switch in the new drawing, its pill sliding to the new choice. `crossed`: the page cross-fades already (glideRun). */
function glideAfter(st, crossed) {
  if (!st) return;
  const g = glideFind(st); if (!g || !g.animate) return;
  const btns = [...g.children].filter(b => b.hasAttribute('aria-pressed')), now = btns.findIndex(b => b.getAttribute('aria-pressed') === 'true');
  if (btns.length !== st.n || now < 0 || now === st.was) return;
  const nb = btns[now], gr = g.getBoundingClientRect(), r = nb.getBoundingClientRect(), cs = getComputedStyle(nb);
  g.querySelectorAll(':scope > .glide-thumb').forEach(x => x.remove());
  const th = document.createElement('i'); th.className = 'glide-thumb'; th.setAttribute('aria-hidden', 'true');
  const x = r.left - gr.left - g.clientLeft, y = r.top - gr.top - g.clientTop;
  Object.assign(th.style, { left: x + 'px', top: y + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: cs.borderRadius, backgroundColor: cs.backgroundColor, backgroundImage: cs.backgroundImage, boxShadow: cs.boxShadow, border: cs.border });
  const still = getComputedStyle(g).position === 'static'; if (still) g.style.position = 'relative';
  g.classList.add('glide-on', 'glide-still'); g.prepend(th);      // glide-still: the buttons' own colour changes do not run under it
  const a = th.animate({ transform: [`translateX(${st.from.x - x}px)`, 'none'], width: [st.from.w + 'px', r.width + 'px'] }, GLIDE_T);
  nb.animate({ color: [st.colors[now], cs.color] }, GLIDE_T);
  const ob = btns[st.was]; if (ob) ob.animate({ color: [st.colors[st.was], getComputedStyle(ob).color] }, GLIDE_T);
  a.onfinish = a.oncancel = () => { th.remove(); g.classList.remove('glide-on'); void g.offsetWidth; g.classList.remove('glide-still'); if (still) g.style.position = ''; };      // the pill handed back to the button at once, not faded in
  if (!crossed && !g.matches(GLIDE_STILL) && !g.closest(GLIDE_STILL)) glideRest(g);
}
/** Without View Transitions: what the switch shows after it, in the same panel, card or page, comes in from a little faded (not from nothing, which
    read as a blink), a dozen parts at most. */
function glideRest(g) {
  const scope = g.closest('.drawer, .sheet, .card') || $('view'); if (!scope) return;
  const out = []; for (let n = g; n && n !== scope && out.length < 12; n = n.parentElement) { for (let s = n.nextElementSibling; s && out.length < 12; s = s.nextElementSibling) if (!s.matches('footer, .glide-thumb')) out.push(s); }
  out.forEach(el => el.animate({ opacity: [.4, 1] }, { duration: 200, easing: 'ease-out' }));
}

/** "More options": shut, it slides closed before the panel is drawn without it; open, the panel is drawn with it and it slides open. The arrow
    turns with it. A click while it moves is let go (it would undo itself). */
function foldGo(btn, wasOpen, redraw) {
  const id = btn && btn.getAttribute('aria-controls'), box = id && $(id);
  if (!box || !box.animate || reducedMotion()) return redraw();
  if (btn._fold) return; btn._fold = true;
  const turn = (b, from, to) => { const s = b && b.querySelector(':scope > svg:last-child'); if (s) s.animate({ transform: [`rotate(${from}deg)`, `rotate(${to}deg)`] }, { ...GLIDE_T, fill: 'forwards' }); };
  if (wasOpen) {
    const h = box.offsetHeight; box.style.overflow = 'hidden'; turn(btn, 180, 0);
    box.animate({ height: [h + 'px', '0px'], opacity: [1, 0] }, { duration: 200, easing: 'cubic-bezier(.32, .72, 0, 1)', fill: 'forwards' }).onfinish = () => redraw();
    return;
  }
  redraw();
  const nb = $(id), b2 = document.querySelector(`[aria-controls="${id}"]`); if (!nb || nb.hidden) return;
  const h = nb.offsetHeight; nb.style.overflow = 'hidden'; turn(b2, 0, 180);
  const a = nb.animate({ height: ['0px', h + 'px'], opacity: [0, 1] }, GLIDE_T);
  a.onfinish = a.oncancel = () => { nb.style.overflow = ''; if (b2) { const s = b2.querySelector(':scope > svg:last-child'); if (s) s.getAnimations().forEach(x => x.cancel()); } };
}
