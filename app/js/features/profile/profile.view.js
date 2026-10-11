/* Dorax Finance — the person: profile, email and login, reminders, deleting the account.
   Also the greeting on the dashboard, the first steps of a new account and the user card in the menu. */

/** The picture every person starts with (owner, 2026-10-06: "a pro image inspire in the app logo and colors"): a figure drawn the way the logo
    is drawn, in thick even strokes, on the logo's deep green; the head is the ring of the logo's "d", with its light green quarter. */
const avatarDrawn = cls => `<span class="avatar ${cls || ''}" aria-hidden="true"><svg viewBox="0 0 40 40" focusable="false"><circle cx="20" cy="20" r="20" fill="#006239"/><g fill="none" stroke="#F4F7F5" stroke-width="3.2"><circle cx="20" cy="15.2" r="5.6"/><path d="M8.4 34a11.6 11.6 0 0 1 23.2 0"/><path stroke="#3ECF8E" d="M14.4 15.2a5.6 5.6 0 0 1 5.6-5.6"/></g></svg></span>`;
/** The person's own photo when there is one (features/profile/photo.js), the drawn figure until then. */
const avatar = cls => photoHas() ? `<span class="avatar photo ${cls || ''}" aria-hidden="true"><img src="${S.user.photo}" alt="" decoding="async"></span>` : avatarDrawn(cls);
function userCard() {
  // the whole card opens the menu (owner, 2026-10-06: "move the profile tab into a button in the 3 dot dropdown"): the name no longer
  // leads to the profile by itself, the menu's first row does
  return `<button class="who" id="user-menu-btn" data-a="user-menu" aria-expanded="${!!UI.menu}" aria-controls="user-menu" aria-label="${esc(S.user.name || S.user.email)}: ${t('More options')}">${avatar()}<span class="who-t"><b>${esc(S.user.name || t('Profile'))}</b><small>${esc(S.user.email)}</small></span><span class="who-more">${icon('more')}</span></button>
    ${UI.menu ? userMenu() : ''}`;
}
/** The menu of the person's card: the profile, what used to sit in the top bar (language, light or dark) and the ways out (help, log out).
    It opens above the name, because the name is at the foot of the side bar. It holds a list and a pair of buttons to choose with, so it is a group of
    ordinary controls, not a "menu" of items: Tab walks through it, Escape or a click anywhere else closes it (app/events.js).
    A phone has no side bar: the same four things are in the More sheet (app/overlay.js). */
function userMenu() {
  const light = S.settings.theme === 'light';
  return `<div class="umenu" id="user-menu" role="group" aria-label="${t('More options')}">
      <a class="umenu-item" id="umenu-profile" href="#profile" ${UI.route === 'profile' ? 'aria-current="page"' : ''}>${icon('user')}<span>${t('Profile')}</span></a>
      ${hasCompany() ? '' : `<button class="umenu-item" id="umenu-co" data-a="co-open">${icon('briefcase')}<span>${t('Open a company account')}</span></button>`}
      <div class="umenu-row"><label for="lang">${icon('globe')}${t('Language')}</label><select id="lang" data-c="setting" data-k="lang">${options(LANGS, S.settings.lang)}</select></div>
      <div class="umenu-row"><span class="umenu-l" id="umenu-theme">${icon(light ? 'sun' : 'moon')}${t('Appearance')}</span><div class="seg" role="group" aria-labelledby="umenu-theme">${[['dark', 'moon', t('Dark')], ['light', 'sun', t('Light')]].map(([v, ic, l]) => `<button data-a="theme-set" data-v="${v}" aria-pressed="${light === (v === 'light')}" aria-label="${l}" data-tip="${l}">${icon(ic)}</button>`).join('')}</div></div>
      <button class="umenu-item" data-a="help">${icon('help')}<span>${t('Help')}</span></button>
      <button class="umenu-item out" data-a="logout">${icon('logout')}<span>${t('Log out')}</span></button></div>`;
}

// ---------- dashboard: the greeting ----------
// v34 (owner: the dashboard was cluttered): the greeting is one line. The sentence about the month and the note about which days the figures cover are gone:
// the To do card and the tiles right below say the same things, and each tile's (i) explains what it counts.
function greeting(tools) {
  const h = new Date().getHours(), name = esc(firstName(S.user.name));
  const hi = h < 12 ? (name ? t('Good morning, {name}.', { name }) : t('Good morning.')) : h < 19 ? (name ? t('Good afternoon, {name}.', { name }) : t('Good afternoon.')) : (name ? t('Good evening, {name}.', { name }) : t('Good evening.'));
  return `<header class="hello${tools ? ' tools' : ''}"><h2>${hi}</h2>${tools || ''}</header>`;      // tools: the computer's "Reorder the dashboard"
}

