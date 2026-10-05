/* Dorax Finance — public page: the home page. */
// ---------- the home page ----------
// The pictures are the product: a phone running the app and one small graphic per feature, all built from HTML and SVG with example figures.
// They are decoration for people who can see them (aria-hidden); the heading and the paragraph next to each one say the same thing in words.
const ring = (pct, size) => { const r = 42, c = 2 * Math.PI * r; return `<svg class="ring" viewBox="0 0 100 100" width="${size}" height="${size}"><circle cx="50" cy="50" r="${r}" class="ring-bg"/><circle cx="50" cy="50" r="${r}" class="ring-fg" style="--c:${c.toFixed(1)};--o:${(c * (1 - pct / 100)).toFixed(1)}" transform="rotate(-90 50 50)"/></svg>`; };
const miniCols = (hs, hot) => `<div class="mcols">${hs.map((h, i) => `<i class="${i === hot ? 'hot' : ''}" style="--h:${h}%;--i:${i}"></i>`).join('')}</div>`;
function lpPhone() {
  const rows = [
    [t('Rent'), 'R$ 1.800', `<span class="chip good"><i></i>${t('Paid')}</span>`],
    [t('Internet'), 'R$ 110', `<span class="chip info"><i></i>${tn(3, 'Due in {n} day', 'Due in {n} days')}</span>`],
    [t('Electricity'), 'R$ 180', `<span class="chip">${t('To pay')}</span>`],
    [t('Gym'), 'R$ 100', `<span class="chip">${t('To pay')}</span>`],
  ];
  return `<div class="phone"><div class="ph-screen">
      <div class="ph-status"><b>9:41</b><span class="ph-island"></span><span class="ph-sig"><i></i><i></i><i></i><i></i></span></div>
      <div class="ph-bar"><span class="ph-name">dorax</span><span class="ph-ico">${icon('bell')}<em>1</em></span><span class="ph-ico lit">${icon('plus')}</span></div>
      <div class="ph-title"><b>${t('Plan')}</b><span>${mon(9, true)}</span></div>
      <div class="ph-card"><span>${t('Still to pay')}</span><b>R$ 390</b>${miniCols([62, 58, 70, 64, 74, 30], 5)}</div>
      <div class="ph-list">${rows.map(([name, amount, chip]) => `<div><span><b>${name}</b>${chip}</span><span class="num">${amount}</span></div>`).join('')}</div>
      <div class="ph-tab">${['grid', 'list', 'calendar', 'briefcase', 'more'].map((ic, k) => `<span class="${k === 2 ? 'on' : ''}">${icon(ic)}</span>`).join('')}</div></div></div>`;
}
function lpStage() {
  return `<div class="lp-stage" role="img" aria-label="${t('Example of the app on a phone: the bills of the month, what is still to pay, a reminder and a goal.')}">
    <div class="lp-floats left" aria-hidden="true">
      <div class="lp-float"><span class="fl-ico">${icon('bell')}</span><div><small>${t('Reminder')}</small><b>${t('Internet')} · ${tn(3, 'in {n} day', 'in {n} days')}</b><span class="num">R$ 110</span></div></div>
      <div class="lp-float"><span class="fl-ico">${icon('upload')}</span><div><small>${t('Your spreadsheet')}</small><b>.xlsx → ${t('Plan')}</b><span class="fl-cells"><i></i><i></i><i></i><i class="bad"></i><i></i><i></i><i></i><i></i></span></div></div></div>
    <div aria-hidden="true">${lpPhone()}</div>
    <div class="lp-floats right" aria-hidden="true">
      <div class="lp-float goal">${ring(68, 64)}<div><small>${t('Goal')}</small><b>${t('Trip')}</b><span class="num">68%</span></div></div>
      <div class="lp-float"><span class="fl-ico">${icon('trend')}</span><div><small>FIIs</small><b>${t('Income received')}</b>${miniCols([30, 42, 40, 58, 66, 84], 5)}</div></div></div></div>`;
}
/** The entrepreneurs section: four small graphics, one idea each. One green for what is the household's, grey for the rest; text in ink, never in the data colour;
    two series always carry a key. They illustrate (the caption under each says the same in words), so they are hidden from screen readers. */
