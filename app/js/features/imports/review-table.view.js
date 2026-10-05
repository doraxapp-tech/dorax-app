/* Dorax Finance — the review table shared by the imports and the converter. */
// ---------- shared import review table ----------
const stateChip = s => ({ verified: `<span class="chip good"><i></i>${t('Verified')}</span>`, review: `<span class="chip warn"><i></i>${t('Needs review')}</span>`, uncertain: `<span class="chip crit"><i></i>${t('Uncertain')}</span>` }[s]);
const issueText = k => ({ norule: t('No rule matched, so it is uncategorized') }[k] || k || '');
function sessStats(sess) {
  const r = sess.rows, by = k => r.filter(x => x.state === k).length;
  return { total: r.length, verified: by('verified'), review: by('review'), uncertain: by('uncertain'), dups: r.filter(x => x.dup).length,
    accepted: r.filter(x => x.decision === 'accept').length, ignored: r.filter(x => x.decision === 'ignore').length, undecided: r.filter(x => !x.decision).length };
}
function reviewTable(sess, key) {
  const st = sessStats(sess), cur = acct(sess.accountId).currency, sel = sess.rows.filter(r => r.sel).length, k = `data-s="${key}"`, biz = isBiz(sess.accountId);
  return `<div class="toolbar">
      <button class="btn sm primary" data-a="rv-accept-verified" ${k}>${icon('check')}${t('Accept all verified ({n})', { n: sess.rows.filter(r => r.state === 'verified' && !r.decision).length })}</button>
      <button class="btn sm" data-a="rv-bulk" data-op="accept" ${k} ${sel ? '' : 'disabled'}>${t('Accept selected')}</button>
      <button class="btn sm" data-a="rv-bulk" data-op="ignore" ${k} ${sel ? '' : 'disabled'}>${t('Ignore selected')}</button>
      ${biz ? '' : `<button class="btn sm" data-a="rv-bulk" data-op="transfer" ${k} ${sel ? '' : 'disabled'}>${t('Mark as transfer')}</button>
      <label class="sr" for="rv-bulk-cat-${key}">${t('Apply category to selected')}</label><select id="rv-bulk-cat-${key}" data-c="rv-bulk-cat" ${k} ${sel ? '' : 'disabled'} style="max-width:210px">${catOptions('|', { blank: t('Apply category…') })}</select>
      <button class="btn sm ghost" data-a="rv-recat" ${k}>${t('Re-run categorization')}</button>`}
      <span class="note spacer">${sel ? t('{n} selected', { n: sel }) + ' · ' : ''}${t('{a} accepted · {b} ignored', { a: st.accepted, b: st.ignored })} · <b style="color:var(--ink)">${t('{n} to decide', { n: st.undecided })}</b></span></div>
    <div class="tbl-wrap"><table class="tbl review"><thead><tr><th><input type="checkbox" id="rv-all-${key}" aria-label="${t('Select all rows')}" data-c="rv-select-all" ${k} ${sel === sess.rows.length && sel ? 'checked' : ''}></th><th>${t('Date')}</th><th style="min-width:240px">${t('Description')}</th><th class="r">${t('Amount')} (${cur})</th><th>${t('Type')}</th>${biz ? '' : `<th style="min-width:190px">${t('Category')}</th>`}<th>${t('Reading')}</th><th style="min-width:150px">${t('Decision')}</th></tr></thead><tbody>
    ${paged('rv-' + key, sess.rows).rows.map(r => `<tr class="${r.dup ? 'dup' : ''} ${r.decision === 'ignore' ? 'off' : ''}">
      <td><input type="checkbox" id="rv-sel-${key}-${r.id}" aria-label="${t('Select row')}" data-c="rv-select" ${k} data-id="${r.id}" ${r.sel ? 'checked' : ''}></td>
      <td class="num" style="white-space:nowrap">${fmt.date(r.date, true)}</td>
      <td><input type="text" id="rv-desc-${key}-${r.id}" aria-label="${t('Description')}" value="${esc(r.description)}" data-c="rv-edit" data-f="description" ${k} data-id="${r.id}"><div class="note" style="margin-top:2px">${biz ? (r.sourceTxnId ? `<span class="mono">${esc(r.sourceTxnId)}</span>` : '') : esc(r.merchant)}${r.issue ? ` · ${esc(issueText(r.issue))}` : ''}</div></td>
      <td class="r"><input type="text" inputmode="decimal" class="amt-in" id="rv-amt-${key}-${r.id}" aria-label="${t('Amount')}" value="${esc(centsToDecimal(r.amount))}" data-c="rv-edit" data-f="amount" ${k} data-id="${r.id}"></td>
      <td><select id="rv-type-${key}-${r.id}" aria-label="${t('Type')}" data-c="rv-edit" data-f="type" ${k} data-id="${r.id}">${options(TYPES(), r.type)}</select></td>
      ${biz ? '' : `<td>${r.type === 'transfer' ? `<span class="muted">${t('Not counted as spending')}</span>` : `<select id="rv-cat-${key}-${r.id}" aria-label="${t('Category')}" data-c="rv-edit" data-f="category" ${k} data-id="${r.id}">${catOptions(catKey(r.categoryId, r.subcategoryId), { blank: t('Uncategorized') })}</select>`}</td>`}
      <td>${stateChip(r.state)}<div class="note num" style="margin-top:2px">${r.confidence}%${r.edited ? ' · ' + t('edited') : ''}</div>${r.dup ? `<div style="margin-top:4px" data-tip="${esc(fmt.date(r.dup.date, true))} · ${esc(r.dup.merchant)} · ${esc(fmt.money(r.dup.amount, cur))}"><span class="chip warn">${r.dup.certainty === 'exact' ? t('Already in ledger') : t('Possible duplicate')}</span></div>` : ''}</td>
      <td><div class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn sm ${r.decision === 'accept' ? 'primary' : ''}" data-a="rv-decide" data-op="accept" ${k} data-id="${r.id}" aria-pressed="${r.decision === 'accept'}">${t('Accept')}</button><button class="btn sm ${r.decision === 'ignore' ? 'primary' : ''}" data-a="rv-decide" data-op="ignore" ${k} data-id="${r.id}" aria-pressed="${r.decision === 'ignore'}">${t('Ignore')}</button></div>
        ${r.dup ? `<label class="note" style="display:flex;gap:5px;align-items:center;margin-top:4px"><input type="checkbox" id="rv-keep-${key}-${r.id}" data-c="rv-keep" ${k} data-id="${r.id}" ${r.keepBoth ? 'checked' : ''}>${t('Keep both in ledger')}</label>` : ''}</td></tr>`).join('')}
    </tbody></table></div>${paged('rv-' + key, sess.rows).html}`;
}
function importable(sess) { return sess.rows.filter(r => r.decision === 'accept' && (!r.dup || r.keepBoth)); }
