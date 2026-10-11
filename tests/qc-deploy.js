// QC of the app the way it is deployed: served over http with the headers of vercel.json (the content security policy among them),
// using the REAL Supabase library (app/vendor/supabase.js) and a config.js that names a project.
// No real project is contacted: the browser's requests to that project's address are answered here, in the shapes Supabase Auth and
// its database API answer in. What this checks, which the other suites (run on the stand-in) cannot:
//   - app/js/server/server.js calls the real library the right way, and reads its answers and error codes right;
//   - the links in the emails and the way back from Google, as the library reads them out of the address;
//   - every request to the database carries the person's own login (row-level security depends on it) and the public key;
//   - nothing the app does is blocked by the content security policy it is served with.
const { chromium } = require('playwright'), path = require('path'), fs = require('fs'), os = require('os'), vm = require('vm');
const { createServer, headersFor } = require('../tools/serve.js');
const { ok, eq, done, visit } = require('./pw.js');
const PROJECT = 'https://qcdoraxproject.supabase.co', KEY = 'sb_publishable_qc_0123456789abcdefghij';
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');

// ---------- the project's answers ----------
const M = { users: new Map(), rows: new Map(), contact: [], log: [], seq: 1, down: false, next: null, google: { email: 'gina@example.org', name: 'Gina Google' }, mails: [] };
const now = () => Math.floor(Date.now() / 1000);
const jwt = u => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', exp: now() + 3600, iat: now() })}.signature`;
const userJson = u => ({ id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, phone: '', email_confirmed_at: u.confirmed ? u.created : undefined, confirmed_at: u.confirmed ? u.created : undefined, last_sign_in_at: u.lastSignIn, new_email: u.newEmail || undefined,
  app_metadata: { provider: u.identities[0] || 'email', providers: u.identities }, user_metadata: u.meta,
  identities: u.identities.map(p => ({ identity_id: 'i-' + p + '-' + u.id, id: u.id, user_id: u.id, provider: p, identity_data: { email: u.email, sub: u.id }, created_at: u.created, updated_at: u.created })), created_at: u.created, updated_at: u.created, is_anonymous: false });
const session = u => { u.lastSignIn = new Date().toISOString(); return { access_token: jwt(u), token_type: 'bearer', expires_in: 3600, expires_at: now() + 3600, refresh_token: 'refresh-' + u.id, user: userJson(u) }; };
const newUser = (email, extra) => { const id = `00000000-0000-4000-8000-${String(M.seq++).padStart(12, '0')}`, u = { id, email, created: new Date().toISOString(), confirmed: false, meta: {}, identities: [], password: null, ...extra }; M.users.set(id, u); return u; };
const byEmail = e => [...M.users.values()].find(u => u.email === String(e || '').toLowerCase());
const who = req => { const m = /^Bearer (.+)$/.exec(req.headers().authorization || ''); if (!m) return null; try { return M.users.get(JSON.parse(Buffer.from(m[1].split('.')[1], 'base64url').toString()).sub) || null; } catch (e) { return null; } };
/** The address of a link in an email, as Supabase writes it once its own page has checked the token: the app's address, the session after #. */
const linkFor = (base, u, type) => `${base}#access_token=${jwt(u)}&expires_at=${now() + 3600}&expires_in=3600&refresh_token=refresh-${u.id}&token_type=bearer&type=${type}`;
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };

