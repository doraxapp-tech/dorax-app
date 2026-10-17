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
/** The side's main account among a list of accounts (as mainOf, for a list about to be: what is left once an account is deleted). */
const mainAmong = (list, scope) => { const ok = list.filter(a => (a.scope === 'business') === (scope === 'business') && canBeMain(a)); return ok.find(a => a.main) || ok[0] || null; };
// ---------- the main currency is the main account's (v224, owner, 2026-10-14: "si el usuario elige una cuenta principal la moneda de la app cambia a la
// moneda de esa cuenta; las metas deben mantenerse en la moneda de la cuenta de ahorro elegida en 'se guarda en'") ----------
// The household's totals, plan, limits and reports are counted in its main account's currency. Nothing is converted: when the main account changes to
// one in another currency, the plan keeps its numbers in the new currency (the person is told before, and asked when the plan has numbers); each
// goal stays in its own account's currency (core/goals.js: goalCur). S.settings.currency keeps the currency, so the server's reminder job reads it
// as before; it is set here, and chosen by hand only while there is no account to follow.
const homeMainCur = () => { const m = mainOf('personal'); return m && CURRENCIES.includes(m.currency) ? m.currency : null; };
/** Whether the household's plan has numbers a new currency would read differently: a line, or a payment with an amount. */
const planHasNumbers = () => S.plan.lines.length > 0 || Object.values(S.pay || {}).some(rows => (rows || []).some(r => (r.values || []).some(v => v)));
/** Which account is the household's main one now, and in which currency: taken before a change, so the currency follows only a change of it. */
const mainSnap = () => { const m = mainOf('personal'); return m ? m.id + '|' + m.currency : ''; };
/** The main currency follows the main account; the currency it took, else null. With snap (a mainSnap taken before a change) it follows only when
    the main account or its currency changed since: saving or deleting another account never moves it. mode 'quiet': only while the plan has no
    numbers a new currency would read differently; otherwise the money stays counted as it was, and Settings says so and offers the change. Without
    a mode the person was told before (the form's note, the delete question, the question of makeMain). A goal not stamped yet keeps the currency
    its numbers were written in. */
function followMainCur(snap, mode) {
  const c = homeMainCur(); if (!c || c === currencyOf(S) || (snap !== undefined && mainSnap() === snap)) return null;
  if (mode === 'quiet' && planHasNumbers()) return null;
  stampGoalCurrencies(S); S.settings.currency = c; syncCurrency(); return c;
}
/** An account from before v224 whose money was counted in another currency than its main account's: with no plan to read differently, it follows at
    once; with one, Settings says so and offers the change (features/settings/settings.view.js). */
function alignMainCur() { const m = mainOf('personal'); if (!m || (!m.main && S.transactions.length) || planHasNumbers()) return null; return followMainCur(); }      // a main account only taken as the first that could be, with a history: left as it was
/** What a change of currency says, before (in the form, in the question) and after (in the note). */
const curFollowText = c => t('Your totals and your plan are counted in {currency} from now on, with the same numbers: check your pay and your fixed costs. Each goal stays in its own account’s currency. Nothing is converted.', { currency: curName(c) });
/** Makes an account the household's main one, asking first when its currency is another and the plan has numbers. */
function makeMain(a) {
  if (a.scope === 'business') { setMain(a, true); toast(t('{name} is now the main account.', { name: a.name })); return render(); }      // the company's: its own currencies (core/books.js)
  const c = CURRENCIES.includes(a.currency) && a.currency !== currencyOf(S) ? a.currency : null;
  const go = () => { setMain(a, true); const now = followMainCur(); toast(now ? t('{name} is now the main account. Your money is counted in {currency}.', { name: a.name, currency: curName(now) }) : t('{name} is now the main account.', { name: a.name })); render(); };
  if (!c || !planHasNumbers()) return go();
  confirmBox({ tone: 'neutral', title: t('Count your money in {name}?', { name: curLong(c) }), label: t('Make it the main account'), run: go, onCancel: () => render(),
    text: t('{name} becomes your main account.', { name: a.name }) + ' ' + curFollowText(c) });
}
/** A goal's currency, in the book in use (v224, core/goals.js: goalCur): its savings account's. */
const gCur = g => goalCur(B(), g);
/** An amount of several goals, each currency apart and the book's own first: "R$ 12.000 · CUP 40.000" (v224: nothing is converted). */
const goalSumParts = (goals, val, opt) => { const own = bookCur(B()), cs = [...new Set(goals.map(gCur))].sort((a, b) => (b === own) - (a === own)), of = c => sum(goals.filter(g => gCur(g) === c).map(val)), shown = cs.filter(c => c === cs[0] || of(c));      // another currency with nothing in it is left out
  return (shown.length ? shown : [own]).map(c => fmt.money(of(c), c, opt)); };
