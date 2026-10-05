/* Dorax Finance — the service worker: the small script a browser keeps running for this site so that a notification can be shown while the
   app is closed. It does two things and nothing else: show the notification the server sent, and open the app when it is tapped.
   It keeps no copy of the app or of anyone's data (no cache): the app always loads from the network, as before. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

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
  let url = './'; try { const u = new URL((e.notification.data || {}).url || './', self.location.href); if (u.origin === self.location.origin) url = u.href; } catch (x) { /* keep the app's own address */ }
  e.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of open) if ('focus' in c) { c.postMessage({ dorax: 'open-reminders' }); return c.focus(); }
    return self.clients.openWindow(url);
  })());
});
