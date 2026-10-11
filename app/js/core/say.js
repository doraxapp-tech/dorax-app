/* Dorax Finance — calculations: reading one sentence as a transaction ("taxi 15", "mercado 214,80 ayer nubank", "recebi 3000 salário").
   Rules, not a model: the same sentence always gives the same answer, nothing leaves the device and nothing costs per use. What it reads is
   shown in the form before anything is saved, and the person can correct every field (features/transactions/transaction-form.view.js).
   Spanish, Portuguese and English are all read whatever the app's language is: people mix them, and a phone's dictation follows the keyboard. */

// ---------- words ----------
const SAY_FOLD = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const SAY_WORDS = {
  // what kind of movement the sentence talks about
  expense: ['gaste', 'gasto', 'pague', 'pago', 'compre', 'compra', 'gastei', 'paguei', 'comprei', 'spent', 'paid', 'bought', 'pay', 'buy'],
  income: ['recibi', 'cobre', 'gane', 'ingreso', 'ingrese', 'pagaron', 'recebi', 'ganhei', 'entrou', 'pagaram', 'received', 'earned', 'income', 'got'],
  transfer: ['transferi', 'transferencia', 'pase', 'movi', 'passei', 'transfer', 'transferred', 'moved'],
  // days
  today: ['hoy', 'hoje', 'today'], yesterday: ['ayer', 'ontem', 'yesterday'], before: ['anteayer', 'antier', 'anteontem'],
  // 0 = Sunday. Portuguese "segunda", "quarta"... are also ordinary words, so they count only with "-feira" or after "na", "no" (below).
  weekdays: [['domingo', 'sunday'], ['lunes', 'monday', 'segunda-feira'], ['martes', 'tuesday', 'terca-feira'], ['miercoles', 'wednesday', 'quarta-feira'], ['jueves', 'thursday', 'quinta-feira'], ['viernes', 'friday', 'sexta-feira'], ['sabado', 'saturday']],
  weekdaysShort: { segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5 },
  // money words that mark the number beside them as the amount
  money: ['reais', 'real', 'peso', 'pesos', 'dolar', 'dolares', 'dollar', 'dollars', 'bucks', 'euro', 'euros', 'conto', 'contos', 'pila', 'pilas', 'mangos', 'lucas', 'brl', 'usd', 'eur'],
  // small words dropped from the ends of what is left (the name), never from its middle
  filler: ['en', 'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'al', 'a', 'con', 'por', 'para', 'y', 'me', 'mi', 'que', 'fue', 'no', 'na', 'nos', 'nas', 'do', 'da', 'dos', 'das', 'o', 'os', 'as', 'um', 'uma', 'em', 'com',
    'pelo', 'pela', 'e', 'eu', 'the', 'an', 'on', 'in', 'at', 'for', 'of', 'to', 'from', 'with', 'i', 'my', 'via', 'oye', 'oi', 'hey', 'hola', 'ola', 'dorax', 'desde', 'hacia', 'pro', 'pra', 'paid', 'last', 'pasado', 'passado', 'passada'],
  // before an account's name: "en nubank", "com o cartão", "from inter"
  lead: ['en', 'con', 'de', 'del', 'desde', 'a', 'al', 'para', 'no', 'na', 'do', 'da', 'com', 'pelo', 'pela', 'pro', 'pra', 'from', 'to', 'with', 'on', 'via', 'por', 'el', 'la', 'o', 'mi', 'meu', 'minha', 'my', 'the', 'into'],
  generic: ['cuenta', 'conta', 'account', 'tarjeta', 'cartao', 'card', 'credito', 'credit', 'debito', 'debit', 'corriente', 'corrente', 'ahorro', 'ahorros', 'poupanca', 'savings', 'checking', 'banco', 'bank', 'empresa', 'company', 'principal', 'main'],
  card: ['tarjeta', 'cartao', 'card', 'credito'], cash: ['efectivo', 'dinheiro', 'cash'],
};
/** Everyday words for the groups the app itself names (data/defaults.js). They apply only to a group that still carries the app's name, in any
    of the three languages: a group the person renamed, or made, is matched by its own name and by what they recorded before. */
