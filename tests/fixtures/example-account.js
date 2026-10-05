/* Dorax Finance — TEST FIXTURE: the example account. Not part of the app; nothing here is shipped or shown to anyone.
   Until v40 this was the app's own example account (demo@example.com). The app is blank now; the tests still need a full account to
   compare figures against, so the same invented household lives on here. Loaded after the app's own data/defaults.js.
   Everything is invented: the household, its accounts and balances, the fixed costs, the income, the goals and funds, the FII position
   (the fund codes too: they are not real funds) and every transaction. */

const DEMO_TODAY = '2026-10-02';
const DEMO_EMAIL = 'demo@example.com';
const DEMO_VERSION = 6;
const R = v => Math.round(v * 100);                       // reais -> cents, used only on the literal amounts below
const rep = (v, n) => Array(n).fill(R(v));
// the example's own names, in three languages, added to the app's table so that they follow the language like the app's do
[
  ['Second income', 'Segundo ingreso', 'Segunda renda'],
  ['Rent', 'Alquiler', 'Aluguel'],
  ['Electricity', 'Electricidad', 'Luz'],
  ['Electricity (variable)', 'Electricidad (variable)', 'Luz (variável)'],
  ['Internet', 'Internet', 'Internet'],
  ['Mobile', 'Móvil', 'Celular'],
  ['Condo fee', 'Condominio', 'Condomínio'],
  ['Groceries', 'Supermercado', 'Supermercado'],
  ['Transport', 'Transporte', 'Transporte'],
  ['Video streaming', 'Streaming de vídeo', 'Streaming de vídeo'],
  ['Music', 'Música', 'Música'],
  ['Cloud storage', 'Almacenamiento en la nube', 'Armazenamento na nuvem'],
  ['Gym', 'Gimnasio', 'Academia'],
  ['Language course', 'Curso de idiomas', 'Curso de idiomas'],
  ['Delivery club', 'Club de entregas', 'Clube de entregas'],
  ['Emergency fund', 'Fondo de emergencia', 'Reserva de emergência'],
  ['Trip', 'Viaje', 'Viagem'],
  ['Car down payment', 'Entrada del carro', 'Entrada do carro'],
  ['New computer', 'Computadora nueva', 'Computador novo'],
  ['Gifts and parties', 'Regalos y fiestas', 'Presentes e festas'],
  ['Nubank account', 'Cuenta Nubank', 'Conta Nubank'],
  ['Nubank card', 'Tarjeta Nubank', 'Cartão Nubank'],
  ['Day to day', 'Día a día', 'Dia a dia'],
  ['Subscriptions and groceries', 'Suscripciones y supermercado', 'Assinaturas e supermercado'],
  ['Only for going out', 'Solo para salidas', 'Só para lazer'],
  ['Emergency fund (quick to withdraw)', 'Fondo de emergencia (rescate rápido)', 'Reserva de emergência (resgate rápido)'],
  ['Goals', 'Metas', 'Metas'],
  ['Company account', 'Cuenta de la empresa', 'Conta da empresa'],
  ['Receives the conversion and sends it to the company', 'Recibe la conversión y la envía a la empresa', 'Recebe a conversão e envia para a empresa'],
  ['Receives the client’s payments', 'Recibe los pagos del cliente', 'Recebe os pagamentos do cliente'],
  ['Pharmacy', 'Farmacia', 'Farmácia'],
  ['Restaurant', 'Restaurante', 'Restaurante'],
  ['Cinema', 'Cine', 'Cinema'],
  ['Own transfer', 'Transferencia propia', 'Transferência própria'],
  ['Card payment', 'Pago de tarjeta', 'Pagamento do cartão'],
  ['Transfer to {a}', 'Transferencia a {a}', 'Transferência para {a}'],
  ['Transfer from {a}', 'Transferencia de {a}', 'Transferência de {a}'],
  ['Groceries and things for the house', 'Supermercado y artículos de casa', 'Supermercado e itens de casa'],
  ['Accounting fee (example amount)', 'Honorarios de contabilidad (importe de ejemplo)', 'Mensalidade da contabilidade (valor de exemplo)'],
  ['DAS Simples Nacional (example amount)', 'DAS Simples Nacional (importe de ejemplo)', 'DAS Simples Nacional (valor de exemplo)'],
  ['Fixed costs', 'Gastos fijos', 'Gastos fixos'],
  ['Total for the year', 'Total del año', 'Total do ano'],
  ['Due day', 'Día de pago', 'Dia de vencimento'],
  ['Total income', 'Total de ingresos', 'Total de renda'],
  ['TOTAL FIXED COSTS', 'TOTAL DE GASTOS FIJOS', 'TOTAL DE GASTOS FIXOS'],
  ['Day', 'Día', 'Dia'],
  ['Savings', 'Ahorro', 'Poupança'],
  ['Budget', 'Presupuesto', 'Orçamento'],
  ['Quotas', 'Cuotas', 'Cotas'],
  ['Price per quota', 'Precio por cuota', 'Preço por cota'],
  ['Last yield', 'Último rendimiento', 'Último rendimento'],
  ['Monthly income', 'Renta mensual', 'Renda mensal'],
  ['Invested', 'Valor invertido', 'Valor investido'],
].forEach(r => { NAMES.push(r); NAME_ROW[r[0]] = r; });
const SHEET_MONTHS = { en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  pt: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'] };

const CATEGORIES = [
  { id: 'casa', name: 'Home', color: 's3', subs: [['alquiler', 'Rent'], ['electricidad', 'Electricity'], ['internet', 'Internet'], ['movil', 'Mobile'], ['condominio', 'Condo fee'], ['supermercado', 'Groceries'], ['transporte', 'Transport']] },
  { id: 'suscripciones', name: 'Subscriptions', color: 's2', subs: [['video', 'Video streaming'], ['musica', 'Music'], ['nube', 'Cloud storage'], ['gym', 'Gym'], ['idiomas', 'Language course'], ['entregas', 'Delivery club']] },
  { id: 'salidas', name: 'Going out', color: 's1', subs: [] },
  { id: 'other', name: 'Other', color: 's4', subs: [] },
  { id: 'income', name: 'Income', color: null, income: true, subs: [['sueldo', 'Salary'], ['sueldo-2', 'Second income']] },
].map(c => ({ ...c, subs: c.subs.map(([id, name]) => ({ id, name })) }));

// Opening balances are the balances on 1 April 2026, where the example's transactions start. The two savings accounts open with
// exactly what the goals kept in them had received from January to March.
const ACCOUNTS = [
  { id: 'nu-conta', name: 'Nubank account', institution: 'Nubank', type: 'checking', currency: 'BRL', scope: 'personal', purpose: 'Day to day', opening: 520000 },
  { id: 'nu-card', name: 'Nubank card', institution: 'Nubank', type: 'credit', currency: 'BRL', scope: 'personal', purpose: 'Subscriptions and groceries', opening: -128000, creditLimit: 600000, dueDay: 7 },
  { id: 'bb', name: 'Banco do Brasil', institution: 'Banco do Brasil', type: 'checking', currency: 'BRL', scope: 'personal', purpose: 'Only for going out', opening: 30000 },
  { id: 'mp', name: 'Mercado Pago', institution: 'Mercado Pago', type: 'savings', currency: 'BRL', scope: 'personal', purpose: 'Emergency fund (quick to withdraw)', opening: 180000 },
  { id: 'sant', name: 'Santander', institution: 'Santander', type: 'savings', currency: 'BRL', scope: 'personal', purpose: 'Goals', opening: 300000 },
  { id: 'nu-pj', name: 'Nubank PJ', institution: 'Nubank', type: 'checking', currency: 'BRL', scope: 'business', monthly: false, purpose: 'Company account', opening: 600000 },
  { id: 'wise-brl', name: 'Wise BRL', institution: 'Wise', type: 'checking', currency: 'BRL', scope: 'business', monthly: true, purpose: 'Receives the conversion and sends it to the company', opening: 0 },
  { id: 'wise-usd', name: 'Wise USD', institution: 'Wise', type: 'checking', currency: 'USD', scope: 'business', monthly: true, purpose: 'Receives the client’s payments', opening: 0 },
];

// ---- Fixed costs, January to December. One of each kind the app handles: a bill with a due day, a bill whose amount varies, a budget spent
// during the month (one on the card, one from the account), a price that changes in the middle of the year, a cost that starts in May,
// and a month with nothing to pay.
const PLAN = {
  lines: [
    { id: 'pl-alquiler', categoryId: 'casa', subcategoryId: 'alquiler', name: 'Rent', due: 5, values: rep(1800, 12) },
    { id: 'pl-electricidad', categoryId: 'casa', subcategoryId: 'electricidad', name: 'Electricity (variable)', pay: 'variable', values: rep(180, 12) },
    { id: 'pl-internet', categoryId: 'casa', subcategoryId: 'internet', name: 'Internet', due: 12, values: rep(110, 12) },
    { id: 'pl-movil', categoryId: 'casa', subcategoryId: 'movil', name: 'Mobile', values: rep(60, 12) },
    { id: 'pl-condominio', categoryId: 'casa', subcategoryId: 'condominio', name: 'Condo fee', values: rep(420, 12) },
    { id: 'pl-supermercado', categoryId: 'casa', subcategoryId: 'supermercado', name: 'Groceries', pay: 'budget', accountId: 'nu-card', values: rep(1200, 12) },
    { id: 'pl-transporte', categoryId: 'casa', subcategoryId: 'transporte', name: 'Transport', pay: 'budget', values: rep(300, 12) },
    { id: 'pl-video', categoryId: 'suscripciones', subcategoryId: 'video', name: 'Video streaming', values: rep(39.9, 12) },
    { id: 'pl-musica', categoryId: 'suscripciones', subcategoryId: 'musica', name: 'Music', values: [...rep(21.9, 6), ...rep(23.9, 6)] },
    { id: 'pl-nube', categoryId: 'suscripciones', subcategoryId: 'nube', name: 'Cloud storage', values: rep(9.9, 12) },
    { id: 'pl-gym', categoryId: 'suscripciones', subcategoryId: 'gym', name: 'Gym', values: [...rep(129.9, 4), R(99.9), 0, ...rep(99.9, 6)] },
    { id: 'pl-idiomas', categoryId: 'suscripciones', subcategoryId: 'idiomas', name: 'Language course', values: [...rep(0, 4), ...rep(89, 8)] },
    { id: 'pl-entregas', categoryId: 'suscripciones', subcategoryId: 'entregas', name: 'Delivery club', values: rep(12.9, 12) },
  ].map(({ values, ...l }) => ({ pay: 'fixed', accountId: l.categoryId === 'suscripciones' ? 'nu-card' : 'nu-conta', end: null, note: '', ...l, plan: { 2026: values } })),
};

// ---- Income: two salary payments a month. The first funds savings and goals, the second pays the fixed costs.
// half: 1 = paid in the first half of the month, 2 = second half, 0 = any day.
const PAY = {
  2026: [
    { id: 'pay1', name: 'Salary · 1st payment', sub: 'sueldo', half: 1, to: 'savings', values: rep(3000, 12) },
    { id: 'pay2', name: 'Salary · 2nd payment', sub: 'sueldo', half: 2, to: 'fixed', values: rep(5200, 12) },
    { id: 'pay3', name: 'Second income', sub: 'sueldo-2', half: 0, to: 'fixed', values: rep(0, 12) },
  ],
  2027: [
    { id: 'pay1', name: 'Salary · 1st payment', sub: 'sueldo', half: 1, to: 'savings', values: rep(3000, 12) },
    { id: 'pay2', name: 'Salary · 2nd payment', sub: 'sueldo', half: 2, to: 'fixed', values: rep(5200, 12) },
  ],
};

// ---- Where the savings payment goes: two funds without a target and three goals with one (well under way, just started, not started).
const Z = () => rep(0, 12);
const GOALS = [
  { id: 'emergencia', name: 'Emergency fund', kind: 'fund', target: null, deadline: null, accountId: 'mp', plan: { 2026: rep(600, 12), 2027: rep(500, 12) } },
  { id: 'viaje', name: 'Trip', kind: 'goal', target: R(15000), deadline: '2027-03', accountId: 'sant', plan: { 2026: rep(1000, 12), 2027: [...rep(1000, 3), ...rep(0, 9)] } },
  { id: 'carro', name: 'Car down payment', kind: 'goal', target: R(15000), deadline: '2027-12', accountId: 'sant', plan: { 2026: [...rep(0, 6), ...rep(800, 6)], 2027: rep(850, 12) } },
  { id: 'computadora', name: 'New computer', kind: 'goal', target: R(6000), deadline: '2027-12', accountId: 'sant', plan: { 2026: Z(), 2027: rep(500, 12) } },
  { id: 'regalos', name: 'Gifts and parties', kind: 'fund', target: null, deadline: null, accountId: null, plan: { 2026: [...rep(0, 7), ...rep(150, 5)], 2027: rep(100, 12) } },
].map(g => ({ status: 'active', note: '', ...g }));
const REMAINDER_LABEL = 'Left over';
// Example movements: the plan followed exactly through September. Nothing for October yet, so the monthly hand-out can be tried.
function demoGoalMoves() {
  const moves = []; let n = 0;
  GOALS.forEach(g => g.plan[2026].forEach((v, i) => { if (v && i < 9) moves.push({ id: 'gm' + (++n), goalId: g.id, date: `2026-${String(i + 1).padStart(2, '0')}-12`, amount: v, accountId: g.accountId, note: '' }); }));
  return moves;
}

// ---- FIIs. The fund codes are made up (they follow the usual four letters and "11", and are not real funds), and so are the prices and the
// income per quota. Three funds held from the start, without a date; one more purchase in July; a fourth fund in the simulator.
const FII = {
  assets: { DXLG11: { price: R(98.5), lastYield: R(0.8) }, DXPP11: { price: R(9.8), lastYield: R(0.1) }, DXSH11: { price: R(104), lastYield: R(0.85) } },
  open: [['DXLG11', 40, 96.2], ['DXPP11', 60, 9.75], ['DXSH11', 25, 101.4]],
  buys: [['DXPP11', '2026-07-03', 40, 9.6]],
  sim: { ticker: 'DXRE11', qty: 50, price: R(100), lastYield: R(1.05) },
};
/** The opening positions always; with `demo`, the July purchase and the income received each month from April to September on the quotas held that day. */
function fiiMoves(demo) {
  const moves = FII.open.map(([ticker, qty, price], i) => ({ id: 'fm' + (i + 1), ticker, kind: 'open', date: '', qty, price: R(price), fees: 0, note: '' }));
  if (!demo) return moves;
  FII.buys.forEach(([ticker, date, qty, price]) => moves.push({ id: 'fm' + (moves.length + 1), ticker, kind: 'buy', date, qty, price: R(price), fees: 0, note: '' }));
  for (let m = 4; m <= 9; m++) {
    const date = `2026-${String(m).padStart(2, '0')}-14`;
    Object.keys(FII.assets).forEach(ticker => {
      const qty = FII.open.filter(o => o[0] === ticker).reduce((s, o) => s + o[1], 0) + FII.buys.filter(b => b[0] === ticker && b[1] <= date).reduce((s, b) => s + b[2], 0);
      moves.push({ id: 'fm' + (moves.length + 1), ticker, kind: 'income', date, amount: qty * FII.assets[ticker].lastYield, note: '' });
    });
  }
  return moves;
}

/** The example sheet for the spreadsheet import: the same plan, laid out the way such sheets usually are (months across the top, subtotals,
    a due-day column), in the language chosen. It is a grid, not a file, so the import can be tried without choosing one. A real .xlsx or .csv
    goes through the same code after being read. */
function sampleWorkbook(lang) {
  const n = k => nameIn(k, lang || 'en'), T = s => ({ v: s }), N = c => ({ v: c / 100 }), F = c => ({ v: c / 100, f: true }), months = (SHEET_MONTHS[lang] || SHEET_MONTHS.en).map(T);
  const total = (label, rows) => [T(label), ...Array.from({ length: 12 }, (_, m) => F(rows.reduce((a, r) => a + r[m], 0)))];
  const fixed = [[T(n('Fixed costs')), ...months, T(n('Total for the year')), T(n('Due day'))]];
  PAY[2026].filter(r => r.to === 'fixed').forEach(r => fixed.push([T(n(r.name).split(' · ')[0]), ...r.values.map(N)]));
  fixed.push(total(n('Total income'), PAY[2026].filter(r => r.to === 'fixed').map(r => r.values)));
  CATEGORIES.filter(c => PLAN.lines.some(l => l.categoryId === c.id)).forEach(c => {
    const ls = PLAN.lines.filter(l => l.categoryId === c.id);
    ls.forEach(l => fixed.push([T(n(l.name)), ...l.plan[2026].map(N), F(l.plan[2026].reduce((a, b) => a + b, 0)), ...(l.due ? [T(n('Day') + ' ' + l.due)] : [])]));
    fixed.push(total('TOTAL ' + n(c.name).toUpperCase(), ls.map(l => l.plan[2026])));
  });
  fixed.push(total(n('TOTAL FIXED COSTS'), PLAN.lines.map(l => l.plan[2026])));
  const savings = year => {
    const pay = PAY[year].filter(r => r.to === 'savings'), goals = GOALS.filter(g => g.plan[year] && g.plan[year].some(v => v));
    return [[null, ...months], ...pay.map(r => [T(n(r.name).split(' · ')[0]), ...r.values.map(N)]), ...goals.map(g => [T(n(g.name)), ...g.plan[year].map(N)]),
      [T(n('Left over')), ...Array.from({ length: 12 }, (_, m) => F(pay.reduce((a, r) => a + r.values[m], 0) - goals.reduce((a, g) => a + g.plan[year][m], 0)))]];
  };
  const fii = [[T('FIIs'), T(n('Quotas')), T(n('Price per quota')), T(n('Last yield')), T(n('Monthly income')), T(n('Invested'))],
    ...FII.open.map(([tk, qty, price]) => [T(tk), { v: qty }, { v: price }, N(FII.assets[tk].lastYield), F(qty * FII.assets[tk].lastYield), F(Math.round(qty * price * 100))])];
  return { sheets: [{ name: n('Fixed costs'), rows: fixed }, { name: n('Savings') + ' 2026', rows: savings(2026) }, { name: n('Savings') + ' 2027', rows: savings(2027) }, { name: 'FIIs', rows: fii }] };
}
const sampleSheetName = lang => nameIn('Budget', lang || 'en') + ' 2026.xlsx';

// pattern, merchant, category, subcategory, priority (higher wins), transfer?
const RULES = [
  ['PRO LABORE', 'Salary', 'income', 'sueldo', 10], ['ALUGUEL', 'Rent', 'casa', 'alquiler', 10], ['CONDOMINIO', 'Condo fee', 'casa', 'condominio', 10],
  ['INTERNET', 'Internet', 'casa', 'internet', 10], ['ENERGIA', 'Electricity', 'casa', 'electricidad', 10], ['TELEFONIA', 'Mobile', 'casa', 'movil', 10],
  ['TRANSPORTE', 'Transport', 'casa', 'transporte', 10], ['ASSAI', 'Assaí Atacadista', 'casa', 'supermercado', 10], ['PAO DE ACUCAR', 'Pão de Açúcar', 'casa', 'supermercado', 10],
  ['CARREFOUR', 'Carrefour', 'casa', 'supermercado', 10], ['SUPERMERCADO', 'Groceries', 'casa', 'supermercado', 6], ['STREAMING VIDEO', 'Video streaming', 'suscripciones', 'video', 10],
  ['MUSICA APP', 'Music', 'suscripciones', 'musica', 10], ['NUVEM', 'Cloud storage', 'suscripciones', 'nube', 10], ['ACADEMIA', 'Gym', 'suscripciones', 'gym', 10],
  ['CURSO IDIOMAS', 'Language course', 'suscripciones', 'idiomas', 10], ['CLUBE ENTREGAS', 'Delivery club', 'suscripciones', 'entregas', 10], ['FARMACIA', 'Pharmacy', 'other', null, 8],
  ['RESTAURANTE', 'Restaurant', 'salidas', null, 8], ['CINEMA', 'Cinema', 'salidas', null, 8],
  ['MESMA TITULARIDADE', 'Own transfer', null, null, 20, true], ['PAGAMENTO FATURA', 'Card payment', null, null, 20, true],
].map(([pattern, merchant, categoryId, subcategoryId, priority, transfer], i) => ({ id: 'r' + (i + 1), pattern, merchant, categoryId, subcategoryId, priority, accountId: null, active: true, transfer: !!transfer }));

const OFX_PROFILES = [
  { id: 'p1', name: 'Wise BRL', version: '102', currency: 'BRL', bankId: 'WISE', branchId: '', accountId: 'WISE-BRL', accountType: 'CHECKING', institutionName: 'Wise', institutionId: '', language: 'POR', transferMapping: 'SIGN', forAccount: 'wise-brl' },
  { id: 'p2', name: 'Wise USD', version: '102', currency: 'USD', bankId: 'WISE', branchId: '', accountId: 'WISE-USD', accountType: 'CHECKING', institutionName: 'Wise', institutionId: '', language: 'POR', transferMapping: 'SIGN', forAccount: 'wise-usd' },
  { id: 'p3', name: 'Wise BRL (OFX 2.2)', version: '220', currency: 'BRL', bankId: 'WISE', branchId: '', accountId: 'WISE-BRL', accountType: 'CHECKING', institutionName: 'Wise', institutionId: '', language: 'POR', transferMapping: 'XFER', forAccount: 'wise-brl' },
];

/** A sample statement for the converter, in a layout many banks use: a line of title, money in and money out in two columns, a document number, a running balance. Every value is invented. */
function sampleStatement(ym) {
  const d = n => `${String(n).padStart(2, '0')}/${ym.slice(5)}/${ym.slice(0, 4)}`;
  return ['Extrato de conta corrente', 'Data;Histórico;Documento;Crédito;Débito;Saldo', `${d(1)};SALDO ANTERIOR;;;;1.000,00`, `${d(2)};PIX RECEBIDO CLIENTE A;100201;3.000,00;;4.000,00`, `${d(5)};PAGAMENTO BOLETO ALUGUEL;100202;;1.250,45;2.749,55`,
    `${d(10)};TARIFA PACOTE MENSAL;100203;;49,90;2.699,65`, `${d(18)};PIX RECEBIDO CLIENTE B;100204;840,10;;3.539,75`, `${d(25)};PAGAMENTO DARF;100205;;310,00;3.229,75`].join('\n');
}
const SAMPLE_CSV = `Data;Histórico;Valor;Saldo
01/10/2026;Compra no débito - PADARIA REAL;-17,80;1.982,20
01/10/2026;Pix enviado - Recarga transporte;-120,00;1.862,20
02/10/2026;Pix enviado - Joao S;-150,00;1.712,20
02/10/2026;Pagamento de boleto - Telefonia móvel;-60,00;1.652,20`;

// Sample statements in Wise's real CSV layout (23 columns, newest row first, quoted text, Portuguese descriptions). All values are invented.
const WISE_HEADER = '"TransferWise ID",Date,"Date Time",Amount,Currency,Description,"Payment Reference","Running Balance","Exchange From","Exchange To","Exchange Rate","Payer Name","Payee Name","Payee Account Number",Merchant,"Card Last Four Digits","Card Holder Full Name",Attachment,Note,"Total fees","Exchange To Amount","Transaction Type","Transaction Details Type"';
function wiseCsv(accountId, ym) {
  const usd = accountId === 'wise-usd', [y, m] = ym.split('-'), seed = (+y * 12 + +m) * 7919, br = c => centsToDecimal(c).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const lines = [];
  [[11, 104000, 512400, 0], [25, 98000, 519800, 1]].forEach(([day, gross, rate, k]) => {
    const fee = Math.round(gross * 0.0086), net = gross - fee, brl = Math.round(net * rate / 100000), date = `${String(day).padStart(2, '0')}-${m}-${y}`, bal = 'BALANCE-' + (6000000000 + seed * 13 + k * 89632355), tr = 2300000000 + seed * 5 + k * 26210455;
    const conv = `${br(gross)} USD convertidos para ${br(brl)} BRL`, rateTxt = (rate / 100000).toFixed(5);
    if (usd) lines.push(
      `TRANSFER-${tr},${date},"${date} 17:36:22.057",${centsToDecimal(gross)},USD,"Recebeu dinheiro de CLIENTE DEMO LLC com a referência """"",,${centsToDecimal(gross)},,,,"CLIENTE DEMO LLC",,,,,,,,0.00,,CREDIT,DEPOSIT`,
      `FEE-${bal},${date},"${date} 17:37:55.573",-${centsToDecimal(fee)},USD,"Wise Charges for: ${bal}",,${centsToDecimal(net)},,,,,,,,,,,,0,,DEBIT,CONVERSION`,
      `${bal},${date},"${date} 17:37:55.574",-${centsToDecimal(net)},USD,"${conv} (fee: ${br(fee)} USD)",,0.00,USD,BRL,${rateTxt},,,,,,,,,${centsToDecimal(fee)},${centsToDecimal(brl)},DEBIT,CONVERSION`);
    else lines.push(
      `${bal},${date},"${date} 17:37:55.574",${centsToDecimal(brl)},BRL,"${conv}",,${centsToDecimal(brl)},USD,BRL,${rateTxt},,,,,,,,,0.00,${centsToDecimal(brl)},CREDIT,CONVERSION`,
      `TRANSFER-${tr + 2577},${date},"${date} 17:38:19.368",-${centsToDecimal(brl)},BRL,"Enviou dinheiro para EMPRESA DEMO TECNOLOGIA LTDA",,0.00,,,,,"EMPRESA DEMO TECNOLOGIA LTDA","(260) 0000000000",,,,,,0.00,,DEBIT,TRANSFER`);
  });
  return [WISE_HEADER, ...lines.reverse()].join('\n') + '\n';
}
function wiseFileName(accountId, ym, ext) { return `statement_${accountId === 'wise-usd' ? '100000059_USD' : '100000022_BRL'}_${ym}-01_${isoDate(ym, 31)}.${ext || 'csv'}`; }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/** The example account, in the language asked for (English when none is).
    It has no fixed costs: people add their own (owner's decision). PLAN above is what the example sheet for the import contains, and what
    the example's card and account movements were generated from. The test suites ask for the plan to be filled in (opt.plan, or
    window.DORAX_EXAMPLE_PLAN in a browser), so the plan features are still tested against a full plan. */
function buildDemoState(lang, opt) {
  const withPlan = !!(opt && opt.plan) || (typeof window !== 'undefined' && !!window.DORAX_EXAMPLE_PLAN);
  const rnd = mulberry32(20261002), txns = [], imports = [];
  const between = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const SOURCE = { 'nu-conta': 'csv', 'nu-card': 'ofx', bb: 'csv', mp: 'manual', sant: 'manual', 'nu-pj': 'ofx', 'wise-brl': 'csv', 'wise-usd': 'csv' };
  const name = id => ACCOUNTS.find(a => a.id === id).name;
  let seq = 0;
  const add = (accountId, date, description, amount, type, extra) => {
    const acct = ACCOUNTS.find(a => a.id === accountId), biz = acct.scope === 'business';
    const c = biz ? { merchant: description, categoryId: null, subcategoryId: null } : categorize(description, accountId, RULES);
    const t = { id: 't' + (++seq), accountId, date, description, merchant: c.merchant, amount, currency: acct.currency, type,
      categoryId: type === 'transfer' || biz ? null : c.categoryId || 'other', subcategoryId: type === 'transfer' || biz ? null : c.subcategoryId, status: 'confirmed',
      transferAccountId: null, recurring: false, notes: '', source: SOURCE[accountId], sourceTxnId: SOURCE[accountId] === 'ofx' && !biz ? 'NU' + date.replace(/-/g, '') + String(seq).padStart(4, '0') : null,
      confidence: null, splits: null, ...extra };
    t.fingerprint = fingerprint(accountId, date, t.merchant, amount);
    txns.push(t); return t;
  };
  const transfer = (from, to, date, descFrom, descTo, amount) => {
    add(from, date, descFrom, -amount, 'transfer', { transferAccountId: to, merchant: 'Transfer to ' + name(to), k: { merchant: 'Transfer to {a}|' + to } });
    add(to, date, descTo, amount, 'transfer', { transferAccountId: from, merchant: 'Transfer from ' + name(from), k: { merchant: 'Transfer from {a}|' + from } });
  };
  const months = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
  const planned = (id, mi) => PLAN.lines.find(l => l.id === id).plan[2026][mi + 3];
  const toAccount = (acct, mi) => GOALS.filter(g => g.accountId === acct).reduce((s, g) => s + g.plan[2026][mi + 3], 0);
  let cardDue = -ACCOUNTS.find(a => a.id === 'nu-card').opening;
  months.forEach((ym, mi) => {
    const d = n => isoDate(ym, n), before = txns.length;
    // Nubank conta: salary and household bills
    const pay1 = PAY[2026][0].values[mi + 3], pay2 = PAY[2026][1].values[mi + 3];
    if (pay1) add('nu-conta', d(11), 'Transferência recebida - pró-labore', pay1, 'income');
    if (pay2) add('nu-conta', d(25), 'Transferência recebida - pró-labore', pay2, 'income');
    transfer('nu-conta', 'bb', d(6), 'Pix enviado - mesma titularidade Banco do Brasil', 'Pix recebido - mesma titularidade', 40000);
    transfer('nu-conta', 'nu-card', d(7), 'Pagamento fatura cartão Nubank', 'Pagamento recebido', cardDue);
    add('nu-conta', d(5), 'Pix enviado - Imobiliária aluguel', -180000, 'expense');
    add('nu-conta', d(10), 'Pagamento de boleto - Condomínio', -42000, 'expense');
    add('nu-conta', d(12), 'Débito automático - Internet fibra', -11000, 'expense');
    add('nu-conta', d(between(12, 16)), 'Pagamento de boleto - Energia elétrica', -between(15400, mi === 5 ? 17800 : 22100), 'expense');
    add('nu-conta', d(15), 'Pagamento de boleto - Telefonia móvel', -6000, 'expense');
    add('nu-conta', d(between(3, 8)), 'Pix enviado - Recarga transporte', -12000, 'expense');
    add('nu-conta', d(between(18, 24)), 'Compra no débito - App de transporte', -(mi === 3 ? 23500 : between(9000, 16500)), 'expense');
    for (let i = 0; i < 2; i++) add('nu-conta', d(between(2, 27)), 'Compra no débito - FARMACIA POPULAR', -between(2800, 14500), 'expense');
    [['sant', 'TED mesma titularidade Santander', 'TED recebida mesma titularidade'], ['mp', 'Pix enviado - mesma titularidade Mercado Pago', 'Pix recebido - mesma titularidade']]
      .forEach(([acct, out, into]) => { const v = toAccount(acct, mi); if (pay1 && v) transfer('nu-conta', acct, d(12), out, into, v); });
    // Nubank card: supermarket and subscriptions
    const cardStart = txns.length;
    for (let i = 0; i < 5; i++) { const day = between(1, 28); add('nu-card', d(i ? day : 1), pick(['ASSAI ATACADISTA', 'PAO DE ACUCAR LJ 1203', 'CARREFOUR HIPER']), -between(mi === 5 ? 20000 : 19000, mi === 5 ? 23800 : 27500), 'expense'); }   // the first shop of each month is on day 1, as October's is: the first days of two months then compare like with like
    [['pl-video', 'STREAMING VIDEO ASSINATURA', 2], ['pl-gym', 'ACADEMIA FIT', 5], ['pl-musica', 'MUSICA APP PREMIUM', 6], ['pl-nube', 'NUVEM 100GB', 11], ['pl-idiomas', 'CURSO IDIOMAS ONLINE', 13], ['pl-entregas', 'CLUBE ENTREGAS', 17]]
      .forEach(([id, desc, day]) => { let v = planned(id, mi); if (id === 'pl-nube' && mi === 5) v = 1290; if (v) add('nu-card', d(day), desc, -v, 'expense'); });
    if (mi % 3 === 2) add('nu-card', d(between(4, 26)), 'AMAZON BR MARKETPLACE', -between(6000, 18000), 'expense', { merchant: 'Amazon', categoryId: 'other' });
    cardDue = -txns.slice(cardStart).reduce((s, t) => s + t.amount, 0);
    // Banco do Brasil: outings only
    for (let i = 0; i < 3; i++) add('bb', d(between(2, 27)), pick(['COMPRA CARTAO - RESTAURANTE', 'COMPRA CARTAO - CINEMA', 'COMPRA CARTAO - RESTAURANTE']), -between(6000, 12500), 'expense');
    // Company (PJ): client pays in USD on Wise, Wise converts and sends BRL to the company account, which pays the salary. April to August only;
    // September's Wise statements arrive through the converter screen.
    if (mi < 5) parseWiseCSV(wiseCsv('wise-usd', ym)).rows.concat(parseWiseCSV(wiseCsv('wise-brl', ym)).rows).forEach(r => {
      const acct = r.currency === 'USD' ? 'wise-usd' : 'wise-brl';
      add(acct, r.date, r.description, r.amount, r.kind === 'CONVERSION' && !/^Wise Charges/.test(r.description) ? 'transfer' : r.amount < 0 ? (r.kind === 'TRANSFER' ? 'transfer' : 'expense') : 'income', { sourceTxnId: r.sourceTxnId });
      if (r.kind === 'TRANSFER' && acct === 'wise-brl') add('nu-pj', r.date, 'Transferência recebida - Wise', -r.amount, 'transfer');
    });
    if (pay1) add('nu-pj', d(11), 'Transferência enviada - pró-labore', -pay1, 'expense');
    if (pay2) add('nu-pj', d(25), 'Transferência enviada - pró-labore', -pay2, 'expense');
    add('nu-pj', d(10), 'Accounting fee (example amount)', -18900, 'expense');
    add('nu-pj', d(20), 'DAS Simples Nacional (example amount)', -between(55000, 68000), 'expense');
    const end = isoDate(addMonths(ym, 1), 1), monthTx = txns.slice(before);
    [['nu-conta', 'csv', `NU_conta_${ym}.csv`], ['nu-card', 'ofx', `Nubank_${ym}.ofx`], ['bb', 'csv', `BB_extrato_${ym}.csv`]].forEach(([acct, source, file], i) => {
      const n = monthTx.filter(t => t.accountId === acct).length, dup = (mi + i) % 3 === 0 ? 0 : between(0, 2);
      imports.push({ id: 'i' + imports.length, date: end, source, file, accountId: acct, detected: n + dup, imported: n, duplicates: dup, review: 0, status: 'Completed' });
    });
  });
  // a split transaction and an uncategorised one in September
  const big = txns.filter(t => t.accountId === 'nu-card' && t.date.startsWith('2026-09') && t.subcategoryId === 'supermercado').sort((a, b) => a.amount - b.amount)[0];
  if (big) { const part = Math.round(-big.amount * 0.25 / 100) * 100; big.splits = [{ categoryId: 'casa', subcategoryId: 'supermercado', amount: big.amount + part }, { categoryId: 'other', subcategoryId: null, amount: -part }]; big.notes = 'Groceries and things for the house'; }
  add('nu-conta', '2026-09-24', 'Pix enviado - Joao S', -15000, 'expense', { merchant: 'Joao S', categoryId: 'other', subcategoryId: null });
  // October so far
  add('nu-card', '2026-10-01', 'ASSAI ATACADISTA', -21480, 'expense', { status: 'pending' });
  add('nu-card', '2026-10-02', 'STREAMING VIDEO ASSINATURA', -3990, 'expense', { status: 'pending' });
  add('bb', '2026-10-01', 'COMPRA CARTAO - RESTAURANTE', -9200, 'expense');
  txns.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);

  const closes = {};
  months.slice(0, 5).forEach(ym => { closes[ym] = { 'wise-brl': 'sent', 'wise-usd': 'sent' }; });
  closes['2026-09'] = {};

  const state = {
    today: DEMO_TODAY, month: '2026-09', demoVersion: DEMO_VERSION,
    accounts: clone(ACCOUNTS), categories: clone(CATEGORIES), rules: clone(RULES), plan: withPlan ? clone(PLAN) : { lines: [] },
    pay: clone(PAY), goals: clone(GOALS), goalMoves: demoGoalMoves(), remainderLabel: REMAINDER_LABEL,
    fii: { assets: JSON.parse(JSON.stringify(FII.assets)), moves: fiiMoves(true), sim: { ...FII.sim } },
    transactions: txns, imports: imports.reverse(), exports: [], closes,
    recurringManual: [], recurringDismissed: [],
    ofxProfiles: OFX_PROFILES.map(p => ({ ...p })),
    user: { name: 'Alex', email: DEMO_EMAIL, tone: 'friend', notify: { bills: true, close: true, summary: false, goals: true }, remind: { lead: 7, snoozed: {} }, since: '2026-04-01', pendingEmail: null },
    settings: { lang: NAME_LANGS.includes(lang) ? lang : 'en', locale: 'pt-BR', autoAcceptVerified: true, defaultProfile: 'p1', closeDay: 15, platform: '', theme: 'dark' },      // theme: dark unless the person chooses light, in the app only; platform: the accounting platform's name, typed by the person; the example names none
  };
  tagNames(state); relabel(state, state.settings.lang);      // written in English above; every name the app wrote is marked, then put into the language asked for
  return state;
}
