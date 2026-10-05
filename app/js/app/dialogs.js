/* Dorax Finance — the frame: the confirmation dialog. */
// ---------- confirmation: every delete is confirmed in a centred dialog; what cannot be rebuilt also asks for a typed word ----------
function confirmBox(o) {
  const el = document.activeElement;
  UI.modal = { tone: 'danger', typed: '', word: o.critical ? t('delete') : null, back: el && el.id ? '#' + el.id : focusKey(el), ...o };
  renderModal();
}
const modalReady = () => !UI.modal.word || UI.modal.typed.trim().toLowerCase() === UI.modal.word.toLowerCase();
function renderModal() {
  const m = UI.modal, root = $('modal-root'), was = !!root.firstChild && !root.classList.contains('out');
  clearTimeout(renderModal.t);
  if (!m) {
    if (was && !reducedMotion()) { root.classList.remove('in'); root.classList.add('out'); root.inert = true; renderModal.t = setTimeout(() => { root.innerHTML = ''; root.classList.remove('out'); root.inert = false; }, 140); }
    else { root.innerHTML = ''; root.classList.remove('in', 'out'); root.inert = false; }
    return setInert();
  }
  root.inert = false; root.classList.remove('out'); root.classList.toggle('in', !was && !reducedMotion());
  root.innerHTML = `<div class="modal-wrap"><div class="scrim" data-a="modal-cancel"></div><div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-text">
    <div class="modal-icon ${m.tone === 'danger' ? '' : 'neutral'}">${icon(m.tone === 'danger' ? 'trash' : 'alert')}</div>
    <h2 id="modal-title">${esc(m.title)}</h2><p id="modal-text">${esc(m.text)}</p>
    ${m.word ? `<div class="field"><label for="modal-word">${t('Type {word} to confirm', { word: `<b>${esc(m.word)}</b>` })}</label><input type="text" id="modal-word" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" value="${esc(m.typed)}" data-c="modal-word" data-live="1"></div>` : ''}
    <footer><button class="btn" data-a="modal-cancel">${t('Cancel')}</button><button class="btn ${m.tone === 'danger' ? 'danger' : 'primary'}" id="modal-ok" data-a="modal-confirm" ${modalReady() ? '' : 'disabled'}>${esc(m.label)}</button></footer></div></div>`;
  setInert();
  const el = m.word ? $('modal-word') : root.querySelector('button.btn[data-a="modal-cancel"]'); if (el) el.focus();   // the safe choice has focus; a typed word starts in its field
}
