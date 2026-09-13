import { supabase } from "./supabase.js";
const API="/api/wallpapers";
const ADMIN_CATEGORY_API="/api/admin/wallpapers";
const CATS=[['nature','🌿','الطبيعة'],['amoled','🖤','AMOLED'],['games','🎮','الألعاب'],['cars','🚗','السيارات'],['animals','🐾','الحيوانات'],['anime','🎨','الأنمي'],['space','🌌','الفضاء'],['ai','🤖','AI'],['city','🏙️','المدن'],['dark','🌑','داكن'],['4k','✨','4K'],['sports','⚽','الرياضة'],['minimal','◻️','Minimal'],['rain','🌧️','المطر'],['sunset','🌅','الغروب'],['architecture','🏛️','الهندسة'],['deep-space','🪐','Deep Space'],['wallhaven','🧩','Wallhaven'],['other','📁','أخرى']];
const CM=new Map(CATS.map(x=>[x[0],{id:x[0],icon:x[1],label:x[2]}]));
let wallpapers=[],filtered=[],selected=new Set(),editingId=null;
const $=id=>document.getElementById(id);const E={totalCount:$('totalCount'),categoryCount:$('categoryCount'),selectedCount:$('selectedCount'),syncStatus:$('syncStatus'),resultCount:$('resultCount'),searchInput:$('searchInput'),clearSearch:$('clearSearch'),categoryFilter:$('categoryFilter'),typeFilter:$('typeFilter'),sortSelect:$('sortSelect'),selectVisibleBtn:$('selectVisibleBtn'),clearSelectionBtn:$('clearSelectionBtn'),selectionHint:$('selectionHint'),bulkCategory:$('bulkCategory'),bulkMoveBtn:$('bulkMoveBtn'),categoryChips:$('categoryChips'),grid:$('wallpaperGrid'),loading:$('loadingState'),empty:$('emptyState'),refresh:$('refreshBtn'),toast:$('toast'),modal:$('moveModal'),close:$('closeModal'),cancel:$('cancelModal'),single:$('singleCategory'),confirm:$('confirmMove'),modalTitle:$('modalTitle'),modalDesc:$('modalDescription')};
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function norm(v){v=String(v??'').trim().toLowerCase();const a={'الطبيعة':'nature','أموليد':'amoled','الأنمي':'anime','أنمي':'anime','السيارات':'cars','car':'cars','الألعاب':'games','game':'games','الحيوانات':'animals','الفضاء':'space','المدن':'city'};return CM.has(v)?v:(a[v]||v||'other')}
function ci(v){return CM.get(norm(v))||{id:norm(v),icon:'📁',label:norm(v)||'أخرى'}}
function media(w){let u=esc(w.thumbnail||w.image||'/assets/logo/no-image.png');return String(w.type).toLowerCase()==='video'?`<video src="${u}" muted loop autoplay playsinline preload="metadata"></video>`:`<img src="${u}" alt="${esc(w.title||'خلفية')}" loading="lazy" decoding="async" onerror="this.src='/assets/logo/no-image.png'">`}
function populate(){const opts=CATS.map(c=>`<option value="${c[0]}">${c[1]} ${c[2]}</option>`).join('');E.bulkCategory.innerHTML='<option value="">اختر التصنيف الجديد</option>'+opts;E.single.innerHTML='<option value="">اختر التصنيف الجديد</option>'+opts;const used=[...new Set(wallpapers.map(w=>norm(w.category)))].sort();E.categoryFilter.innerHTML='<option value="all">كل التصنيفات</option>'+used.map(id=>`<option value="${esc(id)}">${ci(id).icon} ${esc(ci(id).label)}</option>`).join('')}
function chips(){const n={};wallpapers.forEach(w=>{const c=norm(w.category);n[c]=(n[c]||0)+1});E.categoryChips.innerHTML=Object.entries(n).sort((a,b)=>b[1]-a[1]).map(([id,num])=>{const c=ci(id);return`<button class="chip ${E.categoryFilter.value===id?'active':''}" data-cat="${esc(id)}">${c.icon} ${esc(c.label)} <b>${num}</b></button>`}).join('')||'<span>لا توجد تصنيفات</span>';E.categoryChips.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{E.categoryFilter.value=b.dataset.cat;apply()})}
function stats(){E.totalCount.textContent=wallpapers.length;E.categoryCount.textContent=new Set(wallpapers.map(w=>norm(w.category))).size;E.selectedCount.textContent=selected.size;E.resultCount.textContent=`${filtered.length} نتيجة`;E.selectionHint.textContent=selected.size?`تم تحديد ${selected.size} خلفية — اختر التصنيف الجديد`:'حدد خلفيات لنقلها دفعة واحدة';E.bulkCategory.disabled=!selected.size;E.bulkMoveBtn.disabled=!selected.size}
function apply(){const q=E.searchInput.value.trim().toLowerCase(),cat=E.categoryFilter.value,type=E.typeFilter.value,sort=E.sortSelect.value;filtered=wallpapers.filter(w=>{const c=norm(w.category),text=[w.id,w.title,w.category,ci(c).label,...(Array.isArray(w.tags)?w.tags:[])].join(' ').toLowerCase();return(!q||text.includes(q))&&(cat==='all'||c===cat)&&(type==='all'||String(w.type||'image').toLowerCase()===type)});filtered.sort((a,b)=>sort==='title'?String(a.title||'').localeCompare(String(b.title||''),'ar'):sort==='category'?norm(a.category).localeCompare(norm(b.category)):sort==='oldest'?Number(a.id)-Number(b.id):Number(b.id)-Number(a.id));render();stats();chips()}
function render(){E.loading.classList.add('hidden');if(!filtered.length){E.grid.innerHTML='';E.empty.classList.remove('hidden');return}E.empty.classList.add('hidden');E.grid.innerHTML=filtered.map(w=>{const id=Number(w.id),on=selected.has(id),c=ci(w.category);return`<article class="card ${on?'selected':''}"><div class="media">${media(w)}<button class="check ${on?'on':''}" data-a="select" data-id="${id}">${on?'✓':''}</button><span class="badge">${String(w.type).toLowerCase()==='video'?'VIDEO':'IMAGE'}</span></div><div class="body"><h4 class="title">${esc(w.title||'بدون عنوان')}</h4><div class="meta"><span class="cat">${c.icon} ${esc(c.label)}</span><span>#${id}</span></div><div class="actions"><button data-a="select" data-id="${id}">${on?'✓ محددة':'تحديد'}</button><button data-a="move" data-id="${id}">تغيير التصنيف</button></div></div></article>`}).join('')}
function toast(msg,type=''){E.toast.textContent=msg;E.toast.className='toast show '+type;clearTimeout(window.tt);window.tt=setTimeout(()=>E.toast.className='toast',3200)}
function open(id){const w=wallpapers.find(x=>Number(x.id)===Number(id));if(!w)return;editingId=Number(id);E.modalTitle.textContent=`تغيير تصنيف: ${w.title||'#'+w.id}`;E.modalDesc.textContent=`التصنيف الحالي: ${ci(w.category).label}. سيتم تعديل category فقط، ولن تتغير الصورة أو الـ ID أو الإحصائيات.`;E.single.value=norm(w.category);E.modal.classList.remove('hidden')}
function close(){editingId=null;E.modal.classList.add('hidden')}
function getAccessToken(){
  for(const key of Object.keys(localStorage)){
    if(!key.toLowerCase().includes('auth-token')) continue;
    try{
      const raw=localStorage.getItem(key);
      const data=JSON.parse(raw);
      const token=data?.access_token||data?.currentSession?.access_token||data?.session?.access_token;
      if(token) return token;
    }catch{}
  }
  return '';
}
async function getAdminHeaders(){
    const {data,error}=await supabase.auth.getSession();
    const token=data?.session?.access_token;
    if(error || !token) throw Error("AUTH_REQUIRED");
    return {
        "Content-Type":"application/json",
        "Authorization":`Bearer ${token}`
    };
}

