/* Fair Rota: a fair, rotating family chores & dishes rota. All data stays on this device (localStorage). */
(function(){
'use strict';
const CFG = window.TCH_CONFIG || {mode:'full'};
const DEMO = CFG.mode === 'demo';
const KEY = 'tch-fair-rota-v1';
const COLORS = ['#4F46E5','#0EA5E9','#059669','#D97706','#DB2777','#7C3AED','#DC2626','#0F766E'];
const GROUPS = [
  {id:'little', label:'Age 4–7', short:'4–7', share:0.25},
  {id:'child', label:'Age 8–12', short:'8–12', share:0.5},
  {id:'teen', label:'Age 13–17', short:'Teen', share:0.8},
  {id:'adult', label:'Adult', short:'Adult', share:1},
];
const RANK = {little:0, child:1, teen:2, adult:3};
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAYS_LONG = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

// Chore library: name, how often, effort points (1 = under 5 min, 2 = 5–15 min, 3 = 15 min+), youngest age group.
const LIB = {
 dishes: [
  ['Wash up after tea','daily',2,'child'], ['Dry and put away','daily',1,'child'],
 ],
 dishwasher: [
  ['Load the dishwasher','daily',1,'child'], ['Unload the dishwasher','daily',2,'child'],
 ],
 family: [
  ['Lay the table','daily',1,'little'], ['Clear the table','daily',1,'little'],
  ['Load the dishwasher','daily',1,'child'], ['Unload the dishwasher','daily',2,'child'],
  ['Wipe worktops and hob','daily',1,'teen'], ['Feed the pet','daily',1,'little'],
  ['Tidy the living room (10 min)','daily',1,'little'],
  ['Put a wash on','days:0,3',1,'teen'], ['Fold and put away washing','days:1,4',2,'child'],
  ['Bins and recycling out','days:6',1,'child'], ['Hoover downstairs','days:5',2,'child'],
  ['Clean the bathroom','days:5',3,'teen'], ['Change bed sheets','days:6',2,'teen'],
  ['Cook tea (with help if needed)','days:2',3,'teen'], ['Weekly food shop or online order','days:4',3,'adult'],
 ],
 couple: [
  ['Cook tea','daily',3,'adult'], ['Wash up / dishwasher','daily',2,'adult'],
  ['Wipe worktops and hob','daily',1,'adult'], ['Plan meals and order the shop','days:4',3,'adult'],
  ['Put a wash on and hang it','days:1,4',2,'adult'], ['Hoover and dust','days:5',3,'adult'],
  ['Clean the bathroom','days:5',3,'adult'], ['Change bed sheets','days:6',2,'adult'],
  ['Bins and recycling out','days:6',1,'adult'], ['Life admin (bills, forms, bookings)','days:6',2,'adult'],
 ],
 houseshare: [
  ['Kitchen reset (worktops, hob, sink)','daily',2,'adult'], ['Bins and recycling out','days:6',1,'adult'],
  ['Clean the bathroom','days:5',3,'adult'], ['Hoover hall, stairs and lounge','days:5',3,'adult'],
  ['Clear out the fridge','days:6',2,'adult'], ['Restock shared basics (loo roll, washing-up liquid)','days:4',1,'adult'],
 ],
};
const IDEAS = {
 little: ['Put toys away','Lay the table','Clear own plate','Put dirty clothes in the basket','Match socks','Water the plants','Feed the pet (with help)'],
 child: ['Load or unload the dishwasher','Dry and put away','Hoover one room','Take the recycling out','Fold washing','Make own packed lunch','Wipe the bathroom sink','Sort the shoe pile'],
 teen: ['Wash up','Cook a simple tea once a week','Clean the bathroom','Put a wash on and hang it','Change bed sheets','Mop the kitchen floor','Wipe the worktops and hob','Bins out on bin day'],
 adult: ['Weekly food shop','Clean the oven','Clear out the fridge','Life admin','Deep-clean one room a week'],
};

// ---------- state ----------
const uid = () => Math.random().toString(36).slice(2, 9);
function load(){ try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch(e){ return null; } }
let S = load();
let memoryOnly = false;
function save(){ if (DEMO || memoryOnly) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){ toast('Could not save on this device'); } }
function fresh(){ return {v:1, people:[], chores:[], plans:{}, done:{}, settings:{remind:'18:00'}, created:Date.now()}; }

function demoState(){
  const s = fresh();
  s.people = [
    {id:'p1', name:'Sam', color:COLORS[0], group:'adult'},
    {id:'p2', name:'Alex', color:COLORS[2], group:'adult'},
    {id:'p3', name:'Mia', color:COLORS[4], group:'teen'},
    {id:'p4', name:'Leo', color:COLORS[3], group:'child'},
  ];
  s.chores = LIB.family.map(toChore);
  const wk = weekKey(new Date());
  s.plans[wk] = planWeek(s, wk);
  const t = todayIdx();
  // tick a few earlier items so Today/Scores look lived-in
  for (const a of s.plans[wk]) if (a.d < t || (a.d === t && a.c.charCodeAt(0) % 3 === 0)) s.done[wk+'|'+a.k] = 1;
  return s;
}
function toChore(r){
  const [name, freq, pts, min] = r;
  let f = freq, days = [];
  if (freq.startsWith('days:')){ f = 'days'; days = freq.slice(5).split(',').map(Number); }
  return {id:uid(), name, freq:f, days, pts, min, fixed:null};
}

// ---------- dates ----------
function mondayOf(d){ const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const wd = (x.getDay()+6)%7; x.setDate(x.getDate()-wd); return x; }
function weekKey(d){ const m = mondayOf(d); return m.getFullYear()+'-'+String(m.getMonth()+1).padStart(2,'0')+'-'+String(m.getDate()).padStart(2,'0'); }
function fromKey(k){ const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); }
function todayIdx(){ return (new Date().getDay()+6)%7; }
function addDays(d, n){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function weekNum(k){ return Math.round(fromKey(k).getTime() / 6048e5); }
const fmtDay = d => d.toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long'});
const fmtShort = d => d.toLocaleDateString('en-GB', {day:'numeric', month:'short'});

// ---------- the fair rotation ----------
// Every occurrence of every chore this week is shared out so each person's load (effort points)
// tracks their fair share for their age. Ties rotate week by week, and nobody gets the same
// daily job two days running if someone else can take it.
function shareOf(p){ return (GROUPS.find(g => g.id === p.group) || GROUPS[3]).share; }
function eligible(s, c){ return c.fixed ? s.people.filter(p => p.id === c.fixed) : s.people.filter(p => RANK[p.group] >= RANK[c.min]); }
function occurrences(c){ return c.freq === 'daily' ? [0,1,2,3,4,5,6] : (c.freq === 'weekly' ? [c.days[0] ?? 5] : c.days.slice().sort()); }
function planWeek(s, wk){
  const n = weekNum(wk);
  const occ = [];
  s.chores.forEach((c, ci) => occurrences(c).forEach(d => occ.push({c:c.id, d, pts:c.pts, ci})));
  // biggest jobs first so they spread evenly; then by day
  occ.sort((a,b) => b.pts - a.pts || a.d - b.d || a.ci - b.ci);
  const load = Object.fromEntries(s.people.map(p => [p.id, 0]));
  const last = {}; // chore|day -> person
  const out = [];
  for (const o of occ){
    const c = s.chores.find(x => x.id === o.c);
    const el = eligible(s, c);
    if (!el.length){ out.push({k:o.c+'@'+o.d, c:o.c, d:o.d, p:null}); continue; }
    let best = null, bestScore = Infinity;
    el.forEach((p, i) => {
      let score = (load[p.id] + o.pts) / shareOf(p);
      if (last[o.c+'|'+(o.d-1)] === p.id) score += 1.5;              // avoid same job two days running
      score += ((i + n + o.ci) % el.length) * 0.001;                  // rotate ties week to week
      if (score < bestScore){ bestScore = score; best = p; }
    });
    load[best.id] += o.pts; last[o.c+'|'+o.d] = best.id;
    out.push({k:o.c+'@'+o.d, c:o.c, d:o.d, p:best.id});
  }
  return out.sort((a,b) => a.d - b.d);
}
function plan(wk){
  if (!S.plans[wk]) { S.plans[wk] = planWeek(S, wk); save(); }
  // drop entries for deleted chores
  return S.plans[wk].filter(a => S.chores.some(c => c.id === a.c));
}
function person(id){ return S.people.find(p => p.id === id); }
function chore(id){ return S.chores.find(c => c.id === id); }
function isDone(wk, a){ return !!S.done[wk+'|'+a.k]; }

// ---------- ui helpers ----------
const $ = s => document.querySelector(s);
const h = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let TAB = 'today', viewWeek = weekKey(new Date());
function toast(msg){ const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(()=>t.remove(), 2200); }
function av(p, size){ const s = size||34; return `<span class="avatar" style="background:${p.color};width:${s}px;height:${s}px;font-size:${Math.round(s*.44)}px">${h(p.name.trim()[0]||'?').toUpperCase()}</span>`; }
const TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
function sheet(html, onMount){
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  bg.addEventListener('click', e => { if (e.target === bg) bg.remove(); });
  document.body.appendChild(bg);
  const close = () => bg.remove();
  onMount && onMount(bg.querySelector('.sheet'), close);
  return close;
}
function demoBanner(){ return DEMO ? `<div class="banner demo"><div><strong>Demo.</strong> Play with it, nothing is saved. The full version keeps your rota on your phone. <a href="${h(CFG.buyUrl||'../')}">Get Fair Rota</a></div></div>` : ''; }

// ---------- screens ----------
function render(){
  document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.tab === TAB ? 'page' : 'false'));
  if (!S || !S.people.length || !S.chores.length) { $('#tabs').style.display = 'none'; return onboarding(); }
  $('#tabs').style.display = '';
  ({today, week, scores, setup})[TAB]();
  window.TCHInstall && TCHInstall.render();
  window.scrollTo(0,0);
}

