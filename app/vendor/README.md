# Third-party code

These libraries are not written for Dorax.

- `supabase.js` is loaded with the page: it is how the app talks to its server (logins and data). Only `js/server/server.js` uses it.
- The other two are loaded only when a person chooses a PDF or an old Excel file in the statement converter (see `js/features/converter/file-readers.js`).

| File | Library | Version | Licence |
| --- | --- | --- | --- |
| `supabase.js` | supabase-js (Supabase), the browser build | 2.117.2 | MIT |
| `pdf.min.js`, `pdf.worker.min.js` | pdf.js (Mozilla) | 3.11.174 | Apache-2.0 |
| `xlsx.min.js` | SheetJS Community Edition | 0.18.5 | Apache-2.0 |

pdf.js and SheetJS carry their own copyright and licence notice at the top of the file; supabase-js's is in `supabase.LICENSE.txt` beside it. Do not edit the libraries. One word was removed from pdf.js's list of typeface names in an earlier version (v30) so that the project's privacy check stays clean; nothing else was changed.

In the Next.js build these become npm packages (`@supabase/supabase-js`, `@supabase/ssr`, `pdfjs-dist`, `xlsx`); the two readers loaded with a dynamic `import()`.

To update `supabase.js`: download `dist/umd/supabase.js` of the new version from the `@supabase/supabase-js` npm package, replace the file, run `npm test` (`tests/qc-deploy.js` runs the app on the real library).
