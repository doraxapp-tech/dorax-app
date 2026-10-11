/* Dorax Finance — the accounts as bank cards, and the wallet on the dashboard (a beta until the owner approved it, 2026-10-08).
   2026-10-08 (owner: "on the phone, this change is beta, I'm testing it, don't delete the current design: swap Transactions for Accounts in the menu;
   update Accounts, change the current cards for a realistic debit/credit card design (on the computer too); on the phone's dashboard put them stacked
   one on another like a wallet; when the user taps them they open, and sideways the user can see each one's information").
   The earlier design stays in the code and comes back with one switch in Settings ("Accounts as cards"): walletOn().
   A card shows what is true and nothing else: the bank's colour and mark, the account's name, what is in it (or what is owed on a card), the
   holder's name and the kind of account. No card number, no network logo and no expiry date are drawn: the app does not know them. */

/** On unless the person switched it off. Tests pin it with window.DORAX_BETA (tests/pw.js). */
const walletOn = () => typeof window !== 'undefined' && window.DORAX_BETA !== undefined ? !!window.DORAX_BETA : !(typeof S !== 'undefined' && S.settings && S.settings.wallet === false);
const CARD_KIND = a => ({ credit: t('Credit'), checking: t('Debit'), savings: t('Savings'), cash: t('Cash') })[a.type] || '';
/** The chip as on a real card: gold, its eight contact pads cut by fine lines, the middle one rounded, and a
    bevel of light along its top (owner, 2026-10-08: "I want them super realistic"). */
const CC_CHIP = '<svg class="cc-chip" viewBox="0 0 42 32" aria-hidden="true" focusable="false"><defs><linearGradient id="ccg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F7E8B6"/><stop offset=".38" stop-color="#D8B45A"/><stop offset=".62" stop-color="#B58C2E"/><stop offset="1" stop-color="#ECD48E"/></linearGradient><linearGradient id="ccl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".5"/><stop offset=".45" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity=".2"/></linearGradient></defs><rect class="cc-chip-b" x=".5" y=".5" width="41" height="31" rx="5.5" fill="url(#ccg)" stroke="rgba(0,0,0,.4)"/><g class="cc-chip-l" fill="none" stroke="rgba(60,40,0,.5)" stroke-width="1"><path d="M14 .5V9.5M14 22.5V31.5M28 .5V9.5M28 22.5V31.5M.5 11H11M.5 21H11M31 11h10.5M31 21h10.5"/><rect x="11" y="9.5" width="20" height="13" rx="4"/></g><rect x=".5" y=".5" width="41" height="31" rx="5.5" fill="url(#ccl)"/></svg>';
const CC_NFC = '<svg class="cc-nfc" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7 9.5a4 4 0 0 1 0 5"/><path d="M10.5 7a8 8 0 0 1 0 10"/><path d="M14 4.5a12 12 0 0 1 0 15"/></svg>';
// ---------- one card, two functions (owner, 2026-10-09: "why do two cards come out when I register a credit card? … it should be one card with two
// functions, as in the real world") ----------
// What is had and what is owed stay two ledgers (an account, and a credit account linked to it, core/cards.js), but a person has one card: the account
// with its credit. Wherever cards are shown, a credit account whose debit account is there too is not drawn on its own; it is inside that account's card.
/** The credit side of an account's card, if it has one. */
const cardCredit = a => a && a.type !== 'credit' ? S.accounts.find(k => k.type === 'credit' && cardDebitAcct(k) === a) || null : null;
/** A savings account's balance to spend by debit, kept apart from what is saved in it (owner, 2026-10-09: "a savings account can have the debit
    function; the logical thing is an input below for the opening balance" — two balances, one card): a checking ledger linked to it (savingsOf). */
const cardSpend = a => a && a.type === 'savings' && a.debitCard ? S.accounts.find(k => k.savingsOf === a.id) || null : null;
/** Where a debit on a card's account lands: its balance to spend, when it is a savings account that keeps one; else the account itself. */
const debitTarget = a => cardSpend(a) || a;
/** The account a card is shown as: an account; a credit account's own debit account; a savings account's balance to spend, its savings account; a
    credit card with none, itself. */
const cardMain = a => { if (!a) return a; if (a.type === 'credit') a = cardDebitAcct(a) || a; return a.savingsOf && acct(a.savingsOf) ? acct(a.savingsOf) : a; };
/** Whether an account's card pays by debit: a checking account's always does; a savings account's when the person said so (owner, 2026-10-09: "if
    the user picks savings, add 'its card has debit' beside 'its card has credit'"); cash has no card. */
/** Everything an account's card is made of (owner, 2026-10-09: "deleting an account with debit and credit moves it to another list and does not
    delete it"): the account, its card's credit ledger and the debit balance of a savings account's card. Deleting the account deletes all of it. */
const cardParts = a => a ? [a, cardCredit(a), S.accounts.find(k => k.savingsOf === a.id)].filter(Boolean) : [];
const cardTxCount = a => { const ids = cardParts(a).map(k => k.id); return S.transactions.filter(x => ids.includes(x.accountId)).length; };
/** What deleting an account left behind before deleting took its whole card (2026-10-09: "accounts I already deleted still show in the lists"): a card's
    credit ledger, named by the app after its account, whose account is gone, and a savings card's debit balance whose savings account is gone; only
    when nothing was recorded on them. A credit card the person named and kept stays, whatever it was linked to. */
