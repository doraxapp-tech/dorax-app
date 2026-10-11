/* Dorax Finance — imports: a statement on its way in (rows, duplicates, commit). */
// ---------- import sessions ----------
// 2026-10-09 (owner: "I imported a Nubank CSV: the 'Pagamento de fatura' paid down my Nubank card's invoice, and the 'Resgate RDB' came out of the
// account's separate balance; make the import do it by itself"). A statement's own moves between the person's accounts are transfers, not income or
// spending: paying the card's invoice from its account, and money put into or taken out of the bank's separate balance (Nubank's caixinhas and RDB,
// Inter's porquinho, PicPay's cofrinho, a CDB). Each comes in with its other side, so both balances move.
const OWN_CARD_PAY = /\b(PAGAMENTO|PAGTO|PGTO|PAG) (DE |DA |DO )?(FATURA|CARTAO)\b/, OWN_CARD_PAID = /\bPAGAMENTO (RECEBIDO|EFETUADO)\b/;
const OWN_SAVE = /\b(RDB|CDB|CAIXINHAS?|PORQUINHOS?|COFRINHOS?)\b|\bDINHEIRO (GUARDADO|RESGATADO)\b/;
/** What a statement row is, when it is a move between the person's own accounts: { kind: 'card' | 'paid' | 'save', to, make }. */
function ownMove(description, amount, accountId) {
  const a = acct(accountId), d = normalizeText(description); if (!a || a.scope === 'business') return null;
  if (a.type === 'credit') { if (amount > 0 && (OWN_CARD_PAID.test(d) || OWN_CARD_PAY.test(d))) { const deb = cardDebitAcct(a); return { kind: 'paid', to: deb ? deb.id : null }; } return null; }      // the card's statement: its side of a payment already made
  if (amount < 0 && OWN_CARD_PAY.test(d)) {      // the invoice of this bank's card, or of the card of the bank the line names (pairs.js)
    const other = bankNamed(description, a.institution), cr = other ? cardAt(other, a.scope) : cardCredit(cardMain(a)); return { kind: 'card', to: cr ? cr.id : null };
  }
  if (toOneself(description)) { const o = oneselfAt(description, a); return { kind: 'own', to: o ? o.id : null }; }      // a Pix to the person's own name (known-merchants.js)
  if (a.type !== 'credit' && !OWN_SAVE.test(d) && investMove(description)) return { kind: 'invest', to: null };      // to or from investments, asked (pairs.js)
  const m = d.match(OWN_SAVE); if (!m || a.type !== 'checking' || a.savingsOf) return null;
  const sv = S.accounts.find(k => k.type === 'savings' && k.institution === a.institution && k.scope === a.scope && k.currency === a.currency);
  const word = /PORQUINHO/.test(m[0]) ? 'Porquinho' : /COFRINHO/.test(m[0]) ? 'Cofrinho' : /CDB/.test(m[0]) ? 'CDB' : 'Caixinha';
  return { kind: 'save', to: sv ? sv.id : null, make: sv ? null : `${a.institution || a.name} ${word}` };
}
// 2026-10-09 (owner: "I want to reduce human error, the user's work and the load of accepting and categorizing every expense"): what the person
// already did is the first guess. A row no rule matches takes the category its description had the last times it came in (the latest five, the
// most frequent; its name as the person left it), and a category chosen by hand in the review becomes a rule when the import is made.
/** A bank description reduced to what names it: its first words without numbers (dates, ids, amounts). */
const histKey = d => normalizeText(d).split(' ').filter(w => w && !/\d/.test(w)).slice(0, 6).join(' ');
/** The words of a bank line that only say how the money moved, never who it went to. */
const MOVE_WORDS = new Set('PIX ENVIADO ENVIADA RECEBIDO RECEBIDA TRANSFERENCIA TRANSF TED DOC PELO PELA COMPRA COMPRAS NO NA DE DO DA DOS DAS EM DEBITO DEB CREDITO CRED CARTAO PAGAMENTO PAGTO PGTO BOLETO COM PARA A O E VIA APLICACAO RESGATE SAQUE TARIFA ESTORNO VALOR CONTA ONLINE APP QR CODE CODIGO PARCELA PARC AUT AUTOMATICO ELO VISA MASTER MASTERCARD EFETUADO EFETUADA REALIZADO REALIZADA AGENDADO AGENDADA PAGO PAGA NUPAY'.split(' '));
/** A rule's pattern from a description: its first words up to the first with a number, as they stand (rules look for them together); none when they only say how the money moved. */
function rulePattern(d) {
  const lead = []; for (const w of normalizeText(d).split(' ')) { if (!w || /\d/.test(w) || lead.length === 6) break; lead.push(w); }
  return lead.some(w => !MOVE_WORDS.has(w) && w.length > 1) ? lead.join(' ') : '';
}
/** A merchant's name from a bank line no rule knows: the first part that names someone (Nubank writes "Compra no débito - Padaria Sol",
    "Transferência enviada pelo Pix - Roberto - ITAÚ"), without the words of how the money moved, nor numbers; none when nothing names anyone. */
