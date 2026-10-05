/* Dorax Finance — panel: add or edit an account. */
function accountDrawer(d) {
  const a = d.draft, n = d.isNew ? 0 : S.transactions.filter(x => x.accountId === a.id).length;
  return `<div class="body">${d.error ? banner('crit', esc(d.error)) : ''}<div class="form-grid">
    ${fld('a-name', t('Account name'), inp('a-name', 'name', a.name), 'full')}
    ${fld('a-scope', t('Belongs to'), `<select id="a-scope" data-c="draft" data-k="scope" data-rerender="1">${options([['personal', t('Household')], ['business', t('Company (PJ)')]], a.scope)}</select>`)}
    ${fld('a-inst', t('Institution'), `<select id="a-inst" data-c="draft" data-k="institution">${options([...new Set([...BANKS, a.institution, t('Other')])].map(b => [b, b]), a.institution)}</select>`)}
    ${fld('a-type', t('Type'), `<select id="a-type" data-c="draft" data-k="type" data-rerender="1">${options(ACCT_TYPES(), a.type)}</select>`)}
    ${fld('a-cur', t('Currency'), `<select id="a-cur" data-c="draft" data-k="currency" ${n ? 'disabled' : ''}>${options([['BRL', 'BRL'], ['USD', 'USD'], ['EUR', 'EUR']], a.currency)}</select>`)}
    ${fld('a-open', t('Opening balance'), inp('a-open', 'openingText', a.openingText, 'inputmode="decimal" class="num"'))}
    ${a.type === 'credit' ? fld('a-limit', t('Credit limit'), inp('a-limit', 'limitText', a.limitText, 'inputmode="decimal" class="num"')) + fld('a-due', t('Invoice due day'), `<input type="number" id="a-due" min="1" max="31" inputmode="numeric" placeholder="—" value="${esc(a.dueDay || '')}" data-c="draft" data-k="dueDay">`) : ''}
    ${fld('a-purpose', t('What it is for'), inp('a-purpose', 'purpose', a.purpose || ''), 'full')}</div>
    ${sw('a-monthly', !!a.monthly, 'draft', 'data-k="monthly"', t('I send this account’s statement to my accountant every month'))}
    <p class="note">${t('The account then appears on the monthly list of the statement converter, with a reminder before the day it is due.')}</p>
    <p class="note">${n ? t('Currency is fixed once an account has transactions, so amounts are never mixed.') : t('For a credit card, enter the opening balance as a negative amount owed.')}</p></div>
  <footer><button class="btn primary" data-a="save-account">${t('Save')}</button>${d.isNew ? '' : `<button class="btn ghost danger" data-a="delete-account" ${n ? `disabled data-tip="${t('Delete or move its {n} transactions first', { n })}"` : ''}>${t('Delete')}</button>`}<button class="btn ghost spacer" data-a="close">${t('Cancel')}</button></footer>`;
}
