/* One List Meal Planner: plan the week's teas, get one combined shopping list. Data stays on this device. */
(function(){
'use strict';
const CFG = window.TCH_CONFIG || {mode:'full'};
const DEMO = CFG.mode === 'demo';
const KEY = 'tch-one-list-v1';
const BUILTIN = window.TCH_RECIPES || [];
const ALLERGENS = ['Celery','Gluten','Crustaceans','Eggs','Fish','Lupin','Milk','Molluscs','Mustard','Peanuts','Sesame','Soya','Sulphites','Tree nuts'];
const AISLES = ['Fruit & veg','Meat & fish','Dairy, eggs & chilled','Bakery','Pasta, rice & grains','Tins, jars & packets','Frozen','Herbs, spices & sauces','Oils & baking','Other'];
const CUPBOARD = new Set(['Herbs, spices & sauces','Oils & baking']);
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const SWATCH = ['#0F766E','#B45309','#7C3AED','#BE123C','#1D4ED8','#4D7C0F','#C2410C','#0E7490'];

const $ = s => document.querySelector(s);
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
function toast(m){ const t = document.createElement('div'); t.className='toast'; t.textContent=m; document.body.appendChild(t); setTimeout(()=>t.remove(), 2200); }
function sheet(html, onMount){
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  bg.addEventListener('click', e => { if (e.target === bg) bg.remove(); });
  document.body.appendChild(bg);
  onMount && onMount(bg.querySelector('.sheet'), () => bg.remove());
}

// ---------- state ----------
function fresh(){ return {v:1, household:4, avoid:[], diet:'any', plan:{}, custom:[], got:{}, have:{}, extras:{}, shops:['','','',''], prices:{}}; }
let S; try { S = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch(e){ S = fresh(); }
function save(){ if (DEMO) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){ toast('Could not save on this device'); } }

// ---------- dates ----------
const pad = n => String(n).padStart(2,'0');
const dkey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
function monday(d){ const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - (x.getDay()+6)%7); return x; }
const addDays = (d,n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
let weekStart = monday(new Date());
const weekDates = () => [...Array(7)].map((_,i) => addDays(weekStart, i));
const wk = () => dkey(weekStart);

// ---------- recipes ----------
const all = () => BUILTIN.concat(S.custom);
const byId = id => all().find(r => r.id === id);
function allowed(r){
  if (S.avoid.some(a => r.allergens.includes(a))) return false;
  if (S.diet === 'vegetarian' && !r.tags.some(t => t === 'vegetarian' || t === 'vegan' || t === 'vegetarian-option')) return false;
  if (S.diet === 'vegan' && !r.tags.includes('vegan')) return false;
  return true;
}
const colorFor = r => SWATCH[[...r.id].reduce((a,c) => a + c.charCodeAt(0), 0) % SWATCH.length];
const initials = r => r.name.replace(/\(.*?\)/g,'').split(/\s+/).filter(w => /^[A-Za-z]/.test(w) && !['and','with','in','the','of'].includes(w.toLowerCase())).slice(0,2).map(w => w[0].toUpperCase()).join('');

// ---------- units: scale and combine ----------
// Normalise to a base unit so the same ingredient from different recipes adds up.
function norm(q, u){
  switch (u){
    case 'kg': return [q*1000,'g']; case 'l': return [q*1000,'ml'];
    case 'tbsp': return [q*3,'tsp']; default: return [q,u];
  }
}
const nice = n => { const r = Math.round(n*100)/100; return Number.isInteger(r) ? String(r) : (Math.abs(r - Math.round(r*2)/2) < 0.01 ? fraction(r) : r.toFixed(1)); };
function fraction(r){ const w = Math.floor(r), f = r - w; return f ? (w ? w : '') + '½' : String(w); }
const PLURAL = {clove:'cloves', tin:'tins', cube:'cubes', stick:'sticks', loaf:'loaves', pack:'packs'};
function show(q, u, shopping){
  if (u === 'g'){ q = shopping ? Math.ceil(q/ (q >= 100 ? 10 : 5)) * (q >= 100 ? 10 : 5) : Math.round(q); return q >= 1000 ? (q/1000).toFixed(q%1000?2:0).replace(/0$/,'').replace(/\.$/,'')+'kg' : q+'g'; }
  if (u === 'ml'){ q = shopping ? Math.ceil(q/10)*10 : Math.round(q); return q >= 1000 ? (q/1000).toFixed(2).replace(/0+$/,'').replace(/\.$/,'')+' litres' : q+'ml'; }
  if (u === 'tsp'){ if (q >= 3 && Math.abs(q/3 - Math.round(q/3)) < 0.01) return nice(q/3)+' tbsp'; if (q > 3) return nice(q/3)+' tbsp'; return nice(q)+' tsp'; }
  if (shopping) q = Math.ceil(q - 0.05);
  const n = nice(q);
  if (u === 'clove' && shopping && q >= 6) return `${n} cloves (${Math.ceil(q/10)} bulb${q > 10 ? 's' : ''})`;
  return u ? `${n} ${q > 1 ? (PLURAL[u]||u) : u}` : n;
}
function scaled(r, serves){ const f = serves / (r.serves || 4); return r.ings.map(i => ({...i, q:i.q*f})); }
function shoppingList(){
  const map = new Map();
  weekDates().forEach((d, di) => {
    const p = S.plan[dkey(d)]; if (!p || !p.r) return; const r = byId(p.r); if (!r) return;
    for (const i of scaled(r, p.serves || S.household)){
      const [q, u] = norm(i.q, i.u);
      const key = (i.n + '|' + u).toLowerCase();
      const e = map.get(key) || {key, n:i.n, u, q:0, a:i.a || 'Other', days:new Set()};
      e.q += q; e.days.add(DAYS[di]); map.set(key, e);
    }
  });
  for (const x of (S.extras[wk()] || [])) map.set('x|'+x.id, {key:'x|'+x.id, n:x.n, u:'', q:0, a:'Other', days:new Set(), extra:x.id, label:x.q});
  return [...map.values()];
}

// ---------- screens ----------
let TAB = 'plan';
function render(){
  document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.tab === TAB ? 'page' : 'false'));
  ({plan, list, recipes, more})[TAB]();
  window.TCHInstall && TCHInstall.render();
}
const demoBanner = () => DEMO ? `<div class="banner demo"><div><strong>Demo.</strong> Try it, nothing is saved. The full version keeps your plans on your phone. <a href="${h(CFG.buyUrl||'../')}">Get One List</a></div></div>` : '';

