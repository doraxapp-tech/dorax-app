/* Dorax Finance — clicks: recurring payments. Joined into A in app/actions.js. */
const RECURRING_ACTIONS = {
  // recurring
  'add-recurring'() {
    const name = $('rc-name').value.trim(), amt = typedAmount($('rc-amt').value), dayN = Math.round(+$('rc-day').value), day = dayN, [c, s] = $('rc-cat').value.split('|');
    const bad = (m, id) => { toast(m); const el = $(id); if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); } };      // what is needed is said, and the cursor goes there
    if (!name) return bad(t('Enter a name for the recurring payment.'), 'rc-name');
    if (!amt || amt <= 0) return bad(t('Enter an amount greater than zero.'), 'rc-amt');
    if (!$('rc-day').value.trim() || !(dayN >= 1 && dayN <= 31)) return bad(t('The day of the month must be between 1 and 31.'), 'rc-day');
    if (!$('rc-acct').value) return needAccount();
    S.recurringManual.push({ id: newId('m'), merchant: name, amount: amt, day, accountId: $('rc-acct').value, categoryId: c, subcategoryId: s || null }); toast(t('Recurring payment added.')); render();
  },
  'remove-recurring'(ds) {
    const r = S.recurringManual.find(k => k.id === ds.id); if (!r) return;
    confirmBox({ title: t('Delete this recurring payment?'), text: t('{name}, {amount}, day {d} of each month.', { name: r.merchant, amount: fmt.money(r.amount, acct(r.accountId).currency), d: r.day }), label: t('Delete recurring payment'),
      run() { S.recurringManual = S.recurringManual.filter(k => k !== r); render(); } });
  },
  'dismiss-recurring'(ds) { S.recurringDismissed.push(ds.id); toast(t('Marked as not recurring.')); render(); },
};
