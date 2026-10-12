/* Dorax Finance — Transactions on a phone in the light theme, "Bosque" (owner, 2026-10-12: "haz estos dos updates que me habías enviado, quiero ver
   cómo se ven en vivo", the canvas's "Movimientos · Bosque"). The same list and the same filters as before (features/transactions/transactions.view.js:
   filteredTx, UI.tx), laid out as the summary:
     - the forest block goes on from the top bar: the page's name with search and the filters as round buttons (the bell and the side's switch are
       on the summary), Expenses | Income | All as the summary's switch, the figure of what is listed, large, with how it compares with the month
       before, and the month added up day by day against the month before (a finger or the arrows move the mark along it);
     - the list in a grey sheet with rounded corners that rises over the block: the month, how many, a button to add one; then every day of it in
       one white card: the category's icon with the bank's logo on it, what it was, its category and account, the amount;
     - the bar at the foot floats as on the summary (css/look/look-land.css; app/shell.js marks the page .land here too).
   The figure, the comparison and the chart follow what is listed: the month, the kind, the search and the filters. Expenses first, as designed: the
   first time Transactions opens in a visit, the choice is then the person's. While the month is under way it is compared with the month before
   up to the same day, so a month half lived is not set against a whole one.
   Styles: css/look/look-land-moves.css. The dark theme, the company's side and a computer keep the table. */

/** This look on Transactions: a phone, the light theme, the household's side (the summary's test, bosque.js, on this page). */
const bqTxOn = () => !!UI.session && UI.space !== 'business' && UI.route === 'transactions' && isPhone() && !lookOld();
/** Any screen of the household in this look (a phone, the light theme; since v193 every screen, features/phone/bosque-frame.js): its panels wear
    it, and a new transaction has its keypad (features/transactions/transaction-form.view.js). */
const landOn = () => !!UI.session && UI.space !== 'business' && isPhone() && !lookOld();      // either theme since v194
const BQ_TX_STEP = 40;      // rows drawn at a time; "Show more" adds as many
const BQ_LOCALE = { en: 'en-US', es: 'es-ES', pt: 'pt-BR' };

/** What the switch shows: the kind chosen there (expenses or income), all, or a transfer chosen in the filters. */
const bqTxKind = () => UI.tx.type === 'expense' || UI.tx.type === 'income' || UI.tx.type === 'transfer' ? UI.tx.type : 'all';
/** The filters applied beyond the switch: the kind is the switch's own when it is expenses or income. */
const bqApplied = () => txApplied().filter(([k]) => !(k === 'type' && (UI.tx.type === 'expense' || UI.tx.type === 'income')));
/** A row's part of the figure: what was spent, what came in, what was left (in less out; a transfer is neither), or what was moved. */
function bqTxVal(x, kind) {
  if (kind === 'expense') return x.type === 'expense' ? -x.amount : 0;
  if (kind === 'income') return x.type === 'income' ? x.amount : 0;
  if (kind === 'transfer') return x.type === 'transfer' && x.amount < 0 ? -x.amount : 0;
  return x.type === 'transfer' ? 0 : x.amount;
}
/** The month listed ('' for all of them). */
const bqTxMonth = () => UI.tx.month === 'current' ? S.month : UI.tx.month;

// ---------- the top bar's round buttons: search and the filters ----------
function bqTxTools() {
  const open = !!(UI.tx.bqFind || UI.tx.q);
  return `<button class="bq-tool" id="bq-find-btn" data-a="bq-tx-find" aria-expanded="${open}" aria-label="${t('Search transactions')}">${icon('search')}</button><span class="tx-tools bq-tt" id="tx-tools">${bqFilterBtn()}</span>`;
}
function bqFilterBtn() {
  const n = bqApplied().length;
  return `<button class="bq-tool" id="tx-filters-btn" data-a="tx-filters" aria-haspopup="dialog" aria-label="${n ? tn(n, 'Filters, {n} applied', 'Filters, {n} applied') : t('Filters')}">${icon('filter')}${n ? `<span class="count" aria-hidden="true">${n}</span>` : ''}</button>`;
}

