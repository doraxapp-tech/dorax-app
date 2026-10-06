/* Dorax Finance — panel: add or edit a transaction. */
function txDrawer(d) {
  const x = d.draft, a = acct(x.accountId), biz = a.scope === 'business', splitSum = (x.splits || []).reduce((s, k) => s + (typedAmount(k.amountText) || 0), 0), total = Math.abs(typedAmount(x.amountText) || 0);
  return `<div class="body">
    ${d.error ? banner('crit', esc(d.error)) : ''}
    <div class="form-grid">
      ${fld('d-merchant', t('Merchant'), inp('d-merchant', 'merchant', x.merchant), 'full')}
      ${fld('d-date', t('Date'), `<input type="date" id="d-date" value="${esc(x.date)}" data-c="draft" data-k="date">`)}
      ${fld('d-amount', `${t('Amount')} (${a.currency})`, inp('d-amount', 'amountText', x.amountText, 'inputmode="decimal" class="num" data-rerender="1"'))}
      ${fld('d-type', t('Type'), `<select id="d-type" data-c="draft" data-k="type" data-rerender="1">${options(TYPES(), x.type)}</select>`)}
      ${x.type === 'transfer' || x.type === 'adjustment' ? fld('d-dir', t('Direction'), `<select id="d-dir" data-c="draft" data-k="dir">${options([['out', t('Money out')], ['in', t('Money in')]], x.dir)}</select>`) : fld('d-status', t('Status'), `<select id="d-status" data-c="draft" data-k="status">${options(STATUSES(), x.status)}</select>`)}
      ${fld('d-account', t('Account'), `<select id="d-account" data-c="draft" data-k="accountId" data-rerender="1">${acctOptions(x.accountId)}</select>`)}
      ${x.type === 'transfer' ? fld('d-xfer', t('Other account'), `<select id="d-xfer" data-c="draft" data-k="transferAccountId">${options([['', t('Not linked')], ...S.accounts.filter(k => k.id !== x.accountId).map(k => [k.id, k.name])], x.transferAccountId || '')}</select>`)
        : biz ? (companyCats().length ? fld('d-cat', t('Company cost or income'), `<select id="d-cat" data-c="draft" data-k="catKey">${catOptions(x.catKey, { blank: t('Not in the company plan'), list: companyCats() })}</select>`) : '')
        : x.splits ? '' : fld('d-cat', t('Category'), `<select id="d-cat" data-c="draft" data-k="catKey">${catOptions(x.catKey, { blank: t('Uncategorized') })}</select>`)}
    </div>
    ${biz ? banner('', t('Company account: this movement is kept for the company’s accounting and never counts in household figures.')) : x.type === 'transfer' ? banner('', t('Transfers between your own accounts are not counted as income or spending.')) : ''}
    ${x.type !== 'transfer' && !biz ? (x.splits ? `<div class="stack" style="gap:8px"><div class="row"><b style="font-weight:500">${t('Split across categories')}</b><button class="btn sm ghost spacer" data-a="split-off">${t('Remove split')}</button></div>
      ${x.splits.map((s, i) => `<div class="split-row"><label class="sr" for="sp-cat-${i}">${t('Category')} ${i + 1}</label><select id="sp-cat-${i}" data-c="split" data-i="${i}" data-k="catKey">${catOptions(s.catKey, { blank: t('Uncategorized') })}</select><label class="sr" for="sp-amt-${i}">${t('Amount')} ${i + 1}</label><input type="text" inputmode="decimal" class="num" id="sp-amt-${i}" value="${esc(s.amountText)}" data-c="split" data-i="${i}" data-k="amountText" data-rerender="1"><button class="iconbtn" data-a="split-remove" data-i="${i}" aria-label="${t('Remove')} ${i + 1}" ${x.splits.length <= 2 ? 'disabled style="opacity:.4"' : ''}>${icon('x')}</button></div>`).join('')}
      <div class="row"><button class="btn sm" data-a="split-add">${icon('plus')}${t('Add line')}</button><span class="note spacer">${splitSum === total ? t('Split matches the total.') : t('Split lines add up to {a}; the total is {b}.', { a: fmt.money(splitSum, a.currency), b: fmt.money(total, a.currency) })}</span></div></div>`
      : `<div><button class="btn sm" data-a="split-on">${t('Split across categories')}</button></div>`) : ''}
    ${biz ? '' : sw('d-recurring', x.recurring, 'draft', 'data-k="recurring"', t('Mark as recurring'))}
    ${fld('d-notes', t('Notes'), `<textarea id="d-notes" data-c="draft" data-k="notes">${esc(x.notes)}</textarea>`)}
    ${d.isNew ? '' : `<dl class="kv" style="border-top:1px solid var(--line);padding-top:12px"><dt>${t('Bank description')}</dt><dd class="mono">${esc(x.description)}</dd><dt>${t('Source')}</dt><dd>${esc(sourceLabel(x.source))}${x.confidence ? ` · ${t('reading confidence {n}%', { n: x.confidence })}` : ''}</dd>${x.sourceTxnId ? `<dt>${t('Bank ID')}</dt><dd class="mono">${esc(x.sourceTxnId)}</dd>` : ''}<dt>${t('Fingerprint')}</dt><dd class="mono">${esc(x.fingerprint)}</dd></dl>`}
  </div>
  <footer><button class="btn primary" data-a="save-tx">${t('Save')}</button>
    ${d.isNew ? '' : `<button class="btn" data-a="ignore-tx">${x.status === 'ignored' ? t('Restore') : t('Ignore')}</button><button class="btn ghost danger" data-a="ask-delete">${t('Delete')}</button>`}
    <button class="btn ghost spacer" data-a="close">${t('Cancel')}</button></footer>`;
}
