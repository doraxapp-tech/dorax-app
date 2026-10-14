# Bank logos

The app shows a bank's own logo next to each account when its file is in this folder. Until then the account shows the bank's colour and two letters.

**Only the bank's own artwork, unchanged.** Download each file from the bank's press, media or brand page (search "<bank> brand" or "<bank> imprensa marca"). Do not redraw a logo, recolour it, or take it from an image search. Read the terms on that page: most allow showing the logo to identify the bank, some ask for more. This is on the list for the lawyer.

**What to pick.** The square symbol or app icon, not the long wordmark: it is shown in a 36-pixel circle, so the corners are cut. SVG is best; PNG, WebP or JPG of at least 144 x 144 pixels also work.

**File names.** Exactly these, in lower case:

| Bank | File name |
| --- | --- |
| Nubank | `nubank.svg` |
| Banco do Brasil | `banco-do-brasil.svg` |
| Mercado Pago | `mercado-pago.svg` |
| Santander | `santander.svg` |
| Wise | `wise.svg` |
| Itaú | `itau.svg` |
| Bradesco | `bradesco.svg` |
| Caixa | `caixa.svg` |
| Inter | `inter.svg` |
| C6 Bank | `c6-bank.svg` |
| PicPay | `picpay.svg` |
| BTG Pactual | `btg-pactual.svg` |
| XP | `xp.svg` |
| Sicredi | `sicredi.svg` |
| Agibank | `agibank.svg` |
| Banco BV | `bv.svg` |
| Banco Metropolitano (Cuba) | `banco-metropolitano.svg` |
| BPA (Cuba) | `bpa.svg` |
| BANDEC (Cuba) | `bandec.svg` |
| Unicaja | `unicaja.svg` |
| Deutsche Bank | `deutsche-bank.svg` |
| Banco Sabadell | `banco-sabadell.svg` |
| BBVA | `bbva.svg` |
| CaixaBank | `caixabank.svg` |
| Abanca | `abanca.svg` |

(`.png`, `.webp` or `.jpg` in place of `.svg` is fine.)

The nine added on 2026-10-14 are the pictures the owner sent, squared for the circle and not redrawn or recoloured: BPA without the line "banco popular de ahorro", BANDEC and CaixaBank with their symbol alone (the words beside or under it cannot be read at 36 pixels and the circle would cut them), Banco Metropolitano with a little more of its own lime around it so the circle does not cut the letters. If any did not come from the bank's own brand page, replace it with the bank's file when you have it (same name).

**Then.** Deploy as usual (`git add .`, `git commit`, `git push`). The deploy lists the files by itself. To see them on this computer first: `npm start`.

A bank with no file keeps its colour and letters; nothing breaks if only some are here.
