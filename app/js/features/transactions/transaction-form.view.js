/* Dorax Finance — panel: add or edit a transaction.
   Built for a thumb (design critique, 2026-10-07: "the most frequent action and the slowest one"): the amount first and large, the kind as three
   buttons, the groups used most at a touch, and what is needed once in a while (status, split, recurring, notes) folded under "More options".
   A new transaction can also be written as one sentence, "taxi 15 ayer" (core/say.js): the sentence fills these same fields while it is typed,
   and nothing is saved until the person presses Save. */
const TX_SYM = c => c === 'BRL' ? 'R$' : c === 'USD' ? 'US$' : c;
/** The groups offered at a touch: the one chosen, then the ones this person uses most for this kind of movement, then the first of their list. */
function txQuickCats(x, biz) {
  const income = x.type === 'income', tree = (biz ? companyCats() : S.categories).filter(c => !!c.income === income), count = {}, keys = [];
  const all = tree.flatMap(c => [catKey(c.id), ...c.subs.map(s => catKey(c.id, s.id))]);
  for (const k of S.transactions) { if (k.type !== x.type || !k.categoryId || k.splits || isBiz(k.accountId) !== biz) continue; const key = catKey(k.categoryId, k.subcategoryId); if (all.includes(key)) count[key] = (count[key] || 0) + 1; }
  const used = Object.keys(count).sort((a, b) => count[b] - count[a] || all.indexOf(a) - all.indexOf(b));
  // with nothing recorded yet: the narrowest names first (a group's own parts), then the groups
  const first = [...tree.flatMap(c => c.subs.map(s => catKey(c.id, s.id))), ...tree.filter(c => !c.subs.length).map(c => catKey(c.id))];
  for (const k of [x.catKey, ...used, ...first]) if (k && k !== '|' && k !== 'other|' && all.includes(k) && !keys.includes(k) && keys.length < 6) keys.push(k);
  return keys.map(k => { const [c, s] = k.split('|'), cat = tree.find(y => y.id === c), sub = cat.subs.find(y => y.id === s); return { k, name: (sub || cat).name, color: catColor(c) }; });
}
/** What "More options" holds that is not at its plain value: said on the button, so nothing is hidden blind. */
function txMoreSays(x, biz) {
  const says = [];
  if (x.type === 'adjustment') says.push(t('Adjustment'));
  if (x.status && x.status !== 'confirmed' && x.type !== 'transfer' && x.type !== 'adjustment') says.push((STATUSES().find(s => s[0] === x.status) || [])[1]);
  if (x.splits) says.push(t('Split'));
  if (x.recurring && !biz) says.push(t('Recurring'));
  if (x.refund && x.type === 'expense' && !biz) says.push(t('Refund'));
  if ((x.notes || '').trim()) says.push(t('Notes'));
  return says.filter(Boolean);
}
// ---------- a card's debit (owner, 2026-10-08: "credit cards all have the debit function by default; now any expense on a credit card is taken as
// credit, but sometimes it is debit") ----------
// An expense on a card says how it was paid: Credit, on the card's invoice, or Debit, out of the account behind the card. Debit records the expense
// in that account (x.viaCard keeps which card it was, so the choice can be turned back). "débito" in the sentence chooses it too.
/** The account a card's debit purchases come out of: the one chosen on the card, else a checking account at the same bank, side and currency. */
function cardDebitAcct(card) {
  if (!card || card.type !== 'credit') return null;
  const fits = a => !!a && a.type !== 'credit' && a.scope === card.scope && a.currency === card.currency, set = card.debitAccountId && acct(card.debitAccountId);
  if (card.debitAccountId === 'none') return null;
  return fits(set) ? set : S.accounts.find(a => fits(a) && a.type === 'checking' && !!a.institution && a.institution === card.institution) || null;
}
/** A card's debit account, made when there is none yet (owner, 2026-10-08: "when recording a payment there must be an option to choose which function
    I paid with, credit or debit"): a checking account at the card's bank, linked to the card, starting at zero for the person to give its balance. */
