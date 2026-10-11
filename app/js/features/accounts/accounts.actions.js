/* Dorax Finance — clicks: accounts. Joined into A in app/actions.js. */
const ACCOUNTS_ACTIONS = {
  // accounts
  /** "Add account" from a message that needed one (needAccount, ui/lookups.js) or from the quick things to do: the account form, for the side in use. */
  'account-add'() {
    const co = UI.space === 'business'; UI.sheet = false; if (UI.toast && UI.toast.action && UI.toast.action.a === 'account-add') hideToast();
    ACCOUNTS_ACTIONS['edit-account']({ id: '', scope: co ? 'business' : 'personal', cur: co ? BCUR() : 'BRL' });
    const el = $('a-name'); if (el) el.focus();
  },
  'edit-account'(ds) {
    const a = cardMain(S.accounts.find(x => x.id === ds.id));      // a card's credit or debit ledger opens the card's own account
    // an account whose card has credit carries it in the same form (owner, 2026-10-09: "one card with two functions"): its limit, due date and invoice
    const sp = a && cardSpend(a), spend = sp ? { spendId: sp.id, spendOpeningText: plain(sp.opening || 0) } : {};      // a savings account's balance to spend
    const cr = a && cardCredit(a), credit = cr ? { hasCredit: true, creditId: cr.id, creditLimitText: cr.creditLimit ? plain(cr.creditLimit) : '', creditDue: cardNextDue(cr, S.today), creditOwedText: plain(Math.max(0, -cr.opening || 0)) } : {};
    // the main account is turned on in another account, never off: there is always one (owner, 2026-10-09: "only one can be main")
    const scope = a ? a.scope : ds.scope === 'business' || (!ds.scope && UI.space === 'business') ? 'business' : 'personal', mainNow = a ? mainOf(a.scope) === a : !mainOf(scope);
    UI.drawer = { kind: 'account', title: a ? t('Edit account') : t('Add account'), isNew: !a, mainNow, draft: a ? { ...a, main: mainNow, ...credit, ...spend, monthly: owesStatement(a), openingText: plain(a.opening || 0), limitText: a.creditLimit ? plain(a.creditLimit) : '', dueDate: cardNextDue(a, S.today) } : { id: null, name: '', institution: BANKS[0], type: ds.type === 'savings' ? 'savings' : 'checking', currency: ds.cur || 'BRL', scope: ds.scope === 'business' || (!ds.scope && UI.space === 'business') ? 'business' : 'personal', purpose: '', openingText: '', limitText: '', main: mainNow } };      // Plan and Goals ask for a company account in their currency (companyNote)
    renderOverlay();
  },
  'save-account'() {
    const a = UI.drawer.draft, opening = typedAmount(String(a.openingText || '').trim() || '0');
    // what the app needs from an account (owner, 2026-10-09: "the inputs the app needs must be filled in"): its name, the money in it today (0 is an
    // answer, an empty field is not: every balance, the days of freedom and the net balance start from it) and, with credit, the next invoice's
    // due date and the invoice as it stands (without them no reminder, no late invoice and no amount to pay can be right)
    if (!a.name.trim()) return fail(t('Enter an account name.'), 'a-name');
    if (!String(a.openingText || '').trim()) return fail(a.type === 'savings' ? t('Enter how much is saved in it today: 0 if nothing yet.') : a.type === 'credit' ? t('Enter what is owed on the card today, as a negative amount: 0 if nothing.') : t('Enter the money in the account today: 0 if it is empty.'), 'a-open');
    if (opening === null) return fail(t('Enter the opening balance as a number, for example 1500,00.'), 'a-open');
    // a card's next due date: its day, and the month of its first invoice (core/cards.js)
    const dd = String(a.dueDate || '').trim(), due = dd ? +dd.slice(8, 10) : null;
    if (a.type === 'credit' && !(/^\d{4}-\d{2}-\d{2}$/.test(dd) && due >= 1 && due <= 31)) return fail(t('Choose the date the next invoice is due: without it the app cannot remind you or tell you when it is late.'), 'a-due');
    if (a.type === 'credit' && dd < S.today) return fail(t('The next invoice is due today or later. A date that has gone would be read as a late invoice.'), 'a-due');
    // a credit card's debit is its bank's account (found each time) or the one it was linked to; the form no longer asks (owner, 2026-10-09)
    const debit = a.type === 'credit' ? a.debitAccountId : undefined;
    // the card's credit, on a checking or savings account: its limit, next due date and the invoice as it stands, kept in the linked credit ledger
    const withCredit = (a.type === 'checking' || a.type === 'savings') && !!a.hasCredit, oldCr = a.creditId && acct(a.creditId);
    let cr = null;
    if (withCredit) {
      const cd = String(a.creditDue || '').trim(), cdd = cd ? +cd.slice(8, 10) : null, owed = typedAmount(String(a.creditOwedText || '').trim() || '0'), lim = String(a.creditLimitText || '').trim() ? typedAmount(String(a.creditLimitText).trim()) : 0;
      if (!(/^\d{4}-\d{2}-\d{2}$/.test(cd) && cdd >= 1 && cdd <= 31)) return fail(t('Choose the date the next invoice is due: without it the app cannot remind you or tell you when it is late.'), 'a-cdue');
      if (cd < S.today) return fail(t('The next invoice is due today or later. A date that has gone would be read as a late invoice.'), 'a-cdue');
      if (!String(a.creditOwedText || '').trim()) return fail(t('Enter the invoice as it stands today: 0 if there is nothing on it.'), 'a-cowed');
      if (owed === null) return fail(t('Enter the opening balance as a number, for example 1500,00.'), 'a-cowed');
      if (lim === null) return fail(t('Enter the opening balance as a number, for example 1500,00.'), 'a-climit');
      cr = { dueDay: cdd || (oldCr && oldCr.dueDay) || undefined, dueFrom: cdd ? ymOf(cd) : oldCr && oldCr.dueFrom, creditLimit: lim || undefined, opening: -Math.abs(owed) };
    } else if (oldCr && S.transactions.some(x => x.accountId === oldCr.id)) return fail(t('The card’s credit has transactions: delete or move them first.'));
    // a savings account whose card pays by debit: the balance it spends from, apart from what is saved (owner, 2026-10-09)
    const withSpend = a.type === 'savings' && !!a.debitCard, oldSp = a.spendId && acct(a.spendId), spendOpen = withSpend ? typedAmount(String(a.spendOpeningText || '').trim() || '0') : 0;
    if (withSpend && !String(a.spendOpeningText || '').trim()) return fail(t('Enter the money the debit card spends from today: 0 if it is empty.'), 'a-sopen');
    if (withSpend && spendOpen === null) return fail(t('Enter the opening balance as a number, for example 1500,00.'), 'a-sopen');
    if (!withSpend && oldSp && S.transactions.some(x => x.accountId === oldSp.id)) return fail(t('The card’s debit has transactions: delete or move them first.'));
    const was = S.accounts.find(x => x.id === a.id);      // switched on here, the account counts from last month, the one due now; one already on the list keeps its first month
    const next = { id: a.id || newId('a'), dueDay: a.type === 'credit' && due ? due : undefined, dueFrom: a.type === 'credit' && due ? ymOf(dd) : undefined, debitAccountId: debit, name: a.name.trim(), institution: a.institution, type: a.type, currency: a.currency, scope: a.scope, monthly: !!a.monthly, monthlySince: a.monthly ? (was && owesStatement(was) ? was.monthlySince : addMonths(ymOf(S.today), -1)) : undefined, monthlyAsked: a.monthlyAsked || !!a.monthly || undefined, purpose: (a.purpose || '').trim(), opening, creditLimit: a.type === 'credit' ? typedAmount(a.limitText || '') || 0 : undefined, debitCard: a.type === 'savings' ? !!a.debitCard : undefined };
    const prev = S.accounts.find(x => x.id === next.id);
    if (prev) Object.assign(prev, next); else S.accounts.push(next);
    const saved = prev || next; if (a.main && canBeMain(saved)) setMain(saved, true); else if (saved.main) delete saved.main;      // one main account per side
    if (cr) {      // the invoice's ledger: named after the account, at its bank, side and currency, linked to it
      const base = { name: t('{name} (credit)', { name: next.name }), institution: next.institution, type: 'credit', currency: next.currency, scope: next.scope, debitAccountId: next.id, purpose: '' };
      if (oldCr) Object.assign(oldCr, { debitAccountId: next.id }, cr); else S.accounts.push({ id: newId('a'), ...base, ...cr });      // one already there keeps its name
    } else if (oldCr) S.accounts = S.accounts.filter(k => k !== oldCr);      // credit switched off, and nothing was recorded on it
    if (withSpend) {
      const base = { institution: next.institution, type: 'checking', currency: next.currency, scope: next.scope, savingsOf: next.id, opening: spendOpen };
      if (oldSp) Object.assign(oldSp, base); else S.accounts.push({ id: newId('a'), name: t('{name} (debit)', { name: next.name }), purpose: '', ...base });
    } else if (oldSp) S.accounts = S.accounts.filter(k => k !== oldSp);      // debit switched off, and nothing was recorded on it
    if (next.scope === 'business' && S.user.company !== true) S.user.company = true;      // adding the company's account answers the dashboard's question (features/ahead)
    const back = UI.drawer.back; UI.drawer = back || null;      // opened from the goal form: back to it, with the new savings account chosen
    if (back && back.draft && next.type === 'savings') back.draft.accountId = next.id;
    toast(prev ? t('Account saved.') : t('Account added.')); render();
  },
  'acct-back'() { UI.drawer = UI.drawer.back; renderOverlay(); },
  'delete-account'() {
    const a = cardMain(acct(UI.drawer.draft.id)); if (!a || cardTxCount(a)) return;
    deleteCard(a, () => { UI.drawer = null; });      // its card's credit and debit go with it (features/accounts/wallet.js)
  },
};
