(function(){
function $(s){return document.querySelector(s)}
var ed=$('#ed');if(ed){fetch('/cards/templates.json').then(function(r){return r.json()}).then(init)}
var ty=$('#ty');if(ty){try{var o=JSON.parse(localStorage.getItem('tchcard')||'null');if(o){ty.innerHTML='<p><b>Your card code:</b> '+o.code+'</p>'+(o.hasPhoto?'<p><a class="btn" href="mailto:tchworks.shop@agentmail.to?subject='+encodeURIComponent('Card photo '+o.code)+'&body='+encodeURIComponent('Photo attached for card '+o.code+'. Stripe session: '+(new URLSearchParams(location.search).get('session_id')||''))+'">Email us your photo</a></p><p class="small">Attach the same photo you used in the designer. We print as soon as it arrives.</p>':'');}}catch(e){}}
function init(d){var T=d.templates,byId={},pals={};T.forEach(function(t){byId[t.id]=t;pals[t.palette]=t.pal});
var q=new URLSearchParams(location.search),cur=byId[q.get('d')]||T[0],photo=null;
var sd=$('#f-design');T.forEach(function(t){var o=document.createElement('option');o.value=t.id;o.textContent=t.occ.replace(/-/g,' ')+': '+t.headline;sd.appendChild(o)});
var sp=$('#f-pal');Object.keys(pals).forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=k.charAt(0).toUpperCase()+k.slice(1);sp.appendChild(o)});
function load(t){cur=t;sd.value=t.id;$('#f-head').value=t.headline;$('#f-sub').value=t.sub||'';$('#f-font').value=t.font;sp.value=t.palette;$('#f-msg').value=t.inside;draw()}
function state(){var t=Object.assign({},cur);t.pal=pals[sp.value];return t}
function draw(){var t=state();$('#pv-front').innerHTML=TCHCards.render(t,{headline:$('#f-head').value,sub:$('#f-sub').value,font:$('#f-font').value,photo:photo});$('#ins-text').textContent=$('#f-msg').value;$('#f-count').textContent=(255-$('#f-msg').value.length)+' characters left';$('#paste').hidden=true}
['#f-head','#f-sub','#f-font','#f-msg','#f-pal'].forEach(function(s){$(s).addEventListener('input',draw)});
sd.addEventListener('change',function(){load(byId[sd.value]);history.replaceState(null,'','?d='+sd.value)});
$('#f-photo').addEventListener('change',function(e){var f=e.target.files[0];if(!f)return;var img=new Image();img.onload=function(){var c=document.createElement('canvas'),s=Math.min(1,1200/Math.max(img.width,img.height));c.width=img.width*s;c.height=img.height*s;c.getContext('2d').drawImage(img,0,0,c.width,c.height);photo=c.toDataURL('image/jpeg',.85);draw()};img.src=URL.createObjectURL(f)});
document.querySelectorAll('.ed-tabs button').forEach(function(b){b.onclick=function(){document.querySelectorAll('.ed-tabs button').forEach(function(x){x.classList.remove('on')});b.classList.add('on');$('#pv-front').hidden=b.dataset.v!=='front';$('#pv-inside').hidden=b.dataset.v!=='inside'}});
$('#f-buy').onclick=function(){var code=cur.id+'__'+$('#f-font').value+'__'+sp.value+(photo?'__photo':''),front=$('#f-head').value+($('#f-sub').value?' | '+$('#f-sub').value:''),msg=$('#f-msg').value;
$('#c-code').textContent=code;$('#c-front').textContent=front;$('#c-msg').textContent=msg;
localStorage.setItem('tchcard',JSON.stringify({code:code,front:front,msg:msg,hasPhoto:!!photo,t:Date.now()}));
$('#f-pay').href=d.pay+'?client_reference_id='+encodeURIComponent(code.replace(/[^A-Za-z0-9_-]/g,'_')).slice(0,200);
if(navigator.clipboard)navigator.clipboard.writeText(code).catch(function(){});$('#paste').hidden=false;$('#paste').scrollIntoView({behavior:'smooth'})};
document.querySelectorAll('[data-copy]').forEach(function(b){b.onclick=function(){navigator.clipboard&&navigator.clipboard.writeText($('#c-'+b.dataset.copy).textContent);b.textContent='Copied'}});
load(cur)}
})();
