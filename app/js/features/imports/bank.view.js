/* Dorax Finance — screen: Open Finance (connecting a bank). A TRIAL: Belvo's test banks only, with invented data.
   The person asks to connect; they are sent to Belvo (the company that talks to the banks) and from there to their bank, where they agree
   to share accounts and transactions; they come back, and what the bank shared goes through the same review as a statement file.
   Nothing enters the ledger without that review. The server's side is supabase/functions/bank; this file is what the person sees.
   It has its own place in the menu, for everybody (owner, 2026-10-06: "add an open finance tab and make it visible for all users").
   UI.bank: { known, enabled, why, links: [{ id, institution, since }], busy, got: { link, institution, accounts, transactions, left, more } }. */
const BANK_KIND = () => ({ checking: t('Checking'), savings: t('Savings'), credit: t('Credit card') });

/** The page: the banks, and under them the review of whatever was brought from one. */
function viewOpenFinance() {
  const imp = UI.imp;
  return `${bankCard()}
  ${UI.impError ? banner('crit', esc(UI.impError)) : ''}
  ${imp && imp.source === 'bank' ? importPanel(imp) : ''}`;
}
/** The card. What the server says about this person is asked once per visit; until it answers, and when the server's side is not there
    (this preview, a server without Belvo's keys), the card says so and offers nothing to press. */
function bankCard() {
  const b = UI.bank || {};
  if (!b.known && !b.asked) { UI.bank = { ...b, asked: true }; bankRefresh(); }
  const head = `<div class="card-h"><h2>${t('Connect a bank')}</h2><span class="chip warn"><i></i>${t('Trial: test banks only')}</span>`, about = `<p class="note" style="margin:0">${t('Through Open Finance: you agree at your bank to share your accounts and transactions, and review them here before anything is imported. Your bank password is never typed into Dorax.')}</p>`;
  if (!b.enabled) return `<section class="card" id="bank-card">${head}</div><div class="card-b">${about}
    <div class="empty" style="margin-top:12px"><b>${!b.known ? t('One moment…') : t('Not available here yet')}</b>${!b.known ? '' : SERVER.preview ? t('This preview has no bank to connect to.') : t('The connection to the banks is not set up on the server.')}</div></div></section>`;
  const links = b.links || [], got = b.got, stop = b.busy ? ' disabled' : '';
  const accounts = l => !got || got.link !== l.id ? '' : !got.transactions.length ? `<p class="note" style="margin:8px 0 0">${t('The bank has not sent any transactions yet. It can take a minute after connecting: try again shortly.')}</p>`
    : `<div class="list" style="margin-top:8px">${got.accounts.map(a => { const n = got.transactions.filter(x => x.account === a.id).length;
        return `<div class="li"><span class="grow">${esc(a.name)} <span class="muted">· ${esc(BANK_KIND()[a.kind] || a.kind)} · ${esc(a.currency)}</span></span><span class="note">${tn(n, '{n} transaction', '{n} transactions')}</span><button class="btn sm" data-a="bank-review" data-acc="${esc(a.id)}"${n ? '' : ' disabled'}>${t('Review and import')}</button></div>`; }).join('')}</div>
      ${got.left || got.more ? `<p class="note" style="margin:8px 0 0">${got.more ? t('Only the most recent transactions were brought: the bank has more than fit in one go.') : ''} ${got.left ? tn(got.left, '{n} transaction without a date or an amount was left out.', '{n} transactions without a date or an amount were left out.') : ''}</p>` : ''}`;
  return `<section class="card" id="bank-card">${head}<button class="right btn sm primary" data-a="bank-open"${stop}>${icon('plus')}${t('Connect a bank')}</button></div>
    <div class="card-b">${about}
    ${links.length ? links.map(l => `<div class="setting" data-link="${esc(l.id)}"><div><b style="font-weight:500">${esc(l.institution || t('Bank'))}</b><p>${t('Connected on {date}', { date: fmt.date(String(l.since || '').slice(0, 10) || S.today, true) })}</p>${accounts(l)}</div>
        <div class="row"><button class="btn sm" data-a="bank-fetch" data-id="${esc(l.id)}"${stop}>${b.busy === l.id ? t('One moment…') : t('Bring transactions')}</button><button class="btn sm ghost" data-a="bank-disconnect" data-id="${esc(l.id)}"${stop}>${t('Disconnect')}</button></div></div>`).join('')
      : `<div class="empty" style="margin-top:12px"><b>${t('No bank connected yet')}</b>${t('Connect one to bring its transactions without a file.')}</div>`}</div></section>`;
}

/** The panel that asks for what the bank's consent needs. The CPF lives in this panel only while it is open. */
function bankStartDrawer(d) {
  const m = d.draft;
  return `<div class="body">${d.error ? banner('crit', esc(d.error)) : ''}
    <p class="note">${t('Your bank needs to know who is asking. The CPF and the name below go to Belvo, the company that connects to the banks, for your bank’s consent screen. Dorax does not keep them.')}</p>
    <div class="form-grid">
      ${fld('bk-cpf', t('CPF'), inp('bk-cpf', 'cpf', m.cpf, 'inputmode="numeric" autocomplete="off" class="num" placeholder="000.000.000-00" maxlength="14"'), 'full')}
      ${fld('bk-name', t('Full name, as your bank has it'), inp('bk-name', 'name', m.name, 'autocomplete="name" maxlength="120"'), 'full')}</div>
    <p class="note">${t('Next you leave Dorax for Belvo’s page and then your bank’s, where you choose what to share and for how long. You come back here when it is done.')}</p></div>
  <footer><button class="btn primary" data-a="bank-start"${d.busy ? ' disabled' : ''}>${d.busy ? t('One moment…') : t('Continue to my bank')}</button><button class="btn ghost spacer" data-a="close">${t('Cancel')}</button></footer>`;
}
