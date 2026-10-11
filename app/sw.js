/* Dorax Finance — the service worker: the small script a browser keeps running for this site so that a notification can be shown while the
   app is closed. It shows the notification the server sent and opens the app when it is tapped; and, because Chrome on Android asks for it before it offers
   "Install app", it listens for requests without touching them.
   It keeps no copy of the app or of anyone's data (no cache): the app always loads from the network, as before. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Chrome on Android offers "Install app" only for a site whose background script listens for requests. This one listens and does nothing with
// them: every request goes to the network exactly as it would without it. No copy of the app, or of anyone's data, is kept.
self.addEventListener('fetch', () => {});

self.addEventListener('push', e => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch (x) { m = { body: e.data ? e.data.text() : '' }; }
  // a browser insists that every push shows something; a message that says nothing still says whose it is
  e.waitUntil(self.registration.showNotification(String(m.title || 'Dorax Finance'), {
    body: String(m.body || ''), icon: 'assets/icons/icon-192.png', badge: 'assets/icons/icon-192.png',
    tag: String(m.tag || 'dorax'), lang: m.lang || undefined, data: { url: typeof m.url === 'string' ? m.url : './' },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  // only ever this site: an address from a message is used only if it is on the app's own origin
  // a reminder opens the bell's panel; a tip just brings the app to the front (owner, 2026-10-10: "the idea is to bring the person back to the app")
  const raw = String((e.notification.data || {}).url || ''), reminder = /[?&]open=reminders\b/.test(raw);
  let url = reminder ? './?open=reminders' : './'; try { const u = new URL(raw || './', self.location.href); if (u.origin === self.location.origin) url = u.href; } catch (x) { /* keep the app's own address */ }
  e.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of open) if ('focus' in c) { if (reminder) c.postMessage({ dorax: 'open-reminders' }); return c.focus(); }
    return self.clients.openWindow(url);
  })());
});