function guessMerchant(d) {
  const named = w => w.length > 1 && !MOVE_WORDS.has(w) && !/\d/.test(w);
  const part = String(d || '').split(/\s+-\s+/).find(x => normalizeText(x).split(' ').some(named)); if (!part) return null;
  const words = [...new Set(normalizeText(part).split(' ').filter(w => w.length > 1 && !/\d/.test(w)))]; while (words.length > 1 && !named(words[0])) words.shift();
  return words.length ? titleCase(words.slice(0, 3).join(' ')) : null;
}
function learnedCat(description, amount, accountId) {
  const k = histKey(description), type = amount >= 0 ? 'income' : 'expense'; if (!k) return null;
  const past = S.transactions.filter(x => x.type === type && x.categoryId && x.categoryId !== 'other' && !x.splits && !isBiz(x.accountId) === !isBiz(accountId) && histKey(x.description || x.merchant) === k).slice(0, 5);
  if (!past.length) return null;
  const tally = {}; past.forEach(x => { const kk = x.categoryId + '|' + (x.subcategoryId || ''); tally[kk] = (tally[kk] || 0) + 1; });
  const [best, n] = Object.entries(tally).sort((a, b) => b[1] - a[1])[0], [categoryId, sub] = best.split('|'), last = past.find(x => x.categoryId === categoryId && (x.subcategoryId || '') === sub);
  return { categoryId, subcategoryId: sub || null, n, merchant: last.merchant, mk: last.k && last.k.merchant || null };
}
function buildRows(raw, accountId) {
  // what says what a line is, first to last: the person's rule; a move between their own accounts; for a refund, the purchase it gives back;
  // what they filed before; a bill of their plan; a merchant everybody knows (known-merchants.js). r.why keeps which one it was, to be said.
  // The type comes first (pairs.js): a move between the person's own accounts, money coming back on a card, what was a transfer the last times,
  // the same amount the other way in another of their accounts. Only then the category.
  const seen = {}, biz = isBiz(accountId), used = new Set(), memo = {}, paired = new Set(), out = [], home = acct(accountId);
  raw.forEach((x, i) => {
    const c = biz ? { merchant: x.name || x.description, categoryId: null, subcategoryId: null, ruleId: null, transfer: x.kind === 'CONVERSION' && !/^Wise Charges/.test(x.description) || x.kind === 'TRANSFER' } : categorize(x.description, accountId, S.rules), conf = x.confidence == null ? 99 : x.confidence;
    let move = biz ? null : ownMove(x.description, x.amount, accountId), why = c.ruleId ? 'rule' : null, learned = null, bill = null, of = null, pair = null, was = null;
    if (move) c.transfer = true;
    if (move && move.kind === 'own') c.merchant = guessMerchant(x.description) || c.merchant;
    if (!biz && !c.ruleId && !c.transfer && (was = learnedTransfer(x.description, x.amount, accountId))) { move = { kind: 'own', to: was.to }; c.transfer = true; why = 'before'; c.merchant = guessMerchant(x.description) || c.merchant; }
    // money coming into a card is never income: it is the invoice's payment (a move, above) or money given back for a purchase
    const cardIn = !biz && !!home && home.type === 'credit' && x.amount > 0 && !c.transfer, refund = !biz && !c.transfer && (cardIn || isRefund(x.description, x.amount));
    if (!biz && !c.ruleId && !c.transfer && !refund && (pair = pairFor(x, accountId, paired))) {
      move = { kind: 'pair', to: pair.t.accountId, tx: pair.t.id, date: pair.t.date }; c.merchant = guessMerchant(x.description) || c.merchant;
      if (pair.sure) { c.transfer = true; why = 'pair'; }
    }
    const open = !biz && !c.ruleId && !c.transfer, known = open || refund ? knownMerchant(x.description) : null;      // a pair only asked about still gets its category, in case it is not one
    const byKind = () => { const kc = known && kindCategory(known.kind); if (kc) { Object.assign(c, kc); return true; } return false; };
    if (refund) {
      of = refundOf(x, accountId, out); if (!c.ruleId) { why = 'refund'; c.merchant = of ? of.merchant : (known && known.name) || guessMerchant(x.description) || c.merchant; }
      if (c.ruleId) { /* the person's rule names it and files it; it stays money given back */ } else if (of && of.categoryId) Object.assign(c, { categoryId: of.categoryId, subcategoryId: of.subcategoryId || null, mk: of.mk || (of.k && of.k.merchant) || null }); else byKind();
    } else if (open) {
      learned = learnedCat(x.description, x.amount, accountId);
      if (learned) { Object.assign(c, { categoryId: learned.categoryId, subcategoryId: learned.subcategoryId, merchant: learned.merchant, mk: learned.mk }); why = 'before'; }
      else {
        c.merchant = (known && known.name) || guessMerchant(x.description) || c.merchant;      // who it was, not how it was paid
        if (x.amount < 0 && (bill = billFor(x, accountId, used, memo, known))) { Object.assign(c, { categoryId: bill.line.categoryId, subcategoryId: bill.line.subcategoryId || null }); why = 'bill'; }
        else if (x.amount < 0 && byKind()) why = 'known';
      }
    }
    const key = [accountId, x.date, x.amount, normalizeText(x.description)].join('|'); seen[key] = (seen[key] || 0) + 1;
    const state = conf >= 90 ? 'verified' : conf >= 65 ? 'review' : 'uncertain';
    const row = { id: 'r' + i, date: x.date, description: x.description, amount: x.amount, merchant: c.merchant, mk: c.mk || null, categoryId: c.categoryId, subcategoryId: c.subcategoryId, ruleId: c.ruleId,
      type: c.transfer ? 'transfer' : refund || x.amount < 0 ? 'expense' : 'income', confidence: conf, state, issue: x.issue || (open && !why ? 'norule' : ''),      // a refund is spending with money coming back
      sourceTxnId: x.sourceTxnId || null, fitid: x.sourceTxnId || 'DX' + x.date.replace(/-/g, '') + hashHex(key + '|' + seen[key]).slice(0, 10).toUpperCase(),
      decision: S.settings.autoAcceptVerified && state === 'verified' ? 'accept' : null, sel: false, keepBoth: false, edited: false, catTouched: false, move,
      why, learned: learned ? learned.n : 0, bill: bill ? bill.line.name : null, refund: !!refund, refundOf: of ? of.date : null,
      check: !!refund || !!(bill && !bill.exact) || !!pair || (!!move && move.kind === 'invest') };      // shown to be looked at: a refund, a bill whose amount was not the planned one, a pair, a move to investments
    setDup(row, accountId);
    out.push(row);
  });
  return out;
}
/** The person's own changes carried over when a review is read again (owner, 2026-10-09: "sometimes I pick the wrong account, continue to the
    review and want to go back to change the bank, and I can't; move the bank to the next step or add a back button, without losing the import or
    the changes made"). Rows are the same lines of the same file in the same order: what was decided, chosen, named or filed by hand stays. A type
    chosen by hand stays while the line still goes the same way; an amount typed by hand stays while the file is read the same way round. */
