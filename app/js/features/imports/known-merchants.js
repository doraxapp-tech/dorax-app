/* Dorax Finance — imports: what a Brazilian bank line says by itself (a bill of the plan, a known merchant, a refund, a Pix to oneself). */
// 2026-10-09 (owner: "reduce human error, the user's work and the load of accepting and categorizing every expense"), phase 2 of 3. After the
// person's own rules and what they filed before (import-session.js), a line can still be read from what it is: the amount of a bill in the plan
// that is still unpaid, a merchant everybody in Brazil knows, a refund ("estorno") that gives back part of a purchase, or a Pix sent to the
// person's own name. Nothing here invents a group: a known merchant only takes a group the person already has whose name (or the app's own
// words for it) says the same kind of spending; with none, it is only named.

// ---------- known merchants: [the words in the bank's line, the name to show, the kind of spending] ----------
const KNOWN_MERCHANTS = [
  [/\bIFOOD\b/, 'iFood', 'delivery'], [/\bRAPPI\b/, 'Rappi', 'delivery'], [/\bZE DELIVERY\b/, 'Zé Delivery', 'delivery'], [/\bUBER ?EATS\b/, 'Uber Eats', 'delivery'], [/\bAIQFOME\b/, 'aiqfome', 'delivery'],
  [/\bMC ?DONALDS?\b|\bMCDONALD\b/, 'McDonald’s', 'eatout'], [/\bBURGER KING\b|\bBK BRASIL\b/, 'Burger King', 'eatout'], [/\bSTARBUCKS\b/, 'Starbucks', 'eatout'], [/\bOUTBACK\b/, 'Outback', 'eatout'],
  [/\bHABIBS?\b/, 'Habib’s', 'eatout'], [/\bSUBWAY\b/, 'Subway', 'eatout'], [/\bSPOLETO\b/, 'Spoleto', 'eatout'], [/\bGIRAFFAS\b/, 'Giraffas', 'eatout'], [/\bCOCO BAMBU\b/, 'Coco Bambu', 'eatout'],
  [/\bUBER\b/, 'Uber', 'transport'], [/\b99 ?(APP|POP|TAXI|TECNOLOGIA)\b|\b99APP\b/, '99', 'transport'], [/\bCABIFY\b/, 'Cabify', 'transport'], [/\bBLABLACAR\b/, 'BlaBlaCar', 'transport'],
  [/\bSHELL\b/, 'Shell', 'fuel'], [/\bIPIRANGA\b/, 'Ipiranga', 'fuel'], [/\bPETROBRAS\b|\bBR MANIA\b/, 'Petrobras', 'fuel'], [/\bAUTO ?POSTO\b|\bPOSTO DE COMBUSTIVE/, 'Posto', 'fuel'],
  [/\bSEM PARAR\b/, 'Sem Parar', 'tolls'], [/\bCONECTCAR\b/, 'ConectCar', 'tolls'], [/\bVELOE\b/, 'Veloe', 'tolls'], [/\bESTAPAR\b/, 'Estapar', 'parking'],
  [/\bNETFLIX\b/, 'Netflix', 'video'], [/\bDISNEY ?(PLUS|\+)?\b/, 'Disney+', 'video'], [/\bHBO ?MAX\b|\bHBOMAX\b/, 'Max', 'video'], [/\bGLOBOPLAY\b/, 'Globoplay', 'video'], [/\bPRIME ?VIDEO\b|\bAMAZON PRIME\b|\bAMAZONPRIME\b/, 'Amazon Prime', 'video'],
  [/\bPARAMOUNT\b/, 'Paramount+', 'video'], [/\bCRUNCHYROLL\b/, 'Crunchyroll', 'video'], [/\bYOUTUBE ?PREMIUM\b|\bGOOGLE YOUTUBE\b/, 'YouTube Premium', 'video'],
  [/\bSPOTIFY\b/, 'Spotify', 'music'], [/\bDEEZER\b/, 'Deezer', 'music'], [/\bAPPLE ?COM ?BILL\b|\bAPPLE COM\b|\bITUNES\b/, 'Apple', 'subs'], [/\bGOOGLE (ONE|STORAGE|PLAY)\b/, 'Google', 'subs'],
  [/\bICLOUD\b/, 'iCloud', 'cloud'], [/\bDROPBOX\b/, 'Dropbox', 'cloud'], [/\bMELIMAIS\b|\bMELI ?\+/, 'Meli+', 'subs'], [/\bOPENAI\b|\bCHATGPT\b/, 'ChatGPT', 'subs'], [/\bANTHROPIC\b|\bCLAUDE AI\b/, 'Claude', 'subs'],
  [/\bMICROSOFT\b|\bXBOX\b/, 'Microsoft', 'subs'], [/\bADOBE\b/, 'Adobe', 'subs'], [/\bCANVA\b/, 'Canva', 'subs'],
  [/\bCLARO\b/, 'Claro', 'phone'], [/\bVIVO\b|\bTELEFONICA\b/, 'Vivo', 'phone'], [/\bTIM ?(S A|SA|CELULAR|BRASIL)?\b(?! [A-Z]{3,})/, 'TIM', 'phone'],
  [/\bENEL\b/, 'Enel', 'power'], [/\bCEMIG\b/, 'Cemig', 'power'], [/\bCOPEL\b/, 'Copel', 'power'], [/\bCELESC\b/, 'Celesc', 'power'], [/\bCOELBA\b/, 'Coelba', 'power'], [/\bNEOENERGIA\b/, 'Neoenergia', 'power'],
  [/\bEQUATORIAL\b/, 'Equatorial', 'power'], [/\bCPFL\b/, 'CPFL', 'power'], [/\bLIGHT (S A|SA|SERVICOS)\b/, 'Light', 'power'],
  [/\bSABESP\b/, 'Sabesp', 'water'], [/\bCEDAE\b|\bAGUAS DO RIO\b/, 'Águas do Rio', 'water'], [/\bCOPASA\b/, 'Copasa', 'water'], [/\bSANEPAR\b/, 'Sanepar', 'water'], [/\bEMBASA\b/, 'Embasa', 'water'], [/\bCOMGAS\b/, 'Comgás', 'gas'], [/\bNATURGY\b/, 'Naturgy', 'gas'],
  [/\bDROGASIL\b/, 'Drogasil', 'pharmacy'], [/\bDROGA ?RAIA\b|\bRAIA DROGASIL\b/, 'Droga Raia', 'pharmacy'], [/\bPAGUE ?MENOS\b/, 'Pague Menos', 'pharmacy'], [/\bPANVEL\b/, 'Panvel', 'pharmacy'],
  [/\bULTRAFARMA\b/, 'Ultrafarma', 'pharmacy'], [/\bPACHECO\b/, 'Drogarias Pacheco', 'pharmacy'], [/\bDROGARIA\b|\bFARMACIA\b/, null, 'pharmacy'],
  [/\bCARREFOUR\b/, 'Carrefour', 'groceries'], [/\bASSAI\b/, 'Assaí', 'groceries'], [/\bATACADAO\b/, 'Atacadão', 'groceries'], [/\bPAO DE ACUCAR\b/, 'Pão de Açúcar', 'groceries'],
  [/\bSAMS CLUB\b/, 'Sam’s Club', 'groceries'], [/\bOXXO\b/, 'Oxxo', 'groceries'], [/\bZAFFARI\b/, 'Zaffari', 'groceries'], [/\bGUANABARA\b/, 'Guanabara', 'groceries'], [/\bHIROTA\b/, 'Hirota', 'groceries'],
  [/\bSONDA\b/, 'Sonda', 'groceries'], [/\bMAMBO\b/, 'Mambo', 'groceries'], [/\bSUPERMERCADOS?\b|\bHIPERMERCADO\b|\bHORTIFRUTI\b|\bSACOLAO\b/, null, 'groceries'],
  [/\bMERCADO ?LIVRE\b|\bMERCADOLIVRE\b/, 'Mercado Livre', 'shopping'], [/\bSHOPEE\b/, 'Shopee', 'shopping'], [/\bAMAZON\b/, 'Amazon', 'shopping'], [/\bMAGALU\b|\bMAGAZINE ?LUIZA\b/, 'Magalu', 'shopping'],
  [/\bAMERICANAS\b/, 'Americanas', 'shopping'], [/\bALIEXPRESS\b/, 'AliExpress', 'shopping'], [/\bSHEIN\b/, 'Shein', 'shopping'], [/\bCASAS BAHIA\b/, 'Casas Bahia', 'shopping'], [/\bKABUM\b/, 'KaBuM!', 'shopping'],
  [/\bRENNER\b/, 'Renner', 'clothes'], [/\bRIACHUELO\b/, 'Riachuelo', 'clothes'], [/\bC ?& ?A MODAS\b|\bCEA MODAS\b/, 'C&A', 'clothes'], [/\bZARA\b/, 'Zara', 'clothes'], [/\bCENTAURO\b/, 'Centauro', 'clothes'], [/\bNETSHOES\b/, 'Netshoes', 'clothes'],
  [/\bSMART ?FIT\b/, 'Smart Fit', 'gym'], [/\bBLUEFIT\b/, 'Bluefit', 'gym'], [/\bBODYTECH\b/, 'Bodytech', 'gym'], [/\bSELFIT\b/, 'Selfit', 'gym'], [/\bTOTAL ?PASS\b/, 'TotalPass', 'gym'], [/\bGYMPASS\b|\bWELLHUB\b/, 'Wellhub', 'gym'],
  [/\bLATAM\b/, 'LATAM', 'travel'], [/\bGOL LINHAS\b|\bVOEGOL\b/, 'GOL', 'travel'], [/\bAZUL LINHAS\b|\bVOEAZUL\b/, 'Azul', 'travel'], [/\bBOOKING\b/, 'Booking.com', 'travel'], [/\bAIRBNB\b/, 'Airbnb', 'travel'],
  [/\bDECOLAR\b/, 'Decolar', 'travel'], [/\b123 ?MILHAS\b/, '123milhas', 'travel'],
];
/** For each kind: the words a group's own name may say (narrowest first), and one of the app's everyday words for its own groups (core/say.js SAY_HINTS). */
const KIND_WORDS = {
  delivery: [['DELIVERY', 'ENTREGA', 'ENTREGAS', 'IFOOD', 'COMIDA', 'RESTAURANTE', 'RESTAURANTES', 'RESTAURANT', 'FOOD', 'SALIDAS', 'SAIDAS', 'LAZER', 'OCIO', 'GOING OUT'], 'ifood'],
  eatout: [['RESTAURANTE', 'RESTAURANTES', 'RESTAURANT', 'COMER FUERA', 'EATING OUT', 'COMIDA', 'FOOD', 'SALIDAS', 'SAIDAS', 'LAZER', 'OCIO', 'GOING OUT'], 'restaurante'],
  transport: [['TRANSPORTE', 'TRANSPORT', 'MOVILIDAD', 'MOBILIDADE', 'TAXI', 'UBER', 'CARRO', 'COCHE', 'AUTO', 'CAR'], 'uber'],
  fuel: [['COMBUSTIVEL', 'COMBUSTIBLE', 'GASOLINA', 'NAFTA', 'FUEL', 'CARRO', 'COCHE', 'AUTO', 'CAR', 'TRANSPORTE', 'TRANSPORT'], 'gasolina'],
  tolls: [['PEDAGIO', 'PEAJE', 'PEAJES', 'TOLL', 'TOLLS', 'CARRO', 'COCHE', 'AUTO', 'CAR', 'TRANSPORTE', 'TRANSPORT'], 'pedagio'],
  parking: [['ESTACIONAMENTO', 'ESTACIONAMIENTO', 'PARKING', 'CARRO', 'COCHE', 'AUTO', 'CAR', 'TRANSPORTE', 'TRANSPORT'], 'estacionamento'],
  video: [['STREAMING', 'VIDEO', 'TV', 'ASSINATURAS', 'ASSINATURA', 'SUSCRIPCIONES', 'SUSCRIPCION', 'SUBSCRIPTIONS', 'SUBSCRIPTION'], 'netflix'],
  music: [['MUSICA', 'MUSIC', 'STREAMING', 'ASSINATURAS', 'ASSINATURA', 'SUSCRIPCIONES', 'SUSCRIPCION', 'SUBSCRIPTIONS', 'SUBSCRIPTION'], 'spotify'],
  cloud: [['NUBE', 'NUVEM', 'CLOUD', 'ASSINATURAS', 'ASSINATURA', 'SUSCRIPCIONES', 'SUSCRIPCION', 'SUBSCRIPTIONS', 'SUBSCRIPTION'], 'icloud'],
  subs: [['ASSINATURAS', 'ASSINATURA', 'SUSCRIPCIONES', 'SUSCRIPCION', 'SUBSCRIPTIONS', 'SUBSCRIPTION', 'SOFTWARE', 'APPS'], 'youtube'],
  phone: [['CELULAR', 'TELEFONE', 'TELEFONO', 'MOVIL', 'PHONE', 'MOBILE', 'INTERNET', 'TELECOM', 'CASA', 'HOGAR', 'HOME', 'MORADIA', 'VIVIENDA', 'HOUSING'], 'celular'],
  power: [['LUZ', 'ENERGIA', 'ELETRICIDADE', 'ELECTRICIDAD', 'ELECTRICITY', 'SERVICOS', 'SERVICIOS', 'UTILITIES', 'CONTAS', 'CUENTAS', 'CASA', 'HOGAR', 'HOME', 'MORADIA', 'VIVIENDA', 'HOUSING'], 'luz'],
  water: [['AGUA', 'WATER', 'SANEAMENTO', 'SERVICOS', 'SERVICIOS', 'UTILITIES', 'CONTAS', 'CUENTAS', 'CASA', 'HOGAR', 'HOME', 'MORADIA', 'VIVIENDA', 'HOUSING'], 'agua'],
  gas: [['GAS', 'SERVICOS', 'SERVICIOS', 'UTILITIES', 'CONTAS', 'CUENTAS', 'CASA', 'HOGAR', 'HOME', 'MORADIA', 'VIVIENDA', 'HOUSING'], 'gas'],
  pharmacy: [['FARMACIA', 'PHARMACY', 'DROGARIA', 'REMEDIOS', 'MEDICAMENTOS', 'SAUDE', 'SALUD', 'HEALTH'], 'farmacia'],
  groceries: [['SUPERMERCADO', 'MERCADO', 'GROCERIES', 'GROCERY', 'ALIMENTACAO', 'ALIMENTACION', 'COMIDA', 'FOOD'], 'supermercado'],
  shopping: [['COMPRAS', 'SHOPPING', 'COMPRAS ONLINE'], 'compras'],
  clothes: [['ROUPA', 'ROUPAS', 'ROPA', 'CLOTHES', 'VESTUARIO', 'VESTIMENTA', 'COMPRAS', 'SHOPPING'], 'ropa'],
  gym: [['ACADEMIA', 'GIMNASIO', 'GYM', 'ESPORTE', 'DEPORTE', 'SPORT', 'SPORTS', 'FITNESS'], 'academia'],
  travel: [['VIAGEM', 'VIAGENS', 'VIAJE', 'VIAJES', 'TRAVEL', 'VACACIONES', 'FERIAS', 'HOLIDAYS'], 'viaje'],
};
/** A merchant everybody knows, from a bank line: { name, kind }, or null. A pattern with no name (a pharmacy, a supermarket) only says the kind. */
function knownMerchant(description) {
  const d = normalizeText(description); if (!d) return null;
  for (const [re, name, kind] of KNOWN_MERCHANTS) if (re.test(d)) return { name, kind };
  return null;
}
/** The household group of a kind of spending: a group (or a part of one, first) whose own name says it, in the order of the kind's words; then a
    group that still carries the app's own name and whose everyday words include the kind's. Income groups never. */
