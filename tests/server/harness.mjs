// Runs the reminders function (supabase/functions/reminders/index.ts) outside Supabase: a stand-in for Deno, for the database and for the
// network, so every path of it can be tried. Prints one JSON object; tests/qc-reminders.js reads it and judges.
import { register } from 'node:module';
import { webcrypto } from 'node:crypto';
import fs from 'node:fs';
const here = new URL('.', import.meta.url);
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, next) { return s.startsWith('npm:@supabase/supabase-js') ? { url: ${JSON.stringify(new URL('supabase-mock.mjs', here).href)}, shortCircuit: true } : next(s, c); }`), import.meta.url);

const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));          // { accounts: { name: document } }
const te = new TextEncoder(), td = new TextDecoder();
const b64u = b => Buffer.from(b).toString('base64url'), unb = s => new Uint8Array(Buffer.from(s, 'base64url'));

// ---- the clock: the function asks what day it is where the people live; the tests decide
let NOW = '2026-10-05T11:00:00Z';
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return new RealDate(NOW).getTime(); } };

// ---- the database
const T = { user_data: [], push_subscriptions: [], reminder_log: [], contact_messages: [], reminder_secrets: [{ key: 'cron', value: 'the-cron-secret' }] }, USERS = {};
const KEYS = { user_data: ['user_id'], push_subscriptions: ['endpoint'], reminder_log: ['user_id', 'key'], reminder_secrets: ['key'], contact_messages: ['id'] };
function query(table) {
  const q = { op: 'select', filters: [], rows: null, single: false, range: null };
  const match = r => q.filters.every(f => f(r));
  const run = () => {
    if (q.op === 'select') { let out = T[table].filter(match); if (q.orderBy) out = out.slice().sort((a, b) => a[q.orderBy] < b[q.orderBy] ? -1 : 1); if (q.range) out = out.slice(q.range[0], q.range[1] + 1); if (q.limit) out = out.slice(0, q.limit); return { data: q.single ? (out[0] || null) : out.map(r => ({ ...r })), error: null }; }
    if (q.op === 'update') { for (const r of T[table]) if (match(r)) Object.assign(r, q.patch); return { data: null, error: null }; }
    if (q.op === 'delete') { T[table] = T[table].filter(r => !match(r)); return { data: null, error: null }; }
    if (q.op === 'upsert') { for (const row of q.rows) { const at = T[table].findIndex(r => KEYS[table].every(k => r[k] === row[k])); if (at < 0) T[table].push({ sent_at: new Date().toISOString(), ...row }); else if (!q.ignore) Object.assign(T[table][at], row); } return { data: null, error: null }; }
  };
  const api = {
    select() { return api; }, eq(k, v) { q.filters.push(r => r[k] === v); return api; }, in(k, vs) { q.filters.push(r => vs.includes(r[k])); return api; }, lt(k, v) { q.filters.push(r => r[k] < v); return api; }, gt(k, v) { q.filters.push(r => r[k] > v); return api; }, gte(k, v) { q.filters.push(r => r[k] != null && r[k] >= v); return api; }, is(k, v) { q.filters.push(r => (r[k] == null ? null : r[k]) === v); return api; },
    update(patch) { q.op = 'update'; q.patch = patch; return api; }, limit(n) { q.limit = n; return api; },
    order(k) { q.orderBy = k; return api; }, range(a, b) { q.range = [a, b]; return api; }, maybeSingle() { q.single = true; return api; },
    delete() { q.op = 'delete'; return api; }, upsert(rows, opt) { q.op = 'upsert'; q.rows = Array.isArray(rows) ? rows : [rows]; q.ignore = !!(opt && opt.ignoreDuplicates); return api; },
    then(ok, no) { try { return Promise.resolve(run()).then(ok, no); } catch (e) { return Promise.reject(e).then(ok, no); } },
  };
  return api;
}
globalThis.__ADMIN__ = { from: query, auth: {
  getUser: async token => { const u = Object.values(USERS).find(x => x.token === token); return u ? { data: { user: { id: u.id, email: u.email } }, error: null } : { data: { user: null }, error: { message: 'bad token' } }; },
  admin: { getUserById: async id => ({ data: { user: USERS[id] ? { id, email: USERS[id].email, email_confirmed_at: USERS[id].confirmed ? '2026-10-01T00:00:00Z' : null } : null }, error: null }) } } };

// ---- devices: real key pairs, so what the function encrypts can be opened here the way a browser would
const DEVICES = {};
async function device(name, host) {
  const pair = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const raw = new Uint8Array(await webcrypto.subtle.exportKey('raw', pair.publicKey)), auth = webcrypto.getRandomValues(new Uint8Array(16));
  const d = { endpoint: `https://${host || 'fcm.googleapis.com'}/fcm/send/${name}`, p256dh: b64u(raw), auth: b64u(auth), pair, raw, authRaw: auth, status: 201 };
  DEVICES[d.endpoint] = d; return d;
}
const hkdf = async (salt, ikm, info, n) => new Uint8Array(await webcrypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, await webcrypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), n * 8));
async function openMessage(d, body) {
  const salt = body.slice(0, 16), idlen = body[20], sender = body.slice(21, 21 + idlen), sealed = body.slice(21 + idlen);
  const their = await webcrypto.subtle.importKey('raw', sender, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await webcrypto.subtle.deriveBits({ name: 'ECDH', public: their }, d.pair.privateKey, 256));
  const ikm = await hkdf(d.authRaw, shared, new Uint8Array([...te.encode('WebPush: info\0'), ...d.raw, ...sender]), 32);
  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16), nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const plain = new Uint8Array(await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, await webcrypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), sealed));
  return JSON.parse(td.decode(plain.slice(0, plain.lastIndexOf(2))));
}

