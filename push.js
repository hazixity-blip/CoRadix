// Student-side push notifications: asks permission, saves this device's token,
// and removes it again on logout so the next person on a shared phone isn't mixed up.
(function () {
  const VAPID_KEY = 'BPxMSbVRLak0V7rU9DRmM4Cubs0z7NVDUVm57LIGLb5Nz7MDXCi-rJ1356CC4YLKFxwWY39lyr4tLUutXGzxPTs';

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

  let messaging = null, currentToken = null, currentUid = null, listening = false, banner = null, bannerText = null, bannerBtn = null;

  function ensureBanner() {
    if (banner) return;
    banner = document.createElement('div');
    banner.className = 'push-banner';
    banner.style.display = 'none';
    bannerText = document.createElement('div');
    bannerText.className = 'push-text';
    bannerBtn = document.createElement('button');
    bannerBtn.type = 'button';
    bannerBtn.textContent = 'Turn on';
    bannerBtn.addEventListener('click', enableFromButton);
    banner.append(bannerText, bannerBtn);
    const main = document.querySelector('#appRoot main');
    if (main) main.insertBefore(banner, main.firstChild);
  }
  function show(text, withButton) {
    ensureBanner();
    bannerText.textContent = text;
    bannerBtn.style.display = withButton ? 'inline-block' : 'none';
    banner.style.display = 'flex';
  }
  function hide() { if (banner) banner.style.display = 'none'; }

  async function supported() {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    try { return !!(await Promise.resolve(firebase.messaging.isSupported())); } catch (e) { return false; }
  }

  async function registerToken(uid) {
    const reg = await navigator.serviceWorker.ready;
    messaging = messaging || firebase.messaging();
    const token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    if (!token) return false;
    currentToken = token;
    await db.collection('students').doc(uid).collection('devices').doc(token).set({
      token,
      platform: navigator.userAgent.slice(0, 180),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    if (!listening) {
      listening = true;
      // While the app is open, still show the reminder as a normal notification.
      messaging.onMessage(payload => {
        const d = (payload && payload.data) || {};
        reg.showNotification(d.title || 'CoRadix Academy', {
          body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
          tag: d.tag || undefined, data: { link: d.link || 'dashboard.html' }
        });
      });
    }
    return true;
  }

  async function enableFromButton() {
    bannerBtn.disabled = true;
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        const ok = await registerToken(currentUid);
        if (ok) { hide(); return; }
        show('Sorry, notifications could not be turned on right now. Please try again later.', true);
      } else if (result === 'denied') {
        show('🔕 Notifications are blocked. Turn them on in your browser or phone settings to get fee and task reminders.', false);
      }
    } catch (e) {
      console.warn('Enable notifications failed', e);
      show('Sorry, notifications could not be turned on right now. Please try again later.', true);
    }
    bannerBtn.disabled = false;
  }

  async function init(uid) {
    currentUid = uid;
    if (isIOS && !standalone) {
      show('📲 To get reminders on iPhone, first add this app to your Home Screen (Share → Add to Home Screen), then open it from there.', false);
      return;
    }
    if (!(await supported())) return;
    if (VAPID_KEY.indexOf('PASTE_') === 0) { console.warn('push.js: VAPID_KEY not set yet.'); return; }
    if (Notification.permission === 'granted') {
      try { await registerToken(uid); } catch (e) { console.warn('Token refresh failed', e); }
      hide();
    } else if (Notification.permission === 'denied') {
      show('🔕 Notifications are blocked. Turn them on in your browser or phone settings to get fee and task reminders.', false);
    } else {
      show('🔔 Get reminders for fees, tasks, new feedback and assessments.', true);
    }
  }

  // Called by the Log Out button before signing out.
  async function unregister() {
    try {
      if (currentToken && currentUid) {
        await db.collection('students').doc(currentUid).collection('devices').doc(currentToken).delete();
      }
      if (messaging) await messaging.deleteToken();
    } catch (e) { /* never block logout */ }
  }
  window.coradixPush = { unregister };

  auth.onAuthStateChanged(user => { if (user) init(user.uid); });
})();
