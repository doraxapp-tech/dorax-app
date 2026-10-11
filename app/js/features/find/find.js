/* Dorax Finance — Search: one field for everything (owner, 2026-10-06: "add search bar under the logo in the sidebar (activate using (F))
   user can search anything there"; the example he sent is a list of results under a field, each with an icon, a name and what it is).
   What can be found: every page; the things one does most (add a transaction, a fixed cost, a goal, an account...); accounts; fixed costs
   and goals of both sides (household and company); categories; investments; and transactions, by merchant, description, note or amount.
   Choosing a result goes there: a page opens, an action starts, an account shows its transactions, a cost, a goal or a transaction opens.
   Nothing is sent anywhere: the search reads the account that is already open in the page.
   2026-10-09 (owner: "the accounts do not mix"): the search finds the side on screen only: its pages, accounts, costs, goals, categories and
   transactions. Before, it found both sides'.
   UI.find: { q, i (the result the arrows are on), items, back (what had the focus) } while it is open; null otherwise. */
const findNorm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Everything that can be found except transactions, each as { kind, icon, title, sub, more, run }. kind orders equal matches. */
function findThings() {
  const out = [], co = UI.space === 'business', two = companyCurrencies(S).length > 1, side = key => key === 'personal' ? t('Household') : t('Company') + (two ? ' ' + key.slice(9) : '');
  const act = (ic, title, run, more) => out.push({ kind: 0, icon: ic, title, sub: t('Action'), more, run });
  act('plus', t('Add transaction'), () => A['new-tx']());
  act('plus', t('New fixed cost'), () => { navigate('plan'); A['line-new'](); });
  act('plus', t('New goal'), () => { navigate('goals'); A['goal-new'](); });
  act('plus', t('Add account'), () => { navigate('accounts'); A['account-add'](); });      // on the side on screen
  act('bell', t('Reminders'), () => A.reminders());
  act('calendar', t('Due days'), () => { navigate('plan'); A['due-days']({}); });
  act('gauge', t('Spending limits'), () => A.limits(), t('Set a limit') + ' ' + t('Budget'));      // features/limits
  act('help', t('Help'), () => A.help(), t('Contact'));
  for (const [id, ic] of sideRoutes(ROUTES)) out.push({ kind: 1, icon: ic, title: routeLabel(id), sub: t('Page'), run: () => navigate(id) });
  for (const a of sideAccounts(co ? 'business' : 'personal')) out.push({ kind: 2, icon: 'wallet', title: a.name, sub: [t('Account'), a.institution, a.currency].filter(Boolean).join(' · '), run: () => A['view-account']({ id: a.id }) });
  // a cost or a goal opens in its own book, whatever side the page was showing when the search was opened (book: ui/lookups.js)
  for (const key of co ? companyBooks(S).map(b => b.key) : ['personal']) inBook(key, () => {
    for (const l of B().plan.lines) out.push(l.pay === 'budget'
      ? { kind: 3, icon: 'gauge', title: l.name, sub: t('Spending limit') + ' · ' + side(key), run: () => { setPageBook(key); navigate('plan'); A['limit-open']({ cat: l.categoryId, sub: l.subcategoryId || '', book: key }); } }
      : { kind: 3, icon: 'calendar', title: l.name, sub: t('Fixed cost') + ' · ' + side(key), run: () => { setPageBook(key); navigate('plan'); A['line-open']({ id: l.id, book: key }); } });
    for (const g of B().goals) out.push({ kind: 4, icon: g.yearly ? 'calendar' : 'flag', title: g.name, sub: (g.yearly ? t('Yearly expense') : g.kind === 'goal' ? t('Goal') : t('Fund')) + ' · ' + side(key), run: () => { setPageBook(key); navigate('goals'); A[g.yearly ? 'yearly-open' : 'goal-open']({ id: g.id, book: key }); } });
  });
  for (const c of co ? companyCats() : S.categories) out.push({ kind: 5, icon: 'tag', title: c.name, sub: t('Category'), run: () => A['filter-cat']({ cat: c.id, all: '1' }) });
  if (!co) for (const ticker of Object.keys((S.fii || {}).assets || {})) out.push({ kind: 6, icon: 'trend', title: ticker, sub: t('Investment'), run: () => { UI.fii.ticker = ticker; navigate('investments'); } });
  return out;
}
/** The results for what was typed, best first. Every word typed must be in the result. With nothing typed: the actions and the pages. */
function findResults(q) {
  const words = findNorm(q).split(/\s+/).filter(Boolean), things = findThings();
  if (!words.length) return things.filter(x => x.kind <= 1);
  const hits = [];
  for (const x of things) {
    const title = findNorm(x.title), rest = findNorm(x.sub + ' ' + (x.more || ''));
    if (!words.every(w => title.includes(w) || rest.includes(w))) continue;
    const rank = title.startsWith(words[0]) ? 0 : words.some(w => (' ' + title).includes(' ' + w)) ? 1 : words.every(w => title.includes(w)) ? 2 : 3;
    hits.push([rank, x.kind, title, x]);
  }
  hits.sort((a, b) => a[0] - b[0] || a[1] - b[1] || (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0));
  const out = hits.slice(0, 24).map(h => h[3]), digits = q.replace(/\D/g, '');
  let n = 0;
  const biz = UI.space === 'business';
  for (const x of S.transactions) {       // newest first, as the account keeps them; the side's only
    if (n >= 8) break;
    if (!acct(x.accountId) || isBiz(x.accountId) !== biz) continue;
    const text = findNorm(x.merchant + ' ' + (x.description || '') + ' ' + (x.notes || '')), a = acct(x.accountId);
    const byWords = words.every(w => text.includes(w)), byAmount = digits.length >= 3 && String(Math.abs(x.amount)).includes(digits);
    if (!byWords && !byAmount) continue;
    out.push({ kind: 7, icon: 'list', title: x.merchant, sub: [t('Transaction'), fmt.date(x.date, true), a ? a.name : '', fmt.money(x.amount, x.currency)].filter(Boolean).join(' · '), run: () => A['open-tx']({ id: x.id }) }); n++;
  }
  return out;
}

