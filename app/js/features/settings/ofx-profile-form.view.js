/* Dorax Finance — panel: an OFX export profile. */
function profileDrawer(d) {
  const p = d.draft;
  return `<div class="body">${d.error ? banner('crit', esc(d.error)) : ''}<div class="form-grid">
    ${fld('p-name', t('Profile name'), inp('p-name', 'name', p.name), 'full')}
    ${fld('p-ver', t('OFX version'), `<select id="p-ver" data-c="draft" data-k="version">${options(OFX_VERSIONS.map(v => [v.id, v.label]), p.version)}</select>`)}
    ${fld('p-cur', t('Currency'), inp('p-cur', 'currency', p.currency, 'maxlength="3"'))}
    ${fld('p-type', t('Account type'), `<select id="p-type" data-c="draft" data-k="accountType">${options(OFX_ACCTTYPES.map(v => [v, v]), p.accountType)}</select>`)}
    ${fld('p-bank', t('Bank ID'), inp('p-bank', 'bankId', p.bankId))}
    ${fld('p-branch', t('Branch ID'), inp('p-branch', 'branchId', p.branchId))}
    ${fld('p-acct', t('Account ID'), inp('p-acct', 'accountId', p.accountId))}
    ${fld('p-org', t('Institution name'), inp('p-org', 'institutionName', p.institutionName))}
    ${fld('p-fid', t('Institution ID'), inp('p-fid', 'institutionId', p.institutionId))}
    ${fld('p-lang', t('Language code'), inp('p-lang', 'language', p.language, 'maxlength="3"'))}
    ${fld('p-xfer', t('Transfers export as'), `<select id="p-xfer" data-c="draft" data-k="transferMapping">${options([['SIGN', t('DEBIT / CREDIT by direction')], ['XFER', 'XFER']], p.transferMapping)}</select>`)}</div>
    <p class="note">${t('OFX 1.x files are written in ASCII, so accents are removed from names. Use the version your accounting platform accepts.')}</p></div>
  <footer><button class="btn primary" data-a="save-profile">${t('Save')}</button>${d.isNew || S.ofxProfiles.length < 2 ? '' : `<button class="btn ghost danger" data-a="delete-profile">${t('Delete')}</button>`}<button class="btn ghost spacer" data-a="close">${t('Cancel')}</button></footer>`;
}
