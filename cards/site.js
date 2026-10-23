(function(){
function $(s,r){return (r||document).querySelector(s)}function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
var IF={caveat:"'Caveat',cursive",dancing:"'Dancing Script',cursive",amatic:"'Amatic SC',cursive",playfair:"'Playfair Display',serif",poppins:"'Poppins',sans-serif"};
function getB(){try{return JSON.parse(localStorage.getItem('tchbasket')||'[]')}catch(e){return[]}}
function setB(b){try{localStorage.setItem('tchbasket',JSON.stringify(b))}catch(e){alert('Your browser could not save the basket (photo too large?). Try a smaller photo.');return false}cnt();return true}
function cnt(){var c=$('#bcount');if(c)c.textContent=getB().length}cnt();
function money(n){return '\u00a3'+Number(n).toFixed(2)}
function esc(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
// filters + sort
var fb=$('.filters');if(fb){var tiles=$$('.grid .tile'),gridEl=$('.grid');
 var qs=new URLSearchParams(location.search);$$('select[data-k]',fb).forEach(function(x){var v=qs.get(x.dataset.k);if(v)x.value=v});
 function apply(){var f={};$$('select[data-k]',fb).forEach(function(x){if(x.value)f[x.dataset.k]=x.value});var n=0;
  tiles.forEach(function(t){var ok=Object.keys(f).every(function(k){return (k==='style'?t.dataset.style:t.dataset[k])===f[k]});t.hidden=!ok;if(ok)n++});
  var so=$('select[data-sort]',fb).value;tiles.slice().sort(function(a,b){return so==='n'?a.dataset.n.localeCompare(b.dataset.n):(+a.dataset.i)-(+b.dataset.i)}).forEach(function(t){gridEl.appendChild(t)});
  $('.fcount',fb).textContent=n+' designs'}
 $$('select',fb).forEach(function(x){x.addEventListener('change',apply)});apply()}
var D=null;function data(cb){if(D)return cb(D);fetch('/cards/templates.json').then(function(r){return r.json()}).then(function(d){D=d;cb(d)})}
function svgFor(it,d){var t=null;d.templates.some(function(x){if(x.id===it.design){t=Object.assign({},x);return true}});if(!t)return'';var pal=null;d.templates.some(function(x){if(x.palette===it.palette){pal=x.pal;return true}});if(pal)t.pal=pal;
 var s=TCHCards.render(t,{headline:it.headline,sub:it.sub,font:it.font,photo:it.photo});if(it.size==='square')s=s.replace('<svg ','<svg preserveAspectRatio="xMidYMid slice" ').replace('viewBox="0 0 500 700"','viewBox="0 100 500 500"');return s}
// ===== editor
if($('#ed'))data(function(d){var T=d.templates,byId={},pals={};T.forEach(function(t){byId[t.id]=t;pals[t.palette]=t.pal});
 var q=new URLSearchParams(location.search),cur=byId[q.get('d')]||byId[$('#f-design').getAttribute('data-default')]||T[0],photo=null,sd=$('#f-design'),sp=$('#f-pal');
 sd.innerHTML='';T.forEach(function(t){var o=document.createElement('option');o.value=t.id;o.textContent=t.name;sd.appendChild(o)});
 Object.keys(pals).forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=k.charAt(0).toUpperCase()+k.slice(1);sp.appendChild(o)});
 function val(n){var r=$('input[name='+n+']:checked');return r?r.value:null}
 function item(){return{design:cur.id,name:cur.name,size:val('size'),speed:val('speed'),headline:$('#f-head').value,sub:$('#f-sub').value,font:$('#f-font').value,palette:sp.value,photo:photo,msg:$('#f-msg').value,ifont:$('#f-ifont').value}}
 function load(t){cur=t;sd.value=t.id;$('#f-head').value=t.headline;$('#f-sub').value=(t.kicker!=null?t.kicker:t.sub)||'';$('#f-font').value=t.font;sp.value=t.palette;$('#f-msg').value=t.inside;draw()}
 function draw(){var it=item();$('#pv-front').innerHTML=svgFor(it,d);$('#pv-front').classList.toggle('sq',it.size==='square');$('#ins-text').textContent=it.msg;$('#ins-text').style.fontFamily=IF[it.ifont];
  $('#f-count').textContent=(255-it.msg.length)+' characters left';$('#f-price').innerHTML=money(d.prices[it.size][it.speed])+' <small>card + delivery to one UK address</small>';
  $('#pv-note').textContent=d.sizes[it.size].label+' '+d.sizes[it.size].dims+(it.size==='square'?' (top and bottom of the design are trimmed to square)':'')}
 $$('#ed input,#ed select,#ed textarea').forEach(function(e){if(e.id!=='f-photo'&&e.id!=='f-design')e.addEventListener('input',draw);e.addEventListener('change',draw)});
 sd.addEventListener('change',function(){load(byId[sd.value]);history.replaceState(null,'','?d='+sd.value)});
 $('#f-photo').addEventListener('change',function(e){var f=e.target.files[0];if(!f)return;var img=new Image();img.onload=function(){var c=document.createElement('canvas'),s=Math.min(1,1400/Math.max(img.width,img.height));c.width=img.width*s;c.height=img.height*s;c.getContext('2d').drawImage(img,0,0,c.width,c.height);photo=c.toDataURL('image/jpeg',.82);draw()};img.src=URL.createObjectURL(f)});
 $$('.ed-tabs button').forEach(function(b){b.onclick=function(){$$('.ed-tabs button').forEach(function(x){x.classList.remove('on')});b.classList.add('on');$('#pv-front').hidden=b.dataset.v!=='front';$('#pv-inside').hidden=b.dataset.v!=='inside'}});
 $('#f-add').onclick=function(){var b=getB(),it=item(),same=b.filter(function(x){return x.size===it.size&&x.speed===it.speed}).length;if(same>=d.maxq){if(confirm('Checkout takes up to '+d.maxq+' cards of the same size and delivery per payment. For more, send a free bulk request and we reply with a fixed quote within 1 working day. Open the bulk order form?'))location.href='/cards/bulk/';return}b.push(it);if(setB(b))location.href='/cards/basket/'};
 load(cur)});
// ===== basket
if($('#basket'))data(function(d){var box=$('#basket');
 function groups(b){var g={};b.forEach(function(it,i){var k=it.size+'|'+it.speed;(g[k]=g[k]||[]).push(i)});return g}
 function render(){var b=getB();if(!b.length){box.innerHTML='<p>Your basket is empty. <a href="/cards/">Find a card</a>.</p>';return}
  var g=groups(b),h='';Object.keys(g).forEach(function(k){var p=k.split('|'),n=g[k].length,price=d.prices[p[0]][p[1]];
   h+='<div class="bgroup"><h2>'+esc(d.sizes[p[0]].label)+', '+esc(d.speeds[p[1]].label)+'</h2>';
   g[k].forEach(function(i){var it=b[i];h+='<div class="bitem">'+svgFor(it,d)+'<div><b>'+esc(it.headline)+'</b><br><small>'+esc(it.name)+'</small><br><small>Inside: '+esc(it.msg).slice(0,80)+'</small></div><div>'+money(price)+'<br><button data-rm="'+i+'">Remove</button> <a href="/cards/create/?d='+it.design+'">Add another</a></div></div>'});
   h+=(n>=d.maxq?'<p class="small">That is the most for one payment. Need more? <a href="/cards/bulk/">Bulk orders (6+ cards)</a>.</p>':'')+'<p><b>'+n+' card'+(n>1?'s':'')+': '+money(price*n)+'</b> including delivery to one address.</p><button class="btn wide" data-go="'+k+'">Check proof and pay</button></div>'});
  if(Object.keys(g).length>1)h='<p class="small">Cards with different sizes or delivery speeds are paid in separate payments.</p>'+h;
  box.innerHTML=h;$$('[data-rm]',box).forEach(function(x){x.onclick=function(){var b=getB();b.splice(+x.dataset.rm,1);setB(b);render()}});
  $$('[data-go]',box).forEach(function(x){x.onclick=function(){proof(x.dataset.go)}})}
 function proof(k){var b=getB(),idx=groups(b)[k],h='';idx.forEach(function(i){var it=b[i];h+='<div class="pitem">'+svgFor(it,d)+'<div class="pins" style="font-family:'+IF[it.ifont]+'">'+esc(it.msg)+'</div></div>'});
  $('#proof-items').innerHTML=h;$('#proof').hidden=false;$('#proof-ok').checked=false;$('#proof-pay').disabled=true;
  var n=idx.length,pr=d.prices[k.split('|')[0]][k.split('|')[1]];$('#proof-note').textContent='Secure payment page will show '+n+' x '+money(pr)+' = '+money(pr*n)+'. The quantity is fixed to match your basket.';
  $('#proof-ok').onchange=function(){$('#proof-pay').disabled=!this.checked};
  $('#proof-back').onclick=function(){$('#proof').hidden=true};
  $('#proof-pay').onclick=function(){var btn=this;btn.disabled=true;btn.textContent='Saving your cards...';
   var code='TCH-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase(),email=$('#proof-email').value.trim(),items=idx.map(function(i){return b[i]});
   var payload={_subject:'Card order '+code,_captcha:'false',_template:'box',order:code,email:email,size:k.split('|')[0],speed:k.split('|')[1],count:items.length,expected_total_pence:Math.round(d.prices[k.split('|')[0]][k.split('|')[1]]*100)*items.length,
    cards:JSON.stringify(items.map(function(it){var c=Object.assign({},it);delete c.photo;c.hasPhoto=!!it.photo;return c}))};
   localStorage.setItem('tchlast',JSON.stringify({code:code,group:k,count:items.length,total:Math.round(d.prices[k.split('|')[0]][k.split('|')[1]]*100)*items.length,expected_total_pence:Math.round(d.prices[k.split('|')[0]][k.split('|')[1]]*100)*items.length,email:email,t:Date.now()}));
   function go(){var u=d.links[k+'|'+items.length]+'?client_reference_id='+encodeURIComponent(code);if(email)u+='&prefilled_email='+encodeURIComponent(email);location.href=u}
   fetch(d.form,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)}).catch(function(){});
   go()}}
 render()});
