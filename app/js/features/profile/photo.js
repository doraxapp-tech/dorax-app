/* Dorax Finance — the person's photo (owner, 2026-10-08: "add the option to upload a profile photo").
   The photo is made small on this device before it is kept: a square of 192 px cut from the middle of the picture, a JPEG of a few kilobytes, in
   S.user.photo. It travels with the account like the rest of the profile, so every device shows it, and it is sent nowhere else. Until there is one,
   the figure drawn in the logo's style stands in (avatar, profile.view.js). Where it shows: the phone's top panel, the computer's menu card and the
   profile's head. */
const PHOTO_PX = 192;
/** Only a picture this app made is drawn: an image as base64, of a sensible size. Anything else in the field is ignored. */
const photoOk = p => typeof p === 'string' && p.length < 200000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p);
const photoHas = () => !!(typeof S !== 'undefined' && S.user && photoOk(S.user.photo));
function photoLoad(file) {
  const viaImg = () => new Promise((ok, no) => { const u = URL.createObjectURL(file), i = new Image(); i.onload = () => { URL.revokeObjectURL(u); ok(i); }; i.onerror = () => { URL.revokeObjectURL(u); no(new Error('decode')); }; i.src = u; });
  return window.createImageBitmap ? createImageBitmap(file).catch(viaImg) : viaImg();
}
/** The picture chosen, cut square from its middle and made small; kept, and the person told. One the browser cannot read is said so, kindly. */
async function photoTake(file) {
  try {
    const img = await photoLoad(file), w = img.width, h = img.height, side = Math.min(w, h);
    if (!side) throw new Error('empty');
    const c = document.createElement('canvas'); c.width = c.height = PHOTO_PX;
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, PHOTO_PX, PHOTO_PX);
    x.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, PHOTO_PX, PHOTO_PX);
    const url = c.toDataURL('image/jpeg', 0.85);
    if (!photoOk(url)) throw new Error('size');
    S.user.photo = url; save(); render(); toast(t('Photo updated.'));
    const el = $('pf-photo'); if (el) el.focus({ preventScroll: true });
  } catch (e) { toast(t('I couldn’t read that image. Try a JPG or PNG.')); }
}
const PHOTO_CHANGES = {
  'photo-file'(el) { const f = el.files && el.files[0]; if (!f) return; const p = photoTake(f); el.value = ''; return p; },      // emptied, so the same picture can be chosen again
};
const PHOTO_ACTIONS = {
  'photo-remove'() { delete S.user.photo; save(); render(); toast(t('Photo removed.')); const el = $('pf-photo'); if (el) el.focus({ preventScroll: true }); },
};
