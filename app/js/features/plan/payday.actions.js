/* Dorax Finance — clicks: the pay-day notice (features/plan/payday.js). Joined into A in app/actions.js. */
const PAYDAY_ACTIONS = {
  /** Opens a new transaction already filled in: an income, the planned amount, the payment's name and its income line, today. Nothing is saved
      until the person presses Save, so a different amount or another account is one correction away. */
  'payday-add'(ds) {
    const g = payDue(S, S.today, CUR).find(x => x.key === ds.key); if (UI.curio && UI.curio.ask === 'payday') { UI.curio = null; renderCurio(); } if (!g) return;
    UI.drawer = null;      // from the reminders panel as well as from the notice
    UI.paySkip = [...(UI.paySkip || []), g.key];      // answered for this visit, whatever happens to the panel
    A['new-tx'](); if (!UI.drawer || UI.drawer.kind !== 'tx') return;
    const x = UI.drawer.draft, inc = S.categories.find(k => k.income);
    Object.assign(x, { type: 'income', dir: 'in', amountText: plain(g.amount), merchant: g.name, description: g.name, date: S.today, catKey: inc && inc.subs.some(s => s.id === g.sub) ? catKey(inc.id, g.sub) : x.catKey });
    renderOverlay(); const el = $('d-amount') || $('d-merchant'); if (el) el.focus();
  },
  /** "I'll do it": not asked again this month. */
  'payday-skip'(ds) { S.user.payAsk = { ...(S.user.payAsk || {}), [ds.key]: ymOf(S.today) }; if (UI.curio && UI.curio.ask === 'payday') UI.curio = null; toast(t('Fine. I will not ask again this month.')); render(); },
  /** Closed without an answer: put aside for this visit. */
  'payday-close'(ds) { UI.paySkip = [...(UI.paySkip || []), ds.key]; UI.curio = null; renderCurio(); },
};
