/* Dorax Finance — the Help center (v209, owner, 2026-10-13: "Ayuda es un sub menú: crea un help center en su propia página, y a su vez que esté en
   el footer de la landing page y accesible desde el ordenador y el celular"; then "el help center es en la web, no en el dashboard"; then, on a look
   built from the app's parts, "se parece más a la webapp que a la landing page... crea un artefacto solo con el estilo de la landing page", and on
   that artifact, "se ve bien").
   A page of the website, at /ajuda (ui/pages.js), made only of the home page's parts (.lp2, css/public/landing-v2.css): its bar with the white
   capsule (Help marked), the centred giant title with its second line in forest, the eyebrow with the lime dot; the topics as its bento of sage
   cards on a white band (the company's, dark, as the home page's FIIs card); the questions in its two columns with the title held at the left; a
   forest band to write to Dorax; before login its lime closing box; its footer.
     - a topic opens its own page at the same address (before login the browser's Back returns to the topics): its questions, the others beside;
     - the search filters every answer as it is typed, keeping the focus; the words people look for most sit under it.
   From inside the app, "Help" (the menu beside the name on a computer, More on a phone, the search) opens the same page over the app, with "Back to
   Dorax"; there an answer that has a place in the app has "Show me". Every answer says what the app does today. Styles: css/screens/help-center.css. */