const SUBS_KINDS = new Set(['video', 'music', 'cloud', 'subs', 'gym']), SUBS_GROUP = /\b(ASSINATURAS?|SUSCRIPCION(ES)?|SUBSCRIPTIONS?)\b/;
function kindCategory(kind) {
  const k = KIND_WORDS[kind]; if (!k) return null;
  // a group of subscriptions keeps what is paid every month (an iFood order is not the iFood club): other kinds look outside it
  const named = []; for (const c of S.categories) { if (c.income || c.id === 'other' || (!SUBS_KINDS.has(kind) && SUBS_GROUP.test(normalizeText(c.name)))) continue; for (const s of c.subs || []) named.push([c, s]); named.push([c, null]); }
  const said = ([c, s]) => ' ' + normalizeText((s || c).name) + ' ';
  for (const w of k[0]) { const hit = named.find(n => said(n).includes(' ' + w + ' ')); if (hit) return { categoryId: hit[0].id, subcategoryId: hit[1] ? hit[1].id : null }; }
  const hinted = named.find(([c, s]) => ((typeof SAY_HINTS !== 'undefined' && SAY_HINTS[((s || c).k || {}).name]) || []).includes(k[1]));
  return hinted ? { categoryId: hinted[0].id, subcategoryId: hinted[1] ? hinted[1].id : null } : null;
}