function today(){
  const wk = weekKey(new Date()), d = todayIdx(), P = plan(wk).filter(a => a.d === d);
  const done = P.filter(a => isDone(wk, a)).length;
  let html = `${demoBanner()}<div id="install"></div><div class="top"><div><h1>Today</h1><div class="sub">${fmtDay(new Date())}</div></div><div class="chip">${done}/${P.length} done</div></div>`;
  for (const p of S.people){
    const mine = P.filter(a => a.p === p.id);
    const pts = mine.filter(a => isDone(wk,a)).reduce((t,a) => t + (chore(a.c)?.pts||0), 0);
    html += `<section class="card"><div class="person">${av(p)}<span class="name">${h(p.name)}</span><span class="pts">${pts} pt${pts===1?'':'s'} today</span></div>`;
    if (!mine.length) html += `<p class="muted small" style="margin:6px 0 2px">Nothing today. Enjoy it.</p>`;
    else html += `<ul class="list">` + mine.map(a => { const c = chore(a.c), dn = isDone(wk,a);
      return `<li><button class="tick" role="checkbox" aria-checked="${dn}" aria-label="Done: ${h(c.name)}" data-tick="${a.k}">${TICK}</button><div class="chore-name"><b class="${dn?'done-text':''}">${h(c.name)}</b></div><span class="pt">${c.pts} pt${c.pts>1?'s':''}</span><button class="btn ghost" data-swap="${a.k}" aria-label="Swap ${h(c.name)}">Swap</button></li>`; }).join('') + `</ul>`;
    html += `</section>`;
  }
  const spare = P.filter(a => !a.p);
  if (spare.length) html += `<section class="card"><h2>Nobody can take these</h2><p class="small muted">Check the youngest age group on these chores in Setup.</p>${spare.map(a=>h(chore(a.c).name)).join('<br>')}</section>`;
  $('#app').innerHTML = html;
  bindTicks(wk); bindSwaps(wk);
}

