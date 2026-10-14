// QC of the invitations (v228, owner, 2026-10-14: "si el usuario no ha creado rachas, ni desafíos, ni un sprint de días sin gastar, Dorax debe
// enviarle notificaciones recurrentes para ello, sin ser spam, y tenemos que actualizar las templates de los correos para ello"):
//   1. four months of mornings for someone who started nothing: nine invitations, one a week, never on a Sunday, each kind three times three weeks
//      apart, the third saying it is the last, then none;
//   2. a morning with reminders carries no invitation; someone who started a thing, owes nothing, recorded nothing, or switched them off, gets none
//      of it;
//   3. the email: its figure under the heading, its button to the place to start it, the small print saying why and how to stop it; the
//      notification the same; the server keeps the invitations' keys past its 120 days;
//   4. the app: the switch "Invitations", on by default; a tapped invitation opens the place to start (the shortcuts and the service worker).
const path = require('path'), fs = require('fs');
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  const logic = await import('file://' + path.join(__dirname, '..', 'supabase', 'functions', 'reminders', 'logic.mjs'));
  const { reminderEmail } = await import('file://' + path.join(__dirname, '..', 'supabase', 'functions', 'reminders', 'email.mjs'));
  const { browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true });
  const base = await page.evaluate(() => { const d = JSON.parse(JSON.stringify(S)); d.user.notify = { bills: false, close: false, summary: false, goals: false, pay: false, journey: true, budgets: false, challenges: true }; d.journey = null; d.challenges = null; return d; });
  const copy = d => JSON.parse(JSON.stringify(d));
  const run = (doc, from = '2026-10-05', days = 120) => { const sent = new Set(), out = []; let d = new Date(from + 'T12:00:00Z');
    for (let i = 0; i < days; i++) { const day = d.toISOString().slice(0, 10), m = logic.messageFor(copy(doc), day, sent); if (m) { out.push({ day, ...m }); m.keys.forEach(k => sent.add(k)); } d = new Date(d.getTime() + 864e5); }
    return out; };

  // ---------- 1. four months ----------
  const all = run(base), kinds = all.map(m => m.keys[0].split('|')[1]);
  eq([all.length, all.every(m => m.kind === 'invite'), kinds], [9, true, ['journey', 's52', 'ns', 'journey', 's52', 'ns', 'journey', 's52', 'ns']], 'nine invitations, in turn: Journey, 52 weeks, days without spending');
  const gaps = all.slice(1).map((m, i) => (Date.parse(m.day) - Date.parse(all[i].day)) / 864e5);
  ok(gaps.every(g => g >= 7) && all.every(m => new Date(m.day + 'T12:00:00Z').getUTCDay() !== 0), 'one a week at most, never on a Sunday', gaps);
  eq(['journey', 's52', 'ns'].map(k => all.filter(m => m.keys[0].includes('|' + k + '|')).map(m => m.day)).map(ds => ds.slice(1).every((d, i) => (Date.parse(d) - Date.parse(ds[i])) / 864e5 >= 21)), [true, true, true], 'the same one three weeks apart at least');
  ok(all.slice(-3).every(m => m.lines.includes('Es la última vez que te lo proponemos.')) && all.slice(0, 6).every(m => !m.lines.includes('Es la última vez que te lo proponemos.')), 'the third time says it is the last');
  eq(run(base, '2027-01-01', 200).length, 9, 'a later start: nine again in all, then none (the count is the server’s, never more than three each)');
  eq(all.map(m => m.link), ['?do=journey', '?do=s52', '?do=nospend', '?do=journey', '?do=s52', '?do=nospend', '?do=journey', '?do=s52', '?do=nospend'], 'each opens the place to start it');
  eq([all[1].subject, all[1].push.title, all[1].push.body, all[1].figure], ['¿Juntamos R$ 1.378 en un año?', 'Desafío 52 semanas', 'Semana 1, R$ 1; semana 2, R$ 2… En un año tienes R$ 1.378. ¿Empiezas esta semana?', { big: 'R$ 1.378', small: 'en 52 semanas, empezando con R$ 1' }], 'the 52 weeks: its subject, its notification and its figure');

  // ---------- 2. who gets none ----------
  const withBills = copy(base); withBills.user.notify.bills = true;
  eq(logic.messageFor(copy(withBills), '2026-10-02', new Set()).kind, 'reminders', 'a morning with reminders: the reminders, no invitation');
  const off = copy(base); off.user.notify.invites = false;
  eq(run(off).length, 0, 'Invitations switched off: none');
  const noCh = copy(base); noCh.user.notify.challenges = false;
  eq(run(noCh).map(m => m.keys[0].split('|')[1]), ['journey', 'journey', 'journey'], 'Challenges switched off: only the Journey’s');
  const noJ = copy(base); noJ.user.notify.journey = false;
  eq(run(noJ).some(m => m.keys[0].includes('|journey|')), false, 'the Journey switched off: not the Journey’s');
  const owesNothing = copy(base); owesNothing.accounts.forEach(a => { if (a.type === 'credit') a.type = 'checking'; });
  eq(run(owesNothing).some(m => m.keys[0].includes('|journey|')), false, 'someone who owes nothing: no Journey');
  const started = copy(base); started.journey = { debts: [], pays: [], checks: { '2026-09-01': true }, sprint: null, sprints: [] };
  started.challenges = { save52: { id: 'c', goalId: started.goals[0].id, start: '2026-09-01', step: 100, reverse: false }, nospend: null, ended: [{ kind: 'ns', id: 'n', start: '2026-08-01', length: 7, marked: 5, end: '2026-08-07' }] };
  eq(run(started).filter(m => m.kind === 'invite').length, 0, 'a day marked in the Journey, the 52 weeks running, days without spending done before: nothing to invite to');
  const empty = copy(base); empty.transactions = [];
  eq(run(empty).length, 0, 'nothing recorded yet: none (the first steps come first)');

  // ---------- 3. the email ----------
  const m = all[1], e = reminderEmail({ title: m.subject, lines: m.lines, marks: m.marks, hero: m.hero, cta: m.cta, figure: m.figure, texts: m.texts, site: 'https://dorax.app', link: 'https://dorax.app/' + m.link, lang: m.lang });
  ok(/font-size:24px[^>]*>R\$\s1\.378<\/div>/.test(e.html) && /en 52 semanas, empezando con R\$\s1/.test(e.html) && /href="https:\/\/dorax\.app\/\?do=s52"/.test(e.html) && />Empezar el desafío</.test(e.html), 'the email: the figure in its chip beside the drawing, the button to the place to start it');
  ok(/apaga Invitaciones en tu perfil, en Notificaciones/.test(e.html) && /^¿Juntamos R\$ 1\.378 en un año\?\n\nR\$ 1\.378 — en 52 semanas, empezando con R\$ 1\n/.test(e.text), 'its small print says why and how to stop; the plain text has the figure too');
  ok(/art\/piggy-bank\.png" width="88"/.test(e.html) && ['calendar-dots', 'coins', 'bell-ringing'].every(t => e.html.includes('/assets/email/art/' + t + '.png" width="44"')) && /La semana 1 son R\$\s1\. ¿Empiezas esta semana\?/.test(e.html) && /href="https:\/\/dorax\.app\/ajuda"/.test(e.html) && /© \d{4} Dorax Finance/.test(e.html),
    'the email as a page of the website (v229): the piggy bank at the top, a thing beside each line, the lime band with its question, the footer with the website’s links');
  const plain = reminderEmail({ title: 'T', lines: ['a'], texts: { open: 'Open', why: 'w' }, site: 'https://dorax.app', lang: 'es' });
  ok(!/font-size:24px/.test(plain.html), 'a reminder email without a figure has no chip');
  const ts = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'functions', 'reminders', 'index.ts'), 'utf8');
  ok(/\.not\('key', 'like', 'invite\|%'\)/.test(ts) && /url: SITE \+ '\/' \+ msg\.link/.test(ts) && /figure: msg\.figure/.test(ts), 'the server: the invitations’ keys kept past 120 days; the notification and the email open their place; the figure goes in');

  // ---------- 4. the app ----------
  await page.evaluate(() => { S.user.greeted = true; navigate('settings/notifications'); }); await page.waitForSelector('#nf-invites');
  eq(await page.evaluate(() => [document.querySelector('#nf-invites').checked, /una por semana/.test(document.querySelector('#nf-invites').closest('.setting').innerText)]), [true, true], 'Settings: “Invitations”, on by default, saying how often');
  eq(await page.evaluate(() => { SHORTCUTS.s52(); const a = [UI.route, UI.drawer && UI.drawer.kind]; A.close(); SHORTCUTS.nospend(); const b = [UI.route, UI.drawer && UI.drawer.kind]; A.close(); return [a, b]; }), [['goals', 's52-form'], ['dashboard', 'ns-form']], 'a tapped invitation opens the place to start it');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'app', 'sw.js'), 'utf8'), push = fs.readFileSync(path.join(__dirname, '..', 'app', 'js', 'features', 'reminders', 'push.js'), 'utf8');
  ok(/todo = \(\/\[\?&\]do=\(\\w\+\)\/\.exec\(raw\)/.test(sw) && /c\.postMessage\(\{ dorax: 'do', v: todo \}\)/.test(sw) && /e\.data\.dorax === 'do'/.test(push), 'with Dorax already open, the service worker hands it over and the app opens it');
  eq(errors, [], 'no error in the console'); await browser.close();
  done('qc-invites');
})().catch(e => { console.error('qc-invites: Error', e); process.exit(1); });
