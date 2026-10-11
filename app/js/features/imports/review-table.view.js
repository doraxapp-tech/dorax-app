/* Dorax Finance — the review table shared by the imports and the converter. */
// 2026-10-09 (owner: "the imports table looks messy"): fixed columns in a calm order (date, what it is, type, category, amount, decision); one line for the
// description, edited in place, and under it only what adds something (the merchant when it differs, a move between accounts, a reading to check, a
// duplicate); no column of "Verified 99%" on every row; Accept | Ignore as one quiet switch, the green kept for Import.
// ---------- shared import review table ----------
const stateChip = s => ({ verified: `<span class="chip good"><i></i>${t('Verified')}</span>`, review: `<span class="chip warn"><i></i>${t('Needs review')}</span>`, uncertain: `<span class="chip crit"><i></i>${t('Uncertain')}</span>` }[s]);
const issueText = k => ({ norule: t('No rule matched, so it is uncategorized') }[k] || k || '');
/** A move between the person's own accounts, said under its description (features/imports/import-session.js: ownMove). */
const moveText = r => { const mv = r.type === 'transfer' && r.move; if (!mv) return ''; const o = mv.to && acct(mv.to), name = o ? acctName(o) : mv.make ? t('{name} (new)', { name: mv.make }) : '';
  if (mv.kind === 'pair') return t('Same amount in {name} on {date}: a move between your accounts', { name: name || '—', date: fmt.date(mv.date) });
  if (mv.kind === 'invest') return t('Money to or from your investments: not spending or income');
  return mv.kind === 'own' && !name ? t('Between your own accounts') : mv.kind === 'card' ? (name ? t('Pays the card: {name}', { name }) : t('Pays a card')) : mv.kind === 'paid' ? t('The card’s payment, from {name}', { name: name || '—' }) : t('Between this account and {name}', { name: name || t('the separate balance') }); };
function sessStats(sess) {
  const r = sess.rows, by = k => r.filter(x => x.state === k).length;
  return { total: r.length, verified: by('verified'), review: by('review'), uncertain: by('uncertain'), dups: r.filter(x => x.dup).length,
    accepted: r.filter(x => x.decision === 'accept').length, ignored: r.filter(x => x.decision === 'ignore').length, undecided: r.filter(x => !x.decision).length };
}
/** A row worth a second look before importing: a duplicate, a reading to check, money coming in, or something with no category. */
const rvNeeds = (r, biz) => !!r.dup || !!r.check || r.state !== 'verified' || r.type === 'income' || (!biz && r.type !== 'transfer' && !r.categoryId);
/** Why a row came filed as it did, said under its name: the person's past, their plan, a known merchant, a refund. */
const whyNote = r => r.refund && r.type === 'expense' ? (r.refundOf ? t('Refund of the purchase of {date}', { date: fmt.date(r.refundOf) }) : t('Refund: it takes off spending'))
  : r.type === 'transfer' ? (r.why === 'before' && !r.typeTouched ? t('Like last time') : '')
  : r.move && r.move.kind === 'pair' ? t('Same amount in {name} on {date}. A move between your accounts?', { name: acct(r.move.to) ? acctName(acct(r.move.to)) : '—', date: fmt.date(r.move.date) })
  : r.catTouched || !r.categoryId ? '' : r.why === 'ai' ? t('Suggested by AI') : r.why === 'before' ? (r.learned > 1 ? t('Like the last {n} times', { n: r.learned }) : t('Like last time')) : r.why === 'bill' ? t('Bill in your plan: {name}', { name: r.bill }) : r.why === 'known' ? t('Known merchant') : '';