// ---------- refunds ----------
const REFUND = /\b(ESTORNO|ESTORNADO|REEMBOLSO|DEVOLUCAO|DEVOLVIDO|CHARGEBACK|CANCELAMENTO DE COMPRA|COMPRA CANCELADA|CREDITO DE ESTORNO)\b/;
/** A refund coming in: money given back for a purchase. It is spending taken back, not income. */
const isRefund = (description, amount) => amount > 0 && REFUND.test(normalizeText(description));
/** The purchase a refund gives money back for: the same amount out, before it, within four months, in the same account or card, named alike. */
function refundOf(x, accountId, earlier) {
  const name = normalizeText(guessMerchant(x.description) || ''), d = normalizeText(x.description), from = addDays(x.date, -120), ids = new Set(cardParts(cardMain(acct(accountId))).map(a => a.id).concat(accountId));
  const alike = m => { const n = normalizeText(m); return !!n && (n === name || d.includes(n) || (name && n.includes(name))); };
  return earlier.find(r => r.type === 'expense' && r.amount === -x.amount && r.date <= x.date && alike(r.merchant))
    || S.transactions.find(t => t.type === 'expense' && t.amount === -x.amount && ids.has(t.accountId) && t.date <= x.date && t.date >= from && alike(t.merchant)) || null;
}

