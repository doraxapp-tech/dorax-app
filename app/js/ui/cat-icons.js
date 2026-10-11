/* Dorax Finance — shared: a category's icon (owner, 2026-10-10: "add icons to the categories", after looking at Mobills and Organizze, where each
   category is a coloured circle with a drawing in it).
   Each category may keep the icon chosen for it (category.icon, a key of CAT_ICONS); without one, it gets the one its name or id points to
   (CAT_ICON_GUESS: Home, a house; Groceries, a cart; Subscriptions, a loop…), and a plain tag when nothing fits. The icon is drawn in the category's
   own colour on a soft circle of it (catGlyph): on Categories & rules (where a tap changes it: features/categories/cat-icon.view.js), in the
   expense form's quick choices, in the lists of transactions, the limits, the Plan's payments, and the phone's lists of an account's movements.
   A subcategory takes the icon its own name points to (Groceries, a cart, inside Home), else its category's; always in its category's colour.
   Drawn like ui/icons.js: 24 × 24, a 1.8 line, no fill. Styles: css/components/cat-glyph.css. */
const CAT_ICONS = {
  home: ICONS.home,
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2.2l2.4 11h10.6l2-7.5H6.4"/>',
  food: '<path d="M7 3v18M5 3v5a2 2 0 0 0 4 0V3"/><path d="M17 21V3c-2 1.5-3 4-3 7v3h3"/>',
  coffee: '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3v3M12 3v3"/>',
  bar: '<path d="M7 3h10l-.6 5a4.4 4.4 0 0 1-8.8 0z"/><path d="M12 12.5V20M8 21h8"/>',
  car: ICONS.car,
  bus: '<rect x="5" y="3" width="14" height="15" rx="2.5"/><path d="M5 11h14M8 18v2.5M16 18v2.5M8.5 14.5h.01M15.5 14.5h.01"/>',
  fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10"/><path d="M14 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3"/>',
  plane: ICONS.plane,
  health: '<path d="M12 20.5s-8-4.9-8-10.6A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 8 2.6c0 5.7-8 10.6-8 10.6z"/>',
  pill: '<rect x="2.8" y="8.5" width="18.4" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="M8.6 8.6l6.8 6.8"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  book: '<path d="M4 19V5a2 2 0 0 1 2-2h14v14H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h14"/>',
  ticket: '<path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4z"/><path d="M14 6v2M14 11v2M14 16v2"/>',
  play: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10 9.2v5.6l4.6-2.8z"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  game: '<rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7 11v3M5.5 12.5h3M15.5 12h.01M18 13.5h.01"/>',
  shirt: '<path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3a4 4 0 0 1-8 0z"/>',
  bag: '<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  sparkle: ICONS.spark,
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8c-2-4-5.5-3.5-4.5-1 .4 1 2 1 4.5 1zm0 0c2-4 5.5-3.5 4.5-1-.4 1-2 1-4.5 1z"/>',
  paw: '<circle cx="6.5" cy="10.5" r="1.7"/><circle cx="17.5" cy="10.5" r="1.7"/><circle cx="9.8" cy="6.3" r="1.7"/><circle cx="14.2" cy="6.3" r="1.7"/><path d="M12 12c-3 0-5.5 3.2-5.5 5.5 0 1.6 1.2 2.5 2.7 2.5 1.2 0 1.8-.6 2.8-.6s1.6.6 2.8.6c1.5 0 2.7-.9 2.7-2.5C17.5 15.2 15 12 12 12z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18h2"/>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0"/><path d="M12 19.5h.01"/>',
  bolt: '<path d="M13 2 4.5 13.5H12L11 22l8.5-11.5H12z"/>',
  drop: '<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z"/>',
  tool: '<path d="M15 4a4.5 4.5 0 0 0-4.3 5.8L4 16.5 7.5 20l6.7-6.7A4.5 4.5 0 0 0 20 9l-3 3-3-3 3-3a4.5 4.5 0 0 0-2-2z"/>',
  receipt: '<path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>',
  briefcase: ICONS.briefcase,
  laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
  bank: ICONS.bank,
  coins: ICONS.coins,
  trend: ICONS.trend,
  shield: ICONS.shield,
  repeat: ICONS.repeat,
  globe: ICONS.globe,
  tag: ICONS.tag,
  more: ICONS.more,
};
/** What each icon is, said to a screen reader and shown in the picker's tip. */
const catIconName = k => ({ home: t('Home'), cart: t('Groceries'), food: t('Food'), coffee: t('Coffee'), bar: t('Drinks'), car: t('Car'), bus: t('Public transport'),
  fuel: t('Fuel'), plane: t('Travel'), health: t('Health'), pill: t('Pharmacy'), dumbbell: t('Gym'), book: t('Education'), ticket: t('Going out'), play: t('Streaming'),
  music: t('Music'), game: t('Games'), shirt: t('Clothes'), bag: t('Shopping'), sparkle: t('Personal care'), gift: t('Gifts'), paw: t('Pets'), users: t('Family'),
  phone: t('Phone'), wifi: t('Internet'), bolt: t('Electricity'), drop: t('Water'), tool: t('Repairs'), receipt: t('Taxes'), card: t('Card and debts'), briefcase: t('Work'),
  laptop: t('Software'), bank: t('Bank'), coins: t('Income'), trend: t('Investments'), shield: t('Insurance'), repeat: t('Subscriptions'), globe: t('Abroad'), tag: t('Tag'), more: t('Other') }[k] || k);
