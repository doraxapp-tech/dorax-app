// Dorax Finance — the server's side of reminders (a Supabase Edge Function named "reminders").
//
// It answers five requests, told apart by "action" in the body:
//   key      anyone                the app's public push key, which a browser needs to switch notifications on. Made here on first use.
//   version  anyone                a short name for the exact code that is running, to check a deploy (node tools/build-functions.js --version).
//   test     a logged-in person    sends that person a test: a notification to their devices (channel "push") or an email (channel "email").
//   run      the daily schedule    looks at every account and tells each person what is NEW for them today, by notification and by email.
//   tips     a schedule every 15'  between 8:00 and 23:00 (Brasília): the people whose time for a tip has come today get one by notification,
//                                  as often as they chose, at a different time each day (logic.mjs: tipFor, tipSlot; supabase/tips-schedule.sql).
//   contact  the database          a message came in through the contact form: emails it to the owner (the address in CONTACT_TO).
//
// What is where:
//   engine.mjs   GENERATED from the app's own files (tools/build-functions.js): the rules of what is due, and the words used to say it.
//   logic.mjs    what one person is told today; what day "today" is.
//   webpush.mjs  encrypting and signing a notification for a browser's push service.
//   email.mjs    the reminder email's page.
//
// Secrets. The push signing key and the secret the schedule presents are made on the server and kept in the table reminder_secrets, which
// only the server can read. The key of the email service is the one thing a person sets by hand: Supabase > Edge Functions > Secrets,
// name RESEND_API_KEY. Without it, emails are skipped and everything else works. CONTACT_TO, set in the same place, is the address that
// gets the contact-form messages; without it they wait in the table contact_messages as before.
//
// What is never written to the logs: what a reminder says, an email address, a device's address. Only counts (and, for a push service, its
// name and its answer, with the kind of device as its browser named it), and the id of an account
// that could not be read.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { messageFor, tipFor, tipSlot, minuteIn, TIP_FROM, TIP_UNTIL, testTexts, todayIn, sameSecret, versionOf, PARTS as LOGIC } from './logic.mjs';
import { sendPush, generateVapidKeys, PARTS as WEBPUSH } from './webpush.mjs';
import { reminderEmail, PARTS as EMAIL } from './email.mjs';

const env = (name: string, otherwise: string) => Deno.env.get(name) || otherwise;
const SITE = env('SITE_URL', 'https://dorax.app').replace(/\/$/, '');
const TZ = env('REMINDERS_TZ', 'America/Sao_Paulo');                           // "today" is the day there
const FROM = env('REMINDERS_FROM', 'Dorax Finance <no-reply@mail.dorax.app>');
const CONTACT = env('REMINDERS_CONTACT', 'mailto:no-reply@mail.dorax.app');   // whom a push service may write to about our messages
const PAGE = Math.max(1, Math.min(50, Number(env('REMINDERS_PAGE', '10')) || 10));   // accounts per request: an account can be megabytes
const CONTACT_A_DAY = 20;        // contact emails to the owner in 24 hours; past that, messages wait for the morning's summary
const ORIGINS = [SITE, 'https://dorax-finance.vercel.app', 'http://localhost:5173'];

const cors = (req: Request) => {
  const origin = req.headers.get('origin') || '';
  return { 'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : SITE, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
};
const answer = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
/** Words that came out of a person's account, made safe to send on: no control characters, and no longer than n. */
const clip = (s: unknown, n: number, oneLine = false) => { const x = String(s ?? '').replace(oneLine ? /[\u0000-\u001f\u007f]+/g : /[\u0000-\u0009\u000b-\u001f\u007f]+/g, ' '); return x.length > n ? x.slice(0, n - 1) + '…' : x; };

// deno-lint-ignore no-explicit-any
type Any = any;
let keysKept: Any = null;
/** The app's push keys: read from the server's own table, made the first time they are asked for. */
async function pushKeys(admin: Any) {
  if (keysKept) return keysKept;
  let { data } = await admin.from('reminder_secrets').select('value').eq('key', 'vapid').maybeSingle();
  if (!data) {
    await admin.from('reminder_secrets').upsert({ key: 'vapid', value: await generateVapidKeys() }, { onConflict: 'key', ignoreDuplicates: true });
    ({ data } = await admin.from('reminder_secrets').select('value').eq('key', 'vapid').maybeSingle());
  }
  if (!data) throw new Error('push keys could not be kept');
  keysKept = { ...data.value, subject: CONTACT };
  return keysKept;
}

/** The person a request comes from, as the login service confirms it (never as the request claims). */
async function whoAsks(req: Request, admin: Any) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error || !data || !data.user ? null : data.user;
}

