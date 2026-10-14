/* Dorax Finance — the website's pages before launch (v211; owner, 2026-10-13: "crea las páginas necesarias para antes del lanzamiento", from the
   list of pages still missing):
     /para-pj                    for people with a company (PJ or MEI): the two sides, what the company's side has, how it works, questions;
     /conversor-de-extrato-ofx   the bank statement converter (owner: never named after one bank or one accounting platform; for the company's
                                 side; on a computer): what it reads, the three steps, why the file is safe, questions;
     /sobre                      why Dorax exists: its mission, its story, what guides it, your data, who answers (rewritten in v212);
     /como-funciona              how it works: the five steps, the ways to bring your data, the company's side, questions (v212).
   Since v212 each page has its drawings (js/ui/art.js): a person over its title, a thing on each card and each step.
   All three are made of the home page's parts (.lp2, css/public/landing-v2.css; the bar and the footer: landing.view.js): the centred title with its
   second line in forest, eyebrows with the lime dot, the forest band, the mint panel of steps, the dark cards, the two-column questions, the lime
   closing box. Every sentence says what the app does today (checked against the code on 2026-10-13). Styles: css/screens/site-pages.css.
   The page that does not exist (404) is a file of its own: app/404.html. */

/** The top of a page: the bar, then centred, the eyebrow, the title (its second line in forest), the lead, the way in, a line of trust. pic: a
    person over the eyebrow (the page's own; css: .st-pic); row: people under the line of trust (the page about Dorax). */
function siteTop(cur, eyebrow, title1, title2, lead, more, trust, pic, row) {
  return `<header class="l2-top"><div class="l2-wrap">${l2Bar(cur)}<section class="st-hero"><div class="l2-copy">${pic ? `<div class="st-pic">${pic}</div>` : ''}${l2Eyebrow(eyebrow)}
      <h1 class="l2-h1" id="st-title" tabindex="-1">${title1} <span class="hl">${title2}</span></h1>
      <p class="l2-lead">${lead}</p>
      <div class="l2-cta">${l2Go('lime lg')}${more || ''}</div>
      <p class="l2-trust">${trust}</p>${row ? `<div class="st-row">${row}</div>` : ''}</div></section></div></header>`;
}
/** A button to a part of the same page, as the home page's "How it works". */
const siteJump = (id, label) => `<button class="l2-btn white lg" data-a="pub-scroll" data-id="${id}">${label}${icon('right')}</button>`;
/** Cards with a thing (js/ui/art.js), a name and a sentence: light on a white band, or dark (the home page's trust cards). */
const siteCards = (rows, dark) => `<div class="st-cards${dark ? ' dark' : ''}">${rows.map(([ic, title, text]) => `<div class="${dark ? 'l2-tc' : 'st-card'}">${artObj(ic, 'st-obj')}<h3>${title}</h3><p>${text}</p></div>`).join('')}</div>`;
/** The steps: the home page's mint panel, its words at the left; each step with its thing. */
const siteSteps = (id, eyebrow, title, sub, rows) => `<section class="l2-sec" id="${id}"><div class="l2-wrap"><div class="l2-steps">
    <div class="l2-steps-l">${l2Eyebrow(eyebrow)}<h2 class="l2-h2">${title}</h2><p class="l2-sub">${sub}</p></div>
    <ol class="l2-steps-r">${rows.map(([ic, name, text], i) => `<li class="l2-st s${i + 1}"><span class="l2-st-c">${artObj(ic, 'bare')}</span><span class="l2-st-p"><b>${i + 1}. ${name}</b><span>${text}</span></span></li>`).join('')}</ol></div></div></section>`;
/** Questions: the home page's two columns, the title held at the left. */
const siteFaq = (title, rows) => `<section class="l2-sec"><div class="l2-wrap"><div class="l2-faq-grid">
    <div class="l2-faq-l">${l2Eyebrow(t('Questions'))}<h2 class="l2-h2">${title}</h2><p class="l2-sub">${t('Use the {form}. It works without logging in.', { form: `<a class="linkbtn" href="${PAGES.href('contact')}" data-a="pub-go" data-v="contact">${t('contact form')}</a>` })}</p></div>
    <div class="l2-faq">${rows.map(([q, a]) => `<details><summary>${q}<span class="l2-pm">${icon('plus')}</span></summary><p>${a}</p></details>`).join('')}</div></div></div></section>`;
