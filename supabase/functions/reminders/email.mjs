/* Dorax Finance — the reminder email: the same look as the account emails (tools/build-emails.js), filled in on the server.
   One heading, one line per reminder, one button that opens the site, and why the person is getting it with how to stop it.
   Everything a person typed (the names of their bills) is escaped before it goes into the page. */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/** title: the subject; lines: one sentence each; texts: { open, why }; site: the app's address (the logo comes from it); link: where the button
    goes (the site unless said otherwise); lang: 'pt' | 'es' | 'en'. */
export function reminderEmail({ title, lines, texts, site, lang, link }) {
  link = link || site;
  const logo = site.replace(/\/$/, '') + '/assets/email/dorax-logo.png';
  const rows = lines.map((l, i) => `<tr><td style="padding:12px 0; ${i ? 'border-top:1px solid #eceef0; ' : ''}font-family:${FONT}; font-size:15px; line-height:1.55; color:#3c4149;">${esc(l)}</td></tr>`).join('');
  const html = `<!doctype html>
<html lang="${esc(lang || 'pt')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Dorax Finance</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f4f5;">
<div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${esc(lines[0] || '')}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f5;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:560px; background-color:#ffffff; border:1px solid #e3e5e8; border-radius:12px; overflow:hidden;">
    <tr><td bgcolor="#08090a" style="background-color:#08090a; padding:26px 32px;">
      <img src="${esc(logo)}" width="124" height="36" alt="Dorax Finance" style="display:block; border:0; outline:none; text-decoration:none; height:36px; width:124px; color:#f7f8f8; font-family:${FONT}; font-size:20px; font-weight:600;">
    </td></tr>
    <tr><td style="padding:36px 32px 0; font-family:${FONT};">
      <h1 style="margin:0 0 8px; font-size:22px; line-height:1.3; font-weight:600; color:#0b0c0d; letter-spacing:-0.01em;">${esc(title)}</h1>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
    </td></tr>
    <tr><td style="padding:20px 32px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td bgcolor="#006239" style="background-color:#006239; border-radius:8px;">
          <a href="${esc(link)}" target="_blank" style="display:inline-block; padding:13px 24px; font-family:${FONT}; font-size:15px; line-height:1.2; font-weight:600; color:#ffffff; text-decoration:none; border-radius:8px;">${esc(texts.open)}</a>
        </td></tr></table>
    </td></tr>
    <tr><td style="padding:18px 32px; border-top:1px solid #eceef0; background-color:#fafafa; font-family:${FONT};">
      <p style="margin:0; font-size:12px; line-height:1.5; color:#6b7280;">${esc(texts.why)}</p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>
`;
  return { html, text: [title, '', ...lines, '', texts.open + ': ' + link, '', texts.why].join('\n') };
}

export const PARTS = [esc, FONT, reminderEmail];
