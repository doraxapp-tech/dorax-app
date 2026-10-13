/* Dorax Finance — the computer's own pages in the summary's look: Accounts & savings, Plan, Goals, Investments and Reports (v203; owner, 2026-10-12:
   "cuentas y ahorros en ordenador está desperdiciando espacio con las tarjetas… muestra información más relevante para el usuario", then "crea
   artefactos de Plan, Metas, Inversiones, informes con el mismo estilo de cuenta y ahorros para decidir el look y hacerlos todo en un pase"; on the
   proposals: "deja todo y publica todo", "todo se ve bien me gusta").
   Each page has, on the forest under the top bar, the one figure that answers it (what is still to pay, what is set aside, what the FIIs are worth…),
   at its right what comes next (the next bill with its button, the savings payment to hand out…), and under both a band across the page (how the
   month's money is shared, when each goal arrives, what came in month by month…). The light sheet rises over it with the page's tools: white cards
   with a hairline and 24 px corners, as the phone's. A phone, the company's side and the previous look keep their pages.
   The pieces shared by the five pages are here; each page in its own folder (features/<page>/<page>.desk.js); clicks: desk.actions.js; styles:
   css/look/look-land-desk-pages.css. Money in the side's currency; every amount through fmt.money, so the eye hides them all. */
const dkOn = () => typeof landOn === 'function' && landOn() && !isPhone();
/** A word that starts with a capital as a name does, written as in a sentence: "Suscripciones" → "suscripciones"; an acronym ("IPTU") stays. */
const dkLower = s => { s = String(s || ''); return s.length > 1 && s[1] === s[1].toLowerCase() ? s[0].toLowerCase() + s.slice(1) : s; };
/** A chip on the forest: kind '' (white on glass), 'go' (lime), 'warn' (amber), 'neg' (coral); with k, it opens what that figure is made of. */
const dkChip = (text, kind, k) => k ? `<button class="dk-chip num${kind ? ' ' + kind : ''}" data-a="kpi-open" data-k="${k}" aria-haspopup="dialog" aria-label="${esc(String(text).replace(/<[^>]+>/g, '') + ': ' + t('what this figure is made of'))}">${text}</button>` : `<span class="dk-chip num${kind ? ' ' + kind : ''}">${text}</span>`;
/** A figure that opens the card of what it is made of (owner, 2026-10-11: "do this with all the KPIs: just click and understand everything"). */
const dkFig = (k, label, inner, cls, from) => k ? `<button class="dk-fig${cls ? ' ' + cls : ''}" data-a="kpi-open" data-k="${k}"${from ? ` data-from="${from}"` : ''} aria-haspopup="dialog" aria-label="${esc(String(label).replace(/<[^>]+>/g, '') + ': ' + t('what this figure is made of'))}">${inner}</button>` : inner;
/** A chip on the sheet: kind 'mint', 'warn', 'crit' or '' (grey). */
const dkPill = (text, kind) => `<span class="dk-pill${kind ? ' ' + kind : ''}">${text}</span>`;
/** The arrow of a link. */
const dkArrow = () => `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`;
/** A link in lime on the forest (or in ink on the sheet, with .ink): an address, or a click (data-a…). */
const dkLink = (attrs, text, ink) => /href=/.test(attrs) ? `<a class="dk-link${ink ? ' ink' : ''}" ${attrs}>${esc(text)}${dkArrow()}</a>` : `<button type="button" class="dk-link${ink ? ' ink' : ''}" ${attrs}>${esc(text)}${dkArrow()}</button>`;
/** The heading of the block at the right of the forest top: its title, and a chip or a link at its right. */
const dkSideHead = (id, title, right) => `<div class="dk-side-h"><h2 id="${id}">${esc(title)}</h2>${right || ''}</div>`;
/** A bar that fills: pct 0–100; cls: 'warn', 'crit', 'lime' (on the forest). */
const dkBar = (pct, cls) => `<span class="dk-bar${cls ? ' ' + cls : ''}" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, Math.round(pct * 10) / 10))}%"></i></span>`;
/** An account's round mark: its bank's logo, or a wallet. */
const dkMark = a => a && a.institution ? bankMark(a.institution) : `<span class="inst" aria-hidden="true">${icon('wallet')}</span>`;
/** In how many days, or how long ago: "today", "in 3 days", "3 days late". */
const dkDays = n => n === 0 ? t('today') : n > 0 ? tn(n, 'in {n} day', 'in {n} days') : tn(-n, '{n} day late', '{n} days late');
/** The page's top on the forest. o: { aria, label, big (formatted amount), neg, k and from (the figure's card of what it is made of), chips, under,
    side, sideId, band }. */