// ===== thanks
var ty=$('#ty');if(ty){try{var o=JSON.parse(localStorage.getItem('tchlast')||'null'),sid=new URLSearchParams(location.search).get('session_id')||'';
 if(o){ty.innerHTML='<p><b>Your order code:</b> '+esc(o.code)+'</p>';
  if(!o.paid){fetch('https://formsubmit.co/ajax/5ef8df14e630d4e3ca45379413bfa61b',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({_subject:'Card order PAID '+o.code,_captcha:'false',order:o.code,stripe_session:sid,count:o.count,expected_total_pence:o.total})}).catch(function(){});
   var b=getB().filter(function(it){return it.size+'|'+it.speed!==o.group});setB(b);o.paid=true;localStorage.setItem('tchlast',JSON.stringify(o))}
  if(getB().length)ty.innerHTML+='<p>You still have cards in your <a href="/cards/basket/">basket</a> for a different size or delivery speed.</p>'}}catch(e){}}
})();
(function(){var n=document.querySelector('.shopnav'),c=n&&n.querySelector('.cw');if(!c)return;function u(){n.classList.toggle('end',c.scrollLeft+c.clientWidth>=c.scrollWidth-4)}c.addEventListener('scroll',u,{passive:true});addEventListener('resize',u);u()})();
