// Dorax Finance — the plain rules of the function "suggest" (category suggestions with AI), kept apart from the server so they can be tested.
// What may leave the person's device, what Claude is asked, and how its answer is read: only the person's own groups, only the rows sent.

export const MAX_ROWS = 80, MAX_TEXT = 140, MAX_GROUPS = 150;

/** A bank line as it may leave the device: its words without any number (no dates, ids, amounts or masked documents), at most 140 letters. */
export const cleanText = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ')
  .split(/\s+/).filter(w => w && !/\d/.test(w)).join(' ').slice(0, MAX_TEXT).trim();

/** The rows asked about: { id, text, dir: 'out' | 'in' }, at most 80, each with some words left. */
export function cleanRows(rows) {
  return (Array.isArray(rows) ? rows : []).slice(0, MAX_ROWS).map(r => ({ id: String((r && r.id) || '').slice(0, 40), text: cleanText(r && r.text), dir: r && r.dir === 'in' ? 'in' : 'out' }))
    .filter(r => r.id && r.text);
}
/** The person's groups: { key, name, dir }, at most 150. A key is the app's own ("category|part"); a name is what the person called it. */
export function cleanGroups(groups) {
  return (Array.isArray(groups) ? groups : []).slice(0, MAX_GROUPS).map(g => ({ key: String((g && g.key) || '').slice(0, 80), name: String((g && g.name) || '').replace(/\s+/g, ' ').trim().slice(0, 80), dir: g && g.dir === 'in' ? 'in' : 'out' }))
    .filter(g => g.key && g.name);
}
/** What Claude is told, and what it is given. */
export function prompt(rows, groups) {
  const system = 'You file lines of Brazilian bank statements into the spending and income groups of one person. For each line, choose the one group key that fits it best, '
    + 'or null when no group clearly fits: a wrong group is worse than none. Lines going out ("out") take only "out" groups; lines coming in ("in") take only "in" groups. '
    + 'Also give the name of who was paid, or who paid, as a person would write it (for example "Padaria Sol", "Uber", "Roberto"), or null. '
    + 'Answer with JSON only, no other text: {"s":[{"id":"...","key":"..." or null,"name":"..." or null}]}';
  const user = JSON.stringify({ groups: groups.map(g => ({ key: g.key, name: g.name, dir: g.dir })), lines: rows.map(r => ({ id: r.id, text: r.text, dir: r.dir })) });
  return { system, user };
}
/** Claude's answer read strictly: rows that were asked about, once each; a key only when it is one of the person's groups of the row's direction. */
export function readAnswer(text, rows, groups) {
  const m = String(text || '').match(/\{[\s\S]*\}/); if (!m) return [];
  let data; try { data = JSON.parse(m[0]); } catch (e) { return []; }
  const byId = new Map(rows.map(r => [r.id, r])), keys = new Map(groups.map(g => [g.key, g])), out = [];
  for (const s of Array.isArray(data && data.s) ? data.s : []) {
    const r = s && byId.get(String(s.id)); if (!r) continue;
    byId.delete(r.id);
    const g = s.key == null ? null : keys.get(String(s.key)), key = g && g.dir === r.dir ? g.key : null;
    const name = typeof s.name === 'string' && s.name.trim() ? s.name.replace(/\s+/g, ' ').trim().slice(0, 40) : null;
    if (key || name) out.push({ id: r.id, key, name });
  }
  return out;
}