/** extra: what else the email service is told. A reminder says how to stop reminders; a contact message says whom a reply goes to. */
async function sendEmail(to: string, subject: string, mail: { html: string; text: string }, extra: Record<string, unknown> = { headers: { 'List-Unsubscribe': `<${SITE}/#profile>` } }) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return { ok: false, reason: 'no_key' };
  try {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, html: mail.html, text: mail.text, ...extra }) });
    return { ok: r.ok, reason: r.ok ? '' : 'refused_' + r.status };
  } catch (_e) { return { ok: false, reason: 'unreachable' }; }
}

/** The push service a device's address belongs to, for the logs and the test's answer (never the address itself). */
const serviceOf = (endpoint: string) => { try { const h = new URL(endpoint).hostname; return /apple\.com$/.test(h) ? 'apple' : /googleapis\.com$/.test(h) ? 'google' : /mozilla\.com$/.test(h) ? 'mozilla' : /windows\.com$/.test(h) ? 'microsoft' : 'other'; } catch (_e) { return 'other'; } };
/** One notification to every device of one person. Devices that no longer take messages are forgotten. Each device's outcome is kept:
    which kind of device (as the browser named it when it was switched on), which push service, and what that service answered. */
async function pushTo(admin: Any, devices: Any[], payload: { title: string; body: string; [k: string]: unknown }) {
  const keys = await pushKeys(admin); let sent = 0, failed = 0; const results: Any[] = [];
  const message = JSON.stringify({ ...payload, title: clip(payload.title, 120, true), body: clip(payload.body, 600) });
  for (const d of devices) {
    const r = await sendPush(d, message, keys, { ttl: 20 * 3600 });
    results.push({ agent: clip(d.agent || '', 40, true), service: serviceOf(d.endpoint), status: r.status, ok: r.ok, gone: !!r.gone });
    if (r.ok) sent++;
    else if (r.gone) await admin.from('push_subscriptions').delete().eq('endpoint', d.endpoint);
    else failed++;
  }
  return { sent, failed, results };
}

/** "Send me a test". A refusal the app should explain comes back as { ok: false, code } with status 200, so the app can read the code.
    delay (seconds, notifications only, at most 30): the answer comes at once and the notification follows, so the person can close Dorax and see one
    arrive with the app closed (owner, 2026-10-10: "I still get no notification at all on the phone with the web app closed"). */
