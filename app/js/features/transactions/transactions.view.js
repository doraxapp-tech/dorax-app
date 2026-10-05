/* Dorax Finance — screen: Transactions. */
// ---------- Transactions ----------
function filteredTx(f) {
  f = f || UI.tx; const q = normalizeText(f.q), month = f.month === 'current' ? S.month : f.month;
  let rows = S.transactions.filter(x => {
    if (month && ymOf(x.date) !== month) return false;
    if (f.account ? x.accountId !== f.account : f.scope && (f.scope === 'business') !== isBiz(x.accountId)) return false;
    if (f.type && x.type !== f.type) return false;
    if (f.status && x.status !== f.status) return false;
    if (f.category) { const hit = f.category === 'none' ? (!x.categoryId || x.categoryId === 'other') && x.type !== 'transfer' && !isBiz(x.accountId) : allocations(x).some(a => a.categoryId === f.category || a.subcategoryId === f.category); if (!hit) return false; }
    if (q && !(normalizeText(x.merchant + ' ' + x.description + ' ' + x.notes).includes(q) || centsToDecimal(Math.abs(x.amount)).includes(f.q.trim().replace(',', '.')))) return false;
    return true;
  });
  const k = f.sort, d = f.dir;
  rows.sort((a, b) => k === 'amount' ? (a.amount - b.amount) * d : k === 'merchant' ? a.merchant.localeCompare(b.merchant) * d : (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) * d);
  return rows;
}
/** The transactions table opens on the month chosen in the top bar, household accounts only. Anything else is a filter that has been applied. */
const TX_DEFAULT = { q: '', month: 'current', scope: 'personal', account: '', category: '', type: '', status: '' };
const TX_SIZES = [10, 25, 50], TX_KEYS = ['month', 'scope', 'account', 'category', 'type', 'status'];   // ten rows keep the table on one screen; the person can ask for more
function txCatPairs() {
  const pairs = [['', t('All categories')], ['none', t('Uncategorized') + (S.categories.some(c => c.id === 'other') ? ' / ' + catName('other') : '')]];
  S.categories.forEach(c => { pairs.push([c.id, c.name]); c.subs.forEach(s => pairs.push([s.id, '   ' + s.name])); });
  return pairs;
}
/** The filters that differ from the opening view, as [key, words]. An account decides the scope by itself, so the scope is not listed beside it. */
function txApplied(f) {
  f = f || UI.tx; const out = [], label = (pairs, v) => (pairs.find(p => p[0] === v) || [0, v])[1].trim();
  if (f.month !== 'current') out.push(['month', f.month ? fmt.month(f.month) : t('All months')]);
  if (f.account) { const a = S.accounts.find(x => x.id === f.account); out.push(['account', a ? a.name : f.account]); }
  else if (f.scope !== 'personal') out.push(['scope', f.scope === 'business' ? t('Company (PJ)') : t('Household and company')]);
  if (f.category) out.push(['category', label(txCatPairs(), f.category)]);
  if (f.type) out.push(['type', label(TYPES(), f.type)]);
  if (f.status) out.push(['status', label(STATUSES(), f.status)]);
  return out;
}
/** Beside the search box: one button that opens the filters, with how many are applied, and a way to clear them all once there is something to clear. */
function txTools() {
  const n = txApplied().length, any = n > 0 || !!UI.tx.q.trim();
  return `<button class="btn" id="tx-filters-btn" data-a="tx-filters" aria-haspopup="dialog" aria-label="${n ? tn(n, 'Filters, {n} applied', 'Filters, {n} applied') : t('Filters')}">${icon('filter')}<span>${t('Filters')}</span>${n ? `<span class="fcount" aria-hidden="true">${n}</span>` : ''}</button>${any ? `<button class="btn ghost" id="tx-clear" data-a="clear-filters">${icon('x')}${t('Clear filters')}</button>` : ''}`;
}
function txList() {
  const rows = filteredTx(), f = UI.tx, applied = txApplied();
  const cur = f.account ? acct(f.account).currency : CUR, scoped = rows.filter(x => x.currency === cur && x.status !== 'ignored');
  const spent = -scoped.filter(x => x.type === 'expense').reduce((s, x) => s + x.amount, 0), inc = scoped.filter(x => x.type === 'income').reduce((s, x) => s + x.amount, 0);
  const arrow = k => f.sort === k ? (f.dir < 0 ? ' ↓' : ' ↑') : '';
  // what is applied stays in sight while the controls are tucked away: one chip per filter, each with its own way out
  const chips = applied.length ? `<div class="fchips" role="group" aria-label="${t('Filters applied')}">${applied.map(([k, l]) => `<button class="fchip" data-a="tx-drop" data-k="${k}" aria-label="${t('Remove filter: {label}', { label: esc(l) })}"><span>${esc(l)}</span>${icon('x')}</button>`).join('')}</div>` : '';
  const filtered = applied.length > 0 || !!f.q.trim();
  if (!rows.length) return `${chips}<div class="empty"><b>${filtered ? t('No transactions match these filters') : t('No transactions in {month}', { month: fmt.month(S.month) })}</b>${filtered ? t('Try a different month or clear the filters.') : t('Nothing is recorded for this month in your household accounts.')}<div style="margin-top:10px">${applied.length || f.q.trim() ? `<button class="btn sm" data-a="clear-filters">${t('Clear filters')}</button>` : `<button class="btn sm" data-a="tx-all-months">${t('Show all months')}</button>`}</div></div>`;
  const size = TX_SIZES.includes(+f.size) ? +f.size : TX_SIZES[0], pages = Math.ceil(rows.length / size), page = Math.min(Math.max(1, f.page || 1), pages), from = (page - 1) * size, shown = rows.slice(from, from + size); f.page = page;
  return `${chips}<div class="toolbar"><span class="note"><b style="color:var(--ink)">${rows.length}</b> ${tn(rows.length, 'transaction', 'transactions')} · ${t('Spending')} ${fmt.money(spent, cur)} · ${t('Income')} ${fmt.money(inc, cur)} <span class="muted">(${cur}; ${t('transfers and ignored rows excluded')})</span></span></div>
  <table class="tbl stackable"><thead><tr><th><button data-a="sort" data-k="date">${t('Date')}${arrow('date')}</button></th><th><button data-a="sort" data-k="merchant">${t('Merchant')}${arrow('merchant')}</button></th><th>${t('Category')}</th><th>${t('Account')}</th><th class="r"><button data-a="sort" data-k="amount">${t('Amount')}${arrow('amount')}</button></th></tr></thead>
  <tbody>${shown.map(x => txRow(x, { raw: true })).join('')}</tbody></table>
  ${rows.length > TX_SIZES[0] ? `<nav class="pager" aria-label="${t('Pages')}"><span class="pg"><span class="note num" id="tx-range" role="status">${t('{a}–{b} of {n}', { a: from + 1, b: from + shown.length, n: rows.length })}</span><label class="note" for="tx-size">${t('Rows per page')}</label><select id="tx-size" data-c="tx-size">${options(TX_SIZES.map(n => [String(n), String(n)]), String(size))}</select></span>
    <span class="pg"><button class="btn sm" data-a="tx-page" data-v="prev" ${page > 1 ? '' : 'disabled'}>${icon('left')}<span>${t('Previous')}</span></button><span class="note num">${t('Page {a} of {b}', { a: page, b: pages })}</span><button class="btn sm" data-a="tx-page" data-v="next" ${page < pages ? '' : 'disabled'}><span>${t('Next')}</span>${icon('right')}</button></span></nav>` : ''}`;
}
function viewTransactions() {
  const f = UI.tx, rp = UI.rulePrompt;
  return `${rp ? banner('', `<b>${rp.count > 1 ? t('You categorized “{merchant}” as {label} {n} times.', { merchant: esc(rp.merchant), label: esc(rp.label), n: rp.count }) : t('You categorized “{merchant}” as {label}.', { merchant: esc(rp.merchant), label: esc(rp.label) })}</b> ${t('Create a rule so future imports are categorized the same way?')}<div class="row" style="margin-top:8px"><button class="btn sm primary" data-a="rule-from-prompt">${t('Create rule')}</button><button class="btn sm ghost" data-a="dismiss-prompt">${t('Not now')}</button></div>`) : ''}
  <section class="card" id="tx-card">
    <div class="toolbar tx-bar">
      <div class="search"><label class="sr" for="tx-q">${t('Search transactions')}</label><input type="search" id="tx-q" placeholder="${t('Search merchant, description, note or amount')}" value="${esc(f.q)}" data-c="tx-filter" data-k="q" data-live="1"></div>
      <span class="tx-tools" id="tx-tools">${txTools()}</span>${hint('tx')}
    </div>
    <div id="tx-list">${txList()}</div>
  </section>`;
}
/** The filters, in one pop-up. Choices are tried on a copy: the button says how many transactions they leave, and nothing changes behind until it is pressed. */
function txFiltersDrawer(d) {
  const x = d.draft, months = []; for (let y = ymOf(S.today); y >= minMonth(); y = addMonths(y, -1)) months.push([y, fmt.month(y)]);
  const n = filteredTx({ ...UI.tx, ...x }).length, any = txApplied({ ...x, q: '' }).length > 0;
  const pick = (id, k, label, pairs, html) => fld(id, label, `<select id="${id}" data-c="txf" data-k="${k}">${html || options(pairs, x[k])}</select>`);
  return `<div class="body"><div class="f-grid">
      ${pick('tx-month', 'month', t('Month'), [['current', fmt.month(S.month)], ['', t('All months')], ...months.filter(m => m[0] !== S.month)])}
      ${pick('tx-scope', 'scope', t('Scope'), [['personal', t('Household')], ['business', t('Company (PJ)')], ['', t('Household and company')]])}
      ${pick('tx-account', 'account', t('Account'), null, acctOptions(x.account, t('All accounts')))}
      ${pick('tx-cat', 'category', t('Category'), txCatPairs())}
      ${pick('tx-type', 'type', t('Type'), [['', t('All types')], ...TYPES()])}
      ${pick('tx-status', 'status', t('Status'), [['', t('All statuses')], ...STATUSES()])}</div>
      ${x.account ? `<p class="note">${t('An account is chosen, so the scope does not apply.')}</p>` : ''}</div>
    <footer><button class="btn primary" data-a="txf-apply">${tn(n, 'Show {n} transaction', 'Show {n} transactions')}</button><button class="btn ghost" data-a="txf-clear" ${any ? '' : 'disabled'}>${t('Clear filters')}</button><button class="btn ghost spacer" data-a="close">${t('Cancel')}</button></footer>`;
}