function week(){
  const wk = viewWeek, mon = fromKey(wk), P = plan(wk), thisWk = weekKey(new Date());
  let html = `${demoBanner()}<div class="top"><div><h1>Week</h1><div class="sub">${fmtShort(mon)} – ${fmtShort(addDays(mon,6))}</div></div>
   <div class="row"><button class="btn secondary" data-wk="-1" aria-label="Previous week">‹</button><button class="btn secondary" data-wk="1" aria-label="Next week">›</button></div></div>`;
  html += `<div class="card"><div class="spread"><div class="small muted">Tap a name to swap who does it.</div><button class="btn ghost" id="share">Share week</button></div></div>`;
  for (let d = 0; d < 7; d++){
    const items = P.filter(a => a.d === d);
    const isToday = wk === thisWk && d === todayIdx();
    html += `<section class="card day ${isToday?'today':''}"><h3><span>${DAYS_LONG[d]}${isToday?' · Today':''}</span><span>${fmtShort(addDays(mon,d))}</span></h3>`;
    html += items.length ? items.map(a => { const c = chore(a.c), p = person(a.p), dn = isDone(wk,a);
      return `<div class="assign"><span class="what ${dn?'done':''}">${h(c.name)}</span>${p ? `<button class="who" data-swap="${a.k}">${av(p,24)}${h(p.name)}</button>` : '<span class="muted small">Nobody</span>'}</div>`; }).join('') : '<p class="muted small">No chores.</p>';
    html += `</section>`;
  }
  html += `<button class="btn secondary block" id="reshuffle">Reshuffle this week</button><p class="hint" style="text-align:center">Reshuffling keeps what's already ticked and swapped.</p>`;
  $('#app').innerHTML = html;
  document.querySelectorAll('[data-wk]').forEach(b => b.onclick = () => { viewWeek = weekKey(addDays(fromKey(viewWeek), 7*Number(b.dataset.wk))); render(); });
  $('#share').onclick = () => shareWeek(wk);
  $('#reshuffle').onclick = () => {
    const old = S.plans[wk] || []; const fresh = planWeek(S, wk);
    for (const a of fresh){ const o = old.find(x => x.k === a.k); if (o && (o.swapped || S.done[wk+'|'+a.k])) { a.p = o.p; a.swapped = o.swapped; } }
    S.plans[wk] = fresh; save(); toast('Week reshuffled'); render();
  };
  bindSwaps(wk);
}