function cardDebitEnsure(card) {
  const have = cardDebitAcct(card); if (have || !card || card.debitAccountId === 'none') return have;
  const made = { id: newId('a'), name: t('{name} (debit)', { name: card.institution && card.institution !== t('Other') ? card.institution : card.name }), institution: card.institution, type: 'checking', currency: card.currency, scope: card.scope, purpose: '', opening: 0 };
  S.accounts.push(made); card.debitAccountId = made.id; save(); return made;
}
/** Credit or debit, under the account, whenever an expense or a payment is on a card (unless the card was set to have no debit). */
// 2026-10-09 (owner: "if I have a savings account and record an expense, the system takes the money out of my savings: how does it know it was not
// debit or credit?"): an expense on an account whose card has credit asks too, not only one on the credit itself; Débito is pressed when the account
// itself was chosen. A savings account whose card has credit and no debit says the expense goes on the invoice, and it does (wallet.js: cardRoute).
function txPayWith(x, always) {
  if (!always && (x.type !== 'expense' || x.splits)) return '';      // always: a payment of the plan, which is an expense by nature
  const acc0 = acct(x.accountId); if (!acc0) return '';
  const acc = cardMain(acc0) === acc0 || acc0.type === 'credit' ? acc0 : cardMain(acc0);      // a savings account's balance to spend stands for its card
  const card = acct(x.viaCard) || (acc.type === 'credit' ? acc : cardCredit(acc)); if (!card || card.debitAccountId === 'none') return '';
  const deb = cardDebitAcct(card), tgt = deb && debitTarget(deb), debit = !!deb && (x.accountId === deb.id || x.accountId === tgt.id);
  if (deb && !cardHasDebit(deb) && deb.type === 'savings') return `<div class="field full tx-pay"><p class="note">${t('Goes on the {name} invoice.', { name: esc(card.name) })} ${t('Its card has no debit.')}</p></div>`;
  return `<div class="field full tx-pay"><span id="tx-pay-l">${t('Paid with {name}', { name: esc(card.name) })}</span><div class="seg tx-paywith" role="group" aria-labelledby="tx-pay-l">
    <button type="button" data-a="tx-pay" data-v="credit" aria-pressed="${!debit}">${t('Credit')}</button><button type="button" data-a="tx-pay" data-v="debit" aria-pressed="${debit}">${t('Debit')}</button></div>
    <p class="note">${debit ? t('Comes out of {name}.', { name: esc(tgt.name) }) + (tgt.opening === 0 && !S.transactions.some(k => k.accountId === tgt.id) ? ' ' + t('Give it its balance in Accounts.') : '') : t('Goes on the {name} invoice.', { name: esc(card.name) })}</p></div>`;
}
/** The three kinds a transaction is recorded as, each said as one: "Gasto | Ingreso | Transferencia" (usability QC, 2026-10-08: it said "Ingresos"). */
const TX_KINDS = () => [['expense', t('Expense')], ['income', t('Income@kind')], ['transfer', t('Transfer')]];
/** What the sentence was read as, in one line under it: the kind, the amount, the name, the group, the day and the account it named. */
function txSayRead(d) {
  const x = d.draft, r = d.said;
  if (!(d.say || '').trim() || !r) return '';      // the help is behind the (i) beside its label: nothing is said until something is typed
  const a = acct(x.accountId), bits = [(TX_KINDS().find(k => k[0] === x.type) || TYPES().find(k => k[0] === x.type) || [])[1]];
  if (r.amount != null) bits.push(`<b class="num">${fmt.money(r.amount, a.currency)}</b>`);
  if (x.merchant.trim()) bits.push(esc(x.merchant.trim()));
  if (r.categoryId && x.catKey !== '|') { const [c, s] = x.catKey.split('|'), cat = (isBiz(x.accountId) ? companyCats() : S.categories).find(k => k.id === c), sub = cat && cat.subs.find(k => k.id === s); if (cat && (sub || cat).name !== x.merchant.trim()) bits.push(esc((sub || cat).name)); }
  if (r.date) bits.push(r.date === S.today ? t('today') : r.date === addDays(S.today, -1) ? t('yesterday') : fmt.date(r.date, true));
  if (r.accountId) bits.push(acctTag(a));
  if (r.toAccountId && x.transferAccountId) bits.push('→ ' + acctTag(x.transferAccountId));
  return `${r.amount == null ? `<span class="tx-miss">${t('The amount is missing.')}</span> ` : ''}${bits.filter(Boolean).join(' · ')}`;
}
// ---------- the month's limit for an expense's group (owner, 2026-10-08: "is there an input when recording expenses where the user can add a spending
// limit?", then "yes" to: show what is left when the group has one, and offer to set one when it has none) ----------
// A limit is a line of the plan spent in several purchases in the month (pay: 'budget'), so it is set in one place and Plan shows it too. A group
// with a fixed bill already has its plan; nothing is offered there. Not for an account in another currency than its plan's.
/** Where the expense's limit lives: its book, currency, group and line (the line is null when the group has no plan yet). */
function txLimitAt(x) {
  const a = acct(x.accountId); if (!a || x.type !== 'expense' || x.splits || !x.catKey || x.catKey === '|') return null;
  const biz = a.scope === 'business', key = biz ? bookKeyOf(a.currency) : 'personal', cur = biz ? a.currency : CUR;
  if (!biz && a.currency !== CUR) return null;
  const [c, s] = x.catKey.split('|');
  return inBook(key, () => { const b = B(), cat = b.categories.find(k => k.id === c), sub = cat && s ? cat.subs.find(k => k.id === s) : null; if (!cat || (s && !sub)) return null;
    const ym = ymOf(b.today), own = s ? b.plan.lines.find(k => k.subcategoryId === s && limitLive(k, ym)) : null, whole = b.plan.lines.find(k => k.categoryId === c && !k.subcategoryId && limitLive(k, ym));
    const l = own || whole;      // a subcategory with no line of its own counts under its category's limit (core/limits.js)
    if (!l) { const tg = limitTargets(b, cat, ym).find(k => (k.sub ? k.sub.id : '') === (s || '')); if (!tg || tg.bill) return null; }
    return { key, cur, c, s, l: l || null, name: l && l === whole ? cat.name : (sub || cat).name }; });
}
/** Under the group: what is left of its limit (with this expense), or the way to give it one. */
function txLimitIn(d) {
  const x = d.draft, f = txLimitAt(x); if (!f || (f.l && f.l.pay !== 'budget')) return '';
  const ym = ymOf(x.date || S.today), when = ym === ymOf(S.today) ? t('this month') : t('in {month}', { month: fmt.month(ym) }), name = esc(f.name);
  if (!f.l) return d.limitOpen
    ? `<div class="tx-lim-form"><label for="d-limit">${t('Monthly limit for {name}', { name })} (${f.cur})</label><div class="row"><input id="d-limit" type="text" inputmode="decimal" class="num" placeholder="0,00" autocomplete="off" enterkeyhint="done" value="${esc(d.limitText || '')}" data-c="tx-limit" data-live="1"><button type="button" class="btn sm primary" data-a="tx-limit-save">${t('Save limit')}</button><button type="button" class="btn sm ghost" data-a="tx-limit-cancel">${t('Cancel')}</button></div>${d.limitError ? `<p class="note err">${esc(d.limitError)}</p>` : ''}</div>`
    : `<button type="button" class="linkbtn tx-lim-add" data-a="tx-limit-open">${icon('plus')}${t('Set a monthly limit for {name}', { name })}</button>`;
  const p = inBook(f.key, () => { const b = B(), st = d.isNew ? b : { ...b, transactions: b.transactions.filter(k => k.id !== x.id) }; return planProgress(st, ym, f.cur, S.today).find(k => k.id === f.l.id); });
  if (!p || !p.planned) return '';
  const amt = Math.abs(typedAmount(x.amountText) || 0), left = p.planned - p.spent - amt, m = v => `<b class="num">${fmt.money(v, f.cur)}</b>`, limit = m(p.planned);
  const say = left >= 0 ? (amt ? t('With this expense, {left} left of {limit} for {name} {when}.', { left: m(left), limit, name, when }) : t('{name}: {left} left of {limit} {when}.', { left: m(left), limit, name, when }))
    : (amt ? t('With this expense you go {over} over the {limit} limit for {name} {when}.', { over: m(-left), limit, name, when }) : t('{name}: {over} over the {limit} limit {when}.', { over: m(-left), limit, name, when }));
  const pct = (p.spent + amt) * 100 / p.planned, level = left < 0 ? 'crit' : pct >= 80 ? 'warn' : 'go';
  return `<div class="tx-lim ${level}">${meter(Math.min(100, pct), level)}<p>${say}</p></div>`;
}
// ---------- paying yourself: a transfer from a company account to one of the household's (owner, 2026-10-09: "what I do want is to be able to
// transfer from my PJ account to my household account"). It is the one way money crosses from one side to the other, and each side keeps its own
// row: the company's says a transfer (money sent to you is not a cost), the household's an income (what you pay yourself is what the home lives
// on), in the household's own income group, so the plan sees it arrive. The two rows share a linkId: saved, deleted or ignored together. ----------
/** The household's accounts a company account can send to: not its cards. */
const homeTargets = () => personal().filter(k => k.type !== 'credit');
/** Whether a draft sends money from a company account to the household. */
const toHome = x => x.type === 'transfer' && isBiz(x.accountId) && !!x.transferAccountId && !!acct(x.transferAccountId) && !isBiz(x.transferAccountId);
/** The household's income groups, as [catKey, name]. A group the plan's income rows use says which ("Other income · 1st salary"), so two groups
    with the same name can be told apart, and the person sees which row of the plan the money will fill. */
