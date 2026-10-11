/* Dorax Finance — shared: finding accounts and categories, option lists. */
// ---------- lookups ----------
const acct = id => S.accounts.find(a => a.id === id);
const isBiz = id => { const a = acct(id); return !!a && a.scope === 'business'; };
const personal = () => S.accounts.filter(a => a.scope !== 'business');
const business = () => S.accounts.filter(a => a.scope === 'business');
/** The accounts whose statement is sent every month, as the person said for each one. With a month: those that already counted in that month. */
const needStatements = ym => S.user.company === false ? [] : S.accounts.filter(a => owesStatement(a, ym));      // a company put away owes no statements
// platLabel (the accounting platform's name) lives in features/reminders/reminder-messages.js, which the server's reminder job shares.
/** Accounts in the order the converter offers them: the ones on the monthly list, then the other company accounts, then the household's. */
const convAccounts = () => { const m = needStatements(); return [...m, ...business().filter(a => !m.includes(a))]; };      // the company's (the converter is on its side only, 2026-10-09); a household account already on the monthly list stays
// ---------- which book: the household's or the company's ----------
// The dashboard, Plan, Savings & goals and Categories have two sides (core/books.js). The page says which one it shows (UI.space, UI.spaceCur); everything those
// screens read and write goes through B(), the book in use, instead of S. A panel remembers the book it was opened for (drawer.book), a
// button can name one (data-book: a company bill in the bell), and while a view or an action runs the book is fixed (inBook), so the page
// behind a panel never borrows the panel's book. On every other screen B() is S: the household, as before.
const SPACE_ROUTES = ['dashboard', 'plan', 'goals', 'categories', 'reports'];      // reports: since 2026-10-07
let BOOK_NOW = null;
function inBook(key, fn) { const was = BOOK_NOW; BOOK_NOW = key || 'personal'; try { return fn(); } finally { BOOK_NOW = was; } }
/** The book the page itself shows: the company's only on a screen that has two sides, and only when it was chosen. */
function pageBookKey() {
  if (UI.space !== 'business' || !SPACE_ROUTES.includes(UI.route)) return 'personal';
  const cs = companyCurrencies(S); return cs.length ? bookKeyOf(cs.includes(UI.spaceCur) ? UI.spaceCur : cs[0]) : 'personal';
}
/** The book of the side in use, whatever screen is open (the quick list can be opened from any of them). */
function pageBookKeyFor() { if (UI.space !== 'business') return 'personal'; const cs = companyCurrencies(S); return bookKeyOf(cs.includes(UI.spaceCur) ? UI.spaceCur : cs[0]); }
function setPageBook(key) { const co = String(key || '').startsWith('business:'); UI.space = co ? 'business' : 'personal'; if (co) UI.spaceCur = key.slice(9); UI.dist = UI.fill = UI.catEdit = null; UI.pg = {}; }
const bookKey = () => BOOK_NOW || (UI.drawer && UI.drawer.book) || pageBookKey();
const B = () => bookOf(S, bookKey());
const inCompany = () => B() !== S;
/** Does this person keep a company here? Yes when they said so (the dashboard's question, the menu, or by entering its side), and for an account
    that was never asked but already holds something of a company (an account, a name, a plan: companyBlank, features/company). Whoever is on the
    company's side has one, whatever else is true, so the way back is never lost. Until then the app is the household's alone: no Household | Company choice is shown
    (owner, 2026-10-07: "use the answer to show the switch or not; by default it is not shown until they answer"). */
const hasCompany = () => S.user.company === true || UI.space === 'business' || (S.user.company === undefined && !companyBlank());
/** The currency of the book in use: the company book's own, the account's otherwise. */
const BCUR = () => { const b = B(); return b === S ? BASE_CURRENCY : b.currency; };
/** The accounts money of this book can sit in: the household's in its currency, or the company's in the book's. */
const bookAccounts = () => { const co = inCompany(), cur = BCUR(); return S.accounts.filter(a => (a.scope === 'business') === co && a.currency === cur); };
/** The main account (owner, 2026-10-09: "a switch in each account's menu to make it the main one; only one can be main, no more; the main account is
    where the household's or the business's costs are charged"). It pays by debit: a checking account, a savings account whose card has debit, or cash. */
const canBeMain = a => !!a && !a.savingsOf && (cardHasDebit(a) || a.type === 'cash');
/** A side's main account: the one marked, else the first that could be, so there is always one while the side has an account that pays. Asked
    for a currency (a bill, a book), the main one when it is in that currency, else the first of the side in it. */