// ---- the network: push services and the email service
const NET = { pushes: [], mails: [], other: [] }, CHAIN = []; let MAIL_STATUS = 200, CHAIN_BREAKS = false;
globalThis.fetch = async (url, opt) => {
  url = String(url);
  // the function handing the next page of accounts to itself: the request arrives the way any other does
  if (url === 'https://example.supabase.co/functions/v1/reminders') { if (CHAIN_BREAKS) { CHAIN.push(Promise.resolve(null)); throw new TypeError('fetch failed'); }
    const r = handler(new Request(url, { method: 'POST', headers: opt.headers, body: opt.body })); CHAIN.push(r.then(x => x.clone().json().then(json => ({ status: x.status, json, asked: JSON.parse(opt.body) })))); return r; }
  if (url === 'https://api.resend.com/emails') { const m = JSON.parse(opt.body); NET.mails.push({ auth: opt.headers.Authorization, from: m.from, to: m.to, subject: m.subject, html: m.html, text: m.text, unsub: (m.headers || {})['List-Unsubscribe'], replyTo: m.reply_to, extra: Object.keys(m).filter(k => !['from', 'to', 'subject', 'html', 'text', 'headers', 'reply_to'].includes(k)) }); return new Response('{}', { status: MAIL_STATUS }); }
  const d = DEVICES[url];
  if (d) { let said = null; try { said = await openMessage(d, new Uint8Array(opt.body)); } catch (e) { said = { unreadable: String(e) }; }
    NET.pushes.push({ to: url.split('/').pop(), said, enc: opt.headers['Content-Encoding'], ttl: opt.headers.TTL, vapid: /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]{87}$/.test(opt.headers.Authorization || '') }); return new Response('', { status: d.status }); }
  NET.other.push(url); return new Response('', { status: 404 });
};

// ---- Deno
const ENV = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key', RESEND_API_KEY: 're_test_key', REMINDERS_PAGE: '2' };     // two accounts a page, so the paging is used
let handler = null; globalThis.Deno = { env: { get: k => ENV[k] }, serve: h => { handler = h; } };
const logs = []; console.log = (...a) => logs.push(a.join(' ')); console.error = (...a) => logs.push('ERR ' + a.join(' '));
await import(new URL('../../supabase/functions/reminders/index.ts', here).href);
const call = async (body, headers = {}, method = 'POST') => { const r = await handler(new Request('https://example.supabase.co/functions/v1/reminders', { method, headers: { 'Content-Type': 'application/json', ...headers }, body: method === 'POST' ? JSON.stringify(body) : undefined })); let json = null; try { json = await r.json(); } catch (e) { /* not json */ } return { status: r.status, json, origin: r.headers.get('access-control-allow-origin') }; };
/** A whole daily run: the first request and every page it hands on, with their counts added up. */
const runAll = async () => { const first = await call({ action: 'run' }, cron), pages = [first];
  for (let i = 0; i < CHAIN.length; i++) { const p = await CHAIN[i]; if (p) pages.push(p); } CHAIN.length = 0;
  const json = { ...first.json }; for (const p of pages.slice(1)) for (const k of ['people', 'told', 'notifications', 'emails', 'problems', 'contact']) json[k] += p.json[k];
  json.more = pages[pages.length - 1].json.more; return { status: first.status, json, pages: pages.length, asked: pages.slice(1).map(p => [p.asked.after.slice(0, 1), p.asked.hop]), statuses: pages.map(p => p.status) }; };