const siteEnd = title => `<section class="l2-end"><div class="l2-wrap"><div class="l2-end-box"><h2 class="l2-h2">${title}</h2><div class="l2-end-r">${l2Go('forest lg')}<p>${t('Free')} · ${t('No card')}</p></div></div></div></section>`;
const siteFree = () => [t('How much does it cost?'), t('Yes, for now: Dorax is free, no card is asked for and nothing is charged. There are no ads and your data is not sold. Paid plans may come later; nothing is charged unless you choose one.')];
/** Cards with a question and its answer, a thing over each (the page about Dorax, the page of how it works). */
const siteQs = (rows, cls) => `<div class="st-qcards${cls ? ' ' + cls : ''}">${rows.map(([ic, title, text]) => `<div class="st-qcard">${artObj(ic, 'st-obj')}<h3>${title}</h3><p>${text}</p></div>`).join('')}</div>`;

// ---------- /para-pj ----------
function viewPj() {
  return `<div class="lp2 web-page st-page">${siteTop('pj', t('For people with a company (PJ or MEI)'), t('The company pays you.'), t('Home keeps its own plan.'),
      t('When you pay yourself from your own company, home money and company money blur. In Dorax each one has its own side.'), siteJump('pj-how', t('How it works')), t('Free · No card · Your bank password is never asked for'), artFig('laptop', 'briefcase'))}
    <main>
      <section class="l2-pj"><div class="l2-wrap"><div class="l2-sec-h light">${l2Eyebrow(t('Two sides, one account'), true)}<h2 class="l2-h2">${t('Home and company, never mixed.')}</h2></div>
        ${l2HomeCo()}</div></section>
      <section class="l2-sec l2-white"><div class="l2-wrap"><div class="l2-sec-h">${l2Eyebrow(t('The company’s side'))}<h2 class="l2-h2">${t('What your company gets.')}</h2></div>
        ${siteCards([
          ['piggy-bank', t('Reserve and goals'), t('The company’s reserve and its goals, apart from home’s, each with how much to set aside a month.')],
          ['currency-circle-dollar', t('Fixed costs in reais or dollars'), t('Accountant, software, rent: each cost with its due day and in its own currency. Nothing is converted.')],
          ['hourglass-medium', t('Its own summary'), t('What the company has, what it still pays this month and how long its reserve lasts.')],
          ['file-text', t('Statements for your accountant'), t('Bank statements turned into OFX, and a list of what is still to send each month.')],
        ])}
        <p class="st-more"><a class="l2-btn forest" href="${PAGES.href('converter')}" data-a="pub-go" data-v="converter">${t('See the statement converter')}${icon('right')}</a></p></div></section>
      ${siteSteps('pj-how', t('How it works'), t('Four steps to keep them apart.'), t('From the first question to the month your accountant asks for.'), [
        ['briefcase', t('Say you have a company'), t('On the summary, answer yes to “Do you also run a company (PJ or MEI)?”. Its side opens with three short steps.')],
        ['calendar-dots', t('Add its accounts and costs'), t('The company’s accounts, its fixed costs with their due days, and its reserve.')],
        ['arrows-left-right', t('Switch sides with one tap'), t('The button with two arrows switches sides: the two never mix.')],
        ['list-checks', t('Close the month'), t('Turn each statement into OFX and tick it off the monthly list.')],
      ])}
      ${siteFaq(t('Questions from people with a company'), [
        [t('Does it work for a MEI?'), t('Yes. The company’s side is for a PJ or a MEI: its money, its costs and its goals, apart from home.')],
        [t('Does Dorax do my accounting?'), t('No. Dorax organises the company’s numbers and prepares the statements your accountant asks for. It does not file taxes and does not replace an accountant.')],
        [t('Are the files sent to my accountant?'), t('No. You download the OFX file and send it the way you already do.')],
        [t('Can I stop using the company’s side?'), t('Yes: in Settings, under Your data, “I no longer have a company”.') + ' ' + t('Its side leaves the app and its reminders stop. Nothing is deleted.')],
        siteFree(),
      ])}
      ${siteEnd(t('Home and company. One plan.'))}</main>
    ${l2Foot()}</div>`;
}

