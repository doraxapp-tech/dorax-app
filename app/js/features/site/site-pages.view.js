/* Dorax Finance — the website's pages before launch (v211; owner, 2026-10-13: "crea las páginas necesarias para antes del lanzamiento", from the
   list of pages still missing):
     /para-pj                    for people with a company (PJ or MEI): the two sides, what the company's side has, how it works, questions;
     /conversor-de-extrato-ofx   the bank statement converter (owner: never named after one bank or one accounting platform; for the company's
                                 side; on a computer): what it reads, the three steps, why the file is safe, questions;
     /sobre                      what Dorax is, what it does and does not do, your data, who answers.
   All three are made of the home page's parts (.lp2, css/public/landing-v2.css; the bar and the footer: landing.view.js): the centred title with its
   second line in forest, eyebrows with the lime dot, the forest band, the mint panel of steps, the dark cards, the two-column questions, the lime
   closing box. Every sentence says what the app does today (checked against the code on 2026-10-13). Styles: css/screens/site-pages.css.
   The page that does not exist (404) is a file of its own: app/404.html. */

/** The top of a page: the bar, then centred, the eyebrow, the title (its second line in forest), the lead, the way in, a line of trust. */
function siteTop(cur, eyebrow, title1, title2, lead, more, trust) {
  return `<header class="l2-top"><div class="l2-wrap">${l2Bar(cur)}<section class="st-hero"><div class="l2-copy">${l2Eyebrow(eyebrow)}
      <h1 class="l2-h1" id="st-title" tabindex="-1">${title1} <span class="hl">${title2}</span></h1>
      <p class="l2-lead">${lead}</p>
      <div class="l2-cta">${l2Go('lime lg')}${more || ''}</div>
      <p class="l2-trust">${trust}</p></div></section></div></header>`;
}
/** A button to a part of the same page, as the home page's "How it works". */
const siteJump = (id, label) => `<button class="l2-btn white lg" data-a="pub-scroll" data-id="${id}">${label}${icon('right')}</button>`;
/** Cards with an icon, a name and a sentence: light on a white band, or dark (the home page's trust cards). */
const siteCards = (rows, dark) => `<div class="st-cards${dark ? ' dark' : ''}">${rows.map(([ic, title, text]) => `<div class="${dark ? 'l2-tc' : 'st-card'}"><span class="${dark ? 'l2-tc-ic' : 'st-ic'}">${icon(ic)}</span><h3>${title}</h3><p>${text}</p></div>`).join('')}</div>`;
/** The steps: the home page's mint panel, its words at the left. */
const siteSteps = (id, eyebrow, title, sub, rows) => `<section class="l2-sec" id="${id}"><div class="l2-wrap"><div class="l2-steps">
    <div class="l2-steps-l">${l2Eyebrow(eyebrow)}<h2 class="l2-h2">${title}</h2><p class="l2-sub">${sub}</p></div>
    <ol class="l2-steps-r">${rows.map(([ic, name, text], i) => `<li class="l2-st s${i + 1}"><span class="l2-st-c">${icon(ic)}</span><span class="l2-st-p"><b>${i + 1}. ${name}</b><span>${text}</span></span></li>`).join('')}</ol></div></div></section>`;
/** Questions: the home page's two columns, the title held at the left. */
const siteFaq = (title, rows) => `<section class="l2-sec"><div class="l2-wrap"><div class="l2-faq-grid">
    <div class="l2-faq-l">${l2Eyebrow(t('Questions'))}<h2 class="l2-h2">${title}</h2><p class="l2-sub">${t('Use the {form}. It works without logging in.', { form: `<a class="linkbtn" href="${PAGES.href('contact')}" data-a="pub-go" data-v="contact">${t('contact form')}</a>` })}</p></div>
    <div class="l2-faq">${rows.map(([q, a]) => `<details><summary>${q}<span class="l2-pm">${icon('plus')}</span></summary><p>${a}</p></details>`).join('')}</div></div></div></section>`;
