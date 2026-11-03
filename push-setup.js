// Adds app install + push notification support to the student dashboard.
// dashboard.html only needs: <script src="push-setup.js"></script>
(function () {
  var head = document.head;

  // 1. App tags
  function add(tag, attrs) {
    var el = document.createElement(tag);
    Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    head.appendChild(el);
  }
  add('link', { rel: 'manifest', href: 'manifest.json' });
  add('meta', { name: 'theme-color', content: '#0057ff' });
  add('link', { rel: 'apple-touch-icon', href: 'icons/icon-192.png' });
  add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
  add('meta', { name: 'mobile-web-app-capable', content: 'yes' });
  add('meta', { name: 'apple-mobile-web-app-title', content: 'CoRadix' });

  // 2. Notification banner style
  var css = document.createElement('style');
  css.textContent =
    '.push-banner{display:flex;align-items:center;justify-content:space-between;gap:1rem;background:#e8efff;color:#0057ff;border:1px solid #c7d7ff;border-radius:10px;padding:.8rem 1.1rem;margin-bottom:1.2rem;font-size:.85rem;font-weight:600}' +
    '.push-banner button{background:#0057ff;color:#fff;border:none;border-radius:7px;padding:.5rem 1rem;font-size:.8rem;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap}' +
    '.push-banner button:disabled{opacity:.6}';
  head.appendChild(css);

  // 3. Load scripts in order: Firebase messaging, then push.js, then pwa.js
  function load(src, next) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = next;
    s.onerror = next; // never block the dashboard if one fails
    document.body.appendChild(s);
  }
  load('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js', function () {
    load('push.js', function () {
      load('pwa.js', function () {});
    });
  });

  // 4. On log out, remove this phone's notification token first
  var logout = document.getElementById('logoutBtn');
  if (logout) {
    logout.addEventListener('click', async function (e) {
      e.stopImmediatePropagation();
      try { if (window.coradixPush) await window.coradixPush.unregister(); } catch (err) {}
      auth.signOut().then(function () { window.location.href = 'login.html'; });
    }, true);
  }
})();
