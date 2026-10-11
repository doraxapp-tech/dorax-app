/* Dorax Finance — Reports: the rings, and the colour of the bars (owner, 2026-10-09: "in Reports add colour to the bars of 'Largest expense lines' and
   'Where you spent the most', and add more data with pie charts too, that detail things for the most demanding users").

   A ring says what share of a whole each part is, at a glance; the figures are in its legend, beside it, so nothing is read from an angle alone.
   Three rings, each answering its own question: what the month's spending was made of (a category opens into its subcategories, each with its
   number of payments and its average), what it was paid with (debit, a card's credit, savings, cash, and under each the accounts), and where the
   money that came in came from. Six parts at most: past that, the smallest are folded into "Other", in grey.

   Colour follows the thing it stands for, as on the rest of the page: a category wears its own colour everywhere (the bars of "Largest expense
   lines" and "Where you spent the most" too). The app's seven series colours pass the colour-blind and normal-vision checks side by side in their
   own order (tokens.css), but not every pair does: around a ring, a part waits for the next place rather than sit beside a colour it is hard to tell
   from, and the parts are cut apart by a 2px gap of the card's own colour. Inside one category its subcategories wear shades of its colour, the
   largest the one that stands out most from the card; those shades (four at most, then grey) were checked as an ordered ramp on both themes. */

// pairs of the series colours that are hard to tell apart side by side (dataviz validator, every pair, dark and light surfaces); one colour beside
// itself counts too
const RING_CLASH = new Set(['s1|s6', 's1|s7', 's2|s4', 's2|s7', 's3|s5', 's4|s6', 's4|s7']);
const ringKey = col => (String(col).match(/--(s\d|col-muted|ink-3)/) || [])[1] || String(col);
const ringClash = (a, b) => { const x = ringKey(a.col), y = ringKey(b.col); return x === y || RING_CLASH.has([x, y].sort().join('|')); };
/** The order around a ring, clockwise from the top: the largest first; a part whose colour would sit beside one it clashes with takes the next place
    that suits it. "Other" closes the ring. Shades of one colour (a category opened) keep the plain order: their difference is their lightness. */
function ringOrder(parts, shades) {
  const rest = parts.filter(p => !p.other).sort((a, b) => b.v - a.v), tail = parts.filter(p => p.other);
  if (shades) return [...rest, ...tail];
  const out = [];
  while (rest.length) { const prev = out[out.length - 1]; let i = prev ? rest.findIndex(p => !ringClash(prev, p)) : 0; if (i < 0) i = 0; out.push(rest.splice(i, 1)[0]); }
  // the ring closes on itself: the last part sits beside the first
  const last = out[out.length - 1];
  if (!tail.length && out.length > 2 && ringClash(last, out[0])) { const at = out.slice(1, -1).findIndex((p, i) => !ringClash(out[i], last) && !ringClash(last, p)); if (at >= 0) { out.pop(); out.splice(at + 1, 0, last); } }
  return [...out, ...tail];
}
/** The shades of one colour, the largest part first: the one that stands out most from the card, then fainter (dark theme) or lighter (light theme). */
function ringShade(col, i) {
  const light = S.settings.theme === 'light';
  const steps = light ? [['#000000', 65], ['#000000', 82], [null, 100], ['#FFFFFF', 70]] : [['#FFFFFF', 50], ['#FFFFFF', 80], [null, 100], ['var(--surface)', 65]];
  const [to, p] = steps[Math.min(i, steps.length - 1)];
  return to ? `color-mix(in srgb, ${col} ${p}%, ${to})` : col;
}
/** At most six parts: the five largest and the rest folded into one grey "Other" (named by the caller). */
function ringFold(parts, otherName, max) {
  const xs = parts.filter(p => p.v > 0).sort((a, b) => b.v - a.v), n = max || 5;
  if (xs.length <= n + 1) return xs;
  const rest = xs.slice(n);
  return [...xs.slice(0, n), { key: '', name: otherName, v: sum(rest.map(p => p.v)), col: 'var(--col-muted)', other: true, n: sum(rest.map(p => p.n || 0)), names: rest.map(p => p.name) }];
}
/** The ring itself: each part an arc as long as its share, cut apart by a gap; the total in the middle. A part with an action opens it on a click
    (its row in the legend is the way in for a keyboard and a screen reader). One part alone is no ring: the legend says it. */
