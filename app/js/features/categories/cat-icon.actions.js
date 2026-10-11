/* Dorax Finance — clicks: a category's icon (cat-icon.view.js). Joined into A in app/actions.js. */
const CAT_ICON_ACTIONS = {
  /** The picker, for a category or a subcategory. */
  'cat-icon'(ds) {
    const f = catOf(ds.id); if (!f) return;
    UI.drawer = { kind: 'cat-icon', title: t('Icon for {name}', { name: (f.sub || f.cat).name }), pop: true, id: ds.id }; renderOverlay();
    const el = document.querySelector('.cgi-b.on'); if (el) el.focus({ preventScroll: true });
  },
  /** The icon chosen: kept, the card closes, the focus goes back to the category's icon. */
  'cat-icon-set'(ds) {
    const d = UI.drawer, f = d && catOf(d.id); if (!f || !CAT_ICONS[ds.v]) return;
    const x = f.sub || f.cat; x.icon = ds.v; if (f.sub) UI.catOpen[f.cat.id] = true;
    UI.drawer = null; render(); toast(t('{name} has its new icon.', { name: x.name }));
    const el = $('cat-ic-' + x.id); if (el) el.focus({ preventScroll: true });
  },
};
