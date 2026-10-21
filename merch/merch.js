document.querySelectorAll('.mthumbs button').forEach(b=>b.addEventListener('click',()=>{document.getElementById('mainimg').src=b.dataset.img}));
const f=document.querySelector('.mbuy');
if(f&&f.dataset.kind==='tee'){const L=JSON.parse(f.dataset.links),P=JSON.parse(f.dataset.prices),btn=document.getElementById('buybtn');
function up(){const c=f.querySelector('input[name=col]:checked'),s=f.querySelector('input[name=size]:checked');const t=s.dataset.tier;
document.getElementById('colname').textContent=c.value==='navy'?'Navy':'Black';document.getElementById('price').textContent='£'+P[t];
document.getElementById('mainimg').src=c.dataset.img;btn.href=L[t]+'?client_reference_id='+encodeURIComponent(('tee__'+f.dataset.id+'__'+c.value+'__'+s.value).replace(/[^A-Za-z0-9_-]/g,'_')).slice(0,200);}
f.addEventListener('change',up);up();}