/** The topics: [id, icon, name, [[question, answer, where in the app (HELP_GO, help.actions.js) or '']]]. */
function helpTopics() {
  return [
    ['start', 'spark', t('Getting started'), [
      [t('What is Dorax?'), t('A place to organise your own money: your accounts, what you spend, your month’s plan with its bills, your goals and your reports. It gives no financial advice: it shows your numbers clearly so that you decide.'), ''],
      [t('How do I start?'), t('Create an account with your email or with Google. The first steps on the Summary guide you: an account, your income, your first fixed cost, a goal, your pay day and your spending limits.'), 'month'],
      LP_PLANS ? [t('How much does it cost, and can I cancel?'), t('Free costs R$ 0. Plus is R$ 7,99 a month or R$ 79,90 a year; Premium is R$ 14,99 a month or R$ 149,90 a year. Cancel whenever you want: the plan stays active until the end of the period you already paid for.'), '']
        : [t('Is it really free?'), t('Yes, for now: Dorax is free, no card is asked for and nothing is charged. There are no ads and your data is not sold. Paid plans may come later; nothing is charged unless you choose one.'), ''],
      [t('Does it work on my phone?'), t('Yes. Dorax opens in the browser of a phone or a computer, with the same account. On a phone you can add it to the home screen and open it like an app; there is nothing to download from a store.'), ''],
      [t('Do I have to connect my bank?'), t('No. Your bank password is never asked for. You type what you want or import a file.'), ''],
    ]],
    ['money', 'wallet', t('Accounts and transactions'), [
      [t('How do I add an account?'), t('In Accounts & savings, “Add account”: its name, its bank, its type and how much it has today. Its currency is fixed once it has transactions, so amounts are never mixed.'), 'accounts'],
      [t('How do I record an expense quickly?'), t('Tap + and write one line: “taxi 15”.'), 'record'],
      [t('Why is a transfer not counted as spending?'), t('Money moved between your own accounts is neither income nor spending: the totals and the reports leave it out, so nothing is counted twice.'), ''],
      [t('How do I hide the amounts?'), t('Press the eye beside your balance: every amount is hidden until you press it again. Useful in public.'), ''],
    ]],
    ['import', 'upload', t('Statements and spreadsheets'), [
      [t('How do I bring my bank statement?'), t('Imports: choose the OFX or CSV file and Dorax sorts it; you only check what is unclear.'), 'import'],
      [t('Is my file uploaded?'), t('Files are read here in your browser and are not uploaded. Nothing enters your ledger until you have reviewed every row.'), ''],
      [t('Can I bring my spreadsheet and my bank statements?'), t('Yes. A spreadsheet in .xlsx or .csv, with the months across the top or down the side, and bank statements in CSV or OFX. You see what was found and import only what you approve; rows you already have are flagged as possible duplicates.'), 'import'],
      [t('Can I undo an import?'), t('Yes. Imports lists each one; “Undo” takes out the transactions it brought.'), 'import'],
      [t('What are the suggestions with AI?'), t('Off unless you turn them on in Settings, under Imports. Then the review of an import can ask an AI (Claude, by Anthropic) for a category for the rows that have none; only their words are sent, without amounts, numbers or accounts.'), 'imports'],
    ]],
    ['plan', 'calendar', t('Plan and limits'), [
      [t('What is still to pay?'), t('The Plan has your fixed costs, their due day and a reminder before each one.'), 'due'],
      [t('How do I mark a bill as paid?'), t('In the Plan, a bill’s button marks it paid with its planned amount, or records what you really paid.'), 'due'],
      [t('How do I set a spending limit?'), t('Choose a category and how much a month. Dorax lets you know at 80% and if you go over.'), 'limit'],
      [t('What does “You can spend” mean?'), t('How much you can spend a day until your next pay day, or the month’s end, once what is still to pay is set aside. When the money is not enough, it says how much is missing.'), 'month'],
    ]],
    ['goals', 'flag', t('Goals and savings'), [
      [t('When do I reach my goal?'), t('Each goal says how much to set aside a month and the month you get there.'), 'goal'],
      [t('What is the difference between a goal and a fund?'), t('A goal has an amount and a date; a fund grows with no date'), 'goal'],
      [t('Where is the money of my goals?'), t('Your goals are plans; the real money is in your savings accounts.') + ' ' + t('Accounts & savings shows, account by account, which goals each one holds.'), 'accounts'],
      [t('How many months could I live without income?'), t('Days of freedom, in the Summary: your emergency fund in days and months.'), 'runway'],
      ...(UI.session && UI.space === 'business' ? [] : [[t('How do I get out of debt?'), t('The Journey: write your debts, do short sprints and see the month you are free.'), 'debt']]),
    ]],
    ['reports', 'chart', t('Reports'), [
      [t('Where does my money go?'), t('Reports shows your largest spending by category, month against month.'), 'where'],
      [t('What do the reports count?'), t('Reports are generated from transactions each time you open them. Transfers between your own accounts and all company accounts are excluded.'), 'where'],
    ]],
    ['notify', 'bell', t('Reminders and notifications'), [
      [t('How do I choose my reminders and notifications?'), t('In Settings, under Notifications: what, how early, and the tips.'), 'notify'],
      [t('How do reminders reach me?'), t('In the app, by email and, if you turn them on, as notifications on your phone or computer. You can also download a calendar file with every due day.'), 'notify'],
      [t('Notifications do not arrive on my iPhone'), t('On an iPhone they arrive once Dorax is on the home screen: open it in Safari, Share, “Add to Home Screen”, and turn them on from there.'), 'notify'],
    ]],
    ['safe', 'shield', t('Security and privacy'), [
      [t('Is my data safe?'), t('No ads and no data sold. Add a PIN, Face ID or fingerprint in Settings, under Security; hide the amounts with the eye.'), 'safe'],
      [t('How do I lock the app?'), t('In Settings, under Security: a PIN, and Face ID or fingerprint where the device has them. Each device keeps its own.'), 'safe'],
      [t('Where is my data, and can I delete it?'), t('In your account, on Dorax’s server, the same on every device. In Settings you can download a backup, delete all your data or delete the account.'), 'data'],
      [t('Does Dorax give financial advice?'), t('No. Dorax organises your own numbers. It gives no financial, tax or investment advice, does not tell you what to buy, sell or save, and does not replace an accountant. Investment figures are a record of what you typed, not market values.'), ''],
    ]],
    ['company', 'briefcase', t('Company'), [
      [t('How do I keep the company apart from home?'), UI.session && hasCompany() ? t('The button with two arrows switches sides: the two never mix.') : t('Open a company account: its money has its own side and never mixes with home.'), 'sides'],
      [t('How does the bank statement converter work?'), t('You choose the statement as your bank gives it (CSV, Excel, PDF and the other usual formats), confirm what was read, and download an OFX file whose format was checked. A scanned PDF, which is a picture, cannot be read. Nothing is sent to your accountant for you. Files made this way were imported in Contabilizei in October 2026 without errors; that is our own test, not a statement by Contabilizei.'), ''],
      [t('Can I stop using the company’s side?'), t('Yes: in Settings, under Your data, “I no longer have a company”.') + ' ' + t('Its side leaves the app and its reminders stop. Nothing is deleted.'), 'data'],
    ]],
    ['account', 'user', t('Your account'), [
      [t('How do I change my email or my password?'), t('In your Profile: a new email gets a confirmation link before it changes; the password is changed there too.'), 'profile'],
      [t('How do I change the language or the currency?'), t('In Settings, under General. The currency is the one your totals, plan and goals are counted in; accounts in another currency are shown apart and nothing is converted.'), 'general'],
      [t('Does it work outside Brazil?'), t('The plan, the fixed costs and the goals work anywhere, and the main currency can be reais, dollars, euros or Cuban pesos. Investments are built for Brazilian FIIs and the converter for Brazilian accounting.'), ''],
      [t('How do I delete my account?'), t('In your Profile, “Delete my account” removes it with everything in it, and it cannot be undone: download a backup first, in Settings, under Your data.'), 'profile'],
    ]],
  ];
}
/** The answers that match what is typed (in the question or the answer, without accents or case); every one with nothing typed. */
function helpFound(q) {
  const k = normalizeText(q || '').trim();
  return helpTopics().map(([id, ic, name, qs]) => [id, ic, name, k ? qs.filter(([a, b]) => normalizeText(a + ' ' + b).includes(k)) : qs]).filter(x => x[3].length);
}
/** The questions asked most, on the center's first page (by their English text, in this order). */
const HC_TOP = ['How do I start?', 'Do I have to connect my bank?', 'How do I bring my bank statement?', 'How do I set a spending limit?', 'Notifications do not arrive on my iPhone'];
/** Words people look for, offered under the search: each finds answers in every language. */
const hcHints = () => [t('limit'), 'PIN', 'OFX', 'iPhone'];
const hcTopicNow = () => (UI.hcTopic && helpTopics().find(x => x[0] === UI.hcTopic)) || null;
/** What each topic holds, said the way the home page's bento says things: its name, then what is inside. */
const HC_SAY = {
  start: 'What Dorax is, how to start, whether it is free and whether it works on your phone.',
  money: 'Adding an account, writing down an expense quickly, transfers and hiding the amounts.',
  import: 'Bringing your bank statement or your spreadsheet, undoing an import and the suggestions with AI.',
  plan: 'What is still to pay, marking a bill as paid, spending limits and “You can spend”.',
  goals: 'When you reach your goal, goals and funds, days of freedom and getting out of debt.',
  reports: 'Where your money goes and what the reports count.',
  notify: 'Which reminders you get, how they reach you and what to do on an iPhone.',
  safe: 'Your data, the PIN or Face ID, deleting your data and why Dorax gives no advice.',
  company: 'Home and company kept apart, the converter from statements to OFX and leaving the company’s side.',
  account: 'Email, password, language, currency and deleting the account.',
};
const HC_WIDE = ['start', 'company'];
/** A question that opens its answer in place, as on the home page (it slides open: app/motion.js); in a list of several topics, with its topic's
    name above it; opened from the app, the way to its place there. */