// ---------- a Pix to oneself ----------
/** The banks a line may name as the other side of a transfer, as the app names them (data/defaults.js BANKS). */
const BANK_WORDS = [[/\bITAU\b/, 'Itaú'], [/\bBRADESCO\b/, 'Bradesco'], [/\bSANTANDER\b/, 'Santander'], [/\bCAIXA ECON|\bCEF\b|\bCAIXA\b/, 'Caixa'], [/\bB(AN)?CO DO BRASIL\b|\bBB\b/, 'Banco do Brasil'],
  [/\bNU PAGAMENTOS\b|\bNUBANK\b/, 'Nubank'], [/\bBANCO INTER\b|\bINTER\b/, 'Inter'], [/\bC6\b/, 'C6 Bank'], [/\bPICPAY\b/, 'PicPay'], [/\bMERCADO ?PAGO\b|\bMERCADOPAGO\b/, 'Mercado Pago'],
  [/\bBTG\b/, 'BTG Pactual'], [/\bXP INVEST|\bBANCO XP\b/, 'XP'], [/\bSICREDI\b/, 'Sicredi'], [/\bAGIBANK\b/, 'Agibank'], [/\bBANCO BV\b|\bBV S A\b/, 'Banco BV'], [/\bWISE\b/, 'Wise']];
