/* Dorax Finance — what a new account starts with, and the names the app itself writes.
   A new account is blank: a few everyday groups and nothing else. No example data ships with the app. */

const BASE_CURRENCY = 'BRL';

// ---- Names the app itself writes, in the three languages: [English, Spanish, Portuguese]. English is the key.
// These are the few names a new account starts with or that the app adds (a salary row, a starting balance). They follow the language
// chosen until the person changes them. A name the person typed is never in this table's care: see relabel().
const NAME_LANGS = ['en', 'es', 'pt'];
const NAMES = [
  ['Home', 'Casa', 'Casa'],
  ['Subscriptions', 'Suscripciones', 'Assinaturas'],
  ['Going out', 'Salidas', 'Lazer'],
  ['Other', 'Otros', 'Outros'],
  ['Income', 'Ingresos', 'Renda'],
  ['Salary', 'Sueldo', 'Salário'],
  ['Other income', 'Otro ingreso', 'Outra receita'],
  ['Salary · 1st payment', 'Sueldo · 1.er pago', 'Salário · 1º pagamento'],
  ['Salary · 2nd payment', 'Sueldo · 2.º pago', 'Salário · 2º pagamento'],
  ['Salary · savings part', 'Sueldo · parte de ahorro', 'Salário · parte da poupança'],
  ['Left over', 'Queda libre', 'Sobra livre'],
  ['Main account', 'Cuenta principal', 'Conta principal'],
  ['Starting balance', 'Saldo inicial', 'Saldo inicial'],
];
const NAME_ROW = {}; NAMES.forEach(r => { NAME_ROW[r[0]] = r; });
/** A name key in a language. "Transfer to {a}|bb" names an account: its current name is put in. A key the table does not have is looked up in the
    interface translations, and is returned as it is when it is not there either. */
function nameIn(key, lang, state) {
  const cut = String(key).indexOf('|'), k = cut < 0 ? String(key) : String(key).slice(0, cut), a = cut < 0 ? null : String(key).slice(cut + 1), i = Math.max(0, NAME_LANGS.indexOf(lang)), row = NAME_ROW[k];
  let text = row ? row[i] : (typeof I18N !== 'undefined' && I18N[lang] && I18N[lang][k]) || k;
  if (a !== null) { const acct = state && state.accounts.find(x => x.id === a); text = text.replace('{a}', acct ? acct.name : ''); }
  return text;
}
/** Everything in an account that can carry a name the app wrote. Accounts come first: other names can contain an account's name. */
function namedThings(state) {
  return [...state.accounts, state, ...state.categories, ...state.categories.flatMap(c => c.subs), ...state.plan.lines, ...Object.keys(state.pay || {}).flatMap(y => state.pay[y]), ...state.goals, ...(state.goalMoves || []), ...state.rules, ...state.transactions];
}
const NAME_FIELDS = ['name', 'purpose', 'merchant', 'description', 'notes', 'note', 'remainderLabel'];
/** Marks every name that is in the table as written by the app: o.k = { field: key }. Used once, on data that was just written in English. */
function tagNames(state) {
  for (const o of namedThings(state)) for (const f of NAME_FIELDS) if (typeof o[f] === 'string' && NAME_ROW[o[f]]) (o.k = o.k || {})[f] = o[f];
  state.namesLang = 'en'; return state;
}
/** Puts the names the app wrote into another language. A name is the app's only while it still reads exactly as the app wrote it: once the person
    changes it, it is theirs, the mark is dropped and no language change touches it again. Returns how many names changed. */
function relabel(state, lang) {
  const from = state.namesLang; state.namesLang = lang; if (!from || from === lang) return 0;
  const things = namedThings(state), mine = [];
  for (const o of things) { if (!o.k) continue; for (const f of Object.keys(o.k)) { if (o[f] === nameIn(o.k[f], from, state)) mine.push([o, f]); else delete o.k[f]; } if (!Object.keys(o.k).length) delete o.k; }
  for (const [o, f] of mine) { o[f] = nameIn(o.k[f], lang, state); if (f === 'merchant' && o.fingerprint) o.fingerprint = fingerprint(o.accountId, o.date, o.merchant, o.amount); }
  return mine.length;
}
const clone = o => JSON.parse(JSON.stringify(o));

/** What a profile starts from when the person has none: the OFX version most accounting platforms read. */
const OFX_BASE = { version: '102', language: 'POR', transferMapping: 'SIGN' };
/** Compensation codes of the banks in the list (Banco Central do Brasil). They go into the OFX file as the bank identifier; the person can change them in the profile. */
const BANK_CODES = { 'Banco do Brasil': '001', 'Santander': '033', 'Inter': '077', 'Caixa': '104', 'Bradesco': '237', 'Nubank': '260', 'Mercado Pago': '323', 'C6 Bank': '336', 'Itaú': '341', 'Wise': 'WISE' };
const BANKS = ['Nubank', 'Banco do Brasil', 'Mercado Pago', 'Santander', 'Wise', 'Itaú', 'Bradesco', 'Caixa', 'Inter', 'C6 Bank'];

/** A new account: a few everyday groups in the person's language, no accounts, no fixed costs, no income, no goals, no investments.
    The group names are the app's own, so they follow the language until the person renames them. */
function buildNewState(email, lang, today) {
  const year = +today.slice(0, 4);
  const s = {
    today, month: ymOf(today),
    accounts: [], rules: [], transactions: [], imports: [], exports: [], closes: {}, ofxProfiles: [],      // no OFX profile to start with: one is made from each account when it is first converted
    recurringManual: [], recurringDismissed: [],
    categories: [{ id: 'home', name: 'Home', color: 's3', subs: [] }, { id: 'subs', name: 'Subscriptions', color: 's2', subs: [] }, { id: 'fun', name: 'Going out', color: 's1', subs: [] }, { id: 'other', name: 'Other', color: 's4', subs: [] },
      { id: 'income', name: 'Income', color: null, income: true, subs: [{ id: 'salary', name: 'Salary' }] }],
    plan: { lines: [] }, pay: { [year]: [] }, goals: [], goalMoves: [], remainderLabel: 'Left over', fii: { assets: {}, moves: [], sim: {} },
    user: { name: '', email, tone: 'friend', notify: { bills: true, close: false, summary: false, goals: true }, channels: { email: true }, remind: { lead: 3, snoozed: {} }, since: today, pendingEmail: null },
    settings: { lang: NAME_LANGS.includes(lang) ? lang : 'en', locale: 'pt-BR', autoAcceptVerified: true, defaultProfile: null, closeDay: 15, platform: '', theme: 'dark' },
    clean: true, isNew: true,
  };
  tagNames(s); relabel(s, s.settings.lang);
  return s;
}
