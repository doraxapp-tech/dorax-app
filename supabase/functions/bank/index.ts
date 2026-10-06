// Dorax Finance — connecting a bank through Open Finance (a Supabase Edge Function named "bank"). A TRIAL: Belvo's test banks only.
//
// Belvo is the company that talks to the banks. A person asks to connect a bank; Belvo's own page takes them to the bank, where they
// agree to share their accounts and transactions; they come back, and this function reads what the bank shared and hands it to the app,
// which shows it in the same review screen a statement file goes through. Nothing enters the person's ledger without that review.
//
// Every request needs a logged-in person. The requests, told apart by "action":
//   status      is this switched on for me, and which banks have I connected
//   start       { cpf, name } -> the address of Belvo's page for this person. The CPF and the name go to Belvo and are NOT kept here.
//   finish      { link } -> the connection Belvo made is checked to be this person's own, and remembered
//   fetch       { link } -> the accounts and transactions the bank shared, for the app to review. Not stored on the server.
//   disconnect  { link } -> the connection is deleted at Belvo (which revokes the consent) and forgotten here
//
// What keeps the trial a trial: it only ever talks to Belvo's SANDBOX (test banks, invented data). It is open to every logged-in
// person (owner, 2026-10-06: "make it visible for all users"); the list of people it used to be limited to is gone.
//
// Secrets, set by hand in Supabase > Edge Functions > Secrets, never in a file, a browser or a chat:
//   BELVO_SECRET_ID, BELVO_SECRET_PASSWORD   the sandbox keys from Belvo's dashboard
// The logs hold counts and codes only: no CPF, no name, no account, no transaction.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { cpfOf, nameOf, isUuid, tokenRequest, widgetUrl, accountOf, transactionOf } from './rules.mjs';

const BELVO = 'https://sandbox.belvo.com';          // the trial is the sandbox. Real banks are a decision, not a setting: see DEPLOY.md
const env = (name: string, otherwise = '') => (Deno.env.get(name) || otherwise).trim();
const SITE = env('SITE_URL', 'https://dorax.app').replace(/\/$/, '');
const ORIGINS = [SITE, 'https://dorax-finance.vercel.app', 'http://localhost:5173'];
const MONTHS_BACK = 12, PAGES = 5, PAGE_SIZE = 1000;

