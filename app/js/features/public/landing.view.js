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

/** A piece of the app, as it is (owner, 2026-10-05, with a reference: "uses parts of the app and shows it in the home page; I want the same").
    The Plan screen behind, the "Plan vs actual" card of the dashboard in front: the app's own components and class names (tiles, card, tbl, chip,
    budget, meter) with the app's own texts, inside .shot, which gives them the app's colours and type back (public/landing-system.css).
    Example figures that add up, on the 12th of the month: fixed costs 4.345, three bills paid (2.330), 2.015 still to pay, income for fixed
    costs 5.200, so 855 is left; one bill is late (due on the 10th, no payment) and one is due in three days. Nothing in it can be pressed (inert),
    and it is decoration for people who can see it (aria-hidden): the six rules under it say the same in words. */
function lpShotPlan() {
  const ym = '2026-10', $m = (v, trim) => fmt.money(v * 100, CUR, trim ? { trim: true } : null), day = d => fmt.date(`${ym}-${d}`), lang = S.settings.lang;
  const i = `<span class="hint">${icon('info')}</span>`, chip = (cls, text) => `<span class="chip ${cls}">${cls ? '<i></i>' : ''}${text}</span>`;
  const tile = (label, value, tip) => `<div class="card tile"><div class="label"><span>${label}</span>${i}</div><div class="value num">${value}</div>${tip ? `<div class="shot-tip">${tip}</div>` : ''}</div>`;
  const cat = (key, color) => `<span class="cat"><span class="dot" style="background:var(--${color})"></span><b>${nameIn(key, lang)}</b></span>`;
  const row = (name, d, plan, paid, status, done) => `<tr class="${done ? 'done' : ''}"><td class="first"><b class="ln">${name}</b><div class="note">${nameIn('Main account', lang)}</div></td><td class="num c2">${day(d)}</td><td class="amt-s c3">${$m(plan, true)}</td><td class="amt-s c4">${paid ? $m(paid) : '<span class="muted">—</span>'}</td><td>${status}</td></tr>`;
  const budget = (key, color, spent, planned, meta) => `<div class="budget"><b style="font-weight:500"><span class="cat"><span class="dot" style="background:var(--${color})"></span>${nameIn(key, lang)}</span></b><span class="num">${$m(spent)} <span class="muted">/ ${$m(planned)}</span></span>${planMeter(spent, planned)}<div class="meta"><span>${fmt.pct(Math.round(spent * 100 / planned))}</span><span>${meta}</span></div></div>`;
  return `<figure class="shot" aria-hidden="true" inert data-reveal="shot">
      <div class="shot-back"><div class="shot-bar"><b>${t('Plan')}</b><span class="month"><i>${icon('left')}</i><span>${fmt.month(ym, true)}</span><i>${icon('right')}</i></span></div>
        <div class="tiles">${tile(t('Fixed costs, {month}', { month: fmt.month(ym, 'bare') }), $m(4345))}${tile(t('Paid so far'), $m(2330))}${tile(t('Still to pay'), $m(2015), t('What is planned for this month and has no payment yet.'))}${tile(t('Income minus fixed costs'), $m(855))}</div>
        <div class="card"><div class="card-h"><b class="shot-h">${t('Payments, {month}', { month: fmt.month(ym) })}</b>${i}${chip('', tn(2, '{n} to pay', '{n} to pay'))}</div>
          <div class="card-b flush"><table class="tbl paylist"><thead><tr><th>${t('Fixed cost')}</th><th class="c2">${t('Due')}</th><th class="r c3">${t('Plan')}</th><th class="r c4">${t('Paid')}</th><th>${t('Status')}</th></tr></thead><tbody>
            <tr class="grp"><td class="first" colspan="5">${cat('Home', 's3')} <span class="note">${$m(2330)} / ${$m(4070, true)} · ${t('{a} of {b} paid', { a: 3, b: 5 })}</span></td></tr>
            ${row(t('Rent'), '05', 1800, 1800, chip('good', `${t('Paid')} · ${day('05')}`), true)}${row(t('Internet'), '08', 110, 110, chip('good', `${t('Paid')} · ${day('08')}`), true)}${row(t('Gym'), '10', 100, 0, chip('warn', t('Late')))}${row(t('Electricity'), '15', 180, 0, chip('info', tn(3, 'Due in {n} day', 'Due in {n} days')))}</tbody></table></div></div></div>
      <div class="shot-front"><div class="card"><div class="card-h"><b class="shot-h">${t('Plan vs actual')}</b>${i}${chip('good', t('Nothing over plan'))}</div>
        <div class="card-b">${budget('Home', 's3', 2330, 4070, t('{a} of {b} bills paid', { a: 3, b: 5 }))}${budget('Subscriptions', 's2', 0, 275, t('{a} of {b} bills paid', { a: 0, b: 4 }))}</div></div></div></figure>`;
}

