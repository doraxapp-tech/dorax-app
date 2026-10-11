/* Dorax Finance — shared: translation (t) and escaping. */
// ---------- translation: English source strings are the keys; es / pt live in i18n.js ----------
// The person's tone picks the wording: "friend" looks in the voice table first, "plain" goes straight to the neutral text.
function t(s, v) {
  const lang = S.settings.lang, d = I18N[lang], tone = UI.forceTone || (S.user && S.user.tone) || 'friend';
  // a key may carry a context after "@" ("Income@kind": one income, where Spanish says "Ingreso", not the total "Ingresos"); English drops it
  let out = (tone === 'friend' && VOICE[lang] && VOICE[lang][s]) || (d && d[s]) || s.replace(/@\w+$/, '');
  if (v) out = out.replace(/\{(\w+)\}/g, (_, k) => v[k]);
  return out;
}
const tn = (n, one, many, v) => t(n === 1 ? one : many, { n, ...(v || {}) });

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** How the app calls a person: the first of the names they gave (owner, 2026-10-07: "if the user enters their full name, use only the first name"). */
const firstName = s => String(s == null ? '' : s).trim().split(/\s+/)[0] || '';