function scores(){
  const wk = weekKey(new Date()), P = plan(wk);
  const rows = S.people.map(p => {
    const mine = P.filter(a => a.p === p.id);
    const assigned = mine.reduce((t,a) => t + chore(a.c).pts, 0);
    const earned = mine.filter(a => isDone(wk,a)).reduce((t,a) => t + chore(a.c).pts, 0);
    return {p, assigned, earned, streak: streak(p)};
  });
  const maxA = Math.max(1, ...rows.map(r => r.assigned));
  const totalShare = S.people.reduce((t,p) => t + shareOf(p), 0);
  const totalPts = rows.reduce((t,r) => t + r.assigned, 0) || 1;
  const leader = rows.slice().sort((a,b) => (b.earned/(b.assigned||1)) - (a.earned/(a.assigned||1)))[0];
  let html = `${demoBanner()}<div class="top"><div><h1>Scores</h1><div class="sub">This week</div></div></div>`;
  if (leader && leader.earned) html += `<div class="card"><div class="row">${av(leader.p,44)}<div><div class="small muted">Leading this week</div><div class="big-num">${h(leader.p.name)}</div></div></div></div>`;
  html += `<section class="card"><h2>Points</h2>` + rows.map(r => `<div class="score-row"><div class="spread"><span class="row">${av(r.p,26)}<b>${h(r.p.name)}</b></span><span class="small"><b>${r.earned}</b> / ${r.assigned} pts${r.streak>1?` · ${r.streak}-day streak`:''}</span></div><div class="bar" aria-hidden="true"><i style="width:${Math.round(100*r.earned/maxA)}%;background:${r.p.color}"></i></div></div>`).join('') + `</section>`;
  html += `<section class="card"><h2>Is it fair?</h2><p class="small muted" style="margin-top:0">Each person's share of this week's work, against their fair share for their age.</p>` +
    rows.map(r => { const got = Math.round(100*r.assigned/totalPts), fair = Math.round(100*shareOf(r.p)/totalShare);
      return `<div class="spread small" style="padding:6px 0;border-bottom:1px solid var(--line)"><span>${h(r.p.name)}</span><span>${got}% of the work · fair share ${fair}%</span></div>`; }).join('') +
    `<p class="hint">Fair share counts adults as 1, teens 0.8, 8–12s 0.5 and 4–7s 0.25.</p></section>`;
  $('#app').innerHTML = html;
}
function streak(p){
  let n = 0, d = new Date();
  for (let i = 0; i < 60; i++){
    const wk = weekKey(d), di = (d.getDay()+6)%7, P = (S.plans[wk]||[]).filter(a => a.d === di && a.p === p.id);
    if (i === 0 && P.some(a => !isDone(wk,a))) { d = addDays(d,-1); continue; } // today still in progress
    if (!S.plans[wk] || (P.length && P.some(a => !isDone(wk,a)))) break;
    if (P.length) n++;
    d = addDays(d,-1);
  }
  return n;
}

