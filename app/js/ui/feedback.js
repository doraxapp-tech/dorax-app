/* Dorax Finance — shared: toast, flash, saving a file, copying. */
/** People who ask their device for less motion get none: no entrances, no exits. Read at the moment of use, so a change applies at once. */
const reducedMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
function toast(msg, action) { UI.toast = { msg, action }; renderToast(); clearTimeout(toast.t); clearTimeout(toast.x); toast.t = setTimeout(hideToast, action ? 9000 : 3800); }
function hideToast() {
  const el = document.getElementById('toast'); UI.toast = null;
  if (!el || reducedMotion()) return renderToast();
  el.classList.add('out'); toast.x = setTimeout(() => { if (!UI.toast) renderToast(); }, 170);
}
function renderToast() {
  const el = document.getElementById('toast-root');
  // the words in an element of their own, so that next to a button they keep their width and wrap as a sentence, not one word a line
  el.innerHTML = UI.toast ? `<div id="toast" role="status"${UI.toast.action ? ' class="act"' : ''}><span class="t-msg">${esc(UI.toast.msg)}</span>${UI.toast.action ? `<button data-a="${UI.toast.action.a}">${esc(UI.toast.action.label)}</button>` : ''}</div>` : '';
}
/** Rows that just changed are washed with the accent once, on the next render. */
function flash(...ids) { UI.flash = new Set(ids); }
const flashed = id => UI.flash && UI.flash.has(id) ? ' flash' : '';

async function saveFile(filename, text, mime) {
  try {
    const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    if (dl) {
      const safe = /\.(json|csv|txt)$/.test(filename) ? filename : filename + '.txt';
      await dl.save({ filename: safe, data: text });
      toast(safe === filename ? t('File saved.') : t('Saved as {safe}. This hosted preview can only save .txt, so rename it to {name}.', { safe, name: filename }));
      return;
    }
  } catch (e) { if (e && e.code === 'declined') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: mime || 'application/octet-stream' }));
  a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast(t('Download started: {name}', { name: filename }));
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast(t('Copied to clipboard.')); }
  catch (e) { toast(t('Copy is blocked here. Select the text in the preview and copy it manually.')); }
}