function ringSvg(parts, total, label, mid, midNote) {
  if (parts.length < 2 || total <= 0) return '';
  const R = 50, C = 2 * Math.PI * R, gap = 1.5;
  let at = 0;
  const arcs = parts.map(p => { const len = p.v / total * C, s = `<circle class="rg-seg" r="${R}" cx="60" cy="60" style="stroke:${p.col}" stroke-dasharray="${Math.max(0.3, len - gap).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-at).toFixed(2)}"${p.act ? ` ${p.act}` : ''} data-tip="${esc(p.tip)}"></circle>`; at += len; return s; }).join('');
  return `<div class="rg"><svg viewBox="0 0 120 120" role="img" aria-label="${esc(label + ': ' + parts.map(p => `${p.name} ${p.pctText}`).join(', '))}"><g transform="rotate(-90 60 60)">${arcs}</g></svg>
    <div class="rg-mid" aria-hidden="true"><b class="num">${mid}</b>${[].concat(midNote || []).map(x => `<small>${esc(x)}</small>`).join('')}</div></div>`;
}
/** One row of a ring's legend: its colour, its name and what it holds in detail, its amount and its share; a button when it opens something. */
function ringRow(p, CUR) {
  // the details run under the name across the row, so a long one does not squeeze the name into a column
  const inner = `<span class="dot" style="background:${p.col}"></span><span class="rg-name">${esc(p.name)}</span><span class="num">${fmt.money(p.v, CUR)}</span><span class="pct num">${p.pctText}</span>${p.more ? `<small class="rg-more">${p.more}</small>` : ''}`;
  return p.act ? `<button class="legend-row rg-row" ${p.act}>${inner}</button>` : `<div class="legend-row rg-row still">${inner}</div>`;
}
/** A card with a ring and its legend. */
function ringCard(id, title, tipText, sub, parts, total, CUR, mid, midNote) {
  parts.forEach(p => { p.pctText = fmt.pct(Math.round(p.v * 1000 / total) / 10); p.tip = `${p.name}: ${fmt.money(p.v, CUR)} (${p.pctText})`; });
  return `<section class="card rg-card" id="${id}"><div class="card-h"><h2>${title}</h2>${info(tipText)}${sub}</div>
    <div class="card-b"><div class="rg-wrap${parts.length < 2 ? ' solo' : ''}">${ringSvg(parts, total, title, mid, midNote)}<div class="legend rg-legend">${parts.map(p => ringRow(p, CUR)).join('')}</div></div></div></section>`;
}
/** The month's expenses of this side and currency, each with its allocations (a split transaction counts in each of its categories). */
const repExpenses = (bk, ym, CUR) => bk.transactions.filter(x => x.type === 'expense' && inScope(bk, x, ym, CUR));
const payWord = (n, avg, CUR) => `${tn(n, '{n} payment', '{n} payments')}${n > 1 ? ' · ' + t('average {amount}', { amount: fmt.money(avg, CUR, { round: true }) }) : ''}`;

