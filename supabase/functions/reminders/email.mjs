/* Dorax Finance — how every Dorax email looks: the reminders, the invitations and the test email (filled in here, on the server) and the account
   emails Supabase sends (tools/build-emails.js builds them from these same parts, so there is one look and one place to change it).
   The look (v229, owner, 2026-10-14: "la plantilla de correo necesita un update, tenemos nuevo estilo y visuales"; on the tries before: "si la landing
   tiene otro lenguaje, ilustraciones, etc." and "una template buena se ve como una landing page sin header, con footer y iconos, secciones marcadas"):
   each email is a page of the website without its menu. Bands the width of the screen, one after the other, each with its own ground, as the home
   page's sections (css/public/landing-v2.css):
     - the top, on the sage (#F2F4EE): the logo with FINANCE under it, the pill with the lime dot (what kind of email it is), the large tight heading,
       a line under it, the lime button, and at the foot the drawing of what the email is about: one of Dorax's people with its lime shadow (with the
       home page's white chips over it when there are amounts), or one of Dorax's things on its mint circle (with the figure in a chip beside it);
     - the lines, on white: each with its thing on its mint circle, under hairlines;
     - a band that explains, on the forest (#163300, its things mint on a deep circle) or on the deeper sage (#E7EDE0, its things on white circles);
     - the way in, as the home page ends: a lime band (#9FD182) with its heading and the forest button with lime words;
     - the footer, as the website's: near black (#0E0F0C), the logo, the website's line, its links, why the email came, what Dorax is not, ©.
   Email has to be written this way: tables and inline styles only (Gmail and Outlook drop most stylesheets), one column so it reads on a phone with
   no stylesheet, no outside file but the pictures: PNG files the site serves (email programs do not draw SVG; app/assets/email/, drawn from the
   site's own drawings). The logos and the people are drawn on their band's colour, so a mail program that darkens a page in its dark mode still
   shows them whole. The font is the system's (most mail programs, Gmail among them, load no fonts).
   Everything a person typed (the names of their bills) is escaped before it goes into the page. */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** An amount never breaks across two lines ("R$" at the end of one, "5" at the start of the next), as in the app. */
const whole = s => String(s == null ? '' : s).replace(/(R\$|US\$|€|[A-Z]{3}) (?=\d)/g, (m, c) => c + ' ');
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
/** The website's colours (css/public/landing-v2.css). Contrast, measured: #0E0F0C on the sage 18.0:1, #454745 on white 9.4:1, the forest on the
    lime 7.9:1, white on the forest 13.6:1, the mint on the forest 11.7:1, #959793 on the footer 6.6:1. */
const C = { page: '#F2F4EE', sage2: '#E7EDE0', card: '#FFFFFF', line: '#E1E5DC', forest: '#163300', forest2: '#1F4209', lime: '#9FD182', mint: '#E2F6D5',
  ink: '#0E0F0C', ink2: '#454745', ink3: '#5F625D', dark: '#0E0F0C', darkLine: '#262A22', onDark: '#D4D4D4', onDark2: '#959793' };
/** The pictures (app/assets/email/): the logos, Dorax's people (art/people/, on the sage) and things (art/: on their mint circle; art/dark/: for
    the forest; art/panel/: on a white circle, for the deeper sage). */
const PICS = '/assets/email/';
const PEOPLE = ['phone', 'win', 'hi', 'key'];
/** The website's pages the footer links to (ui/pages.js). */
const LINKS = [['help', 'ajuda'], ['blog', 'blog'], ['contact', 'contato'], ['privacy', 'privacidade']];