function dropLeftLedgers(st) {
  const has = id => st.accounts.some(a => a.id === id), used = id => st.transactions.some(x => x.accountId === id);
  const left = a => !used(a.id) && ((a.type === 'credit' && a.debitAccountId && a.debitAccountId !== 'none' && !has(a.debitAccountId) && /\((cr[eé]dito|credit)\)\s*$/i.test(a.name || '')) || (a.savingsOf && !has(a.savingsOf)));
  const n = st.accounts.length; st.accounts = st.accounts.filter(a => !left(a)); return n - st.accounts.length;
}
/** Deletes an account with its whole card, once nothing was recorded on any part of it. */
function deleteCard(a, done) {
  const parts = cardParts(a);
  confirmBox({ title: t('Delete {name}?', { name: a.name }), text: parts.length > 1 ? t('The account and its card, with its credit and its debit, are removed from the app. None of them has transactions. This can’t be undone.') : t('The account is removed from the app. It has no transactions. This can’t be undone.'), label: t('Delete account'),
    run() { S.accounts = S.accounts.filter(k => !parts.includes(k)); if (done) done(); toast(t('Account deleted.')); render(); } });
}
const cardHasDebit = a => !!a && (a.type === 'checking' || (a.type === 'savings' && !!a.debitCard));
/** Where an expense recorded on an account goes: a savings account whose card has credit and no debit puts it on its invoice. */
// and one whose card pays by debit takes it out of its balance to spend, never out of what is saved
const cardRoute = id => { const a = acct(id), sp = cardSpend(a), cr = a && a.type === 'savings' && !a.debitCard && cardCredit(a); return sp ? sp.id : cr ? cr.id : id; };
/** A list of accounts as the cards a person has: each credit account that belongs to an account in the list goes inside that account's card. */
const cardsOf = list => list.filter(a => (a.type !== 'credit' || !list.includes(cardDebitAcct(a))) && !(a.savingsOf && list.includes(acct(a.savingsOf))));
/** What a card is said as: its name and its balance, and what is owed on its credit. */
function cardSay(a) {
  const cr = cardCredit(a), sp = cardSpend(a), bal = accountBalance(S, (sp || a).id, S.today), credit = a.type === 'credit';
  return `${a.name}: ${credit ? t('Owed') : t('Balance')} ${fmt.money(credit ? -bal : bal, a.currency)}${sp ? ` · ${t('Saved@card')} ${fmt.money(accountBalance(S, a.id, S.today), a.currency)}` : ''}${cr ? ` · ${t('Invoice@card')} ${fmt.money(-accountBalance(S, cr.id, S.today), cr.currency)}` : ''}`;
}
/** The account as a bank card: the bank's colour (its own ink on it), its mark and the rest of its name, the balance (or what is owed), the chip,
    the holder's name and the kind of account. The colour of a bank the app does not know is graphite. An account whose card has credit shows its
    balance large and the invoice under it, and says both functions (owner, 2026-10-09: "balance large, invoice under it"). */
function cardFace(a) {
  // a savings account with its balance to spend: that balance large, what is saved under it (owner, 2026-10-09)
  const sp = cardSpend(a), b = BANK_MARKS[a.institution], c = b ? b.bg : '#2B2B2E', ink = b ? b.ink : '#FFFFFF', bal = accountBalance(S, (sp || a).id, S.today), credit = a.type === 'credit', cr = cardCredit(a);
  const holder = ((a.scope === 'business' ? (S.company || {}).name : '') || S.user.name || '').trim(), name = b ? (acctRest(a.name, a.institution) || a.name) : a.name;
  const mark = a.institution && b ? bankMark(a.institution) : `<span class="inst">${icon('wallet')}</span>`;
  return `<span class="ccard${credit ? ' credit' : ''}${cr || sp ? ' duo' : ''}" style="--cc:${c};--cc-ink:${ink}"><span class="cc-top"><span class="cc-logo">${mark}</span><span class="cc-name">${esc(name)}</span>
      <span class="cc-amt"><small>${credit ? t('Owed') : t('Balance')}</small><b class="num">${fmt.money(credit ? -bal : bal, a.currency)}</b>${sp ? `<span class="cc-inv">${t('Saved@card')} <span class="num">${fmt.money(accountBalance(S, a.id, S.today), a.currency)}</span></span>` : ''}${cr ? `<span class="cc-inv">${t('Invoice@card')} <span class="num">${fmt.money(-accountBalance(S, cr.id, S.today), cr.currency)}</span></span>` : ''}</span></span>
    <span class="cc-mid">${CC_CHIP}${CC_NFC}</span>
    <span class="cc-bot"><span class="cc-holder">${esc(holder.toLocaleUpperCase())}</span><span class="cc-kind">${cr ? (cardHasDebit(a) ? `${t('Debit')} · ${t('Credit')}` : `${CARD_KIND(a)} · ${t('Credit')}`) : a.type === 'savings' && a.debitCard ? `${CARD_KIND(a)} · ${t('Debit')}` : CARD_KIND(a)}${a.currency !== CUR ? ' · ' + a.currency : ''}</span></span></span>`;
}
/** Under a card: what it is for, how much of a card's limit is used, its transactions, and what can be done with it. */
function cardMeta(a, bare, slim) {
  const cr = cardCredit(a), sp = cardSpend(a), lim = cr || a, ids = [a.id, cr && cr.id, sp && sp.id].filter(Boolean), n = S.transactions.filter(x => ids.includes(x.accountId)).length, last = S.imports.find(i => ids.includes(i.accountId) && i.status !== 'Undone');
  const used = lim.type === 'credit' && lim.creditLimit ? Math.round((-accountBalance(S, lim.id, S.today) + instAhead(S, lim.id, S.today).total) * 100 / lim.creditLimit) : null;      // installments still to come hold the limit too, as at the bank
  // the side's main account says so under its card; its panel has the switch that makes an account the main one (owner, 2026-10-09). The limit used is
  // in the panel only ("remove the limit bar under the cards: that is seen on clicking or tapping them")
  const can = canBeMain(a), main = can && mainOf(a.scope) === a;
  return `${main && !bare ? `<span class="chip good cc-mainchip"><i></i>${t('Main account')}</span>` : ''}${a.purpose ? `<p class="note">${esc(a.purpose)}</p>` : ''}
    ${bare && can ? `<div class="cv-main">${sw('cv-main-' + a.id, main, 'acct-main', `data-id="${a.id}"${main ? ' disabled' : ''}`, t('Main account'))}<p class="note">${main ? (a.scope === 'business' ? t('The company’s costs are charged here unless you choose another account.') : t('The household’s expenses are charged here unless you choose another account.')) : t('Turn it on to charge the expenses here. Only one account is the main one.')}</p></div>` : ''}
    ${used !== null && bare ? `<div>${meter(used, used > 80 ? 'warn' : 'go')}<p class="note" style="margin-top:4px">${t('{pct} of {limit} limit used', { pct: fmt.pct(used), limit: fmt.money(lim.creditLimit, lim.currency, { round: true }) })}</p></div>` : ''}
    ${slim ? '' : `<p class="note">${tn(n, '{n} transaction', '{n} transactions')}${last ? ' · ' + t('last import {date}', { date: fmt.date(last.date, true) }) : ''}</p>`}
    ${bare || slim ? '' : `<div class="row"><button class="btn sm" data-a="card-tx" data-id="${a.id}" aria-haspopup="dialog">${t('View transactions')}</button><button class="btn sm ghost" data-a="edit-account" data-id="${a.id}">${t('Edit')}</button></div>`}`;
}
/** Accounts: each account a card with its details under it. A tap on the card opens its transactions (owner, 2026-10-08: "on the phone, in
    Accounts, if the user taps the card it opens transactions"); the notice that the design was being tried is gone ("it is approved"). */