/** The field under the logo. It is a button: the typing happens in the panel it opens, which has room for the results. */
const findField = () => `<button class="findbtn" data-a="find" aria-haspopup="dialog" aria-keyshortcuts="F">${icon('search')}<span>${t('Search')}</span><kbd aria-hidden="true">F</kbd></button>`;
function findList() {
  const f = UI.find; f.items = findResults(f.q); f.i = Math.max(0, Math.min(f.i, f.items.length - 1));
  if (!f.items.length) return `<div class="find-none"><b>${t('Nothing matches “{q}”', { q: esc(f.q.trim()) })}</b><span>${t('Try a name, a merchant or an amount.')}</span></div>`;
  return f.items.map((x, i) => `<button class="find-o" role="option" id="find-o-${i}" aria-selected="${i === f.i}" tabindex="-1" data-a="find-go" data-i="${i}">${icon(x.icon)}<span class="find-t"><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></span></button>`).join('');
}
/** Draws the panel, or takes it away. The field keeps the focus the whole time: the arrows move through the results, Enter opens one. */
function renderFind() {
  const root = $('find-root'), f = UI.find;
  if (!f) { root.innerHTML = ''; return setInert(); }
  root.innerHTML = `<div class="scrim" data-a="find-close"></div><div class="find" role="dialog" aria-modal="true" aria-label="${t('Search')}">
      <div class="find-top">${icon('search')}<input type="text" id="find-q" role="combobox" aria-expanded="true" aria-controls="find-list" aria-autocomplete="list" aria-label="${t('Search')}" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" placeholder="${t('Search pages, accounts, bills, transactions')}" value="${esc(f.q)}" data-c="find-q" data-live="1"><button class="find-esc" data-a="find-close" aria-label="${t('Close')}"><kbd aria-hidden="true">Esc</kbd></button></div>
      <div class="find-list" id="find-list" role="listbox" aria-label="${t('Results')}">${findList()}</div>
      <div class="find-foot" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd>${t('to move')}</span><span><kbd>Enter</kbd>${t('to open')}</span></div></div>`;
  setInert(); findMark();
}
/** Says which result the arrows are on, to the eye and to a screen reader, and keeps it in view. */
function findMark() {
  const f = UI.find, q = $('find-q'); if (!f || !q) return;
  document.querySelectorAll('#find-list .find-o').forEach((el, i) => el.setAttribute('aria-selected', String(i === f.i)));
  const on = $('find-o-' + f.i);
  if (on) { q.setAttribute('aria-activedescendant', on.id); if (on.scrollIntoView) on.scrollIntoView({ block: 'nearest' }); } else q.removeAttribute('aria-activedescendant');
}
function findMove(by) { const f = UI.find; if (!f || !f.items.length) return; f.i = (f.i + by + f.items.length) % f.items.length; findMark(); }