// ---------- the page ----------
function bqTxView() {
  const f = UI.tx;
  if (!f.bqSeen) { f.bqSeen = true; if (!f.type) f.type = 'expense'; }      // expenses first, the first time in a visit (as designed)
  const kind = bqTxKind(), seg = [['expense', t('Expenses')], ['income', t('Income')], ['', t('All')]];
  const find = f.bqFind || f.q ? `<div class="bq-find"><span class="bq-find-ico" aria-hidden="true">${icon('search')}</span><label class="sr" for="tx-q">${t('Search transactions')}</label>
      <input type="search" id="tx-q" placeholder="${t('Search merchant, description, note or amount')}" value="${esc(f.q)}" data-c="tx-filter" data-k="q" data-live="1" enterkeyhint="search" autocomplete="off">
      <button class="bq-find-x" data-a="bq-tx-find" aria-label="${t('Close search')}">${icon('x')}</button></div>` : '';
  return `<div class="bq-tx"><section class="bq-txtop" aria-label="${esc(t('Summary of what is listed'))}">${find}
    <div class="bq-kind" role="group" aria-label="${t('What to show')}">${seg.map(([v, l]) => `<button data-a="bq-tx-kind" data-v="${v}" aria-pressed="${(v || 'all') === kind}">${l}</button>`).join('')}</div>
    <div id="bq-txsum">${bqTxSum()}</div></section>
    <section class="bq-txsheet" aria-labelledby="bq-tx-h"><span class="bq-grab" aria-hidden="true"></span>${txPairsNote()}${txInbox()}${txRuleNote()}<div id="tx-list">${txList()}</div></section></div>`;
}

// ---------- the figure, the comparison and the chart ----------
let bqChartNow = null;      // what the chart drew, for the finger or the keys that move its mark
/** The figure of what is listed, how it compares with the month before, the month's picker, and the chart. */
/** What a month adds up to, for one kind (expenses, income, all, transfers) under the filters f, in currency cur: the words over the figure, the
    figure with its cents small, how it compares with the month before (up to the same day while this one is under way), and the chart. Shared by
    Transactions and the summary's part (opt.card: the chart drawn in a card, opt.W its width). */
