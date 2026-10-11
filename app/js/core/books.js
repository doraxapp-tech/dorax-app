/* Dorax Finance — calculations: the household's book and the company's books. */
// ---------- books ----------
// A "book" is one side's plan: its fixed costs, its income rows, its goals and what was set aside for them.
// The household's book is the account itself, as it always was. A company (PJ) has one book per currency its accounts hold money in, kept
// apart under state.company, so that company money never adds into a household total and reais never add into dollars:
//   state.company = { categories: [groups for the company's fixed costs, and its income],
//                     books: { BRL: { goals, goalMoves, plan: { lines }, pay: { year: [rows] } }, USD: { ... } } }
// Every calculation takes a state. A company book answers like one: its own goals, fixed costs, income and groups, and everything else
// (accounts, transactions, today, settings) from the account. So plan.js, goals.js and reminders.js work on either side unchanged; the one
// thing they ask is state.scope ('business' for a company book), which decides whose accounts count (inScope, reporting.js).
// A book's key is 'personal', or 'business:' and the currency.
const COMPANY_GROUPS = [['co-tax', 'Taxes', 's4'], ['co-services', 'Accounting and services', 's3'], ['co-tools', 'Tools and software', 's5'], ['co-people', 'Pay and people', 's1'], ['co-other', 'Other', 's2']];
const BOOK_PARTS = ['goals', 'goalMoves', 'plan', 'pay', 'journey'];      // journey: the way out of debt (core/journey.js)

/** The currencies the company's side can be planned in, the account's own currency first: every currency a company account holds, every
    currency a company book already has something in (so a plan is never lost with its account), and, when there is neither, the account's
    own currency. So the company's side is there for everybody, with or without a company account (owner, 2026-10-06: "I never created one,
    make it visible for all users for now"). */
function companyCurrencies(state) {
  const books = (state.company || {}).books || {}, used = c => { const b = books[c] || {}; return !!((b.goals || []).length || ((b.plan || {}).lines || []).length || Object.values(b.pay || {}).some(rows => (rows || []).length)); };
  const cs = [...new Set([...state.accounts.filter(a => a.scope === 'business').map(a => a.currency), ...Object.keys(books).filter(used)])];
  if (!cs.length) cs.push(BASE_CURRENCY);
  return cs.sort((a, b) => a === BASE_CURRENCY ? -1 : b === BASE_CURRENCY ? 1 : a < b ? -1 : a > b ? 1 : 0);
}
/** What is kept for the company in one currency. With make, it is started when it is not there yet (the app, on first use); without, the
    answer is null (the server's reminder job reads, it never writes). */
function companyData(state, cur, make) {
  if (!state.company || !state.company.books || !state.company.categories) {
    if (!make) return null;
    const lang = state.namesLang || (state.settings || {}).lang || 'en', named = key => ({ name: nameIn(key, lang, state), k: { name: key } });
    state.company = { categories: [...COMPANY_GROUPS.map(([id, key, color]) => ({ id, ...named(key), color, subs: [] })), { id: 'co-income', ...named('Income'), color: null, income: true, subs: [{ id: 'co-clients', ...named('Client payments') }] }], books: {}, ...(state.company || {}) };
    state.company.books = state.company.books || {};
  }
  let own = state.company.books[cur];
  if (!own) { if (!make) return null; own = state.company.books[cur] = { goals: [], goalMoves: [], plan: { lines: [] }, pay: {} }; }
  if (make) { const y = String(state.today || '').slice(0, 4); if (y && !own.pay[y]) own.pay[y] = []; }
  return own;
}
/** A company book, to hand to any calculation in place of the account. Reading a part it does not keep goes to the account; so does writing one. */
function companyBook(state, cur, make) {
  const own = companyData(state, cur, make !== false); if (!own) return null;
  const co = state.company;
  return new Proxy(own, {
    get(o, k) { return k === 'scope' ? 'business' : k === 'currency' ? cur : k === 'categories' ? co.categories : BOOK_PARTS.includes(k) ? o[k] : state[k]; },
    set(o, k, v) { if (k === 'categories') co.categories = v; else if (BOOK_PARTS.includes(k)) o[k] = v; else state[k] = v; return true; },
    has(o, k) { return k in o || k in state; },
  });
}
const bookKeyOf = cur => 'business:' + cur;
/** The book a key names. An unknown key, or a company currency that has neither an account nor a plan, is the household's. */
function bookOf(state, key) {
  const cur = String(key || '').startsWith('business:') ? key.slice(9) : null;
  return cur && companyCurrencies(state).includes(cur) ? companyBook(state, cur, true) : state;
}
/** The company books that exist, each with its currency. Nothing is created: an account whose company side was never opened answers an empty list,
    and so does one whose owner said the company is no more. */
function companyBooks(state) {
  if ((state.user || {}).company === false) return [];      // "I no longer have a company": its books are kept, and left alone (features/company)
  return companyCurrencies(state).map(cur => ({ cur, key: bookKeyOf(cur), book: companyBook(state, cur, false) })).filter(x => x.book);
}
/** Everything the company keeps that can carry a name the app wrote (see namedThings, data/defaults.js). */
function companyNamed(state) {
  const co = state.company; if (!co || !co.categories) return [];
  const books = Object.values(co.books || {});
  return [...co.categories, ...co.categories.flatMap(c => c.subs || []), ...books.flatMap(b => [...((b.plan || {}).lines || []), ...Object.keys(b.pay || {}).flatMap(y => b.pay[y]), ...(b.goals || []), ...(b.goalMoves || [])])];
}
