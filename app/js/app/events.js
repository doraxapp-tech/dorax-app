/* Dorax Finance — the page listens once: clicks, keys, fields, drag and drop, hints, pulling a sheet down. */
// ---------- events ----------
document.addEventListener('click', e => {
  const q = e.target.closest('.lp-faq summary');      // a question on the home page: opened and closed with a slide (app/motion.js)
  if (q && q.parentElement.animate && !reducedMotion()) { e.preventDefault(); faqToggle(q.parentElement); return; }
  const link = e.target.closest('a[href^="#"]');
  if (link) {
    e.preventDefault();
    if (link.dataset.a && A[link.dataset.a]) A[link.dataset.a](link.dataset, link); else navigate(link.getAttribute('href').slice(1));
    save(); return;
  }
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  const fn = A[el.dataset.a]; if (fn) { fn(el.dataset, el); save(); }
});
// Anything that can change the data ends in a save: the account is sent to the server shortly after (server/sync.js).
['change', 'keyup'].forEach(type => document.addEventListener(type, save));
document.addEventListener('change', e => {
  const el = e.target.closest('[data-c]'); if (!el || el.dataset.live || !C[el.dataset.c]) return;
  deferring = true; try { C[el.dataset.c](el); } finally { deferring = false; }
});
document.addEventListener('pointerdown', () => { pointerDown = true; }, true);
['pointerup', 'pointercancel'].forEach(type => document.addEventListener(type, () => { pointerDown = false; }, true));
document.addEventListener('input', e => {
  const el = e.target.closest('[data-c]'); if (!el) return;
  if (el.dataset.live && C[el.dataset.c]) C[el.dataset.c](el);
  else if (el.dataset.c === 'draft' && el.tagName !== 'SELECT' && el.type !== 'checkbox') UI.drawer.draft[el.dataset.k] = el.value;
  else if (el.dataset.c === 'split' && el.tagName !== 'SELECT') UI.drawer.draft.splits[+el.dataset.i][el.dataset.k] = el.value;
});
document.addEventListener('keydown', e => {
  if (UI.modal) {
    if (e.key === 'Escape') A['modal-cancel']();
    else if (e.key === 'Enter' && e.target.id === 'modal-word') A['modal-confirm']();
    return;
  }
  if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.closest('.au-form')) { e.preventDefault(); const fn = A[e.target.closest('.au-form').dataset.enter]; if (fn) { fn({}); save(); } return; }
  if (e.key === 'Enter' && e.target.id === 'ob-name') { e.preventDefault(); return A['onboard-save'](); }
  if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox' && e.target.closest('.onb')) { e.preventDefault(); return A['ob-next'](); }
  if (e.key === 'Enter' && (e.target.id === 'pf-pw-cur' || e.target.id === 'pf-pw-new')) { e.preventDefault(); A['pw-save'](); return save(); }
  if (e.key === 'Enter' && e.target.id === 'pf-email') { e.preventDefault(); return A['email-change'](); }
  if (e.key === 'Enter' && e.target.id === 'cv-pw') { e.preventDefault(); return A['conv-pw'](); }
  if (e.key === 'Enter' && e.target.matches && e.target.matches('.due-row input')) {       // Enter walks down the list of bills and saves at the end
    e.preventDefault(); const all = [...document.querySelectorAll('.due-row input')], next = all[all.indexOf(e.target) + 1];
    if (next) { next.focus(); next.select(); return; } return A['due-save']();
  }
  if (e.key === 'Escape' && (UI.drawer || UI.sheet)) A.close();
  if (e.key === 'Enter' && e.target.matches && e.target.matches('tr.click')) A['open-tx'](e.target.dataset);
  if (e.key === 'Enter' && e.target.id === 'cat-rename') A['save-cat'](e.target.dataset);
  if (e.target.matches && e.target.matches('.plan input') && ['Enter', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
    e.preventDefault();
    const td = e.target.closest('td'), idx = [...td.parentElement.children].indexOf(td), cell = r => r.children[idx] && r.children[idx].querySelector('input');
    let r = td.parentElement; do { r = e.key === 'ArrowUp' ? r.previousElementSibling : r.nextElementSibling; } while (r && !cell(r));
    if (r) cell(r).focus(); else e.target.blur();
  }
});
['dragover', 'dragleave', 'drop'].forEach(type => document.addEventListener(type, e => {
  const drop = e.target.closest && e.target.closest('#drop'); if (!drop) return;
  e.preventDefault(); drop.classList.toggle('over', type === 'dragover');
  if (type === 'drop' && e.dataTransfer.files[0]) takeFile(e.dataTransfer.files[0]);
}));
const tip = () => $('tip');
let tipTimer = 0;
const hideTip = () => { clearTimeout(tipTimer); tipTimer = 0; tip().hidden = true; };
/** Short tips follow the pointer. An explanation (a .hint button) is anchored to its button instead, stays while the pointer is on the button or on the text itself,
    and goes away a moment after the pointer leaves, on Escape, on scroll or when the focus moves on. */
