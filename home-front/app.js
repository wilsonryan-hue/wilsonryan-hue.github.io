// Home Front family site. The link carries the key (?k=...), so whoever has the
// link can open it and nobody else can read it. Runs the board page with a small
// stand-in for the Claude dashboard's `dash` API.
(() => {
  'use strict';

  const KEY_STORE = 'hf-link-key-v2';
  const $ = (s) => document.querySelector(s);

  const b64d = (s) => {
    const std = s.replace(/-/g, '+').replace(/_/g, '/');
    const pad = std + '==='.slice((std.length + 3) % 4);
    return Uint8Array.from(atob(pad), (c) => c.charCodeAt(0));
  };

  const store = {
    get() { try { return localStorage.getItem(KEY_STORE); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(KEY_STORE, v); } catch (e) { /* private mode */ } },
  };

  async function fetchBundle() {
    const r = await fetch('bundle.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('bundle ' + r.status);
    return r.json();
  }

  async function decrypt(keyText, b) {
    const key = await crypto.subtle.importKey('raw', b64d(keyText), { name: 'AES-GCM' }, false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(b.iv) }, key, b64d(b.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }

  // ---- stand-in for the dashboard runtime -------------------------------
  function makeDash(data) {
    const calcs = {};
    const draws = {};
    const onDatas = [];
    const cache = {};
    let params = {};
    const colors = ['#3b6fd8', '#d9822b', '#2a9d8f', '#c44569', '#7b61c9', '#8a8f98', '#c9a000', '#5aa9e6'];

    function rowsOf(id) {
      if (Object.prototype.hasOwnProperty.call(data, id)) return data[id];
      const c = calcs[id];
      if (!c) return undefined;
      if (!(id in cache)) {
        try { cache[id] = c.fn(...c.inputs.map((i) => rowsOf(i) || [])); }
        catch (e) { console.error('calc ' + id, e); cache[id] = []; }
      }
      return cache[id];
    }

    function drawEl(name, el) {
      const fn = draws[name];
      if (!fn) return;
      try { fn(el); } catch (e) { console.error('draw ' + name, e); }
    }

    function runAll() {
      onDatas.forEach((f) => { try { f(); } catch (e) { console.error('onData', e); } });
      document.querySelectorAll('[data-draw]').forEach((el) => drawEl(el.dataset.draw, el));
    }

    const dash = {
      data(id) {
        const v = rowsOf(id);
        if (v === undefined) return { status: 'missing', data: [], rows: [], columns: [], meta: [], refreshing: false };
        const cols = Array.isArray(v) && v[0] && typeof v[0] === 'object' ? Object.keys(v[0]) : [];
        return { status: 'ok', data: v, rows: v, columns: cols, meta: [], refreshing: false };
      },
      calc(id, spec) { calcs[id] = spec; },
      loader() {},
      refresh() {},
      onData(fn) { onDatas.push(fn); },
      draw(name, fn) { draws[name] = typeof fn === 'function' ? fn : (fn && fn.update) || (() => {}); },
      params() { return { ...params }; },
      setParams(p) {
        for (const k of Object.keys(p || {})) { if (p[k] === null || p[k] === undefined) delete params[k]; else params[k] = p[k]; }
        runAll();
      },
      resetParams() { params = {}; runAll(); },
      setLink(n) {
        try {
          const u = new URL(location.href);
          u.hash = n;
          history.replaceState(null, '', u.href);
        } catch (e) { /* ignore */ }
      },
      colors,
    };

    function start() {
      runAll();
      if ('ResizeObserver' in window) {
        const widths = new WeakMap();
        const ro = new ResizeObserver((entries) => {
          for (const en of entries) {
            const w = Math.round(en.contentRect.width);
            const prev = widths.get(en.target);
            widths.set(en.target, w);
            if (prev !== undefined && Math.abs(prev - w) > 1) drawEl(en.target.dataset.draw, en.target);
          }
        });
        document.querySelectorAll('[data-draw]').forEach((el) => ro.observe(el));
      }
      let t;
      window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(runAll, 150); });
    }

    return { dash, start };
  }

  function render(payload) {
    const root = $('#dash-root');
    const tpl = document.createElement('template');
    tpl.innerHTML = payload.page;
    const codes = [];
    tpl.content.querySelectorAll('script').forEach((s) => { codes.push(s.textContent); s.remove(); });
    tpl.content.querySelectorAll('meta').forEach((m) => m.remove());
    root.replaceChildren(tpl.content);

    const { dash, start } = makeDash(payload.data || {});
    window.dash = dash;
    for (const code of codes) {
      try { new Function(code)(); } catch (e) { console.error('page script', e); }
    }
    $('#status').hidden = true;
    root.hidden = false;
    $('#foot').hidden = false;
    start();
    const want = decodeURIComponent(location.hash.slice(1));
    if (want) {
      const btn = document.querySelector('.hf-tab[data-tab="' + CSS.escape(want) + '"]');
      if (btn) btn.click();
    }
  }

  function say(text) { $('#msg').textContent = text; }

  async function open() {
    if (!window.crypto || !crypto.subtle) {
      say('This browser is too old to open Home Front. Please update it, or use Safari or Chrome.');
      return;
    }
    const fromLink = new URLSearchParams(location.search).get('k');
    const keyText = fromLink || store.get();
    if (!keyText) {
      say('Open Home Front from the family link you were sent.');
      return;
    }
    let bundle;
    try {
      bundle = await fetchBundle();
    } catch (e) {
      say('Could not load the board. Check your connection and try again.');
      return;
    }
    try {
      const payload = await decrypt(keyText, bundle);
      if (fromLink) store.set(fromLink);
      render(payload);
    } catch (e) {
      say('This link is not complete. Open Home Front from the full family link you were sent.');
    }
  }

  open();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
})();