function pjGraphic(kind) {
  const key = (cls, label, value) => `<span><i class="k ${cls}"></i>${label}${value ? `<b class="num">${value}</b>` : ''}</span>`;
  if (kind === 'split') return `<div class="pjg pjg-split" aria-hidden="true">
      <div class="sp-brace"><span style="flex:82"><em>${t('Household figures')}</em></span><span style="flex:184"></span></div>
      <div class="sp-bar"><i class="home" style="flex:82"></i><i style="flex:184"></i></div>
      <div class="pjg-key">${key('home', t('Household'), 'R$ 8.200')}${key('', t('Company (PJ)'), 'R$ 18.400')}</div></div>`;
  if (kind === 'income') { const need = 6.9, top = 11, months = [[4, 7.2], [5, 9.1], [6, 6.4], [7, 8.2], [8, 10.5], [9, 8.2]];
    return `<div class="pjg pjg-income" aria-hidden="true">
      <div class="in-cols">${months.map(([m, v], k) => `<div style="--i:${k}"><span class="stack">${v > need ? `<i class="home" style="height:${((v - need) * 100 / top).toFixed(1)}%"></i>` : ''}<i style="height:${(Math.min(v, need) * 100 / top).toFixed(1)}%"></i></span><small>${mon(m)}</small></div>`).join('')}</div>
      <div class="pjg-key">${key('home', t('Left over'))}${key('', t('Fixed costs and savings'))}</div></div>`; }
  if (kind === 'days') { const at = d => ((d - 1) * 100 / 29).toFixed(1);
    return `<div class="pjg pjg-days" aria-hidden="true">
      <div class="dy-track">${[5, 10, 15, 20, 28].map(d => `<i class="bill" style="left:${at(d)}%"></i>`).join('')}${[12, 26].map(d => `<i class="pay" style="left:${at(d)}%"></i>`).join('')}</div>
      <div class="dy-axis">${[1, 10, 20, 30].map(d => `<span style="left:${at(d)}%">${d}</span>`).join('')}</div>
      <div class="pjg-key">${key('home dot', t('A bill is due'))}${key('sq', t('A client pays'))}</div></div>`; }
  return `<div class="pjg pjg-close" aria-hidden="true">
      <div class="cl-h"><small>${t('Statements')} · ${mon(8, true)}</small><b>${t('{sent} of {total} sent', { sent: 2, total: 3 })}</b></div>
      <div class="cl-meter"><i class="home"></i><i class="home"></i><i></i></div>
      <div class="cl-conv"><span class="f">.csv</span><span class="ill-arrow"><i></i>${icon('right')}</span><span class="f ok">.ofx${icon('check')}</span></div></div>`;
}
/** One small graphic per feature. */
function lpIll(kind) {
  const check = `<span class="tick">${icon('check')}</span>`;
  if (kind === 'sheet') return `<div aria-hidden="true" class="ill ill-sheet"><div class="mini-sheet"><div class="hd"><span></span><span>${mon(0)}</span><span>${mon(1)}</span><span>${mon(2)}</span></div>
      ${[[t('Rent'), '1.800', '1.800', '1.800'], [t('Internet'), '110', '110', '110'], [t('Gym'), '130', '130', '100'], ['TOTAL', '2.040', '#REF!', '2.010']].map(r => `<div class="${r[0] === 'TOTAL' ? 'tot' : ''}">${r.map((c, k) => `<span class="${c === '#REF!' ? 'bad' : ''}">${k ? c : esc(c)}</span>`).join('')}</div>`).join('')}</div>
      <div class="ill-arrow"><i></i>${icon('right')}</div>
      <div class="mini-list">${[[t('Rent'), 'R$ 1.800', t('day {d}', { d: 5 })], [t('Internet'), 'R$ 110', t('day {d}', { d: 12 })], [t('Gym'), 'R$ 100', '']].map(([n, a, d], k) => `<div style="--i:${k}">${check}<b>${n}</b>${d ? `<span class="chip">${d}</span>` : ''}<span class="num">${a}</span></div>`).join('')}</div></div>`;
  if (kind === 'remind') { const marks = { 8: 'paid', 9: 'paid', 14: 'soon', 11: 'today', 24: 'due' };
    return `<div aria-hidden="true" class="ill ill-cal"><div class="mini-cal">${Array.from({ length: 28 }, (_, d) => `<i class="${marks[d] || ''}" style="--i:${d % 7}"></i>`).join('')}</div>
      <div class="mini-note"><span class="fl-ico">${icon('bell')}</span><div><b>${t('Internet')}</b><small>${tn(3, 'Due in {n} day', 'Due in {n} days')}</small></div><span class="num">R$ 110</span></div></div>`; }
  if (kind === 'pay') return `<div aria-hidden="true" class="ill ill-flow"><svg viewBox="0 0 320 170" preserveAspectRatio="none" aria-hidden="true">
      <path class="fl a" d="M70 46 C160 46 160 42 250 42"/><path class="fl b" d="M70 118 C160 118 160 112 250 112"/><path class="fl c" d="M70 132 C170 132 170 152 250 152"/></svg>
      <span class="node l" style="top:19%"><small>${t('1st payment')}</small><b class="num">R$ 3.000</b></span><span class="node l" style="top:63%"><small>${t('2nd payment')}</small><b class="num">R$ 5.200</b></span>
      <span class="node r" style="top:16%"><small>${t('Savings and goals')}</small><b class="num">R$ 3.000</b></span><span class="node r" style="top:57%"><small>${t('Fixed costs')}</small><b class="num">R$ 4.345</b></span><span class="node r sm" style="top:83%"><small>${t('Left over')}</small><b class="num">R$ 855</b></span></div>`;
  if (kind === 'goals') return `<div aria-hidden="true" class="ill ill-goals"><div class="g-ring">${ring(68, 104)}<b class="num">68%</b></div>
      <div class="g-bars">${[[t('Trip'), 68, 'R$ 6.800'], [t('Car'), 35, 'R$ 3.500'], [t('Emergencies'), 82, 'R$ 8.200']].map(([n, v, a], k) => `<div><span><b>${n}</b><span class="num">${a}</span></span><div class="meter go"><i style="width:${v}%;--i:${k}"></i></div></div>`).join('')}</div></div>`;
  if (kind === 'fii') return `<div aria-hidden="true" class="ill ill-fii"><div class="f-head"><small>${t('Income received')}</small><b class="num">R$ 63,25</b></div>
      <div class="f-chart">${miniCols([34, 40, 38, 52, 60, 66, 78, 92], 7)}<svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><polyline points="2,34 16,31 30,32 44,25 58,21 72,18 86,12 98,5"/></svg></div>
      <div class="f-axis">${[2, 3, 4, 5, 6, 7, 8, 9].map(m => `<span>${mon(m)}</span>`).join('')}</div></div>`;
  return `<div aria-hidden="true" class="ill ill-ofx"><div class="file"><b>statement.csv</b><i></i><i></i><i></i><i></i></div><div class="ill-arrow"><i></i>${icon('right')}</div>
      <div class="checks-mini">${[t('Dates'), t('Amounts'), t('Unique IDs'), t('Closing balance')].map((c, k) => `<span style="--i:${k}">${check}${c}</span>`).join('')}</div><div class="ill-arrow"><i></i>${icon('right')}</div>
      <div class="file out"><b>statement.ofx</b><i></i><i></i><i></i><span class="chip good"><i></i>${t('Format checked')}</span></div></div>`;
}

