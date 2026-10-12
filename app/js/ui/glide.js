/* Dorax Finance — switches that glide and folds that slide (v202, owner, 2026-10-12: "la mayoría de estos switches, cuando cambio de vista, no
   hacen una transición fluida, ni en computadora ni en la versión móvil; también el botón de más opciones").
   Each action draws the page again, so a switch's choice used to jump and a fold to snap open. This bridges the two drawings:
     1. a switch (a row of buttons with one pressed: .seg and its kinds, the summary's .bq-kind, the side's switch, the home page's): its pressed pill
        slides from the old choice to the new one while the two words trade colours; what the switch shows after it comes in with a short fade;
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
/** After it: the same switch in the new drawing (the one of its kind nearest to where it was), its pill sliding to the new choice. */
function glideAfter(st) {
  if (!st) return;
  const near = [...document.querySelectorAll(GLIDE_GROUPS)].filter(g => g.className === st.cls && (g.getAttribute('aria-label') || '') === st.label)
    .map(g => { const r = g.getBoundingClientRect(); return [Math.abs(r.left - st.gx) + Math.abs(r.top - st.gy), g]; }).sort((a, b) => a[0] - b[0])[0];
  const g = near && near[1]; if (!g || !g.animate) return;
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
  if (!g.matches(GLIDE_STILL) && !g.closest(GLIDE_STILL)) glideRest(g);
}
/** What the switch shows after it, in the same panel, card or page: a short fade as it comes in (a dozen parts at most). */
function glideRest(g) {
  const scope = g.closest('.drawer, .sheet, .card') || $('view'); if (!scope) return;
  const out = []; for (let n = g; n && n !== scope && out.length < 12; n = n.parentElement) { for (let s = n.nextElementSibling; s && out.length < 12; s = s.nextElementSibling) if (!s.matches('footer, .glide-thumb')) out.push(s); }
  out.forEach(el => el.animate({ opacity: [0, 1], transform: ['translateY(4px)', 'none'] }, { duration: 220, easing: 'cubic-bezier(.23, 1, .32, 1)' }));
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
