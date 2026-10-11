/* Dorax Finance — Imports on a phone.
   Owner, 2026-10-10: "let phone users import from the phone, make sure it is as simple as possible, and make an onboarding for it". Until then a
   phone said "bringing files in is done on the computer" (features/phone/desk-only.js): the review was a wide table.
   So, on a phone, one path and no table:
     1. one button: "Choose the file". OFX or CSV, told apart by what is in the file; the account it goes into is chosen above it, the main one
        to start with. A CSV's columns are guessed; only when the guess cannot read the file are the three columns asked, one under the other.
     2. the review asks only about what needs a look (features/imports/review-table.view.js: rvLook): each one a card with its category and two
        buttons, Import or Skip. What Dorax is sure of is counted ("48 ready") and can be seen; what the account already has is left out.
     3. one button: "Import 52 transactions". Then what went in, the way to see it, and to bring another.
   The first time, a page explains where the file comes from (features/tours/tours.js, 'imports'). Everything the computer does with a file
   (duplicates, moves between accounts, what is learnt for next time, undo) is the same: only the screen is different. */
const ipBiz = imp => isBiz(imp.accountId);
/** What Dorax is sure of goes in by itself; a row to look at waits for the person; what the account already has is left out by itself. Run on every
    drawing: it never touches a row the person decided, nor a row to look at. Rows to look at are all on screen, so they count as seen. */