const flush = () => { const out = { pushes: NET.pushes.splice(0), mails: NET.mails.splice(0), other: NET.other.splice(0) }; return out; };
const cron = { 'x-reminders-secret': 'the-cron-secret' };
// tips by notification (2026-10-10) are off for the people of the reminder runs, so those runs count reminders only; part 7 has its own people
const person = (id, email, doc, opt = {}) => { USERS[id] = { id, email, token: 'token-' + id, confirmed: opt.confirmed !== false }; if (doc) { const data = JSON.parse(JSON.stringify(doc)); if (data.user) data.user.notify = { ...(data.user.notify || {}), tips: opt.tips || 'off' }; T.user_data.push({ user_id: id, data }); } };
const OUT = {};

// ---- 1. the public key
OUT.key1 = await call({ action: 'key' }); OUT.key2 = await call({ action: 'key' }); OUT.keyKept = T.reminder_secrets.filter(s => s.key === 'vapid').length;
OUT.keyHasPrivate = !!(T.reminder_secrets.find(s => s.key === 'vapid') || {}).value.privateJwk.d;
OUT.version = await call({ action: 'version' });
OUT.keyLeaks = JSON.stringify(OUT.key1.json).includes((T.reminder_secrets.find(s => s.key === 'vapid') || {}).value.privateJwk.d);

// ---- 2. who may start a run
OUT.runNoSecret = await call({ action: 'run' }); OUT.runWrong = await call({ action: 'run' }, { 'x-reminders-secret': 'the-cron-secreT' });
OUT.get = await call(null, {}, 'GET'); OUT.unknown = await call({ action: 'everything' });
OUT.cors = [(await call(null, { origin: 'https://dorax.app' }, 'OPTIONS')).origin, (await call(null, { origin: 'https://evil.example' }, 'OPTIONS')).origin, (await call({ action: 'key' }, { origin: 'http://localhost:5173' })).origin];