const SAY_HINTS = {
  'Rent': ['alquiler', 'aluguel', 'rent', 'renta', 'arriendo'], 'Electricity': ['luz', 'electricidad', 'energia', 'electricity', 'eletricidade'], 'Internet': ['internet', 'wifi'],
  'Mobile': ['celular', 'movil', 'telefono', 'telefone', 'recarga', 'phone'], 'Condo fee': ['condominio', 'expensas'],
  'Groceries': ['mercado', 'supermercado', 'super', 'feira', 'feria', 'verduleria', 'hortifruti', 'atacadao', 'groceries', 'grocery', 'supermarket'],
  'Transport': ['taxi', 'uber', '99', 'cabify', 'bus', 'onibus', 'colectivo', 'metro', 'subte', 'gasolina', 'combustible', 'combustivel', 'nafta', 'pasaje', 'passagem', 'estacionamiento', 'estacionamento', 'parking', 'peaje', 'pedagio', 'fuel'],
  'Going out': ['bar', 'restaurante', 'restaurant', 'cena', 'almuerzo', 'almoco', 'jantar', 'cine', 'cinema', 'cerveza', 'cerveja', 'cafe', 'cafeteria', 'pizza', 'hamburguesa', 'lanche', 'dinner', 'lunch', 'beer', 'coffee', 'ifood', 'rappi', 'show', 'balada'],
  'Video streaming': ['netflix', 'disney', 'hbo', 'globoplay', 'prime'], 'Music': ['spotify', 'deezer'], 'Cloud storage': ['icloud', 'dropbox'], 'Gym': ['gym', 'gimnasio', 'academia', 'smartfit'],
  'Subscriptions': ['suscripcion', 'assinatura', 'subscription', 'netflix', 'spotify', 'icloud', 'disney', 'hbo', 'globoplay', 'prime', 'youtube'],
  'Salary': ['sueldo', 'salario', 'salary', 'paycheck', 'nomina', 'quincena', 'adiantamento', 'adelanto'], 'Client payments': ['cliente', 'client', 'clientes', 'clients'],
};
const SAY_UNITS = { cero: 0, zero: 0, un: 1, uno: 1, una: 1, um: 1, uma: 1, one: 1, dos: 2, dois: 2, duas: 2, two: 2, tres: 3, three: 3, cuatro: 4, quatro: 4, four: 4, cinco: 5, five: 5, seis: 6, six: 6, siete: 7, sete: 7, seven: 7,
  ocho: 8, oito: 8, eight: 8, nueve: 9, nove: 9, nine: 9, diez: 10, dez: 10, ten: 10, once: 11, onze: 11, eleven: 11, doce: 12, doze: 12, twelve: 12, trece: 13, treze: 13, thirteen: 13, catorce: 14, catorze: 14, quatorze: 14, fourteen: 14,
  quince: 15, quinze: 15, fifteen: 15, dieciseis: 16, dezesseis: 16, sixteen: 16, diecisiete: 17, dezessete: 17, seventeen: 17, dieciocho: 18, dezoito: 18, eighteen: 18, diecinueve: 19, dezenove: 19, nineteen: 19,
  veintiuno: 21, veintiun: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29 };
const SAY_TENS = { veinte: 20, vinte: 20, twenty: 20, treinta: 30, trinta: 30, thirty: 30, cuarenta: 40, quarenta: 40, forty: 40, cincuenta: 50, cinquenta: 50, fifty: 50, sesenta: 60, sessenta: 60, sixty: 60,
  setenta: 70, seventy: 70, ochenta: 80, oitenta: 80, eighty: 80, noventa: 90, ninety: 90 };
const SAY_HUNDREDS = { cien: 100, ciento: 100, cem: 100, cento: 100, hundred: 100, doscientos: 200, duzentos: 200, trescientos: 300, trezentos: 300, cuatrocientos: 400, quatrocentos: 400, quinientos: 500, quinhentos: 500,
  seiscientos: 600, seiscentos: 600, setecientos: 700, setecentos: 700, ochocientos: 800, oitocentos: 800, novecientos: 900, novecentos: 900 };