async function put(id,cat){
    const headers=await getAdminHeaders();
    const r=await fetch(`/api/admin/wallpapers/${encodeURIComponent(id)}/category`,{
        method:"PATCH",
        headers,
        body:JSON.stringify({category:norm(cat)})
    });
    let d=null;
    try{d=await r.json()}catch{}
    if(!r.ok) throw Error(d?.message||d?.error||`HTTP_${r.status}`);
    return d;
}
async function singleMove(){if(!editingId)return;const cat=E.single.value;if(!cat)return toast('اختر تصنيفًا جديدًا أولًا','error');const w=wallpapers.find(x=>Number(x.id)===editingId);if(norm(w.category)===cat){close();return toast('الخلفية موجودة أصلًا في هذا التصنيف')}try{E.syncStatus.textContent='جارٍ الحفظ...';await put(editingId,cat);w.category=cat;selected.delete(editingId);saveLibraryCache();close();apply();toast('تم تغيير تصنيف الخلفية بنجاح','success')}catch(e){console.error(e);toast('فشل تغيير التصنيف. تحقق من صلاحية API.','error')}finally{E.syncStatus.textContent='جاهز'}}
async function bulk(){const cat=E.bulkCategory.value,ws=[...selected].map(id=>wallpapers.find(w=>Number(w.id)===id)).filter(Boolean).filter(w=>norm(w.category)!==cat);if(!ws.length)return toast(cat?'كل المحدد موجود أصلًا في هذا التصنيف':'اختر التصنيف الجديد أولًا','error');if(!confirm(`سيتم نقل ${ws.length} خلفية إلى "${ci(cat).label}".\nسيتم تعديل التصنيف فقط ولن تتغير IDs أو الإحصائيات.\n\nمتابعة؟`))return;let ok=0,fail=0;E.syncStatus.textContent='جارٍ الحفظ...';for(const w of ws){try{await put(w.id,cat);w.category=cat;ok++;saveLibraryCache()}catch(e){fail++;console.error(e)}}ws.forEach(w=>selected.delete(Number(w.id)));apply();E.syncStatus.textContent='جاهز';toast(fail?`تم نقل ${ok} وفشل ${fail}`:`تم نقل ${ok} خلفية بنجاح 🎉`,fail?'error':'success')}
const CACHE_KEY='wallpaperhub_organizer_library_v1';
const CACHE_TTL=5*60*1000;
function saveLibraryCache(){
  try{
    localStorage.setItem(CACHE_KEY,JSON.stringify({time:Date.now(),data:wallpapers}));
  }catch(e){console.warn('Organizer cache save failed',e)}
}
function readLibraryCache(){
  try{
    const x=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
    if(!x||!Array.isArray(x.data)) return null;
    return x;
  }catch(e){return null}
}
const PAGE_SIZE=24;
let pageOffset=0,hasMorePages=true,loadingMore=false,fullLibraryLoaded=false;
async function fetchLibraryPage(offset=0,limit=PAGE_SIZE){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),15000);
  try{
    const r=await fetch(`${API}?limit=${limit}&offset=${offset}`,{cache:'no-store',signal:ctrl.signal});
    if(!r.ok) throw Error(r.status);
    const d=await r.json();
    return {
      data:Array.isArray(d)?d.map(w=>({...w,id:Number(w.id)})):[],
      hasMore:r.headers.get('X-Has-More')==='1',
      nextOffset:Number(r.headers.get('X-Next-Offset')||offset+(Array.isArray(d)?d.length:0))
    };
  }finally{clearTimeout(timer)}
}
async function fetchLegacyAll(){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),15000);
  try{
    const r=await fetch(API,{cache:'no-store',signal:ctrl.signal});
    if(!r.ok) throw Error(r.status);
    const d=await r.json();
    return Array.isArray(d)?d.map(w=>({...w,id:Number(w.id)})):[];
  }finally{clearTimeout(timer)}
}
async function loadMore(){
  if(loadingMore||!hasMorePages||fullLibraryLoaded)return;
  loadingMore=true;
  try{
    const page=await fetchLibraryPage(pageOffset,PAGE_SIZE);
    const existing=new Set(wallpapers.map(w=>Number(w.id)));
    page.data.forEach(w=>{if(!existing.has(Number(w.id)))wallpapers.push(w)});
    pageOffset=page.nextOffset;
    hasMorePages=page.hasMore;
    if(!hasMorePages)fullLibraryLoaded=true;
    saveLibraryCache();
    populate();
    apply();
  }catch(e){
    console.warn('Organizer lazy load failed',e);
  }finally{
    loadingMore=false;
  }
}
async function load(){
  const cached=readLibraryCache();
  if(cached?.data?.length){
    wallpapers=cached.data.map(w=>({...w,id:Number(w.id)}));
    pageOffset=wallpapers.length;
    // Cached data from an older version may already contain the whole library.
    hasMorePages=false;
    fullLibraryLoaded=true;
    populate();
    apply();
    E.syncStatus.textContent='نسخة محفوظة • جاهز';
    // Verify freshness without blocking the first paint.
    try{
      const first=await fetchLibraryPage(0,PAGE_SIZE);
      if(first.data.length && Number(first.data[0]?.id)!==Number(wallpapers[0]?.id)){
        wallpapers=first.data;
        pageOffset=first.nextOffset;
        hasMorePages=first.hasMore;
        fullLibraryLoaded=!first.hasMore;
        saveLibraryCache();
        populate();
        apply();
      }
      E.syncStatus.textContent='جاهز';
    }catch(e){
      E.syncStatus.textContent='آخر نسخة محفوظة • تعذر التحديث الآن';
    }
    return;
  }

  E.loading.classList.remove('hidden');
  E.syncStatus.textContent='جاري تحميل أول دفعة...';
  try{
    const page=await fetchLibraryPage(0,PAGE_SIZE);
    wallpapers=page.data;
    pageOffset=page.nextOffset;
    hasMorePages=page.hasMore;
    fullLibraryLoaded=!page.hasMore;
    saveLibraryCache();
    populate();
    apply();
    E.syncStatus.textContent=hasMorePages?'اسحب لعرض المزيد':'جاهز';
  }catch(e){
    console.warn('Paginated API unavailable, trying legacy endpoint',e);
    try{
      const all=await fetchLegacyAll();
      wallpapers=all;
      pageOffset=all.length;
      hasMorePages=false;
      fullLibraryLoaded=true;
      saveLibraryCache();
      populate();
      apply();
      E.syncStatus.textContent='جاهز';
    }catch(err){
      console.error(err);
      wallpapers=[];filtered=[];
      E.loading.classList.add('hidden');
      E.empty.classList.remove('hidden');
      E.empty.querySelector('strong').textContent='تعذر تحميل الخلفيات';
      E.empty.querySelector('span').textContent='تحقق من تشغيل السيرفر ومسار /api/wallpapers ثم اضغط تحديث';
      E.syncStatus.textContent='فشل التحميل';
      stats();
    }
  }
}

