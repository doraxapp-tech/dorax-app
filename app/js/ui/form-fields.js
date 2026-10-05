/* Dorax Finance — shared: a labelled field for the forms in panels. */
const fld = (id, label, control, cls) => `<div class="field ${cls || ''}"><label for="${id}">${label}</label>${control}</div>`;
const inp = (id, k, val, extra) => `<input type="text" id="${id}" value="${esc(val)}" data-c="draft" data-k="${k}" ${extra || ''}>`;