// The small things every picture of the app is made of: the "i" beside a figure, a chip, a figure, a tile. They are the app's own markup, without what makes them pressable.
const shotHint = () => `<span class="hint">${icon('info')}</span>`;
const shotChip = (cls, text) => `<span class="chip ${cls}">${cls ? '<i></i>' : ''}${text}</span>`;
const shotMoney = (v, trim) => fmt.money(Math.round(v * 100), CUR, trim ? { trim: true } : null);
const shotTile = (label, value) => `<div class="card tile"><div class="label"><span>${label}</span>${shotHint()}</div><div class="value num">${value}</div></div>`;
const shotAcct = (name, type, bal, owed) => `<div class="card acct"><div class="row"><span class="inst">${esc(name.slice(0, 2).toUpperCase())}</span><div style="min-width:0"><b style="font-weight:500">${name}</b><div class="note">${type} · BRL</div></div></div><div><div class="note">${owed ? t('Current balance owed') : t('Balance')}</div><div class="bal num">${shotMoney(bal)}</div></div></div>`;
/** For entrepreneurs, second version (owner, 2026-10-05: "you copied the same style of 'How Dorax calculates what you see', looks repetitive,
    make it different"). Not a screen behind a card: two separate panes, one over the other, each whole, with no fade. The household's accounts
    in the first and the company's monthly statements in the second, each under the app's own heading with the app's own total beside it, and
    between them a line that carries the first point of the list beside the picture ("Company and home, never mixed"). Same day as the other
    pictures (the 12th): September's statement is due on the 15th and still pending. Example figures: the two household accounts add up to the
    household net balance. */
function lpShotPj() {
  const lang = S.settings.lang, main = nameIn('Main account', lang), co = t('Company account');
  const pane = (cls, name, label, total, body) => `<div class="duo-pane ${cls}"><div class="duo-h"><span class="shot-sec">${name} ${shotHint()}</span><span class="duo-t"><span class="note">${label}</span><b class="num">${shotMoney(total)}</b></span></div>${body}</div>`;
  const month = (ym, due, soon) => `<tr><td><b style="font-weight:500">${fmt.month(ym)}</b></td><td class="num c2">${fmt.date(due)}</td><td><div class="row" style="gap:6px">${soon ? `${shotChip('warn', t('Pending'))}<span class="btn sm">${t('Prepare OFX')}</span>` : shotChip('good', t('Sent'))}</div></td></tr>`;
  return `<figure class="shot duo" aria-hidden="true" inert data-reveal="shot-pj">
      ${pane('home', t('Household'), t('Household net balance'), 13320, `<div class="grid g-2">${shotAcct(main, t('Checking'), 4320)}${shotAcct(t('Savings'), t('Savings'), 9000)}</div>`)}
      <div class="duo-join"><span>${t('Company and home, never mixed')}</span></div>
      ${pane('co', t('Company (PJ)'), `${t('Company')}, BRL`, 18400, `<div class="card"><div class="card-h"><b class="shot-h">${t('Monthly statements')}</b>${shotHint()}</div>
        <div class="card-b flush"><table class="tbl"><thead><tr><th>${t('Month')}</th><th class="c2">${t('Due')}</th><th>${co}</th></tr></thead><tbody>
          ${month('2026-09', '2026-10-15', true)}${month('2026-08', '2026-09-15')}${month('2026-07', '2026-08-15')}</tbody></table></div></div>`)}</figure>`;
}
/** How it works: one small piece of the app for each of the four steps, cut off at the bottom with a fade. 1 the accounts that were added, 2 the
    fixed costs of the plan with their due days, 3 the dashboard's to-do list with its "mark as paid", 4 "Plan vs actual" with a month that went
    over (the electricity came to 212,40 against 180: 32,40 over). */
