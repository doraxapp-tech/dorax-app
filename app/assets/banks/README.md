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

(`.png`, `.webp` or `.jpg` in place of `.svg` is fine.)

**Then.** Deploy as usual (`git add .`, `git commit`, `git push`). The deploy lists the files by itself. To see them on this computer first: `npm start`.

A bank with no file keeps its colour and letters; nothing breaks if only some are here.