function bqSumParts(f, m, kind, cur, opt) {
  opt = opt || {};
  const rowsOf = month => filteredTx({ ...f, month }).filter(x => x.currency === cur && x.status !== 'ignored');
  const rows = rowsOf(m), total = sum(rows.map(x => bqTxVal(x, kind)));
  const word = m ? mcMonth(m) : t('all months');
  const label = { expense: t('You spent in {month}', { month: word }), income: t('You received in {month}', { month: word }), transfer: t('You moved between your accounts in {month}', { month: word }), all: t('Balance of {month}', { month: word }) }[kind];
  const s = fmt.money(total, cur, kind === 'all' ? { sign: true } : {}), cut = /^(.*\d)([.,]\d{2})$/.exec(s);
  const big = cut ? `${esc(cut[1])}<small class="cents">${cut[2]}</small>` : esc(s);
  const now = ymOf(S.today), pm = m ? addMonths(m, -1) : '', hasPrev = !!m && pm >= minMonth(), going = m === now, today = +S.today.slice(8);
  const cumOf = (list, ym, upto) => { const n = daysInMonth(ym), per = Array(n + 2).fill(0); list.forEach(x => { per[Math.min(n, +x.date.slice(8))] += bqTxVal(x, kind); }); const out = []; let a = 0; for (let d = 1; d <= upto; d++) { a += per[d]; out.push(a); } return out; };
  let chip = '', chart = '';
  const prevRows = hasPrev ? rowsOf(pm) : [], prev = hasPrev ? cumOf(prevRows, pm, daysInMonth(pm)) : null;
  if (hasPrev) {
    const base = going ? prev[Math.min(today, prev.length) - 1] || 0 : prev[prev.length - 1] || 0, diff = total - base;
    const when = going ? t('by this day of {month}', { month: mcMonth(pm) }) : t('in {month}', { month: mcMonth(pm) });
    chip = `<span class="bq-cmp num">${diff === 0 ? t('The same as {when}', { when }) : t(diff > 0 ? '{amount} more than {when}' : '{amount} less than {when}', { amount: fmt.money(Math.abs(diff), cur), when })}</span>`;
  }
  if (m && (rows.length || prevRows.length)) {
    const n = daysInMonth(m), last = going ? Math.max(today, ...rows.map(x => +x.date.slice(8))) : n;
    chart = bqTxChart({ ym: m, pm, kind, money: cur, cur: cumOf(rows, m, Math.min(n, last)), prev: hasPrev && prevRows.length ? prev : null, card: !!opt.card }, opt.W);
  } else bqChartNow = null;
  return { label, big, chip, chart, neg: kind === 'all' && total < 0 };
}
/** The figure of what is listed, how it compares with the month before, the month's picker, and the chart. */
function bqTxSum() {
  const f = UI.tx, m = bqTxMonth(), kind = bqTxKind(), cur = txCurOf(f), p = bqSumParts(f, m, kind, cur);
  const pager = m ? `<div class="bq-mon" role="group" aria-label="${t('Month')}"><button data-a="bq-tx-month" data-d="-1" aria-label="${t('Previous month')}" ${m <= minMonth() ? 'disabled' : ''}>${icon('left')}</button><span>${fmt.month(m, true)}</span><button data-a="bq-tx-month" data-d="1" aria-label="${t('Next month')}" ${m >= ymOf(S.today) ? 'disabled' : ''}>${icon('right')}</button></div>` : '';
  return `<div class="bq-sum"><div class="bq-sum-l"><span class="bq-sum-k">${esc(p.label)}</span><b class="bq-sum-v num${p.neg ? ' neg' : ''}">${p.big}</b>${p.chip}</div>${pager}</div>${p.chart}`;
}

/** A tidy step for the chart's lines: 1, 2, 2.5 or 5 times a power of ten (in cents). */
function bqStep(x) { if (!(x > 0)) return 10000; const p = Math.pow(10, Math.floor(Math.log10(x))), k = x / p; return (k <= 1 ? 1 : k <= 2 ? 2 : k <= 2.5 ? 2.5 : k <= 5 ? 5 : 10) * p; }
/** The month added up day by day (lime, filled) against the month before (dashed), one scale, the lines the chart reaches; a mark on a day with its
    figure in a lime pill at the top, the latest day at first. The list under it is its table. */