// ---------- 1. what the spending was made of: categories, and a category opened into its subcategories ----------
function repRingCats(bk, CUR, ym, co) {
  const known = id => bk.categories.find(c => c.id === id), cat = {}, line = {};
  for (const x of repExpenses(bk, ym, CUR)) for (const a of allocations(x)) {
    const c = known(a.categoryId) ? a.categoryId : 'none', k = c === 'none' ? 'none' : a.subcategoryId || c;
    (cat[c] = cat[c] || { v: 0, n: 0 }).v -= a.amount; cat[c].n++;
    if (c !== 'none') { (line[k] = line[k] || { v: 0, n: 0, cat: c }).v -= a.amount; line[k].n++; }
  }
  const total = sum(Object.values(cat).map(o => o.v)); if (total <= 0) return '';
  const title = co ? t('Costs by group, in detail') : t('Spending by category, in detail'), month = fmt.month(ym, 'bare');
  const open = UI.repDrill && cat[UI.repDrill] && cat[UI.repDrill].v > 0 && UI.repDrill !== 'none' ? known(UI.repDrill) : null;
  if (open) {
    // a category opened: its subcategories in shades of its colour; a row opens that subcategory's transactions of the month
    const base = catColor(open.id), ct = cat[open.id];
    const subs = Object.entries(line).filter(([, o]) => o.cat === open.id).map(([k, o]) => ({ key: k, name: k === open.id ? t('No subcategory') : ((open.subs || []).find(s => s.id === k) || {}).name || t('No subcategory'), v: o.v, n: o.n }));
    const parts = ringOrder(ringFold(subs, t('Other subcategories'), 3), true).map((p, i) => ({ ...p, col: p.other ? 'var(--col-muted)' : ringShade(base, i), more: payWord(p.n, p.v / Math.max(1, p.n), CUR) + (p.names ? ' · ' + esc(p.names.join(', ')) : ''), act: p.other ? '' : `data-a="filter-cat" data-cat="${esc(p.key)}"` }));
    const back = `<button class="btn sm ghost right rg-back" data-a="rep-drill" data-cat="">${icon('left')}${co ? t('All groups') : t('All categories')}</button>`;
    return ringCard('rep-ring-cat', title, t('The month’s spending by category, as a ring. Press a category to open it into its subcategories, each with its number of payments and its average; press a subcategory to see its transactions.'),
      back, parts, ct.v, CUR, fmt.money(ct.v, CUR, { round: true }), [open.name, t('{pct} of the month', { pct: fmt.pct(Math.round(ct.v * 1000 / total) / 10) })]);
  }
  const parts = ringOrder(ringFold(Object.entries(cat).map(([k, o]) => ({ key: k, name: k === 'none' ? (co ? t('Not filed yet') : t('Uncategorized')) : known(k).name, v: o.v, n: o.n, col: k === 'none' ? 'var(--col-muted)' : catColor(k) })), co ? t('Other groups') : t('Other categories')))
    .map(p => ({ ...p, more: payWord(p.n, p.v / Math.max(1, p.n), CUR) + (p.names ? ' · ' + esc(p.names.join(', ')) : ''), act: p.other ? '' : p.key === 'none' ? `data-a="filter-cat" data-cat="none"` : `data-a="rep-drill" data-cat="${esc(p.key)}"` }));
  return ringCard('rep-ring-cat', title, t('The month’s spending by category, as a ring. Press a category to open it into its subcategories, each with its number of payments and its average; press a subcategory to see its transactions.'),
    `<span class="sub">${esc(fmt.month(ym))}</span>`, parts, total, CUR, fmt.money(total, CUR, { round: true }), t('spent in {month}', { month }));
}

// ---------- 2. what it was paid with: debit, a card's credit, savings, cash; under each, the accounts ----------
// four fixed colours, in an order whose neighbours (the ring closing too) pass side by side: debit, credit, savings, cash
const PAY_KINDS = () => [['debit', t('Debit'), 'var(--s3)'], ['credit', t('Credit'), 'var(--s4)'], ['savings', t('Savings'), 'var(--s1)'], ['cash', t('Cash'), 'var(--s2)']];
const payKind = a => !a ? 'debit' : a.type === 'credit' ? 'credit' : a.type === 'savings' ? 'savings' : a.type === 'cash' ? 'cash' : 'debit';
function repRingPay(bk, CUR, ym, co) {
  const by = {};
  for (const x of repExpenses(bk, ym, CUR)) {
    const a = acct(x.accountId), k = payKind(a), o = by[k] || (by[k] = { v: 0, n: 0, accts: {} }), m = a ? cardMain(a) : null, ak = x.accountId || '';
    o.v -= x.amount; o.n++;
    const r = o.accts[ak] || (o.accts[ak] = { id: x.accountId, name: m ? m.name : t('Other'), v: 0, n: 0 }); r.v -= x.amount; r.n++;
  }
  const kinds = PAY_KINDS().filter(([k]) => by[k] && by[k].v > 0);
  if (kinds.length < 2) return '';      // all of it paid one way: a ring of one part says nothing a sentence would not
  const total = sum(kinds.map(([k]) => by[k].v));
  const parts = ringOrder(kinds.map(([k, name, col]) => ({ key: k, name: k === 'credit' ? t('Credit (invoice)') : name, v: by[k].v, n: by[k].n, col })));
  // under each way, its payments and the accounts it came from, each opening its transactions
  const accts = p => Object.values(by[p.key].accts).filter(r => r.v > 0).sort((a, b) => b.v - a.v);
  parts.forEach(p => { p.more = `${tn(p.n, '{n} payment', '{n} payments')}</small><small class="rg-more rg-accts">${accts(p).map(r => r.id ? `<button class="rg-acct" data-a="view-account" data-id="${esc(r.id)}">${esc(r.name)} <span class="num">${fmt.money(r.v, CUR, { round: true })}</span></button>` : `<span class="rg-acct">${esc(r.name)} <span class="num">${fmt.money(r.v, CUR, { round: true })}</span></span>`).join('<span class="rg-sep" aria-hidden="true"> · </span>')}`; });
  return ringCard('rep-ring-pay', co ? t('How the costs were paid') : t('How you paid'), t('What the month’s spending was paid with: debit from an account, a card’s credit (it goes on the invoice), savings or cash. Under each way, the accounts it came from; press one to see its transactions.'),
    `<span class="sub">${esc(fmt.month(ym))}</span>`, parts, total, CUR, by.credit ? fmt.pct(Math.round(by.credit.v * 1000 / total) / 10) : fmt.money(total, CUR, { round: true }), by.credit ? t('on credit') : t('spent in {month}', { month: fmt.month(ym, 'bare') }));
}

