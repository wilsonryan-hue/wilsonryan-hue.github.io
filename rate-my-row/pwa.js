// Rate My Row as an installable phone app: offline cache, one-tap install on Android, guided Add to Home Screen on iPhone.
(function () {
  const KEY = 'rmr-install-seen';
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const inApp = /FBAN|FBAV|Instagram|Snapchat|TikTok|Line\/|GSA\//.test(ua);
  const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let deferred = null;
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
  const say = t => (typeof window.toast === 'function' ? window.toast(t) : null);

  if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; });
  addEventListener('appinstalled', () => { deferred = null; close(); say('Installed. Find Rate My Row on your home screen.'); });

  let sheet;
  function close() { if (sheet) { sheet.remove(); sheet = null; } }
  function open(html) {
    close();
    sheet = document.createElement('div');
    sheet.id = 'install-sheet';
    sheet.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Install Rate My Row">
      <div class="is-head"><img src="icon-192.png" alt="" width="56" height="56"><div><h3>Rate My Row</h3><p class="small muted">Free · works offline · no sign-up</p></div></div>
      ${html}<button class="btn ghost is-later" data-is-close>Not now, just play</button></div>`;
    sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('[data-is-close]')) close(); });
    document.body.appendChild(sheet);
    const go = sheet.querySelector('[data-is-go]');
    if (go) go.focus();
  }
  const iosSteps = () => `<ol class="is-steps">
      ${inApp ? '<li>Open this page in <b>Safari</b> first (tap ··· or the compass, then <b>Open in Safari</b>).</li>' : ''}
      <li>Tap the <b>Share</b> button <span class="is-ic">⬆︎</span> at the bottom of Safari (on newer iPhones it's inside the <b>···</b> menu).</li>
      <li>Scroll down and tap <b>Add to Home Screen</b> <span class="is-ic">＋</span></li>
      <li>Tap <b>Add</b>. Rate My Row is now on your home screen.</li></ol>
      <p class="is-arrow" aria-hidden="true">↓</p>`;
  const menuSteps = () => `<ol class="is-steps"><li>Tap the browser menu <span class="is-ic">⋮</span> at the top right.</li>
      <li>Tap <b>Install app</b> or <b>Add to Home screen</b>.</li><li>Tap <b>Install</b>.</li></ol>`;

  async function install() {
    if (installed()) return say("It's already installed.");
    if (!deferred && !ios) {   // Chrome hands over the install offer a moment after load
      for (let i = 0; i < 20 && !deferred; i++) await new Promise(r => setTimeout(r, 150));
    }
    if (deferred) {
      const e = deferred; deferred = null; close();
      e.prompt();
      const choice = await e.userChoice.catch(() => ({}));
      if (choice.outcome === 'dismissed') say('No problem. You can install it any time from the home page.');
      return;
    }
    open(ios ? iosSteps() : menuSteps());
  }
  function offer() {
    store(KEY, '1');
    open(ios ? `<p class="is-lead">Add it to your home screen in three taps.</p>${iosSteps()}`
      : `<p class="is-lead">Put it on your home screen. One tap, no app store.</p><button class="btn primary is-go" data-is-go>Install Rate My Row</button>`);
    const go = sheet && sheet.querySelector('[data-is-go]');
    if (go) go.addEventListener('click', install);
  }

  window.RMR_PWA = {install, installed};
  // First visit from a shared link: offer the install straight away.
  addEventListener('load', () => {
    if (installed()) return;
    if (/[?&#]install\b/.test(location.href) || !store(KEY)) setTimeout(offer, 600);
  });
})();