function bqTxChart(c, Wopt) {
  const W = Wopt || Math.max(280, Math.round((document.querySelector('.work') || {}).clientWidth || innerWidth)), H = 204, L = 16, R = 16, T = 48, B = 176, n = daysInMonth(c.ym);
  const prev = c.prev ? Array.from({ length: n }, (_, i) => c.prev[Math.min(i, c.prev.length - 1)]) : null;      // by day of the month; a shorter month before stays level to the end
  if (c.prev && c.prev.length > n) prev[n - 1] = c.prev[c.prev.length - 1];      // a longer one ends on its own total
  const all = [...c.cur, ...(prev || [])];
  let lo = Math.min(0, ...all), hi = Math.max(0, ...all); if (hi === lo) hi = lo + 10000;
  const step = bqStep((hi - lo) / 2); hi = Math.ceil(hi / step) * step; lo = Math.floor(lo / step) * step; if (hi === lo) hi = lo + step;
  const x = d => +(L + (d - 1) * (W - L - R) / (n - 1)).toFixed(1), y = v => +(B - (v - lo) * (B - T) / (hi - lo)).toFixed(1);
  const line = list => list.map((v, i) => `${i ? 'L' : 'M'}${x(i + 1)} ${y(v)}`).join(' ');
  let grid = '';
  for (let v = lo; v <= hi + 1; v += step) grid += `<path d="M${L} ${y(v)} H${W - R}" class="${v === 0 ? 'g0' : 'g'}"/>${v !== 0 ? `<text x="${W - R}" y="${y(v) - 6}" text-anchor="end" class="ax">${esc((v < 0 ? '−' : '') + fmt.axis(Math.abs(v)))}</text>` : ''}`;
  const ticks = [1, 10, 20, n].map(d => `<text x="${x(d)}" y="${H - 8}" text-anchor="${d === 1 ? 'start' : d === n ? 'end' : 'middle'}" class="ax">${d}</text>`).join('');
  const k = c.cur.length, area = k ? `${line(c.cur)} L${x(k)} ${y(0)} L${x(1)} ${y(0)} Z` : '';
  bqChartNow = { ...c, W, H, L, R, T, B, n, x, y };
  const mk = bqMarkParts(k, null), name = mcMonthCap(c.ym), before = c.prev ? mcMonthCap(c.pm) : '';
  const say = c.prev ? t('{month} added up day by day, against {before}. Use the arrows to move along the days.', { month: name, before }) : t('{month} added up day by day. Use the arrows to move along the days.', { month: name });
  return `<figure class="bq-chart${c.card ? ' on-card' : ''}"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" tabindex="0" role="img" aria-label="${esc(say)}" aria-describedby="bq-mk-say">${grid}
      ${k ? `<path d="${area}" class="area"/>` : ''}${prev ? `<path d="${line(prev)}" class="before"/>` : ''}${k ? `<path d="${line(c.cur)}" class="now"/>` : ''}${ticks}
      ${k ? `<g class="bq-mk"><path d="M${mk.px} 28 V${B}"/><circle cx="${mk.px}" cy="${mk.py}" r="6.5"/><rect x="${mk.rx}" y="0" width="${mk.w}" height="28" rx="14"/><text x="${mk.rx + mk.w / 2}" y="18.5" text-anchor="middle">${esc(mk.txt)}</text></g>` : ''}</svg>
    <figcaption><span class="lg now">${name}</span>${c.prev ? `<span class="lg before">${before}</span>` : ''}<span class="lg-r">${t('Added up by day')}</span></figcaption><span class="sr" id="bq-mk-say" aria-live="polite">${k ? esc(mk.txt) : ''}</span></figure>`;
}
/** Where the mark of a day goes, and what its pill says ("5 sep · R$ 2.660"); its width measured when the pill is on screen, else reckoned. */
function bqMarkParts(day, measure) {
  const c = bqChartNow, d = Math.max(1, Math.min(c.cur.length, day)), v = c.cur[d - 1], m = mon(+c.ym.slice(5) - 1), txt = `${d} ${S.settings.lang === 'en' ? m : m.toLowerCase()} · ${fmt.money(v, c.money, { round: true })}`;      // "5 sep", as written in a sentence
  const w = Math.round((measure ? measure(txt) : txt.length * 7.3) + 26), px = c.x(d), rx = Math.round(Math.max(c.L - 4, Math.min(c.W - c.R + 4 - w, px - w / 2)));
  return { d, px, py: c.y(v), w, rx, txt };
}
/** The mark moved to a day, without drawing the page again. */
function bqMarkAt(day) {
  const svg = document.querySelector('.bq-chart svg'), g = svg && svg.querySelector('.bq-mk'); if (!bqChartNow || !g) return;
  const tx = g.querySelector('text'), mk = bqMarkParts(day, s => { tx.textContent = s; return tx.getComputedTextLength ? tx.getComputedTextLength() : s.length * 7.3; });
  bqChartNow.day = mk.d;
  g.querySelector('path').setAttribute('d', `M${mk.px} 28 V${bqChartNow.B}`);
  const ci = g.querySelector('circle'); ci.setAttribute('cx', mk.px); ci.setAttribute('cy', mk.py);
  const r = g.querySelector('rect'); r.setAttribute('x', mk.rx); r.setAttribute('width', mk.w); tx.setAttribute('x', mk.rx + mk.w / 2);
  const say = $('bq-mk-say'); if (say && say.textContent !== mk.txt) say.textContent = mk.txt;
}
/** The day under a finger or a pointer. */
function bqChartDay(e, svg) { const c = bqChartNow, r = svg.getBoundingClientRect(); if (!c || !r.width) return 0; const px = (e.clientX - r.left) * c.W / r.width; return Math.round((px - c.L) * (c.n - 1) / (c.W - c.L - c.R)) + 1; }
const bqChartAt = e => e.target && e.target.closest ? e.target.closest('.bq-chart svg') : null;
document.addEventListener('pointerdown', e => { const s = bqChartAt(e); if (s) bqMarkAt(bqChartDay(e, s)); }, { passive: true });
document.addEventListener('pointermove', e => { const s = bqChartAt(e); if (s && (e.pointerType === 'mouse' || e.buttons)) bqMarkAt(bqChartDay(e, s)); }, { passive: true });
document.addEventListener('keydown', e => {
  const s = bqChartAt(e); if (!s || !bqChartNow) return;
  const d = bqChartNow.day || bqChartNow.cur.length, to = { ArrowLeft: d - 1, ArrowRight: d + 1, Home: 1, End: bqChartNow.cur.length }[e.key];
  if (to === undefined) return; e.preventDefault(); bqMarkAt(to);
});
// a phone turned on its side: the chart drawn again for its new width
addEventListener('resize', () => { const s = $('bq-txsum'); if (s && bqChartNow && bqTxOn() && Math.abs(((document.querySelector('.work') || {}).clientWidth || innerWidth) - bqChartNow.W) > 24) s.innerHTML = bqTxSum(); });