// ---------- /conversor-de-extrato-ofx ----------
function viewConverterPage() {
  return `<div class="lp2 web-page st-page">${siteTop('converter', t('Statement converter'), t('From your bank’s statement'), t('to your accountant’s OFX.'),
      t('For any bank and any accounting platform that asks for OFX. Bring the statement as CSV, Excel or PDF, check what was read, and download a file whose format was checked.'), siteJump('cv-how', t('How it works')), t('Free · On a computer · Read in your browser, not uploaded'), artFig('paper', 'file-text'))}
    <main>
      ${siteSteps('cv-how', t('How it works'), t('Three steps, one file.'), t('The converter is on the company’s side of Dorax, on a computer.'), [
        ['file-text', t('Choose the statement'), t('CSV in any layout, Excel or PDF, as your bank gives it. A PDF with a password opens with it.')],
        ['table', t('Check what was read'), t('Dates, descriptions and amounts in a table. Columns Dorax has not seen before are confirmed once, and it remembers them.')],
        ['file-arrow-down', t('Download the OFX'), t('Its format is checked before you download it. Send it to your accountant the way you already do.')],
      ])}
      <section class="l2-trustsec"><div class="l2-wrap"><div class="l2-sec-h light">${l2Eyebrow(t('Why trust it'), true)}<h2 class="l2-h2">${t('Your statement stays with you.')}</h2></div>
        ${siteCards([
          ['laptop', t('Read in your browser'), t('The statement is opened on your computer to be read. The file itself is not uploaded; your account keeps one line per conversion: the date, the file’s name and how many rows.')],
          ['bank', t('Any bank'), t('It does not depend on one bank or one accounting platform: a statement in CSV, Excel or PDF is enough.')],
          ['seal-check', t('Tested for real'), t('Files made this way were imported in Contabilizei in October 2026 without errors; that is our own test, not a statement by Contabilizei.')],
        ], true)}</div></section>
      <section class="l2-sec"><div class="l2-wrap"><div class="st-month"><div>${l2Eyebrow(t('Every month'))}<h2 class="l2-h2">${t('The month your accountant asks for, on a list.')}</h2></div>
        <div>${artObj('calendar-check', 'st-obj')}<p class="l2-sub">${t('Do you send statements every month? After a conversion, Dorax asks whether to keep that account on a monthly list with a reminder.')}</p></div></div></div></section>
      ${siteFaq(t('Questions about the converter'), [
        [t('Which files can I bring?'), t('CSV in any layout, Excel (.xlsx and .xls) and PDF with text. A scanned PDF, which is a picture, cannot be read.')],
        [t('Does it work on a phone?'), t('The converter is on a computer: a file in, a review row by row, a file out. On a phone, Dorax shows where to find it.')],
        [t('Is my statement uploaded?'), t('No. It is read in your browser. Your account keeps one line per conversion, not the file.')],
        [t('Who is it for?'), t('For people with a company (PJ or MEI): the converter is on the company’s side of Dorax.')],
        siteFree(),
      ])}
      ${siteEnd(t('Your next statement, in OFX.'))}</main>
    ${l2Foot()}</div>`;
}

// ---------- /sobre ----------
/** About Dorax (v212; owner, 2026-10-13: "la página sobre nosotros no dice nada de misión, nada de historia ... cada página tiene una intención").
    Its intention: why Dorax exists and where it comes from, so a visitor can trust it. The mission (three questions it answers), its story
    (from a household's spreadsheet to the app; only facts the owner gave: the spreadsheet, the salary in two payments, the company and its
    accountant, 2026, three languages, Brazil first; told without his name, as the website never is about him), what guides it, your data, who
    answers. Approved in the review artifact "Ilustraciones de Dorax" (2026-10-13). */
