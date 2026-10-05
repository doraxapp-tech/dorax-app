/* Dorax Finance — the account emails Supabase sends: three that carry a link (confirm your address, choose a new password, confirm a
   new address) and two that only tell the person something happened (your password was changed, your email was changed).
   Run: node tools/build-emails.js. It writes one HTML file per email into supabase/email-templates/, plus subjects.txt.
   Nothing sends these from here: each file is pasted into Supabase > Authentication > Emails > Templates (see supabase/email-templates/README.md).

   Why they look the way they do (owner, 2026-10-05: "I want the logo to be visible, and a better email structure, this looks like a spam email"):
   - The logo at the top, on the site's own dark canvas, as an image the site serves (LOGO_URL). Email programs do not draw SVG, so it is a PNG.
     If a program blocks images, the alt text "Dorax Finance" shows in white on the same band.
   - One heading, one short paragraph, one green button (the site's green), the same address again as plain text, and a line saying what to do
     if the person did not ask for this. No marketing, no second link, no pictures besides the logo: account emails that sell something are the
     ones mail programs treat as spam.
   - Tables and inline styles only. That is how email has to be written: Gmail and Outlook drop most stylesheets.
   - Three languages in one template. Supabase fills in {{ .Data.lang }} with the language the person chose when signing up (the app sends it),
     and the template picks the text. Anything else, or nothing, gets Portuguese, the app's own fallback. */
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'supabase', 'email-templates');
const LOGO_URL = 'https://dorax.app/assets/email/dorax-logo.png'; // the site's own address since 2026-10-05; the old vercel.app address forwards to it
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/** One text in three languages, chosen by Supabase when it sends the email. */
const L = (en, es, pt) => `{{ if eq .Data.lang "es" }}${es}{{ else if eq .Data.lang "en" }}${en}{{ else }}${pt}{{ end }}`;

const EMAILS = {
  'confirm-signup': {
    where: 'Confirm sign up',
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
    where: 'Reset password',
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
    where: 'Change email address',
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
    where: 'Password changed (under Security)', notice: true,
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
    where: 'Email address changed (under Security)', notice: true,
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

/** A button: a table cell with the colour, so that Outlook draws it too. */
const button = (href, label) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td bgcolor="#006239" style="background-color:#006239; border-radius:8px;">
          <a href="${href}" target="_blank" style="display:inline-block; padding:13px 24px; font-family:${FONT}; font-size:15px; line-height:1.2; font-weight:600; color:#ffffff; text-decoration:none; border-radius:8px;">${label}</a>
        </td></tr></table>`;
/** An email that asks for one thing: the button, the same address as text, and what to do if the person did not ask for it. */
const action = e => `    <tr><td style="padding:24px 32px 0;">
      ${button('{{ .ConfirmationURL }}', e.button)}
    </td></tr>
    <tr><td style="padding:24px 32px 32px; font-family:${FONT};">
      <p style="margin:0 0 6px; font-size:13px; line-height:1.5; color:#6b7280;">${PASTE}</p>
      <p style="margin:0 0 20px; font-size:13px; line-height:1.5; word-break:break-all;"><a href="{{ .ConfirmationURL }}" target="_blank" style="color:#006239; text-decoration:underline;">{{ .ConfirmationURL }}</a></p>
      <p style="margin:0; font-size:14px; line-height:1.5; color:#3c4149;">${e.ignore}</p>
    </td></tr>`;
/** An email that only tells: what to do if it was somebody else, in a quiet box, and a button that opens the site. */
const notice = e => `    <tr><td style="padding:20px 32px 0; font-family:${FONT};">
      <p style="margin:0; padding:14px 16px; background-color:#f6f7f8; border:1px solid #e3e5e8; border-radius:8px; font-size:14px; line-height:1.55; color:#3c4149;"><strong style="color:#0b0c0d;">${e.notYou[0]}</strong> ${e.notYou[1]}</p>
    </td></tr>
    <tr><td style="padding:24px 32px 32px;">
      ${button('{{ .SiteURL }}', OPEN)}
    </td></tr>`;

const page = e => `<!doctype html>
<html lang="{{ if eq .Data.lang "es" }}es{{ else if eq .Data.lang "en" }}en{{ else }}pt{{ end }}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Dorax Finance</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f4f5;">
<div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${e.text}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f5;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:560px; background-color:#ffffff; border:1px solid #e3e5e8; border-radius:12px; overflow:hidden;">
    <tr><td bgcolor="#08090a" style="background-color:#08090a; padding:26px 32px;">
      <img src="${LOGO_URL}" width="124" height="36" alt="Dorax Finance" style="display:block; border:0; outline:none; text-decoration:none; height:36px; width:124px; color:#f7f8f8; font-family:${FONT}; font-size:20px; font-weight:600;">
    </td></tr>
    <tr><td style="padding:36px 32px 0; font-family:${FONT};">
      <h1 style="margin:0 0 12px; font-size:22px; line-height:1.3; font-weight:600; color:#0b0c0d; letter-spacing:-0.01em;">${e.title}</h1>
      <p style="margin:0; font-size:15px; line-height:1.6; color:#3c4149;">${e.text}</p>
    </td></tr>
${e.notice ? notice(e) : action(e)}
    <tr><td style="padding:18px 32px; border-top:1px solid #eceef0; background-color:#fafafa; font-family:${FONT};">
      <p style="margin:0; font-size:12px; line-height:1.5; color:#6b7280;">${e.why}</p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>
`;

fs.mkdirSync(OUT, { recursive: true });
const subjects = [];
for (const [name, e] of Object.entries(EMAILS)) {
  fs.writeFileSync(path.join(OUT, name + '.html'), page(e));
  subjects.push(`${e.where}\n  file:    ${name}.html\n  subject: ${e.subject}\n`);
}
fs.writeFileSync(path.join(OUT, 'subjects.txt'), 'One block per email. Paste the "subject" line (all of it, with the curly braces) into the Subject field of that template in Supabase.\n\n' + subjects.join('\n'));
console.log('emails:', Object.keys(EMAILS).join(', '), '->', path.relative(process.cwd(), OUT));
