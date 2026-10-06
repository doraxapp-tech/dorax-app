/* Dorax Finance — clicks: accounts. Joined into A in app/actions.js. */
const ACCOUNTS_ACTIONS = {
  // accounts
  'edit-account'(ds) {
    const a = S.accounts.find(x => x.id === ds.id);
    UI.drawer = { kind: 'account', title: a ? t('Edit account') : t('Add account'), isNew: !a, draft: a ? { ...a, monthly: owesStatement(a), openingText: centsToDecimal(a.opening), limitText: a.creditLimit ? centsToDecimal(a.creditLimit) : '' } : { id: null, name: '', institution: BANKS[0], type: 'checking', currency: ds.cur || 'BRL', scope: ds.scope === 'business' ? 'business' : 'personal', purpose: '', openingText: '0.00', limitText: '' } };      // Plan and Goals ask for a company account in their currency (companyNote)
    renderOverlay();
  },
  'save-account'() {
    const a = UI.drawer.draft, opening = typedAmount(a.openingText);
    if (!a.name.trim()) return fail(t('Enter an account name.'));
    if (opening === null) return fail(t('Enter the opening balance as a number, for example 1500,00.'));
    const due = String(a.dueDay == null ? '' : a.dueDay).trim() === '' ? null : Number(a.dueDay);
    if (a.type === 'credit' && due !== null && !(Number.isInteger(due) && due >= 1 && due <= 31)) return fail(t('The invoice due day must be between 1 and 31.'));
    const was = S.accounts.find(x => x.id === a.id);      // switched on here, the account counts from last month, the one due now; one already on the list keeps its first month
    const next = { id: a.id || newId('a'), dueDay: a.type === 'credit' && due ? due : undefined, name: a.name.trim(), institution: a.institution, type: a.type, currency: a.currency, scope: a.scope, monthly: !!a.monthly, monthlySince: a.monthly ? (was && owesStatement(was) ? was.monthlySince : addMonths(ymOf(S.today), -1)) : undefined, monthlyAsked: a.monthlyAsked || !!a.monthly || undefined, purpose: (a.purpose || '').trim(), opening, creditLimit: a.type === 'credit' ? typedAmount(a.limitText || '') || 0 : undefined };
    const prev = S.accounts.find(x => x.id === next.id);
    if (prev) Object.assign(prev, next); else S.accounts.push(next);
    UI.drawer = null; toast(prev ? t('Account saved.') : t('Account added.')); render();
  },
  'delete-account'() {
    const a = acct(UI.drawer.draft.id); if (!a) return;
    confirmBox({ title: t('Delete {name}?', { name: a.name }), text: t('The account is removed from the app. It has no transactions. This can’t be undone.'), label: t('Delete account'),
      run() { S.accounts = S.accounts.filter(k => k !== a); UI.drawer = null; toast(t('Account deleted.')); render(); } });
  },
};
