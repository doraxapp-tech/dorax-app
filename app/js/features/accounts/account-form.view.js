/* Dorax Finance — panel: add or edit an account. */
// 2026-10-08 (usability QC: eight things were asked before an account could be added): the name, the bank, the kind and the balance stay in
// sight (and a card's limit and next due date); who it belongs to, its currency, what it is for and the accountant are folded under "More options",
// which says what they are set to. The side in use already chose who it belongs to, and most accounts are in reais.
// 2026-10-09 (owner: "why do two cards come out when I register a credit card? … all accounts are debit at the end of the day; it should be one card
// with two functions, as in the real world"): an account has a card, and the card may have credit. The form asks for the account (the bank, the
// money in it) and, for a checking or savings account, "It has credit" with the limit, the next due date and the invoice as it stands. Behind the
// screen the invoice keeps its own ledger, a credit account linked to this one (debitAccountId), because what is owed and what is had are two
// different sums; on screen they are one card (features/accounts/wallet.js: cardsOf). A card with credit only (a store's card, a bank where the person
// has no account) is still added as a credit card, and never asks where its debit comes from: it comes from its bank's account, or is made when a debit
// is first recorded (transaction-form.view.js: cardDebitEnsure), and then joins the same card.
// 2026-10-09 (owner: "if the account is savings it should ask how much I have saved"; then "if I switch debit on it changes the input to opening
// balance: one thing has nothing to do with the other; the logical thing is an input below for the opening balance", and asked, "two separate
// balances"): a savings account asks how much is saved; its card paying by debit adds the opening balance it spends from, kept apart.
function accountDrawer(d) {
  const a = d.draft, n = d.isNew ? 0 : S.transactions.filter(x => x.accountId === a.id).length, nAll = d.isNew ? 0 : cardTxCount(acct(a.id)), credit = a.type === 'credit', canCredit = a.type === 'checking' || a.type === 'savings';
  const due = (id, k) => fld(id, t('Next invoice due on'), `<input type="date" id="${id}" min="${S.today}" value="${esc(a[k] || '')}" data-c="draft" data-k="${k}">`);
  // an account belongs to the side in use, new or edited (owner, 2026-10-09: "remove 'Belongs to' from edit account too: it belongs where the user is,
  // household or company"); the currency sits beside the balance ("currency should go beside the opening balance, in edit account too")
  const says = [(a.purpose || '').trim(), a.monthly ? t('To the accountant') : ''].filter(Boolean);
  return `<div class="body">${d.error ? banner('crit', esc(d.error)) : ''}<div class="form-grid">
    ${fld('a-name', t('Account name'), inp('a-name', 'name', a.name), 'full')}
    ${fld('a-inst', t('Institution'), `<select id="a-inst" data-c="draft" data-k="institution">${options(bankChoices(a.institution).map(b => [b, b]), a.institution)}</select>`)}
    ${fld('a-type', t('Type'), `<select id="a-type" data-c="draft" data-k="type" data-rerender="1">${options(ACCT_TYPES(), a.type)}</select>`)}
    ${fld('a-open', a.type === 'savings' ? t('How much have you saved?') : t('Opening balance'), inp('a-open', 'openingText', a.openingText, 'inputmode="decimal" class="num" placeholder="0,00"'))}
    ${fld('a-cur', t('Currency'), `<select id="a-cur" data-c="draft" data-k="currency" ${n ? 'disabled' : ''}>${options([['BRL', 'BRL'], ['USD', 'USD'], ['EUR', 'EUR']], a.currency)}</select>`)}
    ${n ? `<p class="note">${t('Currency is fixed once an account has transactions, so amounts are never mixed.')}</p>` : ''}
    ${credit ? fld('a-limit', t('Credit limit'), inp('a-limit', 'limitText', a.limitText, 'inputmode="decimal" class="num" placeholder="0,00"')) + due('a-due', 'dueDate') : ''}
    ${canCredit ? `${a.type === 'savings' ? `<div class="field a-debit">${sw('a-hasdebit', !!a.debitCard, 'draft', 'data-k="debitCard" data-rerender="always"', t('Its card has debit'))}</div>` : ''}<div class="field${a.type === 'savings' ? '' : ' full'} a-credit">${sw('a-hascredit', !!a.hasCredit, 'draft', 'data-k="hasCredit" data-rerender="always"', t('Its card has credit'))}</div>
      ${a.type === 'savings' && a.debitCard ? fld('a-sopen', t('Opening balance'), inp('a-sopen', 'spendOpeningText', a.spendOpeningText, 'inputmode="decimal" class="num" placeholder="0,00"'), 'full') + `<p class="note">${t('What the debit card spends from. What is saved stays apart.')}</p>` : ''}
      ${a.hasCredit ? fld('a-climit', t('Credit limit'), inp('a-climit', 'creditLimitText', a.creditLimitText, 'inputmode="decimal" class="num" placeholder="0,00"')) + due('a-cdue', 'creditDue')
        + fld('a-cowed', t('Invoice at the start'), inp('a-cowed', 'creditOwedText', a.creditOwedText, 'inputmode="decimal" class="num" placeholder="0,00"'), 'full') + `<p class="note">${a.type === 'savings' && !a.debitCard ? t('Its card has credit only: an expense recorded in this account goes on the invoice.') : t('One card with its two functions: debit comes out of this account, credit goes on the invoice.')}</p>` : ''}` : ''}
    ${credit ? `<p class="note">${t('For a credit card, enter the opening balance as a negative amount owed.')}</p>` : ''}
    ${canBeMain({ type: a.type, debitCard: a.debitCard }) ? `<div class="field full a-main">${sw('a-main', !!a.main, 'draft', `data-k="main"${d.mainNow ? ' disabled' : ''}`, t('Main account'))}<p class="note">${a.scope === 'business' ? t('The company’s costs are charged here unless you choose another account. Only one account is the main one.') : t('The household’s expenses are charged here unless you choose another account. Only one account is the main one.')}</p></div>` : ''}
    ${foldMore(d, says, `<div class="form-grid">${fld('a-purpose', t('What it is for'), inp('a-purpose', 'purpose', a.purpose || ''), 'full')}</div>
      ${a.scope === 'business' || a.monthly ? `${sw('a-monthly', !!a.monthly, 'draft', 'data-k="monthly"', t('I send this account’s statement to my accountant every month'))}
      <p class="note">${t('The account then appears on the monthly list of the statement converter, with a reminder before the day it is due.')}</p>` : ''}`, 'acct-more-box')}</div>
  <footer><button class="btn primary" data-a="save-account">${t('Save')}</button>${d.isNew ? '' : `<button class="btn ghost danger" data-a="delete-account" ${nAll ? `disabled data-tip="${t('Delete or move its {n} transactions first', { n: nAll })}"` : ''}>${t('Delete')}</button>`}<button class="btn ghost spacer" data-a="${d.back ? 'acct-back' : 'close'}">${t('Cancel')}</button></footer>`;
}
