// Light/dark switch: remembers the choice, otherwise follows the phone's setting.
(function () {
  var KEY = 'coradixTheme';
  function pref() {
    var s = null; try { s = localStorage.getItem(KEY); } catch (e) {}
    if (s) return s;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function apply(t) {
    document.documentElement.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', t === 'dark' ? '#0f1328' : '#3366ff');
    var b = document.getElementById('themeBtn'); if (b) b.textContent = t === 'dark' ? '☀️' : '🌙';
  }
  apply(pref());
  document.addEventListener('DOMContentLoaded', function () {
    var logout = document.getElementById('logoutBtn'); if (!logout) return;
    var b = document.createElement('button'); b.id = 'themeBtn'; b.type = 'button'; b.className = 'theme-btn'; b.title = 'Switch light / dark';
    var w = document.createElement('div'); w.style.cssText = 'display:flex;gap:.5rem;align-items:center;';
    logout.parentNode.insertBefore(w, logout); w.append(b, logout);
    b.onclick = function () {
      var t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, t); } catch (e) {}
      apply(t);
    };
    apply(document.documentElement.getAttribute('data-theme'));
  });
})();
