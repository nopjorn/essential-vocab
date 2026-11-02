'use strict';
// The app's own keyboard for single-word typing (1.123): spelling, type-what-you-hear (one word), the crossword and the word ladder.
// The phone's keyboard pushes the page up so the input / check button get covered (worst in landscape), often opens in Thai and adds
// the iOS ˄ ˅ ✓ bar. appKbd(input, form) turns the input read-only (inputmode="none") and puts a QWERTY pad under the form;
// a real keyboard (iPad / computer) still types through a keydown listener. Setting `settings.appKbd`: 'auto' (touch screens) | 'on' | 'off'.
// Sentence inputs, search and e-mail keep the phone's keyboard. Classic script sharing globals with app.js.

const kbdOn = () => { const m = S.settings.appKbd || 'auto'; return m === 'on' || (m === 'auto' && !!(window.matchMedia && matchMedia('(pointer: coarse)').matches)); };
let kbdKeys = null; // the document keydown listener of the keyboard on screen
function appKbd(input, form) {
  if (!input || !form || !kbdOn()) return false;
  input.readOnly = true; input.setAttribute('inputmode', 'none'); input.classList.add('kb-in');
  const max = +input.getAttribute('maxlength') || 40;
  const rows = ['qwertyuiop', 'asdfghjkl', "zxcvbnm'-"];
  const pad = document.createElement('div');
  pad.className = 'app-kb'; pad.setAttribute('role', 'group'); pad.setAttribute('aria-label', 'คีย์บอร์ด');
  pad.innerHTML = rows.map((r, k) => `<div class="kb-r">${[...r].map((c) => `<button type="button" class="kb-k" data-k="${c}" lang="en">${c}</button>`).join('')}${k === 2 ? '<button type="button" class="kb-k kb-del" data-k="del" aria-label="ลบ">⌫</button>' : ''}</div>`).join('')
    + '<div class="kb-r"><button type="button" class="kb-k kb-sp" data-k=" " aria-label="เว้นวรรค">space</button><button type="button" class="kb-k kb-ok" data-k="ok">✓ ตรวจ</button></div>';
  form.after(pad);
  const put = (k) => {
    if (input.disabled || !input.isConnected) return;
    if (k === 'del') input.value = input.value.slice(0, -1);
    else if (k === 'ok') { if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event('submit', { cancelable: true })); return; }
    else if (input.value.length < max) input.value += k;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  // Apple Pencil (1.135): a pencil touch on the field hands it back to iPadOS, so Scribble can turn handwriting into text there.
  input.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'pen' || !input.readOnly) return;
    input.readOnly = false; input.setAttribute('inputmode', 'text'); input.classList.add('kb-pen');
    input.focus();
    if (typeof toast === 'function') toast('✏️ เขียนด้วย Apple Pencil ลงในช่องได้เลย');
  });
  pad.onclick = (e) => { const b = e.target.closest('[data-k]'); if (b) { put(b.dataset.k); } };
  if (kbdKeys) document.removeEventListener('keydown', kbdKeys);
  kbdKeys = (e) => {
    if (!input.isConnected) { document.removeEventListener('keydown', kbdKeys); kbdKeys = null; return; }
    if (e.metaKey || e.ctrlKey || e.altKey || (document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName) && document.activeElement !== input)) return;
    if (/^[a-zA-Z' -]$/.test(e.key)) { put(e.key.toLowerCase()); e.preventDefault(); }
    else if (e.key === 'Backspace') { put('del'); e.preventDefault(); }
    else if (e.key === 'Enter') { put('ok'); e.preventDefault(); }
  };
  document.addEventListener('keydown', kbdKeys);
  return true;
}