function dkHero(o) {
  const fig = dkFig(o.k, o.label, `<span class="dk-k">${esc(o.label)}</span><b class="dk-big num${o.neg ? ' neg' : ''}">${o.big}</b>`, 'dk-fig-big', o.from);
  return `<section class="dk-hero" aria-label="${esc(o.aria || o.label)}"><div class="dk-top"><div class="dk-main">${fig}${o.chips ? `<div class="dk-chips">${o.chips}</div>` : ''}${o.under || ''}</div>
      ${o.side ? `<section class="dk-side"${o.sideId ? ` aria-labelledby="${o.sideId}"` : ''}>${o.side}</section>` : ''}</div>${o.band || ''}</section>`;
}
/** The band across the forest: a heading (with something at its right) and what it holds. */
const dkBand = (id, title, right, body) => `<section class="dk-band" aria-labelledby="${id}"><div class="dk-band-h"><h2 id="${id}">${esc(title)}</h2>${right || ''}</div>${body}</section>`;
/** One bar cut in parts, and each part named under it with its amount: parts [{ label, v (cents), color ('ring' for an outline), sub, neg, show (the
    amount as it is written, when not v: what is owed, with its minus) }]. */
function dkSplit(parts, cur, aria) {
  const xs = parts.filter(p => p.v > 0), n = xs.length;
  const bar = `<div class="dk-split" role="img" aria-label="${esc(aria || parts.map(p => `${p.label} ${fmt.money(p.v, cur)}`).join(', '))}">${xs.map((p, i) => `<span class="${p.color === 'ring' ? 'ring' : ''}${i === 0 ? ' first' : ''}${i === n - 1 ? ' last' : ''}" style="flex:${p.v} 1 0;${p.color === 'ring' ? '' : `background:${p.color}`}"></span>`).join('')}</div>`;
  return `${bar}<ul class="dk-legend">${parts.map(p => `<li><span class="dk-legend-k"><i class="dk-dot${p.color === 'ring' ? ' ring' : ''}" style="${p.color === 'ring' ? '' : `background:${p.color}`}"></i>${esc(p.label)}</span><b class="num${p.neg ? ' neg' : ''}">${p.show || fmt.money(p.v, cur)}</b>${p.sub ? `<small>${p.sub}</small>` : ''}</li>`).join('')}</ul>`;
}
/** The sheet that rises over the forest, holding the page's sections. */
const dkSheet = inner => `<div class="dk-sheet">${inner}</div>`;
/** A section of the sheet: its title (with its (i), tip) and the line under it, a button at its right, then what it holds. */
const dkSec = (id, title, sub, right, body, tip) => `<section class="dk-sec" id="${id}" aria-labelledby="${id}-h"><div class="dk-sec-h"><div class="dk-sec-t"><div class="dk-h2"><h2 id="${id}-h">${esc(title)}</h2>${tip || ''}</div>${sub ? `<span class="dk-sub">${sub}</span>` : ''}</div>${right ? `<div class="dk-sec-r">${right}</div>` : ''}</div>${body}</section>`;
/** A white card on the sheet. */
const dkCard = (inner, cls, attrs) => `<div class="dk-card${cls ? ' ' + cls : ''}"${attrs ? ' ' + attrs : ''}>${inner}</div>`;
/** Cards across the sheet, as many to a row as fit (at least `min` px each). */
const dkGrid = (inner, min) => `<div class="dk-grid" style="--dk-min:${min || 300}px">${inner}</div>`;
/** A chart drawn to scale in an SVG of W×H user units, with its words (the axes' marks, a value's tag) laid over it in HTML, so they stay 12 px and
    up however narrow the card (inside the SVG they shrank with it, to 8 px in a card of three to a row). labels: [x, y, text, kind]: 'y' ends at x,
    centred on y (a value on the left axis); 'x' is centred under x, from y down (a day or a month); 'tag' ends at x, centred on y (the last value). */
const dkPlot = (W, H, aria, inner, labels) => `<div class="dk-plot"><svg class="dk-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">${inner}</svg>${labels.map(([x, y, text, kind]) => `<span class="dk-axl ${kind}${kind === 'tag' ? ' num' : ''}" style="left:${(x * 100 / W).toFixed(2)}%;top:${(y * 100 / H).toFixed(2)}%" aria-hidden="true">${esc(text)}</span>`).join('')}</div>`;
/** A short line at the foot of a page, for what makes a figure trustworthy. */
const dkFoot = text => `<p class="dk-foot">${text}</p>`;
/** Scrolls the sheet to one of the page's parts and gives it the focus (the forest's buttons that lead to the work: "Hand it out now"…). */
function dkGo(id) {
  const el = $(id); if (!el) return;
  el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  // the work, not the (i) of its heading
  const f = el.querySelector('input:not([disabled]), select:not([disabled])') || el.querySelector('button:not([disabled]):not(.hint)'); if (f) setTimeout(() => f.focus({ preventScroll: true }), reducedMotion() ? 0 : 420);
}
