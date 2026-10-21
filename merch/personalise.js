(function(){const f=document.getElementById('pz'),cv=document.getElementById('pv'),k=f.dataset.kind,ctx=cv.getContext('2d');let bg=new Image();
const FS='https://formsubmit.co/ajax/5ef8df14e630d4e3ca45379413bfa61b';
function v(n){const x=f.querySelector('[name='+n+']:checked')||f.querySelector('[name='+n+']');return x?x.value:''}
function lines(){return ['l1','l2','l3'].map(n=>f.querySelector('[name='+n+']').value.trim()).filter(Boolean)}
function drawText(c,W,H,cx,cy,maxW){const L=lines(),font=v('font');if(!L.length)return;let size=Math.min(H/(L.length*1.35),maxW/5);
c.fillStyle=v('ink');c.textAlign='center';c.textBaseline='middle';
L.forEach((t,i)=>{let s=size;c.font=`${['Pacifico','Great Vibes','Caveat'].includes(font)?'':'bold '}${s}px "${font}"`;while(c.measureText(t).width>maxW&&s>8){s-=2;c.font=`${['Pacifico','Great Vibes','Caveat'].includes(font)?'':'bold '}${s}px "${font}"`}
c.fillText(t,cx,cy-(L.length-1)*size*0.62+i*size*1.24)})}
function render(){ctx.clearRect(0,0,cv.width,cv.height);if(bg.complete)ctx.drawImage(bg,0,0,cv.width,cv.height);
if(k==='tee')drawText(ctx,cv.width,190,300,330,190);else drawText(ctx,cv.width,200,272,395,200)}
function setBg(){const g=f.querySelector('[name=g]:checked');bg=new Image();bg.onload=render;bg.src=g.dataset.bg;
 if(k==='tee'){const ink=f.querySelector('[name=ink]:checked');} }
function printFile(){const c=document.createElement('canvas');if(k==='tee'){c.width=3000;c.height=3600;drawText(c.getContext('2d'),3000,2400,1500,1200,2900)}
 else{c.width=2670;c.height=1110;const x=c.getContext('2d');x.fillStyle='#ffffff';x.fillRect(0,0,2670,1110);drawText(x,2670,900,667,555,1100);drawText(x,2670,900,2002,555,1100)}return c.toDataURL('image/png')}
f.addEventListener('input',render);f.addEventListener('change',e=>{if(e.target.name==='g')setBg();else render()});
document.fonts&&document.fonts.load('bold 40px "Bebas Neue"').then(render);['Poppins','Playfair Display','Pacifico','Caveat','Great Vibes'].forEach(n=>document.fonts.load('40px "'+n+'"'));
setBg();
f.addEventListener('submit',async e=>{e.preventDefault();if(!lines().length){alert('Type at least one line');return}const msg=document.getElementById('pzmsg'),btn=document.getElementById('pzbuy');btn.disabled=true;msg.textContent='Saving your design…';
 const code='P'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,6).toUpperCase(),g=v('g'),size=k==='tee'?v('size'):'';
 const data={_subject:'Personalised '+k+' design '+code,code,kind:k,colour:g,size,font:v('font'),ink:v('ink'),line1:lines()[0]||'',line2:lines()[1]||'',line3:lines()[2]||'',email:f.querySelector('[name=email]').value,preview_note:'print file is rebuilt at full size from these fields',_captcha:'false',_template:'table'};
 try{await fetch(FS,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(data)})}catch(err){}
 const ref=(k==='tee'?'ctee__'+code+'__'+g+'__'+size:'cmug__'+code).replace(/[^A-Za-z0-9_-]/g,'_');
 location.href=f.dataset.link+'?client_reference_id='+encodeURIComponent(ref)+'&prefilled_email='+encodeURIComponent(data.email)});
})();