function hcQ([q, a, go], topic) {
  const there = UI.session && go && HELP_GO[go] ? `<button type="button" class="l2-btn forest sm" data-a="help-go" data-v="${go}">${t('Show me')}${icon('right')}</button>` : '';
  return `<details class="hc-q"${UI.helpQ ? ' open' : ''}><summary><span class="hc-qt">${topic ? `<small>${esc(topic)}</small>` : ''}<span>${esc(q)}</span></span><span class="l2-pm" aria-hidden="true">${icon('plus')}</span></summary><div class="hc-a"><p>${esc(a)}</p>${there}</div></details>`;
}
const hcQs = (rows, tags) => `<div class="l2-faq hc-qs">${rows.map(([r, topic]) => hcQ(r, tags ? topic : '')).join('')}</div>`;
const hcCount = n => tn(n, '1 question', '{n} questions');
/** A topic: a card of the home page's bento, its name and what it holds, and how many questions. */
const hcCard = ([id, ic, name, qs]) => `<button type="button" class="hc-bx${HC_WIDE.includes(id) ? ' wide' : ''}${id === 'company' ? ' dark' : ''}" data-a="hc-topic" data-v="${id}">${id === 'company' ? '<span class="l2-glow" aria-hidden="true"></span>' : ''}
  <span class="hc-bx-ic" aria-hidden="true">${icon(ic)}</span><span class="hc-bx-go">${hcCount(qs.length)}${icon('right')}</span><span class="hc-bt"><span>${esc(name)}.</span> ${esc(t(HC_SAY[id]))}</span></button>`;