// 2026-10-08 (owner: "on the computer, order the cards by type, each group on its own, separated by a divider line, imperceptible but visible, with
// faded ends"): checking, then savings, cash, and the credit cards last (money kept first, what is owed after, as in the wallet); each kind a group
// with its name for screen readers (the kind is printed on every card), a faint line with faded ends between them. A phone keeps one list.
const CC_ORDER = ['checking', 'savings', 'cash', 'credit'];
function walletAccounts(list) {
  list = cardsOf(list);      // one card per account, its credit inside it
  const say = a => `${cardSay(a)}. ${t('View transactions')}`;
  // a phone: a tap opens the card's panel, its details and what can be done with it, as on the summary (owner, 2026-10-09: "in Accounts, when I tap a
  // card it takes me to transactions; I want it to open the menu as in the summary tab"). A computer's click still opens its transactions.
  const phone = isPhone(), sayPh = cardSay;
  // 2026-10-09 (owner: "on the computer, in Accounts, when I click a card it takes me straight to transactions instead of opening the side panel"): its
  // panel on a computer too
  // 2026-10-09 (owner: "on the computer, in Accounts, remove the buttons under the card and the number of transactions: all that is seen on clicking the
  // card"): under a card on a computer, only what it is for and how much of its limit is used
  const item = a => `<div class="cc-item" data-id="${a.id}"><button class="cc-tap" data-a="card-view" data-id="${a.id}" aria-haspopup="dialog" aria-label="${esc(sayPh(a))}">${cardFace(a)}</button><div class="cc-meta">${cardMeta(a, false, !phone)}</div></div>`;
  // a phone: the accounts, then the savings under their own heading (owner, 2026-10-09: "group accounts and savings"); every card, or each part stacked
  if (isPhone()) {
    const kept = list.filter(a => a.type !== 'savings'), sv = list.filter(a => a.type === 'savings'), stack = !!S.user.acctStack;
    return `${kept.length ? (stack ? acctStack(kept) : `<div class="cc-grid">${kept.map(item).join('')}</div>`) + '<hr class="cc-div">' : ''}
      <section class="cc-group sv-group" aria-labelledby="cc-h-savings">${savingsHead(sv)}${sv.length ? (stack ? acctStack(sv) + `<div class="sv-rows">${sv.map(savingsRow).join('')}</div>` : `<div class="cc-grid" data-kind="savings">${sv.map(item).join('')}</div>`) : savingsNone()}</section>`;
  }
  const rank = a => { const i = CC_ORDER.indexOf(a.type); return i < 0 ? CC_ORDER.length - 1 : i; }, kinds = [...new Set([...list, { type: 'savings' }].sort((a, b) => rank(a) - rank(b)).map(a => a.type))];      // the savings always have their place
  // each group under its own name, where "Household" used to head the page ("use that space for the card's group, and the same in the sections below")
  const name = k => ({ checking: t('Checking accounts'), savings: t('Savings accounts'), cash: t('Cash'), credit: t('Credit cards') })[k] || (ACCT_TYPES().find(x => x[0] === k) || [0, k])[1];
  return kinds.map(k => { const xs = list.filter(a => a.type === k);
    return k === 'savings' ? `<section class="cc-group sv-group" aria-labelledby="cc-h-savings">${savingsHead(xs, true)}${xs.length ? `<div class="cc-grid" data-kind="savings">${xs.map(item).join('')}</div>` : savingsNone()}</section>`
      : `<section class="cc-group" aria-labelledby="cc-h-${k}"><h2 class="sec" id="cc-h-${k}">${esc(name(k))}</h2><div class="cc-grid" data-kind="${k}">${xs.map(item).join('')}</div></section>`; }).join('<hr class="cc-div">');
}

