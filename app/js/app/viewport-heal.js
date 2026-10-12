/* Dorax Finance — an iPhone after its keyboard (owner, 2026-10-12, with a screenshot of the summary: "there is a weird space in the bottom"; then,
   the same morning: "agregar transacción se friza, el teclado numérico no funciona bien, tocas un lugar, abre otro").
   Two things iOS can leave behind when its keyboard goes down:
     - the page scrolled: to show the field it moves the whole page up, and may leave it there; what is drawn fixed (a panel, the bar at the foot)
       then is not where a finger finds it. The page goes back to its top (it never scrolls itself: the app's column does, .work);
     - in the app added to the home screen, the page shorter than the screen: the app's frame (fixed, the whole screen) stays short, the bar at the
       foot rises with it and a band shows under it. Hiding the frame for an instant and showing it again makes the browser measure the screen
       again, and the height is back.
   Both once, after the keyboard has finished going (half a second after the field let go, and only if no other field took the focus), never while
   it moves (v189 did it on every step of the keyboard's movement: that was the freeze). The frame is measured again only with no panel open (the
   panel is not part of the frame; it is done when the panel closes), at most once every two seconds; the list keeps where it was scrolled to. */
(() => {
  let ios = false, alone = false;
  try {
    ios = /iPhone|iPad|iPod/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    alone = navigator.standalone === true || !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  } catch (e) { return; }
  if (!ios) return;
  const writes = el => !!el && (el.isContentEditable || ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') && !el.readOnly && !/^(button|checkbox|radio|range|submit|reset|file|color)$/.test(el.type || '')));
  const tall = {};      // the tallest the page has been with no keyboard, for each width (a phone on its side has another)
  const note = () => { if (writes(document.activeElement)) return; const k = innerWidth; if (!(tall[k] >= innerHeight)) tall[k] = innerHeight; };
  let last = 0, owed = false, timer = 0;
  function remeasure() {
    if (!alone || writes(document.activeElement)) return;
    const most = tall[innerWidth] || 0; if (most - innerHeight <= 4) { owed = false; return; }
    if (UI && (UI.drawer || UI.sheet || UI.modal || UI.find)) { owed = true; return; }      // after the panel closes
    if (Date.now() - last < 2000) return; last = Date.now(); owed = false;
    const app = document.querySelector('.app'); if (!app) return;
    const work = document.querySelector('.work'), y = work ? work.scrollTop : 0;
    app.style.display = 'none'; void app.offsetHeight; app.style.display = ''; void app.offsetHeight;
    if (work && work.scrollTop !== y) work.scrollTop = y;
  }
  function settle() {
    if (writes(document.activeElement)) return;      // another field took the focus: the keyboard stays up
    if (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop) { window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; }
    remeasure();
  }
  note();
  document.addEventListener('focusout', e => { if (!writes(e.target)) return; clearTimeout(timer); timer = setTimeout(settle, 500); });
  addEventListener('resize', note);
  // a panel closed with a measure owed: done as the page is whole again
  const ov = document.getElementById('overlay');
  if (ov && window.MutationObserver) new MutationObserver(() => { if (owed && !ov.firstChild) setTimeout(remeasure, 60); }).observe(ov, { childList: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(settle, 300); });
})();