async function project(route) {
  const req = route.request(), url = new URL(req.url()), method = req.method(), p = url.pathname;
  if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  let body = null; try { body = req.postDataJSON(); } catch (e) { body = req.postData(); }
  M.log.push({ method, path: p, query: Object.fromEntries(url.searchParams), apikey: req.headers().apikey, auth: req.headers().authorization, prefer: req.headers().prefer, body });
  const json = (status, data) => route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json; charset=utf-8', 'x-supabase-api-version': '2024-01-01' }, body: data === undefined ? '' : JSON.stringify(data) });
  const refuse = (status, code, message, more) => json(status, { code, error_code: code, message: message || code, msg: message || code, ...(more || {}) });
  // Google: the browser leaves for this address; the project sends it back to the app with the session (or the refusal) in the address
  if (p === '/auth/v1/authorize') {
    const back = url.searchParams.get('redirect_to');
    if (M.google === 'cancel') return route.fulfill({ status: 302, headers: { location: `${back}?error=access_denied&error_code=access_denied&error_description=The+user+denied+access#error=access_denied&error_code=access_denied&error_description=The+user+denied+access` } });
    let u = byEmail(M.google.email); if (!u) u = newUser(M.google.email.toLowerCase(), { meta: { full_name: M.google.name, name: M.google.name, email_verified: true } });
    if (!u.confirmed) { u.password = null; u.identities = u.identities.filter(i => i !== 'email'); }
    u.confirmed = true; if (!u.identities.includes('google')) u.identities.push('google');
    return route.fulfill({ status: 302, headers: { location: `${back}#access_token=${jwt(u)}&expires_at=${now() + 3600}&expires_in=3600&provider_token=google-token&refresh_token=refresh-${u.id}&token_type=bearer` } });
  }
  if (M.down) return route.abort('internetdisconnected');
  if (M.next) { const n = M.next; M.next = null; return refuse(n.status, n.code, n.message, n.more); }
  const me = who(req);
  // ----- Auth
  if (p === '/auth/v1/signup') {
    const email = String(body.email).toLowerCase(), had = byEmail(email);
    if (had && had.confirmed) return json(200, { ...userJson({ ...had, id: '99999999-9999-4999-8999-999999999999', identities: [], meta: {} }), identities: [] });      // the server does not say the email is taken; it answers with a person who has no way in
    const u = had || newUser(email); Object.assign(u, { password: body.password, meta: { ...body.data, email, email_verified: false }, identities: ['email'] });
    M.mails.push({ type: 'signup', to: email, redirect: url.searchParams.get('redirect_to'), user: u.id });
    return json(200, { ...userJson(u), confirmation_sent_at: new Date().toISOString() });
  }
  if (p === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
    const u = byEmail(body.email);
    if (!u || !u.password || u.password !== body.password) return refuse(400, 'invalid_credentials', 'Invalid login credentials');
    if (!u.confirmed) return refuse(400, 'email_not_confirmed', 'Email not confirmed');
    return json(200, session(u));
  }
  if (p === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token') { const u = M.users.get(String(body.refresh_token).replace('refresh-', '')); return u ? json(200, session(u)) : refuse(400, 'refresh_token_not_found', 'Invalid Refresh Token'); }
  if (p === '/auth/v1/user' && method === 'GET') return me ? json(200, userJson(me)) : refuse(403, 'bad_jwt', 'invalid claim');
  if (p === '/auth/v1/user' && method === 'PUT') {
    if (!me) return refuse(403, 'session_not_found', 'Session not found');
    if (body.password != null) { if (String(body.password).length < 6) return refuse(422, 'weak_password', 'Password should be at least 6 characters', { weak_password: { reasons: ['length'] } }); if (body.password === me.password) return refuse(422, 'same_password', 'New password should be different from the old password.'); me.password = body.password; }
    if (body.data) me.meta = { ...me.meta, ...body.data };
    if (body.email) { if (byEmail(body.email)) return refuse(422, 'email_exists', 'A user with this email address has already been registered'); me.newEmail = String(body.email).toLowerCase(); M.mails.push({ type: 'email_change', to: me.newEmail, user: me.id }); }
    return json(200, userJson(me));
  }
  if (p === '/auth/v1/recover') { const u = byEmail(body.email); if (u) M.mails.push({ type: 'recovery', to: u.email, redirect: url.searchParams.get('redirect_to'), user: u.id }); return json(200, {}); }
  if (p === '/auth/v1/resend') { const u = byEmail(body.email); if (u && !u.confirmed) M.mails.push({ type: 'signup', to: u.email, redirect: url.searchParams.get('redirect_to'), user: u.id }); return json(200, {}); }
  if (p === '/auth/v1/logout') return route.fulfill({ status: 204, headers: CORS });
  // ----- the database, with what row-level security lets through: a person's own row, and nothing for a visitor
  const eqv = k => (url.searchParams.get(k) || '').replace(/^eq\./, '');
  if (p === '/rest/v1/user_data') {
    if (!me) return refuse(401, '42501', 'permission denied for table user_data');
    const mine = eqv('user_id') === me.id ? M.rows.get(me.id) : null;
    if (method === 'GET') { const cols = (url.searchParams.get('select') || '*').split(','); return json(200, mine ? [Object.fromEntries(cols.map(c => [c, mine[c]]))] : []); }
    if (method === 'POST') { if (body.user_id !== me.id) return refuse(403, '42501', 'new row violates row-level security policy for table "user_data"'); if (M.rows.has(me.id)) return refuse(409, '23505', 'duplicate key value violates unique constraint "user_data_pkey"'); M.rows.set(me.id, { ...body }); return route.fulfill({ status: 201, headers: CORS }); }
    if (method === 'PATCH') { if (!mine || (url.searchParams.has('rev') && mine.rev !== +eqv('rev'))) return json(200, []); Object.assign(mine, body); return json(200, [{ rev: mine.rev }]); }
  }
  if (p === '/rest/v1/contact_messages' && method === 'POST') { M.contact.push({ ...body, user_id: me ? me.id : null }); return route.fulfill({ status: 201, headers: CORS }); }
  if (p === '/rest/v1/rpc/delete_my_account') { if (!me) return refuse(401, '42501', 'permission denied for function delete_my_account'); M.users.delete(me.id); M.rows.delete(me.id); return route.fulfill({ status: 204, headers: CORS }); }
  // ----- reminders: the two device functions of schema.sql, and the function that sends (supabase/functions/reminders)
  if (p === '/rest/v1/rpc/save_push_subscription' || p === '/rest/v1/rpc/remove_push_subscription') {
    if (!me) return refuse(401, '42501', 'permission denied for function');
    M.push = (M.push || []).filter(d => d.endpoint !== body.p_endpoint); if (p.endsWith('save_push_subscription')) M.push.push({ user: me.id, endpoint: body.p_endpoint, p256dh: body.p_p256dh, auth: body.p_auth, agent: body.p_agent });
    return route.fulfill({ status: 204, headers: CORS });
  }
  if (p === '/functions/v1/reminders') {
    if (body.action === 'key') return json(200, { ok: true, publicKey: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8' });
    if (body.action === 'test') return !me ? json(401, { ok: false, code: 'not_logged_in' }) : M.tooSoon ? json(200, { ok: false, code: 'too_soon' }) : json(200, { ok: true, code: '' });
    return json(400, { ok: false, code: 'unknown_action' });
  }
  return refuse(404, 'not_found', 'the test has no answer for ' + method + ' ' + p);
}

(async () => {
  // the two things a deploy rests on, before any browser
  const vercel = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8')), csp = headersFor('/')['Content-Security-Policy'] || '';
  eq([vercel.outputDirectory, vercel.framework, fs.existsSync(path.join(__dirname, '..', vercel.buildCommand.replace('node ', '')))], ['app', null, true], 'vercel.json: plain files from app/, built by a script that exists');
  // one address (owner, 2026-10-05: "my app has a valid domain not the vercel one"): the old vercel.app address sends every path on to dorax.app
  eq((vercel.redirects || []).map(r => [r.source, (r.has || []).map(h => h.type + ':' + h.value).join(), r.destination, r.permanent]), [['/:path*', 'host:dorax-finance.vercel.app', 'https://dorax.app/:path*', true]], 'vercel.json: the vercel.app address forwards every path to dorax.app, for good, and nothing else is redirected');
  ok(/script-src 'self'(;|$)/.test(csp) && !/unsafe-eval/.test(csp) && /connect-src 'self' https:\/\/\*\.supabase\.co/.test(csp) && /frame-ancestors 'none'/.test(csp), 'the policy: scripts only from the site itself, no eval, connections only to Supabase, no framing', csp);
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const leaked = walk(path.join(__dirname, '..', 'app')).filter(f => /\.(js|html|json|webmanifest)$/.test(f) && !/vendor/.test(f)).filter(f => /sb_secret_[A-Za-z0-9_]{8,}|GOCSPX-[A-Za-z0-9_-]{10,}|service_role['"]?\s*[:=]\s*['"]ey/.test(fs.readFileSync(f, 'utf8')));
  eq(leaked, [], 'no secret key and no Google client secret anywhere in app/');
  { const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'app', 'config.js'), 'utf8'), ctx); const c = ctx.window.DORAX_CONFIG;
    ok(c && typeof c.supabaseUrl === 'string' && typeof c.supabaseKey === 'string' && !/^sb_secret_/.test(c.supabaseKey), 'app/config.js has the two values the app reads, and no secret key'); }

  const web = createServer({ files: { '/config.js': `window.DORAX_CONFIG = { supabaseUrl: '${PROJECT}', supabaseKey: '${KEY}' };` } });
  await new Promise(r => web.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + web.address().port + '/';
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce', acceptDownloads: true });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort()); await ctx.route(PROJECT + '/**', project);
  const page = await ctx.newPage(); page.setDefaultTimeout(10000);
  const errors = [], blocked = [];
  page.on('console', m => { const t = m.text(); if (/Content Security Policy|Refused to/.test(t)) blocked.push(t.slice(0, 200)); else if (m.type() === 'error' && !/fonts\.googleapis|ERR_FAILED|net::|Failed to load resource/.test(t)) errors.push(t); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  await page.addInitScript(() => { window.DORAX_LANG = 'en'; document.addEventListener('securitypolicyviolation', e => console.error('Refused to: ' + e.violatedDirective + ' ' + e.blockedURI)); });
  const txt = sel => page.locator(sel).first().innerText();
  const toastText = () => page.evaluate(() => document.getElementById('toast-root').innerText);
  const idle = () => page.waitForFunction(() => typeof UI !== 'undefined' && !(UI.pub && UI.pub.busy) && !SYNC.busy && !SYNC.timer);
  const inApp = () => page.waitForFunction(() => typeof UI !== 'undefined' && !!UI.session);
  const saved = async () => { await page.evaluate(() => saveNow()); await idle(); };
  const go = v => page.evaluate(v => A['pub-go']({ v }), v);
  const login = async (email, pw) => { await go('login'); await page.fill('#au-email', email); await page.fill('#au-pass', pw); await page.click('[data-a="auth-login"]'); await idle(); };
  const logout = async () => { await page.evaluate(() => A.logout()); await page.waitForFunction(() => !UI.session && !WHO && UI.pub.screen === 'landing'); };
  const last = (method, p) => [...M.log].reverse().find(l => l.method === method && l.path === p);

  const res = await page.goto(BASE); const h = res.headers();
  ok(/script-src 'self'/.test(h['content-security-policy'] || '') && h['x-content-type-options'] === 'nosniff' && h['x-frame-options'] === 'DENY' && /noindex/.test(h['x-robots-tag'] || ''), 'the page arrives with the headers of vercel.json');
  await page.waitForSelector('.lp-actions');
  eq(await page.evaluate(() => [SERVER.ready, SERVER.preview, typeof supabase.createClient, STARTED]), [true, false, 'function', true], 'the app runs on the real Supabase library, connected to the project in config.js');
  eq(M.log.length, 0, 'opening the home page asks the project for nothing');

  // 1. sign-up: what is sent, and the screen that follows
  await go('signup'); await page.fill('#au-name', 'Rui'); await page.fill('#au-email', 'Rui@Example.org'); await page.fill('#au-pass', 'RuiSenha2026'); await page.check('#au-accept'); await page.click('[data-a="auth-signup"]'); await idle();
  ok(/Confirm your email/.test(await txt('.auth-card h1')), 'sign-up: the library’s answer leads to "confirm your email"');
  let q = last('POST', '/auth/v1/signup');
  eq([q.body.email, q.body.password, q.body.data, q.query.redirect_to, q.apikey], ['rui@example.org', 'RuiSenha2026', { name: 'Rui', lang: 'en', has_password: true }, BASE, KEY], 'sign-up sends the email, the password, the name and language, where the link should come back to, and the public key');
  ok(!q.body.code_challenge, 'the links are plain ones that work in any browser (no code tied to this browser)');
  eq(await page.evaluate(() => Object.keys(localStorage).filter(k => /auth-token/.test(k)).length), 0, 'nothing is kept in the browser before the email is confirmed');
  await login('rui@example.org', 'RuiSenha2026'); ok(/Confirm your email first/.test(await txt('.auth-card')), 'login before confirming: the server’s "email not confirmed" leads back to the confirm screen');
  await page.click('[data-a="auth-resend"]'); await idle(); q = last('POST', '/auth/v1/resend');
  eq([q.body.type, q.body.email, q.query.redirect_to], ['signup', 'rui@example.org', BASE], 'send again asks for the same kind of email, back to the same address');
  // the link in the email
  const rui = byEmail('rui@example.org'); rui.confirmed = true;
  await visit(page, linkFor(BASE, rui, 'signup')); await page.waitForSelector('#ob-name');
  eq(await page.inputValue('#ob-name'), 'Rui', 'the confirm link logs in and opens the setup, with the name the server kept');
  ok(!/access_token/.test(await page.evaluate(() => location.href)), 'the session is taken out of the address');
  q = last('GET', '/rest/v1/user_data'); eq([q.query.user_id, q.query.select, q.apikey, /^Bearer ey/.test(q.auth), q.auth !== 'Bearer ' + KEY], ['eq.' + rui.id, 'data,rev', KEY, true, true], 'the account is asked for with the person’s own login, not just the public key');
  await page.click('[data-a="onboard-save"]'); await page.click('[data-a="ob-finish"]'); await inApp(); await idle();
  q = last('POST', '/rest/v1/user_data'); eq([q.body.user_id, q.body.rev, q.body.data.user.name, q.body.data.user.email, Array.isArray(q.body.data.transactions)], [rui.id, 1, 'Rui', 'rui@example.org', true], 'the new account is written once, as one document');
  eq([M.rows.size, M.rows.get(rui.id).rev], [1, 1], 'and it is on the server');

  // 2. saving, a reload, a conflict
  await page.evaluate(() => navigate('profile')); await page.fill('#pf-name', 'Rui Costa'); await page.locator('#pf-name').blur(); await saved();
  q = last('PATCH', '/rest/v1/user_data'); eq([q.query.user_id, q.query.rev, q.query.select, q.body.rev, q.body.data.user.name, /return=representation/.test(q.prefer || '')], ['eq.' + rui.id, 'eq.1', 'rev', 2, 'Rui Costa', true], 'a save updates the row only where the rev is the one that was read, and asks what was updated');
  eq(await page.evaluate(() => SYNC.rev), 2, 'the app now holds rev 2');
  await page.reload(); await inApp(); eq(await page.evaluate(() => [S.user.name, UI.route, SYNC.rev]), ['Rui Costa', 'profile', 2], 'reload: the library still has the login, the account comes back');
  M.rows.get(rui.id).data.user.name = 'Rui (other device)'; M.rows.get(rui.id).rev = 3;
  await page.evaluate(() => { S.user.tone = 'plain'; save(); return saveNow(); }); await page.waitForFunction(() => S.user.name === 'Rui (other device)');
  ok(/changed on another device/.test(await toastText()), 'a save that finds a newer rev updates nothing, and the app takes the newer version');
  eq(M.rows.get(rui.id).data.user.name, 'Rui (other device)', 'the newer version on the server is not written over');
  // the server cannot be reached
  M.down = true; await page.fill('#pf-name', 'Rui offline'); await page.locator('#pf-name').blur(); await page.evaluate(() => saveNow()); await page.waitForSelector('.save-badge.warn');
  ok(true, 'no connection: the failed request is read as "not saved yet"'); M.down = false; await page.evaluate(() => window.dispatchEvent(new Event('online'))); await page.waitForFunction(() => savedState() === 'saved');
  eq(M.rows.get(rui.id).data.user.name, 'Rui offline', 'connection back: the change is sent');

  // 3. profile: the ways in come from the server; changing the password proves the current one first
  ok(/Email and password/.test(await txt('#view')) && !(await page.locator('#view .chip:has-text("Google")').count()), 'profile: the server says this account has a password and no Google');
  await page.click('[data-a="pw-open"]'); await page.fill('#pf-pw-cur', 'wrong-one-1'); await page.fill('#pf-pw-new', 'RuiNova2026'); await page.click('[data-a="pw-save"]'); await page.waitForSelector('#view .pw-form .banner.crit');
  ok(/current password is not right/.test(await txt('#view .pw-form .banner.crit')), 'a wrong current password: the server’s refusal is read');
  await page.fill('#pf-pw-cur', 'RuiSenha2026'); await page.click('[data-a="pw-save"]'); await page.waitForFunction(() => !UI.pw);
  q = last('PUT', '/auth/v1/user'); eq([q.body.password, q.body.data, /^Bearer ey/.test(q.auth)], ['RuiNova2026', { has_password: true }, true], 'the new password goes to the server with the person’s login'); eq(rui.password, 'RuiNova2026', 'and is the one that works now');
  await page.fill('#pf-email', 'rui.costa@example.org'); await page.click('[data-a="email-change"]'); await page.waitForFunction(() => S.user.pendingEmail);
  q = last('PUT', '/auth/v1/user'); eq([q.body.email, q.query.redirect_to], ['rui.costa@example.org', BASE], 'email change: asked of the server, with where the link comes back to');
  await page.fill('#pf-name', 'Rui Costa'); await page.locator('#pf-name').blur(); await saved();

  // 4. log out, wrong password, too many tries, log in
  await logout(); eq((last('POST', '/auth/v1/logout') || { query: {} }).query.scope, 'local', 'logging out tells the server, for this browser only (other devices stay logged in)');
  eq(await page.evaluate(() => Object.keys(localStorage).filter(k => /auth-token/.test(k)).length), 0, 'and this browser forgets the login');
  await login('rui@example.org', 'RuiSenha2026'); ok(/Email or password is not right/.test(await txt('.banner.crit')), 'the old password: "invalid credentials" is read');
  M.next = { status: 429, code: 'over_request_rate_limit', message: 'Request rate limit reached' }; await login('rui@example.org', 'RuiNova2026'); ok(/Too many tries/.test(await txt('.banner.crit')), 'too many tries: the server’s limit is said in words');
  await login('rui@example.org', 'RuiNova2026'); await inApp(); ok(/Good to see you again, Rui\./.test(await toastText()), 'login: the account opens, greeted by first name');
  q = last('POST', '/auth/v1/token'); eq([q.query.grant_type, q.body.email, q.apikey], ['password', 'rui@example.org', KEY], 'login sends the email and password with the public key');

  // 5. forgotten password
  await logout(); await go('forgot'); await page.fill('#au-email', 'rui@example.org'); await page.click('[data-a="auth-forgot-send"]'); await idle();
  q = last('POST', '/auth/v1/recover'); eq([q.body.email, q.query.redirect_to], ['rui@example.org', BASE], 'forgot: asks for the email, back to this address'); ok(/Check your email/.test(await txt('.auth-card h1')), 'and says to check the inbox');
  M.next = { status: 429, code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' }; await page.click('[data-a="auth-resend"]'); await idle(); ok(/Too many emails/.test(await txt('.banner.crit')), 'the project’s email limit is said in words');
  await visit(page, linkFor(BASE, rui, 'recovery')); await page.waitForSelector('[data-a="auth-reset-save"]');
  ok(/Choose a new password/.test(await txt('.auth-card h1')) && (await txt('.auth-card')).includes('rui@example.org') && !(await page.evaluate(() => !!UI.session)), 'the recovery link (read by the real library) opens "choose a new password", not the account');
  await page.fill('#au-pass', 'RuiNova2026'); await page.click('[data-a="auth-reset-save"]'); await idle(); ok(/same as the current/.test(await page.evaluate(() => (document.getElementById('au-pass-err') || {}).innerText || '')), 'the server’s "same password" is read');
  await page.fill('#au-pass', 'RuiTres2026'); await page.click('[data-a="auth-reset-save"]'); await inApp(); eq(rui.password, 'RuiTres2026', 'the new password is saved and the account opens');
  // somebody else's recovery link, opened in this browser at a moment the server cannot be reached: the library cannot check it. The person
  // logged in here is never asked to set a password with it, and the link does not stay in the address.
  { const other = newUser('outro@example.org', { confirmed: true, identities: ['email'], password: 'OutroSenha2026' });
    M.down = true; await visit(page, linkFor(BASE, other, 'recovery'));
    eq(await page.evaluate(() => [RECOVERING, UI.pub.screen === 'reset', /access_token|type=recovery/.test(location.href)]), [false, false, false], 'an unverified recovery link: no "choose a new password", nothing left in the address');
    await page.waitForSelector('[data-a="gate-retry"]', { timeout: 60000 });       // the library tries a read a few times before giving up
    M.down = false; await page.click('[data-a="gate-retry"]'); await inApp(); eq([await page.evaluate(() => S.user.email), rui.password, other.password], ['rui@example.org', 'RuiTres2026', 'OutroSenha2026'], 'the person logged in here keeps their account and their password; so does the other'); }
  // a link that no longer works, as Supabase reports it
  await logout(); await visit(page, BASE + '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  ok(/no longer works/.test(await txt('.banner.crit')) && !/error/.test(await page.evaluate(() => location.hash)), 'an expired link: the login says so, and the address is cleaned');

  // 6. Google: out to the project, back with a session
  await go('signup');
  eq(await page.evaluate(() => { const b = document.querySelector('[data-a="auth-google"]'), g = b.querySelector('.g-mark svg'), cs = getComputedStyle(b), r = g.getBoundingClientRect();
    return [[...g.querySelectorAll('path')].map(p => p.getAttribute('fill')).join(), g.getAttribute('viewBox'), Math.round(r.width) + 'x' + Math.round(r.height), cs.backgroundColor, cs.borderTopColor, cs.color, b.querySelector('.g-mark').getAttribute('aria-hidden'), b.textContent.trim()]; }),
    ['#EA4335,#4285F4,#FBBC05,#34A853,none', '0 0 48 48', '20x20', 'rgb(19, 19, 20)', 'rgb(142, 145, 143)', 'rgb(227, 227, 227)', 'true', 'Continue with Google'], 'the Google button: Google’s own G, untouched, at 20px, on Google’s dark button; the name read out is the text');
  await Promise.all([page.waitForURL(u => !/authorize/.test(u.href) && u.href.startsWith(BASE)), page.click('[data-a="auth-google"]')]); await page.waitForSelector('#ob-name');
  q = [...M.log].reverse().find(l => l.path === '/auth/v1/authorize'); eq([q.query.provider, q.query.redirect_to], ['google', BASE], 'Google: the browser leaves for the project’s Google address, to come back here');
  eq(await page.inputValue('#ob-name'), 'Gina Google', 'back from Google: the setup opens with the name Google gave');
  await page.click('[data-a="onboard-save"]'); await page.click('[data-a="ob-finish"]'); await inApp(); await idle(); await page.evaluate(() => navigate('profile'));
  ok(await page.locator('#view .chip:has-text("Google")').count() === 1 && !/Email and password/.test(await txt('#view')), 'profile: the server says Google only');
  await page.click('[data-a="pw-open"]'); eq(await page.locator('#pf-pw-cur').count(), 0, 'no current password is asked of a Google-only account');
  await page.fill('#pf-pw-new', 'GinaSenha2026'); await page.click('[data-a="pw-save"]'); await page.waitForFunction(() => !UI.pw); ok(/Email and password/.test(await txt('#view')), 'after choosing a password the profile shows both ways in');
  await logout(); M.google = 'cancel'; await go('login'); await Promise.all([page.waitForURL(u => u.href.startsWith(BASE)), page.click('[data-a="auth-google"]')]); await page.waitForFunction(() => typeof STARTED !== 'undefined' && STARTED);
  ok(/Google was cancelled/.test(await txt('.banner')) && !/error/.test(await page.evaluate(() => location.href)), 'Google cancelled: back on the login with a notice, and a clean address');
  M.google = { email: 'rui@example.org', name: 'Rui G' }; await Promise.all([page.waitForURL(u => !/authorize/.test(u.href) && u.href.startsWith(BASE)), page.click('[data-a="auth-google"]')]); await inApp();
  eq(await page.evaluate(() => S.user.name), 'Rui Costa', 'Google with an email that has an account opens that account'); await page.evaluate(() => navigate('profile'));
  ok(/Email and password/.test(await txt('#view')) && await page.locator('#view .chip:has-text("Google")').count() === 1, 'and the profile shows both ways in');

  // 7. the files the app reads and writes, under the content security policy
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dorax-deploy-'));
  { const c = { console }; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'app', 'vendor', 'xlsx.min.js'), 'utf8') + '\nthis.X = XLSX;', c);
    const rows = [['Data', 'Historico', 'Valor', 'Saldo'], ['02/09/2026', 'TED ENVIADA', '-1.000,00', '3.000,00'], ['18/09/2026', 'PIX RECEBIDO', '1.500,00', '4.500,00']], wb = c.X.utils.book_new(); c.X.utils.book_append_sheet(wb, c.X.utils.aoa_to_sheet(rows), 'Extrato');
    fs.writeFileSync(path.join(tmp, 'extrato.xls'), Buffer.from(c.X.write(wb, { bookType: 'biff8', type: 'array' })));
    const xs = [50, 130, 380, 470], text = []; rows.forEach((r, i) => r.forEach((v, k) => text.push(`BT /F1 10 Tf ${xs[k]} ${740 - i * 18} Td (${v}) Tj ET`)));
    const stream = text.join('\n'), objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
    let out = '%PDF-1.4\n'; const at = []; objs.forEach((o, i) => { at.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = out.length; out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + at.map(a => String(a).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    fs.writeFileSync(path.join(tmp, 'extrato.pdf'), out, 'latin1'); }
  await page.evaluate(() => { S.accounts.push({ id: newId('a'), name: 'Conta PJ', institution: 'Banco', type: 'checking', currency: 'BRL', scope: 'business', purpose: '', opening: 0 }); render(); });
  for (const f of ['extrato.xls', 'extrato.pdf']) {
    await page.evaluate(() => { UI.conv = null; navigate('converter'); }); await page.locator('[data-a="conv-start"]').first().click();
    await page.setInputFiles('#stmt-file', path.join(tmp, f));
    await page.waitForFunction(() => UI.conv && !UI.conv.busy && (UI.conv.csv || UI.conv.error || UI.conv.rows), null, { timeout: 20000 });
    eq(await page.evaluate(() => [UI.conv.error || null, !!(UI.conv.csv || UI.conv.rows)]), [null, true], `${f}: read in the browser (its reader is loaded from the site itself, which the policy allows)`);
  }
  await page.evaluate(() => { UI.conv = null; navigate('settings'); });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-a="export-json"]')]); const bk = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  eq([bk.app, bk.state.user.name, /RuiTres2026|access_token|refresh/.test(JSON.stringify(bk))], ['dorax-finance', 'Rui Costa', false], 'the backup downloads, and holds no password and no login token');
  fs.rmSync(tmp, { recursive: true, force: true });

  // 7b. notifications and reminder emails, on the real library and in a real browser
  {
    const dev = { endpoint: 'https://fcm.googleapis.com/fcm/send/qc-device', p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', auth: 'BTBZMqHH6r4Tts7J_aSIgg', agent: 'Chrome, Linux' };
    eq(await page.evaluate(() => SERVER.pushKey()), { ok: true, key: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8' }, 'reminders: the app reads the push key from the function');
    q = last('POST', '/functions/v1/reminders'); eq([q.body, q.apikey, /^Bearer ey/.test(q.auth || '')], [{ action: 'key' }, KEY, true], 'the function is called with the public key and the person’s login');
    eq(await page.evaluate(d => SERVER.pushSave(d).then(r => r.ok), dev), true, 'a device is given to the server');
    q = last('POST', '/rest/v1/rpc/save_push_subscription'); eq([q.body, /^Bearer ey/.test(q.auth || ''), M.push.map(d => d.user)], [{ p_endpoint: dev.endpoint, p_p256dh: dev.p256dh, p_auth: dev.auth, p_agent: dev.agent }, true, [rui.id]], 'through save_push_subscription, with the four values the function of schema.sql takes');
    eq([await page.evaluate(() => SERVER.remindTest('push')), await page.evaluate(() => SERVER.remindTest('email')), last('POST', '/functions/v1/reminders').body], [{ ok: true, results: [] }, { ok: true, results: [] }, { action: 'test', channel: 'email' }], 'a test is asked of the function, for a notification or an email (with what each device’s push service answered, none here)');
    M.tooSoon = true; const soon = await page.evaluate(() => SERVER.remindTest('push')); M.tooSoon = false;
    eq(soon, { ok: false, code: 'too_soon', results: [] }, 'a refused test is read with its reason, so the app can say why');
    eq([await page.evaluate(d => SERVER.pushRemove(d.endpoint).then(r => r.ok), dev), last('POST', '/rest/v1/rpc/remove_push_subscription').body, M.push.length], [true, { p_endpoint: dev.endpoint }, 0], 'and a device is taken back through remove_push_subscription');
    // The background script, served with the site's own headers, in a browser that can show notifications (the full Chromium; the
    // windowless one the other checks use refuses them): it registers, and a message the server would push becomes a notification.
    let full = null; try { full = await chromium.launch({ channel: 'chromium' }); } catch (e) { console.log('  note: no full Chromium here; the notification itself was not shown (' + String(e).split('\n')[0].slice(0, 120) + ')'); }
    if (full) {
      const c2 = await full.newContext({ locale: 'en-US' }); await c2.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort()); await c2.route(PROJECT + '/**', project);
      await c2.grantPermissions(['notifications'], { origin: new URL(BASE).origin });
      const p2 = await c2.newPage(), blocked2 = []; p2.on('console', m => { if (/Content Security Policy|Refused to/.test(m.text())) blocked2.push(m.text().slice(0, 200)); });
      await p2.goto(BASE); await p2.waitForFunction(() => typeof STARTED !== 'undefined' && STARTED);
      const reg = await p2.evaluate(async () => { try { const before = await PUSH.status(); const r = await navigator.serviceWorker.register('sw.js'); await navigator.serviceWorker.ready; return { scope: r.scope, perm: Notification.permission, before }; } catch (e) { return { error: String(e) }; } });
      eq(reg, { scope: BASE, perm: 'granted', before: 'off' }, 'the background script registers for the whole site; a browser with no subscription yet is offered "Turn on"');
      const cdp = await c2.newCDPSession(p2), regs = []; cdp.on('ServiceWorker.workerRegistrationUpdated', e => regs.push(...e.registrations)); await cdp.send('ServiceWorker.enable'); await p2.waitForTimeout(400);
      const mine = regs.filter(r => r.scopeURL === BASE && !r.isDeleted).pop();
      const pushed = async data => { await cdp.send('ServiceWorker.deliverPushMessage', { origin: new URL(BASE).origin, registrationId: mine.registrationId, data }); await p2.waitForTimeout(500);
        return p2.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); const ns = await r.getNotifications(); const out = ns.map(n => ({ title: n.title, body: n.body, tag: n.tag, lang: n.lang, url: n.data && n.data.url, icon: new URL(n.icon).pathname })); ns.forEach(n => n.close()); return out; }); };
      const body = 'Rent: R$ 1.800,00, due 05/10 (due today).\nInternet: R$ 110,00, due 12/10 (in 7 days).';
      eq(await pushed(JSON.stringify({ title: '2 things to look at today', body, url: BASE + '?open=reminders', tag: 'dorax-2026-10-05', lang: 'en' })), [{ title: '2 things to look at today', body, tag: 'dorax-2026-10-05', lang: 'en', url: BASE + '?open=reminders', icon: '/assets/icons/icon-192.png' }],
        'a pushed message is shown as a notification: its title, its lines, the app’s icon, and where a tap goes');
      eq((await pushed('not json at all')).map(n => [n.title, n.body]), [['Dorax Finance', 'not json at all']], 'a message in an unexpected shape is still shown as plain words, under the app’s name');
      // switching on for real needs Google's push service, which a test browser has no account with: the app must say so and keep nothing
      const on = await p2.evaluate(() => Promise.race([PUSH.on(), new Promise(r => setTimeout(() => r({ timeout: true }), 8000))]));
      ok(on.timeout || on.ok === true || on.why === 'failed', 'switching on without a push service to subscribe to ends in an answer, not an error', on);
      if (on.ok !== true) eq((M.push || []).length, 0, 'and no device is kept on the server when the browser could not subscribe');
      eq(blocked2, [], 'nothing of it is blocked by the content security policy');
      await full.close();
    }
  }

  // 8. the contact form, and deleting the account
  await page.evaluate(() => A.contact()); await page.fill('#ct-message', 'A question about my plan, please.'); await page.click('#overlay [data-a="contact-send"]'); await page.waitForSelector('#contact-done');
  q = last('POST', '/rest/v1/contact_messages'); eq([Object.keys(q.body).sort(), q.body.topic, /return=representation/.test(q.prefer || ''), Object.keys(q.query).filter(k => k === 'select')], [['email', 'lang', 'message', 'topic'], 'question', false, []], 'contact: exactly the four columns the app may write, and it does not ask to read the row back (it is not allowed to)');
  await page.evaluate(() => { UI.drawer = null; renderOverlay(); navigate('profile'); });
  await page.click('[data-a="user-delete"]'); await page.fill('#modal-word', 'delete'); await page.click('#modal-ok'); await page.waitForSelector('.lp-actions');
  q = last('POST', '/rest/v1/rpc/delete_my_account'); ok(q && /^Bearer ey/.test(q.auth), 'delete account: the function is called with the person’s login');
  eq([!!byEmail('rui@example.org'), M.rows.has(rui.id), await page.evaluate(() => Object.keys(localStorage).filter(k => /auth-token/.test(k)).length)], [false, false, 0], 'the account is gone from the server and the login from this browser');

  // every request to the project carried the public key, and never anything else as a key
  eq([...new Set(M.log.filter(l => l.path !== '/auth/v1/authorize').map(l => l.apikey))], [KEY], 'every request carries the public key');
  eq(M.log.filter(l => l.path.startsWith('/rest/v1/user_data') || l.path.includes('/rpc/')).filter(l => !/^Bearer ey/.test(l.auth || '')).length, 0, 'no request for account data is made without a person’s login');
  eq(blocked, [], 'nothing was blocked by the content security policy');
  eq(errors, [], 'no console errors');
  await browser.close(); await new Promise(r => web.close(r));
  done('qc-deploy');
})().catch(e => { console.error(e); process.exit(1); });
