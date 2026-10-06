/* Dorax Finance — clicks and typing: the search (features/find/find.js). Joined into A in app/actions.js and into C in app/changes.js.
   Keys (F to open, the arrows, Enter, Escape) are in app/events.js. */
const FIND_ACTIONS = {
  find() {
    if (UI.find || UI.modal) return;
    const el = document.activeElement;
    UI.menu = false; UI.sheet = false; UI.drawer = null; UI.find = { q: '', i: 0, items: [], back: el && el.id ? '#' + el.id : focusKey(el) };
    renderShell(); renderOverlay(); renderFind(); const q = $('find-q'); if (q) q.focus();
  },
  'find-close'() { const f = UI.find; if (!f) return; UI.find = null; renderFind(); const el = (f.back && document.querySelector(f.back)) || document.querySelector('#rail-find .findbtn'); if (el) el.focus({ preventScroll: true }); },
  'find-go'(ds) { const f = UI.find, x = f && f.items[+ds.i]; if (!x) return; UI.find = null; renderFind(); x.run(); },
};
const FIND_CHANGES = {
  'find-q'(el) { const f = UI.find; if (!f) return; f.q = el.value; f.i = 0; $('find-list').innerHTML = findList(); findMark(); },
};
