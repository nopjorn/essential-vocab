'use strict';
// Study tools (1.135): printable worksheets (route `print`) and words from your own English text (route `mine`).
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- worksheets ---------- */
// A sheet = header (name / date / score lines) + the parts picked in WK_PARTS + an answer key on its own page.
// Settings: settings.ws = {src, tp, n, parts, key, title}. Printing copies the sheet into #printArea (a body child);
// @media print hides everything else (WK_CSS). "บันทึกเป็นไฟล์" saves the same sheet as a standalone HTML file.
const WK_PARTS = [['list', '📋', 'รายการคำ + คำแปล'], ['match', '🔗', 'จับคู่คำกับความหมาย'], ['spell', '✍️', 'เขียนคำจากคำแปล'], ['cloze', '📝', 'เติมคำในประโยค'], ['trace', '✏️', 'คัดลายมือ']];
const WK_N = [10, 15, 20, 30];
let wkCustom = null; // {name, words} handed over by another page (words from an article)
let wkSeed = 1, wkFrom = ['settings']; // wkFrom = [route, arg] the ‹ กลับ button returns to
function wkOpt() {
  const o = S.settings.ws || {};
  return {
    src: typeof o.src === 'string' ? o.src : W.some((w) => status(w) === 'learning') ? 'learning' : 'new', // a new learner starts from the next new words
    tp: typeof o.tp === 'string' ? o.tp : 'food', n: WK_N.includes(o.n) ? o.n : 15,
    parts: Array.isArray(o.parts) ? o.parts.filter((p) => WK_PARTS.some((x) => x[0] === p)) : ['list', 'match', 'spell', 'cloze'],
    key: o.key !== false, title: typeof o.title === 'string' ? o.title.slice(0, 60) : '',
  };
}
function wkSetOpt(patch) { S.settings.ws = { ...wkOpt(), ...patch }; save(); }
// [value, label, words in order] of every source the sheet can draw on.
function wkSources() {
  const out = [];
  if (wkCustom) out.push(['custom', `📰 ${wkCustom.name}`, () => wkCustom.words]);
  out.push(['learning', '🟡 คำที่กำลังเรียน', () => W.filter((w) => status(w) === 'learning').sort((a, b) => S.prog[a.w].d - S.prog[b.w].d)],
    ['due', '⏰ ครบกำหนดทบทวน', () => dueList()],
    ['new', '🆕 คำใหม่ถัดไป (ระดับที่เลือก)', () => pool().filter((w) => !S.prog[w.w])],
    ['leech', '🐢 คำดื้อ', () => W.filter(isLeech)],
    ['star', '⭐ คำติดดาว', () => W.filter(isStar)],
    ['mastered', '🟢 จำได้แล้ว (ทวนกันลืม)', () => masteredWords()],
    ['level', '🎲 สุ่มจากระดับที่เลือก', () => pool()],
    ['topic', '📂 ตามหมวด…', () => W.filter((w) => topicMatch(wkOpt().tp, w.tp))]);
  liveDecks().forEach((d) => out.push(['deck:' + d.id, `${d.icon} ${d.name || 'ชุดไม่มีชื่อ'}`, () => deckWords(d).filter((w) => !w.own)]));
  return out;
}
// Seeded shuffle, so the preview and the printed sheet are the same until 🔀 is pressed.
function wkRng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function wkShuffle(list, rnd) { const a = list.slice(); for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; }
function wkWords(o = wkOpt()) {
  const src = wkSources().find((s) => s[0] === o.src) || wkSources().find((s) => s[0] === 'learning');
  const list = [...new Set(src[2]())].filter((w) => w && w.idx >= 0);
  const ordered = ['due', 'new'].includes(src[0]) ? list : wkShuffle(list, wkRng(wkSeed * 7919 + list.length)); // due / next new: the first ones
  return { label: src[1], words: ordered.slice(0, o.n) };
}
// The sheet as HTML (inside .wk-paper). Pure: words + options in, markup out (tests read it).
function wkSheet(words, o, label) {
  const rnd = wkRng(wkSeed * 31 + words.length);
  const parts = o.parts.length ? o.parts : ['list'];
  const key = [];
  let no = 0;
  const sec = (title, note, body) => `<section class="wk-sec"><h2>ตอนที่ ${++no} · ${title}</h2>${note ? `<p class="wk-note">${note}</p>` : ''}${body}</section>`;
  const html = [];
  for (const p of parts) {
    if (p === 'list') {
      html.push(sec('คำศัพท์', 'อ่านออกเสียง แล้วติ๊ก ☐ เมื่อจำได้', `<table class="wk-tbl"><thead><tr><th>#</th><th>คำ</th><th>อ่านว่า</th><th>ความหมาย</th><th>จำได้</th></tr></thead><tbody>${words.map((w, k) => `<tr><td>${k + 1}</td><td><span class="wk-en" lang="en">${esc(w.w)}</span> <i class="wk-pos">${esc(w.p)}</i></td><td class="wk-ipa">${esc(w.i || '')}</td><td>${esc(w.t)}</td><td><span class="wk-box"></span></td></tr>`).join('')}</tbody></table>`));
    } else if (p === 'match') {
      const blocks = [];
      for (let s = 0; s < words.length; s += 10) blocks.push(words.slice(s, s + 10));
      const ans = [];
      const body = blocks.map((b, bi) => {
        const right = wkShuffle(b, rnd);
        const L = 'abcdefghij';
        b.forEach((w, k) => ans.push(`${bi * 10 + k + 1}-${L[right.indexOf(w)]}`));
        return `<div class="wk-match">${b.map((w, k) => `<div><span class="wk-ln"></span> ${bi * 10 + k + 1}. <b lang="en">${esc(w.w)}</b></div><div>${L[k]}) ${esc(right[k].t)}</div>`).join('')}</div>`;
      }).join('');
      html.push(sec('จับคู่คำกับความหมาย', 'เขียนตัวอักษร a, b, c … ของความหมายที่ถูกลงในช่องหน้าคำ', body));
      key.push(['จับคู่', ans.join(' · ')]);
    } else if (p === 'spell') {
      const box = (w) => [...w.w].map((c, k) => (c === ' ' ? '<i class="gap"></i>' : `<i>${k === 0 ? esc(c) : c === '-' || c === "'" ? esc(c) : ''}</i>`)).join('');
      const list = wkShuffle(words, rnd);
      html.push(sec('เขียนคำจากคำแปล', 'มีตัวอักษรแรกให้ เขียนตัวที่เหลือในช่องให้ครบ', list.map((w, k) => `<div class="wk-sp"><span class="th">${k + 1}. ${esc(w.t)} <i class="wk-pos">${esc(w.p)}</i></span><span class="wk-lb" lang="en">${box(w)}</span></div>`).join('')));
      key.push(['เขียนคำ', list.map((w, k) => `${k + 1}. ${esc(w.w)}`).join(' · ')]);
    } else if (p === 'cloze') {
      const rows = wkShuffle(words.filter(hasCloze), rnd).map((w) => {
        let ans = '';
        const blank = w.e.replace(clozeRe(w), (all, pre) => { ans = all.slice(pre.length); return pre + '\u0000'; });
        return { w, ans, blank };
      }).filter((r) => r.ans);
      if (!rows.length) continue;
      const bank = wkShuffle(rows.map((r) => r.w.w), rnd);
      html.push(sec('เติมคำในประโยค', 'เลือกคำจากกล่องเติมลงในช่องว่าง (เปลี่ยนรูปคำได้ เช่น เติม -s -ed -ing)',
        `<div class="wk-bank" lang="en">${bank.map((b) => `<span>${esc(b)}</span>`).join('')}</div>${rows.map((r, k) => `<div class="wk-cz"><span lang="en">${k + 1}. ${esc(r.blank).replace('\u0000', '<span class="wk-ln wide"></span>')}</span>${r.w.et ? `<small>${esc(r.w.et)}</small>` : ''}</div>`).join('')}`));
      key.push(['เติมคำ', rows.map((r, k) => `${k + 1}. ${esc(r.ans)}`).join(' · ')]);
    } else if (p === 'trace') {
      html.push(sec('คัดลายมือ', 'ลอกคำสีจางให้สวย แล้วเขียนเองอีก 2 ครั้งในเส้นด้านขวา', words.map((w) => `<div class="wk-tr"><div class="wk-rule"><span aria-hidden="true" lang="en">${esc(w.w)}</span></div><div class="wk-rule"></div><div class="wk-rule"></div><small>${esc(w.t)}</small></div>`).join('')));
    }
  }
  const head = `<header class="wk-head"><h1>${esc(o.title || 'ใบงานคำศัพท์')}</h1>
    <div class="wk-meta"><span>ชื่อ <span class="wk-ln long"></span></span><span>วันที่ <span class="wk-ln"></span></span><span>คะแนน <span class="wk-ln"></span></span></div>
    <div class="wk-sub">${esc(label)} · ${words.length} คำ</div></header>`;
  const keyHtml = o.key && key.length ? `<section class="wk-key"><h2>🔑 เฉลย</h2>${key.map(([t, a]) => `<p><b>${t}:</b> <span lang="en">${a}</span></p>`).join('')}</section>` : '';
  return `${head}${html.join('')}${keyHtml}<footer class="wk-foot">ทำจากแอป ศัพท์ต้องรู้</footer>`;
}
// Worksheet styles (light paper in both themes; also copied into the saved HTML file).
const WK_CSS = `.wk-paper{background:#fff;color:#111;font-family:-apple-system,BlinkMacSystemFont,"Sarabun","Thonburi","Segoe UI",sans-serif;font-size:14px;line-height:1.55;padding:24px 26px;text-align:left}
.wk-paper h1{font-size:22px;margin:0 0 6px;color:#111}.wk-paper h2{font-size:16px;margin:22px 0 8px;padding-bottom:4px;border-bottom:2px solid #111;color:#111}
.wk-meta{display:flex;gap:8px 22px;flex-wrap:wrap;font-size:13px;margin:6px 0}.wk-sub,.wk-note,.wk-foot{color:#555;font-size:12px}.wk-note{margin:-2px 0 8px}
.wk-foot{margin-top:24px;text-align:center}.wk-tbl{width:100%;border-collapse:collapse}.wk-tbl th,.wk-tbl td{border-bottom:1px solid #ccc;padding:5px 6px;text-align:left;vertical-align:top}
.wk-tbl th{font-size:12px;color:#444}.wk-en{font-weight:700}.wk-pos{color:#555;font-size:12px}.wk-ipa{color:#444;font-size:12px}
.wk-box{display:inline-block;width:14px;height:14px;border:1.5px solid #333;border-radius:3px}
.wk-ln{display:inline-block;min-width:44px;border-bottom:1px solid #333;height:1em;vertical-align:baseline}.wk-ln.long{min-width:150px}.wk-ln.wide{min-width:90px}
.wk-match{display:grid;grid-template-columns:1fr 1fr;gap:2px 22px;margin-bottom:12px;break-inside:avoid}.wk-match div{padding:4px 0}
.wk-sp{display:flex;align-items:flex-end;gap:6px 14px;padding:7px 0;border-bottom:1px solid #eee;break-inside:avoid;flex-wrap:wrap}.wk-sp .th{flex:1 1 170px}
.wk-lb{display:flex;gap:3px;flex-wrap:wrap}.wk-lb i{width:20px;height:24px;border-bottom:2px solid #333;font-style:normal;text-align:center;font-weight:700;font-size:16px;line-height:24px}.wk-lb i.gap{border:0;width:10px}
.wk-bank{border:1.5px dashed #555;border-radius:8px;padding:6px 10px;margin-bottom:10px;line-height:2}.wk-bank span{display:inline-block;margin-right:16px;font-weight:700}
.wk-cz{padding:6px 0;break-inside:avoid}.wk-cz small{display:block;color:#555}
.wk-tr{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:4px 10px;margin:6px 0 2px;break-inside:avoid}.wk-tr small{grid-column:1/-1;color:#555;margin-top:-2px}
.wk-rule{height:46px;position:relative;background:linear-gradient(#bbb,#bbb) 0 18%/100% 1px no-repeat,repeating-linear-gradient(90deg,#ccc 0 5px,transparent 5px 10px) 0 45%/100% 1px no-repeat,linear-gradient(#777,#777) 0 74%/100% 1px no-repeat,linear-gradient(#ddd,#ddd) 0 96%/100% 1px no-repeat}
.wk-rule span{position:absolute;left:6px;bottom:24%;line-height:1;font-size:30px;color:#c4c4c4;font-family:"Chalkboard SE","Noteworthy","Comic Sans MS","Segoe Print",sans-serif;white-space:nowrap;transform:translateY(22%)}
.wk-key{break-before:page;margin-top:28px;padding-top:10px;border-top:2px dashed #999}.wk-key p{margin:6px 0}
#printArea{display:none}
@media print{html:has(body.wk-printing),body.wk-printing{background:#fff!important;height:auto!important;overflow:visible!important}
body.wk-printing>*:not(#printArea){display:none!important}body.wk-printing>#printArea{display:block!important}#printArea .wk-paper{padding:0}@page{margin:14mm}}`;
function wkStyle() {
  if ($('#wkCss')) return;
  const st = document.createElement('style'); st.id = 'wkCss'; st.textContent = WK_CSS; document.head.appendChild(st);
}
function wkPrint(html) {
  wkStyle();
  let el = $('#printArea');
  if (!el) { el = document.createElement('div'); el.id = 'printArea'; document.body.appendChild(el); }
  el.innerHTML = `<div class="wk-paper">${html}</div>`;
  document.body.classList.add('wk-printing'); // only matters in print; cleared when the page is left (wkUnprint)
  if (typeof window.print !== 'function') { wkUnprint(); toast('เครื่องนี้สั่งพิมพ์จากแอปไม่ได้ ลองกด “บันทึกเป็นไฟล์” แล้วเปิดพิมพ์จากไฟล์นะ'); return; }
  setTimeout(() => { try { window.print(); } catch (e) { wkUnprint(); } }, 60);
}
function wkUnprint() { document.body.classList.remove('wk-printing'); const el = $('#printArea'); if (el) el.innerHTML = ''; }
function wkFile(html, title) {
  const doc = `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>body{margin:0 auto;max-width:820px;background:#fff}${WK_CSS}</style></head><body><div class="wk-paper">${html}</div></body></html>`;
  return saveFile(new File([doc], `worksheet-${today()}.html`, { type: 'text/html' }), title);
}
function renderPrint(src, from, fromArg) {
  if (from && from !== 'print') wkFrom = [from, fromArg];
  if (src === 'custom' && !wkCustom) src = null;
  if (src) wkSetOpt({ src });
  wkStyle();
  const o = wkOpt(), srcs = wkSources();
  if (!srcs.some((s) => s[0] === o.src)) wkSetOpt({ src: 'learning' });
  const opt = wkOpt();
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="wkBack">‹ กลับ</button></div>
    <div class="card-box wk-form">
      <div class="h2" style="margin:0 0 4px">🖨️ ใบงานพิมพ์</div>
      <p class="small muted" style="margin:0 0 12px">ทำแบบฝึกหัดบนกระดาษจากคำของคุณ พิมพ์ได้เลยหรือบันทึกเป็น PDF (ในหน้าพิมพ์ของ iPhone/iPad กดแชร์ → บันทึกไปยังไฟล์)</p>
      <label class="small" for="wkSrc"><b>คำจาก</b></label>
      <select class="sel block-sel" id="wkSrc">${srcs.map(([v, l]) => `<option value="${esc(v)}" ${v === opt.src ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
      <select class="sel block-sel" id="wkTp" aria-label="หมวด" style="margin-top:8px;${opt.src === 'topic' ? '' : 'display:none'}">${topicOptions(opt.tp)}</select>
      <div class="small" style="margin:12px 0 6px"><b>จำนวนคำ</b></div>
      <div class="seg" id="wkN">${WK_N.map((n) => `<button class="${n === opt.n ? 'on' : ''}" data-n="${n}">${n}</button>`).join('')}</div>
      <div class="small" style="margin:12px 0 6px"><b>ในใบงานมี</b></div>
      <div class="chips" id="wkParts">${WK_PARTS.map(([id, ic, name]) => `<button class="chip${opt.parts.includes(id) ? ' on' : ''}" data-p="${id}" aria-pressed="${opt.parts.includes(id)}">${ic} ${name}</button>`).join('')}
        <button class="chip${opt.key ? ' on' : ''}" id="wkKey" aria-pressed="${opt.key}">🔑 เฉลยแยกหน้า</button></div>
      <label class="small" for="wkTitle" style="display:block;margin:12px 0 6px"><b>ชื่อใบงาน</b></label>
      <input class="search" id="wkTitle" maxlength="60" placeholder="ใบงานคำศัพท์" value="${esc(opt.title)}">
    </div>
    <div class="row wk-act"><button class="btn" id="wkShuf">🔀 สุ่มใหม่</button><button class="btn" id="wkSave">💾 บันทึกเป็นไฟล์</button><button class="btn primary grow" id="wkGo">🖨️ พิมพ์ / PDF</button></div>
    <div class="small muted" id="wkInfo" style="margin:10px 4px 6px"></div>
    <div class="wk-prev"><div class="wk-paper" id="wkPaper"></div></div>`;
  let cur = null;
  const paint = () => {
    const o2 = wkOpt(), { label, words } = wkWords(o2);
    $('#wkTp').style.display = o2.src === 'topic' ? '' : 'none';
    cur = words.length ? { html: wkSheet(words, o2, label), title: o2.title || 'ใบงานคำศัพท์' } : null;
    $('#wkInfo').textContent = words.length ? `ตัวอย่างใบงาน · ${words.length} คำ${words.length < o2.n ? ` (มีคำในแหล่งนี้แค่ ${words.length} คำ)` : ''}` : '';
    $('#wkPaper').innerHTML = cur ? cur.html : `<p style="text-align:center;color:#555">ยังไม่มีคำในแหล่งนี้ ลองเลือกแหล่งอื่นนะ</p>`;
    ['wkGo', 'wkSave'].forEach((id) => { $('#' + id).disabled = !cur; });
  };
  $('#wkBack').onclick = () => go(...wkFrom);
  cleanup = wkUnprint;
  $('#wkSrc').onchange = (e) => { wkSetOpt({ src: e.target.value }); paint(); };
  $('#wkTp').onchange = (e) => { wkSetOpt({ tp: e.target.value }); paint(); };
  $('#wkN').onclick = (e) => { const b = e.target.closest('[data-n]'); if (!b) return; wkSetOpt({ n: +b.dataset.n }); $('#wkN').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); paint(); };
  $('#wkParts').onclick = (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    const o2 = wkOpt();
    if (b.id === 'wkKey') wkSetOpt({ key: !o2.key });
    else {
      const on = o2.parts.includes(b.dataset.p);
      if (on && o2.parts.length === 1) { toast('เลือกไว้อย่างน้อย 1 ส่วนนะ'); return; }
      wkSetOpt({ parts: WK_PARTS.map((x) => x[0]).filter((p) => (p === b.dataset.p ? !on : o2.parts.includes(p))) });
    }
    const on2 = b.id === 'wkKey' ? wkOpt().key : wkOpt().parts.includes(b.dataset.p);
    b.classList.toggle('on', on2); b.setAttribute('aria-pressed', String(on2));
    paint();
  };
  $('#wkTitle').oninput = (e) => { wkSetOpt({ title: e.target.value.trim() }); paint(); };
  $('#wkShuf').onclick = () => { wkSeed++; paint(); };
  $('#wkGo').onclick = () => { if (cur) wkPrint(cur.html); };
  $('#wkSave').onclick = () => { if (cur) wkFile(cur.html, cur.title); };
  paint();
}

/* ---------- words from your own text ---------- */
// Paste any English text: every token is looked up in the list (lookupWord: went → go, cities → city), the text is shown with
// the list words marked by status, and the list words never studied are collected to put in a set, play or print.
// The last text stays on this device only (localStorage o3k.mine), never in backups or sync.
const MINE_KEY = 'o3k.mine', MINE_MAX = 20000;
let mineFrom = 'read';
function mineScan(text) {
  const toks = String(text || '').match(/[A-Za-z][A-Za-z’']*/g) || [];
  const hit = new Map(), miss = new Map(), r = { n: toks.length, mastered: 0, learning: 0, fresh: 0, out: 0 };
  for (const t of toks) {
    const w = lookupWord(t);
    if (!w) { const k = t.toLowerCase().replace(/[’']s$/, ''); miss.set(k, (miss.get(k) || 0) + 1); r.out++; continue; }
    hit.set(w, (hit.get(w) || 0) + 1);
    const s = status(w); r[s === 'new' ? 'fresh' : s]++;
  }
  // content words first (the, my, and … are new to nobody reading an article), then the most frequent, then the easiest level
  const fn = (w) => (/^(art|det|conj|prep|pron|inf|modal|num|ord|excl)\b|aux/.test(w.p) || /^(be|have|do|will|can|would|could|should|may|might|must|shall|not|no|yes)$/i.test(w.w) ? 1 : 0);
  const order = (a, b) => fn(a.w) - fn(b.w) || b.c - a.c || LEVELS.indexOf(a.w.g) - LEVELS.indexOf(b.w.g) || (a.w.w < b.w.w ? -1 : 1);
  r.words = [...hit].map(([w, c]) => ({ w, c, s: status(w) })).sort(order);
  r.miss = [...miss].sort((a, b) => b[1] - a[1]).map((x) => x[0]);
  r.inList = r.n - r.out;
  r.pct = r.inList ? Math.round((r.mastered + r.learning) / r.inList * 100) : 0;
  return r;
}
const mineGet = () => { try { return localStorage.getItem(MINE_KEY) || ''; } catch (e) { return ''; } };
const mineSet = (t) => { try { if (t) localStorage.setItem(MINE_KEY, t); else localStorage.removeItem(MINE_KEY); } catch (e) { /* private mode */ } };
function renderMine(from) {
  if (from) mineFrom = from;
  const saved = mineGet();
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="mineBack">‹ กลับ</button></div>
    <div class="card-box">
      <div class="h2" style="margin:0 0 4px">📰 เก็บคำจากบทความ</div>
      <p class="small muted" style="margin:0 0 10px">วางข่าว บทความ อีเมล หรือเนื้อเพลงภาษาอังกฤษ แอปจะไฮไลต์คำที่อยู่ในคลัง บอกว่ารู้จักกี่ % และรวมคำที่ยังไม่เคยเรียนให้เก็บเข้าชุดของฉัน ฝึกเล่นเกม หรือพิมพ์เป็นใบงาน · ข้อความเก็บไว้ในเครื่องนี้เท่านั้น</p>
      <textarea id="mineIn" class="mine-in" lang="en" rows="7" maxlength="${MINE_MAX}" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="วางข้อความภาษาอังกฤษที่นี่" aria-label="ข้อความภาษาอังกฤษ">${esc(saved)}</textarea>
      <div class="row" style="margin-top:10px">${navigator.clipboard && navigator.clipboard.readText ? '<button class="btn" id="minePaste">📋 วาง</button>' : ''}<button class="btn" id="mineClr">🗑 ล้าง</button><button class="btn primary grow" id="mineGo">🔍 ตรวจคำ</button></div>
    </div>
    <div id="mineOut"></div>`;
  const inp = $('#mineIn');
  $('#mineBack').onclick = () => go(mineFrom === 'mine' ? 'read' : mineFrom);
  $('#mineClr').onclick = () => { inp.value = ''; mineSet(''); $('#mineOut').innerHTML = ''; inp.focus(); };
  if ($('#minePaste')) $('#minePaste').onclick = () => navigator.clipboard.readText().then((t) => { if (t) { inp.value = t.slice(0, MINE_MAX); mineRun(); } }, () => toast('วางไม่ได้ ลองกดค้างในช่องแล้วเลือก “วาง” นะ'));
  $('#mineGo').onclick = () => { if (!inp.value.trim()) { toast('วางข้อความภาษาอังกฤษก่อนนะ'); inp.focus(); return; } mineRun(); };
  if (saved.trim()) mineRun(true);
}
function mineRun(quiet) {
  const inp = $('#mineIn'); if (!inp) return;
  const text = inp.value.slice(0, MINE_MAX);
  mineSet(text.trim() ? text : '');
  // irregular verbs make "went / found" count as go / find; the page still works if that file can't load
  const irr = typeof loadIrregular === 'function' && !IRR_FORM ? loadIrregular().catch(() => null) : Promise.resolve();
  irr.then(() => { if (current === 'mine' && $('#mineIn') === inp) mineShow(text, quiet); });
}
function mineShow(text, quiet) {
  const r = mineScan(text), out = $('#mineOut');
  if (!r.n) { out.innerHTML = '<p class="center muted">ไม่พบคำภาษาอังกฤษในข้อความ</p>'; return; }
  const fresh = r.words.filter((x) => x.s === 'new'), learning = r.words.filter((x) => x.s === 'learning');
  const pc = (k) => (r.n ? (r[k] / r.n * 100).toFixed(1) : 0);
  const tip = !r.inList ? '' : r.pct >= 95 ? '😎 อ่านสบาย รู้เกือบทุกคำแล้ว' : r.pct >= 85 ? '👍 อ่านได้ คำที่ไม่รู้เดาจากบริบทได้ ลองเก็บคำใหม่ด้านล่างไว้ด้วย' : '💪 ยังมีคำใหม่เยอะ ลองเรียนคำด้านล่างก่อน แล้วกลับมาอ่านอีกรอบ';
  const MAXROWS = 200;
  out.innerHTML = `<div class="card-box mine-sum">
      <div class="mine-big"><b>${r.pct}%</b><span class="small">ของคำในคลังที่พบ คุณเรียนแล้ว (จำได้แล้ว + กำลังเรียน)</span></div>
      <div class="mine-bar" role="img" aria-label="จำได้แล้ว ${r.mastered} กำลังเรียน ${r.learning} ยังไม่เรียน ${r.fresh} ไม่อยู่ในคลัง ${r.out} จาก ${r.n} คำ">
        <i class="k" style="width:${pc('mastered')}%"></i><i class="l" style="width:${pc('learning')}%"></i><i class="f" style="width:${pc('fresh')}%"></i></div>
      <div class="small mine-leg"><span><i class="k"></i>จำได้แล้ว ${r.mastered}</span><span><i class="l"></i>กำลังเรียน ${r.learning}</span><span><i class="f"></i>ยังไม่เรียน ${r.fresh}</span><span><i></i>ไม่อยู่ในคลัง ${r.out}</span></div>
      <p class="small" style="margin:8px 0 0">${tip} <span class="muted">(${r.n} คำ · คำในคลังไม่ซ้ำ ${r.words.length} คำ)</span></p></div>
    ${fresh.length ? `<div class="h2">🆕 คำที่ยังไม่เคยเรียน (${fresh.length})</div>
      <div class="row" style="margin:0 4px 6px;justify-content:space-between"><span class="small muted">เรียงตามที่เจอบ่อยในข้อความ · แตะ › ดูรายละเอียด</span><button class="btn ghost small" id="mineAll">ไม่เลือกทั้งหมด</button></div>
      <div class="card-box" style="padding:4px 14px" id="mineNew">${fresh.slice(0, MAXROWS).map((x) => `<div class="wrow mine-row"><input type="checkbox" class="mine-ck" data-i="${x.w.idx}" checked aria-label="เลือก ${esc(x.w.w)}">
        <div class="grow"><div><span class="w" lang="en">${esc(x.w.w)}</span> <span class="pos">${esc(x.w.p)}</span></div><div class="t">${esc(x.w.t)}</div></div>
        <span class="small muted">×${x.c}</span>${lvBadge(x.w.g)}<button class="icon-btn" data-sheet="${x.w.idx}" aria-label="ดูรายละเอียด ${esc(x.w.w)}">›</button></div>`).join('')}</div>
      <div class="mine-act"><button class="btn primary" id="mineDeck">📚 ใส่ชุดของฉัน</button><button class="btn" id="minePlay">🎮 ฝึกคำที่เลือก</button><button class="btn" id="minePrint">🖨️ ทำใบงาน</button></div>`
    : '<div class="card-box center small">🎉 ไม่มีคำในคลังที่คุณยังไม่เคยเรียนเลย</div>'}
    ${learning.length ? `<details class="card-box mine-det"><summary>🟡 คำที่กำลังเรียนอยู่ (${learning.length})</summary><div class="chips" style="margin-top:8px">${learning.slice(0, MAXROWS).map((x) => `<button class="chip" data-sheet="${x.w.idx}" lang="en">${esc(x.w.w)}</button>`).join('')}</div></details>` : ''}
    ${r.miss.length ? `<details class="card-box mine-det"><summary>❓ ไม่อยู่ในคลัง (${r.miss.length})</summary><p class="small" lang="en" style="margin:8px 0 4px">${r.miss.slice(0, 120).map(esc).join(', ')}${r.miss.length > 120 ? ' …' : ''}</p><p class="small muted" style="margin:0">อาจเป็นชื่อเฉพาะ คำระดับสูงกว่า C1 หรือรูปคำที่แอปจับไม่ได้</p></details>` : ''}
    <div class="row" style="margin:16px 4px 6px;justify-content:space-between;align-items:center"><div class="h2" style="margin:0">📄 ข้อความ</div><button class="chip" id="mineOnly" aria-pressed="false">ไฮไลต์เฉพาะคำใหม่</button></div>
    <div class="card-box mine-text" id="mineText" lang="en">${text.split(/\n\s*\n|\n/).filter((p) => p.trim()).slice(0, 400).map((p) => `<p>${storyHTML(p.trim())}</p>`).join('')}</div>
    <div class="st-legend mine-key small muted">แตะคำที่ขีดเส้นใต้เพื่อดูความหมาย · <span class="rw new">ยังไม่เรียน</span> <span class="rw learning">กำลังเรียน</span> <span class="rw mastered">จำได้แล้ว</span></div>`;
  const picked = () => [...out.querySelectorAll('.mine-ck:checked')].map((c) => W[+c.dataset.i]).filter(Boolean);
  out.onclick = (e) => {
    const s = e.target.closest('[data-sheet]'), rw = e.target.closest('.rw[data-i]');
    if (s) { openSheet(W[+s.dataset.sheet]); return; }
    if (rw && rw.closest('#mineText')) { const w = W[+rw.dataset.i]; speak(w.w); openSheet(w); }
  };
  const only = $('#mineOnly');
  only.onclick = () => { const on = !$('#mineText').classList.contains('only-new'); $('#mineText').classList.toggle('only-new', on); only.classList.toggle('on', on); only.setAttribute('aria-pressed', String(on)); };
  if (!fresh.length) return;
  $('#mineAll').onclick = () => {
    const cks = [...out.querySelectorAll('.mine-ck')], on = !cks.some((c) => c.checked);
    cks.forEach((c) => { c.checked = on; });
    $('#mineAll').textContent = on ? 'ไม่เลือกทั้งหมด' : 'เลือกทั้งหมด';
  };
  const need = (n) => { const p = picked(); if (p.length < n) { toast(n > 1 ? `เลือกอย่างน้อย ${n} คำนะ` : 'เลือกคำก่อนนะ'); return null; } return p; };
  $('#mineDeck').onclick = () => { const p = need(1); if (p) pickDeck(p.map((w) => w.w)); };
  $('#minePlay').onclick = () => { const p = need(4); if (!p) return; customWords = p; gameSource = 'custom'; startGame('en2th'); };
  $('#minePrint').onclick = () => { const p = need(1); if (!p) return; wkCustom = { name: 'คำจากบทความ', words: p }; go('print', 'custom', 'mine'); };
  if (!quiet) out.scrollIntoView({ block: 'start', behavior: 'smooth' });
}