// ---------- the savings: what is really had (owner, 2026-10-09: "goals and savings should be separate tabs: the savings are real, the goals are not, a
// goal's numbers are fictitious. Group accounts and savings; it makes more sense to see the savings in Accounts. So Goals stays as what the person wants
// to achieve, and Accounts & savings as what they really have") ----------
// 2026-10-10 (owner: "that 'in goals 0, free 10,000' you put is very confusing, I did not ask for it: remove it, it only confuses"): a savings account
// shows its money, and the right-hand column of a computer adds them up (accountsAside, below). The goals keep their own page.
/** The savings' heading: its name, what the savings accounts hold today (each currency apart), and what that is. On a computer the total is in the
    column on the right (bare). */
function savingsHead(list, bare) {
  const curs = [...new Set(list.map(a => a.currency))], total = curs.map(c => fmt.money(sum(list.filter(a => a.currency === c).map(a => accountBalance(S, a.id, S.today))), c)).join(' · ');
  return `<div class="sv-head"><h2 class="sec" id="cc-h-savings">${t('Your savings')} ${hint('accSavings')}</h2>${list.length && !bare ? `<b class="num sv-total">${total}</b>` : ''}</div>`;
}
/** A savings account as a row, under the stacked cards of a phone (the stack shows no details): its mark, its name and what it holds. */
function savingsRow(a) {
  const mark = a.institution && BANK_MARKS[a.institution] ? bankMark(a.institution) : `<span class="inst">${icon('wallet')}</span>`;
  return `<div class="sv-row"><div class="sv-row-h">${mark}<b class="grow">${esc(a.name)}</b><b class="num">${fmt.money(accountBalance(S, a.id, S.today), a.currency)}</b></div></div>`;
}
/** No savings account yet: where the goals would be kept, and the way to add one. */
const savingsNone = () => `<div class="sv-none"><p class="note">${t('No savings account yet. It is where your goals are kept.')}</p><button class="btn sm" data-a="acct-add-savings">${icon('plus')}${t('Add a savings account')}</button></div>`;

// ---------- a phone's Accounts: every card, or stacked (owner, 2026-10-08: "on the phone, in Accounts, make a button to change the cards' view from
// all of them to grouped one on top of another, as we had in the summary tab; the user chooses") ----------
/** The two views, as two icons beside the side's name. The choice is the person's, kept with their settings (S.user.acctStack). */
function acctViewSwitch() {
  const stack = !!S.user.acctStack, b = (v, on, ic, label) => `<button data-a="acct-view" data-v="${v}" aria-pressed="${on}" aria-label="${label}">${icon(ic)}</button>`;
  return `<span class="acc-view" role="group" aria-label="${t('Cards view')}">${b('all', !stack, 'list', t('All the cards'))}${b('stack', stack, 'wallet', t('Stacked'))}</span>`;
}
/** Add and delete, at the top of a phone's Accounts (owner, 2026-10-08: "add on the phone in Accounts two buttons, 'add account' and 'delete
    account'"). Delete asks which account, from a list; one that still has transactions is shown but cannot be chosen, as on its form: they are
    moved or deleted first, so no movement is ever lost with its account. */
function acctPhoneActs() {
  return `<div class="g-acts two acc-acts" role="group" aria-label="${t('Accounts')}"><button class="btn primary" data-a="account-add">${icon('plus')}${t('Add account')}</button><button class="btn" data-a="acct-del-pick" aria-haspopup="dialog">${t('Delete account')}</button></div>`;
}
function acctDelSheet() {
  const list = cardsOf(UI.space === 'business' ? business() : personal()), title = t('Which account do you want to delete?'), n = cardTxCount;      // one row per card, its credit and debit inside it
  return `<div class="scrim" data-a="close"></div><div class="sheet g-pick s-list" role="dialog" aria-label="${esc(title)}"><div class="grab" aria-hidden="true"></div><h2>${esc(title)}</h2>
    <div class="g-pick-list acc-del">${list.map(a => { const k = n(a); return `<button data-a="acct-del-go" data-id="${a.id}" ${k ? 'aria-disabled="true"' : ''}>${bankMark(a.institution)}<span class="grow"><b>${esc(a.name)}</b><small>${esc(k ? t('Delete or move its {n} transactions first', { n: k }) : (ACCT_TYPES().find(x => x[0] === a.type) || [0, a.type])[1] + ' · ' + t('No transactions'))}</small></span></button>`; }).join('')}</div></div>`;
}
/** Stacked as the summary had them: each card shows its top strip above the next, the last one whole. A tap opens that card, large, with its
    details and what can be done with it (the computer's card-view panel). */
function acctStack(list) {
  list = cardsOf(list);
  return `<div class="wallet acc-stack" style="--n:${list.length}">${list.map((a, i) => `<button class="w-card" data-a="card-view" data-id="${a.id}" style="--i:${i}" aria-haspopup="dialog" aria-label="${esc(cardSay(a))}">${cardFace(a)}</button>`).join('')}<span class="w-space" aria-hidden="true"></span></div>`;
}