async function test(req: Request, admin: Any, channel: string, delay = 0) {
  const user = await whoAsks(req, admin);
  if (!user) return answer(req, { ok: false, code: 'not_logged_in' }, 401);
  // a button, not a way to flood an inbox or use up the email service: one test notification every 20 seconds, one test email an hour
  const key = 'test|' + channel, { data: last } = await admin.from('reminder_log').select('sent_at').eq('user_id', user.id).eq('key', key).maybeSingle();
  if (last && Date.now() - new Date(last.sent_at).getTime() < (channel === 'email' ? 3600e3 : 20e3)) return answer(req, { ok: false, code: 'too_soon' });
  const { data: row } = await admin.from('user_data').select('data').eq('user_id', user.id).maybeSingle();
  if (!row) return answer(req, { ok: false, code: 'no_account' });
  const { texts, lang } = testTexts(row.data, todayIn(TZ));
  const done = () => admin.from('reminder_log').upsert({ user_id: user.id, key, sent_at: new Date().toISOString() }, { onConflict: 'user_id,key' });
  if (channel === 'email') {
    if (!user.email) return answer(req, { ok: false, code: 'no_email' });
    const r = await sendEmail(user.email, texts.testMailSubject, reminderEmail({ title: texts.testMailSubject, lines: [texts.testMailLine], texts, site: SITE, lang }));
    if (r.ok) await done();
    return answer(req, { ok: r.ok, code: r.ok ? '' : r.reason });
  }
  const { data: devices } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth, agent').eq('user_id', user.id);
  if (!devices || !devices.length) return answer(req, { ok: false, code: 'no_device' });
  const send = async () => {
    const r = await pushTo(admin, devices, { title: texts.testTitle, body: texts.testBody, url: SITE + '/', tag: 'dorax-test', lang });
    if (r.sent) await done();
    console.log('reminders: test', JSON.stringify({ delay, results: r.results.map((x: Any) => ({ agent: x.agent, service: x.service, status: x.status })) }));
    return r;
  };
  const wait = Math.max(0, Math.min(30, Math.round(Number(delay) || 0)));
  if (wait) {      // the answer now; the notification after the wait, kept alive by the runtime once the answer has gone
    await done();      // counts as the test of the next 20 seconds, so it is not pressed twice in a row
    const later = new Promise(res => setTimeout(res, wait * 1000)).then(send).catch((e: Any) => console.log('reminders: test later failed', String(e)));
    const rt = (globalThis as Any).EdgeRuntime; if (rt && typeof rt.waitUntil === 'function') rt.waitUntil(later); else await later;
    return answer(req, { ok: true, code: '', devices: devices.length, delayed: wait, results: [] });
  }
  const r = await send();
  // what each device's push service answered, so the person can see which phone or computer was reached (and the logs say it, without addresses: send)
  return answer(req, { ok: r.sent > 0, code: r.sent > 0 ? '' : 'not_delivered', devices: devices.length, sent: r.sent, results: r.results });
}

/** The secret the database presents (the daily schedule, the contact form's trigger), when the request carries it; otherwise null. */
async function fromDatabase(req: Request, admin: Any) {
  const { data: secret } = await admin.from('reminder_secrets').select('value').eq('key', 'cron').maybeSingle();
  return secret && sameSecret(req.headers.get('x-reminders-secret'), secret.value) ? String(secret.value) : null;
}

// ---- the contact form: the owner hears about a message by email, and answers by replying to it
const contactTo = () => (Deno.env.get('CONTACT_TO') || '').trim();
// Strict on purpose: only the plain shape of an address (letters, digits, dot, dash, plus, underscore). Anything else is shown as text and
// gets no reply button, so what is typed into the form's email field can never become part of a link or a header.
const looksLikeEmail = (s: unknown) => typeof s === 'string' && s.length <= 254 && /^[A-Za-z0-9._+-]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(s);
const tableLink = () => `https://supabase.com/dashboard/project/${new URL(Deno.env.get('SUPABASE_URL')!).hostname.split('.')[0]}/editor`;
const SEE_ALL = () => ({ text: 'See all messages in Supabase', link: tableLink() });
const CONTACT_TEXTS = { open: 'Open the messages in Supabase',
  why: 'You get this email because someone used the contact form of Dorax Finance. In the table contact_messages, tick "handled" when a message is answered.' };
/** A new email to the person who wrote, started for the owner: their address, a subject in their language, their message quoted below.
    The address goes in encoded, so nothing typed into the form's email field can add a second recipient or a field of its own. */
const RE = { pt: 'Re: sua mensagem para o Dorax Finance', es: 'Re: tu mensaje a Dorax Finance', en: 'Re: your message to Dorax Finance' } as Record<string, string>;
const replyLink = (m: Any) => `mailto:${encodeURIComponent(m.email).replace(/%40/g, '@')}?subject=${encodeURIComponent(RE[m.lang] || RE.pt)}&body=${encodeURIComponent('\n\n' + clip(m.message, 600).split(/\r?\n/).map(l => '> ' + l).join('\n'))}`;

