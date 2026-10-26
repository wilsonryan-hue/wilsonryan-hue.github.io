/* TCH Works FAQ assistant v1. Answers only from the approved Q&A list passed in, so it never makes things up.
   Use: <script src="faq-bot.js" data-config="faq.json" defer></script>  (or set window.TCH_FAQ = {...} first)
   No cookies, no tracking, no outside services. (c) 2026 TCH Works. */
(function(){
"use strict";
var STOP="a an and are as at be but by can do does for from get got have how i if in is it its me my of on or our so that the there this to us was we what when where which who why will with you your yours am im i'm please hi hello hey".split(" ");
var stop={};STOP.forEach(function(w){stop[w]=1});
function stem(w){w=w.replace(/'s$/,"");if(w.length>5)w=w.replace(/(ings|ing|edly|ed|ies|es|s|ly)$/,"");return w}
function toks(t){return (t||"").toLowerCase().replace(/£/g," gbp ").replace(/[^a-z0-9 ]+/g," ").split(/\s+/).filter(function(w){return w&&!stop[w]}).map(stem)}
function lev(a,b){if(Math.abs(a.length-b.length)>2)return 9;var m=[],i,j;for(i=0;i<=b.length;i++)m[i]=[i];for(j=0;j<=a.length;j++)m[0][j]=j;for(i=1;i<=b.length;i++)for(j=1;j<=a.length;j++)m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(b[i-1]==a[j-1]?0:1));return m[b.length][a.length]}
function near(a,b){if(a==b)return 1;if(a.length>3&&b.length>3&&(a.indexOf(b)==0||b.indexOf(a)==0))return .8;if(a.length>4&&b.length>4&&lev(a,b)<=1)return .7;return 0}
function Bot(cfg){
 this.c=cfg;var syn=cfg.synonyms||{};this.syn={};var self=this;
 Object.keys(syn).forEach(function(k){syn[k].forEach(function(s){self.syn[stem(s.toLowerCase())]=stem(k.toLowerCase())})});
 this.idx=cfg.faqs.map(function(f){var t=toks(f.q+" "+(f.keywords||[]).join(" ")).map(function(w){return self.syn[w]||w});return {f:f,t:t}});
 var df={};this.idx.forEach(function(e){var u={};e.t.forEach(function(w){u[w]=1});Object.keys(u).forEach(function(w){df[w]=(df[w]||0)+1})});
 this.idf=function(w){return Math.log(1+self.idx.length/(df[w]||.5))};
}
Bot.prototype.ask=function(text){
 var self=this,q=toks(text).map(function(w){return self.syn[w]||w});if(!q.length)return null;
 var best=[];this.idx.forEach(function(e){var s=0;q.forEach(function(w){var m=0,mw=w;e.t.forEach(function(t){var n=near(w,t);if(n>m){m=n;mw=t}});s+=m*self.idf(mw)});var max=0;q.forEach(function(w){max+=self.idf(w)});best.push({f:e.f,s:s/(max||1),raw:s})});
 best.sort(function(a,b){return b.s-a.s});
 if(!best[0]||best[0].s<(this.c.threshold||.34))return {miss:true,alts:best.slice(0,3).filter(function(b){return b.raw>0}).map(function(b){return b.f})};
 return {f:best[0].f,alts:best.slice(1,3).filter(function(b){return b.s>.3}).map(function(b){return b.f})};
};
function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function mount(cfg){
 var bot=new Bot(cfg),col=cfg.colour||"#1f3fbf",name=cfg.name||"Questions?";
 var css=".tfb-btn{position:fixed;right:18px;bottom:18px;z-index:99999;background:"+col+";color:#fff;border:0;border-radius:999px;padding:12px 18px;font:600 15px/1.2 system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer}.tfb-box{position:fixed;right:18px;bottom:76px;z-index:99999;width:min(360px,calc(100vw - 36px));height:min(520px,calc(100vh - 110px));background:#fff;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.3);display:none;flex-direction:column;overflow:hidden;font:15px/1.45 system-ui,sans-serif;color:#1b1f2a}.tfb-box.open{display:flex}.tfb-head{background:"+col+";color:#fff;padding:12px 14px;font-weight:700;display:flex;justify-content:space-between;align-items:center}.tfb-head button{background:none;border:0;color:#fff;font-size:20px;cursor:pointer}.tfb-log{flex:1;overflow-y:auto;padding:12px;background:#f6f7fb}.tfb-m{max-width:85%;margin:6px 0;padding:9px 12px;border-radius:12px;white-space:pre-wrap}.tfb-b{background:#fff;border:1px solid #e3e6ef}.tfb-u{background:"+col+";color:#fff;margin-left:auto}.tfb-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.tfb-chips button{border:1px solid "+col+";color:"+col+";background:#fff;border-radius:999px;padding:5px 10px;font-size:13px;cursor:pointer}.tfb-in{display:flex;border-top:1px solid #e3e6ef}.tfb-in input{flex:1;border:0;padding:12px;font-size:15px;outline:none}.tfb-in button{border:0;background:"+col+";color:#fff;padding:0 16px;font-weight:700;cursor:pointer}.tfb-m a{color:inherit;font-weight:600}.tfb-inline{position:static;width:100%;height:480px;display:flex;box-shadow:0 4px 18px rgba(0,0,0,.12)}";
 var st=el("style");st.textContent=css;document.head.appendChild(st);
 var host=cfg.inline?document.querySelector(cfg.inline):null;
 var box=el("div","tfb-box"+(host?" tfb-inline open":""));box.setAttribute("role","dialog");box.setAttribute("aria-label",name);
 var head=el("div","tfb-head","<span>"+esc(name)+"</span>"),x=el("button",null,"&times;");x.setAttribute("aria-label","Close");if(!host)head.appendChild(x);
 var log=el("div","tfb-log");log.setAttribute("aria-live","polite");
 var form=el("form","tfb-in"),inp=el("input");inp.placeholder="Type your question…";inp.setAttribute("aria-label","Your question");var send=el("button",null,"Send");send.type="submit";form.appendChild(inp);form.appendChild(send);
 box.appendChild(head);box.appendChild(log);box.appendChild(form);
 function link(s){return esc(s).replace(/\[([^\]]+)\]\((https?:[^)\s]+|mailto:[^)\s]+|\/[^)\s]*)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')}
 function say(t,who){var m=el("div","tfb-m "+(who=="u"?"tfb-u":"tfb-b"),who=="u"?esc(t):link(t));log.appendChild(m);log.scrollTop=log.scrollHeight}
 function chips(list){if(!list.length)return;var c=el("div","tfb-chips");list.forEach(function(f){var b=el("button",null,esc(f.q));b.type="button";b.onclick=function(){go(f.q)};c.appendChild(b)});log.appendChild(c);log.scrollTop=log.scrollHeight}
 function go(t){t=t.trim();if(!t)return;say(t,"u");var r=bot.ask(t);
  setTimeout(function(){if(!r||r.miss){say(cfg.fallback||"Sorry, I don't have an answer for that one.");if(r&&r.alts.length){say("Did you mean one of these?");chips(r.alts)}}else{say(r.f.a);if(r.alts.length)chips(r.alts)}},250)}
 form.onsubmit=function(e){e.preventDefault();var v=inp.value;inp.value="";go(v)};
 say(cfg.greeting||"Hi! Ask me anything.");chips((cfg.suggest||[]).map(function(i){return cfg.faqs[i]}).filter(Boolean));
 if(host){host.appendChild(box)}else{var btn=el("button","tfb-btn",esc(cfg.button||"Questions? Ask us"));btn.onclick=function(){box.classList.toggle("open");if(box.classList.contains("open"))inp.focus()};x.onclick=function(){box.classList.remove("open")};document.body.appendChild(btn);document.body.appendChild(box)}
}
window.TCHFaqBot={Bot:Bot,mount:mount};
function boot(){var s=document.currentScript||document.querySelector("script[data-config]");if(window.TCH_FAQ)return mount(window.TCH_FAQ);var u=s&&s.getAttribute("data-config");if(u)fetch(u).then(function(r){return r.json()}).then(mount)}
var cur=document.currentScript;if(document.readyState=="loading")document.addEventListener("DOMContentLoaded",function(){if(window.TCH_FAQ)mount(window.TCH_FAQ);else if(cur&&cur.getAttribute("data-config"))fetch(cur.getAttribute("data-config")).then(function(r){return r.json()}).then(mount)});else boot();
})();
