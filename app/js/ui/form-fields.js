/* Dorax Finance — shared: a labelled field for the forms in panels. */
// 2026-10-09 (owner: "a card with credit saves without its invoice's due date; that is inconceivable: across the app, the inputs the app NEEDS to work
// correctly must be filled in"): what the app cannot work without wears a red * beside its label and aria-required, and its form refuses to save
// without it, saying why and putting the cursor there (fail, app/overlay.js). These are always required; a field that is required only sometimes
// (a bill's due day) is passed the class "req" when it is.
const REQUIRED = new Set(['a-name', 'a-open', 'a-due', 'a-cdue', 'a-cowed', 'a-sopen', 'd-merchant', 'd-date', 'd-home-amt', 'l-name', 'l-amount', 'g-name', 'g-target', 'g-acct',
  'm-amount', 'm-date', 'py-amount', 'py-date', 'py-acct', 'cp-amount', 'cp-date', 'cp-from', 'fm-ticker', 'fm-qty', 'fm-price', 'fm-amount', 'fm-date', 'bk-cpf', 'bk-name', 'rc-name', 'rc-amt', 'rc-day', 'db-name', 'db-owed', 'dp-amount', 'dp-date', 'sp-target']);
const reqMark = () => `<span class="req" title="${esc(t('Required'))}" aria-hidden="true">*</span>`;
const fld = (id, label, control, cls) => {
  const req = REQUIRED.has(id) || /(^|\s)req(\s|$)/.test(cls || ''), ctl = req && !/aria-required/.test(control) ? control.replace(/^\s*<(input|select|textarea)\b/, '<$1 aria-required="true"') : control;
  return `<div class="field ${cls || ''}"><label for="${id}">${label}${req ? reqMark() : ''}</label>${ctl}</div>`;
};
const inp = (id, k, val, extra) => `<input type="text" id="${id}" value="${esc(val)}" data-c="draft" data-k="${k}" ${extra || ''}>`;

/** A form's less used fields, folded under "More options", which says what they are set to (usability QC, 2026-10-08: the account, goal and fixed
    cost forms asked for everything at once). Open while d.more is true; the action is 'form-more' (app/shell.actions.js). */
// 2026-10-09 (owner: "on the computer don't add that 'more options' toggle in new goals or edit: there is room to show everything; organise the form
// well"): a computer shows the folded fields in sight, as one more part of the form under a faint line; a phone keeps the fold.
function foldMore(d, says, inner, id) {
  if (!isPhone()) return `<div id="${id}" class="form-all">${inner}</div>`;
  const open = !!d.more;
  return `<button type="button" class="tx-more form-more" data-a="form-more" aria-expanded="${open}" aria-controls="${id}"><span>${t('More options')}</span><span class="note">${says.filter(Boolean).map(esc).join(' · ')}</span>${icon('down')}</button><div id="${id}" class="tx-more-box"${open ? '' : ' hidden'}>${inner}</div>`;
}