// ---------- a new account: four things to do, each one a real action ----------
/** The first things, each a real action: [done, title, what it is, its button or field]. */
function firstStepList() {
  const year = +S.today.slice(0, 4), pays = payRows(S, year);
  return [
    [S.accounts.length > 0, t('Add an account'), t('Where your money lives: a checking account, a card, a savings account.'), `<button class="btn sm" data-a="edit-account" data-id="">${t('Add account')}</button>`],
    [payRows(S, year).length > 0, t('Add your income'), t('What you are paid, and whether it goes to bills or to savings.'), `<button class="btn sm" data-a="step-income">${t('Add income')}</button>`],
    [S.plan.lines.length > 0, t('Add your first fixed cost'), t('Rent, internet, that subscription you forgot about.'), `<button class="btn sm" data-a="line-new">${t('New fixed cost')}</button>`],
    [S.goals.length > 0, t('Create a goal'), t('Something to save for, with a target and a date.'), `<button class="btn sm" data-a="goal-new">${t('New goal')}</button>`],
    // pay day (features/plan/payday.js): chosen right here, once there is an income to give it to. "No fixed day" is an answer too.
    [pays.some(r => r.day) || !!S.user.payDaySaid, t('Set your pay day'), t('On that day Dorax asks whether to record your pay. It never records it by itself.'),
      pays.length ? `<span class="step-day"><label class="sr" for="fs-payday">${t('Pay day')}</label><select id="fs-payday" data-c="step-payday">${options([['', t('Choose a day')], ['none', t('No fixed day')], ...payDayOptions().slice(1)], '')}</select></span>` : `<button class="btn sm" data-a="step-income">${t('Add income')}</button>`],
    [S.plan.lines.some(l => l.pay === 'budget'), t('Set your spending limits'), t('How much to spend on each category, with a warning at 80%.'), `<button class="btn sm" data-a="plan-guide">${t('Plan my month')}</button>`],      // features/limits (2026-10-10)
  ];
}
/** The card. While a step is missing it is the first thing on the dashboard (owner, 2026-10-07: "nothing is more important than that"). The moment
    the last one is done the account stops being new and the card celebrates (stepsMaybe below); it stays until it is closed or the visit ends. */
function firstSteps() {
  if (!S.isNew && !UI.stepsDone) return '';
  const steps = firstStepList(), done = steps.filter(s => s[0]).length, all = done === steps.length, fresh = all && UI.stepsDone && Date.now() - UI.stepsDone < 6000;
  return `<section class="card fsteps${all ? ' all' : ''}${fresh ? ' cheer' : ''}" id="first-steps"><div class="card-h"><h2>${t('First steps')}</h2>${hint('firstSteps')}<span class="chip ${all ? 'good' : ''}">${all ? '<i></i>' : ''}${t('{a} of {b} done', { a: done, b: steps.length })}</span><button class="right btn sm ghost" data-a="steps-hide">${all ? t('Close') : t('Hide this')}</button></div>
    <div class="card-b">${all ? `<div class="steps-done"><svg class="steps-ring" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="26"/><path d="M20 33l8 8 16-17"/></svg><p class="lead sm">${t('All set. From here on it is just living your month.')}</p></div>` : `<div class="steps-meter" aria-hidden="true">${steps.map(s => `<i class="${s[0] ? 'on' : ''}"></i>`).join('')}</div>`}
      ${done < 2 && !deskOnly('sheet') ? `<div class="sheet-cta">${icon('upload')}<span class="grow"><b style="font-weight:500">${t('Coming from a spreadsheet?')}</b><span class="note">${t('Bring it in and skip most of the typing: fixed costs, income, goals and due days.')}</span></span><button class="btn sm primary" data-a="sheet-go">${t('Import my spreadsheet')}</button></div>` : ''}
      <div class="list">${steps.map(([ok, title, text, action], i) => `<div class="li step ${ok ? 'ok' : ''}" style="--i:${i}"><span class="tickbox" aria-hidden="true">${ok ? icon('check') : ''}</span><span class="grow"><b style="font-weight:500">${title}</b><div class="note">${text}</div></span>${ok ? `<span class="chip good"><i></i>${t('Done')}</span>` : action}</div>`).join('')}</div></div></section>`;
}
/** After anything the person does: was the last first step just done? Then the account is no longer new, and that is celebrated once: the card's
    ring draws itself, its ticks land one after the other, and confetti falls (owner, 2026-10-07: "create an animation when they finish"). */
function stepsMaybe() {
  if (!UI.session || !S.isNew || !firstStepList().every(s => s[0])) return;
  S.isNew = false; UI.stepsDone = Date.now();
  if (UI.route === 'dashboard' && !inCompany()) render(); else toast(t('First steps done. Your Dorax is ready.'));
  confetti();
}

