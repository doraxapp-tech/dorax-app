/* Dorax Finance — screen: Categories & rules. */
// ---------- Categories & Rules ----------
// v36 (owner: "a mess… a super long column of categories and subcategories"; "remove Test a description"; "explain Add a rule, I don't know what it is for"):
// categories are a grid of short blocks, each showing its subcategories only when opened; rules say in plain words what they do, above the form that adds one.
// 2026-10-06 (owner: "how do I add and remove groups (categories) for the company? and also how to remove group categories for Household?"):
// the screen has the two sides, like Plan (Household | Company in the top bar), and a category can be deleted on either. Deleting one never
// loses anything: what it held (subcategories, their fixed costs, transactions) moves to Other, which is why Other itself stays, and so does
// Income. The company's categories are the groups of its fixed costs; they are the same for every currency the company plans in. Rules file
// household statements only, so the company's side does not show them.
// 2026-10-10 (owner: "how do you put a limit on a category? I can't find that option"): each expense category says its spending limit, filling up
// this month, or offers one (features/limits/limits.view.js: catLimitRow).
function viewCategories() {
  const co = inCompany(), cats = B().categories, count = {}, oid = otherId(), lim = limNow();
  S.transactions.forEach(x => allocations(x).forEach(a => { if (a.categoryId) count[a.categoryId] = (count[a.categoryId] || 0) + 1; if (a.subcategoryId) count[a.subcategoryId] = (count[a.subcategoryId] || 0) + 1; }));
  const paid = new Set(sideBooks().flatMap(b => Object.values(b.pay || {}).flatMap(rows => (rows || []).map(r => r.sub))));
  const editing = id => UI.catEdit === id;
  const off = tip => `disabled style="opacity:.4;cursor:not-allowed" data-tip="${esc(tip)}"`;
  const nameCell = (id, name) => editing(id) ? `<input type="text" id="cat-rename" aria-label="${t('Name')}" value="${esc(name)}" data-id="${id}"><button class="btn sm primary" data-a="save-cat" data-id="${id}">${t('Save')}</button><button class="btn sm ghost" data-a="edit-cat" data-id="">${t('Cancel')}</button>` : `<span class="nm">${esc(name)}</span>`;
  const subDel = s => count[s.id] ? off(t('Reassign its {n} transactions before deleting', { n: count[s.id] })) : paid.has(s.id) ? off(t('It is an income row on Plan. Remove the row there first.')) : '';
  const catDel = c => c.income ? off(t('Income is kept here. It can be renamed, not deleted.')) : c.id === oid ? off(t('Anything without a category goes here. It can be renamed, not deleted.')) : '';
  const block = c => { const open = !!UI.catOpen[c.id] || c.subs.some(s => editing(s.id));
    return `<div class="cat-card${open ? ' open' : ''}"><div class="cat-h"><button class="cat-ic" id="cat-ic-${c.id}" data-a="cat-icon" data-id="${c.id}" aria-label="${esc(t('Change the icon of {name}', { name: c.name }))}" data-tip="${esc(t('Change the icon'))}">${catGlyph(c)}</button>${nameCell(c.id, c.name)}${editing(c.id) ? '' : `<span class="n" title="${t('Transactions')}">${count[c.id] || 0}</span>`}</div>
      ${c.income || editing(c.id) ? '' : catLimitRow(lim[c.id])}
      <div class="cat-f"><button class="cat-more" data-a="cat-toggle" data-id="${c.id}" aria-expanded="${open}" aria-controls="subs-${c.id}">${icon(open ? 'down' : 'right')}<span>${tn(c.subs.length, '{n} subcategory', '{n} subcategories')}</span></button>
        ${editing(c.id) ? '' : `<span class="cat-acts"><button class="iconbtn" id="ren-${c.id}" data-a="edit-cat" data-id="${c.id}" aria-label="${t('Rename')} ${esc(c.name)}">${t('Rename')}</button><button class="iconbtn" id="del-${c.id}" data-a="delete-cat" data-id="${c.id}" aria-label="${t('Delete')} ${esc(c.name)}" ${catDel(c)}>${t('Delete')}</button></span>`}</div>
      ${open ? `<div class="subs" id="subs-${c.id}">${c.subs.map(s => `<div class="sub">${editing(s.id) ? '' : `<button class="cat-ic sm" id="cat-ic-${s.id}" data-a="cat-icon" data-id="${s.id}" aria-label="${esc(t('Change the icon of {name}', { name: s.name }))}">${catGlyph(c, 'sm', s.id)}</button>`}${nameCell(s.id, s.name)}${editing(s.id) ? '' : `<span class="n" title="${t('Transactions')}">${count[s.id] || 0}</span><button class="iconbtn" data-a="edit-cat" data-id="${s.id}">${t('Rename')}</button><button class="iconbtn" data-a="delete-sub" data-id="${s.id}" ${subDel(s)}>${t('Delete')}</button>`}</div>`).join('')}
        <div class="sub add"><label class="sr" for="newsub-${c.id}">${t('New subcategory')}</label><input type="text" id="newsub-${c.id}" placeholder="${t('New subcategory')}"><button class="btn sm" data-a="add-sub" data-id="${c.id}">${t('Add')}</button></div></div>` : ''}</div>`; };
  const catsCard = `<section class="card" id="cat-cats"><div class="card-h"><h2>${co ? t('Company categories') : t('Categories')}</h2>${hint(co ? 'catCo' : 'catCats')}<span class="sub">${tn(cats.length, '{n} category', '{n} categories')}</span>
      <div class="right"><label class="sr" for="newcat">${t('New category name')}</label><input type="text" id="newcat" placeholder="${t('New category name')}" style="width:190px"><button class="btn sm" data-a="add-cat">${icon('plus')}${t('Add category')}</button></div></div>
    <div class="card-b"><div class="cat-grid">${cats.map(block).join('')}</div>${co ? `<p class="note" id="cat-co-note" style="margin-top:14px;max-width:86ch">${t('Rules file the household’s statements only. A company movement is filed by hand, on Transactions.')}</p>` : ''}</div></section>`;
  if (co) return catsCard;
  const rules = [...S.rules].sort((a, b) => b.priority - a.priority || !!b.auto - !!a.auto || a.pattern.localeCompare(b.pattern)), pr = paged('rules', rules);      // learnt ones first among their equals: where "See rules" finds them
  return deskCut(`${catsCard}
  <section class="card" id="cat-rules"><div class="card-h"><h2>${t('Rules')}</h2>${hint('catRules')}<span class="sub">${tn(S.rules.filter(r => r.active).length, '{n} active', '{n} active')}</span></div>
    <div class="card-b" style="padding-bottom:16px"><p class="note" style="max-width:86ch">${t('A rule names and files transactions for you. When the bank’s text of a transaction contains the keyword, the transaction gets the merchant name and the category you chose. Rules are applied every time you import a statement.')}</p>
      <div class="rule-new"><div class="row" style="gap:6px"><b style="font-weight:500">${t('Add a rule')}</b>${hint('catAdd')}</div><div class="form-grid rule-form">
        <div class="field"><label for="nr-pattern">${t('Keyword in description')}</label><input type="text" id="nr-pattern" placeholder="UBER"></div>
        <div class="field"><label for="nr-merchant">${t('Merchant name')}</label><input type="text" id="nr-merchant" placeholder="Uber"></div>
        <div class="field"><label for="nr-cat">${t('Category')}</label><select id="nr-cat">${catOptions('other|')}</select></div>
        <div class="field"><label for="nr-acct">${t('Applies to')}</label><select id="nr-acct">${acctOptions('', t('All accounts'), personal())}</select></div>
        <div class="field"><label for="nr-pri">${t('Priority (higher wins)')}</label><input type="number" id="nr-pri" value="10" min="1" max="99"></div>
        <div class="field" style="justify-content:flex-end"><button class="btn primary" data-a="add-rule">${icon('plus')}${t('Add rule')}</button></div></div></div></div>
    <div class="card-b flush" style="border-top:1px solid var(--line)"><div class="tbl-wrap"><table class="tbl" id="rules-tbl"><thead><tr><th>${t('Keyword')}</th><th>${t('Merchant')}</th><th>${t('Category')}</th><th>${t('Scope')}</th><th class="r">${t('Priority')}</th><th>${t('Active')}</th><th><span class="sr">${t('Actions')}</span></th></tr></thead><tbody>
    ${pr.rows.map(r => `<tr${r.auto ? ' class="learnt"' : ''}><td><span class="mono">${esc(r.pattern)}</span>${r.auto ? ` <span class="chip" data-tip="${esc(t('Made from a category you chose while importing.'))}">${t('Learnt')}</span>` : ''}</td><td>${esc(r.merchant)}</td><td>${r.transfer ? `<span class="chip">${t('Mark as transfer')}</span>` : catLabel({ type: 'expense', categoryId: r.categoryId, subcategoryId: r.subcategoryId })}</td>
      <td class="muted">${r.accountId && acct(r.accountId) ? acctTag(r.accountId, true) : t('All accounts')}</td><td class="amt">${r.priority}</td><td>${sw('rule-' + r.id, r.active, 'toggle-rule', `data-id="${r.id}"`)}</td>
      <td class="r"><button class="iconbtn" data-a="delete-rule" data-id="${r.id}" aria-label="${t('Delete')} ${esc(r.pattern)}">${t('Delete')}</button></td></tr>`).join('') || `<tr><td colspan="7"><div class="empty"><b>${t('No rules yet')}</b>${t('Add the first one above, or let Dorax offer one when you change the category of an imported transaction.')}</div></td></tr>`}
    </tbody></table></div>${pr.html}</div></section>`, 'rules', '<section class="card" id="cat-rules">');
}