function viewLanding() {
  const compare = [
    [t('A new tab every January'), t('One button starts the year with December’s amounts')],
    [t('Colouring a cell to mark it paid'), t('One click, and you see what is due next')],
    [t('A #REF! where a total used to be'), t('Totals that add up on their own')],
    [t('Typing in how much you have saved'), t('What is saved is the sum of what you recorded')],
    [t('Opening the laptop to check one number'), t('The same thing on your phone')],
  ];
  const features = [
    ['sheet', 'wide', t('Bring your spreadsheet'), t('Choose your .xlsx or .csv. Dorax reads the tabs, shows what it found and imports only what you approve: fixed costs, income, goals, investment records and due days.')],
    ['remind', '', t('Fixed costs and due days'), t('See what still needs to be paid: every bill in one list, with its due day and whether it is paid. Dorax reminds you before a bill is due and shows when one is late.')],
    ['pay', '', t('Plan the month'), t('Give your money a job before you spend it. Set up income, fixed costs and planned savings, and see what is left of each payment, whether you are paid once or twice a month.')],
    ['goals', '', t('Savings goals'), t('Save with a destination in mind. Create goals and funds, assign planned amounts, and track progress toward targets and dates.')],
    ['fii', '', t('Investment records (FIIs)'), t('Keep your investment information with the rest of your financial picture. Record purchases, sales and income received. Dorax records what you enter; it does not tell you what to buy or sell.')],
    ['ofx', 'full', t('Bank statement converter'), t('Your accounting platform asks for OFX and your bank gives you a CSV, a spreadsheet or a PDF? Dorax turns the statement into an OFX file and checks its format before you download it. What you send to your accounting platform, and when, stays your decision.')],
  ];
  const steps = [
    [t('Add your financial information'), t('Add accounts, income, fixed costs, goals and investment records. Import a spreadsheet or statements, or type transactions by hand.')],
    [t('Build your monthly plan'), t('Define what is expected: income, fixed costs with their due days, and what goes to savings.')],
    [t('Track what actually happened'), t('Mark bills as paid, record or import transactions, and organize them into categories.')],
    [t('Review the difference'), t('Compare planned and actual amounts, read the reports and see what needs attention.')],
  ];
  const method = [
    ['coins', t('The monthly remainder'), t('Planned income minus fixed costs minus planned savings. It is calculated from your lines, never typed, and every amount is kept as whole cents so a total cannot drift.')],
    ['chart', t('Plan vs. actual'), t('Actual spending minus planned spending. A positive difference means you spent more than you planned, and only that part is shown as over.')],
    ['flag', t('Saved means recorded'), t('What a goal shows as saved is the sum of the contributions and withdrawals you recorded. It is never a number typed over.')],
    ['calendar', t('Late has one definition'), t('A bill is late when its due day has passed and that month has no payment recorded for it.')],
    ['check', t('Paid is recorded once'), t('Marking a bill as paid records an expense in the account it is paid from. If you import that statement later, the same payment is flagged as a possible duplicate instead of being counted twice.')],
    ['trend', t('Investment figures are records'), t('Position and average price come from the purchases, sales and prices you enter, using the weighted average cost (the Brazilian “preço médio”). They are records, not recommendations or market valuations.')],
  ];
  // who it is for: one list, home and company mixed (owner, v22). [icon, size, who, what they want]
  const people = [   // rows of four columns: wide + 1 + 1, 1 + 1 + wide, wide + wide
    ['grid', 'wide', t('The spreadsheet user'), t('You already track your money by hand, but keeping the sheet up takes too much time.')],
    ['calendar', '', t('The monthly planner'), t('You want to know what is coming, what is paid and what remains before the month gets away from you.')],
    ['swap', '', t('The accountant workflow user'), t('Your accounting platform asks for OFX files and your company’s bank gives you something else.')],
    ['wallet', '', t('The household manager'), t('You need one place for several accounts, recurring costs, savings goals and transactions.')],
    ['check', '', t('The one who closes the month'), t('You want one place to see which statements the accountant is still waiting for.')],
    ['flag', 'wide', t('The goal-focused saver'), t('You want savings attached to clear goals instead of being an afterthought.')],
    ['trend', 'wide', t('The investor who wants records'), t('You want your FII information organized with the rest of your finances, without being told what to buy.')],
    ['briefcase', 'wide', t('The owner with two sets of accounts'), t('You want the company’s accounts next to your own, with totals that never mix.')],
  ];
  // only for entrepreneurs (owner, v23: no cards inside a card; graphics that explain instead of paragraphs). [graphic, title, one line]. Every line is something the app does.
  const pj = [
    ['split', t('Company and home, never mixed'), t('Household totals, the plan and the reports count only household money.')],
    ['income', t('A plan for income that changes'), t('Set your income month by month and see what is left.')],
    ['days', t('Home bills do not wait for invoices'), t('Due days and reminders, whatever day a client pays.')],
    ['close', t('The month-end your accountant asks for'), t('The list of statements to send, and the bank’s file turned into OFX.')],
  ];
  const data = [
    ['x', t('No bank connection'), t('Dorax never asks for your bank login. What it knows is what you import or type.')],
    ['upload', t('Statements and spreadsheets'), t('Your files are opened in your browser to be read. The file itself is not uploaded; only the rows you accept are saved in your account.')],
    ['wallet', t('Your account'), t('Your data is saved on Dorax’s server, so your account opens on your phone and on your computer. You log in with your email and a password, or with your Google account.')],
    ['download', t('Backup and deletion'), t('Download a backup of everything from Settings, or delete the account with everything in it.')],
  ];
  // nine questions (owner, v23: "too long, condense it"). The answers that used to be separate are merged; contact and the independence line live in the footer.
  const faq = [
    [t('Does Dorax connect to my bank?'), t('No. Your bank password is never asked for. You type what you want or import a file.')],
    [t('Does Dorax give financial advice?'), t('No. Dorax organises your own numbers. It gives no financial, tax or investment advice, does not tell you what to buy, sell or save, and does not replace an accountant.')],
    [t('Can I bring my spreadsheet and my bank statements?'), t('Yes. A spreadsheet in .xlsx or .csv, with the months across the top or down the side, and bank statements in CSV or OFX. You see what was found and import only what you approve; rows you already have are flagged as possible duplicates.')],
    [t('How does the bank statement converter work?'), t('You choose the statement as your bank gives it (CSV, Excel, PDF and the other usual formats), confirm what was read, and download an OFX file whose format was checked. A scanned PDF, which is a picture, cannot be read. Nothing is sent to your accountant for you. Files made this way were imported in Contabilizei in October 2026 without errors; that is our own test, not a statement by Contabilizei.')],
    [t('Are my investment figures market values?'), t('No. Dorax does not fetch market prices. You type the price of each fund; position and average price are records of what you entered.')],
    [t('How do I log in, and how am I reminded?'), t('You log in with your email and a password, or with your Google account. Reminders come in the app and by email before each due day, and you can download a calendar file. The app sends no push notifications.')],
    [t('Where is my data, and can I delete it?'), t('In your account, on Dorax’s server, the same on every device. In Settings you can download a backup, delete all your data or delete the account.')],
    [t('How much does it cost, and can I cancel?'), t('Free costs R$ 0. Plus is R$ 7,99 a month or R$ 79,90 a year; Premium is R$ 14,99 a month or R$ 149,90 a year. Cancel whenever you want: the plan stays active until the end of the period you already paid for.')],
    [t('Does it work outside Brazil?'), t('The plan, the fixed costs and the goals work anywhere, but every amount is shown in reais (R$): other currencies are not handled. Investments are built for Brazilian FIIs and the converter for Brazilian accounting.')],
  ];
  const plans = [
    { id: 'free', name: t('Free'), price: 'R$ 0', who: t('Your month, under control.'), label: t('Create a free account'),
      items: [t('Fixed costs with their due day, and reminders in the app and by email'), t('Income in one or two payments a month'), t('Your spreadsheet brought in (.xlsx or .csv)'), t('One savings goal'), t('A calendar file with your due days'), t('A backup file of everything')] },
    { id: 'plus', name: 'Plus', price: 'R$ 7,99', year: 'R$ 79,90', who: t('Everything you follow, in one place.'), plus: t('Everything in Free, and:'),
      items: [t('As many goals and funds as you want, handed out month by month'), t('Bank statements (CSV, OFX) with duplicate detection and your own rules'), t('Reports by month and by category'), t('Investments (FIIs): position, average price and income')] },
    { id: 'premium', name: 'Premium', price: 'R$ 14,99', year: 'R$ 149,90', who: t('Home and company (PJ), together.'), plus: t('Everything in Plus, and:'),
      items: [t('Bank statement converter: CSV, Excel or PDF to OFX, checked before you download it'), t('The monthly list of statements your accounting platform is waiting for'), t('OFX profiles per account, in versions 1.0.2 and 2.2')] },
  ];
  const legalLinks = `<button class="linkbtn" data-a="pub-go" data-v="privacy">${t('Privacy policy')}</button> · <button class="linkbtn" data-a="pub-go" data-v="terms">${t('Terms of use')}</button>`;
  // one phrase for the main action everywhere on the page; the bar keeps the short "Create account"
  const cta = (cls) => `<button class="btn primary ${cls || ''}" data-a="pub-go" data-v="signup">${t('Start free')}</button>`;
  const bill = UI.lpBill === 'year' ? 'year' : 'month';
  const go = (id, label) => `<button class="lp-link" data-a="pub-scroll" data-id="${id}">${label}</button>`;
  return `<div class="lp">
  <header class="lp-nav">${brandMark()}
    <nav aria-label="${t('Sections')}"><button class="lp-link" data-a="pub-scroll" data-id="lp-what">${t('What’s inside')}</button><button class="lp-link" data-a="pub-scroll" data-id="lp-method">${t('How it calculates')}</button><button class="lp-link" data-a="pub-scroll" data-id="lp-plans">${t('Plans')}</button><button class="lp-link" data-a="pub-scroll" data-id="lp-faq">${t('Questions')}</button></nav>
    <div class="lp-actions">${langPill('lp-lang')}<button class="btn sm" data-a="pub-go" data-v="login">${t('Log in')}</button><button class="btn primary sm" data-a="pub-go" data-v="signup">${t('Create account')}</button></div></header>
  <main>
    <section class="lp-hero">${weaveHero()}<div class="lp-copy"><span class="eyebrow">${t('Personal finance, without the guesswork')}</span>
        <h1>${t('See your money.')} <span class="hl">${t('Plan what’s next.')}</span></h1>
        <p class="lead">${t('Dorax brings your income, accounts, expenses, fixed costs, savings goals, investment records and financial reports into one clear workspace, so you can understand your month without piecing together spreadsheets, notes and separate tools.')}</p>
        <div class="row">${cta('lg')}<button class="btn lg" data-a="pub-scroll" data-id="lp-how">${t('How it works')}</button></div></div>
      ${lpStage()}</section>
    <section class="lp-sec" id="lp-what"><div class="lp-sec-h"><div class="lp-sec-t"><h2>${t('One financial picture instead of five separate ones.')}</h2><p class="lead sm">${t('Dorax connects the parts of personal finance that are usually managed separately.')}</p></div></div>
      <div class="bento">${features.map(([kind, size, title, text]) => `<article class="${size}" data-reveal="f-${kind}">${lpIll(kind)}<div class="txt"><h3>${title}</h3><p>${text}</p></div></article>`).join('')}</div></section>
    <section class="lp-sec" id="lp-method"><div class="lp-sec-h"><div class="lp-sec-t"><h2>${t('How Dorax calculates what you see')}</h2><p class="lead sm">${t('Financial software should explain how its numbers work. Every figure starts with information you enter or import; these are the rules behind what you see.')}</p></div></div>
      <div class="lp-rules">${method.map(([ic, title, text], i) => `<article data-reveal="m-${i}"><span class="fl-ico">${icon(ic)}</span><h3>${title}</h3><p>${text}</p></article>`).join('')}</div>
</section>
    <section class="lp-sec" id="lp-change"><div class="lp-sec-h center"><div class="lp-sec-t"><h2>${t('Your money shouldn’t require a spreadsheet to understand.')}</h2><p class="lead sm">${t('Income in one account, bills on different days, card spending in statements, savings somewhere else. Dorax brings those pieces together, so the same information plans the month, records what happened and shows the bigger picture.')}</p></div></div>
      <div class="lp-vs" data-reveal="compare">
        <article class="vs-box old"><h3>${t('In the sheet')}</h3><ul>${compare.map(([a]) => `<li>${icon('x')}<span>${a}</span></li>`).join('')}</ul></article>
        <span class="vs-arrow" aria-hidden="true">${icon('right')}</span>
        <article class="vs-box new"><h3><i></i>${t('In Dorax')}</h3><ul>${compare.map(([, b]) => `<li>${icon('check')}<span>${b}</span></li>`).join('')}</ul>${cta()}</article></div></section>
    <section class="lp-sec" id="lp-how"><div class="lp-sec-h center"><div class="lp-sec-t"><h2>${t('How it works')}</h2><p class="lead sm">${t('A clear path from raw transactions to a usable picture of your month.')}</p></div></div>
      <ol class="lp-steps four st-path">${steps.map(([title, text], i) => `<li data-reveal="s-${i}" style="--i:${i}"><span class="st-node mono" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><div class="st-txt"><h3>${title}</h3><p>${text}</p></div></li>`).join('')}</ol>
      <p class="lp-note">${t('Nothing connects directly to your bank. The workflow is based on information you enter and files you choose to import.')}</p>
      <div class="lp-go">${cta('lg')}<button class="btn lg" data-a="pub-scroll" data-id="lp-plans">${t('See the plans')}</button></div></section>
    <section class="lp-sec" id="lp-for"><div class="lp-sec-h"><div class="lp-sec-t"><h2>${t('Built for people who want a clearer view of their own money.')}</h2><p class="lead sm">${t('Two kinds of people, and often the same person: someone running a home, and someone running a company (PJ).')}</p></div></div>
      <div class="who-bento">${people.map(([ic, size, name, text], i) => `<article class="${size}" data-reveal="w-${i}"><span class="fl-ico">${icon(ic)}</span><h3>${name}</h3><p>${text}</p></article>`).join('')}</div></section>
    <section class="lp-sec" id="lp-pj"><div class="lp-sec-h"><div class="lp-sec-t"><span class="eyebrow">${t('For entrepreneurs (PJ)')}</span><h2>${t('Your company pays you. Your home still needs its own plan.')}</h2>
        <p class="lead sm">${t('When you pay yourself from your own company, home money and company money blur. Dorax keeps both in one account, and apart.')}</p></div>
        <div class="row">${cta('lg')}<button class="btn lg" data-a="pub-scroll" data-id="lp-plans">${t('See the plans')}</button></div></div>
      <div class="pj-figs">${pj.map(([kind, title, text], i) => `<figure data-reveal="pj-${i}">${pjGraphic(kind)}<figcaption><h3>${title}</h3><p>${text}</p></figcaption></figure>`).join('')}</div>
      <p class="lp-note">${t('One account holds both. Company money never counts in the household figures.')} ${t('The company side is part of Premium.')}</p></section>
    <section class="lp-sec" id="lp-data"><div class="lp-sec-h center"><div class="lp-sec-t"><h2>${t('Your bank login isn’t required.')}</h2><p class="lead sm">${t('Dorax works from the information you enter and the files you choose to import. This is what happens to them.')}</p></div></div>
      <div class="lp-rules four">${data.map(([ic, title, text], i) => `<article data-reveal="d-${i}"><span class="fl-ico">${icon(ic)}</span><h3>${title}</h3><p>${text}</p></article>`).join('')}</div>
      <p class="lp-note">${t('How long it is kept, who can see it and how to erase it:')} ${legalLinks}</p></section>
    <section class="lp-sec" id="lp-plans"><div class="lp-sec-h center"><div class="lp-sec-t"><h2>${t('Start with the level of organization you need.')}</h2><p class="lead sm">${t('Three plans. Start with the free one and change whenever you want.')}</p></div></div>
      <div class="seg bill" role="group" aria-label="${t('Billing')}">${[['month', t('Monthly')], ['year', t('Yearly')]].map(([v, l]) => `<button data-a="lp-bill" data-v="${v}" aria-pressed="${bill === v}">${l}</button>`).join('')}</div>
      <div class="lp-plans" data-bill="${bill}">${plans.map(p => `<article class="tier ${p.id}" data-reveal="p-${p.id}"><span class="tier-glow" aria-hidden="true"></span><span class="tier-orb" aria-hidden="true"></span>
        <div class="tier-top"><span class="gem" aria-hidden="true"></span>${p.id === 'plus' ? `<span class="tier-badge">${t('Recommended')}</span>` : ''}</div>
        <div class="tier-h"><h3>${p.name}</h3></div>
        <div class="price">${p.year ? `<span class="per m"><b class="num">${p.price}</b><span>${t('a month')}</span><small>${t('or {price} a year: two months free', { price: p.year })}</small></span><span class="per y"><b class="num">${p.year}</b><span>${t('a year')}</span><small>${t('Two months free. Or {price} a month.', { price: p.price })}</small></span>` : `<span class="per"><b class="num">${p.price}</b><small>${t('No card needed')}</small></span>`}</div>
        <p class="tier-who">${p.who}</p>
        <div class="tier-f"><button class="btn ${p.id === 'plus' ? 'primary' : 'glass'}" data-a="pub-go" data-v="signup">${p.label || t('Choose {plan}', { plan: p.name })}</button></div>
        <div class="tier-sep" aria-hidden="true"><span>${t('What’s included')}</span></div>
        <ul>${p.plus ? `<li class="plus">${p.plus}</li>` : ''}${p.items.map(x => `<li>${icon('check')}<span>${x}</span></li>`).join('')}</ul></article>`).join('')}</div>
      <p class="lp-note">${t('Every account starts on Free. You choose Plus or Premium inside the app, and you can cancel whenever you want.')}</p></section>
    <section class="lp-sec lp-two" id="lp-faq"><div><h2>${t('Questions before you start')}</h2></div>
      <div class="lp-faq">${faq.map(([q, a]) => `<details><summary>${q}${icon('plus')}</summary><p>${a}</p></details>`).join('')}</div></section>
    <section class="lp-cta">${weaveEnd()}<h2>${t('Your finances are already generating the numbers. Dorax helps you make sense of them.')}</h2><p class="lead sm">${t('Bring your financial information together, build a monthly plan, track what happened and review the bigger picture, without asking a finance app to make the decisions for you.')}</p><div class="row">${cta('lg')}<button class="btn lg" data-a="pub-go" data-v="login">${t('Log in')}</button></div></section>
  </main>
  <footer class="lp-foot">
    <div class="ft-top">
      <div class="ft-brand">${brandMark(true)}<p>${t('Your money, organized clearly enough to make better decisions yourself.')}</p>
        <div class="ft-lang">${icon('globe')}${langSelect('ft-lang', true)}</div></div>
      <nav class="ft-cols" aria-label="${t('Footer')}">
        <div><h3>${t('Product')}</h3><ul><li>${go('lp-what', t('What’s inside'))}</li><li>${go('lp-method', t('How it calculates'))}</li><li>${go('lp-for', t('Who it is for'))}</li><li>${go('lp-pj', t('For entrepreneurs'))}</li><li>${go('lp-plans', t('Plans'))}</li><li>${go('lp-faq', t('Questions'))}</li></ul></div>
        <div><h3>${t('Account')}</h3><ul><li><button class="lp-link" data-a="pub-go" data-v="signup">${t('Create account')}</button></li><li><button class="lp-link" data-a="pub-go" data-v="login">${t('Log in')}</button></li></ul></div>
        <div><h3>${t('Legal')}</h3><ul><li><button class="lp-link" data-a="pub-go" data-v="privacy">${t('Privacy policy')}</button></li><li><button class="lp-link" data-a="pub-go" data-v="terms">${t('Terms of use')}</button></li><li>${go('lp-data', t('Your data'))}</li></ul></div>
        <div><h3>${t('Contact')}</h3><ul><li><button class="lp-link" data-a="pub-go" data-v="contact">${t('Contact form')}</button></li></ul></div>
      </nav></div>
    <div class="ft-bottom"><p class="lp-meta left"><span>© 2026 Dorax Finance</span><i>|</i><span>${t('Page reviewed on {date}', { date: `<time datetime="${LP_REVIEWED}">${fmt.date(LP_REVIEWED, true)}</time>` })}</span></p>
      <p class="note">${t('Dorax organises information about your own money. It is not financial, tax or accounting advice.')} ${t('Contabilizei and the banks named on this page belong to their owners. Dorax is independent of them.')}</p></div></footer></div>`;
}
