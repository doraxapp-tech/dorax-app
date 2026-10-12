/* Dorax Finance — the installed app on an iPhone gets its whole screen back after the keyboard (owner, 2026-10-12, with a screenshot of the summary:
   "there is a weird space in the bottom": the bar at the foot sat high and under it a band of another colour).
   In an app added to the home screen, iOS shrinks the page when the keyboard opens and does not always give the height back when it closes: the
   app's frame (fixed, the whole screen) stays shorter, the bar at the foot rises with it, and what is under the frame shows at the foot. Hiding the
   frame for an instant and showing it again makes the browser measure the screen again (the same thing a new page would do), and the height is
   back. It is done in one go, between two paintings, so nothing is seen; the list keeps where it was scrolled to. Only in the installed app on an
   iPhone or iPad, and never while something is being typed. */
(() => {
  let ios = false, alone = false;
  try {
    ios = /iPhone|iPad|iPod/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    alone = navigator.standalone === true || !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  } catch (e) { return; }
  if (!ios || !alone) return;
  const tall = {};      // the tallest the page has been, for each width (a phone turned on its side has another)
  const seen = () => { const k = innerWidth; if (!(tall[k] >= innerHeight)) tall[k] = innerHeight; return tall[k]; };
  const typing = () => { const a = document.activeElement; return !!a && (a.isContentEditable || ((a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT') && !a.readOnly)); };
  function heal() {
    const most = seen(); if (typing() || most - innerHeight <= 4) return;
    const app = document.querySelector('.app'); if (!app) return;
    const work = document.querySelector('.work'), y = work ? work.scrollTop : 0;
    app.style.display = 'none'; void app.offsetHeight; app.style.display = ''; void app.offsetHeight;
    if (work && work.scrollTop !== y) work.scrollTop = y;
  }
  // an iPhone held upright fills its screen: the screen's own height is the mark from the start, so a page opened already short is healed too
  try { if (screen.width === innerWidth && screen.height > innerHeight && /iPhone|iPod/.test(navigator.userAgent || '')) tall[innerWidth] = screen.height; } catch (e) { /* no screen size: the tallest seen will do */ }
  seen();
  addEventListener('focusout', () => { setTimeout(heal, 140); setTimeout(heal, 420); });
  if (window.visualViewport) visualViewport.addEventListener('resize', () => { seen(); setTimeout(heal, 80); });
  addEventListener('resize', () => setTimeout(heal, 80));
  addEventListener('pageshow', () => setTimeout(heal, 120));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(heal, 200); });
})();