function viewAbout() {
  const story = [
    ['paper', 'table', t('A spreadsheet that planned, but never reminded'), t('A tab for each month and formulas everywhere. It worked for planning the month, but it did not say what was still to pay, did not remind you before a due day, and every year another one had to be started.')],
    ['coffee', 'coins', t('A salary that comes on two dates'), t('The salary came in two payments: the first went to savings and the last to the fixed bills. The month needed to be planned by pay day and due day, not just a record of what was already spent.')],
    ['laptop', 'briefcase', t('A company next to the household'), t('There was also a company (PJ). Its money could not mix with the household’s, and the accountant asked for the statements every month. That is where the company’s side and the statement converter came from.')],
    ['phone', 'device-mobile', t('An app for more people'), t('In 2026 the spreadsheet became Dorax: on the phone and the computer, in Portuguese, Spanish and English, free to start and made first for Brazil.')],
  ];
  return `<div class="lp2 web-page st-page">${siteTop('about', t('About us'), t('Born from a spreadsheet.'), t('Made for your month.'),      // v221 (owner, 2026-10-14: "cambia el h1 de sobre nos, ya que es el mismo que el del home page"): its own, from its story
      t('Dorax exists so that anyone knows what is still to pay this month, how long they can hold out with what they have saved and when they get to what they want. With their own numbers, in simple words.'),
      siteJump('ab-story', t('Our story')), t('Free · No card · Your bank password is never asked for'), '', ['coffee', 'phone', 'arms', 'laptop', 'hi'].map(w => artFig(w)).join(''))}
    <main>
      <section class="l2-sec l2-white" id="ab-mission"><div class="l2-wrap"><div class="l2-sec-h">${l2Eyebrow(t('Our mission'))}<h2 class="l2-h2">${t('So money stops being a question mark.')}</h2><p class="l2-sub">${t('Many people know how much they earn, but not how much is left, what is still to pay or when they can travel or change cars. Dorax answers three questions with your numbers.')}</p></div>
        ${siteQs([
          ['list-checks', t('What is still to pay?'), t('Each bill with its due day and a reminder before it. What is left to pay, in one list.')],
          ['hourglass-medium', t('How long can I hold out?'), t('Your days of freedom: how long your savings last if your income stops tomorrow.')],
          ['flag-banner', t('When do I get there?'), t('Each goal with what you set aside a month and the month you get there.')],
        ])}
        <p class="st-mission">${t('And the last word is always yours:')} <b>${t('Dorax shows your numbers; it does not tell you what to do with them.')}</b></p></div></section>
      <section class="l2-sec" id="ab-story"><div class="l2-wrap"><div class="l2-sec-h">${l2Eyebrow(t('Our story'))}<h2 class="l2-h2">${t('It started in a spreadsheet.')}</h2><p class="l2-sub">${t('Before it was an app, Dorax was a household’s finance spreadsheet. Four things turned it into what it is today.')}</p></div>
        <ol class="st-story">${story.map(([w, b, h, p], i) => `<li>${artFig(w, b)}<div class="st-mark"><span class="st-num">${i === 3 ? '2026' : i + 1}</span></div><h3>${h}</h3><p>${p}</p></li>`).join('')}</ol></div></section>
      <section class="l2-trustsec"><div class="l2-wrap"><div class="l2-sec-h light">${l2Eyebrow(t('What guides us'), true)}<h2 class="l2-h2">${t('Three ideas on every screen.')}</h2></div>
        ${siteQs([
          ['book-open', t('Simple words'), t('If something about money is hard to understand, we explain it like a friend would. That is why we write the blog.')],
          ['signpost', t('You decide'), t('Dorax shows your numbers and what would happen if you changed something. It does not tell you what to buy, sell or invest.')],
          ['bank', t('Your bank stays where it is'), t('Dorax holds no money and never asks for your bank password. It organises what you type or import.')],
        ], 'dark')}</div></section>
      <section class="l2-sec"><div class="l2-wrap"><div class="st-data"><div>${l2Eyebrow(t('Your data'))}<h2 class="l2-h2">${t('You hold the key.')}</h2>
          <p class="l2-sub">${t('In your account, on Dorax’s server, the same on every device.')}</p>
          <ul class="st-list">${[t('No ads, and your data is not sold.'), t('Download a backup of everything whenever you want.'), t('Delete your data or your account from Settings.'), t('Your password is stored encrypted, never as you typed it.')].map(x => `<li>${l2Check()}<span>${x}</span></li>`).join('')}</ul></div>
        ${artObj('key', 'st-key')}</div></div></section>
      <section class="l2-sec l2-white"><div class="l2-wrap"><div class="st-talk">${artFig('explain', 'chat-circle-dots')}${l2Eyebrow(t('Talk to us'))}<h2 class="l2-h2">${t('A person reads every message.')}</h2><p class="l2-sub">${t('Questions, ideas or something that does not work: write through the contact form, no login needed.')}</p>
        <div class="st-links"><a class="l2-btn forest lg" href="${PAGES.href('contact')}" data-a="pub-go" data-v="contact">${icon('mail')}${t('Write to Dorax')}</a><a class="l2-btn white lg" href="${PAGES.href('help')}" data-a="pub-go" data-v="help">${t('Help center')}</a><a class="l2-btn white lg" href="${PAGES.href('blog')}" data-a="pub-go" data-v="blog">${t('Blog')}</a></div></div></div></section>
      ${siteEnd(t('Your next month, with a plan.'))}</main>
    ${l2Foot()}</div>`;
}