E.grid.addEventListener('scroll',()=>{
  const nearEnd=E.grid.scrollLeft + E.grid.clientWidth >= E.grid.scrollWidth - Math.max(500,E.grid.clientWidth);
  if(nearEnd)loadMore();
});

E.searchInput.oninput=apply;E.clearSearch.onclick=()=>{E.searchInput.value='';apply();E.searchInput.focus()};E.categoryFilter.onchange=apply;E.typeFilter.onchange=apply;E.sortSelect.onchange=apply;E.selectVisibleBtn.onclick=()=>{filtered.forEach(w=>selected.add(Number(w.id)));apply()};E.clearSelectionBtn.onclick=()=>{selected.clear();apply()};E.bulkMoveBtn.onclick=bulk;E.refresh.onclick=async()=>{try{localStorage.removeItem(CACHE_KEY);wallpapers=[];filtered=[];selected.clear();pageOffset=0;hasMorePages=true;fullLibraryLoaded=false;E.syncStatus.textContent='جاري التحديث...';await load();toast('تم تحديث مكتبة الخلفيات','success')}catch(e){console.error(e)}};E.grid.onclick=e=>{const b=e.target.closest('[data-a]');if(!b)return;const id=Number(b.dataset.id);if(b.dataset.a==='select'){selected.has(id)?selected.delete(id):selected.add(id);apply()}else open(id)};E.close.onclick=close;E.cancel.onclick=close;E.confirm.onclick=singleMove;E.modal.onclick=e=>{if(e.target===E.modal)close()};document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});load();
