/* Dorax Finance — what a new password has to be. The password itself is never kept by this page: it goes to the server (Supabase Auth),
   which stores only a one-way digest of it. These rules are checked here so the person hears about them before sending; the server
   checks again with its own (Authentication > Sign In / Providers > Email, in the Supabase dashboard: keep its minimum length at 8 or less,
   or the two will disagree). */
const PW_MIN = 8, PW_MAX = 72;       // 72: what the server's password hashing (bcrypt) reads; longer passwords would be cut silently

/** The three rules a new password has to meet. A long password with a letter and a digit; nothing about symbols or capitals, which
    make passwords harder to type and no harder to guess. */
function pwRules(pw) {
  pw = String(pw || '');
  return { len: pw.length >= PW_MIN && pw.length <= PW_MAX, letter: /\p{L}/u.test(pw), digit: /\d/.test(pw) };
}
const pwOk = pw => { const r = pwRules(pw); return r.len && r.letter && r.digit; };
/** What is wrong with a new password, in words, or null. */
function pwProblem(pw, email) {
  pw = String(pw || '');
  if (!pw) return t('Choose a password.');
  if (pw.length > PW_MAX) return t('That password is too long. Keep it to {n} characters.', { n: PW_MAX });
  if (!pwOk(pw)) return t('The password needs at least {n} characters, with a letter and a number.', { n: PW_MIN });
  if (email && pw.toLowerCase() === String(email).toLowerCase()) return t('The password cannot be your email.');
  return null;
}