// ---------- /como-funciona ----------
/** How Dorax works (v212; owner, 2026-10-13: "crea también una página de cómo funciona"). Its intention: for someone deciding whether to start,
    what they do on the first day and what Dorax does the rest of the month: five steps, each with its person; the three ways to bring what they
    already have; the company's side; the questions asked before starting. Every sentence says what the app does today. Approved in the review
    artifact "Ilustraciones de Dorax" (2026-10-13). */
function viewHow() {
  const steps = [
    ['hi', 'hand-waving', t('Create your account'), t('With your email and a password, or with your Google account. Free and with no card.'), [t('Email'), 'Google']],
    ['idea', 'sliders-horizontal', t('Tell Dorax your numbers'), t('How much comes in, how much you spend, how much you save and what you dream of. When you finish you already see your days of freedom and the month you reach your goal.'), [t('Income'), t('Spending'), t('Savings'), t('Your dream')]],
    ['paper', 'calendar-dots', t('Build your month'), t('Your income in one or two payments, your fixed bills with their due days and your goals. Type them, or bring them from your spreadsheet or a statement.'), [t('1 or 2 payments'), t('Due days'), t('Goals')]],
    ['phone', 'bell-ringing', t('Dorax reminds you'), t('Before each due day you get a reminder: in the app, by email and, if you turn them on, as a notification. You mark it as paid with one tap.'), [t('App'), t('Email'), t('Notification')]],
    ['win', 'flag-banner', t('Look ahead'), t('Each goal with its date, your days of freedom, and how many months sooner you get there if you set aside a little more.'), [t('Goals with a date'), t('Days of freedom'), t('What if…?')]],
  ];
  return `<div class="lp2 web-page st-page">${siteTop('how', t('How it works'), t('Your month in order.'), t('In five steps.'),
      t('What you do on the first day and what Dorax does for you the rest of the month. Without connecting your bank, on your phone or your computer.'),
      siteJump('hw-steps', t('See the steps')), t('Free · No card · Your bank password is never asked for'))}
    <main>
      <section class="l2-sec l2-white" id="hw-steps"><div class="l2-wrap"><div class="l2-sec-h">${l2Eyebrow(t('Step by step'))}<h2 class="l2-h2">${t('From your first account to your first goal.')}</h2></div>
        <ol class="st-steps">${steps.map(([w, b, h, p, say], i) => `<li class="st-step"><div class="st-step-pic">${artFig(w, b)}</div><div class="st-step-w"><span class="st-no">${t('Step {n}', { n: i + 1 })}</span><h3>${h}</h3><p>${p}</p><div class="st-say">${say.map(x => `<span>${x}</span>`).join('')}</div></div></li>`).join('')}</ol></div></section>
      <section class="l2-sec"><div class="l2-wrap"><div class="l2-sec-h">${l2Eyebrow(t('Bring what you already have'))}<h2 class="l2-h2">${t('Three ways to start.')}</h2><p class="l2-sub">${t('You see what Dorax found and import only what you approve.')}</p></div>
        ${siteQs([
          ['device-mobile', t('Type it'), t('Your accounts, income, fixed bills and goals, by hand, on your phone or your computer.')],
          ['table', t('Your spreadsheet'), t('An .xlsx or .csv, with the months across the top or down the side.')],
          ['file-text', t('A bank statement'), t('In CSV or OFX. Rows you already have are flagged as possible duplicates.')],
        ], 'white')}</div></section>
      <section class="l2-pj"><div class="l2-wrap"><div class="l2-sec-h light">${l2Eyebrow(t('If you have a company (PJ or MEI)'), true)}<h2 class="l2-h2">${t('Home and company, each on its own side.')}</h2><p class="l2-sub">${t('Answer “yes” to the company question on your summary and its side opens: its accounts, its costs and its reserve, never mixed with home.')}</p></div>
        <div class="st-pair"><div>${artObj('house', 'st-obj')}<small>${t('Household')}</small></div><i aria-hidden="true"></i><div>${artObj('briefcase', 'st-obj')}<small>${t('Company')}</small></div></div>
        <p class="st-more"><a class="l2-btn lime lg" href="${PAGES.href('pj')}" data-a="pub-go" data-v="pj">${t('See the company’s side')}${icon('right')}</a></p></div></section>
      ${siteFaq(t('Before you start'), [
        [t('Do I have to connect my bank?'), t('No. Your bank password is never asked for. You type what you want or import a file.')],
        [t('Does it work on my phone?'), t('Yes. Dorax opens in the browser of a phone or a computer, with the same account. On a phone you can add it to the home screen and open it like an app; there is nothing to download from a store.')],
        [t('Can I bring my spreadsheet and my bank statements?'), t('Yes. A spreadsheet in .xlsx or .csv, with the months across the top or down the side, and bank statements in CSV or OFX. You see what was found and import only what you approve; rows you already have are flagged as possible duplicates.')],
        siteFree(),
        [t('Does Dorax give financial advice?'), t('No. Dorax organises your own numbers. It gives no financial, tax or investment advice, does not tell you what to buy, sell or save, and does not replace an accountant. Investment figures are a record of what you typed, not market values.')],
      ])}
      ${siteEnd(t('Start with your next pay day.'))}</main>
    ${l2Foot()}</div>`;
}
/** The bar's menu on a narrower screen (landing.view.js, l2Bar): opened and closed in place, nothing else drawn again. */
function webMenu(open) {
  const m = $('web-menu'), b = document.querySelector('.web-menu-btn'); if (!m || !b) return;
  m.hidden = !open; b.setAttribute('aria-expanded', String(open));
  if (open) { const f = m.querySelector('.l2-link'); if (f) f.focus({ preventScroll: true }); }
}
// a press anywhere else, or Escape, closes it; a choice in it closes it too (pub-go draws the page again; pub-scroll stays on the page)
document.addEventListener('click', e => { const m = $('web-menu'); if (m && !m.hidden && (!e.target.closest('.web-nav') || e.target.closest('.web-menu [data-a="pub-scroll"]'))) webMenu(false); });
document.addEventListener('keydown', e => { const m = $('web-menu'); if (e.key === 'Escape' && m && !m.hidden) { webMenu(false); const b = document.querySelector('.web-menu-btn'); if (b) b.focus(); } });
const SITE_ACTIONS = {
  'web-menu'() { const m = $('web-menu'); webMenu(!!m && m.hidden); },
  /** The page on screen pressed in the bar: back to its top. */
  'web-top'() { window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' }); const h = $('st-title'); if (h) h.focus({ preventScroll: true }); },
};
