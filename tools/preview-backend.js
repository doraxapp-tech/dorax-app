/* Dorax Finance — a stand-in for the server, for the tests and for the one-file preview. NOT part of the app: nothing in app/ loads it.

   The app talks to Supabase through app/js/server/server.js. When a page defines window.DORAX_SUPABASE before the app starts, server.js
   uses that instead of the real library. This file defines it: the same calls, answered from this browser's own storage, so the whole app
   (sign-up, confirming an email, logging in, Google, a forgotten password, saving, two tabs, a lost connection) can be run without a
   network. It answers the way Supabase does where the app depends on it: the same error codes, the same events, a link in the address.

   What it is not: a server. Everything lives in this browser; "emails" go to a list (the outbox) instead of an inbox; "Google" answers
   with the account the test chose. Passwords are kept only as a digest, and only so that a login can be checked.

   The tests steer it through window.DORAX_PREVIEW (see the end of the file). Options are read from window.DORAX_PREVIEW_OPTIONS:
     confirmEmail      true: a new account gets a link to open first (as a Supabase project does by default). false: it is in at once.
     secureEmailChange true: changing the email sends a link to both addresses (the Supabase default); both have to be opened.
     google            { email, name }: the account Google answers with.
     oauthReload       true: after Google the page loads again, as it does coming back from Google's own page.
     delay             milliseconds every answer takes. */