const hcLinkBtn = (a, label, v) => `<button type="button" class="linkbtn hc-lk" data-a="${a}"${v ? ` data-v="${v}"` : ''}>${label}</button>`;
/** What follows the top: what was found for the search; a topic's questions; or the topics and the questions asked most. Drawn again alone while
    the search is typed (HELP_CENTER_CHANGES), so the field keeps its focus. */
function hcBody() {
  const q = (UI.helpQ || '').trim(), topics = helpTopics();
  if (q) {
    const rows = helpFound(q).flatMap(([, , name, qs]) => qs.map(r => [r, name]));
    return `<section class="l2-sec hc-tight"><div class="l2-wrap l2-faq-grid">
      <div class="l2-faq-l">${l2Eyebrow(t('Search'))}<h2 class="l2-h2" id="hc-res-h">${esc(rows.length ? tn(rows.length, '1 answer for “{q}”', '{n} answers for “{q}”', { q }) : t('Nothing found for “{q}”.', { q }))}</h2>
        <p class="l2-sub">${rows.length ? t('Open a question to read the answer.') : t('Try other words, or pick a topic.')} ${hcLinkBtn('hc-home', t('See all topics'))}</p></div>
      ${rows.length ? hcQs(rows, true) : `<div class="hc-none"><b>${esc(t('Nothing found for “{q}”.', { q }))}</b><p>${t('Try other words, or write to us: a person reads it.')}</p></div>`}</div></section>`;
  }
  const tp = hcTopicNow();
  if (tp) return `<section class="l2-sec hc-tight"><div class="l2-wrap l2-faq-grid hc-tgrid">
      <div class="l2-faq-l hc-tl"><div class="hc-th">${l2Eyebrow(hcCount(tp[3].length))}<h2 class="l2-h2">${esc(t('Questions about {topic}', { topic: tp[2].toLocaleLowerCase(S.settings.lang) }))}</h2></div>
        <nav class="hc-to" aria-labelledby="hc-to-h"><p class="l2-sub" id="hc-to-h">${t('Other topics:')}</p><div class="hc-others">${topics.filter(x => x[0] !== tp[0]).map(([id, , name]) => `<button type="button" class="l2-link" data-a="hc-topic" data-v="${id}">${esc(name)}</button>`).join('')}</div></nav></div>
      <div class="hc-topic-qs">${hcQs(tp[3].map(r => [r]), false)}</div></div></section>`;
  const all = topics.flatMap(([, , name, qs]) => qs.map(r => [r, name])), top = HC_TOP.map(k => all.find(([r]) => r[0] === t(k))).filter(Boolean);
  const form = UI.session ? hcLinkBtn('contact', t('Write to Dorax')) : `<a class="linkbtn" href="${PAGES.href('contact')}" data-a="pub-go" data-v="contact">${t('contact form')}</a>`;
  return `<section class="l2-sec l2-white"><div class="l2-wrap">
      <div class="l2-sec-h">${l2Eyebrow(t('Topics'))}<h2 class="l2-h2" id="hc-tp-h">${t('All of Dorax, in ten topics.')}</h2></div>
      <div class="hc-bento">${topics.map(hcCard).join('')}</div></div></section>
    <section class="l2-sec"><div class="l2-wrap l2-faq-grid">
      <div class="l2-faq-l">${l2Eyebrow(t('Most asked'))}<h2 class="l2-h2">${t('The usual questions')}</h2>
        <p class="l2-sub">${t('Not there?')} ${UI.session ? form + '.' : t('Use the {form}. It works without logging in.', { form })}</p></div>
      ${hcQs(top, false)}</div></section>`;
}
/** The top: the website's bar (landing.view.js, l2Bar), then, centred, the title and the search. */
function hcTop() {
  const tp = hcTopicNow(), nav = l2Bar('help');
  const search = `<div class="hc-search" role="search">${icon('search')}<label class="sr" for="hc-q">${t('Search the help')}</label><input type="search" id="hc-q" value="${esc(UI.helpQ || '')}" placeholder="${esc(t('Search: limit, import, PIN…'))}" autocomplete="off" enterkeyhint="search" data-c="help-q" data-live="1"><button type="button" class="hc-clear" data-a="hc-clear" aria-label="${esc(t('Clear the search'))}"${UI.helpQ ? '' : ' hidden'}>${icon('x')}</button></div>`;
  const copy = tp ? `<button type="button" class="l2-btn white sm hc-back" data-a="hc-home">${icon('left')}${t('Help center')}</button>
      <h1 class="l2-h1" id="hc-title" tabindex="-1">${esc(tp[2])}.</h1><p class="l2-lead">${esc(t(HC_SAY[tp[0]]))}</p>${search}`
    : `${l2Eyebrow(t('Help center'))}<h1 class="l2-h1" id="hc-title" tabindex="-1">${t('Have a question?')} <span class="hl">${t('Here’s the answer.')}</span></h1>
      <p class="l2-lead">${t('Short answers about Dorax, by topic. Search for a word or pick a topic.')}</p>${search}
      <p class="l2-trust hc-hints">${t('Often searched:')}${hcHints().map(w => `<button type="button" class="hc-hint" data-a="hc-find" data-v="${esc(w)}" aria-pressed="${UI.helpQ === w}">${esc(w)}</button>`).join('')}</p>`;
  return `<header class="l2-top"><div class="l2-wrap">${nav}<section class="hc-hero"><div class="l2-copy">${copy}</div></section></div></header>`;
}
/** The page, at /ajuda: before login, and over the app when it is opened from there (UI.webHelp). */
function viewHelpPublic() {
  const app = !!UI.session;
  const write = app ? `<button type="button" class="l2-btn lime lg" data-a="contact">${icon('mail')}${t('Write to Dorax')}</button>` : `<a class="l2-btn lime lg" href="${PAGES.href('contact')}" data-a="pub-go" data-v="contact">${icon('mail')}${t('Write to Dorax')}</a>`;
  return `<div class="lp2 web-page hc2 hc-pub">${hcTop()}
    <main><div id="hc-body" aria-live="polite">${hcBody()}</div>
      <section class="l2-pj hc-write"><div class="l2-wrap"><div class="l2-sec-h light">${l2Eyebrow(t('Contact'), true)}<h2 class="l2-h2">${t('Didn’t find your answer?')}</h2><p class="l2-sub">${t('Write to us: a person reads it.')}</p></div>
        <div class="hc-write-go">${write}${app ? '' : `<p>${t('It works without logging in.')}</p>`}</div></div></section>
      ${app ? '' : `<section class="l2-end"><div class="l2-wrap"><div class="l2-end-box"><h2 class="l2-h2">${t('Make sense of the numbers you have.')}</h2><div class="l2-end-r">${l2Go('forest lg')}<p>${t('Free')} · ${t('No card')}</p></div></div></div></section>`}</main>
    ${l2Foot(app)}</div>`;
}
/** A topic or the first page: drawn, at the top, its title in focus. Before login it is a step the browser's Back can undo (ui/pages.js). */
function hcShow(topic, step) {
  UI.hcTopic = topic; UI.helpQ = '';
  if (step && !UI.session && PAGES.on) try { history.pushState({ hc: topic }, '', location.href); } catch (e) { /* a frame that may not change its history */ }
  renderNow(); window.scrollTo(0, 0); if (typeof enterView === 'function') enterView();
  const h = $('hc-title'); if (h) h.focus({ preventScroll: true });
}
/** The sheet drawn again for what is searched, and the word under the search that is being looked for, marked. */
function hcRedraw() {
  const b = $('hc-body'); if (b) b.innerHTML = hcBody();
  document.querySelectorAll('.hc-hint').forEach(h => h.setAttribute('aria-pressed', String(h.dataset.v === UI.helpQ)));
  const c = document.querySelector('.hc-clear'); if (c) c.hidden = !UI.helpQ;
}
const HELP_CENTER_CHANGES = {
  /** The search, as it is typed: only the sheet is drawn again, so the field keeps its focus and its cursor. */
  'help-q'(el) { UI.helpQ = el.value; hcRedraw(); },
};
