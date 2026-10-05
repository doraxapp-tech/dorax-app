/* Dorax Finance — shared: the pager under every long table. */
// ---------- one pager for every long table (owner, v36: "make sure all tables have a pagination feature") ----------
const PG_SIZES = [10, 25, 50];
/** The rows of the table `key` that are on the page now, and the pager to put under the table. Ten rows a page unless the person asks for more;
    no pager when everything fits on the first page. Returns { rows, from, html }. */
function paged(key, rows) {
  const st = UI.pg[key] || (UI.pg[key] = { page: 1, size: PG_SIZES[0] }), size = PG_SIZES.includes(+st.size) ? +st.size : PG_SIZES[0], pages = Math.max(1, Math.ceil(rows.length / size));
  st.page = Math.min(Math.max(1, st.page || 1), pages); const from = (st.page - 1) * size, shown = rows.slice(from, from + size);
  const html = rows.length <= PG_SIZES[0] ? '' : `<nav class="pager" data-pg="${key}" aria-label="${t('Pages')}"><span class="pg"><span class="note num" role="status">${t('{a}–{b} of {n}', { a: from + 1, b: from + shown.length, n: rows.length })}</span><label class="note" for="pg-size-${key}">${t('Rows per page')}</label><select id="pg-size-${key}" data-c="pg-size" data-k="${key}">${options(PG_SIZES.map(n => [String(n), String(n)]), String(size))}</select></span>
    <span class="pg"><button class="btn sm" id="pg-prev-${key}" data-a="pg" data-k="${key}" data-v="prev" ${st.page > 1 ? '' : 'disabled'}>${icon('left')}<span>${t('Previous')}</span></button><span class="note num">${t('Page {a} of {b}', { a: st.page, b: pages })}</span><button class="btn sm" id="pg-next-${key}" data-a="pg" data-k="${key}" data-v="next" ${st.page < pages ? '' : 'disabled'}><span>${t('Next')}</span>${icon('right')}</button></span></nav>`;
  return { rows: shown, from, html };
}
