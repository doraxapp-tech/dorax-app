/* Dorax Finance — screen: Recurring. */
// ---------- Recurring ----------
function viewRecurring() {
  const list = recurringList(S, S.today), upcoming = list.filter(r => dayDiff(r.next, S.today) <= 30), tot = xs => fmt.money(sum(xs.map(r => r.amount)), CUR);
  return `<section class="tiles">
      <div class="card tile"><div class="label"><span>${t('Recurring payments')}</span>${hint('recCount')}</div><div class="value num">${list.length}</div></div>
      <div class="card tile"><div class="label"><span>${t('Monthly total')}</span>${hint('recTotal')}</div><div class="value num">${tot(list)}</div></div>
      <div class="card tile"><div class="label"><span>${t('Due in the next 30 days')}</span>${hint('recDue')}</div><div class="value num">${tot(upcoming)}</div></div>
      <div class="card tile"><div class="label"><span>${t('Next payment')}</span>${hint('recNext')}</div><div class="value">${list[0] ? fmt.date(list[0].next) : '—'}</div></div></section>
  <section class="card"><div class="card-h"><h2>${t('Recurring transactions')}</h2>${hint('recList')}<span class="sub">${t('Detected: same merchant in at least 3 of the last 4 months, similar amount and day')}</span></div>
    <div class="card-b flush"><table class="tbl stackable"><thead><tr><th>${t('Merchant')}</th><th>${t('Category')}</th><th>${t('Account')}</th><th>${t('Next expected')}</th><th>${t('Source')}</th><th class="r">${t('Typical amount')}</th><th><span class="sr">${t('Actions')}</span></th></tr></thead><tbody>
    ${paged('recurring', list).rows.map(r => `<tr><td class="first"><b style="font-weight:500">${esc(r.merchant)}</b></td><td class="wide">${catLabel({ type: 'expense', categoryId: r.categoryId, subcategoryId: r.subcategoryId })}</td><td class="wide meta"><span class="muted">${esc(acct(r.accountId).name)}</span></td>
      <td class="wide num">${fmt.date(r.next, true)}</td><td class="wide">${r.source === 'manual' ? `<span class="chip">${t('Manual')}</span>` : `<span class="chip info"><i></i>${t('Detected · {n} months', { n: r.occurrences })}</span>`}</td>
      <td class="amt">${r.fixed === false ? '≈ ' : ''}${fmt.money(r.amount, acct(r.accountId).currency)}</td>
      <td class="wide r"><button class="iconbtn" data-a="${r.source === 'manual' ? 'remove-recurring' : 'dismiss-recurring'}" data-id="${r.id}">${r.source === 'manual' ? t('Remove') : t('Not recurring')}</button></td></tr>`).join('') || `<tr><td colspan="7"><div class="empty"><b>${t('No recurring payments yet')}</b>${t('They appear after a merchant shows up for three months, or you can add one below.')}</div></td></tr>`}
    </tbody></table>${paged('recurring', list).html}</div></section>
  <section class="card"><div class="card-h"><h2>${t('Add a recurring payment manually')}</h2>${hint('recAdd')}</div><div class="card-b"><div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
      ${fld('rc-name', t('Name'), `<input type="text" id="rc-name">`)}
      ${fld('rc-amt', t('Amount'), `<input type="text" inputmode="decimal" class="num" id="rc-amt" placeholder="0,00">`)}
      ${fld('rc-day', t('Day of month'), `<input type="number" id="rc-day" min="1" max="31" inputmode="numeric" value="10">`)}
      <div class="field"><label for="rc-acct">${t('Account')}</label><select id="rc-acct">${acctOptions((mainOf('personal', BASE_CURRENCY) || personal()[0] || {}).id, null, personal())}</select></div>
      <div class="field"><label for="rc-cat">${t('Category')}</label><select id="rc-cat">${catOptions('vitales|', { expenseOnly: true })}</select></div>
      <div class="field" style="justify-content:flex-end"><button class="btn primary" data-a="add-recurring">${icon('plus')}${t('Add')}</button></div></div></div></section>`;
}
