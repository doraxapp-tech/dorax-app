/* Dorax Finance — the account emails Supabase sends: three that carry a link (confirm your address, choose a new password, confirm a
   new address) and two that only tell the person something happened (your password was changed, your email was changed).
   Run: node tools/build-emails.js. It writes one HTML file per email into supabase/email-templates/, plus subjects.txt.
   Nothing sends these from here: each file is pasted into Supabase > Authentication > Emails > Templates (see supabase/email-templates/README.md).

   Why they look the way they do (owner, 2026-10-05: "I want the logo to be visible, and a better email structure, this looks like a spam email";
   2026-10-14: "la plantilla de correo necesita un update, tenemos nuevo estilo y visuales, colores"):
   - They are drawn in the same frame as the reminders and the invitations (supabase/functions/reminders/email.mjs, which says how it looks and
     why), so every Dorax email looks alike and changes in one place: the website's language, as the sign-in pages that come just before them
     (the logo with FINANCE, a drawing of what the email is about, the pill saying what kind it is: "Your account", or "Security" for the two
     notices, a large heading, the paragraph, the lime button; what to do if it was not you, in a white card; the small print on the sage).
   - The drawing says what the email is about: the person who waves for a new account (with the envelope), the one who holds the key for a new
     password, the two arrows for an address that changes, the shield for a changed password, the envelope for a changed email.
   - One heading, one short paragraph, one button, the same address again as plain text, and a line saying what to do if the person did not ask
     for this. No marketing, no second link, no pictures besides the logo: account emails that sell something are the ones mail programs treat as
     spam.
   - Three languages in one template. Supabase fills in {{ .Data.lang }} with the language the person chose when signing up (the app sends it),
     and the template picks the text. Anything else, or nothing, gets Portuguese, the app's own fallback. */
const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
const OUT = path.join(__dirname, '..', 'supabase', 'email-templates');
const SITE = 'https://dorax.app'; // the logo comes from the site's own address (since 2026-10-05; the old vercel.app address forwards to it)
/** A text the website already has, in its three languages (js/i18n/text/*.js: [English, Español, Português]): the emails say it the same way. */
const I18N = (() => { const vm = require('vm'), dir = path.join(__dirname, '..', 'app', 'js', 'i18n'), ctx = vm.createContext({});
  const files = [path.join(dir, 'translations.js'), ...fs.readdirSync(path.join(dir, 'text')).sort().map(n => path.join(dir, 'text', n))].filter(p => fs.existsSync(p));
  vm.runInContext(files.map(p => fs.readFileSync(p, 'utf8')).join('\n') + '\n;globalThis.out = I18N;', ctx); return ctx.out; })();
const I = en => { if (!(en in I18N.es) || !(en in I18N.pt)) throw new Error('build-emails: no translation for ' + en); return L(en, I18N.es[en], I18N.pt[en]); };

/** One text in three languages, chosen by Supabase when it sends the email. */
const L = (en, es, pt) => `{{ if eq .Data.lang "es" }}${es}{{ else if eq .Data.lang "en" }}${en}{{ else }}${pt}{{ end }}`;