// ---------- numbers ----------
/** A typed number as cents, or null: 15 · 15,5 · 15.50 · 1.234,56 · 1,234.56 · 1.500 (thousands, as written in Brazil) · 2k. */
function sayNumber(str) {
  let s = String(str), times = 1;
  if (/k$/i.test(s)) { times = 1000; s = s.slice(0, -1); }
  if (!/^\d[\d.,]*$/.test(s) || /[.,]$/.test(s)) return null;
  const at = Math.max(s.lastIndexOf('.'), s.lastIndexOf(',')); let whole = s, frac = '';
  if (at >= 0) {
    const left = s.slice(0, at), right = s.slice(at + 1), marks = new Set(s.replace(/\d/g, ''));
    if (marks.size === 2 || (right.length !== 3)) { whole = left; frac = right; }      // two different marks: the last is the decimal one; otherwise three digits after a single mark are thousands
    if (frac.length > 2 || !/^\d{1,3}([.,]\d{3})*$|^\d+$/.test(whole)) return null;
  }
  whole = whole.replace(/[.,]/g, ''); if (!whole || whole.length > 11) return null;
  return Math.round((+whole + (frac ? +('0.' + frac) : 0)) * 100) * times;
}
/** A number said in words, starting at token i ("veinte y cinco", "trinta e dois", "twenty five", "dos mil quinientos"): [cents, tokens used] or null. */
function sayWordsNumber(norm, i) {
  let total = 0, part = 0, used = 0, any = false, j = i;
  for (; j < norm.length; j++) {
    const w = norm[j];
    if (w in SAY_UNITS) { part += SAY_UNITS[w]; any = true; }
    else if (w in SAY_TENS) { part += SAY_TENS[w]; any = true; }
    else if (w in SAY_HUNDREDS) { part = SAY_HUNDREDS[w] === 100 && part > 0 && part < 10 ? part * 100 : part + SAY_HUNDREDS[w]; any = true; }
    else if (w === 'mil' || w === 'thousand') { total += (part || 1) * 1000; part = 0; any = true; }
    else if ((w === 'y' || w === 'e' || w === 'and') && any && j + 1 < norm.length && (norm[j + 1] in SAY_UNITS || norm[j + 1] in SAY_TENS || norm[j + 1] in SAY_HUNDREDS)) { /* a joining word inside the number */ }
    else break;
    used = j - i + 1;
  }
  // "un", "una", "a", "um" alone are articles far more often than amounts ("un café 8")
  if (!any || (used === 1 && ['un', 'una', 'uno', 'um', 'uma', 'one'].includes(norm[i]))) return null;
  return [(total + part) * 100, used];
}

// ---------- the sentence ----------
/** ctx: { today, accounts, categories, rules, transactions, accountId (the one the form starts on), companyCategories }.
    Returns only what the sentence says: a field it does not mention is null, and the form keeps what it had.
    { amount (cents, positive), type, date, accountId, toAccountId, categoryId, subcategoryId, merchant, why } */