const pic = (site, file, w, h, alt) => `<img src="${site.replace(/\/$/, '')}${PICS}${file}" width="${w}" height="${h}" alt="${alt || ''}" style="display:block; border:0; outline:none; text-decoration:none; width:${w}px; height:${h}px;${alt ? ` font-family:${FONT}; font-size:18px; font-weight:700;` : ''}">`;
/** A band the width of the screen, its content 600 wide at most. */
const band = (bg, pad, inner) => `
<tr><td align="center" bgcolor="${bg}" style="background-color:${bg}; padding:${pad};">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px;"><tr><td style="padding:0 24px; font-family:${FONT};">${inner}
  </td></tr></table>
</td></tr>`;
/** The pill with the lime dot. dark: on the forest. */
const pill = (text, dark) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td bgcolor="${dark ? C.forest2 : C.card}" style="background-color:${dark ? C.forest2 : C.card}; border:1px solid ${dark ? '#2E5214' : C.line}; border-radius:999px; padding:7px 14px 7px 12px; font-family:${FONT}; font-size:13px; line-height:16px; font-weight:600; color:${dark ? C.lime : C.forest}; white-space:nowrap;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${C.lime}; vertical-align:1px;"></span>&nbsp;&nbsp;${text}</td></tr></table>`;
/** A button. forest: the forest one with lime words (in the lime box); otherwise lime with forest words. The colour is on the cell too, for Outlook. */
const button = (href, label, forest) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
        <td bgcolor="${forest ? C.forest : C.lime}" style="background-color:${forest ? C.forest : C.lime}; border-radius:999px;">
          <a href="${href}" target="_blank" style="display:inline-block; padding:16px 30px; font-family:${FONT}; font-size:16px; line-height:18px; font-weight:600; color:${forest ? C.lime : C.forest}; text-decoration:none; border-radius:999px;">${label}</a>
        </td></tr></table>`;