function plan(){
  const dates = weekDates(), today = dkey(new Date());
  const planned = dates.filter(d => S.plan[dkey(d)]?.r).length;
  let html = `${demoBanner()}<div id="install"></div><div class="top"><div><h1>This week's teas</h1><div class="sub">${dates[0].toLocaleDateString('en-GB',{day:'numeric',month:'short'})} – ${dates[6].toLocaleDateString('en-GB',{day:'numeric',month:'short'})} · ${planned}/7 planned</div></div>
    <div class="row"><button class="btn secondary" data-w="-1" aria-label="Previous week">‹</button><button class="btn secondary" data-w="1" aria-label="Next week">›</button></div></div>`;
  html += `<div class="row" style="margin-bottom:12px"><button class="btn block" id="fill">${planned ? 'Fill the gaps for me' : 'Plan my week for me'}</button></div>`;
  dates.forEach((d, i) => {
    const k = dkey(d), p = S.plan[k] || {}, r = p.r ? byId(p.r) : null, serves = p.serves || S.household;
    html += `<section class="card day ${k===today?'today':''}"><div class="dname"><b>${DAYS[i]}</b><span>${d.getDate()}</span></div><div class="meal">`;
    if (r){
      html += `<button class="meal-title" data-open="${r.id}" data-serves="${serves}">${h(r.name)}</button><div class="meta">${r.mins} min${r.allergens.length ? ' · contains '+r.allergens.join(', ').toLowerCase() : ''}</div>
        <div class="spread" style="margin-top:8px"><div class="stepper"><button data-s="${k}" data-d="-1" aria-label="Fewer people">−</button><span>${serves} ${serves===1?'person':'people'}</span><button data-s="${k}" data-d="1" aria-label="More people">+</button></div>
        <div><button class="btn ghost" data-pick="${k}">Swap</button><button class="btn ghost" data-clear="${k}" aria-label="Clear">✕</button></div></div>`;
    } else if (p.note){
      html += `<div class="meal-title">${h(p.note)}</div><div class="meta">No shopping needed</div><div style="margin-top:6px"><button class="btn ghost" data-pick="${k}">Choose a meal</button><button class="btn ghost" data-clear="${k}">Clear</button></div>`;
    } else {
      html += `<div class="meta" style="margin:4px 0 6px">Nothing planned</div><button class="btn secondary" data-pick="${k}">Choose a meal</button>`;
    }
    html += `</div></section>`;
  });
  html += `<p class="hint" style="text-align:center">Plans and lists stay on this phone. No account needed.</p>`;
  $('#app').innerHTML = html;
  document.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { weekStart = addDays(weekStart, 7*+b.dataset.w); render(); });
  $('#fill').onclick = fillWeek;
  document.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => pickFor(b.dataset.pick));
  document.querySelectorAll('[data-clear]').forEach(b => b.onclick = () => { delete S.plan[b.dataset.clear]; save(); render(); });
  document.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openRecipe(b.dataset.open, +b.dataset.serves));
  document.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const p = S.plan[b.dataset.s]; p.serves = Math.max(1, Math.min(12, (p.serves || S.household) + +b.dataset.d)); save(); render(); });
}
function fillWeek(){
  const pool = all().filter(allowed);
  if (!pool.length) return toast('No recipes match your settings');
  const recent = new Set();
  for (let i = -14; i < 0; i++){ const p = S.plan[dkey(addDays(weekStart, i))]; if (p && p.r) recent.add(p.r); }
  const used = new Set(weekDates().map(d => S.plan[dkey(d)]?.r).filter(Boolean));
  weekDates().forEach((d, i) => {
    const k = dkey(d); if (S.plan[k] && (S.plan[k].r || S.plan[k].note)) return;
    const weekend = i >= 5;
    let cands = pool.filter(r => !used.has(r.id) && !recent.has(r.id) && (weekend || r.mins <= 45));
    if (!cands.length) cands = pool.filter(r => !used.has(r.id));
    if (!cands.length) cands = pool;
    // keep variety: avoid two pasta or two fish nights in a row
    const prev = byId(S.plan[dkey(addDays(d,-1))]?.r || '');
    const varied = cands.filter(r => !prev || !(r.tags.some(t => ['fish'].includes(t) && prev.tags.includes(t))));
    const pickFrom = varied.length ? varied : cands;
    const r = pickFrom[Math.floor(Math.random() * pickFrom.length)];
    S.plan[k] = {r:r.id, serves:S.household}; used.add(r.id);
  });
  save(); render(); toast('Week planned. Tap Swap to change any day.');
}
function pickFor(k){
  let q = '', filt = 'all';
  const draw = (root) => {
    const pool = all().filter(allowed).filter(r => !q || r.name.toLowerCase().includes(q))
      .filter(r => filt === 'all' || (filt === 'quick' ? r.mins <= 30 : r.tags.includes(filt)));
    root.querySelector('#res').innerHTML = pool.map(r => `<button class="rcard" data-r="${r.id}"><span class="rimg" style="background:${colorFor(r)}">${initials(r)}</span><span style="flex:1"><b>${h(r.name)}</b><br><span class="meta">${r.mins} min${r.tags.includes('vegetarian')||r.tags.includes('vegan')?' · vegetarian':''}</span></span></button>`).join('') || '<p class="empty">No matches.</p>';
    root.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { S.plan[k] = {r:b.dataset.r, serves:S.plan[k]?.serves || S.household}; save(); root.closest('.sheet-bg').remove(); render(); });
  };
  const [yy,mm,dd] = k.split('-').map(Number), d = new Date(yy, mm-1, dd);
  sheet(`<h2>${d.toLocaleDateString('en-GB',{weekday:'long'})}</h2><div class="search"><input class="input" id="q" placeholder="Search recipes" autocomplete="off">
    <div class="chips">${[['all','All'],['quick','30 min or less'],['vegetarian','Veggie'],['family','Family'],['freezer','Freezes well']].map(([v,l]) => `<button data-f="${v}" aria-pressed="${v==='all'}">${l}</button>`).join('')}</div>
    <div class="chips">${['Leftovers','Eating out','Takeaway night'].map(n => `<button data-note="${n}">${n}</button>`).join('')}</div></div><div id="res"></div>`, (root) => {
    root.querySelector('#q').oninput = e => { q = e.target.value.trim().toLowerCase(); draw(root); };
    root.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filt = b.dataset.f; root.querySelectorAll('[data-f]').forEach(x => x.setAttribute('aria-pressed', x===b)); draw(root); });
    root.querySelectorAll('[data-note]').forEach(b => b.onclick = () => { S.plan[k] = {note:b.dataset.note}; save(); root.closest('.sheet-bg').remove(); render(); });
    draw(root);
  });
}
function openRecipe(id, serves){
  const r = byId(id); serves = serves || S.household;
  const ing = scaled(r, serves);
  sheet(`<h2>${h(r.name)}</h2><div class="meta">${r.mins} min · for ${serves} ${serves===1?'person':'people'}</div>
    <div style="margin:8px 0">${r.allergens.map(a => `<span class="al">${a}</span>`).join('')}${r.tags.map(t => `<span class="tag">${h(t.replace('-option',' option'))}</span>`).join('')}</div>
    ${r.check ? `<p class="small" style="background:#FFFBEB;border-radius:10px;padding:8px 10px;margin:6px 0">Check the labels on: ${h(r.check)}. Recipes vary by brand.</p>` : ''}
    <h3 style="margin-top:14px">Ingredients</h3>${ing.map(i => `<div class="ing"><span>${h(i.n)}</span><b>${show(...norm(i.q, i.u), false)}</b></div>`).join('')}
    <h3 style="margin-top:16px">Method</h3><ol class="method">${r.steps.map(s => `<li>${h(s)}</li>`).join('')}</ol>
    ${r.tip ? `<p class="small muted">${h(r.tip)}</p>` : ''}
    ${r.custom ? `<button class="btn danger block" id="delr">Delete this recipe</button>` : ''}`, (root, close) => {
    const d = root.querySelector('#delr'); if (d) d.onclick = () => { S.custom = S.custom.filter(x => x.id !== id); save(); close(); render(); };
  });
}