function setup(){
  let html = `${demoBanner()}<div class="top"><div><h1>Setup</h1><div class="sub">People, chores and reminders</div></div></div>`;
  html += `<section class="card"><div class="spread"><h2>People</h2><button class="btn ghost" id="addP">+ Add</button></div><ul class="list">` +
    S.people.map(p => `<li>${av(p)}<div style="flex:1"><b>${h(p.name)}</b><div class="tiny muted">${GROUPS.find(g=>g.id===p.group).label}</div></div><button class="btn ghost" data-editp="${p.id}">Edit</button></li>`).join('') + `</ul></section>`;
  html += `<section class="card"><div class="spread"><h2>Chores</h2><button class="btn ghost" id="addC">+ Add</button></div><ul class="list">` +
    S.chores.map(c => `<li><div class="chore-name"><b>${h(c.name)}</b><small>${freqLabel(c)} · ${c.pts} pt${c.pts>1?'s':''} · ${c.fixed ? 'always '+h(person(c.fixed)?.name||'') : GROUPS.find(g=>g.id===c.min).short+'+'}</small></div><button class="btn ghost" data-editc="${c.id}">Edit</button></li>`).join('') + `</ul></section>`;
  html += `<section class="card"><h2>Reminders</h2><p class="small muted" style="margin-top:0">Put someone's chores for this week into their phone calendar, with an alert at the time you choose.</p>
    <label class="field"><span>Alert time</span><input class="input" type="time" id="remind" value="${h(S.settings.remind||'18:00')}"></label>
    <div class="row" style="flex-wrap:wrap">${S.people.map(p => `<button class="btn secondary" data-ics="${p.id}">${h(p.name)}</button>`).join('')}</div>
    <p class="hint">On iPhone the file opens in Calendar: tap <b>Add All</b>. On Android, open the downloaded file and choose your calendar app.</p></section>`;
  html += `<section class="card"><h2>Backup</h2><p class="small muted" style="margin-top:0">Your rota lives only on this phone. Save a backup file before you change phones.</p><div class="row"><button class="btn secondary" id="exp">Save backup</button><label class="btn secondary">Restore<input type="file" id="imp" accept="application/json" hidden></label></div></section>`;
  html += `<section class="card"><h2>Ideas by age</h2>${Object.entries(IDEAS).map(([g, xs]) => `<p class="small"><b>${GROUPS.find(x=>x.id===g).label}:</b> ${xs.map(h).join(', ')}.</p>`).join('')}<p class="hint">Start small: three or four chores that already cause arguments. Add more after a fortnight.</p></section>`;
  html += `<button class="btn danger block" id="reset">Start again</button><p class="hint" style="text-align:center;margin-top:16px">Fair Rota by TCH Works · works offline · no account, no tracking</p>`;
  $('#app').innerHTML = html;
  $('#addP').onclick = () => editPerson(null);
  $('#addC').onclick = () => editChore(null);
  document.querySelectorAll('[data-editp]').forEach(b => b.onclick = () => editPerson(b.dataset.editp));
  document.querySelectorAll('[data-editc]').forEach(b => b.onclick = () => editChore(b.dataset.editc));
  $('#remind').onchange = e => { S.settings.remind = e.target.value; save(); };
  document.querySelectorAll('[data-ics]').forEach(b => b.onclick = () => personICS(b.dataset.ics));
  $('#exp').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], {type:'application/json'})); a.download = 'fair-rota-backup.json'; a.click(); };
  $('#imp').onchange = async e => { try { const x = JSON.parse(await e.target.files[0].text()); if (!x.people || !x.chores) throw 0; S = x; save(); toast('Backup restored'); render(); } catch(_) { toast('That file is not a Fair Rota backup'); } };
  $('#reset').onclick = () => { if (confirm('Delete your rota from this phone and start again?')) { S = fresh(); save(); render(); } };
}
function freqLabel(c){ if (c.freq === 'daily') return 'Every day'; const ds = occurrences(c); if (ds.length === 7) return 'Every day'; return ds.map(d => DAYS[d]).join(', '); }