/** A white chip, as the home page's over its people: a small line and a figure. */
const chip = (label, value, big) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td bgcolor="${C.card}" style="background-color:${C.card}; border:1px solid ${C.line}; border-radius:16px; padding:${big ? '12px 18px 14px' : '10px 14px 11px'}; font-family:${FONT}; text-align:left;">${big
  ? `<div style="font-size:24px; line-height:30px; font-weight:700; color:${C.ink}; letter-spacing:-0.02em; white-space:nowrap;">${value}</div><div style="margin:2px 0 0; font-size:13px; line-height:18px; color:${C.ink3}; max-width:150px;">${label}</div>`
  : `<div style="font-size:12px; line-height:16px; color:${C.ink3};">${label}</div><div style="margin:2px 0 0; font-size:16px; line-height:20px; font-weight:700; color:${C.ink}; white-space:nowrap;">${value}</div>`}</td></tr></table>`;

/** The top band. art: a person (drawn standing on the band's foot) or a thing; chips: [{ label, value }] over a person; figure: { big, small } in a
    chip beside a thing. Every text comes in safe. */
function top({ site, kicker, title, lead, action, art, chips, figure }) {
  const person = PEOPLE.includes(art);
  let drawing = '';
  if (art && person) drawing = `${chips && chips.length ? `
    <tr><td align="center" style="padding:36px 0 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${chips.map((c, i) => `<td valign="bottom" style="padding:0 ${i < chips.length - 1 ? '10px' : '0'} 0 0;">${chip(c.label, c.value)}</td>`).join('')}</tr></table></td></tr>` : ''}
    <tr><td align="center" style="padding:${chips && chips.length ? '14px' : '36px'} 0 0;">${pic(site, 'art/people/' + art + '.png', 174, 180)}</td></tr>`;
  else if (!art && figure && figure.big) drawing = `
    <tr><td align="center" style="padding:32px 0 0;">${chip(figure.small, figure.big, true)}</td></tr>`;      // a figure with no drawing: its chip alone
  else if (art) drawing = `
    <tr><td align="center" style="padding:36px 0 0;">${figure && figure.big ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding:0 14px 0 0;">${pic(site, 'art/' + art + '.png', 88, 88)}</td><td valign="middle">${chip(figure.small, figure.big, true)}</td></tr></table>` : pic(site, 'art/' + art + '.png', 104, 104)}</td></tr>`;
  return band(C.page, `40px 0 ${person ? '0' : '44px'}`, `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center">${pic(site, 'dorax-finance.png', 114, 56, 'Dorax Finance')}</td></tr>
    <tr><td align="center" style="padding:28px 0 0;">${pill(kicker)}</td></tr>
    <tr><td align="center" style="padding:18px 0 0;"><h1 style="margin:0; font-family:${FONT}; font-size:36px; line-height:40px; font-weight:600; color:${C.ink}; letter-spacing:-0.035em; text-align:center;">${title}</h1></td></tr>${lead ? `
    <tr><td align="center" style="padding:14px 8px 0;"><p style="margin:0 auto; max-width:470px; font-family:${FONT}; font-size:17px; line-height:27px; color:${C.ink2}; text-align:center;">${lead}</p></td></tr>` : ''}${action ? `
    <tr><td align="center" style="padding:26px 0 0;">${action}</td></tr>` : ''}${drawing}
    </table>`);
}
/** The lines, on white: each with its thing on its mint circle, under hairlines. items: [{ thing, html }]; quiet: lines said under them, small. */
function list({ site, kicker, title, items, quiet, after }) {
  return band(C.card, '44px 0 44px', `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${kicker ? `
    <tr><td align="center" style="padding:0 0 ${title ? '14px' : '20px'};">${pill(kicker)}</td></tr>` : ''}${title ? `
    <tr><td align="center" style="padding:0 0 22px;"><h2 style="margin:0; font-family:${FONT}; font-size:26px; line-height:31px; font-weight:600; color:${C.ink}; letter-spacing:-0.03em; text-align:center;">${title}</h2></td></tr>` : ''}
    ${(items || []).map((it, i) => `<tr><td style="padding:${i ? '0' : '0'}; ${i ? `border-top:1px solid ${C.line}; ` : ''}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${it.thing ? `
        <td width="44" valign="middle" style="width:44px; padding:16px 0;">${pic(site, 'art/' + it.thing + '.png', 44, 44)}</td>` : ''}
        <td valign="middle" style="padding:16px 0 16px ${it.thing ? '16px' : '0'}; font-family:${FONT}; font-size:16px; line-height:24px; color:${C.ink2}; text-align:left;">${it.html}</td>
      </tr></table></td></tr>`).join('')}${(quiet || []).map(q => `
    <tr><td align="center" style="padding:18px 0 0; font-family:${FONT}; font-size:14px; line-height:21px; color:${C.ink3}; text-align:center;">${q}</td></tr>`).join('')}${after ? `
    <tr><td style="padding:${(items || []).length ? '18px' : '0'} 0 0; font-family:${FONT};">${after}</td></tr>` : ''}
    </table>`);
}
/** A band that explains: a heading, a line, and rows with their thing. tone 'forest': the forest band, its things mint; otherwise the deeper sage,
    its things on white circles. items: [{ thing, title, text }]. */
function explain({ site, tone, kicker, title, lead, items }) {
  const dark = tone === 'forest', bg = dark ? C.forest : C.sage2, ink = dark ? '#FFFFFF' : C.ink, ink2 = dark ? C.mint : C.ink2;
  return band(bg, '48px 0 48px', `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${kicker ? `
    <tr><td align="center" style="padding:0 0 14px;">${pill(kicker, dark)}</td></tr>` : ''}
    <tr><td align="center"><h2 style="margin:0; font-family:${FONT}; font-size:28px; line-height:33px; font-weight:600; color:${ink}; letter-spacing:-0.03em; text-align:center;">${title}</h2></td></tr>${lead ? `
    <tr><td align="center" style="padding:10px 8px 0;"><p style="margin:0 auto; max-width:460px; font-family:${FONT}; font-size:16px; line-height:25px; color:${ink2}; text-align:center;">${lead}</p></td></tr>` : ''}
    <tr><td style="padding:22px 0 0;">${items.map((it, i) => `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="48" valign="${it.text ? 'top' : 'middle'}" style="width:48px; padding:${i ? '18px' : '0'} 0 0;">${pic(site, 'art/' + (dark ? 'dark/' : 'panel/') + it.thing + '.png', 48, 48)}</td>
        <td valign="${it.text ? 'top' : 'middle'}" style="padding:${i ? '18px' : '0'} 0 0 16px; font-family:${FONT}; text-align:left;"><div style="font-size:17px; line-height:24px; font-weight:600; color:${ink}; padding-top:${it.text ? '1px' : '0'};">${it.title}</div>${it.text ? `<div style="margin:2px 0 0; font-size:15px; line-height:22px; color:${ink2};">${it.text}</div>` : ''}</td>
      </tr></table>`).join('')}
    </td></tr>
    </table>`);
}
/** The way in, as the home page ends: a lime box on the sage with its heading, a line, the forest button; a quiet note under it. */
function way({ title, text, action, note }) {
  // a band like every other section, the width of the screen and square (owner, 2026-10-14, on a rounded lime box among square bands: "no son
  // consistentes"): what is round is what sits inside a section (buttons, pills, chips, the things' circles), never a section
  return band(C.lime, '48px 0 52px', `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="font-family:${FONT};">
      <h2 style="margin:0; font-family:${FONT}; font-size:30px; line-height:34px; font-weight:600; color:${C.forest}; letter-spacing:-0.035em; text-align:center;">${title}</h2>${text ? `
      <p style="margin:12px auto 0; max-width:440px; font-family:${FONT}; font-size:16px; line-height:25px; color:${C.forest}; text-align:center;">${text}</p>` : ''}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:24px 0 0;">${action}</td></tr></table>${note ? `
      <p style="margin:16px 0 0; font-family:${FONT}; font-size:14px; line-height:21px; color:${C.forest}; text-align:center;">${note}</p>` : ''}
    </td></tr></table>`);
}
/** The footer, as the website's: the logo, its line, its links, why the email came, what Dorax is not, the year. f: { tagline, disclaimer, help, blog,
    contact, privacy, notifications } (safe); site: the links' address; why: the small print. */