function keepEdits(old, rows, sameWay, accountId) {
  (old || []).forEach(o => {
    const r = rows.find(x => x.id === o.id); if (!r || r.date !== o.date || normalizeText(r.description) !== normalizeText(o.descWas || o.description)) return;
    Object.assign(r, { decision: o.decision, sel: o.sel, keepBoth: o.keepBoth, seen: o.seen });
    if (o.descTouched) Object.assign(r, { description: o.description, descTouched: true, descWas: o.descWas });
    if (o.nameTouched) Object.assign(r, { merchant: o.merchant, mk: null, nameTouched: true });
    if (o.catTouched) Object.assign(r, { categoryId: o.categoryId, subcategoryId: o.subcategoryId, catTouched: true, issue: o.categoryId ? '' : r.issue });
    if (o.amtTouched && sameWay) Object.assign(r, { amount: o.amount, amtTouched: true });
    if (o.typeTouched && Math.sign(o.amount) === Math.sign(r.amount)) Object.assign(r, { type: o.type, typeTouched: true, refund: o.type === 'expense' && r.amount > 0 });
    if (o.edited) { r.edited = true; setDup(r, accountId); }
  });
  return rows;
}
/** A review read again from its file, for the account chosen now, keeping what the person changed (keepEdits). */
function readAgain(i) {
  const raw = i.csv ? csvRows(i).filter(r => r.date && r.amount !== null).map(r => ({ ...r, confidence: 99 })) : i.raw; if (!raw) return;
  const old = i.rows, sameWay = i.readInvert === undefined || i.readInvert === !!i.invert;
  i.rows = keepEdits(old, buildRows(raw, i.accountId), sameWay, i.accountId); i.readInvert = !!i.invert;
}
function setDup(row, accountId) {
  const d = findDuplicate(row, accountId, S.transactions);
  row.dup = d ? { id: d.txn.id, date: d.txn.date, merchant: d.txn.merchant, amount: d.txn.amount, certainty: d.certainty } : null;
}
function commitSession(sess) {
  const rows = importable(sess), accepted = sess.rows.filter(r => r.decision === 'accept').length, home = acct(sess.accountId), cur = home.currency, biz = isBiz(sess.accountId), before = S.transactions.slice();
  const impId = newId('i');      // every row brought in knows its import, so the import can be undone whole (owner, 2026-10-09)
  // the bank's separate balance, when it has no account yet: made once, with what the person said is in it today (the moves of this file taken back)
  let made = null; const paired = [];      // ledger rows a pair turned into a transfer, with what they were (undoing the import puts them back)
  const savings = mv => { if (made) return made; const into = sum(rows.filter(r => r.type === 'transfer' && r.move && r.move.kind === 'save' && !r.move.to).map(r => -r.amount)), now = typedAmount(String(sess.saveBal || '').trim() || '');
    made = { id: newId('a'), name: mv.make, institution: home.institution, type: 'savings', currency: cur, scope: home.scope, purpose: '', opening: now === null ? 0 : now - into }; S.accounts.push(made); return made; };
  rows.forEach(r => {
    const mv = r.type === 'transfer' ? r.move : null, other = mv ? (mv.to ? acct(mv.to) : mv.kind === 'save' && mv.make ? savings(mv) : null) : null;
    S.transactions.push({ id: newId('t'), accountId: sess.accountId, date: r.date, description: r.description, merchant: r.merchant, amount: r.amount, currency: cur, type: r.type,
      categoryId: r.type === 'transfer' || biz ? null : r.categoryId || 'other', subcategoryId: r.type === 'transfer' || biz ? null : r.subcategoryId, status: 'confirmed', transferAccountId: other ? other.id : null, recurring: false, notes: '',
      source: sess.source, sourceTxnId: r.sourceTxnId, confidence: r.confidence, splits: null, fingerprint: fingerprint(sess.accountId, r.date, r.merchant, r.amount), importId: impId, ...(r.mk ? { k: { merchant: r.mk } } : {}) });   // a merchant name that came from one of the app's own rules keeps following the language
    // a pair: its other side is already in the ledger, counted as spending or income; it becomes the transfer's other side (pairs.js)
    if (mv && mv.kind === 'pair') { const t0 = S.transactions.find(x => x.id === mv.tx); if (t0) { paired.push({ id: t0.id, was: { type: t0.type, categoryId: t0.categoryId, subcategoryId: t0.subcategoryId, transferAccountId: t0.transferAccountId || null } }); Object.assign(t0, { type: 'transfer', categoryId: null, subcategoryId: null, transferAccountId: sess.accountId }); } }
    // its other side, unless that account already has it (its own statement came in before)
    else if (other && mv.kind !== 'paid') {
      const merchant = mv.kind === 'card' ? t('Payment received from {name}', { name: home.name }) : r.merchant, x = { amount: -r.amount, date: r.date, merchant, description: r.description };
      if (!findDuplicate(x, other.id, before)) S.transactions.push({ id: newId('t'), accountId: other.id, date: r.date, description: r.description, merchant, amount: -r.amount, currency: other.currency, type: 'transfer', categoryId: null, subcategoryId: null,
        status: 'confirmed', transferAccountId: sess.accountId, recurring: false, notes: '', source: sess.source, sourceTxnId: null, confidence: r.confidence, splits: null, fingerprint: fingerprint(other.id, r.date, merchant, -r.amount), importId: impId });
    }
  });
  S.transactions.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  const result = { imported: rows.length, duplicates: accepted - rows.length, ignored: sess.rows.length - accepted, made: made && made.id };
  // a category chosen by hand becomes a rule, so the next file needs nothing (not for a description a rule already covers, nor twice)
  const learnt = [], byPat = {};
  if (!biz) rows.filter(r => r.catTouched && r.categoryId && r.categoryId !== 'other' && (r.type === 'expense' || r.type === 'income') && !matchRule(r.description, sess.accountId, S.rules)).forEach(r => {
    const p = rulePattern(r.description); if (p && !S.rules.some(x => normalizeText(x.pattern) === p)) (byPat[p] = byPat[p] || []).push(r);
  });
  Object.entries(byPat).forEach(([pattern, rs]) => {      // one rule a pattern, and none when its rows were filed differently
    if (rs.some(r => r.categoryId !== rs[0].categoryId || (r.subcategoryId || null) !== (rs[0].subcategoryId || null))) return;
    const r = rs[0], rule = { id: newId('r'), pattern, merchant: r.merchant, categoryId: r.categoryId, subcategoryId: r.subcategoryId || null, priority: 10, accountId: null, active: true, transfer: false, auto: true }; S.rules.push(rule); learnt.push(rule);
  });
  // a row the person made a transfer by hand: a rule that makes it one next time (never for a line a rule covers, nor from a pair the app proposed)
  const moved = {};
  if (!biz) rows.filter(r => r.typeTouched && r.type === 'transfer' && !(r.move && r.move.kind === 'pair') && !matchRule(r.description, sess.accountId, S.rules)).forEach(r => { const p = rulePattern(r.description); if (p && !S.rules.some(x => normalizeText(x.pattern) === p)) (moved[p] = moved[p] || []).push(r); });
  Object.entries(moved).forEach(([pattern, rs]) => { const rule = { id: newId('r'), pattern, merchant: rs[0].merchant, categoryId: null, subcategoryId: null, priority: 10, accountId: null, active: true, transfer: true, auto: true }; S.rules.push(rule); learnt.push(rule); });
  result.rules = learnt.map(x => [x.merchant, x.transfer ? t('Transfer') : catName(x.subcategoryId || x.categoryId)]); result.paired = paired.length;
  S.imports.unshift({ id: impId, date: S.today, source: sess.source, file: sess.file, accountId: sess.accountId, detected: sess.rows.length, imported: rows.length, duplicates: result.duplicates, review: 0, status: 'Completed', ...(made ? { made: made.id } : {}), ...(learnt.length ? { rules: learnt.map(x => x.id) } : {}), ...(paired.length ? { paired } : {}) });
  return result;
}
function csvRows(imp) { const sign = imp.invert ? -1 : 1; return imp.csv.rows.map(r => { const a = parseAmount(r[imp.map.amount] || ''); return { date: parseDate(r[imp.map.date] || ''), description: (r[imp.map.description] || '').trim(), amount: a === null ? null : a * sign }; }); }
/** Statements from Brazilian banks are often not UTF-8. Read as UTF-8 when the bytes allow it, as Windows-1252 otherwise, so accents survive. */
async function readText(file) {
  const buf = await file.arrayBuffer();
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^\uFEFF/, ''); } catch (e) { return new TextDecoder('windows-1252').decode(buf); }
}
const csvGuess = csv => { const g = re => Math.max(0, csv.header.findIndex(h => re.test(normalizeText(h)))); return { date: g(/DATA|DATE|FECHA/), description: g(/HIST|DESC|MEMO|TITLE|TITULO|DETALHE|LANCAMENTO/), amount: g(/VALOR|AMOUNT|MONTO|IMPORTE/) }; };
/** Whether most rows of a CSV read as money coming in, the way it is read now (inverted or not). */
const mostlyIn = (imp, inv = imp.invert) => { const v = imp.csv.rows.map(r => parseAmount(r[imp.map.amount] || '')).filter(x => x !== null && x !== 0).map(x => inv ? -x : x); return v.length > 0 && v.filter(x => x > 0).length > v.length / 2; };
/** How a card's statement must be read, from its own lines: its payment and its refunds are money coming into the card, so when one of them reads
    as money going out, the file is the other way round (owner, 2026-10-09: "the most dangerous is the type"). Without such a line, most rows
    coming in says the same. true: the way it is read now is wrong. */
