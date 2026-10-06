// Runs the bank function (supabase/functions/bank/index.ts) outside Supabase, with stand-ins for Deno, the database and Belvo, so every
// path of it can be tried without a key, a bank or a network. Prints one JSON object; tests/qc-bank.js reads it and judges.
import { register } from 'node:module';
const here = new URL('.', import.meta.url);
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, next) { return s.startsWith('npm:@supabase/supabase-js') ? { url: ${JSON.stringify(new URL('supabase-mock.mjs', here).href)}, shortCircuit: true } : next(s, c); }`), import.meta.url);

// ---- the database: one table
const T = { bank_links: [] }, USERS = {};
function query(table) {
  const q = { op: 'select', filters: [], single: false };
  const match = r => q.filters.every(f => f(r));
  const run = () => {
    if (q.op === 'select') { let out = T[table].filter(match); if (q.orderBy) out = out.slice().sort((a, b) => a[q.orderBy] < b[q.orderBy] ? -1 : 1); return { data: q.single ? (out[0] ? { ...out[0] } : null) : out.map(r => ({ ...r })), error: null }; }
    if (q.op === 'delete') { T[table] = T[table].filter(r => !match(r)); return { data: null, error: null }; }
    if (q.op === 'upsert') { for (const row of q.rows) if (!T[table].some(r => r.link_id === row.link_id)) T[table].push({ created_at: new Date().toISOString(), ...row }); return { data: null, error: null }; }
  };
  const api = { select() { return api; }, eq(k, v) { q.filters.push(r => r[k] === v); return api; }, order(k) { q.orderBy = k; return api; }, maybeSingle() { q.single = true; return api; },
    delete() { q.op = 'delete'; return api; }, upsert(rows) { q.op = 'upsert'; q.rows = Array.isArray(rows) ? rows : [rows]; return api; },
    then(ok, no) { try { return Promise.resolve(run()).then(ok, no); } catch (e) { return Promise.reject(e).then(ok, no); } } };
  return api;
}
globalThis.__ADMIN__ = { from: query, auth: { getUser: async token => { const u = Object.values(USERS).find(x => x.token === token); return u ? { data: { user: { id: u.id, email: u.email } }, error: null } : { data: { user: null }, error: { message: 'bad token' } }; } } };

// ---- Belvo: what it is asked is written down, and it answers the way its documentation shows
const ASKED = [], HOSTS = new Set(), BELVO = { links: {}, down: false, tokenStatus: 201, pages: null };
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const LA = '11111111-1111-4111-8111-111111111111', LB = '22222222-2222-4222-8222-222222222222', LX = '99999999-9999-4999-8999-999999999999';
const TX = n => Array.from({ length: n }, (_, i) => ({ id: 'belvo-' + i, internal_identification: i % 2 ? 'bank-id-' + i : null, account: { id: i % 3 === 2 ? 'acc-card' : 'acc-main', name: 'x' }, value_date: '2026-09-' + String(1 + (i % 28)).padStart(2, '0'), accounting_date: null,
  amount: 10 + i + 0.25, currency: 'BRL', description: i === 0 ? 'COMPRA <script>alert(1)</script>\nSEGUNDA LINHA' : 'MOVIMENTO ' + i, type: i % 4 === 0 ? 'INFLOW' : 'OUTFLOW', status: 'PROCESSED', category: null, merchant: null }));
globalThis.fetch = async (url, opt = {}) => {
  url = String(url); const u = new URL(url), auth = (opt.headers || {}).Authorization || '';
  HOSTS.add(u.host); ASKED.push({ host: u.host, path: u.pathname, query: Object.fromEntries(u.searchParams), method: opt.method || 'GET', basic: auth.startsWith('Basic ') ? Buffer.from(auth.slice(6), 'base64').toString() : null, body: opt.body ? JSON.parse(opt.body) : null });
  if (BELVO.down) throw new TypeError('fetch failed');
  const json = (status, data) => new Response(data === undefined ? null : JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  if (u.host !== 'sandbox.belvo.com') return json(404, {});
  if (u.pathname === '/api/token/') return BELVO.tokenStatus === 201 ? json(201, { access: 'ACCESS.token-value', refresh: 'REFRESH.must-not-leave-the-server' }) : json(BELVO.tokenStatus, { detail: 'no' });
  const link = (/^\/api\/links\/([^/]+)\/$/.exec(u.pathname) || [])[1];
  if (link) { const l = BELVO.links[link]; if (!l) return json(404, [{ code: 'not_found' }]); if (opt.method === 'DELETE') { if (BELVO.deleteStatus) return json(BELVO.deleteStatus, {}); delete BELVO.links[link]; return json(204); } return json(200, l); }
  if (u.pathname === '/api/accounts/') return BELVO.links[u.searchParams.get('link')] ? json(200, { count: 3, next: null, results: [
    { id: 'acc-main', link: u.searchParams.get('link'), institution: { name: 'ofmockbank_br_retail', type: 'bank' }, category: 'CHECKING_ACCOUNT', type: 'CONTA_DEPOSITO_A_VISTA', name: 'Conta corrente\r\nX', number: '12345-6', agency: '0001', currency: 'BRL', balance: { current: 1234.56, available: 1000 }, public_identification_value: 'SECRET-NUMBER' },
    { id: 'acc-card', institution: { name: 'ofmockbank_br_retail' }, category: 'CREDIT_CARD', name: 'Cartão', currency: 'BRL', balance: { current: -450 } }, null, { name: 'no id' }] }) : json(404, {});
  if (u.pathname === '/api/transactions/') { const page = +u.searchParams.get('page') || 1, pages = BELVO.pages || [TX(7).concat([{ id: 'no-date', amount: 5, type: 'OUTFLOW' }, { id: 'no-amount', value_date: '2026-09-01', amount: null }, null])];
    return page <= pages.length ? json(200, { count: 0, next: page < pages.length || BELVO.endless ? 'https://sandbox.belvo.com/api/transactions/?page=' + (page + 1) : null, results: pages[page - 1] }) : json(404, {}); }
  return json(404, {});
};

// ---- Deno
const ENV = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key', BELVO_SECRET_ID: 'sandbox-secret-id', BELVO_SECRET_PASSWORD: 'sandbox-secret-password' };
let handler = null; globalThis.Deno = { env: { get: k => ENV[k] }, serve: h => { handler = h; } };
const logs = []; console.log = (...a) => logs.push(a.join(' ')); console.error = (...a) => logs.push('ERR ' + a.join(' '));
await import(new URL('../../supabase/functions/bank/index.ts', here).href);
for (const [id, email] of [[A, 'ana@example.org'], [B, 'bea@example.org'], [C, 'caio@example.org']]) USERS[id] = { id, email, token: 'token-' + id };
const call = async (body, who, method = 'POST', origin) => { const r = await handler(new Request('https://example.supabase.co/functions/v1/bank', { method, headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: 'Bearer token-' + who } : {}), ...(origin ? { origin } : {}) }, body: method === 'POST' ? JSON.stringify(body) : undefined })); let json = null; try { json = await r.json(); } catch (e) { /* not json */ } return { status: r.status, json, origin: r.headers.get('access-control-allow-origin') }; };
const asked = () => ASKED.splice(0);
const OUT = {};

// 1. who may use it
OUT.anon = await call({ action: 'status' }); OUT.badToken = await handler(new Request('https://example.supabase.co/functions/v1/bank', { method: 'POST', headers: { Authorization: 'Bearer nope' }, body: '{}' })).then(r => r.status);
OUT.anyone = [(await call({ action: 'status' }, C)).json, (await call({ action: 'fetch', link: LA }, C)).json]; OUT.anyoneAsked = asked().length;
OUT.get = await call(null, A, 'GET'); OUT.unknown = await call({ action: 'everything' }, A);
OUT.cors = [(await call(null, null, 'OPTIONS', 'https://dorax.app')).origin, (await call(null, null, 'OPTIONS', 'https://evil.example')).origin];
delete ENV.BELVO_SECRET_PASSWORD; OUT.noKeys = await call({ action: 'status' }, A); ENV.BELVO_SECRET_PASSWORD = 'sandbox-secret-password';
OUT.status0 = await call({ action: 'status' }, A);

// 2. starting
OUT.badCpf = [await call({ action: 'start', cpf: '76109277674', name: 'Ana Souza' }, A), await call({ action: 'start', cpf: '111.111.111-11', name: 'Ana Souza' }, A), await call({ action: 'start', name: 'Ana Souza' }, A)];
OUT.badName = [await call({ action: 'start', cpf: '76109277673', name: 'Ana' }, A), await call({ action: 'start', cpf: '76109277673', name: 'Ana <b>Souza</b>' }, A)]; OUT.badAsked = asked().length;
OUT.start = await call({ action: 'start', cpf: '761.092.776-73', name: '  Ana   Souza ' }, A); OUT.startAsked = asked();
BELVO.tokenStatus = 401; OUT.startRefused = await call({ action: 'start', cpf: '76109277673', name: 'Ana Souza' }, A); BELVO.tokenStatus = 201; asked();
BELVO.down = true; OUT.startDown = await call({ action: 'start', cpf: '76109277673', name: 'Ana Souza' }, A); BELVO.down = false; asked();

// 3. coming back
BELVO.links[LA] = { id: LA, institution: 'ofmockbank_br_retail\r\n<b>', external_id: A, access_mode: 'single' }; BELVO.links[LB] = { id: LB, institution: 'ofmockbank_br_retail', external_id: B };
OUT.finishNoLink = await call({ action: 'finish', link: "x' or 1=1" }, A); OUT.finishUnknown = await call({ action: 'finish', link: LX }, A);
OUT.finishOthers = await call({ action: 'finish', link: LB }, A); OUT.afterOthers = T.bank_links.length;
OUT.finish = await call({ action: 'finish', link: LA }, A); OUT.finishAgain = await call({ action: 'finish', link: LA }, A); OUT.finishAsked = asked().map(q => q.method + ' ' + q.path);
OUT.table = T.bank_links.map(r => ({ ...r, created_at: !!r.created_at }));
await call({ action: 'finish', link: LB }, B);
OUT.status1 = [(await call({ action: 'status' }, A)).json, (await call({ action: 'status' }, B)).json.links.map(l => l.id)];
// B tries to take A's connection after the fact: the row stays A's
OUT.stealAfter = await call({ action: 'finish', link: LA }, B); OUT.ownerAfter = T.bank_links.find(r => r.link_id === LA).user_id === A; asked();

// 4. reading what the bank shared
OUT.fetchNotMine = await call({ action: 'fetch', link: LA }, B); OUT.fetchNotMineAsked = asked().length;
OUT.fetch = await call({ action: 'fetch', link: LA }, A); OUT.fetchAsked = asked();
BELVO.pages = Array.from({ length: 9 }, (_, i) => TX(3).map(x => ({ ...x, id: 'p' + i + '-' + x.id }))); BELVO.endless = true; OUT.fetchLong = await call({ action: 'fetch', link: LA }, A); OUT.fetchLongAsked = asked().filter(q => q.path === '/api/transactions/').length; BELVO.pages = null; BELVO.endless = false;
BELVO.down = true; OUT.fetchDown = await call({ action: 'fetch', link: LA }, A); BELVO.down = false; asked();

// 5. disconnecting
OUT.discNotMine = await call({ action: 'disconnect', link: LA }, B); OUT.discNotMineState = [!!BELVO.links[LA], T.bank_links.some(r => r.link_id === LA)]; asked();
BELVO.deleteStatus = 500; OUT.discRefused = await call({ action: 'disconnect', link: LA }, A); OUT.discRefusedKept = T.bank_links.some(r => r.link_id === LA); BELVO.deleteStatus = 0; asked();
OUT.disc = await call({ action: 'disconnect', link: LA }, A); OUT.discAsked = asked().map(q => q.method + ' ' + q.path); OUT.discState = [!!BELVO.links[LA], T.bank_links.some(r => r.link_id === LA), T.bank_links.some(r => r.link_id === LB)];
OUT.fetchGone = await call({ action: 'fetch', link: LA }, A); asked();
// five banks at most
for (let i = 0; i < 5; i++) T.bank_links.push({ user_id: A, link_id: `0000000${i}-0000-4000-8000-000000000000`, institution: 'x', created_at: '2026-10-0' + (i + 1) });
OUT.tooMany = await call({ action: 'start', cpf: '76109277673', name: 'Ana Souza' }, A); OUT.tooManyAsked = asked().length;

OUT.logs = logs;
OUT.logsLeak = logs.some(l => /76109277673|761\.092|Ana Souza|sandbox-secret|ACCESS\.token|REFRESH|MOVIMENTO|12345-6|@example\.org/.test(l));
OUT.everyHost = [...HOSTS];
process.stdout.write(JSON.stringify(OUT));