function lpShotStep(n) {
  const lang = S.settings.lang, main = nameIn('Main account', lang), day = d => fmt.date(`2026-10-${d}`);
  const line = (name, d, plan) => `<tr><td class="first"><b class="ln">${name}</b><div class="note">${main}</div></td><td class="num d2">${day(d)}</td><td class="amt-s">${shotMoney(plan, true)}</td></tr>`;
  const todo = (when, name, v) => `<div class="li todo"><span class="when">${when}</span><span class="grow"><b>${name}</b><small>${shotMoney(v)} · ${main}</small></span><span class="btn sm act">${icon('check')}<span class="lbl">${t('Mark as paid')}</span></span></div>`;
  const body = n === 0 ? `<div class="grid g-2">${shotAcct(main, t('Checking'), 4320)}${shotAcct(t('Savings'), t('Savings'), 9000)}${shotAcct(t('Credit card'), t('Credit card'), 1250, true)}${shotAcct(t('Company account'), t('Checking'), 18400)}</div>`
    : n === 1 ? `<div class="card"><div class="card-b flush"><table class="tbl paylist"><thead><tr><th>${t('Fixed cost')}</th><th class="d2">${t('Due')}</th><th class="r">${t('Plan')}</th></tr></thead><tbody>${line(t('Rent'), '05', 1800)}${line(t('Internet'), '08', 110)}${line(t('Gym'), '10', 100)}${line(t('Electricity'), '15', 180)}</tbody></table></div></div>`
    : n === 2 ? `<div class="card"><div class="card-h"><b class="shot-h">${t('To do')}</b>${shotHint()}<span class="sub">${t('{amount} to pay in the next 30 days', { amount: shotMoney(280) })}</span></div><div class="card-b"><div class="list">${todo(shotChip('warn', t('Late')), t('Gym'), 100)}${todo(day('15'), t('Electricity'), 180)}</div></div></div>`
    : `<div class="card"><div class="card-h"><b class="shot-h">${t('Plan vs actual')}</b>${shotHint()}${shotChip('crit', t('{amount} over plan', { amount: shotMoney(32.4) }))}</div><div class="card-b"><div class="budget"><b style="font-weight:500"><span class="cat"><span class="dot" style="background:var(--s3)"></span>${nameIn('Home', lang)}</span></b><span class="num">${shotMoney(4102.4)} <span class="muted">/ ${shotMoney(4070)}</span></span>${planMeter(410240, 407000)}<div class="meta"><span>${fmt.pct(101)}</span><span>${t('{a} of {b} bills paid', { a: 5, b: 5 })}</span></div></div><div class="budget"><b style="font-weight:500"><span class="cat"><span class="dot" style="background:var(--s2)"></span>${nameIn('Subscriptions', lang)}</span></b><span class="num">${shotMoney(275)} <span class="muted">/ ${shotMoney(275)}</span></span>${planMeter(27500, 27500)}<div class="meta"><span>${fmt.pct(100)}</span><span>${t('{a} of {b} bills paid', { a: 4, b: 4 })}</span></div></div></div></div>`;
  return `<figure class="shot mini" aria-hidden="true" inert>${body}</figure>`;
}

