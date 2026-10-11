/* Dorax Finance — putting the app on the phone's home screen: the device's side.
   2026-10-07 (owner: "create an announcement banner at the top so that with one button people can add the web app to the home screen of their
   Android or iOS device").
   The two systems do it differently, and only one of them lets a page start it:
   · Android (Chrome, Edge, Samsung Internet): the browser tells the page when the app can be installed ("beforeinstallprompt"). The page keeps
     that and, when the person presses the button, the browser shows its own "Install" box. Where the browser never says so (Firefox), the
     button shows the two taps to do it from the browser's menu.
   · iPhone and iPad: Apple gives a page no way to start it. The button shows the three taps: Share, "Add to Home Screen", "Add".
   Nothing is offered once the app is already open from the home screen, on a computer, or after the person closed the banner on this device
   (that is remembered on the device, not in the account: another phone is another question). */
const INSTALL = (() => {
  const KEY = 'dorax-install-hide';
  let offer = null, hidden = false;      // the browser's own install box, kept for the button; and "not now", for when the device keeps nothing
  const ua = () => (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  // What the device says. A stand-in can be handed over before the app starts (window.DORAX_INSTALL): the tests do.
  const real = {
    ios: () => /iPhone|iPad|iPod/.test(ua()) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    android: () => /Android/.test(ua()),
    standalone: () => navigator.standalone === true || !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches),
    canPrompt: () => !!offer,
    async prompt() { if (!offer) return 'none'; const o = offer; offer = null; o.prompt(); const c = await o.userChoice; return c && c.outcome === 'accepted' ? 'accepted' : 'dismissed'; },
  };
  const env = () => (typeof window !== 'undefined' && window.DORAX_INSTALL) || real;
  /** 'ios' | 'android' | null: which way this device adds an app to its home screen; null where there is nothing to offer. */
  function kind() { const e = env(); try { if (e.standalone()) return null; return e.ios() ? 'ios' : e.android() ? 'android' : null; } catch (x) { return null; } }
  function closed() { if (hidden) return true; try { return localStorage.getItem(KEY) === '1'; } catch (x) { return false; } }
  function close() { hidden = true; try { localStorage.setItem(KEY, '1'); } catch (x) { /* a browser that keeps nothing asks again next visit */ } }
  /** Is the banner to be shown now? */
  const due = () => !!kind() && !closed();
  const again = () => { if (typeof UI !== 'undefined' && UI.session) render(); };
  if (typeof window !== 'undefined' && window.addEventListener) {
    // the browser's own little bar is held back: the app's banner and button are the way in
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); offer = e; again(); });
    window.addEventListener('appinstalled', () => { offer = null; close(); if (typeof UI !== 'undefined' && UI.drawer && UI.drawer.kind === 'install') UI.drawer = null; again(); });
  }
  // Chrome on Android offers to install only a site that has a background script able to answer requests. The app's one (sw.js) is there for
  // notifications; on an Android phone that could install the app it is started at once, so the offer can come. It keeps no copy of anything.
  try { if (real.android() && !real.standalone() && /^https?:$/.test(location.protocol) && navigator.serviceWorker && !document.getElementById('lib-pdf')) navigator.serviceWorker.register('sw.js').catch(() => { /* no offer from the browser: the button shows the menu's way */ }); } catch (x) { /* a frame without its own storage */ }
  return { kind, due, close, canPrompt: () => { try { return !!env().canPrompt(); } catch (x) { return false; } }, prompt: () => env().prompt() };
})();