const cors = (req: Request) => {
  const origin = req.headers.get('origin') || '';
  return { 'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : SITE, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
};
const answer = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
// deno-lint-ignore no-explicit-any
type Any = any;

const keys = () => ({ id: env('BELVO_SECRET_ID'), password: env('BELVO_SECRET_PASSWORD') });
/** One request to Belvo with the server's keys. Answers { ok, status, data }; a network failure is status 0. */
async function belvo(path: string, init: { method?: string; body?: unknown } = {}) {
  const k = keys();
  try {
    const r = await fetch(BELVO + path, { method: init.method || 'GET', headers: { Authorization: 'Basic ' + btoa(k.id + ':' + k.password), 'Content-Type': 'application/json', Accept: 'application/json' }, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
    let data: Any = null; try { data = await r.json(); } catch (_e) { /* no body, or not JSON */ }
    return { ok: r.ok, status: r.status, data };
  } catch (_e) { return { ok: false, status: 0, data: null }; }
}
const mine = async (admin: Any, userId: string, link: unknown) => {
  if (!isUuid(link)) return null;
  const { data } = await admin.from('bank_links').select('link_id, institution').eq('user_id', userId).eq('link_id', link).maybeSingle();
  return data || null;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return answer(req, { ok: false, code: 'post_only' }, 405);
  try {
    const body = await req.json().catch(() => ({})) || {};
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: who, error } = token ? await admin.auth.getUser(token) : { data: null, error: true };
    const user = !error && who && who.user ? who.user : null;
    if (!user) return answer(req, { ok: false, code: 'not_logged_in' }, 401);
    // not set up at all: said the same way for every action, before anything else is looked at
    if (!keys().id || !keys().password) return answer(req, { ok: false, code: 'not_set_up', enabled: false });

    if (body.action === 'status') {
      const { data: links } = await admin.from('bank_links').select('link_id, institution, created_at').eq('user_id', user.id).order('created_at');
      return answer(req, { ok: true, enabled: true, sandbox: true, links: (links || []).map((l: Any) => ({ id: l.link_id, institution: l.institution, since: l.created_at })) });
    }

    if (body.action === 'start') {
      const cpf = cpfOf(body.cpf), name = nameOf(body.name);
      if (!cpf) return answer(req, { ok: false, code: 'bad_cpf' });
      if (!name) return answer(req, { ok: false, code: 'bad_name' });
      const { data: have } = await admin.from('bank_links').select('link_id').eq('user_id', user.id);
      if ((have || []).length >= 5) return answer(req, { ok: false, code: 'too_many' });
      const r = await belvo('/api/token/', { method: 'POST', body: tokenRequest(keys(), { cpf, name }, SITE) });
      if (!r.ok || !r.data || typeof r.data.access !== 'string') { console.error('bank: start refused by Belvo:', r.status); return answer(req, { ok: false, code: 'bank_refused', status: r.status }); }
      return answer(req, { ok: true, url: widgetUrl(r.data.access, user.id) });
    }

    if (body.action === 'finish') {
      if (!isUuid(body.link)) return answer(req, { ok: false, code: 'no_link' }, 400);
      // the address the person came back with says which connection was made. Belvo is asked whose it is: only the one Belvo holds
      // under this person's own id is accepted, so nobody can attach somebody else's bank by typing its id into the address.
      const r = await belvo('/api/links/' + body.link + '/');
      if (!r.ok || !r.data) { console.error('bank: finish, link not found at Belvo:', r.status); return answer(req, { ok: false, code: 'bank_refused', status: r.status }); }
      if (r.data.external_id !== user.id) { console.error('bank: finish, a link that is not the caller’s'); return answer(req, { ok: false, code: 'not_yours' }); }
      const institution = String(r.data.institution || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').slice(0, 80);
      await admin.from('bank_links').upsert({ user_id: user.id, link_id: body.link, institution }, { onConflict: 'link_id', ignoreDuplicates: true });
      const kept = await mine(admin, user.id, body.link);
      return kept ? answer(req, { ok: true, link: { id: body.link, institution } }) : answer(req, { ok: false, code: 'not_yours' });
    }

    if (body.action === 'fetch') {
      const link = await mine(admin, user.id, body.link);
      if (!link) return answer(req, { ok: false, code: 'no_link' });
      const a = await belvo(`/api/accounts/?link=${link.link_id}&page_size=100`);
      if (!a.ok || !a.data) { console.error('bank: fetch, accounts refused:', a.status); return answer(req, { ok: false, code: a.status === 404 ? 'gone' : 'bank_refused', status: a.status }); }
      const accounts = (Array.isArray(a.data.results) ? a.data.results : []).map(accountOf).filter(Boolean);
      const since = new Date(Date.now() - MONTHS_BACK * 30.5 * 864e5).toISOString().slice(0, 10);
      const transactions: Any[] = []; let left = 0, more = false;
      for (let page = 1; page <= PAGES; page++) {
        const t = await belvo(`/api/transactions/?link=${link.link_id}&page_size=${PAGE_SIZE}&page=${page}&value_date__gte=${since}`);
        if (!t.ok || !t.data) { if (page === 1) { console.error('bank: fetch, transactions refused:', t.status); return answer(req, { ok: false, code: 'bank_refused', status: t.status }); } break; }
        for (const x of Array.isArray(t.data.results) ? t.data.results : []) { const row = transactionOf(x); if (row) transactions.push(row); else left++; }
        more = !!t.data.next; if (!more) break;
      }
      console.log('bank: fetch', JSON.stringify({ accounts: accounts.length, transactions: transactions.length, left, more }));
      return answer(req, { ok: true, institution: link.institution, accounts, transactions, left, more });
    }

    if (body.action === 'disconnect') {
      const link = await mine(admin, user.id, body.link);
      if (!link) return answer(req, { ok: true, removed: 0 });
      // deleting the connection at Belvo is what revokes the consent at the bank. If Belvo cannot be reached, nothing is forgotten here
      // either: a row that says "connected" while the consent lives on is better than a consent nobody remembers.
      const r = await belvo('/api/links/' + link.link_id + '/', { method: 'DELETE' });
      if (!r.ok && r.status !== 404) { console.error('bank: disconnect refused:', r.status); return answer(req, { ok: false, code: 'bank_refused', status: r.status }); }
      await admin.from('bank_links').delete().eq('user_id', user.id).eq('link_id', link.link_id);
      return answer(req, { ok: true, removed: 1 });
    }
    return answer(req, { ok: false, code: 'unknown_action' }, 400);
  } catch (e) {
    console.error('bank: failed:', e instanceof Error ? e.name : 'error');
    return answer(req, { ok: false, code: 'failed' }, 500);
  }
});