function ipPrep(imp) {
  const biz = ipBiz(imp);
  imp.rows.forEach(r => { const look = rvLook(r, biz); if (r.dup && !r.decision) r.decision = 'accept'; else if (!look && !r.decision) r.decision = 'accept'; if (look && !r.dup) r.seen = true; });
}
const ipLook = imp => imp.rows.filter(r => rvLook(r, ipBiz(imp)) && !r.dup);
const ipReady = imp => imp.rows.filter(r => !rvLook(r, ipBiz(imp)) && !r.dup);
function impPhone() {
  const imp = UI.imp && UI.imp.source !== 'bank' && (!acct(UI.imp.accountId) || isBiz(UI.imp.accountId) === (UI.space === 'business')) ? UI.imp : null;
  if (imp && imp.step === 'map') return ipMap(imp);
  if (imp && imp.step === 'review') return ipReview(imp);
  if (imp && imp.step === 'done') return ipDone(imp);
  return ipStart();
}
function ipStart() {
  const mine = impAccounts(), side = UI.space === 'business' ? 'business' : 'personal';
  const dest = mine.some(a => a.id === UI.impDest) ? UI.impDest : (mainOf(side, side === 'business' ? BCUR() : BASE_CURRENCY) || mainOf(side) || mine[0] || {}).id;
  const hist = S.imports.filter(impOnSide).slice(0, 5);
  return `<section class="ip-start" id="imp-start">
      <span class="ip-hero" aria-hidden="true">${icon('upload')}</span>
      <h2>${t('Bring your bank statement')}</h2>
      <p class="ip-lead">${t('Months of transactions at once, without typing them. Dorax sorts them; you only check what is unclear.')}</p>
      ${UI.impError ? errBanner(UI.impError) : ''}
      ${mine.length ? `<div class="mr-pick ip-dest"><span class="mr-ic">${icon('wallet')}</span><label for="imp-dest">${t('Into')}</label><span class="mr-val" aria-hidden="true">${esc(acctName(acct(dest)))}</span><span class="mr-chev" aria-hidden="true">${icon('right')}</span><select id="imp-dest" data-c="imp-dest">${acctOptions(dest, null, mine)}</select></div>
        <label class="btn primary ip-pick" for="imp-file-m">${icon('upload')}${t('Choose the file')}</label>
        <input type="file" id="imp-file-m" class="ip-file" accept=".ofx,.qfx,.csv,.txt,application/x-ofx,text/csv" data-c="imp-file" data-source="auto">
        <p class="ip-note">${t('OFX or CSV, exported from your bank’s app. It is read on your phone and is not uploaded.')}</p>`
      : banner('', `<b>${t('Add an account first.')}</b> ${t('A statement is always imported into one of your accounts.')}${acctButton()}`)}
      <button class="linkbtn ip-how" data-a="imp-howto">${icon('help')}${t('How do I get my statement?')}</button>
    </section>
    ${hist.length ? `<section class="ip-hist"><h3 class="mr-h">${t('Latest imports')}</h3><ul>${hist.map(i => `<li><span class="grow"><b>${esc(i.file)}</b><small>${fmt.date(i.date, true)} · ${esc(acct(i.accountId) ? acctName(acct(i.accountId)) : '')} · ${tn(i.imported, '{n} transaction', '{n} transactions')}</small></span>${i.status === 'Undone' ? `<span class="chip">${t('Undone')}</span>` : S.transactions.some(x => x.importId === i.id) ? `<button class="btn sm ghost" data-a="imp-undo" data-id="${i.id}">${t('Undo')}</button>` : ''}</li>`).join('')}</ul></section>` : ''}
    ${UI.space === 'business' ? '' : `<p class="ip-note ip-desk">${DESK_ICON}<span>${t('A spreadsheet (plan, goals, investments) is brought in on the computer.')}</span></p>`}`;
}
/** A CSV whose columns could not be guessed: the three asked one under the other, with what the first rows read as. */
function ipMap(imp) {
  const need = [['date', t('Date')], ['description', t('Description')], ['amount', t('Amount')]], prev = csvRows(imp), good = prev.filter(r => r.date && r.amount !== null);
  return `<section class="ip-step" id="imp-panel"><div class="ip-head"><h2>${t('Which column is which?')}</h2><button class="btn sm ghost" data-a="imp-cancel">${t('Cancel')}</button></div>
      <p class="ip-lead">${t('Dorax could not tell the columns of {file} by itself. Choose them once: it remembers them for this account.', { file: esc(imp.file) })}</p>
      <div class="ip-fields"><div class="field"><label for="imp-acct">${t('Import into')}</label><select id="imp-acct" data-c="imp-account">${acctOptions(imp.accountId, null, impAccounts())}</select></div>
      ${need.map(([f, l]) => `<div class="field"><label for="map-${f}">${t('{name} column', { name: l })}</label><select id="map-${f}" data-c="imp-map" data-f="${f}">${options(imp.csv.header.map((h, i) => [i, h]), imp.map[f])}</select></div>`).join('')}</div>
      ${sw('imp-invert', !!imp.invert, 'imp-invert', '', t('In this file, purchases are positive numbers (usual in credit card statements)'))}
      <ul class="ip-prev">${good.slice(0, 3).map(r => `<li><span class="grow"><b>${esc(r.description || '—')}</b><small>${fmt.date(r.date, true)}</small></span><span class="num${r.amount > 0 ? ' pos' : ''}">${fmt.money(r.amount, acct(imp.accountId).currency)}</span></li>`).join('') || `<li class="muted">${t('Check which column is the date and which is the amount.')}</li>`}</ul>
      <button class="btn primary ip-go" data-a="imp-review" ${good.length ? '' : 'disabled'}>${t('Continue')}</button></section>`;
}
function ipCard(r, imp) {
  const cur = acct(imp.accountId).currency, biz = ipBiz(imp), say = moveText(r) || whyNote(r);      // "no rule matched" is already what the category says (Uncategorized)
  const cat = biz ? '' : r.type === 'transfer' ? `<p class="ip-nocat">${t('Not counted as spending')}</p>` : `<label class="sr" for="ip-cat-${r.id}">${t('Category')}</label><select id="ip-cat-${r.id}" class="ip-cat" data-c="rv-edit" data-f="category" data-s="imp" data-id="${r.id}">${catOptions(catKey(r.categoryId, r.subcategoryId), { blank: t('Uncategorized') })}</select>`;
  return `<li class="ip-row${r.decision === 'ignore' ? ' off' : r.decision === 'accept' ? ' on' : ''}" id="ip-${r.id}"><div class="ip-top"><b>${esc(r.merchant || r.description)}</b><span class="num${r.amount > 0 ? ' pos' : ''}">${fmt.money(r.amount, cur)}</span></div>
      <p class="ip-sub">${fmt.date(r.date, true)}${say ? ' · ' + esc(say) : ''}</p>${cat}
      <div class="seg ip-dec" role="group" aria-label="${t('Decision')}"><button data-a="rv-decide" data-op="accept" data-s="imp" data-id="${r.id}" aria-pressed="${r.decision === 'accept'}">${r.decision === 'accept' ? icon('check') : ''}${t('Import')}</button><button data-a="rv-decide" data-op="ignore" data-s="imp" data-id="${r.id}" aria-pressed="${r.decision === 'ignore'}">${t('Skip')}</button></div></li>`;
}
function ipReview(imp) {
  ipPrep(imp);
  const cur = acct(imp.accountId).currency, look = ipLook(imp), ready = ipReady(imp), dups = imp.rows.filter(r => r.dup && !r.keepBoth).length, left = look.filter(r => !r.decision).length, n = importable(imp).length;
  const go = `<button class="btn primary ip-go" data-a="imp-commit" ${left || !n ? 'disabled' : ''}>${left ? tn(left, '{n} still to decide', '{n} still to decide') : tn(n, 'Import {n} transaction', 'Import {n} transactions')}</button>`;
  const inc = importable(imp).filter(r => r.type === 'income'), exp = importable(imp).filter(r => r.type === 'expense');
  return `<section class="ip-step" id="imp-panel"><div class="ip-head"><div class="grow"><h2>${esc(imp.file)}</h2>
        <div class="ip-into"><label for="imp-acct">${t('Into')}</label><select id="imp-acct" data-c="imp-account">${acctOptions(imp.accountId, null, impAccounts())}</select></div></div>
        <button class="btn sm ghost" data-a="imp-cancel">${t('Cancel')}</button></div>
      ${imp.note ? banner('warn', esc(imp.note)) : ''}${flipNote(imp)}${cardFileHint(imp)}
      <div class="ip-sum" id="ip-sum">
        <span><b class="num">${ready.length}</b>${t('ready')}</span><span><b class="num">${look.length}</b>${t('to look at')}</span>${dups ? `<span><b class="num">${dups}</b>${t('already there')}</span>` : ''}
      </div>
      <p class="ip-types">${t('If you import now')}: <b class="num">${fmt.money(sum(inc.map(r => r.amount)), cur)}</b> ${t('as income')} · <b class="num">${fmt.money(-sum(exp.map(r => r.amount)), cur)}</b> ${t('as spending')}</p>
      ${look.length ? `<div class="ip-look"><div class="ip-lh"><h3 class="mr-h">${t('To look at')}</h3>${left ? `<button class="btn sm" data-a="imp-accept-look">${t('Import all of these')}</button>` : ''}</div>
        <p class="ip-note">${t('Dorax is not sure about these: check the category and choose Import or Skip.')}</p><ul class="ip-list">${look.map(r => ipCard(r, imp)).join('')}</ul></div>`
        : `<p class="ip-ok">${icon('check')}${t('Nothing to look at: Dorax is sure of every row.')}</p>`}
      ${ready.length ? `<div class="ip-ready"><button class="ip-rh" data-a="imp-ready" aria-expanded="${!!imp.showReady}"><span class="grow">${tn(ready.length, '{n} ready, filed by Dorax', '{n} ready, filed by Dorax')}</span>${icon(imp.showReady ? 'left' : 'right')}</button>
        ${imp.showReady ? `<ul class="ip-mini">${ready.map(r => `<li><span class="grow"><b>${esc(r.merchant || r.description)}</b><small>${fmt.date(r.date, true)} · ${r.type === 'transfer' ? t('Transfer') : ipBiz(imp) ? '' : esc(catName(r.subcategoryId || r.categoryId))}</small></span><span class="num${r.amount > 0 ? ' pos' : ''}">${fmt.money(r.amount, cur)}</span></li>`).join('')}</ul>` : ''}</div>` : ''}
      ${dups ? `<p class="ip-note">${tn(dups, '{n} is already in this account: it is left out.', '{n} are already in this account: they are left out.')}</p>` : ''}
      ${go}${imp.csv ? `<button class="linkbtn ip-cols" data-a="imp-back">${t('Change the columns')}</button>` : ''}</section>`;
}
function ipDone(imp) {
  const r = imp.result, a = acct(imp.accountId);
  return `<section class="ip-step ip-done" id="imp-panel"><span class="ip-hero ok" aria-hidden="true">${icon('check')}</span>
      <h2>${t('{n} transactions imported into {name}.', { n: r.imported, name: esc(acctName(a)) })}</h2>
      <p class="ip-lead">${t('{a} duplicates skipped, {b} ignored.', { a: r.duplicates, b: r.ignored })}${(r.rules || []).length ? ' ' + tn(r.rules.length, 'Next time {n} goes in by itself.', 'Next time {n} go in by themselves.') : ''}</p>
      <button class="btn primary ip-go" data-a="view-account" data-id="${a.id}">${t('See the transactions')}</button>
      <button class="btn ip-again" data-a="imp-cancel">${t('Bring another statement')}</button></section>`;
}