/** Rows of the same merchant and kind: decided once (owner, 2026-10-09: "reduce the load of accepting and categorizing every expense"). */
const rvGroupKey = r => normalizeText(r.merchant) + '|' + r.type;
/** One change to one row of the review, typed in it or chosen for its group. */
function rvApply(s, r, f, v) {
  if (f === 'category') { const [c, sub] = String(v).split('|'); r.categoryId = c || null; r.subcategoryId = sub || null; r.catTouched = true; if (c) r.issue = ''; }
  // the type never turns the amount round (owner, 2026-10-09: "the most dangerous is the type"): the amount is what the bank says came in or went
  // out, so the account's balance stays the bank's; money that came in, made spending, is money given back (a refund)
  else if (f === 'type') { r.type = v; r.typeTouched = true; r.refund = v === 'expense' && r.amount > 0; if (r.why === 'refund' && !r.refund) r.why = null; }
  else if (f === 'description') { if (!r.descTouched) r.descWas = r.description; r.description = v; r.descTouched = true; }
  else if (f === 'merchant') { if (String(v).trim()) { r.merchant = String(v).trim(); r.mk = null; r.nameTouched = true; } }      // a name typed by the person is theirs, not a rule's
  r.edited = true; setDup(r, s.accountId);
}
/** Worth a look: decided when the review first shows the row and kept, so a row put right in "To look at" stays there instead of slipping away. */
const rvLook = (r, biz) => r.look === undefined ? (r.look = rvNeeds(r, biz)) : r.look;
/** The lines of the review as shown now: in "To look at", a merchant's rows of one kind on one line, in the order they first appear; in "All", one row a line. */
function rvUnits(sess) {
  const biz = isBiz(sess.accountId), todo = sess.rows.filter(r => rvLook(r, biz)), only = (sess.only || 'todo') === 'todo' && todo.length > 0;
  if (!only) return { todo, only, units: sess.rows.map(r => [r]) };
  const units = [], by = {}; todo.forEach(r => { const g = rvGroupKey(r); if (!by[g]) units.push(by[g] = []); by[g].push(r); });
  return { todo, only, units };
}
/** A group's rows: those of "To look at" with the merchant and kind. */
const rvGroupRows = (s, g) => s.rows.filter(r => r.look && rvGroupKey(r) === g);
/** The lines of a page: a row alone, or a merchant's rows under one line that decides for all of them, opened to see each one. */
function rvRows(units, sess, k, biz, cur, one) {
  sess.open = sess.open || {};
  return units.map(rs => {
    if (rs.length < 2) return one(rs[0], '');
    const r0 = rs[0], g = rvGroupKey(r0), open = !!sess.open[g], same = f => rs.every(r => r[f] === r0[f]), dec = rs.every(r => r.decision === r0.decision) ? r0.decision : null, ga = `data-g="${esc(g)}" ${k}`;
    return `<tr class="rv-grp${open ? ' open' : ''}${dec === 'ignore' ? ' off' : ''}"><td><button class="iconbtn rv-open" data-a="rv-group-open" ${ga} aria-expanded="${open}" aria-label="${esc(t('See each of the {n}', { n: rs.length }))}">${icon('right')}</button></td>
      <td class="rv-date"><span class="rv-count num">×${rs.length}</span></td>
      <td class="rv-desc"><input type="text" class="rv-in rv-gname" aria-label="${t('Merchant')}" value="${esc(r0.merchant || r0.description)}" data-c="rv-group" data-f="merchant" ${ga}><div class="rv-say"><span class="rv-t">${t('{n} rows, one choice', { n: rs.length })}</span></div></td>
      <td><select aria-label="${t('Type')}" data-c="rv-group" data-f="type" ${ga}>${options(TYPES(), same('type') ? r0.type : '')}</select></td>
      ${biz ? '' : `<td>${r0.type === 'transfer' ? `<span class="muted rv-nocat">${t('Not counted as spending')}</span>` : `<select aria-label="${t('Category')}" data-c="rv-group" data-f="category" ${ga}>${catOptions(same('categoryId') && same('subcategoryId') ? catKey(r0.categoryId, r0.subcategoryId) : '|', { blank: t('Uncategorized') })}</select>`}</td>`}
      <td class="r"><span class="num rv-gsum${sum(rs.map(r => r.amount)) > 0 ? ' pos' : ''}">${fmt.money(sum(rs.map(r => r.amount)), cur, { bare: true })}</span></td>
      <td><div class="seg rv-dec" role="group" aria-label="${t('Decision')}"><button data-a="rv-group-decide" data-op="accept" ${ga} aria-pressed="${dec === 'accept'}">${dec === 'accept' ? icon('check') : ''}${t('Accept')}</button><button data-a="rv-group-decide" data-op="ignore" ${ga} aria-pressed="${dec === 'ignore'}">${t('Ignore')}</button></div></td></tr>
      ${open ? rs.map(r => one(r, 'rv-member')).join('') : ''}`;
  }).join('');
}
/** The rows an AI may be asked about: household rows of money in or out still without a category, not chosen by hand. */
const aiRows = sess => isBiz(sess.accountId) ? [] : sess.rows.filter(r => !r.categoryId && !r.catTouched && (r.type === 'expense' || r.type === 'income'));
/** "Suggest with AI", only for someone who turned it on in Settings and only while some row is without a category (features/settings). */
function aiButton(sess, k) {
  const n = aiRows(sess).length; if (!S.settings.aiSuggest || (!n && !sess.aiBusy)) return '';
  return `<button class="btn sm" data-a="rv-ai" ${k} ${sess.aiBusy ? 'disabled aria-busy="true"' : ''}>${icon('spark')}${sess.aiBusy ? t('Asking the AI…') : t('Suggest with AI ({n})', { n })}</button>`;
}
/** What the import will do to the totals, by type (owner, 2026-10-09: "the most dangerous is the type"): a figure that makes no sense shows here before
    anything enters. Only what will be imported counts; refunds take off spending. */
