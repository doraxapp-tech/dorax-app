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
export const PARTS = [todayIn, messageFor, testTexts, sameSecret, versionOf, openAccount];
