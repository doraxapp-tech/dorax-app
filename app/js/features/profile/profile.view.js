/* Dorax Finance — the person: profile, how the app talks to them, email and login, reminders, deleting the account.
   Also the greeting on the dashboard, the first steps of a new account and the user card in the menu. */

const initials = name => { const p = String(name || '').trim().split(/\s+/).filter(Boolean); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : (p[0] || '')[1] || '')).toUpperCase(); };
const avatar = cls => `<span class="avatar ${cls || ''}" aria-hidden="true">${esc(initials(S.user.name || S.user.email))}</span>`;
function userCard() {
  return `<a class="who" href="#profile" ${UI.route === 'profile' ? 'aria-current="page"' : ''}>${avatar()}<span class="who-t"><b>${esc(S.user.name || t('Profile'))}</b><small>${esc(S.user.email)}</small></span></a>
    <button class="iconbtn" id="user-menu-btn" data-a="user-menu" aria-expanded="${!!UI.menu}" aria-controls="user-menu" aria-label="${t('More options')}"${UI.menu ? '' : ` data-tip="${t('More options')}"`}>${icon('more')}</button>
    ${UI.menu ? userMenu() : ''}`;
}
/** The three dots beside the person's name: what used to sit in the top bar (language, light or dark) and the ways out (help, log out).
    It opens above the name, because the name is at the foot of the side bar. It holds a list and a pair of buttons to choose with, so it is a group of
    ordinary controls, not a "menu" of items: Tab walks through it, Escape or a click anywhere else closes it (app/events.js).
    A phone has no side bar: the same four things are in the More sheet (app/overlay.js). */
function userMenu() {
  const light = S.settings.theme === 'light';
  return `<div class="umenu" id="user-menu" role="group" aria-label="${t('More options')}">
      <div class="umenu-row"><label for="lang">${icon('globe')}${t('Language')}</label><select id="lang" data-c="setting" data-k="lang">${options(LANGS, S.settings.lang)}</select></div>
      <div class="umenu-row"><span class="umenu-l" id="umenu-theme">${icon(light ? 'sun' : 'moon')}${t('Appearance')}</span><div class="seg" role="group" aria-labelledby="umenu-theme">${[['dark', 'moon', t('Dark')], ['light', 'sun', t('Light')]].map(([v, ic, l]) => `<button data-a="theme-set" data-v="${v}" aria-pressed="${light === (v === 'light')}" aria-label="${l}" data-tip="${l}">${icon(ic)}</button>`).join('')}</div></div>
      <button class="umenu-item" data-a="help">${icon('help')}<span>${t('Help')}</span></button>
      <button class="umenu-item out" data-a="logout">${icon('logout')}<span>${t('Log out')}</span></button></div>`;
}

// ---------- dashboard: the greeting ----------
// v34 (owner: the dashboard was cluttered): the greeting is one line. The sentence about the month and the note about which days the figures cover are gone:
// the To do card and the tiles right below say the same things, and each tile's (i) explains what it counts.
function greeting() {
  const h = new Date().getHours(), name = esc((S.user.name || '').trim());
  const hi = h < 12 ? (name ? t('Good morning, {name}.', { name }) : t('Good morning.')) : h < 19 ? (name ? t('Good afternoon, {name}.', { name }) : t('Good afternoon.')) : (name ? t('Good evening, {name}.', { name }) : t('Good evening.'));
  return `<header class="hello"><h2>${hi}</h2></header>`;
}

