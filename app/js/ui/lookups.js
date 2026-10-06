/* Dorax Finance — shared: finding accounts and categories, option lists. */
// ---------- lookups ----------
const acct = id => S.accounts.find(a => a.id === id);
const isBiz = id => { const a = acct(id); return !!a && a.scope === 'business'; };
const personal = () => S.accounts.filter(a => a.scope !== 'business');
const business = () => S.accounts.filter(a => a.scope === 'business');
/** The accounts whose statement is sent every month, as the person said for each one. With a month: those that already counted in that month. */
const needStatements = ym => S.accounts.filter(a => owesStatement(a, ym));
// platLabel (the accounting platform's name) lives in features/reminders/reminder-messages.js, which the server's reminder job shares.
/** Accounts in the order the converter offers them: the ones on the monthly list, then the other company accounts, then the household's. */
const convAccounts = () => { const m = needStatements(); return [...m, ...business().filter(a => !m.includes(a)), ...personal().filter(a => !m.includes(a))]; };
function catOf(id) { for (const c of S.categories) { if (c.id === id) return { cat: c }; const s = c.subs.find(x => x.id === id); if (s) return { cat: c, sub: s }; } return null; }
function catName(id) { const f = catOf(id); return f ? (f.sub ? f.sub.name : f.cat.name) : t('Uncategorized'); }
function catColor(catId) { const c = S.categories.find(x => x.id === catId); return c && c.color ? `var(--${c.color})` : 'var(--ink-3)'; }
function catLabel(x) {
  if (x.accountId && isBiz(x.accountId)) return `<span class="cat muted">${t('Company')}</span>`;
  if (x.type === 'transfer') return `<span class="cat muted">${t('Transfer')}</span>`;
  if (x.splits && x.splits.length) return `<span class="cat"><span class="dot" style="background:${catColor(x.splits[0].categoryId)}"></span>${t('Split · {n} categories', { n: x.splits.length })}</span>`;
  const c = S.categories.find(k => k.id === x.categoryId);
  if (!c) return `<span class="cat muted">${t('Uncategorized')}</span>`;
  const sub = c.subs.find(s => s.id === x.subcategoryId);
  return `<span class="cat"><span class="dot" style="background:${catColor(c.id)}"></span>${esc(sub ? sub.name : c.name)}${sub ? ' <span class="muted">· ' + esc(c.name) + '</span>' : ''}</span>`;
}
const catKey = (c, s) => (c || '') + '|' + (s || '');
function catOptions(selected, opt) {
  opt = opt || {};
  let h = opt.blank ? `<option value="|"${selected === '|' ? ' selected' : ''}>${esc(opt.blank)}</option>` : '';
  for (const c of S.categories) {
    if (opt.expenseOnly && c.income) continue;
    h += `<optgroup label="${esc(c.name)}"><option value="${catKey(c.id)}"${selected === catKey(c.id) ? ' selected' : ''}>${esc(c.name)}${c.subs.length ? ' ' + t('(general)') : ''}</option>`;
    for (const s of c.subs) h += `<option value="${catKey(c.id, s.id)}"${selected === catKey(c.id, s.id) ? ' selected' : ''}>${esc(s.name)}</option>`;
    h += '</optgroup>';
  }
  return h;
}
const options = (pairs, sel) => pairs.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(sel) ? ' selected' : ''}>${esc(l)}</option>`).join('');
const acctOptions = (sel, blank, list) => (blank ? `<option value="">${esc(blank)}</option>` : '') + options((list || S.accounts).map(a => [a.id, a.name]), sel);
const TYPES = () => [['expense', t('Expense')], ['income', t('Income')], ['transfer', t('Transfer')], ['adjustment', t('Adjustment')]];
const STATUSES = () => [['confirmed', t('Confirmed')], ['pending', t('Pending')], ['ignored', t('Ignored')]];
const ACCT_TYPES = () => [['checking', t('Checking')], ['savings', t('Savings')], ['credit', t('Credit card')], ['cash', t('Cash')]];
const sourceLabel = s => ({ csv: t('CSV file'), ofx: t('OFX file'), manual: t('Manual entry'), sheet: t('Spreadsheet'), bank: t('Bank connection') }[s] || s);
const LANGS = [['es', 'Español'], ['pt', 'Português'], ['en', 'English']];