/** A transfer between the person's own accounts: a Pix or TED that names the person (their first and last names, as the profile has them). */
function toOneself(description) {
  const name = normalizeText((S.user || {}).name || '').split(' ').filter(w => w.length >= 3); if (name.length < 2) return false;
  const d = ' ' + normalizeText(description) + ' ';
  return /\b(PIX|TED|DOC|TRANSFERENCIA|TRANSF)\b/.test(d) && d.includes(' ' + name[0] + ' ') && d.includes(' ' + name[name.length - 1] + ' ');
}
/** The account at the other side, when the line names its bank and the person has exactly one everyday account there. */
function oneselfAt(description, a) {
  const d = normalizeText(description), bank = (BANK_WORDS.find(([re]) => re.test(d.replace(normalizeText(a.institution || '\u0000'), ' '))) || [])[1]; if (!bank) return null;
  const there = sideAccounts(a.scope).filter(k => k.id !== a.id && k.institution === bank && (k.type === 'checking' || k.type === 'savings') && k.currency === a.currency);
  return there.length === 1 ? there[0] : null;
}

// ---------- a bill of the plan ----------
// An amount alone can be a coincidence (a Pix of R$ 420 is not the condo fee because the condo fee is R$ 420), so a bill is taken only with a second
// sign: its due day within a week, a known merchant of the bill's own group, or the bill's name in the line. The same amount with that sign is
// ready; the same amount without it, or a bill whose amount changes up to 30% off with it, comes filed but shown to be looked at.
/** What else, besides the amount, says a line pays a bill. */
function billSign(p, x, known) {
  if (p.dueDate && Math.abs(dayDiff(p.dueDate, x.date)) <= 7) return true;
  const kc = known && kindCategory(known.kind); if (kc && kc.categoryId === p.categoryId && (!p.subcategoryId || kc.subcategoryId === p.subcategoryId)) return true;
  const d = ' ' + normalizeText(x.description) + ' '; return normalizeText(p.name).split(' ').some(w => w.length >= 4 && d.includes(' ' + w + ' '));
}
/** The plan's bill a line pays: a bill (not a budget) of that month still without a payment. { line, sure }, or null. Each bill once a file;
    two bills that fit as well are left to the person. */
function billFor(x, accountId, used, memo, known) {
  if (x.amount >= 0) return null;
  const ym = ymOf(x.date), cur = acct(accountId).currency, amt = -x.amount;
  const open = memo[ym] || (memo[ym] = planProgress(S, ym, cur, S.today).filter(p => p.bill && p.planned > 0 && p.spent === 0));
  const fits = open.filter(p => !used.has(p.id + ym)).map(p => ({ p, diff: Math.abs(amt - p.planned), sign: billSign(p, x, known) }))
    .filter(c => c.diff === 0 || (c.sign && c.p.pay === 'variable' && c.diff <= c.p.planned * 0.3)).sort((a, b) => a.diff - b.diff || b.sign - a.sign);
  if (!fits.length || (fits[1] && fits[1].diff === fits[0].diff && fits[1].sign === fits[0].sign)) return null;
  used.add(fits[0].p.id + ym); return { line: fits[0].p, exact: fits[0].diff === 0 && fits[0].sign };
}
