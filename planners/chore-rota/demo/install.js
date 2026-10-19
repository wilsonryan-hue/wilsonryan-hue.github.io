// Shared "Add to Home Screen" helper for TCH planner apps.
(function(){
  let deferred = null;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; render(); });
  function render(){
    const el = document.getElementById('install');
    if (!el) return;
    if (standalone() || localStorage.getItem('tch-install-dismissed') === '1') { el.innerHTML = ''; return; }
    let how;
    if (deferred) how = '<button class="btn" id="doInstall" style="margin-top:8px">Install the app</button>';
    else if (ios) how = 'In Safari, tap <span class="kbd">Share</span> <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-label="share icon" style="vertical-align:-2px"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg> then <span class="kbd">Add to Home Screen</span>.';
    else how = 'In Chrome, tap the <span class="kbd">⋮</span> menu, then <span class="kbd">Add to Home screen</span> or <span class="kbd">Install app</span>.';
    el.innerHTML = '<div class="banner install" role="note"><div style="flex:1"><strong>Keep it on your home screen.</strong><br>' + how + ' It then opens full-screen and works offline.</div><button class="btn ghost" aria-label="Dismiss" id="dismissInstall" style="min-height:32px;padding:0 4px">✕</button></div>';
    const b = document.getElementById('doInstall');
    if (b) b.onclick = async () => { deferred.prompt(); await deferred.userChoice; deferred = null; render(); };
    document.getElementById('dismissInstall').onclick = () => { localStorage.setItem('tch-install-dismissed','1'); render(); };
  }
  window.TCHInstall = { render };
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(()=>{}));
  }
})();