const mainOf = (scope, cur) => { const list = S.accounts.filter(a => (a.scope === 'business') === (scope === 'business') && canBeMain(a)), m = list.find(a => a.main) || list[0] || null;
  return !cur || (m && m.currency === cur) ? m : list.find(a => a.currency === cur) || null; };
/** The main account of the book in use. */
const mainAcct = () => mainOf(inCompany() ? 'business' : 'personal', BCUR());
/** Makes an account its side's main one, or stops it being: one per side. */
function setMain(a, on) { S.accounts.forEach(k => { if (k.main && (k.scope === 'business') === (a.scope === 'business')) delete k.main; }); if (on) a.main = true; }
/** Where a goal's money can be kept: any household account, or the company's accounts in the book's currency. */
const goalAccounts = () => inCompany() ? bookAccounts() : personal();
/** Runs fn once for the household and once for every company book, and joins what it answers. */
const everyBook = fn => ['personal', ...companyBooks(S).map(b => b.key)].flatMap(k => inBook(k, fn));
/** On the company's side with no company account in the book's currency: said once at the top of the page, with the way to add one.
    Planning works without it; paying a bill and saying where a goal's money is kept need the account. */
const companyNote = () => !inCompany() || bookAccounts().length ? '' : banner('', `<b>${t('No company account in {cur} yet.', { cur: BCUR() })}</b> ${t('You can plan here already. Add the company’s account to pay its bills from it and to keep its goals in it.')}<div class="row" style="margin-top:8px"><button class="btn sm" data-a="edit-account" data-scope="business" data-cur="${BCUR()}">${icon('plus')}${t('Add company account')}</button></div>`);
/** Many steps happen in an account: a payment, a transaction, a statement, a bank connection. When there is none, the message that says so carries
    the way to add one, so nobody has to go and look for it (owner, 2026-10-08: "several functions need the user to add an account first: make sure
    the message has a button to add one"). On the company's side it is a company account, in the page's currency. The button opens the account
    form (account-add, features/accounts/accounts.actions.js). */
const acctWord = () => inCompany() ? t('Add company account') : t('Add account');
const acctButton = () => `<div class="row" style="margin-top:8px"><button class="btn sm primary" data-a="account-add">${icon('plus')}${acctWord()}</button></div>`;
function needAccount() { toast(t('Add an account first.'), { a: 'account-add', label: acctWord() }); }
/** A panel's or a screen's error. The one about a missing account comes with its button. */
const errBanner = msg => banner('crit', esc(msg) + (msg === t('Add an account first.') ? acctButton() : ''));
/** A side's categories are shared by all its books: the household has one, the company one per currency it plans in. So what follows a
    category (the fixed costs under it, the income rows) is looked for in every one of them. */
