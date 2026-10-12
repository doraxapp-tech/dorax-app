/* Dorax Finance — a new transaction from the summary "Bosque", with its own keypad (owner, 2026-10-12: "haz estos dos updates que me habías enviado,
   quiero ver cómo se ven en vivo", the canvas's "Nuevo gasto · Bosque"). The form is the same one (features/transactions/transaction-form.view.js:
   txDrawer, which asks bosqueOn() and marks the drawer d.pad); here, its foot: the amount typed on a keypad of large keys (1 to 9, the decimal mark,
   0, erase), always in sight, and "Save" as a deep green bar with the lime check and the amount on its right. The amount's field takes no phone
   keyboard (inputmode none, read-only): the keypad writes into it. The sentence to write it in one go is not offered here; the other screens keep it.
   Styles: css/look/look-land-panels.css. */

/** The decimal mark of the person's figures: a comma in Brazil, a point otherwise (ui/format.js). */
const bqSep = () => S.settings.locale === 'pt-BR' ? ',' : '.';
/** The amount as it will be saved, for the bar: R$ 0,00 until something is typed. */
const bqTxAmt = d => { const x = d.draft, a = acct(x.accountId), v = Math.abs(typedAmount(x.amountText || '') || 0); return fmt.money(v, (a && a.currency) || CUR); };
function bqTxFoot(d) {
  const key = (v, label, aria) => `<button type="button" class="bq-key${v === 'del' || v === 'sep' ? ' soft' : ''}" data-a="tx-key" data-v="${v}"${aria ? ` aria-label="${esc(aria)}"` : ''}>${label}</button>`;
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => key(n, n)).join('') + key('sep', bqSep(), t('Decimal mark')) + key('0', '0')
    + key('del', `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"/><path d="m12 9 6 6"/><path d="m18 9-6 6"/></svg>`, t('Erase'));
  return `<footer class="bq-tx-foot"><div class="bq-pad" role="group" aria-label="${esc(t('Amount'))}" aria-controls="d-amount">${keys}</div>
    <button class="btn primary bq-save" data-a="save-tx"><span class="bq-save-ico" aria-hidden="true">${icon('check')}</span><span class="bq-save-t">${t('Save')}</span><span class="bq-save-amt num" id="bq-save-amt">${bqTxAmt(d)}</span></button></footer>`;
}
const BOSQUE_TX_ACTIONS = {
  /** One key of the keypad: a digit, the decimal mark (once, two digits after it at most) or erase. The field, the limit's line and the bar follow. */
  'tx-key'(ds) {
    const d = UI.drawer; if (!d || d.kind !== 'tx' || !d.draft) return;
    const x = d.draft, sep = bqSep(); let s = String(x.amountText || '');
    if (ds.v === 'del') s = s.slice(0, -1);
    else if (ds.v === 'sep') { if (!s.includes(sep)) s = (s || '0') + sep; }
    else { const [whole, cents] = s.split(sep); if (cents !== undefined && cents.length >= 2) return; if (cents === undefined && (whole || '').replace(/\D/g, '').length >= 9) return; s = (s === '0' ? '' : s) + ds.v; }
    x.amountText = s; d.error = null; txTouched('amountText');
    const el = $('d-amount'); if (el) el.value = s;
    const lim = $('tx-limit'); if (lim) lim.innerHTML = txLimitIn(d);
    const amt = $('bq-save-amt'); if (amt) amt.textContent = bqTxAmt(d);
  },
};
