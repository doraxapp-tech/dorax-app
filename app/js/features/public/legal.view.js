/* Dorax Finance — public pages: privacy policy and terms (drafts). */
// ---------- privacy policy and terms: drafts ----------
// Written for the product as it will launch (owner's decisions of 2026-10-02): data on a server for every account, login by password or Google (v39; an emailed link before),
// reminders by email, payments through Stripe, monthly and yearly plans, a contact form, the owner responsible as a person.
// Whatever only the owner or a lawyer can supply is a PLACEHOLDER. Both texts wait for a lawyer's review before launch.
function legalDoc(kind) {
  const ph = text => placeholder(text), form = `<button class="linkbtn" data-a="${UI.session ? 'contact' : 'pub-go'}" data-v="contact">${t('contact form')}</button>`;
  if (kind === 'privacy') return { title: t('Privacy policy'), sections: [
    [t('Who is responsible'), [t('Dorax is run by a person, not a company.'), ph(t('Full name of the person responsible for Dorax, and the identification and address the law requires.')), t('Questions and requests about your data go through the {form}, which works without logging in.', { form })]],
    [t('What is kept'), [t('What you type or import: your name, your email, your language, accounts, transactions, fixed costs, income, goals, investments, rules and settings.'), t('It is kept on a server, linked to your account, so that it opens on any device you log in from.'), t('Your password is not kept as you typed it: only a scrambled form of it, which cannot be turned back into the password.'), t('Messages you send through the contact form, with the email you give for the answer.'), t('If you turn on notifications on a phone or computer: the address your browser gives for that device, so that messages can be sent to it. It is removed when you turn them off there or log out there.')]],
    [t('What it is used for'), [t('To show you your own numbers, to send you the emails described below, and to charge a paid plan if you choose one.'), ph(t('For the owner to confirm in writing: that your data is not sold and not used for advertising, and whether any tool measures how the site is used.'))]],
    [t('Files you bring in'), [t('Spreadsheets and statements are opened in your browser to be read. The file itself is not uploaded. Only the rows you accept become part of your data.')]],
    [t('Others involved'), [t('Payments are handled by Stripe. Dorax does not receive or keep your card details.'), t('If you log in with Google, Google tells Dorax your name and your email address. Dorax asks for nothing else from your Google account and never sees your Google password.'), ph(t('The companies used for hosting, the database, logging in and sending email: their names, what each one receives and in which country it is kept. And whether the typefaces are loaded from Google Fonts or served by the site.')), ph(t('The safeguards for data that is kept outside Brazil.'))]],
    [t('Emails and reminders'), [t('Dorax sends you the emails your account needs (confirming your address, choosing a new password) and the reminders you switched on: bills before their due day, savings to hand out, statements for the accountant, the monthly summary. Each kind of reminder can be switched off in your profile.'), t('Reminders reach you in the app, by email and, on the devices where you turned them on, as notifications. Reminder emails have their own switch in your profile. A notification travels through the service of your browser’s maker (Google, Apple, Mozilla or Microsoft), encrypted so that only your device can read it.'), t('The calendar file is created on your device; what your calendar app does with it is covered by that app’s own policy.')]],
    [t('Cookies'), [t('A cookie keeps you logged in.'), ph(t('Any other cookie, if one is used.'))]],
    [t('How long it is kept, and how to erase it'), [t('Until you erase it. “Delete all data” removes your financial data, and “Delete my account” removes the account with everything in it.'), ph(t('How long copies and payment records are kept after an account is deleted.'))]],
    [t('Your rights'), [t('Brazil’s data protection law (LGPD, Lei 13.709/2018, article 18) gives you the right to know what is held about you, to see it, correct it, take it with you and have it erased. Most of that you do yourself in the app: everything is on screen, every field can be edited, Settings downloads a backup and your profile deletes the account. For anything else, use the {form}.', { form })]],
    [t('When this changes'), [t('When this policy changes, the date at the top changes.')]],
  ] };
  return { title: t('Terms of use'), sections: [
    [t('What Dorax is'), [t('A tool to organise information about your own money: a monthly plan, bills and their due days, savings goals, a record of your FIIs, and a converter from bank statements to OFX files.')]],
    [t('What Dorax is not'), [t('It is not financial, tax, accounting or investment advice, and it recommends nothing: not what to buy, sell, save or pay. Figures about investments are a record of what you typed.')]],
    [t('Your numbers, your responsibility'), [t('Every figure comes from what you type or import. Check them before you rely on them, above all before sending a file to your accountant or using a figure in a tax return.'), t('An OFX file is built from the statement you chose and checked for format. What you send to your accounting platform, and when, remains your decision.')]],
    [t('Your account and your data'), [t('You log in with your email and a password, or with your Google account. Keep your password to yourself and your email account safe: whoever has either can open your account.'), t('Your data is kept on a server so that it opens on any device. You can download a backup or delete the account whenever you want.')]],
    LP_PLANS ? [t('Plans and price'), [t('Free costs R$ 0. Plus costs R$ 7,99 a month or R$ 79,90 a year. Premium costs R$ 14,99 a month or R$ 149,90 a year.'), t('A paid plan renews by itself at the end of each month or year until you cancel. Payments are handled by Stripe.'), t('You can cancel whenever you want. The plan stays active until the end of the period already paid.'),
      ph(t('Refunds. The owner’s intention is that amounts already paid are not refunded. A lawyer has to confirm how the 7-day right to withdraw from online purchases in Brazilian consumer law applies before this is written.')), ph(t('What happens to the features of a paid plan when it ends; taxes and invoices.'))]]
      : [t('Price'), [t('Dorax is free for now. No card is asked for and nothing is charged.'), ph(t('Paid plans may be offered later. How they would be priced, charged, cancelled and refunded has to be written, and reviewed by a lawyer, before any is sold.'))]],
    [t('Other companies’ names'), [t('Contabilizei, Nubank and the other names in the app belong to their owners. Dorax is independent: it is not affiliated with them and they do not endorse it.')]],
    [t('Availability'), [t('The app may change, be interrupted or stop.'), ph(t('Who provides Dorax (a person, not a company), the limits of liability, the law that applies and where disputes are settled: to be written by a lawyer.'))]],
    [t('Contact'), [t('Use the {form}. It works without logging in.', { form })]],
  ] };
}
function legalBody(kind) {
  const d = legalDoc(kind);
  return `${banner('warn', `<b>${t('Draft.')}</b> ${t('Not reviewed by a lawyer yet. What only the owner or a lawyer can supply is marked PLACEHOLDER.')}`)}
    <p class="lp-meta left"><span>${t('Draft of {date}', { date: `<time datetime="${LP_REVIEWED}">${fmt.date(LP_REVIEWED, true)}</time>` })}</span></p>
    ${d.sections.map(([h, ps], i) => `<section><h2>${i + 1}. ${h}</h2>${ps.map(x => `<p>${x}</p>`).join('')}</section>`).join('')}`;
}
function viewLegal(kind) {
  const other = kind === 'privacy' ? 'terms' : 'privacy';
  return `<main class="legal"><div class="legal-page"><div class="legal-top"><button class="btn ghost sm auth-back" data-a="pub-go" data-v="${UI.pub.back || 'landing'}">${icon('left')}${UI.pub.back ? t('Back') : t('Home')}</button>${brandMark(true)}</div>
    <h1 id="legal-title" tabindex="-1">${legalDoc(kind).title}</h1>${legalBody(kind)}
    <p class="legal-foot"><button class="linkbtn" data-a="pub-go" data-v="${other}">${legalDoc(other).title}</button> · <button class="linkbtn" data-a="pub-go" data-v="contact">${t('Contact')}</button> · <button class="linkbtn" data-a="pub-go" data-v="landing">${t('Home')}</button></p></div></main>`;
}