// ---------- the wallet, on the dashboard (the phone's, and since 2026-10-08 the computer's: "the design is approved, use it on the web's dashboard") ----------
const W_STRIP = 40;      // px of each card that shows above the next one in the stack (owner, 2026-10-08: "top: calc(var(--i) * 40px)")
const W_MAX = 5;         // cards on the dashboard at most; the person chooses which and in what order (S.user.walletPick, by side)
const walletList = () => { const list = cardsOf(inCompany() ? business() : personal()); return [...list.filter(a => a.type !== 'credit'), ...list.filter(a => a.type === 'credit')]; };
const walletSide = () => inCompany() ? 'co' : 'home';
/** The cards the dashboard shows, in the order chosen; until the person chooses, the first five (money kept first, cards after). */
function walletChosen() {
  const all = walletList(), saved = (S.user.walletPick || {})[walletSide()];
  const xs = saved ? [...new Set(saved.map(id => cardMain(acct(id))).filter(a => a && all.includes(a)))] : all;      // a card's credit chosen before 2026-10-09 is its account's card
  return (xs.length ? xs : all).slice(0, W_MAX);
}
/** Stacked like a wallet: each card shows its top strip, the last one whole. A tap opens them into a row to swipe, each card with its details. */
function walletStack() {
  const all = walletList(); if (!all.length) return isPhone() ? phoneAccountsList() : '';
  if (!isPhone()) return walletStrip(walletChosen());
  // 2026-10-08 (owner: "on the phone leave the summary's cards open by default, I think they look better that way, and keep 'Choose' and 'View
  // all'"): the row to swipe is what the summary shows, in the order chosen, with Choose and View all above it. The stack is kept in the code
  // (UI.walletOpen === false) but nothing leads to it any more.
  const xs = walletChosen(), open = UI.walletOpen !== false, n = xs.length, at = Math.min(UI.walletAt || 0, n - 1), money = a => fmt.money(a.type === 'credit' ? -accountBalance(S, a.id, S.today) : accountBalance(S, a.id, S.today), a.currency);
  const label = cardSay;
  const pick = `<button class="btn sm" id="wallet-pick-btn" data-a="wallet-pick" aria-haspopup="dialog">${t('Choose')}</button><a class="btn sm go" href="#accounts">${t('View all')}${icon('right')}</a>`;
  const head = `<div class="w-head"><h2 id="w-h">${t('Accounts')}</h2><span class="w-tools">${open
    ? `<span class="w-nav"><button class="iconbtn" data-a="wallet-step" data-d="-1" aria-label="${t('Previous')}" ${at === 0 ? 'disabled' : ''}>${icon('left')}</button><button class="iconbtn" data-a="wallet-step" data-d="1" aria-label="${t('Next')}" ${at === n - 1 ? 'disabled' : ''}>${icon('right')}</button></span>${pick}`
    : pick}</span></div>`;
  if (!open) return `<section class="wallet-sec" id="ac-card" aria-labelledby="w-h">${head}<div class="wallet" style="--n:${n}">${xs.map((a, i) => `<button class="w-card" data-a="wallet-open" data-i="${i}" data-id="${a.id}" style="--i:${i}" aria-label="${esc(label(a))}">${cardFace(a)}</button>`).join('')}<span class="w-space" aria-hidden="true"></span></div></section>`;
  // the row starts with the first card chosen and the next ones come in from the right, so a swipe to the left goes on (owner, 2026-10-08)
  return `<section class="wallet-sec open" id="ac-card" aria-labelledby="w-h">${head}<div class="w-row" id="wallet-row" tabindex="0" role="group" aria-roledescription="${t('carousel')}" aria-labelledby="w-h">
      ${xs.map((a, i) => `<div class="w-slide" data-id="${a.id}" role="group" aria-roledescription="${t('slide')}" aria-label="${esc(t('{a} of {b}', { a: i + 1, b: n }) + ': ' + a.name)}"><button class="w-tap" data-a="card-view" data-id="${a.id}" aria-haspopup="dialog" aria-label="${esc(label(a))}">${cardFace(a)}</button></div>`).join('')}</div>
    <div class="w-dots" aria-hidden="true">${xs.map((a, i) => `<i class="${i === at ? 'on' : ''}"></i>`).join('')}</div></section>`;
}
/** The computer's dashboard: the chosen cards side by side, small, in one row (owner, 2026-10-08: "on the PC the cards look enormous, taking the
    vertical space beside Savings & goals: find another bento format so everything looks right"). A click opens the card, large, with its details. */
function walletStrip(xs) {
  const money = a => fmt.money(a.type === 'credit' ? -accountBalance(S, a.id, S.today) : accountBalance(S, a.id, S.today), a.currency);
  return `<section class="wallet-sec strip" id="ac-card" aria-labelledby="w-h"><div class="w-head"><h2 id="w-h">${t('Accounts')}</h2><span class="w-tools"><button class="btn sm" id="wallet-pick-btn" data-a="wallet-pick" aria-haspopup="dialog">${t('Choose')}</button><a class="btn sm go" href="#accounts">${t('View all')}${icon('right')}</a></span></div>
    <div class="w-strip">${xs.map(a => `<button class="w-mini" data-a="card-view" data-id="${a.id}" aria-haspopup="dialog" aria-label="${esc(cardSay(a))}">${cardFace(a)}</button>`).join('')}</div></section>`;
}
/** A card opened from the computer's row: the card large, and its details. */
/** A card opened (owner, 2026-10-08: "when the user taps a card, a menu opens with details and actions"): the card large, its details, and what is
    done with an account as round icons with their words, like the quick things to do: an expense or an income in it (not an income on a credit
    card), its transactions, and the account itself to edit. The same on a computer. */