// ---- 3. a day's run
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', D = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', E = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
person(A, 'ana@example.org', input.accounts.pt);                                                      // two devices, email on
person(B, 'bea@example.org', { ...input.accounts.es, user: { ...input.accounts.es.user, channels: { email: false } } });   // nothing switched on
person(C, 'caio@example.org', input.accounts.en, { confirmed: false });                               // one device; email never confirmed
person(D, 'dora@example.org', { broken: true });                                                      // an account that cannot be read
person(E, 'eli@example.org', input.accounts.evil);                                                    // a bill named like a piece of a web page
// a bill whose name is very long and carries a line break, the way somebody trying to add a header to an email would write it
const LONG = JSON.parse(JSON.stringify(input.accounts.en)); { const l = LONG.plan.lines.find(x => x.id === 'pl-alquiler'); l.name = 'Rent\r\nBcc: someone@evil.example ' + 'x'.repeat(5000); delete l.k; }
const F = 'ffffffff-ffff-4fff-8fff-ffffffffffff'; person(F, 'fay@example.org', LONG); const f1 = await device('fay-phone');
T.push_subscriptions.push({ user_id: F, endpoint: f1.endpoint, p256dh: f1.p256dh, auth: f1.auth });
for (const key of ['bill:pl-internet:2026-10|soon', 'card:nu-card:2026-10|soon', 'close:2026-09|soon', 'summary:2026-09|soon']) T.reminder_log.push({ user_id: F, key, sent_at: '2026-10-04T11:00:00Z' });   // so only the rent is new
const a1 = await device('ana-phone'), a2 = await device('ana-laptop', 'updates.push.services.mozilla.com'), c1 = await device('caio-phone', 'web.push.apple.com');
for (const [u, d] of [[A, a1], [A, a2], [C, c1]]) T.push_subscriptions.push({ user_id: u, endpoint: d.endpoint, p256dh: d.p256dh, auth: d.auth });
T.push_subscriptions.push({ user_id: E, endpoint: 'https://internal.example/steal', p256dh: a1.p256dh, auth: a1.auth });   // not a push service
OUT.day1 = await runAll(); OUT.day1net = flush(); OUT.day1log = T.reminder_log.map(l => l.user_id[0] + ':' + l.key).sort(); OUT.day1subs = T.push_subscriptions.map(s => s.endpoint.split('/').pop());
T.user_data = T.user_data.filter(r => r.user_id !== F); T.push_subscriptions = T.push_subscriptions.filter(r => r.user_id !== F); T.reminder_log = T.reminder_log.filter(r => r.user_id !== F);   // the long one has been seen
OUT.day1again = await runAll(); OUT.day1againNet = flush();
// the next week: bills that were coming up are due or late now, so there is something new to say
NOW = '2026-10-12T11:00:00Z'; a2.status = 410;                                                        // the laptop no longer takes messages
OUT.day8 = await runAll(); OUT.day8net = flush(); OUT.day8subs = T.push_subscriptions.map(s => s.endpoint.split('/').pop()).sort();
// the email service is down: what could not be delivered anywhere is not remembered as sent
NOW = '2026-10-15T11:00:00Z'; MAIL_STATUS = 500; T.push_subscriptions = T.push_subscriptions.filter(s => s.user_id !== A); const before = T.reminder_log.filter(l => l.user_id === A).length;
OUT.down = await runAll(); OUT.downNet = flush(); OUT.downKept = T.reminder_log.filter(l => l.user_id === A).length - before;
MAIL_STATUS = 200; OUT.up = await runAll(); OUT.upNet = flush(); OUT.upKept = T.reminder_log.filter(l => l.user_id === A).length - before;
// without a key for the email service: notifications still go, emails are skipped
delete ENV.RESEND_API_KEY; NOW = '2026-11-03T11:00:00Z'; OUT.noKey = await runAll(); OUT.noKeyNet = flush(); ENV.RESEND_API_KEY = 're_test_key';
// old entries are forgotten
T.reminder_log.push({ user_id: A, key: 'bill:old:2026-01|late', sent_at: '2026-05-01T00:00:00Z' }); const mid = await call({ action: 'run' }, cron); OUT.oldKeptMidRun = T.reminder_log.some(l => l.key === 'bill:old:2026-01|late') && mid.json.more; for (const p of CHAIN) await p; CHAIN.length = 0; flush(); OUT.oldGone = !T.reminder_log.some(l => l.key === 'bill:old:2026-01|late');

// the hand-over to the next page fails: this page is done and answered, the others wait for the next run
NOW = '2026-11-05T11:00:00Z'; CHAIN_BREAKS = true; OUT.broken = await runAll(); OUT.brokenNet = flush(); CHAIN_BREAKS = false; await new Promise(r => setTimeout(r, 20));
OUT.mended = await runAll(); OUT.mendedNet = flush();
// a page asked for with a made-up cursor is read as the first page, and still needs the secret
OUT.badCursor = await call({ action: 'run', after: "x' or 1=1 --", hop: -5 }, cron); for (const p of CHAIN) await p; CHAIN.length = 0; flush();
OUT.cursorNoSecret = await call({ action: 'run', after: A, hop: 1 });

// ---- 4. "send me a test"
NOW = '2026-11-03T12:00:00Z';
OUT.testAnon = await call({ action: 'test', channel: 'push' }); OUT.testBad = await call({ action: 'test', channel: 'push' }, { Authorization: 'Bearer nope' });
OUT.testPush = await call({ action: 'test', channel: 'push' }, { Authorization: 'Bearer token-' + C }); OUT.testPushNet = flush();
OUT.testSoon = await call({ action: 'test', channel: 'push' }, { Authorization: 'Bearer token-' + C }); OUT.testSoonNet = flush();
OUT.testMail = await call({ action: 'test', channel: 'email' }, { Authorization: 'Bearer token-' + C }); OUT.testMailNet = flush();
OUT.testMailSoon = await call({ action: 'test', channel: 'email' }, { Authorization: 'Bearer token-' + C }); OUT.testMailSoonNet = flush();
OUT.testNoDevice = await call({ action: 'test', channel: 'push' }, { Authorization: 'Bearer token-' + B });
delete ENV.RESEND_API_KEY; OUT.testMailNoKey = await call({ action: 'test', channel: 'email' }, { Authorization: 'Bearer token-' + B }); ENV.RESEND_API_KEY = 're_test_key';
OUT.testMailAfterNoKey = await call({ action: 'test', channel: 'email' }, { Authorization: 'Bearer token-' + B }); OUT.testMailAfterNoKeyNet = flush();
NOW = '2026-11-03T12:01:00Z'; OUT.testMailMinute = await call({ action: 'test', channel: 'email' }, { Authorization: 'Bearer token-' + C });
OUT.testLater = await call({ action: 'test', channel: 'push' }, { Authorization: 'Bearer token-' + C }); OUT.testLaterNet = flush();
NOW = '2026-11-03T13:02:00Z'; OUT.testMailHour = await call({ action: 'test', channel: 'email' }, { Authorization: 'Bearer token-' + C }); OUT.testMailHourNet = flush();

