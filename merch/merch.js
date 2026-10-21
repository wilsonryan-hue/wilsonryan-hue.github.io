document.querySelectorAll('.mthumbs button').forEach(b=>b.addEventListener('click',()=>{document.getElementById('mainimg').src=b.dataset.img}));
const f=document.querySelector('form.mbuy[data-links]');
if(f){const L=JSON.parse(f.dataset.links),P=JSON.parse(f.dataset.prices),btn=document.getElementById('buybtn'),k=f.dataset.kind;
function up(){const c=f.querySelector('input[name=col]:checked'),s=f.querySelector('input[name=size]:checked');const t=s?s.dataset.tier:'std';
document.getElementById('colname').textContent=c.dataset.name;document.getElementById('price').textContent='£'+P[t];document.getElementById('mainimg').src=c.dataset.img;
let ref=k+'__'+f.dataset.id+'__'+c.value+(s?'__'+s.value:'');btn.href=L[t]+'?client_reference_id='+encodeURIComponent(ref.replace(/[^A-Za-z0-9_-]/g,'_')).slice(0,200);}
f.addEventListener('change',up);up();}
