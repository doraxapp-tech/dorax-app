/* Dorax Finance — interface translations: the table every text is looked up in. Each row: [English source, Español, Português]. English is the key.
   The rows themselves are in i18n/text/, one file per part of the app (2026-10-10, owner: "separate the things that can be separated"; before,
   every row of the app was in this one file). Each of those files calls addTexts; index.html loads them right after this one, so the table is
   whole before any screen asks for a text. A new text goes in the file of the part that uses it; one used by several parts goes in common.js. */
const TR = [];
const I18N = { es: {}, pt: {} };
function addTexts(rows) { for (const r of rows) { TR.push(r); I18N.es[r[0]] = r[1]; I18N.pt[r[0]] = r[2]; } }