function cardActions(a) {
  // an account whose card has credit: an expense starts on the card's credit, with Credit | Debit under it (transaction-form.view.js: txPayWith)
  const xs = [['expense', 'wallet', a.scope === 'business' ? t('Record a cost') : t('Record an expense')], ...(a.type === 'credit' ? [] : [['income', 'coins', a.scope === 'business' ? t('Record money received') : t('Record an income')]]),
    ['edit', 'gear', t('Edit account')]];
  // a computer (owner, 2026-10-09: "there is room to put them side by side, make them smaller; they all weigh the same, I can't tell the main
  // action"): one row of buttons. Recording an expense is the main one; an income comes second; editing the account is apart, quieter, on the right
  // the panel's title already names the account, so its edit says only "Edit"; all three fit on one line in the three languages
  if (!isPhone()) return `<div class="cv-acts pc">${xs.map(([v, ic, l]) => `<button class="btn sm${v === 'expense' ? ' primary' : v === 'edit' ? ' ghost cv-edit' : ''}" data-a="card-do" data-v="${v}" data-id="${a.id}"${v === 'edit' ? ` aria-label="${esc(l)}"` : ''}>${icon(ic)}<span>${v === 'edit' ? t('Edit') : l}</span></button>`).join('')}</div>`;
  return `<div class="quick-grid cv-acts">${xs.map(([v, ic, l], i) => `<button data-a="card-do" data-v="${v}" data-id="${a.id}"${i === xs.length - 1 && xs.length % 2 ? ' class="wide"' : ''} style="--i:${i}"><span class="fl-ico">${icon(ic)}</span><span>${l}</span></button>`).join('')}</div>`;
}
function cardViewDrawer(d) {
  // 2026-10-09 (owner: "why don't I see transactions under the card on the computer? remove the transactions button and show the recent ones under the
  // card, as on the phone"): the card, its details, what can be done with it, and its latest transactions under all that, on every screen
  const a = cardMain(acct(d.id)); if (!a) return '<div class="body"></div>';
  return `<div class="body cv">${cardFace(a)}<div class="cc-meta">${cardMeta(a, true)}</div>${cardActions(a)}${instAheadCard(cardCredit(a) || a)}${cardOps(a)}</div>`;      // the installments still to come (features/installments)
}
/** A card's latest transactions, at the foot of its panel (owner, 2026-10-09: "I want it shown in this style under the card, not going to the
    Transactions tab"; then "show the recent ones under the card, without the button"). A sheet with a handle, the newest first, by day (Today,
    Yesterday, then the date): a round mark, what it was and its category, the amount on the right (money in green with +). A row opens the
    transaction; "View all" opens the Transactions screen on this account, with its filters. */
const CARD_OPS = 30;
function cardOps(a) {
  // a card with both functions lists one at a time, Debit | Credit over the list (owner, 2026-10-09); "View all" opens the one in view
  const cr = cardCredit(a), sp = cardSpend(a), d = UI.drawer || {}, tabs = [['debit', sp || a, t('Debit')], ...(cr ? [['credit', cr, t('Credit')]] : []), ...(sp ? [['saved', a, t('Savings')]] : [])];
  const [fn, on] = tabs.find(x => x[0] === d.fn) || tabs[0];
  const fns = tabs.length > 1 ? `<div class="seg op-fn" role="group" aria-label="${t('Card function')}">${tabs.map(([v, , l]) => `<button data-a="card-fn" data-v="${v}" aria-pressed="${fn === v}">${l}</button>`).join('')}</div>` : '';
  const xs = S.transactions.filter(x => x.accountId === on.id && x.date <= S.today).sort((p, q) => q.date < p.date ? -1 : q.date > p.date ? 1 : 0), shown = xs.slice(0, CARD_OPS);
  const yday = addDays(S.today, -1), day = d => { if (d === S.today) return t('Today'); if (d === yday) return t('Yesterday'); const [y, m, n] = d.split('-'); return `${+n} ${mon(+m - 1)}${y !== S.today.slice(0, 4) ? ' ' + y : ''}`; };      // "25 sep"; the year only when it is another
  const mark = x => x.type === 'transfer' ? `<span class="op-ico">${icon('swap')}</span>` : x.amount > 0 ? `<span class="op-ico in">${icon('coins')}</span>`
    : (catOf(x.categoryId) || {}).cat ? `<span class="op-ico cat" style="--c:${catColor(x.categoryId)}">${catIconSvg(catIconKey(catOf(x.categoryId).cat, (catOf(x.subcategoryId) || {}).sub))}</span>`      // the category's icon (ui/cat-icons.js, 2026-10-10)
    : `<span class="op-ico" style="--c:${catColor(x.categoryId)}">${esc((x.merchant || '?').trim().charAt(0).toLocaleUpperCase() || '?')}</span>`;
  const sub = x => [x.type === 'transfer' ? t('Transfer') : catName(x.subcategoryId || x.categoryId), x.status === 'pending' ? t('Pending') : x.status === 'ignored' ? t('Ignored') : ''].filter(Boolean).join(' · ');
  const amt = x => x.amount > 0 ? `<b class="num op-amt in">+ ${fmt.money(x.amount, x.currency)}</b>` : `<b class="num op-amt">${fmt.money(-x.amount, x.currency)}</b>`;
  const days = [...new Set(shown.map(x => x.date))];
  const list = shown.length ? days.map(d => `<h4 class="op-day">${day(d)}</h4><ul class="op-list">${shown.filter(x => x.date === d).map(x => `<li><button class="op-row${x.status === 'ignored' ? ' ignored' : ''}" data-a="open-tx" data-id="${x.id}" aria-label="${esc(`${x.merchant}, ${sub(x)}, ${x.amount > 0 ? '+ ' : ''}${fmt.money(Math.abs(x.amount), x.currency)}, ${day(d)}`)}">${mark(x)}<span class="op-t"><b>${esc(x.merchant)}${instTag(x)}</b><small>${esc(sub(x))}</small></span>${amt(x)}</button></li>`).join('')}</ul>`).join('')
    : `<div class="op-empty"><p>${fn === 'credit' ? t('Nothing on the card’s credit yet.') : t('No transactions in this account yet.')}</p>${isPhone() ? `<button class="btn sm" data-a="card-do" data-v="expense" data-id="${a.id}">${a.scope === 'business' ? t('Record a cost') : t('Record an expense')}</button>` : ''}</div>`      // a computer has the button just above;
  return `<section class="cv-ops" aria-labelledby="cv-ops-h"><span class="op-grab" aria-hidden="true"></span>
    <div class="op-head"><h3 id="cv-ops-h">${t('Transactions')}</h3>${xs.length ? `<button class="linkbtn" data-a="card-do" data-v="view" data-id="${on.id}">${xs.length > CARD_OPS ? t('View all {n}', { n: xs.length }) : t('View all')}</button>` : ''}</div>${fns}${list}</section>`;
}
/** Where each card is on the screen, by account, to move it from there to its new place (open or closed). */
function walletRects() { const m = {}; document.querySelectorAll('#ac-card [data-id] .ccard').forEach(c => { m[c.closest('[data-id]').dataset.id] = c.getBoundingClientRect(); }); return m; }
function walletPlay(before) {
  if (reducedMotion()) return;
  document.querySelectorAll('#ac-card [data-id] .ccard').forEach(c => {
    const b = before[c.closest('[data-id]').dataset.id], r = c.getBoundingClientRect(); if (!b || !r.width) return;
    c.animate([{ transform: `translate(${b.left - r.left}px, ${b.top - r.top}px) scale(${b.width / r.width})`, transformOrigin: 'top left' }, { transform: 'none', transformOrigin: 'top left' }], { duration: 440, easing: 'cubic-bezier(.32, .72, 0, 1)' });
  });
}
/** The row lines its card up on the left (owner, 2026-10-08: "the horizontal scroll toward the left"), the next one peeking in on the right. */
const walletEdge = row => row.getBoundingClientRect().left + parseFloat(getComputedStyle(row).paddingLeft || 0);
function walletGo(row, i, smooth) {
  const s = row.querySelectorAll('.w-slide')[i]; if (!s) return;
  const by = s.getBoundingClientRect().left - walletEdge(row);
  if (smooth && !reducedMotion() && row.scrollBy) row.scrollBy({ left: by, behavior: 'smooth' }); else row.scrollLeft += by;
}
/** The row keeps its card when the page is drawn again (an amount hidden, a payment recorded): called after every render (app/shell.js). */
function walletAfter() { const row = $('wallet-row'); if (row) walletGo(row, UI.walletAt || 0); }
function walletDots(row) {
  const edge = walletEdge(row), ds = [...row.querySelectorAll('.w-slide')].map(s => Math.abs(s.getBoundingClientRect().left - edge));
  const i = ds.indexOf(Math.min(...ds)); if (i < 0) return;
  UI.walletAt = i; document.querySelectorAll('#ac-card .w-dots i').forEach((d, k) => d.classList.toggle('on', k === i));
  document.querySelectorAll('#ac-card [data-a="wallet-step"]').forEach(b => { b.disabled = +b.dataset.d < 0 ? i === 0 : i === ds.length - 1; });
}
if (typeof document !== 'undefined') document.addEventListener('scroll', e => { if (e.target && e.target.id === 'wallet-row') walletDots(e.target); }, { capture: true, passive: true });