function footer({ site, f, why, more }) {
  const root = site.replace(/\/$/, ''), a = (href, label) => `<a href="${href}" target="_blank" style="color:${C.onDark}; text-decoration:none; white-space:nowrap;">${label}</a>`;
  const links = [...LINKS.filter(([k]) => f[k]).map(([k, p]) => a(root + '/' + p, f[k])), ...(f.notifications ? [a(root + '/#profile', f.notifications)] : [])].join(` <span style="color:${C.ink3};">&nbsp;·&nbsp;</span> `);      // breakable spaces around the dot: on a phone the links wrap
  return band(C.dark, '44px 0 48px', `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center">${pic(site, 'dorax-finance-dark.png', 114, 56, 'Dorax Finance')}</td></tr>${f.tagline ? `
    <tr><td align="center" style="padding:16px 8px 0; font-family:${FONT}; font-size:14px; line-height:22px; color:${C.onDark}; text-align:center;">${f.tagline}</td></tr>` : ''}${links ? `
    <tr><td align="center" style="padding:20px 0 0; font-family:${FONT}; font-size:13px; line-height:24px; text-align:center;">${links}</td></tr>` : ''}
    <tr><td style="padding:24px 0 0;"><div style="border-top:1px solid ${C.darkLine}; font-size:0; line-height:0;">&nbsp;</div></td></tr>
    <tr><td align="center" style="padding:20px 0 0; font-family:${FONT}; font-size:12px; line-height:19px; color:${C.onDark2}; text-align:center;">${why}${more || ''}</td></tr>${f.disclaimer ? `
    <tr><td align="center" style="padding:12px 0 0; font-family:${FONT}; font-size:12px; line-height:19px; color:${C.onDark2}; text-align:center;">${f.disclaimer}</td></tr>` : ''}
    <tr><td align="center" style="padding:12px 0 0; font-family:${FONT}; font-size:12px; line-height:19px; color:${C.onDark2}; text-align:center;">© ${new Date().getUTCFullYear()} Dorax Finance</td></tr>
    </table>`);
}

/** The page: its sections (bands, from the parts above), one under the other. lang: the html's lang; pre: the line inbox lists show after the
    subject. */
