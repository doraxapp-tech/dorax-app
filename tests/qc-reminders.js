// QC of reminders outside the app: notifications on a device (Web Push) and reminder emails.
// Four parts:
//   1. the cryptography (supabase/functions/reminders/webpush.mjs) against the example published in the standard, and the small rules;
//   2. the server's copy of the reminder rules (engine.mjs) says exactly what the app says, in three languages and both tones;
//   3. the function itself (index.ts) run here with stand-ins for the database, the clock and the network (tests/server/harness.mjs):
//      who may call it, what each person is sent, what is remembered, what happens when a device or the email service fails;
//   4. the profile: the controls for this device and for email, in every state a browser can be in.
// Nothing is sent anywhere: the "push services" and the "email service" are functions in the harness.
const { open, ok, eq, done, TARGET } = require('./pw.js');
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..'), FN = path.join(ROOT, 'supabase', 'functions', 'reminders');
const EVIL = '<img src=x onerror=alert(1)> & "Rent"';
const KEYS = { p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', auth: 'BTBZMqHH6r4Tts7J_aSIgg' };

(async () => {
  // ---------------------------------------------------------------- 1. encryption, signing, small rules
  const wp = await import('file://' + path.join(FN, 'webpush.mjs')), logic = await import('file://' + path.join(FN, 'logic.mjs')), mail = await import('file://' + path.join(FN, 'email.mjs'));
  {
    // RFC 8291, Appendix A: with the example's keys and salt, the encrypted message must come out byte for byte as published
    const pub = wp.unb64u('BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8');
    const fixed = { salt: wp.unb64u('DGv6ra1nlYgDCS1FRnbzlw'), privateJwk: { kty: 'EC', crv: 'P-256', d: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw', x: wp.b64u(pub.slice(1, 33)), y: wp.b64u(pub.slice(33)) } };
    const body = await wp.encryptForDevice('When I grow up, I want to be a watermelon', KEYS.p256dh, KEYS.auth, fixed);
    eq(wp.b64u(body), 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN', 'the encryption gives the standard’s published example (RFC 8291, appendix A)');
    const a = await wp.encryptForDevice('same words', KEYS.p256dh, KEYS.auth), b = await wp.encryptForDevice('same words', KEYS.p256dh, KEYS.auth);
    ok(wp.b64u(a) !== wp.b64u(b), 'the same message is never encrypted the same way twice (new salt and key each time)');
    let threw = false; try { await wp.encryptForDevice('x', 'not-a-key', KEYS.auth); } catch (e) { threw = true; } ok(threw, 'a key that is not a device’s is refused');

    const v = await wp.generateVapidKeys(), auth = await wp.vapidAuthorization('https://fcm.googleapis.com/fcm/send/abc', 'mailto:someone@example.org', v, Date.UTC(2026, 9, 5, 11));
    const [, jwt, k] = auth.match(/^vapid t=([^,]+), k=(.+)$/), [h, c, sig] = jwt.split('.'), claims = JSON.parse(Buffer.from(c, 'base64url').toString());
    const key = await crypto.subtle.importKey('raw', wp.unb64u(k), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, wp.unb64u(sig), new TextEncoder().encode(h + '.' + c)), 'the signature a push service checks is valid for the app’s public key');
    eq([claims.aud, claims.sub, claims.exp - Date.UTC(2026, 9, 5, 11) / 1000, k === v.publicKey, wp.unb64u(v.publicKey).length], ['https://fcm.googleapis.com', 'mailto:someone@example.org', 12 * 3600, true, 65], 'it names the push service, a contact and 12 hours of validity');
    eq(['fcm.googleapis.com', 'web.push.apple.com', 'updates.push.services.mozilla.com', 'wns2-by3p.notify.windows.com', 'evil.example.org', 'fcm.googleapis.com.evil.org', 'notfcm.googleapis.com.br', 'localhost', '169.254.169.254'].map(wp.isPushService),
      [true, true, true, true, false, false, false, false, false], 'only the browsers’ own push services count as an address to send to');
    const calls = []; const never = async u => { calls.push(u); return new Response('', { status: 201 }); };
    for (const endpoint of ['http://fcm.googleapis.com/fcm/send/x', 'https://internal.example/x', 'https://fcm.googleapis.com.evil.org/x', 'not an address', 'file:///etc/passwd'])
      eq(await wp.sendPush({ endpoint, ...KEYS }, '{}', { ...v, subject: 'mailto:x@example.org' }, { fetch: never }), { ok: false, status: 0, gone: true }, 'no request is made to ' + endpoint);
    eq(calls, [], 'so the server cannot be made to call an address of somebody’s choosing');
    eq([await wp.sendPush({ endpoint: 'https://fcm.googleapis.com/fcm/send/x', ...KEYS }, '{}', { ...v, subject: 'mailto:x@example.org' }, { fetch: async () => new Response('', { status: 410 }) }),
      await wp.sendPush({ endpoint: 'https://fcm.googleapis.com/fcm/send/x', ...KEYS }, '{}', { ...v, subject: 'mailto:x@example.org' }, { fetch: async () => new Response('', { status: 500 }) }),
      await wp.sendPush({ endpoint: 'https://fcm.googleapis.com/fcm/send/x', ...KEYS }, '{}', { ...v, subject: 'mailto:x@example.org' }, { fetch: async () => { throw new Error('offline'); } })],
      [{ ok: false, status: 410, gone: true }, { ok: false, status: 500, gone: false }, { ok: false, status: 0, gone: false }], 'a device that is gone is told apart from a push service having a bad moment');

    eq([logic.sameSecret('abc', 'abc'), logic.sameSecret('abc', 'abd'), logic.sameSecret('abc', 'abcd'), logic.sameSecret('', ''), logic.sameSecret(null, 'abc'), logic.sameSecret(undefined, undefined)], [true, false, false, false, false, false], 'secrets are compared whole; an empty one never matches');
    eq([logic.todayIn('America/Sao_Paulo', new Date('2026-10-05T02:30:00Z')), logic.todayIn('America/Sao_Paulo', new Date('2026-10-05T03:00:00Z')), logic.todayIn('America/Sao_Paulo', new Date('2026-10-05T11:00:00Z'))], ['2026-10-04', '2026-10-05', '2026-10-05'], '"today" is the day in Brazil, not the server’s');

    const m = mail.reminderEmail({ title: EVIL, lines: [EVIL + ': R$ 10,00', 'second'], texts: { open: 'Open <b>', why: 'Why & how' }, site: 'https://dorax.app', link: 'https://dorax.app/?open=reminders', lang: 'pt' });
    ok(!/<img src=x|<b>/.test(m.html) && m.html.includes('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;Rent&quot;'), 'what a person typed is shown as text in the email, never as a piece of the page');
    eq([(m.html.match(/<a /g) || []).length, (m.html.match(/href="([^"]+)"/) || [])[1], (m.html.match(/<img [^>]*src="([^"]+)"/) || [])[1], /<script|javascript:|onerror=|onload=/i.test(m.html.replace(/&lt;.*?&gt;/g, ''))],
      [1, 'https://dorax.app/?open=reminders', 'https://dorax.app/assets/email/dorax-logo.png', false], 'the email has one link (the app), one picture (the logo) and no script');
    eq(m.text.split('\n'), [EVIL, '', EVIL + ': R$ 10,00', 'second', '', 'Open <b>: https://dorax.app/?open=reminders', '', 'Why & how'], 'and a plain-text version with the same lines and the link');
  }
  const gen = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'build-functions.js'), '--check'], { encoding: 'utf8' });
  eq(gen.status, 0, 'the server’s copy of the reminder rules (engine.mjs) is the one the app’s files give now: ' + (gen.stdout || gen.stderr).trim());
  const src = ['index.ts', 'logic.mjs', 'webpush.mjs', 'email.mjs'].map(f => fs.readFileSync(path.join(FN, f), 'utf8')).join('\n');
  ok(!/re_[A-Za-z0-9]{8,}|sb_secret_|eyJhbGciOi|-----BEGIN/.test(src + fs.readFileSync(path.join(FN, 'engine.mjs'), 'utf8') + fs.readFileSync(path.join(ROOT, 'supabase', 'reminders-schedule.sql'), 'utf8')), 'no key or secret is written in the function or its schedule');
  eq([...src.matchAll(/from '([^']+)'/g)].map(x => x[1]).filter(x => !x.startsWith('./')), ['npm:@supabase/supabase-js@2'], 'the function depends on one library, Supabase’s own');

  // ---------------------------------------------------------------- 2. the app and the server say the same
  const { openAccount } = await import('file://' + path.join(FN, 'engine.mjs'));
  const accounts = {}; let compared = 0, different = [];
  for (const lang of ['pt', 'es', 'en']) {
    const o = await open({ lang, account: 'example', plan: true }), p = o.page;
    for (const tone of ['friend', 'plain']) for (const day of ['2026-10-01', '2026-10-05', '2026-10-12', '2026-10-15', '2026-10-28', '2026-11-03']) {
      const page = await p.evaluate(([day, tone]) => { S.today = day; S.user.tone = tone; S.user.notify = { bills: true, close: true, summary: true, goals: true }; const rs = allReminders().filter(r => !snoozedNow(r));
        return { doc: JSON.parse(JSON.stringify(S)), said: { ids: messageReminders(rs).map(reminderKey), digest: reminderDigest(rs), push: reminderPush(rs), one: rs.slice(0, 1).map(r => reminderPush([r]))[0] || null, texts: reminderTexts() } }; }, [day, tone]);
      const e = openAccount(page.doc, day), mine = { ids: e.reminders.map(e.key), digest: e.digest(e.reminders), push: e.push(e.reminders), one: e.reminders.slice(0, 1).map(r => e.push([r]))[0] || null, texts: e.texts };
      compared++; if (JSON.stringify(mine) !== JSON.stringify(page.said)) different.push(`${lang} ${tone} ${day}`);
      if (tone === 'friend' && day === '2026-10-05') { accounts[lang] = page.doc; delete accounts[lang].today; }
    }
    if (lang === 'en') {
      // a person who asked for nothing gets nothing; a reminder put off until tomorrow is not sent today
      const quiet = JSON.parse(JSON.stringify(accounts.en)); quiet.user.notify = { bills: false, close: false, summary: false, goals: false };
      eq(openAccount(quiet, '2026-10-05').reminders.length, 0, 'a person who switched every reminder off is told nothing');
      const all = openAccount(JSON.parse(JSON.stringify(accounts.en)), '2026-10-05').reminders, later = JSON.parse(JSON.stringify(accounts.en)); later.user.remind.snoozed = { [all[0].id]: '2026-10-05' };
      eq([openAccount(later, '2026-10-05').reminders.length, openAccount(later, '2026-10-06').reminders.some(r => r.id === all[0].id)], [all.length - 1, true], 'a reminder put off for today is left out today and is back tomorrow');
      ok(logic.messageFor(JSON.parse(JSON.stringify(accounts.en)), '2026-10-05', new Set(all.map(r => r.id + '|' + (r.when || r.kind)))) === null, 'when everything was already said, there is no message');
      const one = logic.messageFor(JSON.parse(JSON.stringify(accounts.en)), '2026-10-05', new Set(all.slice(1).map(r => r.id + '|' + (r.when || r.kind))));
      eq([one.keys.length, one.push.title, one.push.body, one.subject], [1, 'Rent · R$ 1.800,00', 'Due 05/10 · due today', 'Rent: due today'], 'one new bill is announced by its name, amount and day');
    }
    await o.browser.close();
  }
  eq([compared, different], [36, []], 'app and server give the same reminders, email and notification (3 languages, 2 tones, 6 days)');

  // ---------------------------------------------------------------- 3. the function, run here
  accounts.evil = JSON.parse(JSON.stringify(accounts.en)); { const l = accounts.evil.plan.lines.find(x => x.id === 'pl-alquiler'); l.name = EVIL; delete l.k; }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dorax-rem-')), input = path.join(tmp, 'accounts.json'); fs.writeFileSync(input, JSON.stringify({ accounts }));
  const strip = +process.versions.node.split('.')[0] > 22 || (+process.versions.node.split('.')[0] === 22 && +process.versions.node.split('.')[1] >= 18) ? [] : ['--experimental-strip-types'];
  const run = spawnSync(process.execPath, ['--no-warnings', ...strip, path.join(__dirname, 'server', 'harness.mjs'), input], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  fs.rmSync(tmp, { recursive: true, force: true });
  let O = null; try { O = JSON.parse(run.stdout); } catch (e) { /* judged below */ }
  if (!O && +process.versions.node.split('.')[0] < 22) console.log('qc-reminders: the function itself was not run here (it is TypeScript; Node 22 or newer reads it). The other checks ran.');
  else if (!O) ok(false, 'the function runs outside Supabase', (run.stderr || run.stdout).trim().split('\n').slice(-6));
  else {
    const said = n => n.pushes.map(p => `${p.to}: ${p.said.title}`), to = n => n.mails.map(m => m.to.join());
    // the public key
    eq([O.key1.status, O.key1.json.ok, O.key1.json.publicKey.length, O.key1.json.publicKey === O.key2.json.publicKey, O.keyKept, O.keyHasPrivate, O.keyLeaks, Object.keys(O.key1.json).sort()], [200, true, 87, true, 1, true, false, ['ok', 'publicKey']], 'the push key is made once, kept on the server, and only its public half is ever answered');
    // who may call
    eq([O.runNoSecret.status, O.runWrong.status, O.get.status, O.unknown.status], [403, 403, 405, 400], 'a run is refused without the schedule’s secret, and with a wrong one');
    eq(O.cors, ['https://dorax.app', 'https://dorax.app', 'http://localhost:5173'], 'only the app’s own addresses are named as allowed callers from a browser');
    // day 1
    const ver = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'build-functions.js'), '--version'], { encoding: 'utf8' }).stdout.trim();
    eq([O.version.status, O.version.json.version, /^[0-9a-f]{16}$/.test(ver)], [200, ver, true], 'the function names the code it runs, and it is the name "build-functions.js --version" gives for these files');
    eq([O.day1.json, O.day1.pages, O.day1.asked, O.day1.statuses], [{ ok: true, day: '2026-10-05', people: 6, told: 4, notifications: 4, emails: 3, problems: 1, contact: 0, more: false }, 4, [['b', 1], ['d', 2], ['f', 3]], [200, 200, 200, 200]],
      'the first run, two accounts a page: six accounts over four requests, each starting after the last account of the one before; an account that could not be read is counted and skipped');
    eq(said(O.day1net).slice(0, 3), ['ana-phone: 5 coisas para ver hoje', 'ana-laptop: 5 coisas para ver hoje', 'caio-phone: 5 things to look at today'], 'every device of a person gets the notification, in that person’s language');
    // a bill with a 5000-character name and a line break in it
    const fayPush = O.day1net.pushes.find(x => x.to === 'fay-phone'), fayMail = O.day1net.mails.find(m => m.to[0] === 'fay@example.org');
    eq([fayPush.said.title.length, /[\r\n]/.test(fayPush.said.title), fayPush.said.body], [120, false, 'Due 05/10 · due today'], 'a very long name is cut to fit a notification, which still arrives');
    eq([fayMail.subject.length, /[\r\n]/.test(fayMail.subject), fayMail.subject.startsWith('Rent Bcc: someone@evil.example xxx'), Math.max(...fayMail.text.split('\n').map(l => l.length)), fayMail.extra], [150, false, true, 300, []],
      'and in an email: the subject stays one line, a line break in a name adds no header, no line runs past 300 characters');
    const p0 = O.day1net.pushes[0];
    eq([p0.enc, p0.vapid, p0.ttl, p0.said.url, p0.said.tag, p0.said.lang, p0.said.body.split('\n')], ['aes128gcm', true, '72000', 'https://dorax.app/?open=reminders', 'dorax-2026-10-05', 'pt', ['Aluguel: R$ 1.800,00, vence em 05/10 (vence hoje).', 'Cartão Nubank: fatura de R$ 1.795,06, vence em 07/10 (em 2 dias).', 'Internet: R$ 110,00, vence em 12/10 (em 7 dias).', 'e mais 2']],
      'a notification is encrypted for its device, signed, and opens to the first three reminders and a count of the rest');
    eq(to(O.day1net), ['ana@example.org', 'eli@example.org', 'fay@example.org'], 'emails go to people who left them on and confirmed their address: not to who switched them off, not to an unconfirmed address');
    const ana = O.day1net.mails[0], eli = O.day1net.mails[1];
    eq([ana.from, ana.subject, ana.auth, ana.unsub, (ana.html.match(/<html lang="(\w+)"/) || [])[1], (ana.html.match(/<tr><td style="padding:12px 0;/g) || []).length], ['Dorax Finance <no-reply@mail.dorax.app>', '5 coisas para ver hoje', 'Bearer re_test_key', '<https://dorax.app/#profile>', 'pt', 5],
      'the email comes from the Dorax address, in the person’s language, one line per reminder');
    ok(ana.text.includes('Contabilidade: os extratos de Setembro 2026 vencem em 15/10/2026 (em 10 dias). 0 de 2 enviados.') && ana.text.includes('Para parar, desative lá, em Lembretes.'), 'it carries all five lines and says how to stop it');
    ok(eli.html.includes('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;Rent&quot;: R$ 1.800,00') && !eli.html.includes('<img src=x'), 'a bill named like a piece of a web page arrives as text');
    eq([O.day1net.other, O.day1subs], [[], ['fay-phone', 'ana-phone', 'ana-laptop', 'caio-phone']], 'a "device" whose address is not a push service is never called, and is forgotten');
    eq(O.day1log.filter(k => k[0] === 'a'), ['a:bill:pl-alquiler:2026-10|today', 'a:bill:pl-internet:2026-10|soon', 'a:card:nu-card:2026-10|soon', 'a:close:2026-09|soon', 'a:summary:2026-09|soon'], 'what was said is remembered by reminder and stage');
    ok(!O.day1log.some(k => k[0] === 'b' || k[0] === 'd'), 'nothing is remembered for a person who was not reached');
    // the same day again
    eq([O.day1again.json.told, O.day1againNet.pushes.length, O.day1againNet.mails.length], [0, 0, 0], 'a second run on the same day sends nothing');
    // a week later
    eq([O.day8.json.told, said(O.day8net), to(O.day8net), O.day8subs], [3, ['ana-phone: 3 coisas para ver hoje', 'ana-laptop: 3 coisas para ver hoje', 'caio-phone: 3 things to look at today'], ['ana@example.org', 'eli@example.org'], ['ana-phone', 'caio-phone']],
      'a week later only what changed stage is said (late, due today), and a device that answers "gone" is forgotten');
    ok(O.day8net.pushes[0].said.body.includes('Internet: R$ 110,00, vence em 12/10 (vence hoje).') && !/Contabilidade|fechou/.test(O.day8net.pushes[0].said.body), 'what was already said at the same stage is not repeated');
    // the email service down, then back
    eq([O.down.json.emails, O.down.json.problems, O.downKept, O.up.json.emails, to(O.upNet), O.upKept], [0, 3, 0, 2, ['ana@example.org', 'eli@example.org'], 2], 'when nothing could be delivered it is not marked as said, and goes out on the next run');
    eq([O.noKey.json.emails, O.noKeyNet.mails.length, O.noKeyNet.pushes.length, O.noKey.json.ok], [0, 0, 1, true], 'without a key for the email service, notifications still go and emails are skipped');
    eq([O.oldKeptMidRun, O.oldGone], [true, true], 'entries older than four months are forgotten, by the last page of a run');
    eq([O.broken.json.more, O.broken.pages, to(O.brokenNet), O.mended.pages, said(O.mendedNet), to(O.mendedNet)], [true, 1, ['ana@example.org'], 3, ['caio-phone: 2 things to look at today'], ['eli@example.org']],
      'when a page cannot be handed on, the people of the pages done keep what they got, and the others get theirs on the next run: nobody twice, nobody skipped');
    eq([O.badCursor.status, O.badCursor.json.people, O.cursorNoSecret.status], [200, 2, 403], 'a made-up cursor is read as "from the start"; a page asked for without the secret is refused like any run');
    // send me a test
    eq([O.testAnon.status, O.testBad.status, O.testAnon.json.code], [401, 401, 'not_logged_in'], 'a test needs a logged-in person: no token and a made-up token are refused');
    eq([O.testPush.status, O.testPush.json.sent, said(O.testPushNet)], [200, 1, ['caio-phone: Notifications are on']], 'a test notification goes to the devices of the person who asked, nobody else’s');
    // (owner, 2026-10-09: "notifications are not reaching my phone") the answer says, device by device, what its push service answered: no address
    eq((O.testPush.json.results || []).map(x => [typeof x.agent, x.service, x.status, x.ok, Object.keys(x).includes('endpoint')]), [['string', 'apple', 201, true, false]], 'and it says, device by device, which push service took it and what it answered, without the device’s address');
    eq([O.testSoon.status, O.testSoon.json, O.testSoonNet.pushes.length], [200, { ok: false, code: 'too_soon' }, 0], 'a second test within 20 seconds is refused, with a reason the app can read');
    eq([O.testMail.status, to(O.testMailNet), O.testMailNet.mails[0] && O.testMailNet.mails[0].subject], [200, ['caio@example.org'], 'Reminder emails are on'], 'a test email goes to the address of the login, which a request cannot choose');
    eq([O.testMailSoon.json.code, O.testMailSoonNet.mails.length, O.testMailMinute.json.code, O.testMailHour.json.ok, to(O.testMailHourNet)], ['too_soon', 0, 'too_soon', true, ['caio@example.org']], 'one test email an hour per person: the email service’s allowance is not a button’s to spend');
    eq([O.testMailNoKey.json, O.testMailAfterNoKey.json.ok, to(O.testMailAfterNoKeyNet)], [{ ok: false, code: 'no_key' }, true, ['bea@example.org']], 'a test that could not be sent does not use up the hour');
    eq([O.testNoDevice.status, O.testNoDevice.json.code], [200, 'no_device'], 'a person with no device is told so');
    eq([O.testLater.status, O.testLaterNet.pushes.length], [200, 1], 'and a minute later a test works again');
    // the contact form: the owner hears of a message by email
    const c1 = O.contact1Net.mails[0] || {}, c2 = O.contact2Net.mails[0] || {}, sum = O.contactRunNet.mails.find(m => m.to[0] === 'owner@example.org') || {};
    eq([O.contactNoSecret.status, O.contactNotSetUp.json, O.contactNotSetUpNet.mails.length, O.contactBadId.status, O.contactUnknown.json], [403, { ok: false, code: 'not_set_up' }, 0, 400, { ok: true, sent: 0 }],
      'only the database may report a contact message; with no address set for the owner nothing is sent; a made-up id finds nothing');
    eq([O.contact1.json.sent, c1.to, c1.subject, c1.replyTo, c1.from, c1.unsub === undefined, O.contact1Told], [1, ['owner@example.org'], 'Dorax contact (question): visitor1@example.org', 'visitor1@example.org', 'Dorax Finance <no-reply@mail.dorax.app>', true, true],
      'a contact message is emailed to the owner, a reply goes to the person who wrote, and the message is marked as told');
    eq(c1.text.split('\n').slice(2, 7), ['From: visitor1@example.org (has an account)', 'Topic: question · Language: pt · 2026-11-04', 'First line <script>alert(1)</script>', 'Second line & more', 'Third'], 'the email carries who wrote, the topic and the message, line by line');
    const links = m => [...((m || {}).html || '').matchAll(/<a href="([^"]+)"[^>]*>([^<]+)/g)].map(x => [x[1].replace(/&amp;/g, '&'), x[2]]), l1 = links(c1), c6 = O.contact6Net.mails[0] || {}, c7 = O.contact7Net.mails[0] || {};
    ok(c1.html.includes('First line &lt;script&gt;alert(1)&lt;/script&gt;') && !/<script/i.test(c1.html), 'what a visitor typed arrives as text');
    eq([l1.length, l1[0][1], l1[0][0].split('?')[0], decodeURIComponent(l1[0][0].split('subject=')[1].split('&')[0]), decodeURIComponent(l1[0][0].split('body=')[1]).split('\n').slice(2, 4), l1[1]], [2, 'Reply to visitor1@example.org', 'mailto:visitor1@example.org', 'Re: sua mensagem para o Dorax Finance', ['> First line <script>alert(1)</script>', '> '], ['https://supabase.com/dashboard/project/example/editor', 'See all messages in Supabase']],
      'the green button starts an email to the person who wrote, with a subject in their language and their message quoted; the table in Supabase is a small link below');
    eq([links(c2), /no reply button/.test(c2.text), links(c6).map(l => l[1]), c6.replyTo === undefined, /spy@evil/.test((c6.html || '').replace(/&[a-z]+;/g, '').match(/<a [^>]*>/g).join(''))], [[['https://supabase.com/dashboard/project/example/editor', 'See all messages in Supabase']], true, ['See all messages in Supabase'], true, false],
      'an "address" that could smuggle a second recipient into the reply gets no button and no reply address: it is only shown as text');
    eq([links(c7)[0][1], links(c7)[0][0].split('?')[0], c7.replyTo, links(c7)[0][0].length < 2500, decodeURIComponent(links(c7)[0][0].split('subject=')[1].split('&')[0])], ['Reply to Ana.Souza+dorax@mail.example.com.br', 'mailto:Ana.Souza%2Bdorax@mail.example.com.br', 'Ana.Souza+dorax@mail.example.com.br', true, 'Re: your message to Dorax Finance'],
      'an ordinary address with a dot and a plus gets the button (the plus written the way a link needs it); a very long message is quoted only in part, so the link stays short');
    eq([O.contact1Again.json, O.contact1AgainNet.mails.length], [{ ok: true, sent: 0 }, 0], 'the same message is never emailed twice');
    eq([c2.replyTo === undefined, /[\r\n]/.test(c2.subject), c2.subject, c2.extra], [true, false, 'Dorax contact (question): not an email Bcc: someone@evil.example', []], 'an address that is not one is shown as text and not used for the reply; a line break in it adds no header');
    eq([O.contactDown.json.ok, O.contactDownTold, O.contactHeld.json, O.contactHeldNet.mails.length, O.contactHeldTold], [false, false, { ok: true, sent: 0, held: true }, 0, false], 'when the email service is down, or 20 contact emails went out in a day, a message stays "not told"');
    eq([O.contactRun.json.contact, sum.subject, sum.text.split('\n').slice(2, 4), O.contactRunTold, O.contactRunAgain.json.contact, O.contactRunAgainNet.mails.length], [2, '2 contact messages are waiting', ['visitor3@example.org · question: A question about my plan, please.', 'visitor4@example.org · question: A question about my plan, please.'], [true, true, false], 0, 0],
      'the morning run sends the owner one summary of the messages not told yet (one written minutes ago is left to its own email), once');
    eq([O.contactRunNobody.json.contact, O.contactRunNobodyNet.mails.some(m => m.to[0] === 'owner@example.org'), O.contactStillWaiting], [0, false, true], 'with no address for the owner, messages wait in the table as before');
    // tips by notification (owner, 2026-10-10: "notify about curiosities, tips, advice"; "any time from 8 in the morning to 11 at night, any day")
    const slots = O.tipSlots.flat();
    ok(slots.every(m => m >= 510 && m <= 1365 && m % 15 === 0) && new Set(O.tipSlots.map(x => x[0])).size >= 5 && new Set(slots).size >= 12, 'each person’s time for a tip is a quarter of an hour between 8:30 and 22:45, and changes from day to day and from person to person', O.tipSlots);
    eq([O.tipNoSecret, O.tipNight.json.quiet, O.tipNight.g.length, O.tipLate.json.quiet, O.tipLate.g.length], [403, true, 0, true, 0], 'tips are asked for with the schedule’s secret only; before 8:00 and from 23:00 nothing is sent');
    eq([O.tipEarly ? O.tipEarly.g.length : 0, O.tip1.json.tips >= 1, O.tip1.g.length, O.tip1.g[0] && O.tip1.g[0].title, !!(O.tip1.g[0] && O.tip1.g[0].body.length > 20), O.tip1.g[0] && O.tip1.g[0].tag, O.tip1.g[0] && O.tip1.g[0].url, O.tip1.mails],
      [0, true, 1, 'Dato del día', true, 'dorax-tip-2026-11-09', 'https://dorax.app/', 0], 'not before the person’s time; once it has come, a tip by notification (never by email), in their language; the first is a fact about their own month');
    eq([O.tipRemindH, O.tip1.h.length, O.tip1ivo], [1, 0, 0], 'a day that had a reminder (8:00) gets no tip, even with tips every day; with no device there is no tip and nothing is written down');
    eq(O.tip1log.length, 2, 'the server remembers the day of the tip and which one it was', O.tip1log);
    eq([O.tip1again.g.length, O.tip2.g.length, O.tip3.g.length, O.tip3.g[0] && O.tip3.g[0].title], [0, 0, 1, '¿Sabías que…?'], '“Up to three a week”: not twice a day, not two days in a row; two days on, the next kind (a curiosity, with its source)');
    ok(O.tip3.g[0] && /Fuente: /.test(O.tip3.g[0].body), 'a curiosity says its source', O.tip3.g[0]);
    eq([O.tipDownKept, O.tip5.g.length, O.tip5.g[0] && O.tip5.g[0].title, O.tipOff.g.length], [false, 1, 'Un consejo de Dorax', 0], 'a tip that reached no device is not counted and goes the next day (a practical tip, in turn); switched off, none');
    ok(!O.logsLeak && O.logs.every(l => /^(ERR )?reminders: /.test(l)), 'the logs hold counts and an account id: no address, no device, no bill, no key', O.logs.slice(0, 3));
  }

  // ---------------------------------------------------------------- 4. the profile
  const standIn = st => { let sub = st.sub ? { endpoint: 'https://fcm.googleapis.com/fcm/send/this-device', keys: st.keys } : null, perm = st.perm || 'default'; window.__asked = 0; window.__key = null;
    window.DORAX_PUSH = { supported: () => st.supported !== false, needsInstall: () => !!st.install, permission: () => perm, ask: async () => { window.__asked++; return (perm = st.answer || 'granted'); }, current: async () => sub,
      subscribe: async key => { window.__key = key; if (st.breaks) throw new Error('no push here'); return (sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/this-device', keys: st.keys }); }, unsubscribe: async () => { sub = null; } }; };
  const card = async (lang, st, viewport) => {
    const o = await open({ lang, account: 'example', plan: true, viewport, mobile: viewport && viewport.width < 500, touch: viewport && viewport.width < 500 });
    if (st) { await o.page.addInitScript(standIn, { ...st, keys: KEYS }); await o.page.reload(); await o.page.waitForFunction(() => !!UI.session); }
    await o.page.evaluate(() => navigate('profile')); await o.page.waitForFunction(() => UI.push && UI.push.known);
    return o;
  };
  const look = p => p.evaluate(() => ({ status: UI.push.status, text: document.querySelector('#push-setting p').innerText.trim(), on: !!document.querySelector('[data-a="push-on"]'), off: !!document.querySelector('[data-a="push-off"]'), test: !!document.querySelector('[data-a="push-test"]'),
    mail: document.querySelector('#nf-email').checked, mailTest: !!document.querySelector('[data-a="mail-test"]'), over: document.documentElement.scrollWidth - innerWidth }));
  const toastOf = p => p.evaluate(() => (document.querySelector('#toast-root') || { innerText: '' }).innerText.trim());
  const tag = TARGET + ': ';
  {
    // no stand-in: the test server sends nothing, and says so
    const o = await card('en'), v = await look(o.page);
    eq([v.status, v.text, v.on, v.off, v.mail], ['preview', 'This preview sends nothing: no notifications and no emails.', false, false, true], tag + 'in the preview, the card says nothing is sent and offers no switch for this device');
    await o.page.click('[data-a="mail-test"]'); await o.page.waitForTimeout(150);
    eq([await toastOf(o.page), ((await o.page.evaluate(() => DORAX_PREVIEW.db().tests)) || []).length], ['This preview sends nothing: no notifications and no emails.', 0], tag + 'and a test email there is not "sent"');
    eq(o.errors, [], tag + 'no errors in the preview state'); await o.browser.close();
  }
  for (const [lang, viewport] of [['pt', { width: 1440, height: 900 }], ['es', { width: 390, height: 800 }], ['en', { width: 320, height: 700 }]]) {
    const o = await card(lang, {}, viewport), p = o.page, T = k => p.evaluate(k => t(k), k), where = `${tag}${lang} ${viewport.width}: `;
    let v = await look(p);
    eq([v.status, v.on, v.off, v.test, v.mail, v.mailTest, v.over <= 0], ['off', true, false, false, true, true, true], where + 'a device that can take notifications is offered "Turn on"; email is on');
    await p.click('[data-a="push-on"]'); await p.waitForFunction(() => UI.push.status === 'on' && !UI.push.busy); v = await look(p);
    const db = await p.evaluate(() => { const d = DORAX_PREVIEW.db(); return { push: d.push, asked: window.__asked, key: window.__key }; });
    eq([v.on, v.off, v.test, await toastOf(p), db.asked, db.key.length, db.push.length, db.push[0].endpoint, db.push[0].p256dh === KEYS.p256dh, db.push[0].auth === KEYS.auth, /^(Chrome|Browser), /.test(db.push[0].agent), v.over <= 0],
      [false, true, true, await T('Notifications are on for this device.'), 1, 87, 1, 'https://fcm.googleapis.com/fcm/send/this-device', true, true, true, true], where + 'turning on asks the browser once, uses the server’s key and gives the device to the server');
    await p.click('[data-a="push-test"]'); await p.waitForTimeout(150);
    eq([await toastOf(p), (await p.evaluate(() => DORAX_PREVIEW.db().tests)).map(x => x.channel + ':' + x.ok)], [await T('Test sent. It should arrive in a few seconds.'), ['push:true']], where + '"Send a test" asks the server for one');
    await p.click('#mail-setting .switch'); await p.waitForFunction(() => S.user.channels && S.user.channels.email === false && !document.querySelector('[data-a="mail-test"]')); v = await look(p);
    eq([v.mail, v.mailTest, v.off], [false, false, true], where + 'switching email off hides its test and leaves the device alone');
    await p.evaluate(() => saveNow()); await p.waitForFunction(() => { const d = DORAX_PREVIEW.db(); return Object.values(d.rows).some(r => r.data.user.channels && r.data.user.channels.email === false); });
    ok(true, where + 'the choice is saved with the account, which is where the server reads it');
    await p.click('[data-a="push-off"]'); await p.waitForFunction(() => UI.push.status === 'off' && !UI.push.busy);
    eq([(await p.evaluate(() => DORAX_PREVIEW.db().push)).length, await toastOf(p), (await look(p)).on], [0, await T('Notifications are off for this device.'), true], where + 'turning off removes the device from the server');
    eq(o.errors, [], where + 'no errors'); await o.browser.close();
  }
  {
    // logging out takes this browser's device with it
    const o = await card('en', {}), p = o.page;
    await p.click('[data-a="push-on"]'); await p.waitForFunction(() => UI.push.status === 'on' && !UI.push.busy);
    await p.evaluate(() => reallyLogOut()); await p.waitForFunction(() => !UI.session);
    eq([(await p.evaluate(() => DORAX_PREVIEW.db().push)).length, await p.evaluate(() => window.DORAX_PUSH.current())], [0, null], tag + 'logging out removes this device: the next person to use the browser gets nobody’s bills');
    await o.browser.close();
  }
  for (const [name, st, want] of [
    ['the person said no to the browser', { answer: 'denied' }, { click: true, status: 'blocked', toast: 'You did not allow notifications, so nothing was turned on.', text: /blocked in this browser/ }],
    ['notifications already blocked', { perm: 'denied' }, { status: 'blocked', text: /blocked in this browser/ }],
    ['an iPhone showing the site in a tab', { supported: false, install: true }, { status: 'install', text: /Add to Home Screen/ }],
    ['a browser without notifications', { supported: false }, { status: 'unsupported', text: /cannot show notifications/ }],
    ['the browser fails to subscribe', { breaks: true }, { click: true, status: 'off', toast: 'Notifications could not be turned on. Try again.', text: /even when Dorax is closed/ }],
    ['a device that is already on', { sub: true, perm: 'granted' }, { status: 'on', text: /even when Dorax is closed/ }]]) {
    const o = await card('en', st), p = o.page;
    if (want.click) { await p.click('[data-a="push-on"]'); await p.waitForFunction(() => !UI.push.busy && UI.push.known && !document.querySelector('[data-a="push-on"][disabled]')); await p.waitForTimeout(100); }
    const v = await look(p);
    eq([v.status, want.text.test(v.text), v.on, want.toast ? await toastOf(p) : '', (await p.evaluate(() => (DORAX_PREVIEW.db().push || []).length))], [want.status, true, want.status === 'off', want.toast || '', 0], `${tag}${name}: the card says so and nothing is kept on the server`);
    eq(o.errors, [], `${tag}${name}: no errors`); await o.browser.close();
  }
  {
    // a tapped notification opens the reminders: by address when the app was closed
    const o = await open({ lang: 'en', account: 'example', plan: true }), p = o.page;
    await p.evaluate(() => { history.replaceState(null, '', location.pathname + '?open=reminders'); }); await p.reload(); await p.waitForFunction(() => !!UI.session);
    await p.waitForFunction(() => !!UI.drawer, null, { timeout: 4000 }).catch(() => {});
    eq(await p.evaluate(() => [!!UI.drawer, /open=reminders/.test(location.search), !!document.querySelector('.drawer, #drawer-root *')]), [true, false, true], tag + 'arriving from a notification opens the reminders and tidies the address');
    eq(o.errors, [], tag + 'no errors arriving from a notification'); await o.browser.close();
  }
  // the service worker: read as text, since a page opened from disk cannot register one
  const sw = fs.readFileSync(path.join(ROOT, 'app', 'sw.js'), 'utf8');
  ok(/addEventListener\('push'/.test(sw) && /showNotification/.test(sw) && /notificationclick/.test(sw) && !/caches\.|fetch\(|importScripts/.test(sw), 'the service worker shows notifications and opens the app; it caches nothing and fetches nothing');
  ok(/u\.origin === self\.location\.origin/.test(sw), 'and it only ever opens the app’s own address');
  done('qc-reminders');
})().catch(e => { console.error('qc-reminders: Error', e); process.exit(1); });
