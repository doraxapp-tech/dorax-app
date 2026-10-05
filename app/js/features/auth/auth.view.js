/* Dorax Finance — public pages: create account, log in, forgotten password, and the short waits around them. */
// ---------- creating an account and logging in: a password, or Google ----------
// Every button is type="button" and Enter is handled by the page (app/events.js): nothing here relies on a form being submitted. The <form> is kept because password managers look for one, with the usual field names.
const auErr = (id, err) => err ? `<small class="err" id="${id}-err">${icon('alert')}<span>${esc(err)}</span></small>` : '';
const auAria = (id, err) => err ? ` aria-invalid="true" aria-describedby="${id}-err"` : '';
function auText(id, label, k, attrs, ph) {
  const p = UI.pub, err = p.errs[k];
  return `<div class="field${err ? ' bad' : ''}"><label for="${id}">${label}</label><input id="${id}" ${attrs} value="${esc(p[k])}" ${ph ? `placeholder="${esc(ph)}"` : ''} data-c="pub" data-k="${k}" data-live="1"${auAria(id, err)}>${auErr(id, err)}</div>`;
}
const auEmail = () => auText('au-email', t('Email'), 'email', 'type="text" inputmode="email" name="email" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false"', t('you@email.com'));
/** A password field with its "show" button. fresh = a password being chosen (the rules are listed under it and tick themselves as it is typed). */
function auPassword(label, fresh, extra) {
  const p = UI.pub, err = p.errs.password, r = pwRules(p.password);
  const rule = (k, text) => `<li data-r="${k}" class="${r[k] ? 'ok' : ''}"><span class="tickbox" aria-hidden="true">${icon('check')}</span>${text}<span class="sr">${r[k] ? t('(met)') : t('(not met yet)')}</span></li>`;
  return `<div class="field${err ? ' bad' : ''}"><div class="lbl-row"><label for="au-pass">${label}</label>${extra || ''}</div>
      <div class="pw-wrap"><input type="${p.show ? 'text' : 'password'}" id="au-pass" name="password" autocomplete="${fresh ? 'new-password' : 'current-password'}" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="128" value="${esc(p.password)}" data-c="pub" data-k="password" data-live="1"${err ? ` aria-invalid="true" aria-describedby="au-pass-err${fresh ? ' pw-rules' : ''}"` : fresh ? ' aria-describedby="pw-rules"' : ''}>
        <button type="button" class="pw-eye" data-a="pw-eye" aria-pressed="${p.show}" aria-label="${t('Show the password')}" data-tip="${p.show ? t('Hide the password') : t('Show the password')}">${icon(p.show ? 'eyeoff' : 'eye')}</button></div>
      ${auErr('au-pass', err)}
      ${fresh ? `<ul class="pw-rules" id="pw-rules">${rule('len', t('At least {n} characters', { n: PW_MIN }))}${rule('letter', t('A letter'))}${rule('digit', t('A number'))}</ul>` : ''}</div>`;
}
// The Google "G" is Google's own artwork, exactly as its "Sign in with Google" button generator gives it (the owner supplied it, 2026-10-05).
// It is never redrawn, recoloured or resized: Google's sign-in branding rules allow only their file, at 20px, on their light, dark or neutral button
// (here the dark one: public/auth.css). It is shown where the button really goes to Google. The preview's stand-in server only pretends to, so there
// the button stays text only.
const GOOGLE_G = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlns:xlink="http://www.w3.org/1999/xlink" style="display: block;"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>';
/** A button that asks the server: while any question is on its way every such button waits, and the one that asked says so. */
const auBtn = (a, label, cls) => { const b = UI.pub.busy; return `<button type="button" class="btn ${cls}${b === a ? ' busy' : ''}" data-a="${a}" ${b ? 'disabled' : ''}${b === a ? ' aria-busy="true"' : ''}>${b === a ? t('One moment…') : label}</button>`; };
const auGoogle = () => { const real = !SERVER.preview; return `${auBtn('auth-google', (real ? `<span class="g-mark" aria-hidden="true">${GOOGLE_G}</span>` : '') + t('Continue with Google'), 'lg gbtn' + (real ? ' g-dark' : ''))}<div class="or" role="separator"><span>${t('or')}</span></div>`; };