function homeIncomeKeys() {
  const c = S.categories.find(k => k.income); if (!c) return [];
  const rows = payRows(S, +S.today.slice(0, 4)), said = id => { const ns = [...new Set(rows.filter(r => r.sub === id).map(r => r.name))]; return ns.length ? ' · ' + ns.join(', ') : ''; };
  return c.subs.length ? c.subs.map(k => [catKey(c.id, k.id), k.name + said(k.id)]) : [[catKey(c.id), c.name]];
}
/** The group money from the company counts as at home: the group of the household's first income row of the year, or its first income group. */
function homeKeyDefault() {
  const c = S.categories.find(k => k.income), r = payRows(S, +S.today.slice(0, 4))[0];
  return c && r && c.subs.some(k => k.id === r.sub) ? catKey(c.id, r.sub) : (homeIncomeKeys()[0] || [''])[0];
}
/** The places a card's money is in, for a transfer (owner, 2026-10-09: "when I transfer from one account to another the system assumes I am using
    the credit and not the debit, and does not let me choose"): its debit, its credit when it has one, and, for a savings account whose card has
    debit, what is saved and its balance to spend. [key, account id, words]. */
function txPockets(x) {
  const a = acct(x.accountId); if (!a) return [];
  const m = cardMain(a), sp = cardSpend(m), cr = cardCredit(m), out = sp ? [['saved', m.id, t('Savings')], ['debit', sp.id, t('Debit')]] : [['debit', m.id, t('Debit')]];
  return cr ? [...out, ['credit', cr.id, t('Credit')]] : out;
}
/** Everything under the sentence. Drawn again on each letter of the sentence, which keeps its own focus. */
function txFormBody(d) {
  const x = d.draft, a = acct(x.accountId), biz = a.scope === 'business', splitSum = (x.splits || []).reduce((s, k) => s + (typedAmount(k.amountText) || 0), 0), total = Math.abs(typedAmount(x.amountText) || 0);
  const kinds = TX_KINDS(), cats = x.type === 'transfer' || x.type === 'adjustment' || x.splits ? [] : txQuickCats(x, biz), tree = biz ? companyCats() : S.categories, says = txMoreSays(x, biz);
  // 2026-10-09 (owner: "organize the Add transaction form better, it is super long"): what every transaction needs is in sight, in the order it
  // is thought of (the kind, the amount, what it was, its group, the account and the day side by side); the rest (status, split, recurring, refund,
  // notes) waits under "More options" on every screen, which says what is set there. Before, a computer showed everything, 1.185 px of it.
  const more = d.more == null ? (!d.isNew && says.length > 0) : d.more, blank = biz ? t('Not in the company plan') : t('Uncategorized');
  // a transfer moves money between accounts of the same side (owner, 2026-10-09: "the accounts do not mix"), with one way across: a company
  // account pays the household (paying yourself, above). One already linked to the other side keeps its account in the list.
  const parts = cardParts(cardMain(acct(x.accountId))), same = S.accounts.filter(k => !parts.includes(k) && (k.scope === 'business') === biz).map(k => [k.id, acctLabel(k)]);
  const home = biz ? homeTargets().map(k => [k.id, acctLabel(k)]) : [], kept = x.transferAccountId && acct(x.transferAccountId) && ![...same, ...home].some(p => p[0] === x.transferAccountId) ? [[x.transferAccountId, acctLabel(acct(x.transferAccountId))]] : [];
  const xferOpts = options([['', t('Not in Dorax')], ...kept], x.transferAccountId || '') + (biz && home.length ? `<optgroup label="${esc(t('Company'))}">${options(same, x.transferAccountId || '')}</optgroup><optgroup label="${esc(t('Your household (paying yourself)'))}">${options(home, x.transferAccountId || '')}</optgroup>` : options(same, x.transferAccountId || ''));
  const goesHome = toHome(x), homeAcct = goesHome && acct(x.transferAccountId);
  const homeFields = !goesHome ? '' : fld('d-home-cat', t('At home it counts as'), `<select id="d-home-cat" data-c="draft" data-k="homeKey">${options(homeIncomeKeys(), x.homeKey || homeKeyDefault())}</select>`, homeAcct.currency === a.currency ? 'full' : '')
    + (homeAcct.currency === a.currency ? '' : fld('d-home-amt', t('Arrived in {cur}', { cur: homeAcct.currency }), inp('d-home-amt', 'homeAmountText', x.homeAmountText || '', 'inputmode="decimal" class="num" placeholder="0,00" autocomplete="off"')));
  const acctSel = `<select id="d-account" data-c="draft" data-k="accountId" data-rerender="1">${acctOptions((cardMain(acct(x.accountId)) || {}).id || x.accountId, null, cardsOf(sideAccounts((acct(x.accountId) || {}).scope || (UI.space === 'business' ? 'business' : 'personal'))))}</select>`;
  const dateFld = fld('d-date', t('Date'), `<input type="date" id="d-date" value="${esc(x.date)}" data-c="draft" data-k="date">`);
  // a transfer (owner, 2026-10-09: "it is confusing which account the money leaves and which it goes to: put them side by side, 'leaves from' and
  // 'goes into', and the date under them"): the row's own account is where it leaves from, or where it came into when it came in
  const inward = x.type === 'transfer' && x.dir === 'in' && !goesHome, otherSel = `<select id="d-xfer" data-c="draft" data-k="transferAccountId" data-rerender="1">${xferOpts}</select>`;
  const pk = x.type === 'transfer' ? txPockets(x) : [], acctBox = acctSel + (pk.length > 1 ? `<div class="seg tx-pocket" role="group" aria-label="${esc(t('Which of its money'))}">${pk.map(([k, id, l]) => `<button type="button" data-a="tx-pocket" data-id="${id}" data-v="${k}" aria-pressed="${x.accountId === id}">${l}</button>`).join('')}</div>` : '');
  const route = `<div class="full tx-route"><div class="field"><label for="${inward ? 'd-xfer' : 'd-account'}">${t('Leaves from')}</label>${inward ? otherSel : acctBox}</div>
      <span class="tx-arrow" aria-hidden="true">${icon('right')}</span><div class="field"><label for="${inward ? 'd-account' : 'd-xfer'}">${t('Goes into')}</label>${inward ? acctBox : otherSel}</div></div>`;
  const catField = x.type === 'transfer' || x.type === 'adjustment' || x.splits || (biz && !tree.length) ? ''
    : `<div class="field full tx-cats"><span id="tx-cat-l">${biz ? t('Company cost or income') : t('Category')}</span>
        ${cats.length && !d.allCats ? `<div class="tx-picks" role="group" aria-labelledby="tx-cat-l">${cats.map(c => `<button type="button" class="tx-pick" data-a="tx-cat" data-k="${esc(c.k)}" aria-pressed="${c.k === x.catKey}">${catGlyph(c.k.split('|')[0], 'sm', c.k.split('|')[1])}${esc(c.name)}</button>`).join('')}<button type="button" class="tx-pick more" data-a="tx-cats-all">${t('Another')}${icon('down')}</button></div>` : ''}
        ${!cats.length || d.allCats ? `<label class="sr" for="d-cat">${biz ? t('Company cost or income') : t('Category')}</label><select id="d-cat" data-c="draft" data-k="catKey" data-rerender="1">${catOptions(x.catKey, { blank, list: tree })}</select>` : ''}
        </div>`;
  const note = goesHome ? t('Paying yourself: it leaves the company as a transfer, not a cost, and comes into {name} as household income.', { name: esc(homeAcct.name) })
    : !biz && x.linkId && !d.isNew && acct(x.transferAccountId) ? t('Paid by the company from {name}. Deleting it deletes the company’s transfer too.', { name: esc(acct(x.transferAccountId).name) })
    : x.type === 'transfer' ? t('Transfers between your own accounts are not counted as income or spending.') : '';
  const statusFld = x.type === 'adjustment' ? fld('d-type', t('Type'), `<select id="d-type" data-c="draft" data-k="type" data-rerender="1">${options(TYPES(), x.type)}</select>`) + fld('d-dir', t('Direction'), `<select id="d-dir" data-c="draft" data-k="dir">${options([['out', t('Money out')], ['in', t('Money in')]], x.dir)}</select>`)
    : x.type === 'transfer' ? '' : fld('d-status', t('Status'), `<select id="d-status" data-c="draft" data-k="status" data-rerender="1">${options(STATUSES(), x.status)}</select>`);
  return `
    <div class="seg tx-kind" role="group" aria-label="${t('Type')}">${kinds.map(([v, l]) => `<button type="button" data-a="tx-type" data-v="${v}" aria-pressed="${x.type === v}">${l}</button>`).join('')}</div>
    <div class="tx-amount"><label for="d-amount">${t('Amount')} (${a.currency})${reqMark()}</label><span class="tx-sym" aria-hidden="true">${TX_SYM(a.currency)}</span>${inp('d-amount', 'amountText', x.amountText, 'inputmode="decimal" class="num" placeholder="0,00" autocomplete="off" enterkeyhint="done" data-rerender="1" aria-required="true"')}</div>
    <div class="form-grid tx-grid">
      ${fld('d-merchant', x.type === 'income' ? t('Where it came from') : x.type === 'transfer' ? t('Description') : t('What it was'), inp('d-merchant', 'merchant', x.merchant, 'autocomplete="off" enterkeyhint="done"'), 'full')}
      ${catField}
      <div class="full tx-limit" id="tx-limit" aria-live="polite">${txLimitIn(d)}</div>
      ${x.type === 'transfer' ? `${route}${dateFld}${homeFields}` : `${fld('d-account', t('Account'), acctSel)}${dateFld}${txPayWith(x)}${txInstField(d)}`}
      ${note ? `<p class="note full tx-note">${icon('info')}<span>${note}</span></p>` : ''}
      ${d.isNew ? '' : instNote(S.transactions.find(k => k.id === x.id))}
    </div>
    <button type="button" class="tx-more" data-a="tx-more" aria-expanded="${more}" aria-controls="tx-more-box"><span>${t('More options')}</span>${says.length ? `<span class="note">${says.map(esc).join(' · ')}</span>` : ''}${icon('down')}</button>
    <div id="tx-more-box" class="tx-more-box"${more ? '' : ' hidden'}>
      ${statusFld ? `<div class="form-grid">${statusFld}</div>` : ''}
      ${x.type !== 'transfer' && x.type !== 'adjustment' && !biz ? (x.splits ? `<div class="stack" style="gap:8px"><div class="row"><b style="font-weight:500">${t('Split across categories')}</b><button class="btn sm ghost spacer" data-a="split-off">${t('Remove split')}</button></div>
        ${x.splits.map((s, i) => `<div class="split-row"><label class="sr" for="sp-cat-${i}">${t('Category')} ${i + 1}</label><select id="sp-cat-${i}" data-c="split" data-i="${i}" data-k="catKey">${catOptions(s.catKey, { blank: t('Uncategorized') })}</select><label class="sr" for="sp-amt-${i}">${t('Amount')} ${i + 1}</label><input type="text" inputmode="decimal" class="num" id="sp-amt-${i}" value="${esc(s.amountText)}" data-c="split" data-i="${i}" data-k="amountText" data-rerender="1"><button class="iconbtn" data-a="split-remove" data-i="${i}" aria-label="${t('Remove')} ${i + 1}" ${x.splits.length <= 2 ? 'disabled style="opacity:.4"' : ''}>${icon('x')}</button></div>`).join('')}
        <div class="row"><button class="btn sm" data-a="split-add">${icon('plus')}${t('Add line')}</button><span class="note spacer">${splitSum === total ? t('Split matches the total.') : t('Split lines add up to {a}; the total is {b}.', { a: fmt.money(splitSum, a.currency), b: fmt.money(total, a.currency) })}</span></div></div>`
        : `<div><button class="btn sm" data-a="split-on">${t('Split across categories')}</button></div>`) : ''}
      ${biz ? '' : sw('d-recurring', x.recurring, 'draft', 'data-k="recurring"', t('Mark as recurring'))}
      ${biz || x.type !== 'expense' ? '' : sw('d-refund', !!x.refund, 'draft', 'data-k="refund"', t('A refund: money given back, taken off spending'))}
      ${fld('d-notes', t('Notes'), `<textarea id="d-notes" data-c="draft" data-k="notes">${esc(x.notes)}</textarea>`)}
      ${d.isNew ? '' : `<dl class="kv" style="border-top:1px solid var(--line);padding-top:12px"><dt>${t('Bank description')}</dt><dd class="mono">${esc(x.description)}</dd><dt>${t('Source')}</dt><dd>${esc(sourceLabel(x.source))}${x.confidence ? ` · ${t('reading confidence {n}%', { n: x.confidence })}` : ''}</dd>${x.sourceTxnId ? `<dt>${t('Bank ID')}</dt><dd class="mono">${esc(x.sourceTxnId)}</dd>` : ''}<dt>${t('Fingerprint')}</dt><dd class="mono">${esc(x.fingerprint)}</dd></dl>`}
    </div>`;
}
function txDrawer(d) {
  const x = d.draft;
  return `<div class="body tx-body">
    ${d.error ? errBanner(d.error) : ''}
    ${d.isNew ? `<div class="tx-say"><span class="tx-say-h"><label for="d-say">${t('Write it in a sentence')}</label>${info(t('The amount and what it was. If you like, also the day and the account. Your keyboard’s microphone works here too.'))}</span>
      <input type="text" id="d-say" value="${esc(d.say || '')}" data-c="tx-say" data-live="1" placeholder="${t('taxi 15 yesterday')}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" aria-describedby="d-say-read">
      <p class="note" id="d-say-read" aria-live="polite">${txSayRead(d)}</p></div>
      <div class="tx-or" aria-hidden="true"><span>${t('or fill it in')}</span></div>` : ''}
    <div id="tx-form" class="tx-form">${txFormBody(d)}</div>
  </div>
  <footer><button class="btn primary" data-a="save-tx">${t('Save')}</button>
    ${d.isNew ? '' : `<button class="btn" data-a="ignore-tx">${x.status === 'ignored' ? t('Restore') : t('Ignore')}</button><button class="btn ghost danger" data-a="ask-delete">${t('Delete')}</button>`}
    <button class="btn ghost spacer" data-a="close">${t('Cancel')}</button></footer>`;
}
