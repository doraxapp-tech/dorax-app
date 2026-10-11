// Runs the suggest function (supabase/functions/suggest/index.ts) outside Supabase, with stand-ins for Deno, the database and Anthropic, so every
// path of it can be tried without a key or a network. Prints one JSON object; tests/qc-import-ai.js reads it and judges.
import { register } from 'node:module';
const here = new URL('.', import.meta.url);
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, next) { return s.startsWith('npm:@supabase/supabase-js') ? { url: ${JSON.stringify(new URL('supabase-mock.mjs', here).href)}, shortCircuit: true } : next(s, c); }`));

// ---- the database: the table of calls, or none at all (a project where schema.sql was not run again)
const T = { ai_calls: [] }, DB = { tableMissing: false }, USERS = {};
function query(table) {
  const q = { op: 'select', filters: [], head: false };
  const api = { select(_c, o) { q.head = !!(o && o.head); return api; }, eq(k, v) { q.filters.push(r => r[k] === v); return api; }, gte(k, v) { q.filters.push(r => r[k] >= v); return api; },
    insert(row) { q.op = 'insert'; q.row = row; return api; },
    then(ok, no) {
      if (DB.tableMissing || !T[table]) return Promise.resolve({ data: null, count: null, error: { message: 'relation does not exist' } }).then(ok, no);
      if (q.op === 'insert') { T[table].push({ id: T[table].length + 1, at: new Date().toISOString(), ...q.row }); return Promise.resolve({ data: null, error: null }).then(ok, no); }
      const rows = T[table].filter(r => q.filters.every(f => f(r))); return Promise.resolve({ data: q.head ? null : rows, count: rows.length, error: null }).then(ok, no);
    } };
  return api;
}
globalThis.__ADMIN__ = { from: query, auth: { getUser: async token => { const u = Object.values(USERS).find(x => x.token === token); return u ? { data: { user: { id: u.id } }, error: null } : { data: { user: null }, error: { message: 'bad' } }; } } };

// ---- Anthropic: what it is sent is written down; it answers what the test sets
const SENT = [], HOSTS = new Set(), AI = { status: 200, text: '' };
globalThis.fetch = async (url, opt = {}) => {
  const u = new URL(String(url)); HOSTS.add(u.host); SENT.push({ host: u.host, path: u.pathname, headers: opt.headers, body: JSON.parse(opt.body || 'null') });
  return new Response(JSON.stringify(AI.status === 200 ? { content: [{ type: 'text', text: AI.text }] } : { error: { type: 'overloaded_error' } }), { status: AI.status, headers: { 'Content-Type': 'application/json' } });
};

// ---- Deno
const ENV = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key', ANTHROPIC_API_KEY: '', SUGGEST_DAILY: '2' };
let handler = null; globalThis.Deno = { env: { get: k => ENV[k] }, serve: h => { handler = h; } };
const logs = []; console.log = (...a) => logs.push(a.join(' ')); console.error = (...a) => logs.push('ERR ' + a.join(' '));
await import(new URL('../../supabase/functions/suggest/index.ts', here).href);
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
for (const id of [A, B]) USERS[id] = { id, token: 'token-' + id };
const call = async (body, who, method = 'POST') => { const r = await handler(new Request('https://example.supabase.co/functions/v1/suggest', { method, headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example', ...(who ? { Authorization: 'Bearer token-' + who } : {}) }, body: method === 'POST' ? JSON.stringify(body) : undefined }));
  return { status: r.status, json: await r.json().catch(() => null), cors: r.headers.get('Access-Control-Allow-Origin') }; };
const ROWS = [{ id: 'r1', text: 'Compra no débito - PADARIA SOL 12/10 #4432', dir: 'out' }, { id: 'r2', text: 'Transferência recebida - ANA SOUZA •••.123.456-•• BCO 001', dir: 'in' }, { id: 'r3', text: '123 456', dir: 'out' }];
const GROUPS = [{ key: 'casa|super', name: 'Casa › Supermercado', dir: 'out' }, { key: 'fun|', name: 'Salidas', dir: 'out' }, { key: 'income|salary', name: 'Ingresos › Sueldo', dir: 'in' }];
const OUT = {};

OUT.anon = await call({ rows: ROWS, groups: GROUPS }); OUT.get = await call(null, A, 'GET');
OUT.noKey = await call({ rows: ROWS, groups: GROUPS }, A); OUT.noKeySent = SENT.splice(0).length;
ENV.ANTHROPIC_API_KEY = 'sk-ant-test-key';
DB.tableMissing = true; OUT.noTable = await call({ rows: ROWS, groups: GROUPS }, A); OUT.noTableSent = SENT.splice(0).length; DB.tableMissing = false;
OUT.empty = await call({ rows: [], groups: GROUPS }, A); OUT.emptySent = SENT.splice(0).length;
// an answer with every kind of mistake in it: an id not asked about, a group not the person's, a group of the other direction, the same row twice
AI.text = 'Here you go: {"s":[{"id":"r1","key":"casa|super","name":"Padaria Sol"},{"id":"r2","key":"casa|super","name":"Ana Souza"},{"id":"r1","key":"fun|"},{"id":"zz","key":"fun|"},{"id":"r3","key":"other|"}]}';
OUT.ok = await call({ rows: ROWS, groups: GROUPS }, A); OUT.sent = SENT.splice(0);
OUT.kept = T.ai_calls.map(r => Object.keys(r).sort().join(','));
AI.status = 529; OUT.failed = await call({ rows: ROWS, groups: GROUPS }, A); SENT.splice(0); OUT.callsAfterFail = T.ai_calls.length; AI.status = 200;
OUT.tooMany = await call({ rows: Array.from({ length: 200 }, (_, i) => ({ id: 'x' + i, text: 'LOJA ' + i + ' NOME', dir: 'out' })), groups: GROUPS }, A); OUT.tooManyRows = SENT.splice(0).map(s => JSON.parse(s.body.messages[0].content).lines.length);
OUT.limit = await call({ rows: ROWS, groups: GROUPS }, A); OUT.limitSent = SENT.splice(0).length;
OUT.otherPerson = await call({ rows: ROWS, groups: GROUPS }, B); SENT.splice(0);
OUT.logs = logs;
OUT.logsLeak = logs.some(l => /PADARIA|ANA SOUZA|SOUZA|Supermercado|sk-ant/.test(l));
OUT.everyHost = [...HOSTS];
process.stdout.write(JSON.stringify(OUT));