/** One message, as soon as it is written. The database calls this (a trigger on contact_messages) with the id of the new row. */
async function contact(req: Request, admin: Any, body: Any) {
  if (!await fromDatabase(req, admin)) return answer(req, { ok: false, code: 'not_allowed' }, 403);
  const to = contactTo();
  if (!looksLikeEmail(to) || !Deno.env.get('RESEND_API_KEY')) return answer(req, { ok: false, code: 'not_set_up' });
  const id = typeof body.id === 'string' && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : null;
  if (!id) return answer(req, { ok: false, code: 'no_message' }, 400);
  const { data: m } = await admin.from('contact_messages').select('id, created_at, user_id, email, topic, message, lang').eq('id', id).is('notified_at', null).maybeSingle();
  if (!m) return answer(req, { ok: true, sent: 0 });
  // the form is open to anyone: a flood of messages must not use up the email service that also sends the sign-up emails
  const { data: recent } = await admin.from('contact_messages').select('id').gte('notified_at', new Date(Date.now() - 864e5).toISOString()).limit(CONTACT_A_DAY);
  if ((recent || []).length >= CONTACT_A_DAY) return answer(req, { ok: true, sent: 0, held: true });
  const from = clip(m.email, 254, true), subject = clip(`Dorax contact (${m.topic}): ${from}`, 150, true);
  const lines = [`From: ${from}${m.user_id ? ' (has an account)' : ''}`, `Topic: ${clip(m.topic, 40, true)} · Language: ${clip(m.lang || 'not given', 12, true)} · ${todayIn(TZ, new Date(m.created_at))}`,
    ...String(m.message || '').split(/\r?\n/).map(l => clip(l, 600, true).trim()).filter(Boolean).slice(0, 60)];
  // the button answers the person; when what they typed is not an address there is nobody to answer, and the email says so
  const can = looksLikeEmail(m.email);
  const mail = can ? reminderEmail({ title: 'New message from the contact form', lines, site: SITE, lang: 'en', link: replyLink(m), more: SEE_ALL(),
      texts: { open: `Reply to ${from}`, why: `The button starts an email to ${from}. Replying to this email does the same. You get it because someone used the contact form of Dorax Finance.` } })
    : reminderEmail({ title: 'New message from the contact form', lines: [...lines, 'The address they gave does not look like an email address, so there is no reply button.'], site: SITE, lang: 'en', more: SEE_ALL(),
      texts: { open: '', why: 'You get this email because someone used the contact form of Dorax Finance.' } });
  const r = await sendEmail(to, subject, mail, can ? { reply_to: m.email } : {});
  if (r.ok) await admin.from('contact_messages').update({ notified_at: new Date().toISOString() }).eq('id', id);
  return answer(req, { ok: r.ok, sent: r.ok ? 1 : 0, code: r.ok ? '' : r.reason });
}

/** The messages nobody was emailed about, in one summary. Called once a day, at the end of the run. Returns how many it covered. */
async function contactWaiting(admin: Any) {
  const to = contactTo();
  if (!looksLikeEmail(to) || !Deno.env.get('RESEND_API_KEY')) return 0;
  const { data: rows } = await admin.from('contact_messages').select('id, created_at, email, topic, message').is('notified_at', null).lt('created_at', new Date(Date.now() - 600e3).toISOString()).order('created_at').limit(200);
  if (!rows || !rows.length) return 0;
  const lines = rows.slice(0, 10).map((m: Any) => `${clip(m.email, 80, true)} · ${clip(m.topic, 20, true)}: ${clip(m.message, 200, true)}`);
  if (rows.length > 10) lines.push(`And ${rows.length - 10} more, in the table.`);
  const title = rows.length === 1 ? '1 contact message is waiting' : `${rows.length} contact messages are waiting`;
  const r = await sendEmail(to, title, reminderEmail({ title, lines, texts: { ...CONTACT_TEXTS, why: 'You get this email because these messages came in through the contact form of Dorax Finance and no email about them reached you when they were written. The addresses to answer are in the lines above and in the table contact_messages.' }, site: SITE, link: tableLink(), lang: 'en' }), {});
  if (!r.ok) return 0;
  await admin.from('contact_messages').update({ notified_at: new Date().toISOString() }).in('id', rows.map((m: Any) => m.id));
  return rows.length;
}

/** The daily run, a page of accounts at a time: when a page is full, the function calls itself for the accounts after it, so that no single
    request has to hold every account in memory or finish them all in its own time. */