function rvTypes(sess, cur) {
  const rs = importable(sess), of = k => rs.filter(r => r.type === k), inc = of('income'), exp = of('expense'), mov = of('transfer');
  const part = (label, v, n) => `<span>${label} <b class="num">${fmt.money(v, cur)}</b> <span class="muted">(${n})</span></span>`;
  return `<p class="rv-types" id="rv-types"><b>${t('If you import now')}</b>${part(t('as income'), sum(inc.map(r => r.amount)), inc.length)}${part(t('as spending'), -sum(exp.map(r => r.amount)), exp.length)}${part(t('between your accounts'), sum(mov.map(r => Math.abs(r.amount))), mov.length)}</p>`;
}
function reviewTable(sess, key) {
  const st = sessStats(sess), cur = acct(sess.accountId).currency, sel = sess.rows.filter(r => r.sel).length, k = `data-s="${key}"`, biz = isBiz(sess.accountId);
  // only what needs a look, when asked; the rows on the page shown are counted as seen (imports.actions.js asks about the others before importing)
  // review by exception: what the app is sure of is ready, and only the rest is shown first (owner, 2026-10-09); "All" shows every row
  const { todo, only, units } = rvUnits(sess), pg = paged('rv-' + key, units); pg.rows.forEach(rs => rs.forEach(r => { r.seen = true; }));      // a merchant's line counts its rows as seen
  const unseen = todo.filter(r => !r.seen).length, ready = sess.rows.length - todo.length;
  // 2026-10-09 (owner: "many options in sight here; the All / To look at toggle can hardly be seen, make the active one white"): one bar with what
  // to look at (the toggle, its active side white), where the review stands, suggesting with AI when it is on, and the rest under "More"; what
  // acts on chosen rows appears only once rows are chosen.
  const verified = sess.rows.filter(r => r.state === 'verified' && !r.decision).length;
  const more = [verified ? ['rv-accept-verified', t('Accept all verified ({n})', { n: verified })] : null, biz ? null : ['rv-recat', t('Re-run categorization')]].filter(Boolean);
  return `<div class="toolbar rv-bar">
      ${todo.length ? `<div class="seg rv-only" role="group" aria-label="${t('Show')}"><button data-a="rv-only" data-v="all" ${k} aria-pressed="${!only}">${t('All ({n})', { n: sess.rows.length })}</button><button data-a="rv-only" data-v="todo" ${k} aria-pressed="${only}">${t('To look at ({n})', { n: todo.length })}</button></div>` : ''}
      <span class="note spacer">${t('{a} accepted · {b} ignored', { a: st.accepted, b: st.ignored })} · <b style="color:var(--ink)">${t('{n} to decide', { n: st.undecided })}</b>${unseen ? ` · <span class="rv-unseen">${tn(unseen, '{n} not seen yet', '{n} not seen yet')}</span>` : ''}</span>
      ${biz ? '' : aiButton(sess, k)}
      ${more.length ? `<div class="rv-more-wrap"><button class="btn sm ghost" id="rv-more-btn" data-a="rv-more" aria-expanded="${!!UI.rvMore}" aria-controls="rv-more">${icon('more')}${t('More')}</button>
        ${UI.rvMore ? `<div class="umenu rv-menu" id="rv-more" role="group" aria-label="${t('More')}">${more.map(([a, l]) => `<button class="umenu-item" data-a="${a}" ${k}>${l}</button>`).join('')}</div>` : ''}</div>` : ''}</div>
    ${sel ? `<div class="toolbar rv-selbar" role="group" aria-label="${t('Chosen rows')}"><b>${t('{n} selected', { n: sel })}</b>
      <button class="btn sm" data-a="rv-bulk" data-op="accept" ${k}>${t('Accept')}</button><button class="btn sm" data-a="rv-bulk" data-op="ignore" ${k}>${t('Ignore')}</button>
      ${biz ? '' : `<button class="btn sm" data-a="rv-bulk" data-op="transfer" ${k}>${t('Mark as transfer')}</button><label class="sr" for="rv-bulk-cat-${key}">${t('Apply category to selected')}</label><select id="rv-bulk-cat-${key}" data-c="rv-bulk-cat" ${k} style="max-width:210px">${catOptions('|', { blank: t('Apply category…') })}</select>`}
      <button class="btn sm ghost spacer" data-a="rv-unselect" ${k}>${t('Clear selection')}</button></div>` : ''}
    ${todo.length ? `<p class="note rv-why">${tn(ready, '{a} ready: filed by your rules, by how you filed it before, by your plan’s bills or as a known merchant. To look at: duplicates, money coming in, refunds, rows with no category and readings to check.', '{a} ready: filed by your rules, by how you filed them before, by your plan’s bills or as known merchants. To look at: duplicates, money coming in, refunds, rows with no category and readings to check.', { a: ready })}</p>` : ''}
    ${rvTypes(sess, cur)}
    <div class="tbl-wrap"><table class="tbl review${biz ? ' biz' : ''}"><colgroup><col class="c-sel"><col class="c-date"><col class="c-desc"><col class="c-type">${biz ? '' : '<col class="c-cat">'}<col class="c-amt"><col class="c-dec"></colgroup>
    <thead><tr><th><input type="checkbox" id="rv-all-${key}" aria-label="${t('Select all rows')}" data-c="rv-select-all" ${k} ${sel === sess.rows.length && sel ? 'checked' : ''}></th><th>${t('Date')}</th><th>${t('Merchant')}</th><th>${t('Type')}</th>${biz ? '' : `<th>${t('Category')}</th>`}<th class="r">${t('Amount')} (${cur})</th><th>${t('Decision')}</th></tr></thead><tbody>
    ${rvRows(pg.rows, sess, k, biz, cur, (r, cls) => { // the name first, to read and to change; the bank's own words under it, last, where they can be cut short
      const say = [biz && r.sourceTxnId ? `<span class="mono">${esc(r.sourceTxnId)}</span>` : '', moveText(r) ? `<span class="rv-move">${esc(moveText(r))}</span>` : '', esc(whyNote(r)), r.issue && r.issue !== 'norule' ? esc(issueText(r.issue)) : '', normalizeText(r.merchant) !== normalizeText(r.description) ? esc(r.description) : ''].filter(Boolean).join(' · ');
      const flags = `${r.state !== 'verified' ? stateChip(r.state) + ` <span class="note num">${r.confidence}%</span>` : ''}${r.dup ? `<span class="chip warn" data-tip="${esc(fmt.date(r.dup.date, true))} · ${esc(r.dup.merchant)} · ${esc(fmt.money(r.dup.amount, cur))}">${r.dup.certainty === 'exact' ? t('Already in ledger') : t('Possible duplicate')}</span>` : ''}`;
      return `<tr class="${r.dup ? 'dup' : ''} ${r.decision === 'ignore' ? 'off' : ''} ${cls}">
      <td><input type="checkbox" id="rv-sel-${key}-${r.id}" aria-label="${t('Select row')}" data-c="rv-select" ${k} data-id="${r.id}" ${r.sel ? 'checked' : ''}></td>
      <td class="num rv-date">${fmt.date(r.date)}</td>
      <td class="rv-desc"><input type="text" class="rv-in" id="rv-desc-${key}-${r.id}" aria-label="${t('Merchant')}" value="${esc(r.merchant)}" data-c="rv-edit" data-f="merchant" ${k} data-id="${r.id}">${say || flags ? `<div class="rv-say">${flags}${say ? `<span class="rv-t" title="${say.replace(/<[^>]+>/g, '')}">${say}</span>` : ''}</div>` : ''}</td>
      <td><select id="rv-type-${key}-${r.id}" aria-label="${t('Type')}" data-c="rv-edit" data-f="type" ${k} data-id="${r.id}">${options(TYPES(), r.type)}</select></td>
      ${biz ? '' : `<td>${r.type === 'transfer' ? `<span class="muted rv-nocat">${t('Not counted as spending')}</span>` : `<select id="rv-cat-${key}-${r.id}" aria-label="${t('Category')}" data-c="rv-edit" data-f="category" ${k} data-id="${r.id}">${catOptions(catKey(r.categoryId, r.subcategoryId), { blank: t('Uncategorized') })}</select>`}</td>`}
      <td class="r"><input type="text" inputmode="decimal" class="rv-in amt-in ${r.amount > 0 ? 'pos' : ''}" id="rv-amt-${key}-${r.id}" aria-label="${t('Amount')}" value="${esc(fmt.money(r.amount, cur, { bare: true }))}" data-c="rv-edit" data-f="amount" ${k} data-id="${r.id}"></td>
      <td><div class="seg rv-dec" role="group" aria-label="${t('Decision')}"><button data-a="rv-decide" data-op="accept" ${k} data-id="${r.id}" aria-pressed="${r.decision === 'accept'}">${r.decision === 'accept' ? icon('check') : ''}${t('Accept')}</button><button data-a="rv-decide" data-op="ignore" ${k} data-id="${r.id}" aria-pressed="${r.decision === 'ignore'}">${t('Ignore')}</button></div>
        ${r.dup ? `<label class="note rv-keep"><input type="checkbox" id="rv-keep-${key}-${r.id}" data-c="rv-keep" ${k} data-id="${r.id}" ${r.keepBoth ? 'checked' : ''}>${t('Keep both in ledger')}</label>` : ''}</td></tr>`; })}
    </tbody></table></div>${pg.html}`;
}
function importable(sess) { return sess.rows.filter(r => r.decision === 'accept' && (!r.dup || r.keepBoth)); }