const EMAILS = {
  'confirm-signup': {
    where: 'Confirm sign up', art: 'hi',
    subject: L('Confirm your email', 'Confirma tu correo', 'Confirme o seu e-mail'),
    title: L('Confirm your email', 'Confirma tu correo', 'Confirme o seu e-mail'),
    text: L('One step left to create your Dorax Finance account: confirm that this email address is yours.',
      'Falta un paso para crear tu cuenta de Dorax Finance: confirmar que este correo es tuyo.',
      'Falta um passo para criar a sua conta no Dorax Finance: confirmar que este e-mail é seu.'),
    button: L('Confirm email', 'Confirmar correo', 'Confirmar e-mail'),
    ignore: L('If you did not create an account, you can ignore this email.',
      'Si no creaste una cuenta, puedes ignorar este correo.',
      'Se você não criou uma conta, pode ignorar este e-mail.'),
    why: L('This email was sent to {{ .Email }} because the address was used to create an account at Dorax Finance.',
      'Este correo se envió a {{ .Email }} porque la dirección se usó para crear una cuenta en Dorax Finance.',
      'Este e-mail foi enviado para {{ .Email }} porque o endereço foi usado para criar uma conta no Dorax Finance.'),
  },
  'reset-password': {
    where: 'Reset password', art: 'key',
    subject: L('Choose a new password', 'Elige una contraseña nueva', 'Escolha uma nova senha'),
    title: L('Choose a new password', 'Elige una contraseña nueva', 'Escolha uma nova senha'),
    text: L('Someone asked to change the password of your Dorax Finance account. The button opens the page where you choose a new one.',
      'Alguien pidió cambiar la contraseña de tu cuenta de Dorax Finance. El botón abre la página para elegir una nueva.',
      'Alguém pediu para trocar a senha da sua conta no Dorax Finance. O botão abre a página para escolher uma nova.'),
    button: L('Choose a new password', 'Elegir contraseña nueva', 'Escolher nova senha'),
    ignore: L('If it was not you, ignore this email: your password stays the same.',
      'Si no fuiste tú, ignora este correo: tu contraseña sigue igual.',
      'Se não foi você, ignore este e-mail: a sua senha continua a mesma.'),
    why: L('This email was sent to {{ .Email }} because a new password was asked for this account at Dorax Finance.',
      'Este correo se envió a {{ .Email }} porque se pidió una contraseña nueva para esta cuenta de Dorax Finance.',
      'Este e-mail foi enviado para {{ .Email }} porque foi pedida uma nova senha para esta conta no Dorax Finance.'),
  },
  // Sent to BOTH addresses, the current one and the new one, each with its own link ("Secure email change", which Supabase has on by
  // default: Authentication > Sign In / Providers > Email). The email only changes after both were opened, so nobody can move an account to
  // another address without being able to read the owner's inbox. That is what makes this safe without anyone having to step in by hand
  // (owner, 2026-10-05: "fix the email change to not depend on me"). The text therefore has to make sense in either inbox.
  'change-email': {
    where: 'Change email address', art: 'arrows-left-right',
    subject: L('Confirm the change of email', 'Confirma el cambio de correo', 'Confirme a troca de e-mail'),
    title: L('Confirm the change of email', 'Confirma el cambio de correo', 'Confirme a troca de e-mail'),
    text: L('A change of the email of your Dorax Finance account was asked for: from {{ .Email }} to {{ .NewEmail }}. For your safety it only happens after the button is pressed in the two emails, the one sent to each address.',
      'Se pidió cambiar el correo de tu cuenta de Dorax Finance: de {{ .Email }} a {{ .NewEmail }}. Por seguridad, el cambio solo ocurre después de pulsar el botón en los dos correos, el que llegó a cada dirección.',
      'Foi pedida a troca do e-mail da sua conta no Dorax Finance: de {{ .Email }} para {{ .NewEmail }}. Por segurança, a troca só acontece depois de apertar o botão nos dois e-mails, o que chegou em cada endereço.'),
    button: L('Confirm the change', 'Confirmar el cambio', 'Confirmar a troca'),
    ignore: L('If you did not ask for this, do not press the button: your email stays as it is. Then choose a new password (“Log in”, then “Forgot your password?”), because someone else is inside your account.',
      'Si no lo pediste, no pulses el botón: tu correo sigue igual. Después elige una contraseña nueva («Entrar» y luego «¿Olvidaste tu contraseña?»), porque alguien más está dentro de tu cuenta.',
      'Se você não pediu isso, não aperte o botão: o seu e-mail continua o mesmo. Depois escolha uma nova senha (“Entrar” e depois “Esqueceu a senha?”), porque outra pessoa está dentro da sua conta.'),
    why: L('This email was sent because a change of email address was asked for an account at Dorax Finance.',
      'Este correo se envió porque se pidió un cambio de correo para una cuenta de Dorax Finance.',
      'Este e-mail foi enviado porque foi pedida uma troca de e-mail para uma conta no Dorax Finance.'),
  },
  // The two security notices (owner, 2026-10-05, on Supabase's "Security" list: "is this useful?" Yes, these two). No link to confirm: they tell
  // the owner of the account that something was changed, and what to do if it was somebody else. The button only opens the site.
  'password-changed': {
    where: 'Password changed (under Security)', notice: true, art: 'shield-check',
    subject: L('Your password was changed', 'Tu contraseña cambió', 'A sua senha foi alterada'),
    title: L('Your password was changed', 'Tu contraseña cambió', 'A sua senha foi alterada'),
    text: L('The password of your Dorax Finance account was just changed. If it was you, there is nothing to do.',
      'La contraseña de tu cuenta de Dorax Finance acaba de cambiar. Si fuiste tú, no hay nada que hacer.',
      'A senha da sua conta no Dorax Finance acabou de ser alterada. Se foi você, não há nada a fazer.'),
    notYou: [L('Not you?', '¿No fuiste tú?', 'Não foi você?'),
      L('Open Dorax Finance, choose “Log in” and then “Forgot your password?” to choose a new one.',
        'Abre Dorax Finance, elige «Entrar» y luego «¿Olvidaste tu contraseña?» para elegir una nueva.',
        'Abra o Dorax Finance, escolha “Entrar” e depois “Esqueceu a senha?” para escolher uma nova.')],
    why: L('This email was sent to {{ .Email }} because the password of this account at Dorax Finance was changed.',
      'Este correo se envió a {{ .Email }} porque cambió la contraseña de esta cuenta de Dorax Finance.',
      'Este e-mail foi enviado para {{ .Email }} porque a senha desta conta no Dorax Finance foi alterada.'),
  },
  // A receipt. It does not send the person to a contact form: the change could only happen with a click from the old address (see
  // 'change-email' above), so what is left to say to someone who did not make it is that somebody else can read that inbox.
  'email-changed': {
    where: 'Email address changed (under Security)', notice: true, art: 'envelope-simple',
    subject: L('Your email was changed', 'Tu correo cambió', 'O seu e-mail foi alterado'),
    title: L('Your email was changed', 'Tu correo cambió', 'O seu e-mail foi alterado'),
    text: L('The email of your Dorax Finance account was changed from {{ .OldEmail }} to {{ .Email }}, after it was confirmed from both addresses. From now on you log in with {{ .Email }}.',
      'El correo de tu cuenta de Dorax Finance cambió de {{ .OldEmail }} a {{ .Email }}, después de confirmarse desde las dos direcciones. Desde ahora entras con {{ .Email }}.',
      'O e-mail da sua conta no Dorax Finance foi alterado de {{ .OldEmail }} para {{ .Email }}, depois de confirmado pelos dois endereços. De agora em diante você entra com {{ .Email }}.'),
    notYou: [L('Not you?', '¿No fuiste tú?', 'Não foi você?'),
      L('The change needed a link sent to {{ .OldEmail }} to be opened. If you did not open it, someone else can read that inbox: change the password of your email account now.',
        'El cambio necesitó que se abriera un enlace enviado a {{ .OldEmail }}. Si no lo abriste tú, alguien más puede leer ese buzón: cambia ya la contraseña de tu correo.',
        'A troca precisou que um link enviado para {{ .OldEmail }} fosse aberto. Se não foi você quem abriu, outra pessoa consegue ler essa caixa de entrada: troque agora a senha do seu e-mail.')],
    why: L('This email was sent because the email address of an account at Dorax Finance was changed.',
      'Este correo se envió porque cambió el correo de una cuenta de Dorax Finance.',
      'Este e-mail foi enviado porque o e-mail de uma conta no Dorax Finance foi alterado.'),
  },
};
const OPEN = L('Open Dorax Finance', 'Abrir Dorax Finance', 'Abrir o Dorax Finance');
const PASTE = L('If the button does not work, copy this address into your browser:',
  'Si el botón no funciona, copia esta dirección en tu navegador:',
  'Se o botão não funcionar, copie este endereço no navegador:');