function viewAuth() {
  const p = UI.pub, signup = p.mode === 'signup';
  const back = `<button type="button" class="btn ghost sm auth-back" data-a="pub-go" data-v="landing">${icon('left')}${t('Home')}</button>`;
  const top = `${SERVER.ready ? '' : banner('warn', esc(serverSays('not_connected')))}${p.error ? banner('crit', esc(p.error)) : ''}${p.notice ? banner('', esc(p.notice)) : ''}`;
  // One block: the logo, then the form, centred on the page with no box round it (owner, 2026-10-05: "remove the 2 block design of the sign-up and login").
  const card = (inner, plain) => `<main class="auth single"><div class="auth-main"><div class="auth-card">${plain ? '' : back}${brandMark(true)}${inner}</div></div></main>`;
  if (p.screen === 'onboard') return viewOnboard();

  // a short wait: the server is being asked who is logged in, or the account is on its way
  if (p.screen === 'loading') return `<main class="auth gate">${weaveAuth()}<div class="gate-wait" role="status">${brandMark(true)}<span class="spinner" aria-hidden="true"></span><span class="sr">${t('One moment…')}</span></div></main>`;

  // the person is logged in, but the account could not be read
  if (p.screen === 'offline') return card(`<div class="modal-icon neutral">${icon('alert')}</div><h1 id="au-title" tabindex="-1">${t('Your account could not be opened')}</h1>
      <p>${esc(p.error || '')}</p>
      <div class="row">${p.fixed ? `<button type="button" class="btn primary" data-a="pub-go" data-v="contact">${t('Contact form')}</button>` : `<button type="button" class="btn primary" data-a="gate-retry">${t('Try again')}</button>`}<button type="button" class="btn" data-a="logout">${t('Log out')}</button></div>`, true);

  // an email is on its way: the one that confirms a new account, or the one that lets a password be chosen again
  if (p.screen === 'sent') {
    const reset = p.sent === 'reset';
    return card(`<div class="modal-icon neutral">${icon('mail')}</div><h1 id="au-title" tabindex="-1">${reset ? t('Check your email') : t('Confirm your email')}</h1>
      <p>${reset ? t('If {email} has an account, a link to choose a new password is on its way.', { email: `<b>${esc(p.email)}</b>` }) : t('We sent a link to {email}. Open it to finish creating your account.', { email: `<b>${esc(p.email)}</b>` })}</p>
      ${top}
      <p class="note">${t('It can take a minute. If it does not arrive, look in your spam folder.')}</p>
      <div class="row auth-alt"><button type="button" class="linkbtn" data-a="auth-resend" ${p.resent || p.busy ? 'disabled' : ''}>${p.busy === 'auth-resend' ? t('One moment…') : t('Send it again')}</button><span class="muted">·</span><button type="button" class="linkbtn" data-a="pub-go" data-v="${reset ? 'forgot' : 'signup'}">${t('Use another email')}</button><span class="muted">·</span><button type="button" class="linkbtn" data-a="pub-go" data-v="login">${t('Back to log in')}</button></div>
      ${p.resent ? `<p class="note" role="status">${t('Sent again. If it does not arrive in a minute, look in your spam folder.')}</p>` : ''}`);
  }

  // forgotten password, step 1: which account
  if (p.screen === 'forgot') return card(`<h1 id="au-title" tabindex="-1">${t('Choose a new password')}</h1>
      <p>${t('Type the email of your account. You get a link to choose a new password.')}</p>
      ${top}
      <form class="au-form" novalidate data-enter="auth-forgot-send">${auEmail()}
        ${auBtn('auth-forgot-send', t('Send me the link'), 'primary lg')}</form>
      <p class="auth-alt"><button type="button" class="linkbtn" data-a="pub-go" data-v="login">${t('Back to log in')}</button></p>`);

  // forgotten password, step 2: the link from the email was opened
  if (p.screen === 'reset') return card(`<h1 id="au-title" tabindex="-1">${t('Choose a new password')}</h1>
      <p>${t('For {email}. After saving, you are in.', { email: `<b>${esc(p.email)}</b>` })}</p>
      ${top}
      <form class="au-form" novalidate data-enter="auth-reset-save"><input type="text" class="sr" name="email" autocomplete="username" value="${esc(p.email)}" readonly tabindex="-1" aria-hidden="true">
        ${auPassword(t('New password'), true)}
        ${auBtn('auth-reset-save', t('Save and log in'), 'primary lg')}</form>
      <p class="auth-alt"><button type="button" class="linkbtn" data-a="auth-reset-cancel">${t('Cancel')}</button></p>`, true);

  // create account / log in
  const legal = `${t('I have read and accept the')} <button type="button" class="linkbtn" data-a="pub-go" data-v="terms">${t('Terms of use')}</button> ${t('and the')} <button type="button" class="linkbtn" data-a="pub-go" data-v="privacy">${t('Privacy policy')}</button> (${t('drafts')}).`;
  return card(`<h1 id="au-title" tabindex="-1">${signup ? t('Create your account') : t('Welcome back')}</h1>
      <p>${signup ? t('With Google, or with your email and a password.') : t('Log in with Google, or with your email and password.')}</p>
      ${top}
      ${auGoogle()}
      <form class="au-form" novalidate data-enter="${signup ? 'auth-signup' : 'auth-login'}">
        ${signup ? auText('au-name', t('Your name'), 'name', 'type="text" name="name" autocomplete="name" maxlength="80"', t('A nickname works')) : ''}
        ${auEmail()}
        ${signup ? auPassword(t('Password'), true) : auPassword(t('Password'), false, `<button type="button" class="linkbtn" data-a="pub-go" data-v="forgot">${t('Forgot your password?')}</button>`)}
        ${signup ? `<div class="field${p.errs.accept ? ' bad' : ''}"><label class="check accept" for="au-accept"><input type="checkbox" id="au-accept" ${p.accept ? 'checked' : ''} data-c="pub-check" data-k="accept"${auAria('au-accept', p.errs.accept)}><span>${legal}</span></label>${auErr('au-accept', p.errs.accept)}</div>` : ''}
        ${signup ? auBtn('auth-signup', t('Create account'), 'primary lg') : auBtn('auth-login', t('Log in'), 'primary lg')}</form>
      <p class="auth-alt">${signup ? `${t('Already have an account?')} <button type="button" class="linkbtn" data-a="pub-go" data-v="login">${t('Log in')}</button>` : `${t('New here?')} <button type="button" class="linkbtn" data-a="pub-go" data-v="signup">${t('Create account')}</button>`}</p>`);
}
function viewPublic() { const sc = UI.pub.screen; return sc === 'landing' ? viewLanding() : sc === 'privacy' || sc === 'terms' ? viewLegal(sc) : sc === 'contact' ? viewContact() : viewAuth(); }
