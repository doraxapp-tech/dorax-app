/* Dorax Finance — the summary's cards on a phone, their names outside them (owner, 2026-10-11: "take the headings out of the summary's cards, on the
   phone, e.g. the Goals card, Transactions"). Each part's name, with its (i) and its way to its page ("Open goals", "View all", "See"), sits on the
   page right above its card, as the section label the other pages use (the chip with the lime dot, owner: "I meant like this", with the Goals page);
   the card holds only what it shows. The part keeps its element and its id, so the order of the
   summary, its animations and the focus work as before: the element becomes a frame with no box of its own (.part-out), its name first (.part-h)
   and the box after it (.part-box). The two cards that are a button as a whole (You can spend, Days of freedom) get the same name outside, with a
   "See" button that does what the card does; the card keeps its tap. A computer keeps its cards as they are. Styles: css/screens/summary-heads.css. */
function partOut(html) {
  if (!html || typeof document === 'undefined') return html;
  const tp = document.createElement('template'); tp.innerHTML = html.trim();
  [...tp.content.children].forEach(el => {
    if (!el.classList.contains('card') || el.classList.contains('part-out')) return;
    let head = el.querySelector(':scope > .card-h');
    const tap = el.querySelector(':scope > .rw-tap'), rh = tap && tap.querySelector(':scope > .rw-h');
    if (!head && rh) {      // a card that is one button: its name and its "See" come out of it
      const b = rh.querySelector('b'), alias = rh.querySelector('.rw-alias'), title = b ? b.textContent.trim() : '';
      head = document.createElement('div'); head.className = 'card-h';
      head.innerHTML = `<span class="part-t"><h2 class="sec">${esc(title)}</h2>${alias ? `<small class="sub">${esc(alias.textContent.trim())}</small>` : ''}</span><span class="right"><button class="btn sm go" data-a="${esc(tap.dataset.a)}" aria-haspopup="dialog" aria-label="${esc(t('See') + ': ' + title)}">${t('See')}${icon('right')}</button></span>`;
      rh.remove(); tap.setAttribute('aria-label', title + '. ' + tap.textContent.replace(/\s+/g, ' ').trim());
      el.insertBefore(head, el.firstChild);
    }
    if (!head) return;
    // the name as the pages' section label (owner, 2026-10-11, with the Goals page: "I meant like this"): the small chip with its lime dot, its (i) in it
    const h2 = head.querySelector(':scope > h2, :scope > .part-t > h2');
    if (h2 && !h2.classList.contains('sec')) { h2.classList.add('sec'); head.querySelectorAll(':scope > .hint').forEach(i => { h2.appendChild(document.createTextNode(' ')); h2.appendChild(i); }); }
    const box = document.createElement('div'); box.className = 'part-box';
    [...el.childNodes].filter(n => n !== head).forEach(n => box.appendChild(n));
    el.appendChild(box); head.classList.add('part-h'); el.classList.add('part-out');
  });
  return tp.innerHTML;
}