const goalSums = (goals, val, opt) => goalSumParts(goals, val, opt).join(' · ');
/** The same as a big figure: the first currency large, the others on a small line under it ("+ CUP 50.000"), so a figure never breaks in two. */
const goalSumsBig = (goals, val, opt) => { const p = goalSumParts(goals, val, opt); return p[0] + (p.length > 1 ? `<small class="sums-rest">+ ${p.slice(1).join(' · ')}</small>` : ''); };
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
/** The same, in a currency of its own: a goal's (v224). */
const tcurIn = (key, cur, vars) => t(key, vars).replace('R$', SYMBOL[cur] || cur);
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
const PLACE_NAMES = () => ({ BR: t('Brazil'), CU: t('Cuba'), ES: t('Spain'), DE: t('Germany'), INT: t('International') });
/** The same banks grouped by country (v224, owner, 2026-10-14: "separa la lista de los dropdowns en toda la app por continente o país y una línea al
    lado para que no se mezclen"): each country under its name with a line beside it, A to Z inside; a bank the app does not know (one typed in an
    imported file) and "Other" after a line at the end. Where the browser draws its own list (an iPhone, Firefox) the countries are its sections. */
function bankOptions(sel, ...keep) {
  // each bank with its logo (owner, 2026-10-14: "agrega los logos de los bancos a los dropdowns para que sean más escaneables"), the chosen one's in the
  // closed field too. The logo is a picture with no words of its own (the name beside it says the bank), so where the system draws the list it is
  // simply left out; a bank with no logo file keeps an empty circle, so the names line up.
  const logo = b => { const m = BANK_MARKS[b], src = m && typeof BANK_LOGOS !== 'undefined' && BANK_LOGOS[m.id]; return src ? `<img class="bk-logo" src="${esc(src)}" alt="" width="24" height="24" decoding="async">` : '<span class="bk-logo none" aria-hidden="true"></span>'; };
  // sel: the bank, or the bank and its country ("Santander@ES": bankPick) when it is in more than one
  const all = bankChoices(...keep), other = t('Other'), names = PLACE_NAMES(), now = bankUnpick(sel), opt = (b, p) => { const v = p ? bankPick(b, p) : b, on = b === now.name && (!p || p === now.place); return `<option value="${esc(v)}"${on ? ' selected' : ''}>${b === other ? `<span class="bk-logo dx" aria-hidden="true" style="background:${DX_MARK.bg};color:${DX_MARK.ink}">${dxBank()}</span>` : logo(b)}${esc(b)}</option>`; };
  const groups = PLACE_ORDER.map(p => [p, all.filter(b => bankPlaces(b).includes(p))]).filter(([, bs]) => bs.length);
  const rest = all.filter(b => b !== other && !bankPlaces(b).length).concat(other);
  return '<button type="button" class="bk-now"><selectedcontent></selectedcontent></button>' + groups.map(([p, bs]) => `<optgroup label="${esc(names[p])}"><legend>${esc(names[p])}</legend>${bs.map(b => opt(b, p)).join('')}</optgroup>`).join('<hr>') + '<hr class="bk-end">' + rest.map(b => opt(b)).join('');
}
const ACCT_TYPES = () => [['checking', t('Checking')], ['savings', t('Savings')], ['credit', t('Credit card')], ['cash', t('Cash')]];
const sourceLabel = s => ({ csv: t('CSV file'), ofx: t('OFX file'), manual: t('Manual entry'), say: t('Written as a sentence'), goal: t('A goal’s contribution or withdrawal'), sheet: t('Spreadsheet'), bank: t('Bank connection') }[s] || s);
const LANGS = [['es', 'Español'], ['pt', 'Português'], ['en', 'English']];