function list(){
  const items = shoppingList(), W = wk();
  const got = S.got[W] || {}, have = S.have[W] || {};
  const named = S.shops.map((n,i) => [n.trim(), i]).filter(([n]) => n);
  let html = `${demoBanner()}<div class="top"><div><h1>Shopping list</h1><div class="sub">${items.length ? `${items.length} items for this week's plan` : 'Plan some meals to build your list'}</div></div><button class="btn secondary" id="share">Share</button></div>`;
  if (!items.length){ $('#app').innerHTML = html + `<div class="card empty">Your list builds itself from the meals you plan, with the same ingredients added together.</div>`; bindShare(items); return; }
  const fresh = items.filter(i => !CUPBOARD.has(i.a)), cup = items.filter(i => CUPBOARD.has(i.a));
  if (named.length) html += priceSummary(items.filter(i => !have[i.key]), named);
  for (const a of AISLES){
    const xs = fresh.filter(i => i.a === a); if (!xs.length) continue;
    html += `<section class="card"><div class="aisle">${h(a)}</div>${xs.map(i => itemRow(i, got, named)).join('')}</section>`;
  }
  html += `<section class="card"><div class="aisle">Check the cupboard first</div><p class="tiny muted" style="margin:0 0 4px">Tap anything you've already got to take it off the list.</p>${cup.map(i => `<div class="item ${have[i.key]?'got':''}"><button class="tick" role="checkbox" aria-checked="${!!have[i.key]}" data-have="${h(i.key)}" aria-label="I have ${h(i.n)}"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button><div class="nm">${h(i.n)}<small>${have[i.key]?'Got it':'Need?'}</small></div><span class="qty">${show(i.q, i.u, true)}</span></div>`).join('')}</section>`;
  html += `<section class="card"><div class="aisle">Anything else</div><div class="row"><input class="input" id="extra" placeholder="e.g. milk, loo roll" autocomplete="off"><button class="btn" id="addx">Add</button></div></section>`;
  html += `<p class="hint" style="text-align:center">${named.length ? 'Tap £ on any item to add prices.' : 'Want to see which shop is cheapest for your list? Add your shops in Settings.'}</p>`;
  $('#app').innerHTML = html;
  document.querySelectorAll('[data-got]').forEach(b => b.onclick = () => { const g = S.got[W] = S.got[W] || {}; g[b.dataset.got] ? delete g[b.dataset.got] : g[b.dataset.got] = 1; save(); render(); });
  document.querySelectorAll('[data-have]').forEach(b => b.onclick = () => { const g = S.have[W] = S.have[W] || {}; g[b.dataset.have] ? delete g[b.dataset.have] : g[b.dataset.have] = 1; save(); render(); });
  document.querySelectorAll('[data-price]').forEach(b => b.onclick = () => priceSheet(items.find(i => i.key === b.dataset.price), named));
  document.querySelectorAll('[data-delx]').forEach(b => b.onclick = () => { S.extras[W] = (S.extras[W]||[]).filter(x => x.id !== b.dataset.delx); save(); render(); });
  $('#addx').onclick = () => { const v = $('#extra').value.trim(); if (!v) return; (S.extras[W] = S.extras[W] || []).push({id:uid(), n:v}); save(); render(); };
  $('#extra').onkeydown = e => { if (e.key === 'Enter') $('#addx').click(); };
  bindShare(items);
}
function itemRow(i, got, named){
  const on = !!got[i.key];
  return `<div class="item ${on?'got':''}"><button class="tick" role="checkbox" aria-checked="${on}" data-got="${h(i.key)}" aria-label="Got ${h(i.n)}"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>
    <div class="nm">${h(i.n)}<small>${i.extra ? 'Added by you' : 'For ' + [...i.days].join(', ')}</small></div>${i.extra ? `<button class="btn ghost" data-delx="${i.extra}" aria-label="Remove">✕</button>` : `<span class="qty">${show(i.q, i.u, true)}</span>`}
    ${named.length && !i.extra ? `<button class="btn ghost" data-price="${h(i.key)}" aria-label="Prices for ${h(i.n)}" style="padding:6px">£</button>` : ''}</div>`;
}
// Price book: the buyer types the prices they see. We never fetch prices from shops.
function packsNeeded(i, pr){ if (!pr.pack) return (i.u === '' ? Math.max(1, Math.ceil(i.q - 0.05)) : 1); return Math.max(1, Math.ceil((i.u==='g'||i.u==='ml'||i.u==='tsp' ? i.q : Math.ceil(i.q - 0.05)) / pr.pack - 1e-9)); }
function priceSummary(items, named){
  const tot = named.map(([n, si]) => ({n, si, t:0, c:0}));
  let split = 0, splitCount = 0, all = 0;
  for (const i of items){
    const P = S.prices[i.n.toLowerCase()]; if (!P) continue;
    const costs = named.map(([n, si]) => P[si] && P[si].p > 0 ? P[si].p * packsNeeded(i, P[si]) : null);
    if (costs.every(c => c !== null)){ all++; costs.forEach((c, k) => { tot[k].t += c; tot[k].c++; }); split += Math.min(...costs); splitCount++; }
  }
  if (!all) return `<section class="card"><h2>Which shop is cheapest?</h2><p class="small muted" style="margin:0">Tap £ next to an item and type the prices you see in each shop. Prices you enter are remembered for next time.</p></section>`;
  const best = tot.slice().sort((a,b) => a.t - b.t)[0];
  return `<section class="card"><h2>Which shop is cheapest?</h2><p class="tiny muted" style="margin-top:0">Based on the ${all} item${all>1?'s':''} you've priced in every shop.</p><div class="price-sum">${tot.map(x => `<span>${h(x.n)}</span><span class="${x===best?'best':''}">£${x.t.toFixed(2)}${x===best?' cheapest':''}</span>`).join('')}
    ${named.length > 1 && best.t - split >= 0.01 ? `<span>Split across shops</span><span>£${split.toFixed(2)} (saves £${(best.t - split).toFixed(2)})</span>` : ''}</div></section>`;
}
function priceSheet(i, named){
  const key = i.n.toLowerCase(), P = S.prices[key] = S.prices[key] || {};
  const unitHint = i.u === 'g' ? 'g' : i.u === 'ml' ? 'ml' : i.u === 'tsp' ? 'tsp' : (i.u ? (PLURAL[i.u]||i.u) : 'items');
  sheet(`<h2>${h(i.n)}</h2><p class="small muted">You need ${show(i.q, i.u, true)}. Type the shelf price and the pack size (optional) in each shop.</p>
    <div class="pin tiny muted"><span>Shop</span><span>Price £</span><span>Pack (${unitHint})</span></div>
    ${named.map(([n, si]) => `<div class="pin"><b>${h(n)}</b><input class="input" inputmode="decimal" data-p="${si}" value="${P[si]?.p ?? ''}" placeholder="0.00"><input class="input" inputmode="decimal" data-k="${si}" value="${P[si]?.pack ?? ''}" placeholder="e.g. 500"></div>`).join('')}
    <button class="btn block" id="ok">Save prices</button>`, (root, close) => {
    root.querySelector('#ok').onclick = () => {
      named.forEach(([n, si]) => { const p = parseFloat(root.querySelector(`[data-p="${si}"]`).value), k = parseFloat(root.querySelector(`[data-k="${si}"]`).value);
        if (p > 0) P[si] = {p, pack: k > 0 ? (i.u === 'tsp' ? k : k) : 0}; else delete P[si]; });
      save(); close(); render();
    };
  });
}
function bindShare(items){
  $('#share').onclick = () => {
    const W = wk(), have = S.have[W] || {};
    let t = `Shopping list (w/c ${weekStart.toLocaleDateString('en-GB',{day:'numeric',month:'short'})})\n`;
    for (const a of AISLES){ const xs = items.filter(i => i.a === a && !have[i.key]); if (!xs.length) continue;
      t += `\n${a.toUpperCase()}\n` + xs.map(i => `- ${i.n}${i.extra ? '' : ' ' + show(i.q, i.u, true)}`).join('\n') + '\n'; }
    if (navigator.share) navigator.share({title:'Shopping list', text:t}).catch(()=>{});
    else navigator.clipboard.writeText(t).then(() => toast('List copied'));
  };
}