(function () {
  const OPT_KEY = 'dorax.preview.options';       // options changed in the middle of a test (DORAX_PREVIEW.set) hold for the tab, reloads included
  const OPT = Object.assign({ confirmEmail: false, secureEmailChange: true, google: { email: 'preview@example.com', name: 'Preview' }, oauthReload: false, delay: 0 }, window.DORAX_PREVIEW_OPTIONS || {},
    (() => { try { return JSON.parse(sessionStorage.getItem(OPT_KEY) || '{}'); } catch (e) { return {}; } })());
  const DB_KEY = 'dorax.preview.db', SESSION_KEY = 'sb-preview-auth-token';
  // ----- storage: this browser's, or memory where a page is not allowed any
  const mem = {};
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return k in mem ? mem[k] : null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } }, del(k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } } };
  const fresh = () => ({ users: {}, rows: {}, contact: [], outbox: [], seq: 1 });
  const load = () => { try { return Object.assign(fresh(), JSON.parse(store.get(DB_KEY) || '{}')); } catch (e) { return fresh(); } };
  const keep = db => store.set(DB_KEY, JSON.stringify(db));
  const digest = s => { let h = 0xcbf29ce484222325n; for (const c of unescape(encodeURIComponent('dorax:' + s))) { h ^= BigInt(c.charCodeAt(0)); h = (h * 0x100000001b3n) & 0xffffffffffffffffn; } return h.toString(16); };
  const uid = db => { const n = db.seq++; return '00000000-0000-4000-8000-' + String(n).padStart(12, '0'); };
  const byEmail = (db, email) => Object.values(db.users).find(u => u.email === String(email || '').toLowerCase());
  /** The person as the app sees them: what supabase-js calls a User. */
  const publicUser = u => ({ id: u.id, email: u.email, new_email: u.newEmail || undefined, last_sign_in_at: u.lastSignIn || null, email_confirmed_at: u.confirmed ? u.created : null,
    user_metadata: Object.assign({}, u.meta), app_metadata: { provider: u.google && !u.pw ? 'google' : 'email', providers: [u.pw && 'email', u.google && 'google'].filter(Boolean) },
    identities: [u.emailIdentity && { provider: 'email' }, u.google && { provider: 'google' }].filter(Boolean) });
  const err = (code, status, message) => ({ data: { user: null, session: null }, error: { code, status: status || 400, message: message || code, name: 'AuthApiError' } });
  const offline = () => ({ data: { user: null, session: null }, error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 } });

  // ----- who is logged in, and telling the app about it
  const listeners = new Set();
  const sessionOf = () => { const id = store.get(SESSION_KEY), u = id && load().users[id]; return u ? { access_token: 'preview-session-' + u.id, token_type: 'bearer', user: publicUser(u) } : null; };
  const emit = (event, session) => setTimeout(() => listeners.forEach(cb => { try { cb(event, session === undefined ? sessionOf() : session); } catch (e) { console.error(e); } }), 0);
  const logIn = (db, u) => { u.lastSignIn = new Date().toISOString(); keep(db); store.set(SESSION_KEY, u.id); };
  // the same account in another tab: this tab hears about a login or a logout there
  try { window.addEventListener('storage', e => { if (e.key === SESSION_KEY) emit(e.newValue ? 'SIGNED_IN' : 'SIGNED_OUT'); }); } catch (e) { /* no window events here */ }

  // ----- emails: a list instead of an inbox. A link is the page's own address with a token in it, the way Supabase writes its links.
  // The token says whose it is in its middle part, the way a real one does (the app reads that to know who a recovery link is for).
  const b64url = o => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  function mail(db, to, type, userId, extra) { const m = Object.assign({ to, type, userId, token: 'preview-' + type + '-' + db.seq++ + '.' + b64url({ sub: userId }) + '.x', sentAt: Date.now(), used: false, expired: false }, extra || {}); db.outbox.push(m); return m; }
  const linkOf = m => location.origin === 'null' || location.protocol === 'file:' ? location.href.split('#')[0] + '#access_token=' + m.token + '&type=' + m.type : location.origin + location.pathname + '#access_token=' + m.token + '&type=' + m.type;
  // A link was opened: read it out of the address now, before the app looks, the way the real library does while it starts.
  let arrivedBy = null;
  (function openLink() {
    let p; try { p = new URLSearchParams(location.hash.replace(/^#/, '')); } catch (e) { return; }
    const tok = p.get('access_token'); if (!tok || !/^preview-/.test(tok)) return;
    const db = load(), m = db.outbox.find(x => x.token === tok), u = m && db.users[m.userId];
    const say = hash => { try { history.replaceState(null, '', location.pathname + location.search + hash); } catch (e) { /* the address stays */ } };
    if (!m || !u || m.used || m.expired) return say('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
    m.used = true;
    if (m.type === 'email_change' || m.type === 'email_change_current') {
      const other = db.outbox.find(x => x.pair === m.pair && x !== m);
      if (other && !other.used) { keep(db); return say('#message=Confirmation+link+accepted.+Please+proceed+to+confirm+link+sent+to+the+other+email'); }
      if (u.newEmail) { u.email = u.newEmail; u.newEmail = null; }
    }
    u.confirmed = true; if (m.type === 'signup' && u.pw) u.emailIdentity = true;
    logIn(db, u); arrivedBy = m.type;       // the address keeps its "type=recovery" until the app has read it; getSession() tidies it
  })();

  // ----- what the tests can make go wrong
  // { code, times }: the next answers fail with this code ('network': the server cannot be reached). Kept for the tab, so that it also
  // holds for the answers right after a reload.
  const FAIL_KEY = 'dorax.preview.fail'; let failMem = null;
  const failing = () => { try { return JSON.parse(sessionStorage.getItem(FAIL_KEY) || 'null'); } catch (e) { return failMem; } };
  const setFailing = f => { failMem = f; try { if (f) sessionStorage.setItem(FAIL_KEY, JSON.stringify(f)); else sessionStorage.removeItem(FAIL_KEY); } catch (e) { /* memory only */ } };
  const broken = () => { const f = failing(); if (!f) return null; setFailing(--f.times <= 0 ? null : f); return f.code === 'network' ? offline() : err(f.code, f.code === 'over_request_rate_limit' || f.code === 'over_email_send_rate_limit' ? 429 : 400); };
  const answer = fn => new Promise(done => setTimeout(() => { const b = broken(); done(b || fn()); }, OPT.delay));

  const auth = {
    onAuthStateChange(cb) { listeners.add(cb); setTimeout(() => cb('INITIAL_SESSION', sessionOf()), 0); return { data: { subscription: { unsubscribe() { listeners.delete(cb); } } } }; },
    getSession: () => answer(() => {
      if (arrivedBy) { const type = arrivedBy; arrivedBy = null; try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* the address stays */ } emit(type === 'recovery' ? 'PASSWORD_RECOVERY' : 'SIGNED_IN'); }
      return { data: { session: sessionOf() }, error: null };
    }),
    signUp: ({ email, password, options }) => answer(() => {
      const db = load(); email = String(email).toLowerCase(); const meta = (options && options.data) || {};
      if (String(password).length < 6) return err('weak_password', 422);
      const had = byEmail(db, email);
      if (had && had.confirmed) return OPT.confirmEmail ? { data: { user: { id: uid(db), email, identities: [], user_metadata: {} }, session: null }, error: null } : err('user_already_exists', 422);
      let u = had; if (!u) { u = { id: uid(db), created: new Date().toISOString() }; db.users[u.id] = u; }
      Object.assign(u, { email, pw: digest(password), emailIdentity: true, google: !!u.google, confirmed: !OPT.confirmEmail, meta: Object.assign({}, u.meta, meta) });
      if (OPT.confirmEmail) { mail(db, email, 'signup', u.id); keep(db); return { data: { user: publicUser(u), session: null }, error: null }; }
      logIn(db, u); emit('SIGNED_IN'); return { data: { user: publicUser(u), session: sessionOf() }, error: null };
    }),
    resend: ({ email }) => answer(() => { const db = load(), u = byEmail(db, email); if (u && !u.confirmed) { mail(db, u.email, 'signup', u.id); keep(db); } return { data: {}, error: null }; }),
    signInWithPassword: ({ email, password }) => answer(() => {
      const db = load(), u = byEmail(db, email);
      if (!u || !u.pw || u.pw !== digest(password)) return err('invalid_credentials', 400, 'Invalid login credentials');
      if (!u.confirmed) return err('email_not_confirmed', 400, 'Email not confirmed');
      logIn(db, u); emit('SIGNED_IN'); const s = sessionOf(); return { data: { user: s.user, session: s }, error: null };
    }),
    signInWithOAuth: () => answer(() => {
      const db = load(), g = OPT.google, email = String(g.email).toLowerCase(); let u = byEmail(db, email);
      // Google has confirmed the address. An account that already uses it is the same person: Google becomes one more way in. A sign-up with
      // that address that was never confirmed loses its password: nobody proved the address was theirs (what Supabase does when it links).
      if (u && !u.confirmed) { u.pw = null; u.emailIdentity = false; if (u.meta) u.meta.has_password = false; }
      if (!u) { u = { id: uid(db), created: new Date().toISOString(), email, pw: null, emailIdentity: false, meta: {} }; db.users[u.id] = u; }
      Object.assign(u, { google: true, confirmed: true, meta: Object.assign({ full_name: g.name, name: g.name }, u.meta) });
      logIn(db, u);
      if (OPT.oauthReload) setTimeout(() => location.reload(), 0); else emit('SIGNED_IN');
      return { data: { provider: 'google', url: location.href }, error: null };
    }),
    // like the real library: this device forgets the login even when the server cannot be told
    signOut: () => new Promise(done => setTimeout(() => { const b = broken(); const had = store.get(SESSION_KEY); store.del(SESSION_KEY); if (had) emit('SIGNED_OUT', null); done(b ? { error: b.error } : { error: null }); }, OPT.delay)),
    resetPasswordForEmail: email => answer(() => { const db = load(), u = byEmail(db, email); if (u) { mail(db, u.email, 'recovery', u.id); keep(db); } return { data: {}, error: null }; }),
    updateUser: attrs => answer(() => {
      const db = load(), id = store.get(SESSION_KEY), u = id && db.users[id]; if (!u) return err('session_not_found', 403);
      if (attrs.password != null) { if (String(attrs.password).length < 6) return err('weak_password', 422); if (u.pw === digest(attrs.password)) return err('same_password', 422); u.pw = digest(attrs.password); }
      if (attrs.data) u.meta = Object.assign({}, u.meta, attrs.data);
      if (attrs.email) {
        const to = String(attrs.email).toLowerCase(); if (byEmail(db, to)) return err('email_exists', 422);
        u.newEmail = to; const pair = db.seq++; mail(db, to, 'email_change', u.id, { pair }); if (OPT.secureEmailChange) mail(db, u.email, 'email_change_current', u.id, { pair });
      }
      keep(db); emit('USER_UPDATED'); return { data: { user: publicUser(u) }, error: null };
    }),
  };

  // ----- the two tables and the one function, with the rules supabase/schema.sql gives them: a person reads and writes their own row only
  function from(table) {
    const q = { op: 'select', cols: '*', where: {}, body: null, single: false, returning: false };
    const run = () => {
      const db = load(), me = store.get(SESSION_KEY), fail = (code, message) => ({ data: null, error: { code, message: message || code, status: 400 } });
      if (table === 'contact_messages') {
        if (q.op !== 'insert') return { data: [], error: null };       // nobody reads it through the app
        const m = q.body; if (!m || String(m.message || '').length < 10 || String(m.message).length > 5000 || !m.email) return fail('23514', 'violates check constraint');
        db.contact.push(Object.assign({ created_at: new Date().toISOString(), user_id: me || null }, m)); keep(db); return { data: null, error: null };
      }
      if (table !== 'user_data') return fail('42P01', 'relation does not exist');
      const mine = me && q.where.user_id === me ? db.rows[me] : null;       // somebody else's row is invisible, as row-level security makes it
      if (q.op === 'select') { const row = mine ? Object.fromEntries(q.cols.split(',').map(c => c.trim()).map(c => [c, mine[c]])) : null; return { data: q.single ? row : row ? [row] : [], error: null }; }
      if (q.op === 'insert') { if (!me || q.body.user_id !== me) return fail('42501', 'new row violates row-level security policy'); if (db.rows[me]) return fail('23505', 'duplicate key value'); db.rows[me] = Object.assign({ updated_at: new Date().toISOString() }, q.body); keep(db); return { data: null, error: null }; }
      if (q.op === 'update') { if (!mine || (q.where.rev != null && mine.rev !== q.where.rev)) return { data: [], error: null }; Object.assign(mine, q.body); keep(db); return { data: q.returning ? [{ rev: mine.rev }] : null, error: null }; }
      return fail('unknown');
    };
    const b = {
      select(cols) { if (q.op === 'select') q.cols = cols || '*'; else q.returning = true; return b; },
      insert(body) { q.op = 'insert'; q.body = JSON.parse(JSON.stringify(body)); return b; },
      update(body) { q.op = 'update'; q.body = JSON.parse(JSON.stringify(body)); return b; },
      eq(col, v) { q.where[col] = v; return b; },
      maybeSingle() { q.single = true; return b; },
      // 'lost': the request does arrive and is carried out, and only its answer never comes back (the connection dropped at that moment)
      then(ok, no) { return new Promise(done => setTimeout(() => { const f = failing(), lost = f && f.code === 'lost'; if (lost) { setFailing(--f.times <= 0 ? null : f); run(); } const br = lost ? true : broken(); done(br ? { data: null, error: new TypeError('Failed to fetch') } : run()); }, OPT.delay)).then(ok, no); },
    };
    return b;
  }
  const rpc = name => answer(() => {
    if (name !== 'delete_my_account') return { data: null, error: { code: 'PGRST202', message: 'function not found', status: 404 } };
    const db = load(), me = store.get(SESSION_KEY); if (!me || !db.users[me]) return { data: null, error: { code: '28000', message: 'not logged in', status: 401 } };
    delete db.users[me]; delete db.rows[me]; db.contact = db.contact.filter(m => m.user_id !== me); keep(db); return { data: null, error: null };
  });

  window.DORAX_SUPABASE = { auth, from, rpc };
  /** For the tests. */
  window.DORAX_PREVIEW = {
    options: OPT,
    /** Changes options from here on, reloads of this tab included. */
    set(o) { Object.assign(OPT, o); try { sessionStorage.setItem(OPT_KEY, JSON.stringify(Object.assign(JSON.parse(sessionStorage.getItem(OPT_KEY) || '{}'), o))); } catch (e) { /* this page only */ } },
    db: load,
    /** The emails "sent" so far, newest last; each with the link it carries. */
    outbox: () => load().outbox.map(m => Object.assign({ link: linkOf(m) }, m)),
    /** Makes a link too old to work. */
    expire(token) { const db = load(), m = db.outbox.find(x => x.token === token); if (m) { m.expired = true; keep(db); } },
    /** The next `times` answers fail: 'network' (the server cannot be reached), 'lost' (a save is carried out but its answer is lost), or any error code. */
    failNext(code, times) { setFailing({ code, times: times || 1 }); },
    works() { setFailing(null); },
    /** Changes the saved account behind the app's back, as another device would. */
    touch(fn) { const db = load(), me = store.get(SESSION_KEY), row = db.rows[me]; if (!row) return false; fn(row.data); row.rev += 1; keep(db); return true; },
    /** Puts an account straight into the store and logs it in: { email, name, data }. For tests that start from a full account. */
    seed({ email, name, data, password }) {
      const db = load(); let u = byEmail(db, email); if (!u) { u = { id: uid(db), created: new Date().toISOString() }; db.users[u.id] = u; }
      Object.assign(u, { email: email.toLowerCase(), pw: digest(password || 'seeded-pass-1'), emailIdentity: true, google: false, confirmed: true, meta: { name: name || '', has_password: true } });
      if (data) db.rows[u.id] = { user_id: u.id, data: JSON.parse(JSON.stringify(data)), rev: 1, updated_at: new Date().toISOString() };
      logIn(db, u); return u.id;
    },
    reset() { store.del(DB_KEY); store.del(SESSION_KEY); },
  };
})();