async function run(req: Request, admin: Any, body: Any) {
  const secret = await fromDatabase(req, admin);
  if (!secret) return answer(req, { ok: false, code: 'not_allowed' }, 403);
  const after = typeof body.after === 'string' && /^[0-9a-f-]{36}$/i.test(body.after) ? body.after : null, hop = Math.max(0, Math.min(5000, Math.floor(Number(body.hop) || 0)));
  const today = todayIn(TZ), out = { ok: true, day: today, people: 0, told: 0, notifications: 0, emails: 0, problems: 0, contact: 0, more: false };
  let q = admin.from('user_data').select('user_id, data').order('user_id').limit(PAGE); if (after) q = q.gt('user_id', after);
  const { data: rows, error } = await q;
  if (error || !rows) { console.error('reminders: accounts could not be read'); return answer(req, { ...out, ok: false, code: 'cannot_read_accounts' }, 500); }
  const ids = rows.map((r: Any) => r.user_id);
  const { data: logs } = ids.length ? await admin.from('reminder_log').select('user_id, key').in('user_id', ids) : { data: [] };
  const { data: subs } = ids.length ? await admin.from('push_subscriptions').select('user_id, endpoint, p256dh, auth, agent').in('user_id', ids) : { data: [] };
  const answers: Record<string, number> = {};      // what the push services answered, counted by service and status: "apple 201", "google 410"…
  for (const row of rows) {
    out.people++;
    try {
      const sent = new Set<string>((logs || []).filter((l: Any) => l.user_id === row.user_id).map((l: Any) => l.key));
      const msg = messageFor(row.data, today, sent);
      if (!msg) continue;
      let reached = false;
      const devices = (subs || []).filter((s: Any) => s.user_id === row.user_id);
      if (devices.length) {
        const r = await pushTo(admin, devices, { title: msg.push.title, body: msg.push.body, url: SITE + '/?open=reminders', tag: 'dorax-' + today, lang: msg.lang });
        out.notifications += r.sent; out.problems += r.failed; reached = reached || r.sent > 0;
        for (const x of r.results) answers[x.service + ' ' + x.status] = (answers[x.service + ' ' + x.status] || 0) + 1;
      }
      if (msg.emailOn && Deno.env.get('RESEND_API_KEY')) {
        const { data: u } = await admin.auth.admin.getUserById(row.user_id);
        const person = u && u.user;
        if (person && person.email && person.email_confirmed_at) {
          const subject = clip(msg.subject, 150, true), lines = msg.lines.slice(0, 40).map((l: string) => clip(l, 300, true));
          const r = await sendEmail(person.email, subject, reminderEmail({ title: subject, lines, texts: msg.texts, site: SITE, link: SITE + '/?open=reminders', lang: msg.lang }));
          if (r.ok) { out.emails++; reached = true; } else out.problems++;
        }
      }
      // remembered only when it reached the person somewhere: what could not be delivered is tried again tomorrow
      if (reached) { out.told++; await admin.from('reminder_log').upsert(msg.keys.slice(0, 200).map((key: string) => ({ user_id: row.user_id, key: clip(key, 200, true) })), { onConflict: 'user_id,key', ignoreDuplicates: true }); }
    } catch (e) { out.problems++; console.error('reminders: account', row.user_id, 'could not be read:', e instanceof Error ? e.name : 'error'); }
  }
  if (rows.length === PAGE && hop < 5000) {
    // more accounts may follow: hand them to the next request, and do not wait for its answer longer than this one lives
    out.more = true;
    const next = fetch(Deno.env.get('SUPABASE_URL') + '/functions/v1/reminders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-reminders-secret': secret },
      body: JSON.stringify({ action: 'run', after: rows[rows.length - 1].user_id, hop: hop + 1 }) }).then(r => { if (!r.ok) console.error('reminders: the next page was refused:', r.status); }, () => console.error('reminders: the next page could not be started'));
    const rt = (globalThis as Any).EdgeRuntime; if (rt && typeof rt.waitUntil === 'function') rt.waitUntil(next);
  } else {
    // the last page. A key names its month, so after four months it can never matter again
    await admin.from('reminder_log').delete().lt('sent_at', new Date(Date.now() - 120 * 864e5).toISOString());
    // and the contact-form messages the owner was not emailed about (the day's limit, or the email service was down): one summary
    try { out.contact = await contactWaiting(admin); } catch (_e) { out.problems++; }
  }
  console.log('reminders:', JSON.stringify({ ...out, page: hop, answers }));
  return answer(req, out);
}

