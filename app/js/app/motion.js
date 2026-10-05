/* Dorax Finance — the frame: entrances and value changes. */
// ---------- motion ----------
// Entrance: once per navigation. The class is taken off before any later re-render, so typing in a field never replays it.
function enterView() {
  if (reducedMotion()) return;
  for (const id of ['view', 'topbar', 'public']) { const el = $(id); el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); }
  clearTimeout(enterView.t); enterView.t = setTimeout(() => { for (const id of ['view', 'topbar']) $(id).classList.remove('enter'); }, 1200);
  clearTimeout(enterView.p); enterView.p = setTimeout(() => $('public').classList.remove('enter'), 2600);   // the home page artwork takes longer to arrive
}
// Change: the page is redrawn from state, so what was on screen is measured first and the new bars, columns and figures start from there.
const MORPH = [['.meter > i, .hbar .track i', 'width'], ['.colbtn i', 'height']];
function snapshot() {
  const v = $('view');
  return { route: UI.route, sizes: MORPH.map(([sel, prop]) => [...v.querySelectorAll(sel)].map(e => e.style[prop])), values: [...v.querySelectorAll('.kpi .value, .tile .value')].map(e => e.textContent) };
}
function morph(before) {
  if (before.route !== UI.route) return;
  const v = $('view');
  MORPH.forEach(([sel, prop], k) => {
    const els = v.querySelectorAll(sel), was = before.sizes[k]; if (els.length !== was.length) return;
    els.forEach((e, i) => { const to = e.style[prop]; if (!was[i] || was[i] === to) return; e.style.transition = 'none'; e.style[prop] = was[i]; void e.offsetWidth; e.style.transition = prop + ' 460ms var(--ease)'; e.style[prop] = to; });
  });
  const vals = v.querySelectorAll('.kpi .value, .tile .value');
  if (vals.length === before.values.length) vals.forEach((e, i) => { if (e.textContent !== before.values[i]) e.classList.add('tick'); });
}
/** The address changed (back, forward, a typed #route). Only the app has routes: before login the address is left alone. */
function onHash() { if (!UI.session) return; let h = ''; try { h = location.hash.slice(1); } catch (e) { } if (h !== UI.route || !$('view').innerHTML) navigate(h); }
