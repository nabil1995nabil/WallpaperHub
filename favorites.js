const API_URL="/api/wallpapers";
const favoritesGrid=document.getElementById("favoritesGrid");
const emptyState=document.getElementById("emptyState");
const emptyTitle=document.getElementById("emptyTitle");
const emptyText=document.getElementById("emptyText");
const favoritesCountBadge=document.getElementById("favoritesCountBadge");
const visibleCount=document.getElementById("visibleCount");
const heroSummary=document.getElementById("heroSummary");
const favoriteSearch=document.getElementById("favoriteSearch");
const clearSearchBtn=document.getElementById("clearSearchBtn");
const sortSelect=document.getElementById("sortSelect");
const selectionBar=document.getElementById("selectionBar");
const selectedCount=document.getElementById("selectedCount");
const toast=document.getElementById("toast");

let wallpapers=[];
let favoriteIds=[];
let selectedIds=new Set();
let selectionMode=false;
let currentView=localStorage.getItem("favoritesView")||"grid";
let cloudUser=null;
let toastTimer=null;

function getImageUrl(path){
 if(!path)return "";
 if(/^https?:\/\//i.test(path))return path;
 return "/"+String(path).replace(/^\/+/,"");
}

function titleOf(w){
 return w.title||w.name||w.caption||w.wallpaperTitle||`خلفية #${w.id}`;
}
function categoryOf(w){
 return w.category||w.categoryName||w.type||"خلفية";
}
function metaOf(w){
 const parts=[];
 if(w.resolution)parts.push(w.resolution);
 else if(w.width&&w.height)parts.push(`${w.width}×${w.height}`);
 if(w.category||w.categoryName)parts.push(categoryOf(w));
 return parts.join(" • ")||"WallpaperHub";
}
function numeric(v){
 const n=Number(v); return Number.isFinite(n)?n:0;
}
function createdTime(w){
 const t=Date.parse(w.created_at||w.createdAt||w.date||"");
 return Number.isFinite(t)?t:numeric(w.id);
}
function popularity(w){
 return numeric(w.likes??w.likeCount??w.downloads??w.downloadCount??w.views??w.viewCount);
}
function normalize(v){
 return String(v??"").toLowerCase().trim()
   .replace(/[أإآ]/g,"ا").replace(/ة/g,"ه");
}
function getLocalIds(){
 try{return [...new Set(JSON.parse(localStorage.getItem("favorites")||"[]").map(String))]}catch{return []}
}
function setLocalIds(ids){
 favoriteIds=[...new Set(ids.map(String))];
 localStorage.setItem("favorites",JSON.stringify(favoriteIds));
}
function showToast(message){
 clearTimeout(toastTimer);toast.textContent=message;toast.classList.add("show");
 toastTimer=setTimeout(()=>toast.classList.remove("show"),2300);
}

async function getCloudFavorites(){
 try{
  const {supabase}=await import("./supabase.js");
  const {data:sessionData}=await supabase.auth.getSession();
  cloudUser=sessionData?.session?.user||null;
  if(!cloudUser?.id)return null;

  const local=getLocalIds();
  if(local.length){
   const rows=local.map(id=>({user_id:cloudUser.id,wallpaper_id:Number(id)}))
     .filter(x=>Number.isFinite(x.wallpaper_id));
   if(rows.length)await supabase.from("favorites").upsert(rows,{onConflict:"user_id,wallpaper_id",ignoreDuplicates:true});
  }

  const {data,error}=await supabase.from("favorites").select("wallpaper_id").eq("user_id",cloudUser.id);
  if(error)throw error;
  const ids=[...new Set((data||[]).map(r=>String(r.wallpaper_id)))];
  setLocalIds(ids);
  return ids;
 }catch(error){
  console.warn("CLOUD FAVORITES LOAD ERROR:",error);
  cloudUser=null;
  return null;
 }
}

async function cloudRemove(ids){
 if(!cloudUser?.id)return;
 try{
  const {supabase}=await import("./supabase.js");
  const numbers=ids.map(Number).filter(Number.isFinite);
  if(numbers.length)await supabase.from("favorites").delete().eq("user_id",cloudUser.id).in("wallpaper_id",numbers);
 }catch(error){console.warn("CLOUD FAVORITES DELETE ERROR:",error)}
}

async function cloudClear(){
 if(!cloudUser?.id)return;
 try{
  const {supabase}=await import("./supabase.js");
  await supabase.from("favorites").delete().eq("user_id",cloudUser.id);
 }catch(error){console.warn("CLOUD FAVORITES CLEAR ERROR:",error)}
}

function sortItems(items){
 const mode=sortSelect.value;
 return [...items].sort((a,b)=>{
  if(mode==="name")return normalize(titleOf(a)).localeCompare(normalize(titleOf(b)),"ar");
  if(mode==="oldest")return createdTime(a)-createdTime(b);
  if(mode==="popular")return popularity(b)-popularity(a);
  return createdTime(b)-createdTime(a);
 });
}

function filteredItems(){
 const q=normalize(favoriteSearch.value);
 return sortItems(wallpapers.filter(w=>{
  if(!favoriteIds.includes(String(w.id)))return false;
  if(!q)return true;
  return normalize(`${titleOf(w)} ${categoryOf(w)} ${w.description||""} ${w.tags||""}`).includes(q);
 }));
}

function updateViewButtons(){
 document.querySelectorAll(".view-btn").forEach(btn=>btn.classList.toggle("active",btn.dataset.view===currentView));
 favoritesGrid.classList.toggle("compact",currentView==="compact");
}

function render(){
 const items=filteredItems();
 const total=favoriteIds.length;

 favoritesCountBadge.textContent=total;
 visibleCount.textContent=items.length;
 heroSummary.textContent=total?`${total} ${total===1?"خلفية":"خلفيات"} محفوظة لديك`:"ابدأ بحفظ الخلفيات التي تعجبك";
 updateViewButtons();

 if(!total){
  favoritesGrid.innerHTML="";
  favoritesGrid.hidden=true;
  emptyState.hidden=false;
  emptyTitle.textContent="لا توجد خلفيات مفضلة";
  emptyText.textContent="احفظ أي خلفية تعجبك، وستجدها هنا جاهزة للعودة إليها في أي وقت.";
  return;
 }

 if(!items.length){
  favoritesGrid.innerHTML="";
  favoritesGrid.hidden=true;
  emptyState.hidden=false;
  emptyTitle.textContent="لا توجد نتائج";
  emptyText.textContent="لم نجد خلفية مطابقة لبحثك. جرّب كلمة أخرى أو امسح البحث.";
 }else{
  emptyState.hidden=true;
  favoritesGrid.hidden=false;
  favoritesGrid.innerHTML="";
  items.forEach((w,index)=>favoritesGrid.appendChild(createCard(w,index)));
 }
 updateSelectionUI();
}

function createCard(w,index){
 const card=document.createElement("article");
 card.className="favorite-card";
 card.dataset.id=String(w.id);
 card.style.animationDelay=`${Math.min(index*25,250)}ms`;
 if(selectedIds.has(String(w.id)))card.classList.add("selected");

 const media=document.createElement("div");media.className="favorite-media";
 const img=document.createElement("img");
 img.src=getImageUrl(w.image||w.thumbnail||w.url);
 img.alt=titleOf(w);img.loading=index<4?"eager":"lazy";img.decoding="async";
 img.onerror=()=>{img.style.display="none";media.style.background="linear-gradient(135deg,#dbe2ee,#8b98ab)"};
 media.appendChild(img);

 const check=document.createElement("button");
 check.className="card-check";check.type="button";check.setAttribute("aria-label","تحديد");
 check.innerHTML='<span class="material-icons">check</span>';
 check.addEventListener("click",e=>{e.stopPropagation();toggleSelected(w.id)});

 const top=document.createElement("div");top.className="card-top-actions";
 top.appendChild(cardTool("share","مشاركة",()=>shareWallpaper(w)));
 top.appendChild(cardTool("link","نسخ الرابط",()=>copyWallpaperLink(w)));

 const mark=document.createElement("span");mark.className="card-fav-mark";
 mark.innerHTML='<span class="material-icons">favorite</span>';

 const bottom=document.createElement("div");bottom.className="card-bottom";
 const info=document.createElement("div");info.className="card-info";
 const title=document.createElement("strong");title.className="card-title";title.textContent=titleOf(w);
 const meta=document.createElement("small");meta.className="card-meta";meta.textContent=metaOf(w);
 info.append(title,meta);

 const remove=document.createElement("button");remove.className="card-remove";remove.type="button";remove.title="إزالة من المفضلة";
 remove.innerHTML='<span class="material-icons">favorite</span>';
 remove.addEventListener("click",e=>{e.stopPropagation();removeFavorite(w.id)});

 bottom.append(info,remove);
 media.append(check,top,mark,bottom);
 card.appendChild(media);

 card.addEventListener("click",()=>{
  if(selectionMode){toggleSelected(w.id);return}
  location.href=`wallpaper.html?id=${encodeURIComponent(w.id)}`;
 });

 return card;
}

function cardTool(icon,label,handler){
 const b=document.createElement("button");b.className="card-tool";b.type="button";b.title=label;
 b.innerHTML=`<span class="material-icons">${icon}</span>`;
 b.addEventListener("click",e=>{e.stopPropagation();handler()});
 return b;
}

async function removeFavorite(id){
 const idStr=String(id);
 setLocalIds(favoriteIds.filter(x=>x!==idStr));
 selectedIds.delete(idStr);
 await cloudRemove([idStr]);
 render();showToast("تمت إزالة الخلفية من المفضلة");
}

function toggleSelected(id){
 const key=String(id);
 if(selectedIds.has(key))selectedIds.delete(key);else selectedIds.add(key);
 render();
}

function updateSelectionUI(){
 document.body.classList.toggle("selection-mode",selectionMode);
 selectionBar.hidden=!selectionMode;
 selectedCount.textContent=selectedIds.size;
 document.querySelectorAll(".favorite-card").forEach(card=>card.classList.toggle("selected",selectedIds.has(card.dataset.id)));
}

async function removeSelected(){
 const ids=[...selectedIds];
 if(!ids.length){showToast("حدد خلفية واحدة على الأقل");return}
 await removeMany(ids);
}

async function removeMany(ids){
 const set=new Set(ids.map(String));
 setLocalIds(favoriteIds.filter(id=>!set.has(id)));
 await cloudRemove(ids);
 selectedIds.clear();selectionMode=false;render();
 showToast(`تمت إزالة ${ids.length} ${ids.length===1?"خلفية":"خلفيات"}`);
}

function openConfirm(text,onConfirm){
 const modal=document.getElementById("confirmModal");
 document.getElementById("confirmText").textContent=text;
 modal.hidden=false;
 const confirm=document.getElementById("confirmModalBtn");
 const cancel=document.getElementById("cancelModalBtn");
 const close=()=>{modal.hidden=true;confirm.onclick=null;cancel.onclick=null};
 cancel.onclick=close;
 confirm.onclick=async()=>{close();await onConfirm()};
}

async function clearAll(){
 if(!favoriteIds.length)return;
 openConfirm(`سيتم حذف ${favoriteIds.length} خلفية من المفضلة. هل تريد المتابعة؟`,async()=>{
  setLocalIds([]);selectedIds.clear();selectionMode=false;
  await cloudClear();render();showToast("تم مسح المفضلة بالكامل");
 });
}

function wallpaperLink(w){
 return new URL(`wallpaper.html?id=${encodeURIComponent(w.id)}`,location.href).href;
}
async function copyWallpaperLink(w){
 try{await navigator.clipboard.writeText(wallpaperLink(w));showToast("تم نسخ رابط الخلفية")}
 catch{showToast("تعذر نسخ الرابط")}
}
async function shareWallpaper(w){
 const url=wallpaperLink(w);
 try{
  if(navigator.share)await navigator.share({title:titleOf(w),text:"خلفية من WallpaperHub",url});
  else await navigator.clipboard.writeText(url);
  if(!navigator.share)showToast("تم نسخ رابط المشاركة");
 }catch(error){if(error?.name!=="AbortError")showToast("تعذرت المشاركة")}
}
function randomWallpaper(){
 const items=filteredItems();
 if(!items.length){showToast("لا توجد خلفيات متاحة");return}
 const w=items[Math.floor(Math.random()*items.length)];
 location.href=`wallpaper.html?id=${encodeURIComponent(w.id)}`;
}

async function exportFavorites(){
 const payload={
  app:"WallpaperHub",
  type:"favorites-backup",
  version:1,
  exportedAt:new Date().toISOString(),
  favoriteIds:[...favoriteIds]
 };
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=`wallpaperhub-favorites-${new Date().toISOString().slice(0,10)}.json`;
 document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
 showToast("تم إنشاء نسخة احتياطية للمفضلة");
}

function importFavorites(file){
 const reader=new FileReader();
 reader.onload=async()=>{
  try{
   const data=JSON.parse(reader.result);
   const ids=Array.isArray(data)?data:(Array.isArray(data.favoriteIds)?data.favoriteIds:null);
   if(!ids)throw new Error("invalid");
   const merged=[...new Set([...favoriteIds,...ids.map(String)])];
   const added=merged.length-favoriteIds.length;
   setLocalIds(merged);
   if(cloudUser?.id){
    try{
     const {supabase}=await import("./supabase.js");
     const rows=merged.map(id=>({user_id:cloudUser.id,wallpaper_id:Number(id)})).filter(x=>Number.isFinite(x.wallpaper_id));
     if(rows.length)await supabase.from("favorites").upsert(rows,{onConflict:"user_id,wallpaper_id",ignoreDuplicates:true});
    }catch(e){console.warn(e)}
   }
   render();showToast(`تمت استعادة ${added} ${added===1?"خلفية":"خلفيات"}`);
  }catch{showToast("ملف النسخة الاحتياطية غير صالح")}
 };
 reader.readAsText(file);
}

async function loadFavorites(){
 try{
  await getCloudFavorites();
  const response=await fetch(API_URL,{cache:"no-store"});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const data=await response.json();
  wallpapers=Array.isArray(data)?data:(Array.isArray(data.wallpapers)?data.wallpapers:[]);
  favoriteIds=getLocalIds();
  render();
 }catch(error){
  console.error("Favorites Error:",error);
  favoriteIds=getLocalIds();
  wallpapers=[];
  render();
  showToast("تعذر تحميل الخلفيات الآن");
 }
}

favoriteSearch.addEventListener("input",()=>{
 clearSearchBtn.classList.toggle("visible",!!favoriteSearch.value);render();
});
clearSearchBtn.addEventListener("click",()=>{favoriteSearch.value="";clearSearchBtn.classList.remove("visible");render();favoriteSearch.focus()});
sortSelect.addEventListener("change",()=>{localStorage.setItem("favoritesSort",sortSelect.value);render()});

document.querySelectorAll(".view-btn").forEach(btn=>{
 btn.addEventListener("click",()=>{
  currentView=btn.dataset.view;localStorage.setItem("favoritesView",currentView);updateViewButtons();
 });
});

document.getElementById("selectModeBtn").addEventListener("click",()=>{
 selectionMode=!selectionMode;if(!selectionMode)selectedIds.clear();updateSelectionUI();
});
document.getElementById("cancelSelectionBtn").addEventListener("click",()=>{
 selectionMode=false;selectedIds.clear();updateSelectionUI();
});
document.getElementById("selectAllBtn").addEventListener("click",()=>{
 const ids=filteredItems().map(w=>String(w.id));
 if(ids.every(id=>selectedIds.has(id)))ids.forEach(id=>selectedIds.delete(id));else ids.forEach(id=>selectedIds.add(id));
 updateSelectionUI();
});
document.getElementById("removeSelectedBtn").addEventListener("click",()=>{
 if(!selectedIds.size){showToast("حدد خلفيات أولاً");return}
 openConfirm(`سيتم إزالة ${selectedIds.size} خلفية محددة. هل تريد المتابعة؟`,removeSelected);
});
document.getElementById("clearAllBtn").addEventListener("click",clearAll);

document.getElementById("randomBtn").addEventListener("click",randomWallpaper);
document.getElementById("emptyRandomBtn").addEventListener("click",()=>{
 const all=wallpapers.filter(w=>w.image||w.thumbnail||w.url);
 if(all.length)location.href=`wallpaper.html?id=${encodeURIComponent(all[Math.floor(Math.random()*all.length)].id)}`;
 else location.href="home.html";
});
document.getElementById("exploreBtn").addEventListener("click",()=>location.href="home.html");

document.getElementById("exportBtn").addEventListener("click",exportFavorites);
document.getElementById("importBtn").addEventListener("click",()=>document.getElementById("importFile").click());
document.getElementById("importFile").addEventListener("change",e=>{
 const file=e.target.files?.[0];if(file)importFavorites(file);e.target.value="";
});

window.addEventListener("storage",loadFavorites);
window.addEventListener("wallpaperhub:user-synced",loadFavorites);

sortSelect.value=localStorage.getItem("favoritesSort")||"newest";
updateViewButtons();
loadFavorites();