function recipes(){
  let html = `${demoBanner()}<div class="top"><div><h1>Recipes</h1><div class="sub">${all().filter(allowed).length} match your settings</div></div><button class="btn secondary" id="add">+ Your own</button></div>`;
  html += `<section class="card">${all().map(r => `<button class="rcard" data-open="${r.id}" style="${allowed(r)?'':'opacity:.45'}"><span class="rimg" style="background:${colorFor(r)}">${initials(r)}</span><span style="flex:1"><b>${h(r.name)}</b><br><span class="meta">${r.mins} min</span><br>${r.allergens.map(a => `<span class="al">${a}</span>`).join('')}</span></button>`).join('')}</section>`;
  html += `<p class="hint">Recipes serve 4 and scale to the number of people you set. Allergens follow the UK's 14 main allergens. Always check packet labels: ingredients vary by brand.</p>`;
  $('#app').innerHTML = html;
  document.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openRecipe(b.dataset.open));
  $('#add').onclick = addRecipe;
}
// "500 g beef mince", "2 tins chopped tomatoes", "1 onion", "1 tbsp olive oil"
function parseLine(line){
  const m = line.trim().match(/^(\d+(?:[.,]\d+)?|½|¼|¾)?\s*(kg|g|ml|l|litres?|tsp|tbsp|tins?|cans?|cloves?|cubes?|packs?|sticks?)?\.?\s*(?:of\s+)?(.+)$/i);
  if (!m) return null;
  let q = m[1] ? ({'½':0.5,'¼':0.25,'¾':0.75}[m[1]] ?? parseFloat(m[1].replace(',','.'))) : 1;
  let u = (m[2]||'').toLowerCase().replace(/^litres?$/,'l').replace(/^cans?$/,'tin').replace(/s$/,'');
  if (u === 'tb' ) u = 'tbsp';
  const n = m[3].trim(); return {n:n[0].toUpperCase()+n.slice(1), q, u, a:'Other'};
}
function addRecipe(){
  sheet(`<h2>Add your own recipe</h2>
    <label class="field"><span>Name</span><input class="input" id="rn" placeholder="e.g. Nan's corned beef hash"></label>
    <div class="row"><label class="field" style="flex:1"><span>Serves</span><input class="input" id="rs" type="number" min="1" max="12" value="4"></label><label class="field" style="flex:1"><span>Minutes</span><input class="input" id="rm" type="number" min="5" value="30"></label></div>
    <label class="field"><span>Ingredients, one per line</span><textarea class="input" id="ri" rows="6" placeholder="500 g beef mince&#10;2 tins chopped tomatoes&#10;1 onion"></textarea></label>
    <label class="field"><span>Method (optional)</span><textarea class="input" id="rmeth" rows="4"></textarea></label>
    <div class="field"><span>Contains</span><div class="chips">${ALLERGENS.map(a => `<button data-al="${a}" aria-pressed="false">${a}</button>`).join('')}</div></div>
    <button class="btn block" id="ok">Save recipe</button>`, (root, close) => {
    const al = new Set();
    root.querySelectorAll('[data-al]').forEach(b => b.onclick = () => { al.has(b.dataset.al) ? al.delete(b.dataset.al) : al.add(b.dataset.al); b.setAttribute('aria-pressed', al.has(b.dataset.al)); });
    root.querySelector('#ok').onclick = () => {
      const name = root.querySelector('#rn').value.trim(); if (!name) return toast('Give it a name');
      const ings = root.querySelector('#ri').value.split('\n').map(parseLine).filter(Boolean);
      if (!ings.length) return toast('Add at least one ingredient');
      S.custom.push({id:'c-'+uid(), custom:true, name, serves:Math.max(1, +root.querySelector('#rs').value || 4), mins:+root.querySelector('#rm').value || 30, tags:['yours'], ings,
        steps: root.querySelector('#rmeth').value.split('\n').map(s => s.trim()).filter(Boolean), allergens:[...al], check:'', tip:''});
      save(); close(); render(); toast('Recipe saved');
    };
  });
}