function readSay(text, ctx) {
  const out = { amount: null, type: null, date: null, accountId: null, toAccountId: null, categoryId: null, subcategoryId: null, merchant: '', why: null };
  const raw = String(text || '').trim().split(/\s+/).filter(Boolean).map(w => w.replace(/^[¿¡"'“”(\[]+|[?!"'“”)\].,;:]+$/g, '')).filter(Boolean);
  if (!raw.length) return out;
  const norm = raw.map(SAY_FOLD), used = raw.map(() => false), today = ctx.today, W = SAY_WORDS;
  const take = (i, n) => { for (let k = i; k < i + (n || 1); k++) used[k] = true; };
  const isInt = w => /^\d{1,2}$/.test(w), numeric = w => sayNumber(w.replace(/^(r\$|us\$|u\$s|\$|€)/, '').replace(/\$$/, '')) !== null;

  // 1. the day. A bare "el 5" or "dia 5" is a day only when the sentence has another number to be the amount.
  const numbers = norm.filter((w, i) => numeric(w) || /^\d{1,2}(st|nd|rd|th)$/.test(w) || sayWordsNumber(norm, i)).length;
  const dayOfMonth = n => { const ym = today.slice(0, 7), d = n <= +today.slice(8) ? isoDate(ym, n) : isoDate(addMonths(ym, -1), n); return d; };
  const backTo = wd => { const now = new Date(today + 'T00:00:00Z').getUTCDay(); return addDays(today, -(((now - wd + 7) % 7) || 7)); };
  for (let i = 0; i < norm.length && !out.date; i++) {
    const w = norm[i], next = norm[i + 1];
    if (W.today.includes(w)) { out.date = today; take(i); }
    else if (W.yesterday.includes(w)) { out.date = addDays(today, norm[i - 1] === 'antes' || (norm[i - 2] === 'antes' && norm[i - 1] === 'de') ? -2 : -1); take(i); if (norm[i - 1] === 'antes') take(i - 1); if (norm[i - 2] === 'antes' && norm[i - 1] === 'de') take(i - 2, 2); }
    else if (W.before.includes(w)) { out.date = addDays(today, -2); take(i); }
    else if (/^\d{1,2}[\/-]\d{1,2}([\/-]\d{2,4})?$/.test(w)) {      // a day and a month with no year: this year, unless that is far ahead ("20/12" said in January is last December)
      const [d, m, y] = w.split(/[\/-]/).map(Number), year = y ? (y < 100 ? 2000 + y : y) : +today.slice(0, 4);
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12) { let iso = isoDate(year + '-' + String(m).padStart(2, '0'), d); if (!y && dayDiff(iso, today) > 60) iso = isoDate((year - 1) + '-' + String(m).padStart(2, '0'), d); out.date = iso; take(i); }
    }
    else if ((w === 'dia' || w === 'day') && next && isInt(next) && +next >= 1 && +next <= 31 && numbers > 1) { out.date = dayOfMonth(+next); take(i, 2); if (norm[i - 1] === 'el' || norm[i - 1] === 'no' || norm[i - 1] === 'on' || norm[i - 1] === 'the') take(i - 1); }
    else if ((w === 'el' || w === 'the') && next && /^\d{1,2}(st|nd|rd|th)?$/.test(next) && parseInt(next, 10) >= 1 && parseInt(next, 10) <= 31 && numbers > 1 && !W.money.includes(norm[i + 2] || '')) { out.date = dayOfMonth(parseInt(next, 10)); take(i, 2); if (norm[i - 1] === 'on') take(i - 1); }
    else {
      let wd = W.weekdays.findIndex(names => names.includes(w));
      if (wd < 0 && w in W.weekdaysShort && (next === 'feira' || ['na', 'no', 'de', 'da'].includes(norm[i - 1] || ''))) wd = W.weekdaysShort[w];
      if (wd >= 0) { out.date = backTo(wd); take(i); if (next === 'feira') take(i + 1); if (['el', 'na', 'no', 'on', 'last', 'pasado', 'passado', 'passada'].includes(norm[i - 1] || '')) take(i - 1); if (['pasado', 'passado', 'passada'].includes(norm[i + 1] || '')) take(i + 1); }
    }
  }

  // 2. the amount: a number with a money mark wins, then one with cents, then the last number in the sentence
  const cands = [];
  for (let i = 0; i < norm.length; i++) {
    if (used[i]) continue;
    const w = norm[i], sign = /^(r\$|us\$|u\$s|\$|€)/.test(w) || /\$$/.test(w), bare = w.replace(/^(r\$|us\$|u\$s|\$|€)/, '').replace(/\$$/, '');
    let cents = bare ? sayNumber(bare) : null, n = 1, marked = sign;
    if (cents === null) { const words = sayWordsNumber(norm, i); if (words) { cents = words[0]; n = words[1]; } }
    if (cents === null) continue;
    if (/^\d/.test(bare) && (norm[i + n] === 'mil' || norm[i + n] === 'thousand')) { cents *= 1000; n++; }
    const before = /^(r\$|us\$|u\$s|\$|€)$/.test(norm[i - 1] || '') && !used[i - 1], after = W.money.includes(norm[i + n] || '');
    cands.push({ i: before ? i - 1 : i, n: n + (before ? 1 : 0) + (after ? 1 : 0), cents, marked: marked || before || after, cents2: /[.,]\d{1,2}$/.test(bare) });
    i += n - 1;
  }
  const pick = cands.filter(c => c.marked).pop() || cands.filter(c => c.cents2).pop() || cands[cands.length - 1];
  if (pick && pick.cents > 0) { out.amount = pick.cents; take(pick.i, pick.n); }

  // 3. the kind of movement, from its verb
  for (let i = 0; i < norm.length; i++) {
    if (used[i]) continue; const w = norm[i];
    const kind = W.transfer.includes(w) ? 'transfer' : W.income.includes(w) ? 'income' : W.expense.includes(w) ? 'expense' : null;
    if (!kind) continue;
    if (w === 'got' && norm[i + 1] !== 'paid') continue;
    if (!out.type) out.type = kind;
    take(i); if (w === 'got') take(i + 1); if (w === 'pagaron' || w === 'pagaram') { if (norm[i - 1] === 'me') take(i - 1); }
  }

  // 4. accounts: the whole name, the bank, or one word of the name that no other account has. "Card" and "cash" mean the only one there is.
  const accounts = ctx.accounts || [], split = v => SAY_FOLD(v).split(/[^a-z0-9]+/).filter(Boolean), keyOf = a => split(a.name), found = [];
  // One word stands for an account when it is the whole bank ("nubank") or the only telling word of the name ("Nubank account" -> nubank).
  // A word out of a longer name does not ("mercado" is not Mercado Pago: it is where people shop).
  const byWord = {}, telling = list => list.filter(w => w.length >= 3 && !W.generic.includes(w) && !W.filler.includes(w));
  const home = accounts.find(a => a.id === ctx.accountId), side = a => (a.scope === 'business') === (!!home && home.scope === 'business');
  for (const a of accounts) for (const list of [telling(keyOf(a)), telling(split(a.institution || ''))]) if (list.length === 1 && !(byWord[list[0]] || []).includes(a)) (byWord[list[0]] = byWord[list[0]] || []).push(a);
  const isCard = w => W.card.includes(w || '');
  for (let i = 0; i < norm.length; i++) {
    if (used[i]) continue;
    let hit = null, n = 0;
    for (const a of accounts) { const k = keyOf(a); if (k.length > n && k.every((w, j) => norm[i + j] === w && !used[i + j])) { hit = a; n = k.length; } }
    if (!hit && byWord[norm[i]]) {
      // one account has the word: that one. Several ("Nubank account", "Nubank card"): those of the side the form is on, the card when a card is named beside it, else the one everyday account among them.
      const all = byWord[norm[i]], list = all.some(side) && !found.length ? all.filter(side) : all, cards = list.filter(a => a.type === 'credit'), daily = list.filter(a => a.type === 'checking' || a.type === 'cash');
      if (list.length === 1) { hit = list[0]; n = 1; }
      else if (isCard(norm[i + 1]) && cards.length === 1) { hit = cards[0]; n = 2; }
      else if (isCard(norm[i - 1]) && !used[i - 1] && cards.length === 1) { hit = cards[0]; n = 1; take(i - 1); }
      else if (daily.length === 1) { hit = daily[0]; n = 1; }
    }
    if (!hit && isCard(norm[i])) { const cards = accounts.filter(a => a.type === 'credit'); if (cards.length === 1) { hit = cards[0]; n = norm[i + 1] === 'de' && isCard(norm[i + 2]) ? 3 : isCard(norm[i + 1]) ? 2 : 1; } }
    if (!hit && W.cash.includes(norm[i])) { const cash = accounts.filter(a => a.type === 'cash'); if (cash.length === 1) { hit = cash[0]; n = 1; } }
    if (!hit) continue;
    let from = i; if (from > 0 && used[from - 1] && isCard(norm[from - 1])) from--;
    while (from > 0 && !used[from - 1] && W.lead.includes(norm[from - 1])) from--;
    found.push({ a: hit, lead: norm.slice(from, i) }); take(from, i - from + n); i += n - 1;
  }
  if (found.length) {
    out.accountId = found[0].a.id;
    if (found.length > 1 && found[1].a.id !== found[0].a.id) { out.toAccountId = found[1].a.id; if (!out.type || out.type === 'expense') out.type = out.type === 'expense' && !found[1].lead.some(w => ['a', 'al', 'para', 'pro', 'pra', 'to', 'into'].includes(w)) ? out.type : 'transfer'; }
  }
  if (out.type === 'transfer' && found.length === 1 && found[0].lead.some(w => ['a', 'al', 'para', 'pro', 'pra', 'to', 'into'].includes(w))) { out.toAccountId = found[0].a.id; out.accountId = null; }      // "pasé 200 a inter": from the form's own account

  // 5. what is left is the name
  let left = raw.map((w, i) => used[i] ? null : i).filter(i => i !== null);
  while (left.length && W.filler.includes(norm[left[0]])) left.shift();
  while (left.length && W.filler.includes(norm[left[left.length - 1]])) left.pop();
  const name = left.map(i => raw[i]).join(' '), words = left.map(i => norm[i]);
  out.merchant = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';

  // 6. the category: a rule of the person's, then what they recorded under that name before, then a group's own name, then everyday words
  if (out.type !== 'transfer' && words.length) {
    const acc = accounts.find(a => a.id === (out.accountId || ctx.accountId)), biz = !!acc && acc.scope === 'business', tree = biz ? ctx.companyCategories || [] : ctx.categories || [];
    const set = (c, s, why) => { out.categoryId = c; out.subcategoryId = s || null; out.why = why; };
    const rule = biz ? null : matchRule(name, acc ? acc.id : null, ctx.rules || []);
    if (rule && rule.transfer) { if (!out.type) out.type = 'transfer'; }
    else if (rule && tree.some(c => c.id === rule.categoryId)) { set(rule.categoryId, rule.subcategoryId, 'rule'); if (rule.merchant) out.merchant = rule.merchant; }
    if (!out.categoryId && out.type !== 'transfer') {
      const key = normalizeText(name), past = key && (ctx.transactions || []).filter(x => x.categoryId && x.categoryId !== 'other' && x.type !== 'transfer' && !x.splits && normalizeText(x.merchant) === key && tree.some(c => c.id === x.categoryId))
        .sort((a, b) => a.date < b.date ? 1 : -1)[0];
      if (past) { set(past.categoryId, past.subcategoryId, 'before'); out.merchant = past.merchant; }
    }
    if (!out.categoryId && out.type !== 'transfer') {
      const phrase = ' ' + words.join(' ') + ' ', named = [];
      for (const c of tree) { for (const s of c.subs || []) named.push([c, s, SAY_FOLD(s.name)]); named.push([c, null, SAY_FOLD(c.name)]); }
      const byName = named.filter(([, , n]) => n.length > 2 && phrase.includes(' ' + n + ' ')).sort((a, b) => b[2].length - a[2].length)[0];
      if (byName) set(byName[0].id, byName[1] && byName[1].id, 'name');
      else {
        const hinted = named.map(([c, s]) => [c, s, SAY_HINTS[((s || c).k || {}).name] || []]).filter(([, , list]) => words.some(w => list.includes(w) || list.includes(w.replace(/s$/, ''))));
        const best = hinted.find(([, s]) => s) || hinted[0];      // the narrower group first
        if (best) set(best[0].id, best[1] && best[1].id, 'word');
      }
    }
    // a group of income says the kind by itself ("sueldo 3700"), unless the verb already said otherwise
    const cat = tree.find(c => c.id === out.categoryId);
    if (cat && cat.income && !out.type) out.type = 'income';
    if (cat && !!cat.income !== (out.type === 'income') && out.type) { if (out.why !== 'rule' && out.why !== 'before') set(null, null, null); }
  }
  return out;
}