function viewLanding() {
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
  // only for entrepreneurs: four lines under the picture of the app. [(unused), title, one line]. Every line is something the app does.
  const pj = [
    ['split', t('Company and home, never mixed'), t('Household totals, the plan and the reports count only household money.')],
    ['income', t('A plan for income that changes'), t('Set your income month by month and see what is left.')],
    ['days', t('Home bills do not wait for invoices'), t('Due days and reminders, whatever day a client pays.')],
    ['close', t('The month-end your accountant asks for'), t('The list of statements to send, and the bank’s file turned into OFX.')],
  ];
  // nine questions (owner, v23: "too long, condense it"). The answers that used to be separate are merged; contact and the independence line live in the footer.
  const faq = [
    [t('Does Dorax connect to my bank?'), t('No. Your bank password is never asked for. You type what you want or import a file.')],
    [t('Does Dorax give financial advice?'), t('No. Dorax organises your own numbers. It gives no financial, tax or investment advice, does not tell you what to buy, sell or save, and does not replace an accountant.')],
    [t('Can I bring my spreadsheet and my bank statements?'), t('Yes. A spreadsheet in .xlsx or .csv, with the months across the top or down the side, and bank statements in CSV or OFX. You see what was found and import only what you approve; rows you already have are flagged as possible duplicates.')],
    [t('How does the bank statement converter work?'), t('You choose the statement as your bank gives it (CSV, Excel, PDF and the other usual formats), confirm what was read, and download an OFX file whose format was checked. A scanned PDF, which is a picture, cannot be read. Nothing is sent to your accountant for you. Files made this way were imported in Contabilizei in October 2026 without errors; that is our own test, not a statement by Contabilizei.')],
    [t('Are my investment figures market values?'), t('No. Dorax does not fetch market prices. You type the price of each fund; position and average price are records of what you entered.')],
    [t('How do I log in, and how am I reminded?'), t('You log in with your email and a password, or with your Google account. Reminders come in the app, by email and, if you turn them on, as notifications on your phone or computer. You can also download a calendar file.')],
    [t('Where is my data, and can I delete it?'), t('In your account, on Dorax’s server, the same on every device. In Settings you can download a backup, delete all your data or delete the account.')],
    LP_PLANS ? [t('How much does it cost, and can I cancel?'), t('Free costs R$ 0. Plus is R$ 7,99 a month or R$ 79,90 a year; Premium is R$ 14,99 a month or R$ 149,90 a year. Cancel whenever you want: the plan stays active until the end of the period you already paid for.')]
      : [t('How much does it cost?'), t('Nothing for now: Dorax is free, and no card is asked for. Paid plans may come later; nothing is charged unless you choose one.')],
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
  const seePlans = LP_PLANS ? `<button class="btn lg" data-a="pub-scroll" data-id="lp-plans">${t('See the plans')}</button>` : '';
  const go = (id, label) => `<button class="lp-link" data-a="pub-scroll" data-id="${id}">${label}</button>`;
  return `<div class="lp">
  <header class="lp-nav">${brandMark()}
    <nav aria-label="${t('Sections')}"><button class="lp-link" data-a="pub-scroll" data-id="lp-what">${t('What’s inside')}</button><button class="lp-link" data-a="pub-scroll" data-id="lp-method">${t('How it calculates')}</button>${LP_PLANS ? `<button class="lp-link" data-a="pub-scroll" data-id="lp-plans">${t('Plans')}</button>` : ''}<button class="lp-link" data-a="pub-scroll" data-id="lp-faq">${t('Questions')}</button></nav>
    <div class="lp-actions">${langPill('lp-lang')}<button class="btn sm" data-a="pub-go" data-v="login">${t('Log in')}</button><button class="btn primary sm" data-a="pub-go" data-v="signup">${t('Create account')}</button></div></header>
  <main>
    <section class="lp-hero"><div class="lp-copy"><span class="eyebrow">${t('Personal finance, without the guesswork')}</span>
        <h1>${t('See your money.')} <span class="hl">${t('Plan what’s next.')}</span></h1>
        <p class="lead">${t('Dorax brings your income, accounts, expenses, fixed costs, savings goals, investment records and financial reports into one clear workspace, so you can understand your month without piecing together spreadsheets, notes and separate tools.')}</p>
        <div class="row">${cta('lg')}<button class="btn lg" data-a="pub-scroll" data-id="lp-how">${t('How it works')}</button></div></div>
      ${lpStage()}</section>
    <section class="lp-sec" id="lp-what"><div class="lp-sec-h"><div class="lp-sec-t"><h2>${t('One financial picture instead of five separate ones.')}</h2><p class="lead sm">${t('Dorax connects the parts of personal finance that are usually managed separately.')}</p></div></div>
      <div class="bento">${features.map(([kind, size, title, text]) => `<article class="${size}" data-reveal="f-${kind}">${lpIll(kind)}<div class="txt"><h3>${title}</h3><p>${text}</p></div></article>`).join('')}</div></section>
    <section class="lp-sec" id="lp-method"><div class="lp-split-h"><h2>${t('How Dorax calculates what you see')}</h2><p class="lead big">${t('Financial software should explain how its numbers work. Every figure starts with information you enter or import; these are the rules behind what you see.')}</p></div>
      ${lpShotPlan()}
      <div class="lp-plain">${method.map(([, title, text], i) => `<div data-reveal="m-${i}"><h3>${title}</h3><p>${text}</p></div>`).join('')}</div>
</section>
    <section class="lp-sec" id="lp-how"><div class="lp-split-h"><h2>${t('How it works')}</h2><p class="lead big">${t('A clear path from raw transactions to a usable picture of your month.')}</p></div>
      <ol class="lp-flow">${steps.map(([title, text], i) => `<li data-reveal="s-${i}">${lpShotStep(i)}<div class="fl-txt"><span class="fl-n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h3>${title}</h3><p>${text}</p></div></li>`).join('')}</ol>
      <p class="lp-note">${t('Nothing connects directly to your bank. The workflow is based on information you enter and files you choose to import.')}</p>
      <div class="lp-go">${cta('lg')}${seePlans}</div></section>
    <section class="lp-sec" id="lp-pj"><div class="lp-duo">
        <div class="duo-head"><span class="eyebrow">${t('For entrepreneurs (PJ)')}</span><h2>${t('Company pays you. Home needs a plan.')}</h2>
          <p class="lead">${t('When you pay yourself from your own company, home money and company money blur. Dorax keeps both in one account, and apart.')}</p><div class="row">${cta('lg')}${seePlans}</div></div>
        ${lpShotPj()}
        <ul class="duo-list">${pj.map(([, title, text], i) => `<li data-reveal="pj-${i}"><h3>${title}</h3><p>${text}</p></li>`).join('')}</ul></div>
      ${LP_PLANS ? `<p class="lp-note">${t('One account holds both. Company money never counts in the household figures.')} ${t('The company side is part of Premium.')}</p>` : ''}</section>
    ${!LP_PLANS ? '' : `<section class="lp-sec" id="lp-plans"><div class="lp-sec-h center"><div class="lp-sec-t"><h2>${t('Start with the level of organization you need.')}</h2><p class="lead sm">${t('Three plans. Start with the free one and change whenever you want.')}</p></div></div>
      <div class="seg bill" role="group" aria-label="${t('Billing')}">${[['month', t('Monthly')], ['year', t('Yearly')]].map(([v, l]) => `<button data-a="lp-bill" data-v="${v}" aria-pressed="${bill === v}">${l}</button>`).join('')}</div>
      <div class="lp-plans" data-bill="${bill}">${plans.map(p => `<article class="tier ${p.id}" data-reveal="p-${p.id}"><span class="tier-glow" aria-hidden="true"></span><span class="tier-orb" aria-hidden="true"></span>
        <div class="tier-top"><span class="gem" aria-hidden="true"></span>${p.id === 'plus' ? `<span class="tier-badge">${t('Recommended')}</span>` : ''}</div>
        <div class="tier-h"><h3>${p.name}</h3></div>
        <div class="price">${p.year ? `<span class="per m"><b class="num">${p.price}</b><span>${t('a month')}</span><small>${t('or {price} a year: two months free', { price: p.year })}</small></span><span class="per y"><b class="num">${p.year}</b><span>${t('a year')}</span><small>${t('Two months free. Or {price} a month.', { price: p.price })}</small></span>` : `<span class="per"><b class="num">${p.price}</b><small>${t('No card needed')}</small></span>`}</div>
        <p class="tier-who">${p.who}</p>
        <div class="tier-f"><button class="btn ${p.id === 'plus' ? 'primary' : 'glass'}" data-a="pub-go" data-v="signup">${p.label || t('Choose {plan}', { plan: p.name })}</button></div>
        <div class="tier-sep" aria-hidden="true"><span>${t('What’s included')}</span></div>
        <ul>${p.plus ? `<li class="plus">${p.plus}</li>` : ''}${p.items.map(x => `<li>${icon('check')}<span>${x}</span></li>`).join('')}</ul></article>`).join('')}</div>
      <p class="lp-note">${t('Every account starts on Free. You choose Plus or Premium inside the app, and you can cancel whenever you want.')}</p></section>`}
    <section class="lp-sec lp-two" id="lp-faq"><div><h2>${t('Questions before you start')}</h2></div>
      <div class="lp-faq">${faq.map(([q, a]) => `<details><summary>${q}${icon('plus')}</summary><p>${a}</p></details>`).join('')}</div></section>
    <section class="lp-cta"><h2>${t('Make sense of the numbers you have.')}</h2><div class="row">${cta('lg')}<button class="btn lg" data-a="pub-go" data-v="login">${t('Log in')}</button></div></section>
  </main>
  <footer class="lp-foot">
    <div class="ft-top">
      <div class="ft-brand">${brandMark(true)}<p>${t('Your money, organized clearly enough to make better decisions yourself.')}</p>
        <div class="ft-lang">${icon('globe')}${langSelect('ft-lang', true)}</div></div>
      <nav class="ft-cols" aria-label="${t('Footer')}">
        <div><h3>${t('Product')}</h3><ul><li>${go('lp-what', t('What’s inside'))}</li><li>${go('lp-method', t('How it calculates'))}</li><li>${go('lp-pj', t('For entrepreneurs'))}</li>${LP_PLANS ? `<li>${go('lp-plans', t('Plans'))}</li>` : ''}<li>${go('lp-faq', t('Questions'))}</li></ul></div>
        <div><h3>${t('Account')}</h3><ul><li><button class="lp-link" data-a="pub-go" data-v="signup">${t('Create account')}</button></li><li><button class="lp-link" data-a="pub-go" data-v="login">${t('Log in')}</button></li></ul></div>
        <div><h3>${t('Legal')}</h3><ul><li><button class="lp-link" data-a="pub-go" data-v="privacy">${t('Privacy policy')}</button></li><li><button class="lp-link" data-a="pub-go" data-v="terms">${t('Terms of use')}</button></li></ul></div>
        <div><h3>${t('Contact')}</h3><ul><li><button class="lp-link" data-a="pub-go" data-v="contact">${t('Contact form')}</button></li></ul></div>
      </nav></div>
    <div class="ft-bottom"><p class="lp-meta left"><span>© 2026 Dorax Finance</span></p>
      <p class="note">${t('Dorax organises information about your own money. It is not financial, tax or accounting advice.')} ${t('Contabilizei and the banks named on this page belong to their owners. Dorax is independent of them.')}</p></div></footer></div>`;
}