const siteEnd = title => `<section class="l2-end"><div class="l2-wrap"><div class="l2-end-box"><h2 class="l2-h2">${title}</h2><div class="l2-end-r">${l2Go('forest lg')}<p>${t('Free')} · ${t('No card')}</p></div></div></div></section>`;
const siteFree = () => [t('How much does it cost?'), t('Yes, for now: Dorax is free, no card is asked for and nothing is charged. There are no ads and your data is not sold. Paid plans may come later; nothing is charged unless you choose one.')];

// ---------- /para-pj ----------
function viewPj() {
  return `<div class="lp2 web-page st-page">${siteTop('pj', t('For people with a company (PJ or MEI)'), t('The company pays you.'), t('Home keeps its own plan.'),
      t('When you pay yourself from your own company, home money and company money blur. In Dorax each one has its own side.'), siteJump('pj-how', t('How it works')), t('Free · No card · Your bank password is never asked for'))}
    <main>
      <section class="l2-pj"><div class="l2-wrap"><div class="l2-sec-h light">${l2Eyebrow(t('Two sides, one account'), true)}<h2 class="l2-h2">${t('Home and company, never mixed.')}</h2><p class="l2-sub">${t('Household totals, the plan and the reports count only household money.')}</p></div>
        ${l2Sides()}${l2PjList()}</div></section>
      <section class="l2-sec l2-white"><div class="l2-wrap"><div class="l2-sec-h">${l2Eyebrow(t('The company’s side'))}<h2 class="l2-h2">${t('What your company gets.')}</h2></div>
        ${siteCards([
          ['target', t('Reserve and goals'), t('The company’s reserve and its goals, apart from home’s, each with how much to set aside a month.')],
          ['repeat', t('Fixed costs in reais or dollars'), t('Accountant, software, rent: each cost with its due day and in its own currency. Nothing is converted.')],
          ['gauge', t('Its own summary'), t('What the company has, what it still pays this month and how long its reserve lasts.')],
          ['swap', t('Statements for your accountant'), t('Bank statements turned into OFX, and a list of what is still to send each month.')],
        ])}
        <p class="st-more"><a class="l2-btn forest" href="${PAGES.href('converter')}" data-a="pub-go" data-v="converter">${t('See the statement converter')}${icon('right')}</a></p></div></section>
      ${siteSteps('pj-how', t('How it works'), t('Four steps to keep them apart.'), t('From the first question to the month your accountant asks for.'), [
        ['briefcase', t('Say you have a company'), t('On the summary, answer yes to “Do you also run a company (PJ or MEI)?”. Its side opens with three short steps.')],
        ['upload', t('Add its accounts and costs'), t('The company’s accounts, its fixed costs with their due days, and its reserve.')],
        ['swap', t('Switch sides with one tap'), t('The button with two arrows switches sides: the two never mix.')],
        ['calendar', t('Close the month'), t('Turn each statement into OFX and tick it off the monthly list.')],
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
      t('For any bank and any accounting platform that asks for OFX. Bring the statement as CSV, Excel or PDF, check what was read, and download a file whose format was checked.'), siteJump('cv-how', t('How it works')), t('Free · On a computer · Read in your browser, not uploaded'))}
    <main>
      ${siteSteps('cv-how', t('How it works'), t('Three steps, one file.'), t('The converter is on the company’s side of Dorax, on a computer.'), [
        ['upload', t('Choose the statement'), t('CSV in any layout, Excel or PDF, as your bank gives it. A PDF with a password opens with it.')],
        ['list', t('Check what was read'), t('Dates, descriptions and amounts in a table. Columns Dorax has not seen before are confirmed once, and it remembers them.')],
        ['download', t('Download the OFX'), t('Its format is checked before you download it. Send it to your accountant the way you already do.')],
      ])}
      <section class="l2-trustsec"><div class="l2-wrap"><div class="l2-sec-h light">${l2Eyebrow(t('Why trust it'), true)}<h2 class="l2-h2">${t('Your statement stays with you.')}</h2></div>
        ${siteCards([
          ['lock', t('Read in your browser'), t('The statement is opened on your computer to be read. The file itself is not uploaded; your account keeps one line per conversion: the date, the file’s name and how many rows.')],
          ['bank', t('Any bank'), t('It does not depend on one bank or one accounting platform: a statement in CSV, Excel or PDF is enough.')],
          ['check', t('Tested for real'), t('Files made this way were imported in Contabilizei in October 2026 without errors; that is our own test, not a statement by Contabilizei.')],
        ], true)}</div></section>
      <section class="l2-sec"><div class="l2-wrap"><div class="st-month"><div>${l2Eyebrow(t('Every month'))}<h2 class="l2-h2">${t('The month your accountant asks for, on a list.')}</h2></div>
        <p class="l2-sub">${t('Do you send statements every month? After a conversion, Dorax asks whether to keep that account on a monthly list with a reminder.')}</p></div></div></section>
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
function viewAbout() {
  return `<div class="lp2 web-page st-page">${siteTop('about', t('About Dorax'), t('Your money, organised.'), t('Your decisions, yours.'),
      t('Dorax is a place to plan your month, pay your bills on time and see when you reach your goals: for your home, and for your company if you have one.'), '', t('Free · No card · Your bank password is never asked for'))}
    <main>
      <section class="l2-sec l2-white"><div class="l2-wrap"><div class="l2-sec-h">${l2Eyebrow(t('What Dorax does'))}<h2 class="l2-h2">${t('Your whole month, in one place.')}</h2></div>
        ${siteCards([
          ['calendar', t('A plan by pay day'), t('What comes in, what you pay and what you set aside, in one or two payments a month.')],
          ['bell', t('Bills on time'), t('Each fixed cost with its due day and a reminder before it.')],
          ['target', t('Goals with a date'), t('How much to set aside a month, and the month you get there.')],
          ['briefcase', t('Home and company apart'), t('If you have a company, its money has its own side and never mixes with home.')],
        ])}</div></section>
      <section class="l2-trustsec"><div class="l2-wrap"><div class="l2-sec-h light">${l2Eyebrow(t('What Dorax does not do'), true)}<h2 class="l2-h2">${t('Clear about its limits.')}</h2></div>
        ${siteCards([
          ['bank', t('It is not a bank'), t('It holds no money: yours stays in your bank. Dorax organises what you type or import.')],
          ['lock', t('No bank password'), t('You do not have to connect your bank. The workflow is based on information you enter and files you choose to import.')],
          ['info', t('No advice'), t('It does not tell you what to buy, sell, save or invest. It shows your numbers; you decide.')],
          ['eyeoff', t('No ads'), t('Your data is not sold or used for advertising.')],
        ], true)}</div></section>
      <section class="l2-sec"><div class="l2-wrap"><div class="st-data"><div>${l2Eyebrow(t('Your data'))}<h2 class="l2-h2">${t('You hold the key.')}</h2>
          <p class="l2-sub">${t('In your account, on Dorax’s server, the same on every device.')}</p></div>
        <ul class="st-list">${[t('Download a backup of everything whenever you want.'), t('Delete your data or your account from Settings.'), t('Your password is stored encrypted, never as you typed it.')].map(x => `<li>${l2Check()}<span>${x}</span></li>`).join('')}</ul></div></div></section>
      <section class="l2-sec l2-white"><div class="l2-wrap"><div class="l2-sec-h">${l2Eyebrow(t('Talk to us'))}<h2 class="l2-h2">${t('A person reads every message.')}</h2><p class="l2-sub">${t('Questions, ideas or something that does not work: write through the contact form, no login needed.')}</p></div>
        <div class="st-links"><a class="l2-btn forest lg" href="${PAGES.href('contact')}" data-a="pub-go" data-v="contact">${icon('mail')}${t('Write to Dorax')}</a><a class="l2-btn white lg" href="${PAGES.href('help')}" data-a="pub-go" data-v="help">${t('Help center')}</a><a class="l2-btn white lg" href="${PAGES.href('blog')}" data-a="pub-go" data-v="blog">${t('Blog')}</a></div></div></section>
      ${siteEnd(t('Make sense of the numbers you have.'))}</main>
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