// ---------- the list: by day, in one white card ----------
function bqTxList() {
  const f = UI.tx, m = bqTxMonth(), kind = bqTxKind();
  const rows = filteredTx().slice().sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);      // the newest first, always: the days are the list's order
  const applied = bqApplied(), chips = applied.length ? `<div class="fchips" role="group" aria-label="${t('Filters applied')}">${applied.map(([k, l]) => `<button class="fchip" data-a="tx-drop" data-k="${k}" aria-label="${t('Remove filter: {label}', { label: esc(l) })}"><span>${esc(l)}</span>${icon('x')}</button>`).join('')}</div>` : '';
  const yr = S.today.slice(0, 4), title = m ? mcMonthCap(m) + (m.slice(0, 4) !== yr ? ' ' + m.slice(0, 4) : '') : t('All months');
  const count = kind === 'expense' ? tn(rows.length, '{n} expense', '{n} expenses') : kind === 'income' ? tn(rows.length, '{n} income', '{n} incomes') : tn(rows.length, '{n} transaction', '{n} transactions');
  const head = `<div class="bq-txh"><span class="bq-t"><h2 id="bq-tx-h">${esc(title)}</h2><span class="bq-sub">${count}</span></span><button class="bq-add" data-a="quick-go" data-v="${kind === 'income' ? 'income' : kind === 'transfer' ? 'transfer' : 'expense'}">${icon('plus')}<span>${t('Add')}</span></button></div>`;
  const filtered = applied.length > 0 || !!f.q.trim();
  if (!rows.length) return `${head}${chips}<div class="bq-txcard bq-txnone"><b>${filtered ? t('No transactions match these filters') : t('No transactions in {month}', { month: m ? fmt.month(m) : t('All months') })}</b><span>${filtered ? t('Try a different month or clear the filters.') : t('Nothing is recorded for this month in your household accounts.')}</span>${filtered ? `<button class="btn sm" data-a="clear-filters">${t('Clear filters')}</button>` : m ? `<button class="btn sm" data-a="tx-all-months">${t('Show all months')}</button>` : ''}</div>`;
  const size = Math.max(BQ_TX_STEP, f.bqN || 0), shown = rows.slice(0, size);
  const more = rows.length - shown.length;
  return `${head}${chips}<div class="bq-txcard">${bqOpDays(shown, m)}</div>
    ${more > 0 ? `<button class="btn bq-txmore" data-a="bq-tx-more">${t('Show {n} more', { n: Math.min(BQ_TX_STEP, more) })}</button>` : ''}`;
}