const sideBooks = () => inCompany() ? Object.values((S.company || {}).books || {}) : [S];
const sideLines = () => sideBooks().flatMap(b => (b.plan || {}).lines || []);
/** The category that keeps what has none: it can be renamed, never deleted, and it takes what a deleted category held. */
const otherId = () => inCompany() ? 'co-other' : 'other';
/** A text that names the currency ("Amount (R$)"), in the currency of the book in use. */
const tcur = (key, vars) => t(key, vars).replace('R$', SYMBOL[BCUR()] || BCUR());
function catOf(id) { for (const c of [...S.categories, ...companyCats()]) { if (c.id === id) return { cat: c }; const s = c.subs.find(x => x.id === id); if (s) return { cat: c, sub: s }; } return null; }
function catName(id) { const f = catOf(id); return f ? (f.sub ? f.sub.name : f.cat.name) : t('Uncategorized'); }
function catColor(catId) { const c = S.categories.find(x => x.id === catId) || companyCats().find(x => x.id === catId); return c && c.color ? `var(--${c.color})` : 'var(--ink-3)'; }
function catLabel(x) {
  if (x.accountId && isBiz(x.accountId)) { const f = x.type !== 'transfer' && (x.subcategoryId || x.categoryId) && catOf(x.subcategoryId || x.categoryId), co = f && ((S.company || {}).categories || []).includes(f.cat); return `<span class="cat muted">${t('Company')}${co ? ' · ' + esc((f.sub || f.cat).name) : ''}</span>`; }
  if (x.type === 'transfer') return `<span class="cat muted">${t('Transfer')}</span>`;
  if (x.splits && x.splits.length) return `<span class="cat">${catGlyph(x.splits[0].categoryId, 'sm')}${t('Split · {n} categories', { n: x.splits.length })}</span>`;
  const c = S.categories.find(k => k.id === x.categoryId);
  if (!c) return `<span class="cat muted">${t('Uncategorized')}</span>`;
  const sub = c.subs.find(s => s.id === x.subcategoryId);
  return `<span class="cat">${catGlyph(c, 'sm', sub && sub.id)}${esc(sub ? sub.name : c.name)}${sub ? ' <span class="muted">· ' + esc(c.name) + '</span>' : ''}</span>`;
}
const catKey = (c, s) => (c || '') + '|' + (s || '');
function catOptions(selected, opt) {
  opt = opt || {};
  let h = opt.blank ? `<option value="|"${selected === '|' ? ' selected' : ''}>${esc(opt.blank)}</option>` : '';
  for (const c of opt.list || S.categories) {
    if (opt.expenseOnly && c.income) continue;
    h += `<optgroup label="${esc(c.name)}"><option value="${catKey(c.id)}"${selected === catKey(c.id) ? ' selected' : ''}>${esc(c.name)}${c.subs.length ? ' ' + t('(general)') : ''}</option>`;
    for (const s of c.subs) h += `<option value="${catKey(c.id, s.id)}"${selected === catKey(c.id, s.id) ? ' selected' : ''}>${esc(s.name)}</option>`;
    h += '</optgroup>';
  }
  return h;
}
/** The company's own groups (its fixed costs and its income), once its side has been opened; none before. */
const companyCats = () => (S.company || {}).categories || [];
const options = (pairs, sel) => pairs.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(sel) ? ' selected' : ''}>${esc(l)}</option>`).join('');
/** An account as a dropdown names it: the main one says so (owner, 2026-10-09: "in the dropdowns where the user picks bank accounts, add (principal)
    beside the one that is the user's main account"). */
// a card's credit or a savings card's debit, where a list offers it, is named after its card: "Nubank · Crédito" (owner, 2026-10-09: the lists showed
// ledgers by their own names, "Santander (débito)", "Nubank PF", next to the cards)
const acctName = a => { const m = cardMain(a); return m && m !== a ? `${m.name} · ${a.type === 'credit' ? t('Credit') : t('Debit')}` : a.name; };
const acctLabel = a => { const name = acctName(a); return canBeMain(a) && mainOf(a.scope) === a ? t('{name} (main)', { name }) : name; };
/** One side's accounts: the household's, or the company's (owner, 2026-10-09: "in transactions, choosing the account, I get the PJ accounts"). */
const sideAccounts = scope => S.accounts.filter(a => (a.scope === 'business') === (scope === 'business'));
/** What a bill or a cost can be paid from: this book's cards, and the credit of a card that has it; a savings card's debit is reached through its card. */
const payAccounts = () => cashAccounts().filter(a => !a.savingsOf);
const acctOptions = (sel, blank, list) => (blank ? `<option value="">${esc(blank)}</option>` : '') + options((list || S.accounts).map(a => [a.id, acctLabel(a)]), sel);
const TYPES = () => [['expense', t('Expense')], ['income', t('Income')], ['transfer', t('Transfer')], ['adjustment', t('Adjustment')]];
const STATUSES = () => [['confirmed', t('Confirmed')], ['pending', t('Pending')], ['ignored', t('Ignored')]];
/** The banks a dropdown offers, A to Z (owner, 2026-10-09: "sort the banks dropdown alphabetically"), with an account's own institution among them
    and "Other" last. The one chosen for a new account is still the first of BANKS. */
const bankChoices = (...keep) => [...new Set([...BANKS, ...keep.filter(b => b && b !== t('Other'))])].sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' })).concat(t('Other'));
const ACCT_TYPES = () => [['checking', t('Checking')], ['savings', t('Savings')], ['credit', t('Credit card')], ['cash', t('Cash')]];
const sourceLabel = s => ({ csv: t('CSV file'), ofx: t('OFX file'), manual: t('Manual entry'), say: t('Written as a sentence'), goal: t('A goal’s contribution or withdrawal'), sheet: t('Spreadsheet'), bank: t('Bank connection') }[s] || s);
const LANGS = [['es', 'Español'], ['pt', 'Português'], ['en', 'English']];