function showTip(e) {
  const tp = tip();
  if (e.target.closest && e.target.closest('#tip')) { clearTimeout(tipTimer); tipTimer = 0; return; }
  const el = e.target.closest && e.target.closest('[data-tip]');
  if (!el) { if (tp.hidden) return; if (!tp.classList.contains('long')) tp.hidden = true; else if (!tipTimer) tipTimer = setTimeout(hideTip, 180); return; }
  clearTimeout(tipTimer); tipTimer = 0;
  const long = el.classList.contains('hint'), anchored = long || e.clientX == null || e.type === 'focusin', gap = long ? 8 : 12;
  tp.textContent = el.dataset.tip; tp.classList.toggle('long', long); tp.hidden = false;
  const r = el.getBoundingClientRect(), x = anchored ? r.left + r.width / 2 : e.clientX, y = anchored ? r.top : e.clientY;
  const w = tp.offsetWidth, h = tp.offsetHeight;
  tp.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, x - w / 2)) + 'px';
  tp.style.top = (y - h - gap < 8 ? (anchored ? r.bottom + gap : y + 18) : y - h - gap) + 'px';
}
// a tap or Enter on an (i) shows its text (a phone has no hover); Escape puts any tip away
document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('.hint'); if (el) showTip({ target: el, type: 'focusin' }); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !tip().hidden) hideTip(); });
document.addEventListener('mousemove', showTip);
document.addEventListener('focusin', showTip);
document.addEventListener('focusin', e => { if (e.target.matches && e.target.matches('.plan input')) e.target.select(); });
document.addEventListener('focusout', hideTip);
window.addEventListener('scroll', () => { hideTip(); document.documentElement.classList.toggle('scrolled', window.scrollY > 30); }, { passive: true });
// Phones: a sheet can be pulled down by its handle or its header to dismiss it, the way sheets behave on iOS.
let pull = null;
document.addEventListener('touchstart', e => {
  const head = e.target.closest && e.target.closest('.drawer > .grab, .drawer > header, .sheet > .grab'), el = head && head.parentElement;
  if (!el || e.target.closest('button, a, select, input') || getComputedStyle(el).bottom !== '0px' || window.innerWidth > 920) return;
  pull = { el, y: e.touches[0].clientY, dy: 0, t: Date.now() }; el.style.transition = 'none'; el.style.animation = 'none';
}, { passive: true });
document.addEventListener('touchmove', e => { if (!pull) return; pull.dy = Math.max(0, e.touches[0].clientY - pull.y); pull.el.style.transform = `translateY(${pull.dy}px)`; }, { passive: true });
document.addEventListener('touchend', () => {
  if (!pull) return; const { el, dy, t: t0 } = pull, fast = dy > 40 && dy / Math.max(1, Date.now() - t0) > .6; pull = null;
  el.style.transition = 'transform 220ms cubic-bezier(.2, .8, .2, 1)';
  if (dy > 120 || fast) { el.style.transform = 'translateY(105%)'; const scrim = document.querySelector('#overlay .scrim'); if (scrim) { scrim.style.transition = 'opacity 200ms ease-out'; scrim.style.opacity = '0'; } setTimeout(() => { UI.skipExit = true; A.close(); }, 200); }
  else el.style.transform = '';
});
document.addEventListener('submit', e => e.preventDefault());      // every form here is handled by the page itself
window.addEventListener('hashchange', onHash);
// Back from Google's page with the browser's Back button: the page returns as it was left, with its button still waiting.
window.addEventListener('pageshow', e => { if (e.persisted && !UI.session && UI.pub && UI.pub.busy) { UI.pub.busy = null; renderNow(); } });