// ---------- a transaction as a row, by day (Transactions and the summary's latest) ----------
/** A day's name over its rows: Today, Yesterday, or the weekday and the day ("viernes 25"), with the month when it is not the one listed (m) and
    the year when it is not this one. */
function bqDayName(d, m) {
  const yday = addDays(S.today, -1), yr = S.today.slice(0, 4), wd = () => { try { return new Date(d + 'T12:00:00Z').toLocaleDateString(BQ_LOCALE[S.settings.lang] || 'en-US', { weekday: 'long', timeZone: 'UTC' }); } catch (e) { return ''; } };
  return d === S.today ? t('Today') : d === yday ? t('Yesterday') : [wd(), +d.slice(8), !m || d.slice(0, 7) !== m ? mon(+d.slice(5, 7) - 1) : '', d.slice(0, 4) !== yr ? d.slice(0, 4) : ''].filter(Boolean).join(' ');
}
/** A transaction: the category's icon with the bank's logo on it, what it was, its category and account, the amount (money in green); a tap opens it. */
function bqOpRow(x, m) {
  const c = catOf(x.categoryId), a = acct(x.accountId);
  const mark = x.type === 'transfer' ? icon('swap') : c && c.cat ? catIconSvg(catIconKey(c.cat, (catOf(x.subcategoryId) || {}).sub)) : x.amount > 0 ? icon('coins') : `<span class="bq-op-l">${esc((x.merchant || '?').trim().charAt(0).toLocaleUpperCase() || '?')}</span>`;
  const sub = [x.type === 'transfer' ? t('Transfer') : catName(x.subcategoryId || x.categoryId), a ? a.name : '', x.status === 'pending' ? t('Pending') : x.status === 'ignored' ? t('Ignored') : ''].filter(Boolean).join(' · ');
  const amt = fmt.money(x.amount, x.currency, { sign: true }), bank = a && BANK_MARKS[a.institution] ? `<span class="bq-op-bank">${bankMark(a.institution, true)}</span>` : '';
  return `<li><button class="bq-op${x.status === 'ignored' ? ' ignored' : ''}${flashed(x.id)}" data-a="open-tx" data-id="${x.id}" aria-label="${esc(`${x.merchant}, ${sub}, ${amt}, ${bqDayName(x.date, m)}`)}"><span class="bq-op-ico" aria-hidden="true">${mark}${bank}</span><span class="bq-op-t" aria-hidden="true"><b>${esc(x.merchant)}</b><small>${esc(sub)}</small></span><b class="num bq-op-amt${x.type === 'income' ? ' in' : x.type === 'transfer' ? ' tr' : ''}" aria-hidden="true">${amt}</b></button></li>`;
}
/** Rows by day, each day under its name, in one list. */
const bqOpDays = (rows, m) => [...new Set(rows.map(x => x.date))].map(d => `<h3 class="bq-day">${esc(bqDayName(d, m))}</h3><ul class="bq-ops">${rows.filter(x => x.date === d).map(x => bqOpRow(x, m)).join('')}</ul>`).join('');