const page = ({ lang, pre, sections }) => `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Dorax Finance</title>
</head>
<body style="margin:0; padding:0; background-color:${C.page};">
<div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${pre}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background-color:${C.page};">${sections.filter(Boolean).join('')}
</table>
</body>
</html>
`;

/** The emails the server sends. title: the subject; lead: a line under the heading; lines: one sentence each, with marks: the thing beside each
    (null: said quietly under the others); hero: the drawing at the top (a person: phone, win, hi, key; or a thing); chips: [{ label, value }] over a
    person; figure: { big, small } beside a thing; band: { title, lead, items: [[thing, title]] }, a forest band that explains; cta: the heading of the
    lime box at the end (with texts.cta.text under it), which repeats the button; texts: { open, why, kicker, listKicker, cta, foot } (no "open": no
    button); site: the app's address (the pictures and links come from it); link: where the button goes (the site unless said otherwise; a mailto:
    address makes it a "write to" button); more: { text, link }, a small link after the small print; lang: 'pt' | 'es' | 'en'. */
export function reminderEmail({ title, lead, lines, marks, hero: art, chips, figure, band: info, cta, texts, site, lang, link, more }) {
  link = link || site; lines = lines || [];
  // the button: where it goes decides how the plain-text version says it (an address to write to is not something to "open")
  const writes = /^mailto:/i.test(link);
  const after = more && more.text && more.link ? ` <a href="${esc(more.link)}" target="_blank" style="color:${C.onDark}; text-decoration:underline;">${esc(more.text)}</a>` : '';
  const say = l => esc(whole(l)), open = texts.open ? button(esc(link), esc(texts.open)) : '';
  const items = lines.map((l, i) => ({ thing: Array.isArray(marks) ? marks[i] : null, html: say(l), loud: !Array.isArray(marks) || !!marks[i] }));
  const ctaText = texts.cta && typeof texts.cta === 'object' ? texts.cta : null;
  const end = cta || (ctaText && ctaText.title) ? way({ title: say(cta || ctaText.title), text: cta ? '' : say(ctaText.text || ''), action: texts.open ? button(esc(link), esc(texts.open), true) : '' }) : '';
  const sections = [
    top({ site, kicker: esc(texts.kicker || 'Dorax Finance'), title: say(title), lead: lead ? say(lead) : '', action: open, art,
      chips: (chips || []).map(c => ({ label: say(c.label), value: say(c.value) })), figure: figure && figure.big ? { big: say(figure.big), small: say(figure.small || '') } : null }),
    items.length ? list({ site, kicker: esc(texts.listKicker || ''), items: items.filter(x => x.loud), quiet: items.filter(x => !x.loud).map(x => x.html) }) : '',
    info ? explain({ site, tone: 'forest', title: say(info.title), lead: say(info.lead || ''), items: info.items.map(([thing, t]) => ({ thing, title: say(t) })) }) : '',
    end,
    footer({ site, f: Object.fromEntries(Object.entries(texts.foot || {}).map(([k, v]) => [k, esc(v)])), why: esc(texts.why), more: after }),
  ];
  const html = page({ lang: esc(lang || 'pt'), pre: esc(lead || lines[0] || ''), sections });
  const action = !texts.open ? [] : writes ? [texts.open, ''] : [texts.open + ': ' + link, ''];
  return { html, text: [title, '', ...(figure && figure.big ? [figure.big + (figure.small ? ' — ' + figure.small : ''), ''] : []), ...(lead ? [lead, ''] : []), ...lines, ...(lines.length ? [''] : []), ...action, texts.why + (after ? ' ' + more.text + ': ' + more.link : '')].join('\n') };
}

export { page, top, list, explain, way, footer, button, pill, chip, C, FONT };
export const PARTS = [esc, whole, FONT, JSON.stringify(C), PICS, PEOPLE.join(), JSON.stringify(LINKS), pic, band, pill, button, chip, top, list, explain, way, footer, page, reminderEmail];