const KICKER = { account: I('Your account'), security: I('Security') };
const LANG = '{{ if eq .Data.lang "es" }}es{{ else if eq .Data.lang "en" }}en{{ else }}pt{{ end }}';
/** The footer's texts: the website's own (js/i18n/text/). */
const FOOT = { tagline: I('Your money, organized clearly enough to make better decisions yourself.'), disclaimer: I('Dorax organises information about your own money. It is not financial, tax or accounting advice.'),
  help: I('Help center'), blog: I('Blog'), contact: I('Contact form'), privacy: I('Privacy policy') };
/** The band after the white one, in the home page's words: what Dorax does on the days that matter, for someone who is just creating an account;
    whose the money and the data are, for the four emails about the account's safety. */
const WELCOME = { tone: 'sage', title: I('Your money, on the days that matter.'), items: [
  { thing: 'coins', title: I('Payday'), text: I('Income in one or two payments a month, and what is left of each payment.') },
  { thing: 'bell-ringing', title: I('Before it is due'), text: I('Every bill in one list with its due day, and a reminder before it is due.') },
  { thing: 'flag-banner', title: I('Your goal, with a date'), text: I('Each goal with its plan, its progress and the month you get there.') }] };
const SAFE = { tone: 'forest', title: I('Your money is yours. Your data too.'), items: [
  { thing: 'key', title: I('You hold the key.'), text: I('Download a backup of everything whenever you want.') },
  { thing: 'shield-check', title: I('No ads'), text: I('Your data is not sold or used for advertising.') },
  { thing: 'bank', title: I('No bank password'), text: I('Dorax organises what you type or import. Nothing more.') }] };