// ---------- profile ----------
const pwForm = () => UI.pw || (UI.pw = { open: false, cur: '', next: '', error: null, busy: false });
/** How this account is opened, and its password: change it, or choose one when the account only uses Google. The server says which ways exist. */
function loginCard() {
  const ways = SERVER.ways(), has = ways.includes('password'), f = UI.pw;
  const chips = `${has ? `<span class="chip good"><i></i>${t('Email and password')}</span>` : ''}${ways.includes('google') ? `<span class="chip good"><i></i>Google</span>` : ''}`;
  if (!f || !f.open) return `<div class="setting"><div><b style="font-weight:500">${t('How you log in')}</b><p class="row" style="gap:6px;margin-top:6px">${chips}</p></div><button class="btn sm" data-a="pw-open">${has ? t('Change password') : t('Choose a password')}</button></div>`;
  return `<div class="stack pw-form" style="gap:12px"><b style="font-weight:500">${has ? t('Change password') : t('Choose a password')}</b>
      ${f.error ? banner('crit', esc(f.error)) : ''}
      ${has ? `<div class="field"><label for="pf-pw-cur">${t('Current password')}</label><input type="password" id="pf-pw-cur" autocomplete="current-password" maxlength="128" value="${esc(f.cur)}" data-c="pw-cur" data-live="1"></div>` : ''}
      <div class="field"><label for="pf-pw-new">${t('New password')}</label><input type="password" id="pf-pw-new" autocomplete="new-password" maxlength="128" value="${esc(f.next)}" data-c="pw-new" data-live="1" aria-describedby="pf-pw-help"><small id="pf-pw-help">${t('At least {n} characters, with a letter and a number.', { n: PW_MIN })}</small></div>
      <div class="row"><button class="btn primary${f.busy ? ' busy' : ''}" data-a="pw-save" ${f.busy ? 'disabled aria-busy="true"' : ''}>${f.busy ? t('One moment…') : t('Save password')}</button><button class="btn ghost" data-a="pw-cancel" ${f.busy ? 'disabled' : ''}>${t('Cancel')}</button></div></div>`;
}
function viewProfile() {
  const u = S.user;
  // the photo: the picture itself opens the choice of a file, and so does the button under the name (owner, 2026-10-08)
  const has = photoHas();
  return `<section class="card pf-head"><div class="card-b"><label class="pf-photo" for="pf-photo" title="${has ? t('Change photo') : t('Add a photo')}">${avatar('lg')}<span class="pf-cam" aria-hidden="true">${icon('camera')}</span></label>
      <input type="file" id="pf-photo" accept="image/*" class="sr" data-c="photo-file" aria-label="${t('Profile photo')}">
      <div class="grow"><h2>${esc(u.name || t('Profile'))}</h2><p class="note">${esc(u.email)} · ${t('With Dorax since {date}', { date: fmt.date(u.since, true) })}</p>
        <div class="row pf-photo-btns"><label class="btn sm" for="pf-photo" id="pf-photo-add">${icon('camera')}${has ? t('Change photo') : t('Add a photo')}</label>${has ? `<button class="btn sm ghost" data-a="photo-remove">${t('Remove photo')}</button>` : ''}</div></div>
      <button class="btn" data-a="logout">${icon('logout')}${t('Log out')}</button></div></section>
  <div class="set-page pf-page">
    ${groupOpen('you', t('You'), hint('proYou'), '', '', 'stack', ' style="gap:14px"')}
      <div class="field"><label for="pf-name">${t('Your name')}</label><input type="text" id="pf-name" autocomplete="given-name" value="${esc(u.name)}" data-c="user-name"><small>${t('This is what I call you across the app.')}</small></div>
      <div class="field"><label for="pf-lang">${t('Language')}</label><select id="pf-lang" data-c="setting" data-k="lang">${options(LANGS, S.settings.lang)}</select></div>
      <p class="note">${t('Number format, backup and your data are in')} <a href="#settings">${t('Settings')}</a>.</p>${groupEnd}
    ${groupOpen('login', t('Email and login'), hint('proLogin'), '', '', 'stack', ' style="gap:14px"')}
      ${loginCard()}
      ${u.pendingEmail ? banner('', `<b>${t('We sent a link to {email}.', { email: esc(u.pendingEmail) })}</b> ${t('Your login changes when you open it. Until then you keep using {email}.', { email: esc(u.email) })} ${t('If a link also arrives at your current address, open that one too.')}<div class="row" style="margin-top:8px"><button class="btn sm ghost" data-a="email-cancel">${t('Hide this')}</button></div>`, 'mail')
        : `<div class="field"><label for="pf-email">${t('New email')}</label><div class="row" style="flex-wrap:nowrap"><input type="text" inputmode="email" id="pf-email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="${esc(u.email)}"><button class="btn" data-a="email-change">${t('Send confirmation link')}</button></div></div>`}
      <div class="setting"><div><b style="font-weight:500">${t('This device')}</b><p>${t('Logged in since {date}.', { date: fmt.date(UI.session.since, true) })} ${t('Your account is kept on the server: log in on another device and it is all there.')}</p></div></div>${groupEnd}
  ${guardCard()}
  ${remindersCard()}
  ${groupOpen('delete', t('Delete account'), hint('proDelete'))}<div class="setting"><div><p style="margin:0">${t('Deletes your profile and everything in this account: accounts, transactions, plan, goals and investments. This can’t be undone.')}</p></div><button class="btn danger" data-a="user-delete">${t('Delete my account')}</button></div>${groupEnd}
  </div>`;
}