// ---------- a new account: four things to do, each one a real action ----------
function firstSteps() {
  if (!S.isNew) return '';
  const year = +S.today.slice(0, 4);
  const steps = [
    [S.accounts.length > 0, t('Add an account'), t('Where your money lives: a checking account, a card, a savings account.'), `<button class="btn sm" data-a="edit-account" data-id="">${t('Add account')}</button>`],
    [payRows(S, year).length > 0, t('Add your income'), t('What you are paid, and whether it goes to bills or to savings.'), `<button class="btn sm" data-a="step-income">${t('Add income')}</button>`],
    [S.plan.lines.length > 0, t('Add your first fixed cost'), t('Rent, internet, that subscription you forgot about.'), `<button class="btn sm" data-a="line-new">${t('New fixed cost')}</button>`],
    [S.goals.length > 0, t('Create a goal'), t('Something to save for, with a target and a date.'), `<button class="btn sm" data-a="goal-new">${t('New goal')}</button>`],
  ];
  const done = steps.filter(s => s[0]).length, all = done === steps.length;
  return `<section class="card" id="first-steps"><div class="card-h"><h2>${t('First steps')}</h2>${hint('firstSteps')}<span class="chip ${all ? 'good' : ''}">${all ? '<i></i>' : ''}${t('{a} of {b} done', { a: done, b: steps.length })}</span><button class="right btn sm ghost" data-a="steps-hide">${t('Hide this')}</button></div>
    <div class="card-b">${all ? `<p class="lead sm" style="margin-bottom:12px">${t('All set. From here on it is just living your month.')}</p>` : ''}
      ${done < 2 ? `<div class="sheet-cta">${icon('upload')}<span class="grow"><b style="font-weight:500">${t('Coming from a spreadsheet?')}</b><span class="note">${t('Bring it in and skip most of the typing: fixed costs, income, goals and due days.')}</span></span><button class="btn sm primary" data-a="sheet-go">${t('Import my spreadsheet')}</button></div>` : ''}
      <div class="list">${steps.map(([ok, title, text, action]) => `<div class="li step ${ok ? 'ok' : ''}"><span class="tickbox" aria-hidden="true">${ok ? icon('check') : ''}</span><span class="grow"><b style="font-weight:500">${title}</b><div class="note">${text}</div></span>${ok ? `<span class="chip good"><i></i>${t('Done')}</span>` : action}</div>`).join('')}</div></div></section>`;
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
  const u = S.user, tone = u.tone || 'friend', sample = k => (VOICE[S.settings.lang] || {})[k] || k, plainOf = k => (I18N[S.settings.lang] && I18N[S.settings.lang][k]) || k;
  const toneCard = (id, title, text, example) => `<button class="pick" data-a="user-tone" data-v="${id}" aria-pressed="${tone === id}"><b>${title}</b><span class="note">${text}</span><span class="say">“${esc(example)}”</span></button>`;
  return `<section class="card pf-head"><div class="card-b">${avatar('lg')}<div class="grow"><h2>${esc(u.name || t('Profile'))}</h2><p class="note">${esc(u.email)} · ${t('With Dorax since {date}', { date: fmt.date(u.since, true) })}</p></div>
      <button class="btn" data-a="logout">${icon('logout')}${t('Log out')}</button></div></section>
  <div class="grid g-even">
    <section class="card"><div class="card-h"><h2>${t('You')}</h2>${hint('proYou')}</div><div class="card-b stack" style="gap:14px">
      <div class="field"><label for="pf-name">${t('Your name')}</label><input type="text" id="pf-name" autocomplete="given-name" value="${esc(u.name)}" data-c="user-name"><small>${t('This is what I call you across the app.')}</small></div>
      <div class="field"><label for="pf-lang">${t('Language')}</label><select id="pf-lang" data-c="setting" data-k="lang">${options(LANGS, S.settings.lang)}</select></div>
      <p class="note">${t('Number format, backup and your data are in')} <a href="#settings">${t('Settings')}</a>.</p></div></section>
    <section class="card"><div class="card-h"><h2>${t('How I talk to you')}</h2>${hint('proTone')}</div><div class="card-b stack" style="gap:12px">
      <div class="picks" role="group" aria-label="${t('How I talk to you')}">${toneCard('friend', t('With some spark'), t('Like a friend who is good with money. Short, warm, a joke when nothing is at stake.'), sample('Payment recorded.'))}${toneCard('plain', t('Just the facts'), t('The same information in neutral words.'), plainOf('Payment recorded.'))}</div>
      <p class="note">${t('The numbers and what they mean are the same either way. Only the wording changes. Deleting something is always said plainly.')}</p></div></section>
    <section class="card"><div class="card-h"><h2>${t('Email and login')}</h2>${hint('proLogin')}</div><div class="card-b stack" style="gap:14px">
      ${loginCard()}
      ${u.pendingEmail ? banner('', `<b>${t('We sent a link to {email}.', { email: esc(u.pendingEmail) })}</b> ${t('Your login changes when you open it. Until then you keep using {email}.', { email: esc(u.email) })} ${t('If a link also arrives at your current address, open that one too.')}<div class="row" style="margin-top:8px"><button class="btn sm ghost" data-a="email-cancel">${t('Hide this')}</button></div>`, 'mail')
        : `<div class="field"><label for="pf-email">${t('New email')}</label><div class="row" style="flex-wrap:nowrap"><input type="text" inputmode="email" id="pf-email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="${esc(u.email)}"><button class="btn" data-a="email-change">${t('Send confirmation link')}</button></div></div>`}
      <div class="setting"><div><b style="font-weight:500">${t('This device')}</b><p>${t('Logged in since {date}.', { date: fmt.date(UI.session.since, true) })} ${t('Your account is kept on the server: log in on another device and it is all there.')}</p></div></div></div></section>
  </div>
  ${remindersCard()}
  <section class="card"><div class="card-h"><h2>${t('Delete account')}</h2>${hint('proDelete')}</div><div class="card-b"><div class="setting"><div><p style="margin:0">${t('Deletes your profile and everything in this account: accounts, transactions, plan, goals and investments. This can’t be undone.')}</p></div><button class="btn danger" data-a="user-delete">${t('Delete my account')}</button></div></div></section>`;
}