function more(){
  let html = `${demoBanner()}<div class="top"><div><h1>Settings</h1></div></div>`;
  html += `<section class="card"><h2>Your household</h2><div class="spread"><span>People to cook for</span><div class="stepper"><button id="hm" aria-label="Fewer">−</button><span>${S.household}</span><button id="hp" aria-label="More">+</button></div></div>
    <div class="field"><span>Diet</span><div class="seg">${[['any','Everything'],['vegetarian','Vegetarian'],['vegan','Vegan']].map(([v,l]) => `<button data-diet="${v}" aria-pressed="${S.diet===v}">${l}</button>`).join('')}</div></div></section>`;
  html += `<section class="card"><h2>Avoid allergens</h2><p class="small muted" style="margin-top:0">Recipes containing these won't be suggested. This is a planning aid: always check labels, and take extra care with severe allergies.</p><div class="chips">${ALLERGENS.map(a => `<button data-av="${a}" aria-pressed="${S.avoid.includes(a)}">${a}</button>`).join('')}</div></section>`;
  html += `<section class="card"><h2>Your shops</h2><p class="small muted" style="margin-top:0">Name up to four places you shop. Then tap £ on list items to note the prices you see, and the list shows which shop is cheapest for your week.</p>${S.shops.map((n,i) => `<input class="input" style="margin-bottom:8px" data-shop="${i}" value="${h(n)}" placeholder="Shop ${i+1}" maxlength="18">`).join('')}</section>`;
  html += `<section class="card"><h2>Backup</h2><p class="small muted" style="margin-top:0">Everything lives on this phone. Save a backup before you change phones.</p><div class="row"><button class="btn secondary" id="exp">Save backup</button><label class="btn secondary">Restore<input type="file" id="imp" accept="application/json" hidden></label></div></section>`;
  html += `<p class="hint" style="text-align:center">One List Meal Planner by TCH Works · works offline · no account, no tracking.<br>Nutrition and allergen information is a guide only.</p>`;
  $('#app').innerHTML = html;
  $('#hm').onclick = () => { S.household = Math.max(1, S.household - 1); save(); render(); };
  $('#hp').onclick = () => { S.household = Math.min(12, S.household + 1); save(); render(); };
  document.querySelectorAll('[data-diet]').forEach(b => b.onclick = () => { S.diet = b.dataset.diet; save(); render(); });
  document.querySelectorAll('[data-av]').forEach(b => b.onclick = () => { const a = b.dataset.av; S.avoid = S.avoid.includes(a) ? S.avoid.filter(x => x !== a) : S.avoid.concat(a); save(); render(); });
  document.querySelectorAll('[data-shop]').forEach(i => i.onchange = () => { S.shops[+i.dataset.shop] = i.value.trim(); save(); });
  $('#exp').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], {type:'application/json'})); a.download = 'one-list-backup.json'; a.click(); };
  $('#imp').onchange = async e => { try { const x = JSON.parse(await e.target.files[0].text()); if (!x.plan) throw 0; S = Object.assign(fresh(), x); save(); toast('Backup restored'); render(); } catch(_) { toast('That file is not a One List backup'); } };
}

document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => { TAB = b.dataset.tab; render(); window.scrollTo(0,0); });
if (DEMO){
  S = fresh(); S.shops = ['Big shop','Discounter','',''];
  const ids = ['bolognese','fajitas','bean-chilli','salmon-traybake','sausage-casserole','flatbread-pizza','beef-stew'];
  weekDates().forEach((d,i) => S.plan[dkey(d)] = {r:ids[i], serves:4});
  S.plan[dkey(weekDates()[5])] = {note:'Eating out'};
  S.prices = {'beef mince':{0:{p:3.6,pack:500},1:{p:2.99,pack:500}}, 'onion':{0:{p:0.2,pack:0},1:{p:0.15,pack:0}}, 'chopped tomatoes (400g tin)':{0:{p:0.55,pack:1},1:{p:0.39,pack:1}}, 'spaghetti':{0:{p:0.75,pack:500},1:{p:0.49,pack:500}}, 'chicken breast':{0:{p:4.5,pack:650},1:{p:4.29,pack:650}}, 'peppers':{0:{p:0.8,pack:0},1:{p:0.55,pack:0}}};
}
window.__oneList = { get state(){ return S; }, shoppingList, show, norm, parseLine };
render();
})();