/** One email, as a page of the website (M: email.mjs): the top with its button; on white, what to do if the button does not work and if the person
    did not ask (or, for a notice, what to do if it was somebody else); the band in the home page's words; the footer. */
function draw(M, e) {
  const centre = (html, size, colour) => `<p style="margin:0 auto; max-width:480px; font-size:${size}px; line-height:${Math.round(size * 1.55)}px; color:${colour}; text-align:center;">${html}</p>`;
  const white = e.notice
    ? M.list({ site: SITE, title: e.notYou[0], after: centre(e.notYou[1], 16, M.C.ink2) })
    : M.list({ site: SITE, after: centre(e.ignore, 16, M.C.ink2) + `
      <div style="margin:22px auto 0; max-width:480px; border-top:1px solid ${M.C.line}; padding:20px 0 0;">${centre(PASTE, 13, M.C.ink3)}
      <p style="margin:4px auto 0; max-width:480px; font-size:13px; line-height:20px; text-align:center; word-break:break-all;"><a href="{{ .ConfirmationURL }}" target="_blank" style="color:${M.C.forest}; text-decoration:underline;">{{ .ConfirmationURL }}</a></p></div>` });
  return M.page({ lang: LANG, pre: e.text, sections: [
    M.top({ site: SITE, kicker: e.notice ? KICKER.security : KICKER.account, title: e.title, lead: e.text, art: e.art,
      action: M.button(e.notice ? '{{ .SiteURL }}' : '{{ .ConfirmationURL }}', e.notice ? OPEN : e.button) }),
    white,
    M.explain({ site: SITE, ...(e.name === 'confirm-signup' ? WELCOME : SAFE) }),
    M.footer({ site: SITE, f: FOOT, why: e.why }),
  ] });
}

import(pathToFileURL(path.join(__dirname, '..', 'supabase', 'functions', 'reminders', 'email.mjs')).href).then(M => {
  fs.mkdirSync(OUT, { recursive: true });
  const subjects = [];
  for (const [name, e] of Object.entries(EMAILS)) {
    fs.writeFileSync(path.join(OUT, name + '.html'), draw(M, { ...e, name }));
    subjects.push(`${e.where}\n  file:    ${name}.html\n  subject: ${e.subject}\n`);
  }
  fs.writeFileSync(path.join(OUT, 'subjects.txt'), 'One block per email. Paste the "subject" line (all of it, with the curly braces) into the Subject field of that template in Supabase.\n\n' + subjects.join('\n'));
  console.log('emails:', Object.keys(EMAILS).join(', '), '->', path.relative(process.cwd(), OUT));
}, err => { console.error('build-emails: ' + err.message); process.exit(1); });