// ---------- actions ----------
function bindTicks(wk){
  document.querySelectorAll('[data-tick]').forEach(b => b.onclick = () => {
    const k = wk+'|'+b.dataset.tick;
    if (S.done[k]) delete S.done[k]; else { S.done[k] = 1; if (navigator.vibrate) navigator.vibrate(12); }
    save(); render();
  });
}
function bindSwaps(wk){
  document.querySelectorAll('[data-swap]').forEach(b => b.onclick = () => {
    const a = S.plans[wk].find(x => x.k === b.dataset.swap), c = chore(a.c);
    const el = eligible(S, c);
    sheet(`<h2>${h(c.name)}</h2><p class="muted small">${DAYS_LONG[a.d]}. Who's doing it?</p><ul class="list">${el.map(p => `<li><button class="btn ${p.id===a.p?'':'secondary'} block" data-to="${p.id}" style="justify-content:flex-start">${av(p,26)} ${h(p.name)}${p.id===a.p?' (now)':''}</button></li>`).join('')}</ul>`, (root, close) => {
      root.querySelectorAll('[data-to]').forEach(x => x.onclick = () => { a.p = x.dataset.to; a.swapped = true; save(); close(); toast(`${person(a.p).name} has it`); render(); });
    });
  });
}
function editPerson(id){
  const p = id ? person(id) : {id:uid(), name:'', color:COLORS[S.people.length % COLORS.length], group:'adult'};
  sheet(`<h2>${id?'Edit':'Add'} person</h2>
    <label class="field"><span>Name</span><input class="input" id="pn" value="${h(p.name)}" maxlength="20" autocomplete="off" placeholder="e.g. Mia"></label>
    <div class="field"><span>Age group (for fair shares and suitable chores)</span><div class="seg" id="pg">${GROUPS.map(g=>`<button aria-pressed="${g.id===p.group}" data-g="${g.id}">${g.short}</button>`).join('')}</div></div>
    <div class="field"><span>Colour</span><div class="colors" id="pc">${COLORS.map(c=>`<button aria-pressed="${c===p.color}" data-c="${c}" style="background:${c}" aria-label="colour ${c}"></button>`).join('')}</div></div>
    <button class="btn block" id="ok">Save</button>${id?'<button class="btn danger block" id="del" style="margin-top:8px">Remove</button>':''}`, (root, close) => {
    let g = p.group, col = p.color;
    root.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { g = b.dataset.g; root.querySelectorAll('[data-g]').forEach(x => x.setAttribute('aria-pressed', x===b)); });
    root.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { col = b.dataset.c; root.querySelectorAll('[data-c]').forEach(x => x.setAttribute('aria-pressed', x===b)); });
    root.querySelector('#ok').onclick = () => { const n = root.querySelector('#pn').value.trim(); if (!n) return toast('Add a name');
      Object.assign(p, {name:n, group:g, color:col}); if (!id) S.people.push(p); replanFuture(); save(); close(); render(); };
    if (id) root.querySelector('#del').onclick = () => { if (S.people.length < 2) return toast('You need at least one person'); S.people = S.people.filter(x => x.id !== id); S.chores.forEach(c => { if (c.fixed === id) c.fixed = null; }); replanFuture(); save(); close(); render(); };
  });
}
function editChore(id){
  const c = id ? chore(id) : {id:uid(), name:'', freq:'days', days:[5], pts:2, min:'child', fixed:null};
  sheet(`<h2>${id?'Edit':'Add'} chore</h2>
    <label class="field"><span>Chore</span><input class="input" id="cn" value="${h(c.name)}" maxlength="48" placeholder="e.g. Hoover the stairs"></label>
    <div class="field"><span>How often</span><div class="seg" id="cf"><button data-f="daily" aria-pressed="${c.freq==='daily'}">Every day</button><button data-f="days" aria-pressed="${c.freq!=='daily'}">Some days</button></div></div>
    <div class="field" id="dayswrap"><span>Which days</span><div class="daypick">${DAYS.map((d,i)=>`<button data-d="${i}" aria-pressed="${c.days.includes(i)}">${d}</button>`).join('')}</div></div>
    <div class="field"><span>Effort</span><div class="seg" id="cp">${[[1,'Quick (<5 min)'],[2,'Medium'],[3,'Big (15 min+)']].map(([v,l])=>`<button data-p="${v}" aria-pressed="${c.pts===v}">${l}</button>`).join('')}</div></div>
    <div class="field"><span>Youngest who can do it</span><div class="seg" id="cm">${GROUPS.map(g=>`<button data-m="${g.id}" aria-pressed="${c.min===g.id}">${g.short}</button>`).join('')}</div></div>
    <label class="field"><span>Always the same person? (optional)</span><select class="input" id="cx"><option value="">No, rotate it fairly</option>${S.people.map(p=>`<option value="${p.id}" ${c.fixed===p.id?'selected':''}>${h(p.name)}</option>`).join('')}</select></label>
    <button class="btn block" id="ok">Save</button>${id?'<button class="btn danger block" id="del" style="margin-top:8px">Delete chore</button>':''}`, (root, close) => {
    let f = c.freq === 'daily' ? 'daily' : 'days', days = c.days.slice(), pts = c.pts, min = c.min;
    const dw = root.querySelector('#dayswrap'); dw.style.display = f === 'daily' ? 'none' : '';
    root.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { f = b.dataset.f; root.querySelectorAll('[data-f]').forEach(x => x.setAttribute('aria-pressed', x===b)); dw.style.display = f === 'daily' ? 'none' : ''; });
    root.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const d = +b.dataset.d; days = days.includes(d) ? days.filter(x => x!==d) : days.concat(d); b.setAttribute('aria-pressed', days.includes(d)); });
    root.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { pts = +b.dataset.p; root.querySelectorAll('[data-p]').forEach(x => x.setAttribute('aria-pressed', x===b)); });
    root.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { min = b.dataset.m; root.querySelectorAll('[data-m]').forEach(x => x.setAttribute('aria-pressed', x===b)); });
    root.querySelector('#ok').onclick = () => { const n = root.querySelector('#cn').value.trim(); if (!n) return toast('Name the chore'); if (f==='days' && !days.length) return toast('Pick at least one day');
      Object.assign(c, {name:n, freq:f, days:f==='daily'?[]:days.sort(), pts, min, fixed: root.querySelector('#cx').value || null}); if (!id) S.chores.push(c); replanFuture(); save(); close(); render(); };
    if (id) root.querySelector('#del').onclick = () => { S.chores = S.chores.filter(x => x.id !== id); replanFuture(); save(); close(); render(); };
  });
}
// When people or chores change, re-plan from today onwards, keeping anything already ticked or swapped.
function replanFuture(){
  const wk = weekKey(new Date()), t = todayIdx();
  for (const k of Object.keys(S.plans)) if (k > wk) delete S.plans[k];
  const old = S.plans[wk] || [], nw = planWeek(S, wk);
  S.plans[wk] = nw.map(a => { const o = old.find(x => x.k === a.k); return (o && (a.d < t || o.swapped || S.done[wk+'|'+a.k])) ? o : a; });
}
function shareWeek(wk){
  const mon = fromKey(wk), P = plan(wk);
  let txt = `Rota for the week of ${fmtShort(mon)}\n`;
  for (let d = 0; d < 7; d++){ const it = P.filter(a => a.d === d && a.p); if (!it.length) continue;
    txt += `\n${DAYS_LONG[d]}\n` + it.map(a => `• ${chore(a.c).name}: ${person(a.p).name}`).join('\n') + '\n'; }
  if (navigator.share) navigator.share({title:'This week\'s rota', text:txt}).catch(()=>{});
  else navigator.clipboard.writeText(txt).then(() => toast('Copied. Paste it into your family chat.'));
}
function personICS(pid){
  const p = person(pid), wk = weekKey(new Date()), mon = fromKey(wk), t = todayIdx();
  const [hh, mm] = (S.settings.remind || '18:00').split(':').map(Number);
  const byDay = {};
  plan(wk).filter(a => a.p === pid && a.d >= t).forEach(a => (byDay[a.d] = byDay[a.d] || []).push(chore(a.c).name));
  const ev = Object.entries(byDay).map(([d, names]) => ({uid:`fairrota-${pid}-${wk}-${d}@tchworks.co.uk`, date:addDays(mon,+d), hh, mm, minutes:15,
    summary:`${p.name}'s jobs: ${names.join(', ')}`, description:`Today's jobs for ${p.name}:\n${names.map(n=>'- '+n).join('\n')}\n\nTick them off in Fair Rota.`}));
  if (!ev.length) return toast(`${p.name} has nothing left this week`);
  TCHICS.download(`rota-${p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${wk}.ics`, TCHICS.build(`${p.name}'s chores`, ev));
}

