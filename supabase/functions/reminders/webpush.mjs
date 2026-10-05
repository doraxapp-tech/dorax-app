/* Dorax Finance — sending a notification to a phone or a computer (Web Push).
   The browsers' push services (Google's for Chrome and Android, Apple's for Safari and iPhone, Mozilla's for Firefox) accept a message only if:
   1. it is ENCRYPTED for that one device, with the key the device gave when the person switched notifications on (RFC 8291, "aes128gcm"),
      so the push service itself cannot read it; and
   2. it is SIGNED by the sender, with a key pair made once for this app (RFC 8292, "VAPID"), so nobody else can send in the app's name.
   Both are done here with the cryptography that is built into the runtime (Web Crypto): no library to install, and the same file runs on the
   server (Deno) and in the tests (Node). tests/qc-reminders.js checks the encryption against the example published in the standard. */

const te = new TextEncoder();
export const b64u = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const unb64u = s => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const join = (...parts) => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let at = 0; for (const p of parts) { out.set(p, at); at += p.length; } return out; };

/** A public key as the 65 bytes browsers use (04 || x || y), and back to what Web Crypto imports. */
const jwkOfPublic = raw => ({ kty: 'EC', crv: 'P-256', x: b64u(raw.slice(1, 33)), y: b64u(raw.slice(33, 65)), ext: true });
const rawOfJwk = jwk => join(Uint8Array.of(4), unb64u(jwk.x), unb64u(jwk.y));

/** The app's signing keys, made once and kept on the server. publicKey is what browsers are given when a person switches notifications on. */
export async function generateVapidKeys() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  return { publicKey: b64u(rawOfJwk(privateJwk)), privateJwk: { kty: 'EC', crv: 'P-256', x: privateJwk.x, y: privateJwk.y, d: privateJwk.d } };
}

/** The signed pass a push service asks for: who sends (subject, a mailto: or https: address it can write to), to which service, valid for 12 hours. */
export async function vapidAuthorization(endpoint, subject, keys, now = Date.now()) {
  const head = b64u(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(te.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject })));
  const key = await crypto.subtle.importKey('jwk', { ...keys.privateJwk, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(head + '.' + claims));
  return `vapid t=${head}.${claims}.${b64u(sig)}, k=${keys.publicKey}`;
}

const hkdf = async (salt, ikm, info, bytes) => new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), bytes * 8));

/** Encrypts a message for one device. p256dh and auth are the two values of the device's subscription.
    fixed: only for the tests ({ salt, privateJwk } of the standard's example); in use, a new salt and a new key pair are made for every message. */
export async function encryptForDevice(message, p256dh, auth, fixed) {
  const uaPublic = unb64u(p256dh), authSecret = unb64u(auth), plain = typeof message === 'string' ? te.encode(message) : message;
  if (uaPublic.length !== 65 || uaPublic[0] !== 4 || authSecret.length < 16) throw new Error('not a push subscription key');
  const salt = fixed ? fixed.salt : crypto.getRandomValues(new Uint8Array(16));
  const local = fixed ? { privateKey: await crypto.subtle.importKey('jwk', { ...fixed.privateJwk, ext: true }, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']), raw: rawOfJwk(fixed.privateJwk) }
    : await (async () => { const p = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']); return { privateKey: p.privateKey, raw: new Uint8Array(await crypto.subtle.exportKey('raw', p.publicKey)) }; })();
  const theirs = await crypto.subtle.importKey('jwk', jwkOfPublic(uaPublic), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: theirs }, local.privateKey, 256));
  // the key both ends can work out and nobody in between can (RFC 8291, section 3.4), then the key and the nonce of this one message (RFC 8188)
  const ikm = await hkdf(authSecret, shared, join(te.encode('WebPush: info\0'), uaPublic, local.raw), 32);
  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16), nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']), join(plain, Uint8Array.of(2))));
  // header: salt, record size (4096), length of the key, the sender's one-message public key; then the sealed message
  return join(salt, Uint8Array.of(0, 0, 16, 0), Uint8Array.of(local.raw.length), local.raw, sealed);
}

/** The address in a subscription comes from a browser, so from outside. The server only ever sends to the push services browsers really use
    (Google, Apple, Mozilla, Microsoft): an address that points anywhere else is somebody trying to make the server call a place of their choosing. */
export const isPushService = host => /(^|\.)(fcm\.googleapis\.com|push\.apple\.com|push\.services\.mozilla\.com|notify\.windows\.com)$/i.test(host);

/** Sends one notification to one device. subscription: { endpoint, p256dh, auth }. payload: a string (the service worker reads it as JSON).
    Returns { ok, status, gone }: gone means the device no longer accepts messages (notifications switched off, app removed) and the
    subscription should be forgotten. Only https addresses of known push services are called; anything else is refused before a request is made. */
export async function sendPush(subscription, payload, vapid, opt = {}) {
  let url; try { url = new URL(subscription.endpoint); } catch (e) { return { ok: false, status: 0, gone: true }; }
  if (url.protocol !== 'https:' || !isPushService(url.hostname)) return { ok: false, status: 0, gone: true };
  // a push service takes about 4000 bytes; a longer message is the sender's mistake, not a device that is gone
  if (te.encode(String(payload)).length > 3800) return { ok: false, status: 0, gone: false };
  let body; try { body = await encryptForDevice(payload, subscription.p256dh, subscription.auth); } catch (e) { return { ok: false, status: 0, gone: true }; }     // keys that are not a device's: forget it
  const headers = { Authorization: await vapidAuthorization(subscription.endpoint, vapid.subject, vapid), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: String(opt.ttl || 24 * 3600), Urgency: opt.urgency || 'normal' };
  if (opt.topic) headers.Topic = opt.topic;
  try {
    const r = await (opt.fetch || fetch)(subscription.endpoint, { method: 'POST', headers, body });
    return { ok: r.status >= 200 && r.status < 300, status: r.status, gone: r.status === 404 || r.status === 410 };
  } catch (e) { return { ok: false, status: 0, gone: false }; }
}

/** Everything above, for the version the function reports (see versionOf in logic.mjs). */
export const PARTS = [b64u, unb64u, join, jwkOfPublic, rawOfJwk, generateVapidKeys, vapidAuthorization, hkdf, encryptForDevice, isPushService, sendPush];