// ---- 5. the contact form: the owner is emailed
NOW = '2026-11-04T15:00:00Z';
const msg = (n, o = {}) => { const m = { id: `0000000${n}-0000-4000-8000-000000000000`.slice(-36), created_at: NOW, user_id: null, email: `visitor${n}@example.org`, topic: 'question', message: 'A question about my plan, please.', lang: 'pt', handled: false, notified_at: null, ...o }; T.contact_messages.push(m); return m; };
const told = id => (T.contact_messages.find(m => m.id === id) || {}).notified_at;
const m1 = msg(1, { user_id: A, message: 'First line <script>alert(1)</script>\n\nSecond line & more\r\nThird' }), m2 = msg(2, { email: 'not an email\r\nBcc: someone@evil.example' });
OUT.contactNoSecret = await call({ action: 'contact', id: m1.id });
OUT.contactNotSetUp = await call({ action: 'contact', id: m1.id }, cron); OUT.contactNotSetUpNet = flush();
ENV.CONTACT_TO = 'owner@example.org';
OUT.contactBadId = await call({ action: 'contact', id: "1' or '1'='1" }, cron);
OUT.contactUnknown = await call({ action: 'contact', id: '99999999-9999-4999-8999-999999999999' }, cron);
OUT.contact1 = await call({ action: 'contact', id: m1.id }, cron); OUT.contact1Net = flush(); OUT.contact1Told = !!told(m1.id);
OUT.contact1Again = await call({ action: 'contact', id: m1.id }, cron); OUT.contact1AgainNet = flush();
OUT.contact2 = await call({ action: 'contact', id: m2.id }, cron); OUT.contact2Net = flush();
const m6 = msg(6, { email: 'a?bcc=spy@evil.example', lang: 'es' }), m7 = msg(7, { email: 'Ana.Souza+dorax@mail.example.com.br', lang: 'en', message: 'x'.repeat(3000) });
OUT.contact6 = await call({ action: 'contact', id: m6.id }, cron); OUT.contact6Net = flush(); OUT.contact7 = await call({ action: 'contact', id: m7.id }, cron); OUT.contact7Net = flush();
// the email service is down: the message stays "not told" and the morning's summary picks it up
const m3 = msg(3); MAIL_STATUS = 500; OUT.contactDown = await call({ action: 'contact', id: m3.id }, cron); flush(); MAIL_STATUS = 200; OUT.contactDownTold = !!told(m3.id);
// a flood: after 20 emails in a day the rest wait
for (let i = 10; i < 26; i++) msg(i, { notified_at: '2026-11-04T14:00:00Z' });
const m4 = msg(4); OUT.contactHeld = await call({ action: 'contact', id: m4.id }, cron); OUT.contactHeldNet = flush(); OUT.contactHeldTold = !!told(m4.id);
const m5 = msg(5, { created_at: '2026-11-05T10:55:00Z' });       // written five minutes before the run: its own email may still be on the way
NOW = '2026-11-06T11:00:00Z'; m5.created_at = '2026-11-06T10:55:00Z';
OUT.contactRun = await runAll(); OUT.contactRunNet = flush(); OUT.contactRunTold = [!!told(m3.id), !!told(m4.id), !!told(m5.id)];
OUT.contactRunAgain = await runAll(); OUT.contactRunAgainNet = flush();
delete ENV.CONTACT_TO; NOW = '2026-11-07T11:00:00Z'; OUT.contactRunNobody = await runAll(); OUT.contactRunNobodyNet = flush(); OUT.contactStillWaiting = !told(m5.id);
// ---- 7. tips by notification (owner, 2026-10-10: "notify about curiosities, tips, advice, to help and motivate"; then: "not at 8:00: any time from 8 in
// the morning to 11 at night, any day, with the app closed"). Their own schedule calls { action: 'tips' } every 15 minutes.
const logic = await import(new URL('../../supabase/functions/reminders/logic.mjs', here).href);
const G = '99999999-9999-4999-8999-999999999999', H = '88888888-8888-4888-8888-888888888888', I = '77777777-7777-4777-8777-777777777777';
const quiet = doc => { const d = JSON.parse(JSON.stringify(doc)); d.user.notify = { bills: false, close: false, summary: false, goals: false, pay: false, journey: false }; return d; };
person(G, 'gil@example.org', quiet(input.accounts.es), { tips: 'three' });      // nothing to be reminded of, tips up to three a week
person(H, 'hana@example.org', input.accounts.pt, { tips: 'daily' });            // reminders on, and tips every day
person(I, 'ivo@example.org', quiet(input.accounts.en), { tips: 'three' });      // tips on, but no device: a tip goes by notification only
const g1 = await device('gil-phone', 'web.push.apple.com'), h1 = await device('hana-phone');
for (const [u, d] of [[G, g1], [H, h1]]) T.push_subscriptions.push({ user_id: u, endpoint: d.endpoint, p256dh: d.p256dh, auth: d.auth });
const mine = (net, who) => net.pushes.filter(p => p.to === who).map(p => p.said), gLog = () => T.reminder_log.filter(l => l.user_id === G).map(l => l.key).sort();
const at = (day, minute) => new Date(Date.parse(day + 'T00:00:00Z') + (minute + 180) * 60000).toISOString();      // a time in Brasília (UTC-3), as the clock sees it
const tipsAt = async (day, minute) => { NOW = at(day, minute); const r = await call({ action: 'tips' }, cron); const n = flush(); return { status: r.status, json: r.json, g: mine(n, 'gil-phone'), h: mine(n, 'hana-phone'), mails: n.mails.length }; };
const slot = day => logic.tipSlot(G, day), late = day => Math.max(slot(day), logic.tipSlot(H, day));
OUT.tipSlots = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'].map(d => [logic.tipSlot(G, d), logic.tipSlot(H, d), logic.tipSlot(I, d)]);
OUT.tipNoSecret = (await call({ action: 'tips' })).status;
OUT.tipNight = await tipsAt('2026-11-09', 7 * 60 + 45);                                   // 7:45: before the day's window
OUT.tipLate = await tipsAt('2026-11-09', 23 * 60 + 15);                                   // 23:15: after it (the evening before the day's first tip)
NOW = '2026-11-09T11:00:00Z'; await runAll(); { const n = flush(); OUT.tipRemindH = mine(n, 'hana-phone').length; }      // 8:00: the reminders' own run
OUT.tipEarly = slot('2026-11-09') > 8 * 60 + 30 ? await tipsAt('2026-11-09', slot('2026-11-09') - 15) : null;      // a quarter of an hour before Gil's time
OUT.tip1 = await tipsAt('2026-11-09', late('2026-11-09'));                                // both times have come
OUT.tip1log = gLog(); OUT.tip1ivo = T.reminder_log.filter(l => l.user_id === I).length;
OUT.tip1again = await tipsAt('2026-11-09', Math.min(22 * 60 + 45, late('2026-11-09') + 15));   // the next quarter: not twice a day
OUT.tip2 = await tipsAt('2026-11-10', 22 * 60 + 45);                                      // the next day: too soon for "three a week"
OUT.tip3 = await tipsAt('2026-11-11', 22 * 60 + 45);                                      // two days on: the next one, of the next kind
g1.status = 500; OUT.tipDown = await tipsAt('2026-11-13', 22 * 60 + 45); OUT.tipDownKept = gLog().includes('tip|2026-11-13'); g1.status = 201;   // not delivered: not counted
OUT.tip5 = await tipsAt('2026-11-14', 22 * 60 + 45);
T.user_data.find(x => x.user_id === G).data.user.notify.tips = 'off';
OUT.tipOff = await tipsAt('2026-11-17', 22 * 60 + 45);
OUT.logs = logs;
OUT.logsLeak = logs.some(l => /@example\.org|fcm\.googleapis|Aluguel|Internet|re_test_key|the-cron-secret|question about|First line/.test(l));
process.stdout.write(JSON.stringify(OUT));