// ---------- onboarding ----------
function onboarding(){
  let step = 1, people = [{name:'', group:'adult'}], preset = 'family';
  const draw = () => {
    let html = `${demoBanner()}<div class="top"><div><h1>Fair Rota</h1><div class="sub">Set up in under a minute</div></div></div><div class="steps"><i class="on"></i><i class="${step>1?'on':''}"></i></div>`;
    if (step === 1){
      html += `<section class="card"><h2>Who lives here?</h2><p class="small muted" style="margin-top:0">Age groups keep it fair: younger children get lighter, suitable jobs.</p>` +
        people.map((p,i) => `<div class="field"><input class="input" data-n="${i}" value="${h(p.name)}" placeholder="Name" maxlength="20" autocomplete="off"><div class="seg" style="margin-top:6px">${GROUPS.map(g=>`<button data-i="${i}" data-g="${g.id}" aria-pressed="${p.group===g.id}">${g.short}</button>`).join('')}</div></div>`).join('') +
        `<button class="btn secondary block" id="more">+ Add someone</button></section><button class="btn block" id="next">Next</button>`;
    } else {
      const opts = [['family','Family with kids','Dishes, tidying, washing, bins and bathroom, shared by age'],['dishwasher','Just the dishwasher','Load and unload, rotating daily'],['dishes','Just the washing up','Wash and dry, rotating daily'],['couple','Couple','Cooking, cleaning, laundry and the life admin'],['houseshare','House or flat share','Kitchen, bathroom, bins and shared basics']];
      html += `<section class="card"><h2>Pick a starting set</h2><p class="small muted" style="margin-top:0">You can change any chore afterwards.</p>` +
        opts.map(([k,t,d]) => `<button class="preset" data-p="${k}" aria-pressed="${preset===k}"><b>${t}</b><span class="small muted">${d}</span></button>`).join('') + `</section>
        <button class="btn block" id="go">Make our rota</button><button class="btn ghost block" id="back">Back</button>`;
    }
    $('#app').innerHTML = html;
    if (step === 1){
      document.querySelectorAll('[data-n]').forEach(i => i.oninput = () => people[+i.dataset.n].name = i.value);
      document.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { people[+b.dataset.i].group = b.dataset.g; draw(); });
      $('#more').onclick = () => { people.push({name:'', group:'child'}); draw(); document.querySelectorAll('[data-n]')[people.length-1].focus(); };
      $('#next').onclick = () => { people = people.filter(p => p.name.trim()); if (!people.length) { people = [{name:'',group:'adult'}]; draw(); return toast('Add at least one name'); } step = 2; draw(); };
    } else {
      document.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { preset = b.dataset.p; draw(); });
      $('#back').onclick = () => { step = 1; draw(); };
      $('#go').onclick = () => {
        S = fresh();
        S.people = people.map((p,i) => ({id:uid(), name:p.name.trim(), group:p.group, color:COLORS[i % COLORS.length]}));
        S.chores = LIB[preset].map(toChore);
        // a house of adults only: let adults take the children's jobs too (eligibility already allows this)
        save(); TAB = 'today'; render(); toast('Rota made. Swap anything that doesn\'t suit.');
      };
    }
  };
  draw();
}

document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => { TAB = b.dataset.tab; if (TAB === 'week') viewWeek = weekKey(new Date()); render(); });
if (DEMO) { S = demoState(); }
else if (!S) { S = fresh(); }
try { localStorage.setItem('tch-probe','1'); localStorage.removeItem('tch-probe'); } catch(e){ memoryOnly = true; }
window.__fairRota = { get state(){ return S; }, planWeek, weekKey }; // for tests
render();
})();