/** Tips by notification, between 8:00 and 23:00 (owner, 2026-10-10: "the notifications need not be at 8:00, any time from 8 in the morning to 11 at
    night, any day; with the app closed, of course: the idea is to bring the person back to the app"). The schedule calls this every 15 minutes.
    Each person has a time of their own for each day (tipSlot: from the id and the date, so it changes every day and nobody has to remember it);
    once that time has come, and while no tip and no reminder reached them today, today's tip goes, if their rhythm says today is a day for one.
    Only people with a device are looked at, and only their accounts are read. */
async function tips(req: Request, admin: Any) {
  if (!await fromDatabase(req, admin)) return answer(req, { ok: false, code: 'not_allowed' }, 403);
  const now = new Date(), today = todayIn(TZ, now), minute = minuteIn(TZ, now);
  const out = { ok: true, day: today, minute, waiting: 0, tips: 0, notifications: 0, problems: 0, quiet: false };
  if (minute < TIP_FROM || minute >= TIP_UNTIL) { out.quiet = true; return answer(req, out); }      // the night: nothing
  const { data: subs } = await admin.from('push_subscriptions').select('user_id, endpoint, p256dh, auth, agent');
  const ids = [...new Set((subs || []).map((s: Any) => s.user_id))].filter((id: Any) => tipSlot(String(id), today) <= minute) as string[];
  if (!ids.length) return answer(req, out);
  const { data: logs } = await admin.from('reminder_log').select('user_id, key, sent_at').in('user_id', ids);
  const mine = (id: string) => (logs || []).filter((l: Any) => l.user_id === id);
  // one a day at most: not when a tip already went today, nor on a day a reminder went (a test does not count)
  const waiting = ids.filter(id => !mine(id).some((l: Any) => l.key === 'tip|' + today || (!/^(tip|test)/.test(l.key) && todayIn(TZ, new Date(l.sent_at)) === today)));
  out.waiting = waiting.length;
  const answers: Record<string, number> = {};
  for (let i = 0; i < waiting.length; i += PAGE) {
    const { data: rows } = await admin.from('user_data').select('user_id, data').in('user_id', waiting.slice(i, i + PAGE));
    for (const row of rows || []) {
      try {
        const tip = tipFor(row.data, today, new Set<string>(mine(row.user_id).map((l: Any) => l.key)), false);
        if (!tip) continue;
        const r = await pushTo(admin, (subs || []).filter((s: Any) => s.user_id === row.user_id), { title: tip.push.title, body: tip.push.body, url: SITE + '/', tag: 'dorax-tip-' + today, lang: tip.lang });
        out.notifications += r.sent; out.problems += r.failed;
        for (const x of r.results) answers[x.service + ' ' + x.status] = (answers[x.service + ' ' + x.status] || 0) + 1;
        // remembered once it reached a device, so the rhythm the person chose counts what they actually got
        if (r.sent) { out.tips++; await admin.from('reminder_log').upsert(tip.keys.map((key: string) => ({ user_id: row.user_id, key: clip(key, 200, true) })), { onConflict: 'user_id,key', ignoreDuplicates: true }); }
      } catch (_e) { out.problems++; console.error('reminders: tips, account', row.user_id, 'could not be read'); }
    }
  }
  if (out.waiting) console.log('reminders: tips', JSON.stringify({ ...out, answers }));
  return answer(req, out);
}

let versionKept = '';
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return answer(req, { ok: false, code: 'post_only' }, 405);
  try {
    const body = await req.json().catch(() => ({})) || {};
    if (body.action === 'version') return answer(req, { ok: true, version: versionKept || (versionKept = await versionOf([...LOGIC, ...WEBPUSH, ...EMAIL])) });
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    if (body.action === 'key') return answer(req, { ok: true, publicKey: (await pushKeys(admin)).publicKey });
    if (body.action === 'test') return await test(req, admin, body.channel === 'email' ? 'email' : 'push', body.channel === 'email' ? 0 : body.delay);
    if (body.action === 'run') return await run(req, admin, body);
    if (body.action === 'tips') return await tips(req, admin);
    if (body.action === 'contact') return await contact(req, admin, body);
    return answer(req, { ok: false, code: 'unknown_action' }, 400);
  } catch (e) {
    console.error('reminders: failed:', e instanceof Error ? e.name : 'error');
    return answer(req, { ok: false, code: 'failed' }, 500);
  }
});
