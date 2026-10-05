/* Dorax Finance — notifications on this device (Web Push), the browser's side.
   Switching them on is four steps, in this order because browsers insist on it: the person is asked for permission in direct answer to
   their click; the small background script (sw.js) is registered; the browser makes a subscription for this device, tied to the app's
   public key; and the subscription is given to the server, which is the one that sends. Switching off undoes the last two.
   A subscription belongs to a device, not to the account: it is what "this phone" or "this computer" means to the server. */
const PUSH = (() => {
  const bytes = b64 => Uint8Array.from(atob(String(b64).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  /** "Chrome, Windows": enough to tell one's devices apart, without keeping the browser's whole description. */
  const agent = () => { const ua = navigator.userAgent || '';
    const b = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    const o = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
    return o ? `${b}, ${o}` : b; };
  // What the browser offers. A stand-in can be handed over before the app starts (window.DORAX_PUSH): the tests do.
  const real = {
    supported: () => /^https?:$/.test(location.protocol) && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
    /** An iPhone or iPad whose Safari is showing the site in a tab: Apple gives websites notifications only once they are on the Home Screen. */
    needsInstall: () => (/iPhone|iPad|iPod/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && !(navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)),
    permission: () => Notification.permission,
    ask: () => Notification.requestPermission(),
    async current() { const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription(); return sub ? sub.toJSON() : null; },
    async subscribe(key) { const reg = await navigator.serviceWorker.register('sw.js'); await navigator.serviceWorker.ready; return (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(key) })).toJSON(); },
    async unsubscribe() { const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); },
  };
  const env = () => (typeof window !== 'undefined' && window.DORAX_PUSH) || real;
  const flat = j => j && j.endpoint && j.keys ? { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth } : null;

  /** 'preview' | 'install' | 'unsupported' | 'blocked' | 'on' | 'off'. */
  async function status() {
    const e = env();
    if (SERVER.preview && e === real) return 'preview';                 // the stand-in server sends nothing
    try {
      if (!e.supported()) return e.needsInstall() ? 'install' : 'unsupported';
      if (e.permission() === 'denied') return 'blocked';
      return flat(await e.current()) ? 'on' : 'off';
    } catch (x) { return 'unsupported'; }
  }
  /** Switches this device on. Returns { ok } or { ok: false, why: 'denied' | 'failed' }. */
  async function on() {
    const e = env();
    try {
      const p = e.permission() === 'granted' ? 'granted' : await e.ask();          // first, while the click still counts as the person's
      if (p !== 'granted') return { ok: false, why: 'denied' };
      const k = await SERVER.pushKey(); if (!k.ok) return { ok: false, why: 'failed' };
      const sub = flat(await e.subscribe(k.key)); if (!sub) return { ok: false, why: 'failed' };
      const r = await SERVER.pushSave({ ...sub, agent: agent() });
      if (!r.ok) { try { await e.unsubscribe(); } catch (x) { /* nothing was kept on the server; the browser's half goes with the next try */ } return { ok: false, why: 'failed' }; }
      return { ok: true };
    } catch (x) { return { ok: false, why: 'failed' }; }
  }
  /** Switches this device off: the server forgets it first, then the browser. Also called when logging out, so that the next person who
      uses this browser never gets the last one's bills. */
  async function off() {
    const e = env();
    try { if (!e.supported()) return; const sub = flat(await e.current()); if (!sub) return; await SERVER.pushRemove(sub.endpoint); await e.unsubscribe(); } catch (x) { /* a device that could not be reached is forgotten by the server the first time a message bounces */ }
  }
  return { status, on, off };
})();

/** What the profile shows for this device. Read once when the profile is first drawn, and again after every change. */
async function pushRefresh() {
  const st = await PUSH.status(); UI.push = { ...(UI.push || {}), status: st, busy: false, known: true };
  if (UI.session && UI.route === 'profile' && !UI.drawer) render();
}
/** A notification was tapped: open the reminders. From the background script when the app was already open, from the address when it was not. */
function pushArrival() {
  let asked = false; try { asked = /[?&]open=reminders\b/.test(location.search); if (asked) history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* a sandboxed frame keeps its address */ }
  if (asked && UI.session) A.reminders();
}
// Inside a frame that is not allowed its own storage (how a published preview runs), even asking the browser for navigator.serviceWorker is an
// error: there are no notifications there, so there is nothing to listen to.
try {
  if (typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.addEventListener)
    navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.dorax === 'open-reminders' && UI.session && !UI.drawer) A.reminders(); });
} catch (e) { /* no background script in this frame */ }
