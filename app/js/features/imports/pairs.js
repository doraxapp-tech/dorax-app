/* Dorax Finance — imports: money moving between the person's own accounts, told apart from spending and income. */
// 2026-10-09 (owner: "the most dangerous is not the category, it is the type (expense, income, transfer)"). A category in the wrong place only
// moves money between groups; a wrong type changes the totals: a transfer counted as an expense in one account and an income in the other makes
// both figures bigger than they are, and a purchase read as income turns the month around. So:
//   - the same amount the other way in another of the person's accounts, within three days, is a move between them (pairFor); sure when a line
//     says so (it names the other bank, "mesma titularidade", or the other side is already an unlinked transfer), otherwise only asked;
//   - money to or from investments (a broker, Tesouro Direto, an "aplicação" or "resgate") is the person's own money changing place (investMove);
//   - paying a card's invoice from another bank's account pays that bank's card (cardAt);
//   - what the person filed as a transfer before comes in as one again (learnedTransfer);
//   - and pairs already in the ledger, counted as spending and income, are found and offered to be put right (ledgerPairs).

const SURE_OWN = /\b(MESMA TITULARIDADE|ENTRE CONTAS|CONTA PROPRIA|CONTAS PROPRIAS|MESMO TITULAR)\b/;
const INVEST_MOVE = /\b(XP INVESTIMENTOS|XP INVEST|RICO INVESTIMENTOS|CLEAR CORRETORA|NUINVEST|EASYNVEST|INTER DTVM|AVENUE SECURITIES|NOMAD|TORO INVESTIMENTOS|GENIAL INVESTIMENTOS|ORAMA|WARREN|TESOURO DIRETO|CORRETORA|DTVM|CTVM|APLICACAO|RESGATE|POUPANCA|LCI|LCA|FUNDOS? DE INVESTIMENTO)\b/;
const INVEST_INCOME = /\b(RENDIMENTOS?|RENDIMENTO|JUROS|DIVIDENDOS?|PROVENTOS?|JCP)\b/;
/** A move to or from the person's investments: their own money changing place, not spending and not income (what it earns is income). */
const investMove = d => { const n = normalizeText(d); return INVEST_MOVE.test(n) && !INVEST_INCOME.test(n); };
/** Whether a line names a bank, by the app's name for it (BANK_WORDS, known-merchants.js). */
const namesBank = (d, bank) => !!bank && BANK_WORDS.some(([re, name]) => name === bank && re.test(normalizeText(d)));
/** The bank a line names, other than `own`. */
const bankNamed = (d, own) => { const n = normalizeText(d); return (BANK_WORDS.find(([re, name]) => name !== own && re.test(n)) || [])[1] || null; };
/** A bank's one credit card on a side, or null when there is none or more than one. */
function cardAt(bank, scope) { const cs = S.accounts.filter(k => k.type === 'credit' && k.institution === bank && (k.scope === 'business') === (scope === 'business')); return cs.length === 1 ? cs[0] : null; }

/** The same amount the other way in another account of the same side and currency, within three days, not yet linked as a transfer:
    { t, sure } or null. Two that fit as well are left to the person. `used` keeps one ledger row from answering two lines of a file. */
function pairFor(x, accountId, used) {
  const a = acct(accountId); if (!a || !x.amount) return null;
  const mine = new Set(cardParts(cardMain(a)).map(k => k.id).concat(accountId)), near = t => Math.abs(dayDiff(t.date, x.date));
  const fits = S.transactions.filter(t => t.amount === -x.amount && !mine.has(t.accountId) && !used.has(t.id) && t.status !== 'ignored' && !t.splits && near(t) <= 3 && (t.type !== 'transfer' || !t.transferAccountId)
    && (o => o && o.scope === a.scope && o.currency === a.currency)(acct(t.accountId))).sort((p, q) => near(p) - near(q));
  if (!fits.length || (fits[1] && near(fits[1]) === near(fits[0]))) return null;
  const t = fits[0], o = acct(t.accountId); used.add(t.id);
  const sure = t.type === 'transfer' || SURE_OWN.test(normalizeText(x.description)) || SURE_OWN.test(normalizeText(t.description || '')) || namesBank(x.description, o.institution) || namesBank(t.description || '', a.institution);
  return { t, sure };
}
/** What the person filed before for this line, when most of the last times it was a transfer: { to } (the account it most often went to or came from). */
function learnedTransfer(description, amount, accountId) {
  const k = histKey(description); if (!k) return null;
  const past = S.transactions.filter(x => Math.sign(x.amount) === Math.sign(amount) && !isBiz(x.accountId) === !isBiz(accountId) && histKey(x.description || x.merchant) === k).slice(0, 5);
  const moves = past.filter(x => x.type === 'transfer'); if (!past.length || moves.length * 2 <= past.length) return null;
  const tally = {}; moves.forEach(x => { if (x.transferAccountId && acct(x.transferAccountId)) tally[x.transferAccountId] = (tally[x.transferAccountId] || 0) + 1; });
  const to = (Object.entries(tally).sort((p, q) => q[1] - p[1])[0] || [])[0] || null;
  return { to, n: past.length };
}

// ---------- pairs already in the ledger ----------
const pairKey = (p, q) => [p.id, q.id].sort().join('|');
/** Household spending in one account and income of the same amount in another, within three days: [[out, in], ...], newest first.
    Each row in one pair at most; a pair the person said is not a move is not offered again (S.pairsNo). */
function ledgerPairs() {
  const no = new Set(S.pairsNo || []), ok = t => !isBiz(t.accountId) && t.status !== 'ignored' && !t.splits && acct(t.accountId);
  const ins = {}; S.transactions.forEach(t => { if (t.type === 'income' && t.amount > 0 && ok(t)) (ins[t.amount] = ins[t.amount] || []).push(t); });
  const used = new Set(), out = [];
  S.transactions.filter(t => t.type === 'expense' && t.amount < 0 && ok(t) && ins[-t.amount]).sort((p, q) => p.date < q.date ? 1 : -1).forEach(e => {
    const a = acct(e.accountId), mine = new Set(cardParts(cardMain(a)).map(k => k.id).concat(e.accountId)), near = t => Math.abs(dayDiff(t.date, e.date));
    const i = ins[-e.amount].filter(t => !used.has(t.id) && !mine.has(t.accountId) && acct(t.accountId).currency === a.currency && near(t) <= 3 && !no.has(pairKey(e, t))).sort((p, q) => near(p) - near(q))[0];
    if (i) { used.add(i.id); out.push([e, i]); }
  });
  return out;
}
/** A pair made one move: both rows become a transfer, each pointing at the other's account. */
function makePair(e, i) {
  Object.assign(e, { type: 'transfer', categoryId: null, subcategoryId: null, transferAccountId: i.accountId });
  Object.assign(i, { type: 'transfer', categoryId: null, subcategoryId: null, transferAccountId: e.accountId });
}
