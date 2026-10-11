/* Dorax Finance — a purchase on the card in installments (Sprint 2; the calculations: core/installments.js). In a new expense on a card's credit,
   "Installments": at once, or 2x to 24x, said as it is chosen ("10x of R$ 100 · the last one in July 2027"); saved, one row on each coming invoice
   (features/transactions/transactions.actions.js: save-tx). Each row wears "2/10"; opened, it says which one it is of what purchase; deleted, it
   takes the ones after it with it. The card's details show what is still to come from installments, month by month ("committed in the coming months").
   Styles: css/components/installments.css. Texts: i18n/text/installments.js. */
/** How many installments a new expense is saved in: what was chosen, when it goes on a card's credit; else one. */
const instCount = x => { const a = acct(x.accountId), n = +x.inst || 1; return x.type === 'expense' && !x.refund && !x.splits && a && a.type === 'credit' && n > 1 ? Math.min(n, INST_MAX) : 1; };
/** A month in a sentence: "julio de 2027" (lower case in Spanish and Portuguese). */
const instMonth = ym => { const n = mon(+ym.slice(5) - 1, true); return t('{month} {year}@long', { month: S.settings.lang === 'en' ? n : n.toLowerCase(), year: ym.slice(0, 4) }); };
/** What the choice means, in one line. */
function instSay(x) {
  const n = instCount(x), total = Math.abs(typedAmount(x.amountText || '') || 0), a = acct(x.accountId);
  if (n <= 1 || !total || !a) return '';
  const parts = instSplit(total, n), dates = instDates(x.date || S.today, n);
  return t('{n}x of {amount} · the last one in {month}', { n, amount: `<b class="num">${fmt.money(parts[n - 1], a.currency)}</b>`, month: esc(instMonth(ymOf(dates[n - 1]))) });
}
/** The field, in a new expense on a card's credit. */
function txInstField(d) {
  const x = d.draft, a = acct(x.accountId);
  if (!d.isNew || x.type !== 'expense' || x.refund || x.splits || !a || a.type !== 'credit') return '';
  const opts = [[1, t('At once')], ...Array.from({ length: INST_MAX - 1 }, (_, i) => [i + 2, `${i + 2}x`])];
  return `<div class="field tx-inst"><label for="d-inst">${t('Installments')}</label><select id="d-inst" data-c="draft" data-k="inst" data-rerender="1">${options(opts, x.inst || 1)}</select></div>
    <p class="note tx-inst-say" id="tx-inst-say" aria-live="polite">${instSay(x)}</p>`;
}
/** "2/10", beside the row's name. */
const instTag = x => x && x.inst ? ` <span class="inst-tag" title="${esc(t('Installment {i} of {n}', { i: x.inst.i, n: x.inst.n }))}">${x.inst.i}/${x.inst.n}</span>` : '';
/** In an installment's form: which one it is, of what purchase, and when the last one is. */
function instNote(x) {
  if (!x || !x.inst) return '';
  const rows = instGroup(S, x.inst.g), last = rows[rows.length - 1];
  return `<p class="note full tx-note">${catIconSvg('card')}<span>${t('Installment {i} of {n} of a purchase of {total}.', { i: x.inst.i, n: x.inst.n, total: fmt.money(x.inst.total, x.currency) })}${last ? ' ' + t('The last one is in {month}.', { month: esc(instMonth(ymOf(last.date))) }) : ''}</span></p>`;
}
/** A card's details: what is still to come from installments, month by month. */
function instAheadCard(a) {
  if (!a || a.type !== 'credit') return '';
  const r = instAhead(S, a.id, S.today); if (!r.total) return '';
  const shown = r.months.slice(0, 6), more = r.months.length - shown.length;
  return `<section class="inst-ahead" aria-labelledby="inst-ahead-h"><div class="inst-ahead-h"><h3 id="inst-ahead-h">${t('Installments to come')}</h3><b class="num">${fmt.money(r.total, a.currency, { trim: true })}</b></div>
    <p class="note">${tn(r.purchases, '{n} purchase, on the next invoices:', '{n} purchases, on the next invoices:')}</p>
    <ol class="inst-months">${shown.map(m => `<li><span>${esc(mon(+m.ym.slice(5) - 1))}${m.ym.slice(0, 4) !== S.today.slice(0, 4) ? ` <small>${m.ym.slice(2, 4)}</small>` : ''}</span><b class="num">${fmt.money(m.amount, a.currency, { trim: true })}</b></li>`).join('')}${more > 0 ? `<li class="more"><span>+${more}</span><b>${t('more')}</b></li>` : ''}</ol></section>`;
}
