// Adds a "Download the App" button to the CoRadix home page.
(function () {
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  if (standalone) return;
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredPrompt = e; });
  window.addEventListener('appinstalled', function () { var b = document.getElementById('downloadAppBtn'); if (b) b.style.display = 'none'; });
  var btn = document.createElement('a');
  btn.id = 'downloadAppBtn'; btn.href = '#'; btn.className = 'btn btn-outline'; btn.textContent = '📲 Download the App';
  btn.addEventListener('click', async function (e) {
    e.preventDefault();
    if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; return; }
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) alert('To install on iPhone:\n1. Tap the Share button in Safari\n2. Tap "Add to Home Screen"\n3. Open CoRadix from your Home Screen and log in.');
    else alert('To install the app:\nOpen your browser menu (three dots) and tap "Install app" or "Add to Home screen". Then open CoRadix and log in.');
  });
  function place() { var spot = document.querySelector('.hero-actions'); if (spot) spot.appendChild(btn); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', place); else place();
})();
