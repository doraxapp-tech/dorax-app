// Dorax Finance — category suggestions with AI (a Supabase Edge Function named "suggest"). Phase 3 of making imports less work (owner,
// 2026-10-09: "reduce human error, the user's work and the load of accepting and categorizing every expense"). OFF until the person turns it on
// in Settings, and even then it runs only when they press "Suggest with AI" in an import's review.
//
// Every request needs a logged-in person. It receives the words of the rows still without a category (the app takes the numbers out, and
// they are taken out again here: logic.mjs) and the names of the person's groups; it asks Claude (Anthropic) which group fits each row and
// answers { ok: true, suggestions: [{ id, key, name }] } or { ok: false, code }. Codes: not_logged_in, not_set_up, limit, ai_failed, unknown.
// The app shows the suggestions to be looked at; nothing is accepted by itself.
//
// Kept: one line per call in public.ai_calls (who, when, how many rows), for the daily limit. No row's words are kept, here or in the logs.
// Secrets (Supabase > Edge Functions > Secrets, never in a file, a browser or a chat): ANTHROPIC_API_KEY.
// Optional: SUGGEST_MODEL (default claude-haiku-5-5), SUGGEST_DAILY (calls a person may make in 24 hours, default 20).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { cleanRows, cleanGroups, prompt, readAnswer } from './logic.mjs';

const env = (name: string, otherwise = '') => (Deno.env.get(name) || otherwise).trim();
const SITE = env('SITE_URL', 'https://dorax.app').replace(/\/$/, '');
const ORIGINS = [SITE, 'https://dorax-finance.vercel.app', 'http://localhost:5173'];
const cors = (req: Request) => {
  const origin = req.headers.get('origin') || '';
  return { 'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : SITE, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
};
const answer = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
// deno-lint-ignore no-explicit-any
type Any = any;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return answer(req, { ok: false, code: 'post_only' }, 405);
  try {
    const body: Any = await req.json().catch(() => ({})) || {};
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: who, error } = token ? await admin.auth.getUser(token) : { data: null, error: true };
    const user = !error && who && who.user ? who.user : null;
    if (!user) return answer(req, { ok: false, code: 'not_logged_in' }, 401);
    const key = env('ANTHROPIC_API_KEY'); if (!key) return answer(req, { ok: false, code: 'not_set_up' });

    const rows = cleanRows(body.rows), groups = cleanGroups(body.groups);
    if (!rows.length || !groups.length) return answer(req, { ok: true, suggestions: [] });
    // the daily limit: the table is schema.sql's; without it, the function says it is not set up rather than run without a limit
    const since = new Date(Date.now() - 86400000).toISOString(), daily = Number(env('SUGGEST_DAILY', '20')) || 20;
    const { count, error: cerr } = await admin.from('ai_calls').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('at', since);
    if (cerr) return answer(req, { ok: false, code: 'not_set_up' });
    if ((count || 0) >= daily) return answer(req, { ok: false, code: 'limit' });

    const p = prompt(rows, groups);
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: env('SUGGEST_MODEL', 'claude-haiku-5-5'), max_tokens: 4000, system: p.system, messages: [{ role: 'user', content: p.user }] }),
    }).catch(() => null);
    if (!r || !r.ok) { console.log('suggest: the AI answered', r ? r.status : 0); return answer(req, { ok: false, code: 'ai_failed' }); }
    const data: Any = await r.json().catch(() => null);
    const text = data && Array.isArray(data.content) ? data.content.filter((c: Any) => c && c.type === 'text').map((c: Any) => c.text).join('') : '';
    const suggestions = readAnswer(text, rows, groups);
    await admin.from('ai_calls').insert({ user_id: user.id, rows: rows.length });
    console.log('suggest:', rows.length, 'rows asked,', suggestions.length, 'answered');
    return answer(req, { ok: true, suggestions });
  } catch (_e) {
    return answer(req, { ok: false, code: 'unknown' }, 500);
  }
});
