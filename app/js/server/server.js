/* Dorax Finance — the server. Everything the app asks of Supabase goes through this one file: who is logged in, the account's data,
   the contact form. No other file talks to Supabase, so changing how the server is reached means changing this file only.

   Which Supabase project: app/config.js (two public values: the project's address and its public key).
   What the project must have: supabase/schema.sql, run once in the Supabase SQL editor. See DEPLOY.md.

   Every call answers { ok: true, ... } or { ok: false, code }. The codes are Supabase's own (invalid_credentials, email_not_confirmed,
   over_request_rate_limit, weak_password ...) plus three of ours: 'network' (the server could not be reached), 'conflict' (the account was
   changed somewhere else since it was read) and 'unknown'. The screens turn a code into words (features/auth/auth.actions.js). */

const SERVER = (() => {
  const cfg = (typeof window !== 'undefined' && window.DORAX_CONFIG) || {};
  // What the address said when the page opened, read before the Supabase library takes it away: a link from a "forgot my password" email
  // is told apart from any other way in, a link that failed (too old, already used, or Google cancelled) says why, and the first of the two
  // links of an email change (one goes to each address) says the other one is still to be opened.
  // A recovery link counts only when it carries a login (the part after # that Supabase writes), and it is remembered WHOSE login it is:
  // the page asks for a new password only if the person the library then says is logged in is that one (app/boot.js). An address that
  // merely says "type=recovery" asks nobody for anything.
  const hash = new URLSearchParams((location.hash || '').replace(/^#/, '')), query = new URLSearchParams((location.search || '').replace(/^\?/, ''));
  const tokenOwner = tok => { try { return JSON.parse(atob(String(tok).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub || null; } catch (e) { return null; } };
  const arrived = { recovery: hash.get('type') === 'recovery' && !!hash.get('access_token'), owner: hash.get('access_token') ? tokenOwner(hash.get('access_token')) : null,
    error: hash.get('error_code') || hash.get('error') || query.get('error_code') || query.get('error') || null,
    // what kind of failure it was: a link from an email that is too old or was used ('link'), the person saying no on Google's page
    // ('cancelled'), or anything else, which is a login that the server or Google could not complete ('failed')
    failure: (codes => !codes.length ? null : codes.includes('otp_expired') ? 'link' : codes.includes('access_denied') ? 'cancelled' : 'failed')([hash.get('error_code'), hash.get('error'), query.get('error_code'), query.get('error')].filter(Boolean)),
    halfway: !hash.get('access_token') && /proceed to confirm/i.test(hash.get('message') || '') };
  if (arrived.error || arrived.halfway) try { history.replaceState(null, '', location.pathname); } catch (e) { /* a sandboxed frame keeps its address */ }

  // A stand-in can be handed over before the app starts (window.DORAX_SUPABASE): the tests do, and so does the preview build. It speaks the
  // same language as the Supabase library, so everything below runs the same against either.
  let client = (typeof window !== 'undefined' && window.DORAX_SUPABASE) || null;
  const preview = !!client;
  if (!client && cfg.supabaseUrl && cfg.supabaseKey && typeof supabase !== 'undefined' && supabase.createClient)
    client = supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

  const here = () => location.origin + location.pathname;       // where the links in the emails, and Google, send the person back to
  let user = null;                                               // the person logged in, as the server knows them
  // 23505: the row is already there (a save that did arrive, sent again). 23503: the person the row belongs to no longer exists.
  const codeOf = e => !e ? 'unknown' : e.code === '23505' ? 'conflict' : e.code === '23503' ? 'gone' : e.code && typeof e.code === 'string' && !/^\d+$/.test(e.code) ? e.code
    : e.name === 'AuthRetryableFetchError' || /failed to fetch|networkerror|load failed|network request failed/i.test(e.message || '') ? 'network'
    : e.status === 429 ? 'over_request_rate_limit' : 'unknown';
  const no = e => ({ ok: false, code: codeOf(e), detail: e && e.message || '' });
  /** Runs one request; whatever goes wrong comes back as { ok: false, code }, never as an exception. */
  const ask = async fn => { if (!client) return { ok: false, code: 'not_connected' }; try { const r = await fn(); return r && r.error ? no(r.error) : { ok: true, data: r ? r.data : null }; } catch (e) { return no(e); } };

  return {
    ready: !!client, preview, arrived,
    get user() { return user; },
    /** How this account can be opened: ['password', 'google'], either one. */
    ways() {
      if (!user) return [];
      const ids = (user.identities || []).map(i => i.provider), meta = user.user_metadata || {}, app = user.app_metadata || {};
      const google = ids.includes('google') || (app.providers || []).includes('google'), password = !!meta.has_password || ids.includes('email');
      return [password && 'password', google && 'google'].filter(Boolean);
    },
    /** The name given at sign-up, or the one Google has. */
    name() { const m = (user && user.user_metadata) || {}; return String(m.name || m.full_name || '').trim(); },

    // ----- who is logged in
    /** cb(event, session) for every change: logged in, logged out, a password link opened, the email changed. Called once at start with what is there. */
    onAuth(cb) {
      if (!client) return;
      // The library asks that nothing be awaited inside its own callback: the work is put off by one tick.
      client.auth.onAuthStateChange((event, session) => { user = session ? session.user : null; setTimeout(() => cb(event, session), 0); });
    },
    async session() { const r = await ask(() => client.auth.getSession()); if (r.ok) user = r.data.session ? r.data.session.user : null; return r.ok ? { ok: true, session: r.data.session } : r; },
    /** A new account. The email has to be confirmed unless the project switched that off, in which case the person is in at once (session). */
    async signUp({ name, email, password, lang }) {
      const r = await ask(() => client.auth.signUp({ email, password, options: { emailRedirectTo: here(), data: { name, lang, has_password: true } } }));
      if (!r.ok) return r;
      // An email that already has an account is not refused by the server (the form must not reveal who is registered to a stranger's script):
      // it answers with a person who has no way in. To the person filling in the form, saying so is the helpful thing.
      const u = r.data.user, exists = !!u && Array.isArray(u.identities) && u.identities.length === 0 && !r.data.session;
      if (r.data.session) user = r.data.session.user;
      return { ok: true, exists, session: r.data.session || null };
    },
    resend: email => ask(() => client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: here() } })),
    async signIn(email, password) { const r = await ask(() => client.auth.signInWithPassword({ email, password })); if (r.ok) user = r.data.user; return r.ok ? { ok: true, session: r.data.session } : r; },
    /** Leaves for Google's own page; the person comes back logged in (or with an error in the address, read above). */
    google: () => ask(() => client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: here() } })),
    /** Logs out this browser only: the person stays logged in on their other devices. This device forgets the login even when the server
        cannot be told (the library sees to that). */
    signOut: () => ask(() => client.auth.signOut({ scope: 'local' })),
    /** Takes what is left of a link out of the address, when the library could not use it. */
    cleanAddress() { try { if (/access_token=|type=recovery/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* a sandboxed frame keeps its address */ } },
    sendReset: email => ask(() => client.auth.resetPasswordForEmail(email, { redirectTo: here() })),
    async setPassword(password) { const r = await ask(() => client.auth.updateUser({ password, data: { has_password: true } })); if (r.ok && r.data.user) user = r.data.user; return r; },
    /** The new address gets a link; the login changes when it is opened. */
    changeEmail: email => ask(() => client.auth.updateUser({ email }, { emailRedirectTo: here() })),
    /** Removes the person and, with them, everything kept for them (the database deletes the rest by itself). */
    deleteAccount: () => ask(() => client.rpc('delete_my_account')),

    // ----- the account's data: one row per person, the whole account in it, with a number that goes up on every save.
    // Every call says WHOSE row it means (the person whose account is on screen). It is never taken from "who is logged in right now":
    // that can change under a request that was about to be sent (another tab logs in as somebody else), and one person's account must
    // never be written into another's row. The database refuses a row that is not the caller's own, so a mismatch fails; it cannot leak.
    async loadAccount(id) {
      const r = await ask(() => client.from('user_data').select('data, rev').eq('user_id', id).maybeSingle());
      return r.ok ? { ok: true, row: r.data } : r;
    },
    /** rev: the number the account had when it was read (null: it was never saved). Saved only if nobody else saved in between: that is 'conflict'. */
    async saveAccount(id, data, rev) {
      if (rev == null) { const r = await ask(() => client.from('user_data').insert({ user_id: id, data, rev: 1 })); return r.ok ? { ok: true, rev: 1 } : r; }
      const r = await ask(() => client.from('user_data').update({ data, rev: rev + 1, updated_at: new Date().toISOString() }).eq('user_id', id).eq('rev', rev).select('rev'));
      return !r.ok ? r : r.data && r.data.length ? { ok: true, rev: rev + 1 } : { ok: false, code: 'conflict' };
    },
    async revision(id) { const r = await ask(() => client.from('user_data').select('rev').eq('user_id', id).maybeSingle()); return r.ok ? { ok: true, rev: r.data ? r.data.rev : null } : r; },

    // ----- reminders outside the app: notifications on a device, and the "send me a test" buttons (supabase/functions/reminders)
    /** The app's public push key. The server makes it; a browser needs it to make a subscription for this device. */
    async pushKey() { const r = await ask(() => client.functions.invoke('reminders', { body: { action: 'key' } })); return !r.ok ? r : r.data && r.data.publicKey ? { ok: true, key: r.data.publicKey } : { ok: false, code: 'unknown' }; },
    /** This device, for the person logged in. A device belongs to whoever switched it on last (see save_push_subscription in schema.sql). */
    pushSave: d => ask(() => client.rpc('save_push_subscription', { p_endpoint: d.endpoint, p_p256dh: d.p256dh, p_auth: d.auth, p_agent: d.agent || null })),
    pushRemove: endpoint => ask(() => client.rpc('remove_push_subscription', { p_endpoint: endpoint })),
    /** channel: 'push' (a notification to the person's devices) or 'email'. The server sends it to the person logged in, nobody else. */
    async remindTest(channel) { const r = await ask(() => client.functions.invoke('reminders', { body: { action: 'test', channel } })); return !r.ok ? r : r.data && r.data.ok ? { ok: true } : { ok: false, code: (r.data && r.data.code) || 'unknown' }; },

    /** Connecting a bank (a trial; supabase/functions/bank). action: 'status' | 'start' | 'finish' | 'fetch' | 'disconnect'. The answer is the
        function's own: { ok: true, ... } or { ok: false, code }. */
    async bank(action, body) { const r = await ask(() => client.functions.invoke('bank', { body: { ...(body || {}), action } })); return !r.ok ? r : r.data && typeof r.data === 'object' ? r.data : { ok: false, code: 'unknown' }; },

    // ----- the contact form: anyone can write, nobody can read through the app
    sendContact: ({ email, topic, message, lang }) => ask(() => client.from('contact_messages').insert({ email, topic, message, lang })),
  };
})();