/** The icon a name or id points to, the first that fits: the specific before the general (a "Supermercado" is a cart before it is home). Matched on the
    name without accents, in Portuguese, Spanish and English, and on the default categories' ids. */
const CAT_ICON_GUESS = [
  ['receipt', /co-tax|impost|taxa|\btax|tribut|irpf|iptu|ipva/], ['users', /co-people|folha|equipe|\bpeople|famil|filh|hij|crianc|nin[oa]s?\b|kids?\b|bebe|baby/],
  ['laptop', /co-tools|ferrament|software|\btools?\b|aplicativ/], ['briefcase', /co-services|contab|servic|account|trabalh|trabaj|\bwork|negocio|business/],
  ['cart', /mercad|supermerc|feira|grocer|hortifr|acoug|carnicer/], ['coffee', /cafe|coffee|padari|panader/], ['bar', /\bbar(es)?\b|bebid|drink|cervej|vinho|vino/],
  ['food', /restaur|comida|aliment|\bfood|lanch|deliver|ifood|almoc|almuerz|jantar|cena\b/], ['fuel', /combust|gasolin|\bposto|\bfuel|nafta/],
  ['bus', /onibus|metro|\bbus\b|transporte public|bilhete|pasaje/], ['car', /transport|uber|taxi|\bcarro|\bauto|veicul|vehicul|\bcar\b|estacion|pedag|peaje/],
  ['plane', /viage|viaj|\btrip|travel|ferias|vacac|hotel/], ['pill', /farmac|remedi|drogar|pharm/], ['dumbbell', /academ|\bgym|gimnas|esport|deport|sport|fitness/],
  ['health', /saude|salud|health|medic|dentist|hospital|clinic|terap/], ['book', /educa|curso|escol|escuel|faculd|universi|school|livro|libro|\bbook|idioma|colegio/],
  ['play', /streaming|\bvideo|netflix|\btv\b|cine\b|cinema|meli\+/], ['music', /musica|music|spotify/], ['game', /\bjogo|juego|\bgame/],
  ['shirt', /roupa|\bropa|vestu|cloth|calcad|zapat|\bmoda/], ['sparkle', /beleza|bellez|cuidado|personal|beauty|cabel|salao|peluq|estetic/],
  ['gift', /present|regalo|\bgift|doac|donac|caridad|dizim|diezm/], ['paw', /\bpets?\b|mascot|cachorr|perr[oa]|\bgat[oa]|veterin/],
  ['phone', /celular|movil|telefon|\bphone|mobile/], ['wifi', /internet|wifi|banda larga|fibra|\bclaro\b|\bvivo\b/], ['bolt', /\bluz\b|energia|electric|eletric/],
  ['drop', /\bagua|water|\bgas\b|saneamento/], ['tool', /manuten|reparo|repara|consert|reform|mantenim/], ['card', /cartao|tarjeta|\bcard\b|divid|deud|\bdebt|emprest|prestamo|\bloan|financ/],
  ['bank', /\bbanco|\bbank|tarifa/], ['trend', /invest|inversi|\bacoes|\bfii\b|cripto/], ['shield', /seguro|insur/], ['repeat', /assinat|suscrip|subscri|\bsubs\b|mensalid/],
  ['ticket', /lazer|\bocio|salida|diversao|diversion|entreten|\bfun\b|show|evento|fiesta|festa|placer|passeio|paseo/], ['bag', /compras|shopping|tienda|\bloja/],
  ['coins', /renda|ingreso|income|salari|sueldo|receita|\bpay\b/], ['home', /\bcasa|\bhome|moradia|vivienda|hogar|aluguel|alquiler|\brenta\b|condomin|housing|\brent\b/],
  ['more', /outro|otro|other|diverso|misc/],
];
const catPlain = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const catGuess = x => { const words = catPlain(x.name) + ' ' + catPlain(x.id), hit = CAT_ICON_GUESS.find(([, re]) => re.test(words)); return hit ? hit[0] : null; };
/** The key of a category's icon: the one chosen, else the one its name or id points to, else a tag. With a subcategory: the one chosen for it, else
    the one its own name points to (never the vague "other" or "tag"), else its category's. */
function catIconKey(c, sub) {
  if (!c) return 'tag';
  if (sub) { if (sub.icon && CAT_ICONS[sub.icon]) return sub.icon; const g = catGuess(sub); if (g && g !== 'more') return g; }
  if (c.icon && CAT_ICONS[c.icon]) return c.icon;
  return catGuess(c) || (c.income ? 'coins' : 'tag');
}
const catIconSvg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CAT_ICONS[k] || CAT_ICONS.tag}</svg>`;
/** A category's icon in its colour, on a soft circle of the same colour. c: the category, its id or a subcategory's id; size: '' (28px), 'sm' (22px)
    or 'lg' (40px); subId: the subcategory (its own icon when its name points to one). */
function catGlyph(c, size, subId) {
  const f = typeof c === 'string' ? catOf(c) : { cat: c }, cat = f && f.cat, sub = cat && ((subId && (cat.subs || []).find(s => s.id === subId)) || (f && f.sub));
  return `<span class="cg${size ? ' ' + size : ''}" style="--c:${cat ? catColor(cat.id) : 'var(--col-muted)'}" aria-hidden="true">${catIconSvg(catIconKey(cat, sub))}</span>`;
}