// ---------- on the summary: the month's spending as on Transactions, and the latest transactions under it ----------
// (owner, 2026-10-12: "agrega el gráfico de transacciones con las más recientes debajo en Resumen"): what was spent in the month in view, how it
// compares with the month before, the month added up day by day against the month before (as Transactions draws it, in a white card), and the five
// latest transactions of the household by day; "View all" opens Transactions on the expenses.
const BQ_HOME_OPS = 5;
function bqHomeMoves() {
  const m = S.month, f = { q: '', month: m, account: '', category: '', type: 'expense', status: '' };
  const W = Math.max(260, Math.round(((document.querySelector('.work') || {}).clientWidth || innerWidth) - 32));
  const p = bqSumParts(f, m, 'expense', CUR, { card: true, W });
  const latest = S.transactions.filter(x => !isBiz(x.accountId) && acct(x.accountId) && x.date <= S.today && x.status !== 'ignored').sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0).slice(0, BQ_HOME_OPS);
  const head = bqHead(t('Transactions'), `<a class="bq-more" href="#transactions" data-a="bq-home-all">${t('View all')}${icon('right')}</a>`);
  return `<section class="bq-sec" id="bq-moves-card">${head}<div class="bq-mv">
    <div class="bq-mv-sum"><span class="bq-sum-k">${esc(p.label)}</span><b class="bq-sum-v num">${p.big}</b>${p.chip}</div>${p.chart}
    ${latest.length ? `<div class="bq-mv-ops"><h3 class="bq-mv-h">${t('Latest')}</h3>${bqOpDays(latest, m)}</div>` : `<p class="bq-mv-none">${t('No transactions yet.')}</p>`}</div></section>`;
}

const BOSQUE_MOVES_ACTIONS = {
  /** The summary's "View all": Transactions on this month's expenses, as the part showed them. */
  'bq-home-all'() { Object.assign(UI.tx, TX_DEFAULT, { type: 'expense', page: 1, bqN: 0, bqSeen: true }); navigate('transactions'); },
  /** Expenses, Income or All: the list, the figure and the chart follow; the finger stays on the switch. */
  'bq-tx-kind'(ds) { Object.assign(UI.tx, { type: ds.v || '', page: 1, bqN: 0 }); render(); const el = document.querySelector(`.bq-kind [data-v="${ds.v || ''}"]`); if (el) el.focus({ preventScroll: true }); },
  /** The month before or after the one listed (the app's month, as on the summary); the focus stays on the arrow, or the other one at an end. */
  'bq-tx-month'(ds) {
    const f = UI.tx, to = addMonths(bqTxMonth() || S.month, +ds.d); if (to < minMonth() || to > ymOf(S.today)) return;
    Object.assign(f, { month: 'current', page: 1, bqN: 0 }); monthGo(to);
    const el = document.querySelector(`.bq-mon [data-d="${ds.d}"]`), other = document.querySelector(`.bq-mon [data-d="${-ds.d}"]`);
    (el && !el.disabled ? el : other || document.body).focus({ preventScroll: true });
  },
  /** Search: the field opens in the block, ready to type; closed, what was typed is let go and the list is whole again. */
  'bq-tx-find'() {
    const f = UI.tx;
    if (f.bqFind || f.q) { Object.assign(f, { bqFind: false, q: '', page: 1 }); render(); const b = $('bq-find-btn'); if (b) b.focus({ preventScroll: true }); }
    else { f.bqFind = true; render(); const q = $('tx-q'); if (q) q.focus(); }
  },
  /** The next rows, the focus on the first of them. */
  'bq-tx-more'() {
    const f = UI.tx, had = Math.max(BQ_TX_STEP, f.bqN || 0); f.bqN = had + BQ_TX_STEP; $('tx-list').innerHTML = txList();
    const el = document.querySelectorAll('#tx-list .bq-op')[had]; if (el) el.focus({ preventScroll: false });
  },
};
