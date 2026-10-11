/* Dorax Finance — the reminder job's decisions, apart from the sending, so they can be tested without a server:
   what day it is for the people being reminded, and what one person should be told today. */
import { openAccount } from './engine.mjs';

/** The date in a time zone, as 'YYYY-MM-DD'. The job runs once a day; "today" is the day where the people live, not the server's. */
export const todayIn = (timeZone, now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

/** What one person is told today, or null when there is nothing new.
    account: their document; today: 'YYYY-MM-DD'; sent: the keys already sent to them (a Set).
    Only what is NEW is sent: a bill is announced when it comes into view, on its day and when it turns late, once each. Without this the
    same late bill would arrive every morning, which is the fastest way to get notifications switched off. */
export function messageFor(account, today, sent) {
  const acc = openAccount(account, today), fresh = acc.reminders.filter(r => !sent.has(acc.key(r)));
  if (!fresh.length) return null;
  const digest = acc.digest(fresh), push = acc.push(fresh);
  if (!digest || !push) return null;
  return { keys: fresh.map(acc.key), subject: digest.subject, lines: digest.lines, push, lang: acc.lang, emailOn: acc.emailOn, texts: acc.texts };
}

/** The minutes since midnight in a time zone (8:30 is 510). */
export const minuteIn = (timeZone, now = new Date()) => { const p = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now), v = k => +p.find(x => x.type === k).value; return v('hour') * 60 + v('minute'); };
/** Tips go between 8:00 and 23:00 (owner, 2026-10-10). The reminders have 8:00; a tip's time starts at 8:30, so the two never cross. */
export const TIP_FROM = 8 * 60, TIP_UNTIL = 23 * 60, TIP_FIRST = 8 * 60 + 30, TIP_LAST = 22 * 60 + 45;
/** A person's time for a tip on a day, in minutes since midnight: a quarter of an hour between 8:30 and 22:45, worked out from their id and the date
    (FNV-1a), so it is a different time every day, spread over the day, and the same however many times it is asked. */
export function tipSlot(userId, day) {
  let h = 0x811c9dc5; for (const ch of String(userId) + '|' + day) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  const steps = (TIP_LAST - TIP_FIRST) / 15 + 1; return TIP_FIRST + (h % steps) * 15;
}

/** Today's tip by notification (owner, 2026-10-10: "notify about curiosities, tips, advice, to help and motivate"), or null.
    reminded: a reminder reached this person today; then there is no tip, one notification a day is enough.
    The tip's own rules (how often, which kind, which fact) are the app's: features/reminders/tip-messages.js, through engine.mjs. */
export function tipFor(account, today, sent, reminded) {
  if (reminded) return null;
  const acc = openAccount(account, today), tip = acc.tip(sent);
  return tip ? { kind: tip.kind, keys: tip.keys, push: tip.push, lang: acc.lang } : null;
}

/** The texts of the "send me a test" messages, in the person's language. */
export const testTexts = (account, today) => { const acc = openAccount(account, today); return { texts: acc.texts, lang: acc.lang }; };

/** Compares two secrets without stopping at the first different character, so the time it takes says nothing about how close a guess was. */
export function sameSecret(a, b) {
  a = String(a || ''); b = String(b || ''); let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0 && a.length > 0;
}

/** A short name for the exact code that is running: the same letters here and on the server mean the server runs these very files.
    "node tools/build-functions.js --version" prints it for the files on this computer; the function answers it to { "action": "version" }.
    parts: functions (their text is what counts) and plain texts. */
export async function versionOf(parts) {
  const text = parts.map(p => String(p).replace(/\r\n/g, '\n')).join('\n\u0000');
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  return [...hash.slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export const PARTS = [todayIn, messageFor, tipFor, tipSlot, minuteIn, testTexts, sameSecret, versionOf, openAccount, 'tips ' + [TIP_FROM, TIP_UNTIL, TIP_FIRST, TIP_LAST].join(' ')];