function cardReadWrong(imp, inv = imp.invert) {
  const lines = imp.csv.rows.map(r => [normalizeText(r[imp.map.description] || ''), parseAmount(r[imp.map.amount] || '')]).filter(([, v]) => v !== null && v !== 0).map(([d, v]) => [d, inv ? -v : v]);
  const back = lines.filter(([d]) => OWN_CARD_PAID.test(d) || OWN_CARD_PAY.test(d) || REFUND.test(d));
  return back.length ? back.filter(([, v]) => v < 0).length > back.length / 2 : mostlyIn(imp, inv);
}
/** A card's statement chosen for an account that is not the card (owner, 2026-10-09: "sometimes I pick the wrong account"): its payment line
    ("Pagamento recebido"), or most of it coming in, says so; offered with the way to the bank's card. */
function cardFileHint(imp) {
  const a = acct(imp.accountId); if (!imp.csv || !a || a.type === 'credit' || a.scope === 'business') return '';
  const lines = imp.csv.rows.map(r => normalizeText(r[imp.map.description] || ''));
  if (!lines.some(d => OWN_CARD_PAID.test(d)) && !mostlyIn(imp)) return '';
  const card = cardCredit(cardMain(a)) || cardAt(a.institution, a.scope); if (!card) return '';
  return banner('warn', `<b>${t('This looks like the statement of a card.')}</b> ${t('Read into {name}, its purchases would count as income.', { name: esc(acctName(a)) })} <button class="btn sm" data-a="imp-to-card" data-id="${card.id}">${t('Import into {name}', { name: esc(acctLabel(card)) })}</button>`);
}
/** A card's statement read the wrong way round: said, with the way to turn it round. */
const flipNote = imp => imp.csv && acct(imp.accountId) && acct(imp.accountId).type === 'credit' && cardReadWrong(imp) ? banner('warn', `<b>${t('Almost everything reads as money coming into the card.')}</b> ${t('On a card’s statement purchases usually come as positive numbers.')} <button class="btn sm" data-a="imp-flip">${t('Read the purchases as spending')}</button>`) : '';
/** The column choice kept for an account is used again only when the file has the same columns. */
function csvMapFor(imp) {
  const a = acct(imp.accountId), sig = imp.csv.header.join('|'), kept = a && a.csvMap && a.csvMap.sig === sig ? a.csvMap : null;
  // a card's statement: read so that its payment and refunds come in (cardReadWrong); without them, purchases are positive when most rows are
  imp.map = kept ? { ...kept.map } : csvGuess(imp.csv); imp.invert = kept ? !!kept.invert : !!a && a.type === 'credit' && cardReadWrong(imp, false); imp.kept = !!kept;
}
/** A statement file chosen by the person: read in the browser, checked, then sent through the review table. */
async function takeStatement(file, source) {
  const mine = impAccounts(), side = UI.space === 'business' ? 'business' : 'personal', fail = m => { UI.imp = null; UI.impError = m; render(); };      // the side's accounts (imports.view.js)
  UI.impError = null;
  if (!mine.length) return fail(t('Add an account first.'));
  if (file.size > 10 * 1024 * 1024) return fail(t('That file is larger than 10 MB. Export a shorter statement period and try again.'));
  let text; try { text = await readText(file); } catch (e) { return fail(t('The file could not be read. Try choosing it again.')); }
  // a phone chooses the account above its one button (imports.phone.js: UI.impDest), and tells OFX from CSV by what the file holds
  if (source === 'auto') source = /<OFX>/i.test(text) ? 'ofx' : 'csv';
  const accountId = mine.some(a => a.id === UI.impDest) ? UI.impDest : mine.some(a => a.id === UI.tx.account) ? UI.tx.account : (mainOf(side, side === 'business' ? BCUR() : BASE_CURRENCY) || mainOf(side) || mine[0]).id;      // the side's main account unless one of its accounts is being looked at
  if (source === 'csv') {
    if (/<OFX>/i.test(text)) return fail(t('That is an OFX file. Use “Choose an OFX”.'));
    const csv = parseCSV(text); csv.rows = csv.rows.filter(r => r.some(c => String(c).trim()));
    if (csv.header.length < 2 || !csv.rows.length) return fail(t('No table was found in that file. It needs a first row with column names and at least one row below it.'));
    UI.imp = { source: 'csv', file: file.name, accountId, step: 'map', csv, remember: true, real: true }; csvMapFor(UI.imp);
    // on a phone the columns are asked only when the guess cannot read the file: three different columns, and most rows read
    if (smallPhone()) { const m = UI.imp.map, rows = csvRows(UI.imp), good = rows.filter(r => r.date && r.amount !== null).length;
      if (new Set([m.date, m.description, m.amount]).size === 3 && good && good >= rows.length * 0.8) { readAgain(UI.imp); UI.imp.step = 'review'; } }
  } else {
    if (!/<OFX>/i.test(text)) return fail(t('That file is not an OFX statement. In your bank, choose OFX (also called “Money”) when you export.'));
    const parsed = parseOFX(text), rows = parsed.rows.filter(r => parseDate(r.date) && r.amount !== null && !isNaN(r.amount));
    if (!rows.length) return fail(t('That OFX file has no transactions.'));
    const cur = parsed.currency && mine.find(a => a.currency === parsed.currency) ? parsed.currency : null, target = cur && acct(accountId).currency !== cur ? mine.find(a => a.currency === cur).id : accountId;
    UI.imp = { source: 'ofx', file: file.name, accountId: target, step: 'review', raw: rows.map(r => ({ ...r, confidence: 100 })), real: true,
      note: parsed.currency && !cur ? t('The file is in {cur} and no household account uses that currency. Check the account before importing.', { cur: parsed.currency }) : rows.length < parsed.rows.length ? tn(parsed.rows.length - rows.length, '{n} row without a valid date or amount was left out.', '{n} rows without a valid date or amount were left out.') : '' };
    UI.imp.rows = buildRows(UI.imp.raw, target);
  }
  render();
  if (smallPhone()) { const w = document.querySelector('.work'); if (w) w.scrollTop = 0; window.scrollTo(0, 0); return; }      // a phone: its review from the top, under the bar
  const el = $('imp-panel'); if (el) el.scrollIntoView({ block: 'start' });
}
/** The phone's one button, from anywhere that offers it (the first-time page, features/tours/tours.js): the system's file picker. */
function impPick() { const el = $('imp-file-m'); if (el) el.click(); }
