/* Dorax Finance — public page and panel: the contact form. */
// ---------- contact (owner's decision: a form; no address is shown). It is reachable without logging in, because a privacy request can come from
// someone who has no account any more. The message is kept on the server (the table contact_messages), where only the owner reads it.
const CONTACT_TOPICS = () => [['question', t('A question')], ['problem', t('Something is not working')], ['data', t('My data (a privacy request)')], ['billing', t('My plan or a payment')], ['other', t('Something else')]];
const freshContact = () => ({ email: UI.session ? S.user.email : '', topic: 'question', message: '', error: null, sent: false, busy: false });
const contactState = () => UI.contact || (UI.contact = freshContact());
function contactFields() {
  const c = contactState();
  if (c.sent) return `<div class="contact-done" role="status" id="contact-done" tabindex="-1"><div class="modal-icon neutral">${icon('check')}</div><h2>${t('Message sent')}</h2>
      <p>${t('The answer goes to {email}.', { email: `<b>${esc(c.email)}</b>` })}</p></div>`;
  return `${c.error ? banner('crit', esc(c.error)) : ''}
    <div class="field"><label for="ct-email">${t('Your email, for the answer')}</label><input type="text" inputmode="email" id="ct-email" autocomplete="email" autocapitalize="off" spellcheck="false" value="${esc(c.email)}" placeholder="${t('you@email.com')}" data-c="contact" data-k="email" data-live="1"></div>
    <div class="field"><label for="ct-topic">${t('What is it about?')}</label><select id="ct-topic" data-c="contact" data-k="topic">${options(CONTACT_TOPICS(), c.topic)}</select></div>
    <div class="field"><label for="ct-message">${t('Message')}</label><textarea id="ct-message" rows="6" maxlength="5000" data-c="contact" data-k="message" data-live="1">${esc(c.message)}</textarea></div>
    <p class="note">${t('Do not write passwords, card numbers or bank logins here.')}</p>`;
}
function viewContact() {
  const c = contactState();
  return `<main class="legal"><div class="legal-page contact-page"><div class="legal-top"><a class="btn ghost sm auth-back" href="${PAGES.href('landing')}" data-a="pub-go" data-v="landing">${icon('left')}${t('Home')}</a>${brandMark(true)}</div>
    <h1 id="contact-title" tabindex="-1">${t('Contact')}</h1><p class="lead sm">${t('Write to Dorax. The answer comes by email.')}</p>
    <div class="contact-form">${contactFields()}
      <div class="row">${c.sent ? `<button class="btn" data-a="contact-new">${t('Write another message')}</button>` : `<button class="btn primary lg${c.busy ? ' busy' : ''}" data-a="contact-send" ${c.busy ? 'disabled aria-busy="true"' : ''}>${c.busy ? t('One moment…') : t('Send message')}</button>`}</div></div>
    <p class="legal-foot"><a class="linkbtn" href="${PAGES.href('privacy')}" data-a="pub-go" data-v="privacy">${t('Privacy policy')}</a> · <a class="linkbtn" href="${PAGES.href('terms')}" data-a="pub-go" data-v="terms">${t('Terms of use')}</a> · <a class="linkbtn" href="${PAGES.href('landing')}" data-a="pub-go" data-v="landing">${t('Home')}</a></p></div></main>`;
}
const contactDrawer = () => { const c = contactState(); return `<div class="body contact-form"><p class="note">${t('Write to Dorax. The answer comes by email.')}</p>${contactFields()}</div>
  <footer>${c.sent ? `<button class="btn" data-a="contact-new">${t('Write another message')}</button>` : `<button class="btn primary${c.busy ? ' busy' : ''}" data-a="contact-send" ${c.busy ? 'disabled aria-busy="true"' : ''}>${c.busy ? t('One moment…') : t('Send message')}</button>`}<button class="btn ghost spacer" data-a="close">${t('Close')}</button></footer>`; };
const legalDrawer = d => `<div class="body legal-body">${legalBody(d.doc)}</div><footer><button class="btn ghost spacer" data-a="close">${t('Close')}</button></footer>`;

// Graphics below the first screen come in as they are reached, once. A re-render (changing the language) must not replay them.
let revealIO = null;
const SEEN = new Set();
function watchReveal() {
  const root = $('public'), els = root.querySelectorAll('[data-reveal]');
  if (revealIO) { revealIO.disconnect(); revealIO = null; }
  if (!els.length) return;
  if (reducedMotion() || !('IntersectionObserver' in window)) return els.forEach(e => e.classList.add('seen', 'still'));
  root.classList.add('reveal');
  revealIO = new IntersectionObserver(list => list.forEach(e => { if (!e.isIntersecting) return; e.target.classList.add('seen'); SEEN.add(e.target.dataset.reveal); revealIO.unobserve(e.target); }), { rootMargin: '0px 0px -10% 0px' });
  els.forEach(e => { if (SEEN.has(e.dataset.reveal)) e.classList.add('seen', 'still'); else revealIO.observe(e); });
}