// ---------- which cards the dashboard shows, and their order ----------
/** A panel: every account of the side, the ones shown first in their order with two arrows; a switch shows or hides each, five at most, one at least. */
function walletPickDrawer() {
  const all = walletList(), chosen = walletChosen(), ids = chosen.map(a => a.id), rest = all.filter(a => !ids.includes(a.id)), full = ids.length >= W_MAX, n = ids.length;
  const kind = a => (ACCT_TYPES().find(x => x[0] === a.type) || [0, a.type])[1] + (cardCredit(a) ? ' · ' + t('Credit') : ''), mark = a => a.institution && BANK_MARKS[a.institution] ? bankMark(a.institution) : `<span class="inst">${icon('wallet')}</span>`;
  const arrow = (a, i, d) => `<button class="wp-btn" data-a="wallet-pick-move" data-id="${a.id}" data-d="${d}" aria-label="${esc(d < 0 ? t('Move {name} up', { name: a.name }) : t('Move {name} down', { name: a.name }))}" ${(d < 0 ? i === 0 : i === n - 1) ? 'disabled' : ''}>${icon(d < 0 ? 'up' : 'down')}</button>`;
  const row = (a, i) => { const on = i >= 0, off = (!on && full) || (on && n === 1);
    return `<li class="wp-row${on ? ' on' : ''}" data-id="${a.id}"><span class="wp-mark">${mark(a)}</span><span class="grow"><b>${esc(a.name)}</b><small>${esc(kind(a))}</small></span>${on ? arrow(a, i, -1) + arrow(a, i, 1) : ''}${sw('wp-' + a.id, on, 'wallet-pick-toggle', `data-id="${a.id}" aria-label="${esc(t('Show {name} on the dashboard', { name: a.name }))}"${off ? ' disabled' : ''}`)}</li>`; };
  return `<div class="body"><p class="note">${t('Up to 5 cards on the dashboard. Switch one on or off; the arrows set the order.')}</p>
    <ol class="wp-list">${chosen.map(row).join('')}${rest.map(a => row(a, -1)).join('')}</ol>${full && rest.length ? `<p class="note">${t('5 cards chosen: switch one off to show another.')}</p>` : ''}</div>
  <footer><button class="btn primary" data-a="close">${t('Done')}</button>${(S.user.walletPick || {})[walletSide()] ? `<button class="btn ghost" data-a="wallet-pick-reset">${t('Original order')}</button>` : ''}</footer>`;
}
function walletPickSave(ids) { S.user.walletPick = Object.assign({}, S.user.walletPick, { [walletSide()]: ids }); UI.walletAt = 0; save(); render(); }
const WALLET_CHANGES = {
  'wallet-pick-toggle'(el) {
    const ids = walletChosen().map(a => a.id), id = el.dataset.id;
    if (el.checked && !ids.includes(id) && ids.length < W_MAX) ids.push(id);
    else if (!el.checked && ids.length > 1) ids.splice(ids.indexOf(id), 1);
    walletPickSave(ids);
  },
};
const WALLET_ACTIONS = {
  'wallet-pick'() { UI.drawer = { kind: 'wallet-pick', title: t('Cards on the dashboard'), book: bookKey() }; renderOverlay(); const el = document.querySelector('#overlay .wp-list input'); if (el) el.focus({ preventScroll: true }); },
  'wallet-pick-move'(ds) {
    const ids = walletChosen().map(a => a.id), i = ids.indexOf(ds.id), j = i + (+ds.d); if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    flip('#overlay .wp-row[data-id], #ac-card .w-card[data-id], #ac-card .w-mini[data-id]', () => { S.user.walletPick = Object.assign({}, S.user.walletPick, { [walletSide()]: ids }); UI.walletAt = 0; save(); renderNow(); });      // the rows and the cards slide (app/motion.js)
    const q = v => document.querySelector(`#overlay [data-a="wallet-pick-move"][data-id="${ds.id}"][data-d="${v}"]`), same = q(ds.d);
    if (same && same.disabled) { const o = q(-ds.d); if (o) o.focus({ preventScroll: true }); } else if (same) same.focus({ preventScroll: true });
  },
  'wallet-pick-reset'() { const o = Object.assign({}, S.user.walletPick); delete o[walletSide()]; S.user.walletPick = o; UI.walletAt = 0; save(); render(); const el = document.querySelector('#overlay footer .btn.primary'); if (el) el.focus({ preventScroll: true }); },
  'wallet-step'(ds) { const row = $('wallet-row'); if (!row) return; const n = row.querySelectorAll('.w-slide').length, i = Math.max(0, Math.min(n - 1, (UI.walletAt || 0) + (+ds.d))); UI.walletAt = i; walletGo(row, i, true); },
  // every card, or stacked: the cards slide from where they were to their place in the other view
  'acct-view'(ds) { const stack = ds.v === 'stack'; if (!!S.user.acctStack === stack) return; flip('#view .cc-item[data-id], #view .w-card[data-id]', () => { S.user.acctStack = stack; save(); renderNow(); }); },
  // what is done from an opened card: the panel gives way to the expense or income (in that account), its transactions or its own form
  /** From the savings, when there is no savings account: the account form, set to savings. */
  'acct-add-savings'() { const co = UI.space === 'business'; A['edit-account']({ id: '', scope: co ? 'business' : 'personal', cur: co ? BCUR() : 'BRL', type: 'savings' }); const el = $('a-name'); if (el) el.focus(); },
  'acct-del-pick'() { UI.sheet = 'acct-del'; renderOverlay(); const el = document.querySelector('.sheet .acc-del button:not([aria-disabled])'); if (el) el.focus({ preventScroll: true }); },
  'acct-del-go'(ds) {
    const a = cardMain(acct(ds.id)); if (!a || cardTxCount(a)) return;      // one with transactions stays: they go first
    UI.sheet = false; renderOverlay(); deleteCard(a);
  },
  'card-do'(ds) {
    const a = acct(ds.id); if (!a) return; UI.drawer = null; UI.sheet = false;
    if (ds.v === 'edit') return A['edit-account']({ id: a.id });
    renderOverlay();
    if (ds.v === 'view') return A['view-account']({ id: acct(ds.id) ? ds.id : a.id });      // the list in view: the account, its credit or its balance to spend
    A['new-tx'](); if (!UI.drawer || UI.drawer.kind !== 'tx') return;
    const x = UI.drawer.draft, cr = cardCredit(a); x.accountId = ds.v === 'expense' && cr ? cr.id : ds.v === 'expense' ? cardRoute(a.id) : debitTarget(a).id;      // money received goes where it is spent from if (ds.v === 'income') { x.type = 'income'; x.dir = 'in'; }
    txKind(x); renderOverlay(); const el = $('d-say') || $('d-amount'); if (el) el.focus();
  },
  'card-view'(ds) { const a = cardMain(acct(ds.id)); if (!a) return; UI.drawer = { kind: 'card-view', id: a.id, title: a.name, book: bookKey() }; renderOverlay(); },
  /** Debit | Credit over a card's transactions: which of its two functions is listed. */
  'card-fn'(ds) { const d = UI.drawer; if (!d || d.kind !== 'card-view') return; d.fn = ['credit', 'saved'].includes(ds.v) ? ds.v : 'debit'; renderOverlay(); const el = document.querySelector(`#overlay .op-fn [data-v="${d.fn}"]`); if (el) el.focus({ preventScroll: true }); },
  /** "View transactions" under a card in Accounts: its panel, at its transactions. */
  'card-tx'(ds) {
    const a = cardMain(acct(ds.id)); if (!a) return;
    UI.drawer = { kind: 'card-view', id: a.id, title: a.name, book: bookKey() }; renderOverlay();
    const ops = document.querySelector('#overlay .cv-ops'); if (ops) ops.scrollIntoView({ block: 'start' }); focusOps();
  },
  'wallet-open'(ds) { const before = walletRects(); UI.walletOpen = true; UI.walletAt = Math.max(0, walletChosen().length - 1 - (+ds.i || 0)); render(); walletAfter(); walletPlay(before); const el = $('wallet-row'); if (el) el.focus({ preventScroll: true }); },
  'wallet-close'() { const before = walletRects(); UI.walletOpen = false; render(); walletPlay(before); const ws = document.querySelectorAll('#ac-card .w-card'), el = ws[ws.length - 1 - (UI.walletAt || 0)]; if (el) el.focus({ preventScroll: true }); },      // the row runs backwards
  /** The switch for the beta: off brings the previous design back everywhere (the menu, Accounts, the dashboard). */
};

/** In the transactions, the keyboard lands on their title's row: "View all", or the first transaction. */
function focusOps() { const el = document.querySelector('#overlay .cv-ops .op-head .linkbtn, #overlay .cv-ops .op-row, #overlay .cv-ops .op-empty .btn'); if (el) el.focus({ preventScroll: true }); }
