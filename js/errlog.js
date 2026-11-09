// Error log (1.224.0): the last MAX (20) uncaught errors and unhandled promise rejections on this device, so a bug that only
// shows on a real iPhone/iPad can be reported (⚙️ ตั้งค่า → 💾 สำรองข้อมูล → 🐞 บันทึกข้อผิดพลาด, errBox() in js/settings.js).
// Loaded first (before config.js and the word lists) so errors in any later script are caught. Device-local key o3k.errs,
// never in backups or the cloud row. Same message + place = one entry with a count (n) and the latest time.
(function () {
  var KEY = 'o3k.errs', MAX = 20;
  function read() {
    try { var a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function add(msg, where, stack) {
    try {
      msg = String(msg == null ? '' : msg).slice(0, 300);
      if (!msg || msg === 'Script error.') return; // cross-origin script: no detail to report
      var v = typeof APP_VERSION !== 'undefined' ? APP_VERSION : '';
      var view = document.getElementById('view'), r = (view && view.dataset.route) || '';
      var a = read(), hit = null;
      where = String(where || '').slice(0, 120);
      for (var i = 0; i < a.length; i++) if (a[i].m === msg && a[i].s === where && a[i].v === v) hit = a[i];
      if (hit) { hit.n = (hit.n || 1) + 1; hit.t = Date.now(); hit.r = r; } else a.push({ t: Date.now(), v: v, m: msg, s: where, k: String(stack || '').slice(0, 600), r: r, n: 1 });
      a.sort(function (x, y) { return x.t - y.t; });
      localStorage.setItem(KEY, JSON.stringify(a.slice(-MAX)));
    } catch (e) { /* storage blocked or full: nothing to do */ }
  }
  var stackOf = function (err) { return err && err.stack ? String(err.stack).split('\n').slice(0, 5).join('\n') : ''; };
  window.errLog = { add: add, read: read, clear: function () { try { localStorage.removeItem(KEY); } catch (e) { /* blocked */ } } };
  window.addEventListener('error', function (e) {
    if (e.target && e.target !== window) return; // a failed <img>/<script> load, not a script error
    var file = String(e.filename || '').replace(/^.*\//, '').replace(/\?.*$/, '');
    add(e.message, file ? file + ':' + e.lineno + ':' + e.colno : '', stackOf(e.error));
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    add('Promise: ' + (r && r.message ? r.message : r), '', stackOf(r));
  });
})();