// ---------- 3. where the money that came in came from ----------
function repRingIncome(bk, CUR, ym, co) {
  const by = {};
  bk.transactions.filter(x => x.type === 'income' && inScope(bk, x, ym, CUR)).forEach(x => { const k = (x.subcategoryId && catName(x.subcategoryId)) || (x.categoryId && catName(x.categoryId)) || x.merchant || t('Other'); const o = by[k] || (by[k] = { v: 0, n: 0 }); o.v += x.amount; o.n++; });
  const xs = Object.entries(by).map(([k, o]) => ({ key: k, name: k, v: o.v, n: o.n })).filter(p => p.v > 0);
  const total = sum(xs.map(p => p.v)); if (total <= 0) return '';
  // income wears the reports' income colour (the trend's teal), in shades: the largest source the one that stands out most
  const parts = ringOrder(ringFold(xs, t('Other sources'), 3), true).map((p, i) => ({ ...p, col: p.other ? 'var(--col-muted)' : ringShade('var(--s1)', i), more: tn(p.n, '{n} payment', '{n} payments') + (p.names ? ' · ' + esc(p.names.join(', ')) : '') }));
  return ringCard('rep-in-from', co ? t('Where it came from') : t('Where your income came from'), t('What came in this month, by source: its category, or who paid it when it has none. Transfers between your own accounts are not counted.'),
    `<span class="sub">${esc(fmt.month(ym))}</span>`, parts, total, CUR, fmt.money(total, CUR, { round: true }), t('came in'));
}

// ---------- the colour of the bars ----------
/** A line of spending (a subcategory, or a category with none) wears its category's colour; what has no category, grey. */
function lineColor(bk, id) { const f = catOf(id), c = f && f.cat; return c && bk.categories.some(k => k.id === c.id) && !c.income ? catColor(c.id) : 'var(--col-muted)'; }
/** A merchant wears the colour of the category most of its spending of the month went to. */
function merchantCats(bk, ym, CUR) {
  const by = {};
  for (const x of repExpenses(bk, ym, CUR)) { const k = normalizeText(x.merchant) || '—', o = by[k] || (by[k] = {}); for (const a of allocations(x)) { const c = a.categoryId || 'none'; o[c] = (o[c] || 0) - a.amount; } }
  const out = {}; for (const [k, o] of Object.entries(by)) { const c = Object.keys(o).sort((p, q) => o[q] - o[p])[0]; out[k] = c && bk.categories.some(x => x.id === c) ? c : null; }
  return out;
}

const REPORT_ACTIONS = {
  /** A category of the ring opened into its subcategories, or back to every category. The keyboard stays on the ring's card. */
  'rep-drill'(ds) {
    UI.repDrill = ds.cat || null; render();
    const el = document.querySelector(ds.cat ? '#rep-ring-cat .rg-back' : `#rep-ring-cat .rg-row[data-cat]`); if (el) el.focus({ preventScroll: true });
  },
};
