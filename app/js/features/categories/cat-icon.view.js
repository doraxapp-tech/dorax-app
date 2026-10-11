/* Dorax Finance — Categories & rules: choosing a category's icon (owner, 2026-10-10: "add icons to the categories"). A tap on a category's icon opens
   this card: every drawing of ui/cat-icons.js in that category's colour, the one it has now marked; a tap on another keeps it and closes. A subcategory
   has one too (its own name points to one, or it shares its category's). Without a choice it keeps the one its name points to. Clicks: cat-icon.actions.js. Styles: css/components/cat-glyph.css. */
function catIconDrawer(d) {
  const f = catOf(d.id), c = f && f.cat; if (!c) return '<div class="body"></div>';
  const cur = catIconKey(c, f.sub), col = catColor(c.id), name = (f.sub || c).name;
  return `<div class="body cgi"><p class="note">${t('It shows wherever {name} does: in your transactions, your limits and your plan.', { name: esc(name) })}</p>
      <div class="cgi-grid" role="group" aria-label="${esc(t('Icon for {name}', { name }))}">${Object.keys(CAT_ICONS).map(k => `<button type="button" class="cgi-b${k === cur ? ' on' : ''}" style="--c:${col}" data-a="cat-icon-set" data-v="${k}" aria-pressed="${k === cur}" aria-label="${esc(catIconName(k))}" data-tip="${esc(catIconName(k))}"><span class="cg">${catIconSvg(k)}</span></button>`).join('')}</div></div>
    <footer><button class="btn ghost spacer" data-a="close">${t('Cancel')}</button></footer>`;
}
