// QC of supabase/schema.sql against a real PostgreSQL: the rules that keep each person's data to themselves are tried, not assumed.
// A throwaway database is started on this computer, given the few things a Supabase project already has (the roles "anon" and
// "authenticated", the table auth.users, the function auth.uid()), and the script is run on it exactly as it will be run in Supabase.
// Then every rule is tried as a logged-in person, as another person, and as a visitor.
// Needs PostgreSQL installed here (initdb, pg_ctl, psql). Where it is not, the suite says so and is skipped: it does not fail.
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
let pass = 0, fail = 0;
const ok = (c, name, detail) => { if (c) pass++; else { fail++; console.log('  FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); } };
const eq = (a, b, name) => ok(JSON.stringify(a) === JSON.stringify(b), name, { got: a, want: b });

const bins = ['/usr/lib/postgresql', '/usr/local/opt/postgresql', '/opt/homebrew/opt/postgresql'].flatMap(d => { try { return fs.readdirSync(d).map(v => path.join(d, v, 'bin')).concat(path.join(d, 'bin')); } catch (e) { return []; } }).filter(d => fs.existsSync(path.join(d, 'initdb')));
const which = spawnSync('sh', ['-c', 'command -v initdb'], { encoding: 'utf8' }).stdout.trim();
const BIN = bins.sort().pop() || (which ? path.dirname(which) : null);
if (!BIN) { console.log('qc-schema: skipped (no PostgreSQL on this computer; the script was checked where there is one)'); process.exit(0); }

const root = process.getuid && process.getuid() === 0;       // PostgreSQL refuses to run as root: it is started as the "postgres" user then
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dorax-pg-')), PORT = 54329 + Math.floor(Math.random() * 500);
if (root) spawnSync('chown', ['-R', 'postgres', dir]);
const sh = (cmd, input) => root ? spawnSync('runuser', ['-u', 'postgres', '--', 'sh', '-c', cmd], { encoding: 'utf8', input }) : spawnSync('sh', ['-c', cmd], { encoding: 'utf8', input });
const psql = (sql, flags) => sh(`${BIN}/psql -X -q -h ${dir} -p ${PORT} -U postgres -d postgres -At ${flags || ''} -f -`, sql);
const stop = () => { sh(`${BIN}/pg_ctl -D ${dir}/data -m immediate stop`); fs.rmSync(dir, { recursive: true, force: true }); };
/** Runs sql as a role, with a login's id (or none), the way a request from the app arrives. Answers the rows, or the error. */
function as(role, uid, sql) {
  const r = psql(`set role ${role}; select set_config('request.jwt.claim.sub', '${uid || ''}', false) \\g /dev/null\n${sql}`);
  const err = (r.stderr || '').split('\n').find(l => /ERROR/.test(l));
  return err ? { error: err.replace(/^.*ERROR:\s*/, '') } : { rows: r.stdout.trim() === '' ? [] : r.stdout.trim().split('\n') };
}

let r = sh(`${BIN}/initdb -D ${dir}/data -A trust -U postgres --locale=C -E UTF8 >/dev/null 2>&1 && ${BIN}/pg_ctl -D ${dir}/data -o "-p ${PORT} -c listen_addresses='' -k ${dir}" -w -l ${dir}/log start >/dev/null 2>&1; echo $?`);
if (r.stdout.trim() !== '0') { console.log('qc-schema: skipped (PostgreSQL is here but could not be started: ' + (r.stderr || r.stdout).trim().slice(0, 200) + ')'); fs.rmSync(dir, { recursive: true, force: true }); process.exit(0); }
try {
  // what a Supabase project has before the script is run
  r = psql(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text unique);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    -- Supabase gives new tables and functions of the public schema to these roles by default: the script must not rely on that, and must undo it where it matters
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
    insert into auth.users (id, email) values ('11111111-1111-4111-8111-111111111111', 'a@example.org'), ('22222222-2222-4222-8222-222222222222', 'b@example.org');`, '-v ON_ERROR_STOP=1');
  eq(r.status, 0, 'the stand-in for a Supabase project is set up'); if (r.status) console.log(r.stderr);
  const SCHEMA = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8');
  r = psql(SCHEMA, '-v ON_ERROR_STOP=1'); eq([r.status, (r.stderr || '').split('\n').filter(l => /ERROR/.test(l))], [0, []], 'schema.sql runs without an error');
  r = psql(SCHEMA, '-v ON_ERROR_STOP=1'); eq([r.status, (r.stderr || '').split('\n').filter(l => /ERROR/.test(l))], [0, []], 'schema.sql can be run a second time');

  const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222', doc = `'{"accounts":[],"user":{"name":"A"}}'::jsonb`;
  eq(psql(`select relname, relrowsecurity from pg_class where relname in ('user_data', 'contact_messages') order by 1;`).stdout.trim().split('\n'), ['contact_messages|t', 'user_data|t'], 'row-level security is on for both tables');

  // ----- user_data: a person and their own row
  eq(as('authenticated', A, `insert into public.user_data (user_id, data, rev) values ('${A}', ${doc}, 1);`), { rows: [] }, 'a logged-in person creates their own row');
  ok(/row-level security/.test(as('authenticated', A, `insert into public.user_data (user_id, data, rev) values ('${B}', ${doc}, 1);`).error || ''), 'and cannot create a row for somebody else');
  ok(/duplicate key/.test(as('authenticated', A, `insert into public.user_data (user_id, data, rev) values ('${A}', ${doc}, 1);`).error || ''), 'a second row for the same person is refused');
  as('authenticated', B, `insert into public.user_data (user_id, data, rev) values ('${B}', '{"user":{"name":"B"}}'::jsonb, 1);`);
  eq(as('authenticated', A, `select user_id, rev, data->'user'->>'name' from public.user_data;`), { rows: [`${A}|1|A`] }, 'reading: only their own row comes back, though two exist');
  eq(as('authenticated', A, `select count(*) from public.user_data where user_id = '${B}';`), { rows: ['0'] }, 'asking for somebody else’s row by its id finds nothing');
  // saving: the row is updated only if nobody saved since it was read
  eq(as('authenticated', A, `update public.user_data set data = '{"user":{"name":"A2"}}'::jsonb, rev = 2 where user_id = '${A}' and rev = 1 returning rev;`), { rows: ['2'] }, 'a save with the rev that was read goes through');
  eq(as('authenticated', A, `update public.user_data set data = '{"user":{"name":"late"}}'::jsonb, rev = 2 where user_id = '${A}' and rev = 1 returning rev;`), { rows: [] }, 'a save with an older rev changes nothing (another device saved first)');
  eq(as('authenticated', A, `update public.user_data set data = '{"x":1}'::jsonb where user_id = '${B}' returning rev;`), { rows: [] }, 'somebody else’s row cannot be changed');
  ok(/row-level security/.test(as('authenticated', A, `update public.user_data set user_id = '33333333-3333-4333-8333-333333333333' where user_id = '${A}';`).error || ''), 'a row cannot be handed to another id');
  ok(/permission denied/.test(as('authenticated', A, `delete from public.user_data where user_id = '${A}';`).error || ''), 'a row cannot be deleted by itself (it goes with its person)');
  ok(/user_data_is_a_document/.test(as('authenticated', A, `update public.user_data set data = '[1,2]'::jsonb where user_id = '${A}';`).error || ''), 'what is saved has to be a document');
  ok(/user_data_rev_positive/.test(as('authenticated', A, `update public.user_data set rev = 0 where user_id = '${A}';`).error || ''), 'rev cannot go below 1');
  eq(psql(`select data->'user'->>'name', rev from public.user_data where user_id = '${B}';`).stdout.trim(), 'B|1', 'the other person’s row is untouched after all that');
  // a visitor who is not logged in
  ok(/permission denied/.test(as('anon', '', `select * from public.user_data;`).error || ''), 'a visitor cannot read the table');
  ok(/permission denied/.test(as('anon', '', `insert into public.user_data (user_id, data) values ('${A}', ${doc});`).error || ''), 'a visitor cannot write to it');
  ok(/permission denied/.test(as('anon', '', `update public.user_data set rev = 9;`).error || ''), 'a visitor cannot change it');

  // ----- contact_messages: anyone writes, nobody reads through the app
  eq(as('anon', '', `insert into public.contact_messages (email, topic, message, lang) values ('v@example.org', 'data', 'Please delete my data, thank you.', 'pt');`), { rows: [] }, 'a visitor sends a message');
  eq(as('authenticated', A, `insert into public.contact_messages (email, topic, message, lang) values ('a@example.org', 'question', 'A question about my plan.', 'en');`), { rows: [] }, 'a logged-in person sends a message');
  eq(psql(`select email, topic, lang, user_id is not null, handled from public.contact_messages order by created_at;`).stdout.trim().split('\n'), ['v@example.org|data|pt|f|f', 'a@example.org|question|en|t|f'], 'both are kept; the logged-in one carries who wrote it');
  ok(/permission denied/.test(as('anon', '', `select * from public.contact_messages;`).error || ''), 'a visitor cannot read the messages');
  ok(/permission denied/.test(as('authenticated', A, `select * from public.contact_messages;`).error || ''), 'a logged-in person cannot read them either, not even their own');
  ok(/permission denied/.test(as('authenticated', A, `insert into public.contact_messages (email, topic, message, user_id) values ('x@example.org', 'other', 'Pretending to be somebody else.', '${B}');`).error || ''), 'a message cannot be signed with somebody else’s id');
  ok(/permission denied/.test(as('anon', '', `insert into public.contact_messages (email, topic, message, handled) values ('x@example.org', 'other', 'Marking my own message handled.', true);`).error || ''), 'the columns that are yours (handled, date) cannot be set by the app');
  ok(/permission denied/.test(as('authenticated', A, `update public.contact_messages set message = 'changed afterwards';`).error || ''), 'a message cannot be changed');
  ok(/permission denied/.test(as('anon', '', `delete from public.contact_messages;`).error || ''), 'or deleted');
  ok(/check constraint/.test(as('anon', '', `insert into public.contact_messages (email, topic, message) values ('x@example.org', 'other', 'short');`).error || ''), 'a message of a few letters is refused');
  ok(/check constraint/.test(as('anon', '', `insert into public.contact_messages (email, topic, message) values ('x@example.org', 'other', '${'x'.repeat(5001)}');`).error || ''), 'so is one over 5000 characters');
  ok(/check constraint/.test(as('anon', '', `insert into public.contact_messages (email, topic, message) values ('x@example.org', 'spam', 'A topic the form does not have.');`).error || ''), 'and a topic the form does not have');

  // ----- delete_my_account
  ok(/permission denied/.test(as('anon', '', `select public.delete_my_account();`).error || ''), 'a visitor cannot call delete_my_account');
  eq(as('authenticated', A, `select public.delete_my_account();`).error, undefined, 'a logged-in person deletes their account');
  eq(psql(`select (select count(*) from auth.users where id = '${A}'), (select count(*) from public.user_data where user_id = '${A}'), (select count(*) from auth.users), (select count(*) from public.user_data), (select count(*) from public.contact_messages where email = 'a@example.org'), (select count(*) from public.contact_messages where email = 'v@example.org');`).stdout.trim(), '0|0|1|1|0|1', 'the person, their row and the message they sent are gone; the other person and the visitor’s message are untouched');
  eq(psql(`select prosecdef, proconfig::text from pg_proc where proname = 'delete_my_account';`).stdout.trim(), 't|{"search_path=\\"\\""}', 'the function runs with its owner’s rights and a fixed search path');

  // ----- the cap on the open form: 30 messages an hour in all
  psql(`delete from public.contact_messages;`);
  let sent = 0, refused = null;
  for (let i = 0; i < 32; i++) { const x = as(i % 2 ? 'anon' : 'authenticated', i % 2 ? '' : B, `insert into public.contact_messages (email, topic, message) values ('m${i}@example.org', 'other', 'Message number ${i} of a burst.');`); if (x.error) { refused = refused || x.error; } else sent++; }
  eq([sent, /too many messages/.test(refused || '')], [30, true], 'the form takes 30 messages in an hour and refuses the rest');
  psql(`update public.contact_messages set created_at = now() - interval '2 hours';`);
  eq(as('anon', '', `insert into public.contact_messages (email, topic, message) values ('later@example.org', 'other', 'An hour later it works again.');`), { rows: [] }, 'and takes them again when the hour has moved on');
  ok(/permission denied/.test(as('anon', '', `select public.contact_messages_limit();`).error || '') || /trigger functions can only be called as triggers/.test(as('anon', '', `select public.contact_messages_limit();`).error || ''), 'the function behind the cap cannot be called by itself');

  // ----- the app and the script name the same things
  const server = fs.readFileSync(path.join(__dirname, '..', 'app', 'js', 'server', 'server.js'), 'utf8');
  eq([...new Set([...server.matchAll(/\.from\('(\w+)'\)/g)].map(m => m[1]))].sort(), ['contact_messages', 'user_data'], 'the app uses exactly the two tables the script makes');
  eq([...server.matchAll(/\.rpc\('(\w+)'\)/g)].map(m => m[1]), ['delete_my_account'], 'and the one function');
} finally { stop(); }
console.log(`qc-schema: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
