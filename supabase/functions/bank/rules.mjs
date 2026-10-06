/* Dorax Finance — connecting a bank (Open Finance through Belvo): the parts that are plain rules, apart from the requests, so they can
   be tested without a server. What a CPF is, what Belvo is asked for, and how what Belvo answers is turned into the app's own shapes. */

/** A CPF as 11 digits when it is a real one (the two check digits agree), otherwise null. Dots and dashes are allowed in what is typed. */
export function cpfOf(typed) {
  const d = String(typed == null ? '' : typed).replace(/[.\-\s]/g, '');
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return null;
  const check = n => { let s = 0; for (let i = 0; i < n; i++) s += +d[i] * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return check(9) === +d[9] && check(10) === +d[10] ? d : null;
}
/** A person's full name as typed, tidied; null when it is not one (too short, too long, or with characters a name does not have). */
export function nameOf(typed) {
  const n = String(typed == null ? '' : typed).replace(/\s+/g, ' ').trim();
  return n.length >= 5 && n.length <= 120 && /\s/.test(n) && /^[\p{L}\p{M}' .-]+$/u.test(n) ? n : null;
}
export const isUuid = s => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** What Belvo is asked when a person starts connecting a bank (its "widget access token"). Only what the app uses is asked for:
    the accounts and their transactions. keys: { id, password }. person: { cpf, name }. site: the app's address, where Belvo sends the
    person back. Nothing here is kept by Dorax: the CPF and the name go to Belvo for the bank's consent screen and are forgotten. */
export function tokenRequest(keys, person, site) {
  return {
    id: keys.id, password: keys.password,
    scopes: 'read_institutions,write_links,read_consents,write_consents,write_consent_callback,delete_consents',
    fetch_resources: ['ACCOUNTS', 'TRANSACTIONS'],
    widget: {
      purpose: 'Organização das finanças pessoais: mostrar à própria pessoa os saldos e as transações das suas contas no Dorax Finance.',
      openfinance_feature: 'consent_link_creation',
      callback_urls: { success: site + '/?bank=done', exit: site + '/?bank=left', event: site + '/?bank=failed' },
      consent: { terms_and_conditions_url: site + '/', permissions: ['REGISTER', 'ACCOUNTS', 'CREDIT_CARDS'], identification_info: [{ type: 'CPF', number: person.cpf, name: person.name }] },
      branding: { company_name: 'Dorax Finance', company_icon: site + '/assets/icons/favicon.svg', company_logo: site + '/assets/icons/favicon.svg', company_terms_url: site + '/' },
    },
  };
}
/** Where the person is sent: Belvo's own page, which takes them to their bank. "single": the data is read once, now; nothing is refreshed
    behind the person's back. who: the id of the person in Dorax, which Belvo keeps on the connection so that it can be told whose it is. */
export const widgetUrl = (access, who) => `https://widget.belvo.io/?access_token=${encodeURIComponent(access)}&locale=pt&access_mode=single&external_id=${encodeURIComponent(who)}`;

const text = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, n);
const KINDS = { CHECKING_ACCOUNT: 'checking', SAVINGS_ACCOUNT: 'savings', CREDIT_CARD: 'credit', PENSION_FUND_ACCOUNT: 'savings', INVESTMENT_ACCOUNT: 'savings' };
/** An account as Belvo describes it, as the few things the app shows. Anything unexpected in it is dropped, not passed on. */
export function accountOf(a) {
  if (!a || typeof a !== 'object' || a.id == null) return null;
  const bal = a.balance && typeof a.balance === 'object' ? Number(a.balance.current) : NaN;
  return { id: text(a.id, 64), name: text(a.name, 80) || text(a.type, 80) || 'Conta', kind: KINDS[a.category] || 'checking', currency: /^[A-Z]{3}$/.test(a.currency || '') ? a.currency : 'BRL',
    institution: text(a.institution && a.institution.name, 80), balance: Number.isFinite(bal) ? Math.round(bal * 100) : null };
}
/** A transaction as Belvo describes it, as a row the app's import can review: a day, words, and an amount in cents with its sign
    (money out is negative). null when it has no day or no amount, so it is counted as left out instead of guessed. */
export function transactionOf(x) {
  if (!x || typeof x !== 'object') return null;
  const date = [x.value_date, x.accounting_date].map(d => typeof d === 'string' ? d.slice(0, 10) : '').find(d => /^\d{4}-\d{2}-\d{2}$/.test(d)), amount = Number(x.amount);
  if (!date || !Number.isFinite(amount) || x.amount === null || x.amount === '') return null;
  const cents = Math.round(Math.abs(amount) * 100), out = x.type === 'OUTFLOW' || (x.type !== 'INFLOW' && amount < 0);
  return { id: text(x.internal_identification, 100) || text(x.id, 64), account: text(x.account && x.account.id, 64), date, amount: out ? -cents : cents,
    description: text(x.description, 200) || text(x.merchant && x.merchant.name, 200) || text(x.category, 200) || '—' };
}
