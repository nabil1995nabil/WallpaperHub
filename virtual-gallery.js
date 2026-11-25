const stage=document.getElementById("vgStage");
const room=document.getElementById("vgRoom");
const artworks=document.getElementById("vgArtworks");
const grid=document.getElementById("vgCollectionGrid");
const count=document.getElementById("vgCount");
const loadMore=document.getElementById("vgLoadMore");
let offset=0,hasMore=true,items=[],yaw=0,dragStart=null,loading=false;
const $=id=>document.getElementById(id);
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
function cardHtml(item){return '<a class="vg-collection-card" href="/wallpaper.html?id='+encodeURIComponent(item.id)+'"><img loading="lazy" decoding="async" src="'+escapeHtml(item.image)+'" alt="'+escapeHtml(item.title)+'"><strong>'+escapeHtml(item.title)+'</strong><small>'+escapeHtml(item.category)+' · '+escapeHtml(item.author)+'</small></a>';}
function render(){
 count.textContent=items.length+" عمل معروض";
 const featured=items.slice(0,9);
 artworks.innerHTML=featured.length?featured.map(item=>'<a class="vg-art-frame" href="/wallpaper.html?id='+encodeURIComponent(item.id)+'" aria-label="فتح '+escapeHtml(item.title)+'"><img class="vg-art-image" loading="lazy" decoding="async" src="'+escapeHtml(item.image)+'" alt="'+escapeHtml(item.title)+'"><div class="vg-art-caption">'+escapeHtml(item.title)+'</div></a>').join(""):'<div class="vg-loading">لا توجد أعمال متاحة للعرض حالياً.</div>';
 grid.innerHTML=items.length?items.map(cardHtml).join(""):'<div class="vg-empty">لم نعثر على أعمال منشورة متاحة للعرض حالياً.</div>';
 loadMore.hidden=!hasMore;
}
async function load(reset=false){
 if(loading)return;loading=true;
 if(reset){offset=0;items=[];hasMore=true;grid.innerHTML='<div class="vg-empty">جارٍ تحميل الأعمال…</div>';}
 try{
  const response=await fetch("/api/virtual-gallery?limit=12&offset="+offset,{cache:"no-store"});
  const payload=await response.json();
  if(!response.ok||!payload.success)throw new Error(payload.message||"Gallery load failed");
  items=reset?payload.items:items.concat(payload.items||[]);
  offset=Number(payload.nextOffset||offset+(payload.items||[]).length);
  hasMore=Boolean(payload.hasMore);
  render();
 }catch(error){console.error("VIRTUAL GALLERY:",error);if(!items.length){grid.innerHTML='<div class="vg-empty">تعذر فتح المعرض. أعد المحاولة بعد قليل.</div>';artworks.innerHTML='<div class="vg-loading">تعذر تجهيز القاعة.</div>';}}
 finally{loading=false;}
}
function rotate(direction){yaw=Math.max(-44,Math.min(44,yaw+direction*12));room.style.setProperty("--yaw",yaw+"deg");}
$("vgPrev").addEventListener("click",()=>rotate(1));
$("vgNext").addEventListener("click",()=>rotate(-1));
$("vgRefresh").addEventListener("click",()=>load(true));
loadMore.addEventListener("click",()=>load(false));
$("vgFullscreen").addEventListener("click",async()=>{
 document.body.classList.toggle("is-immersive");
 if(!document.fullscreenElement&&stage.requestFullscreen){try{await stage.requestFullscreen();}catch(error){console.info("Fullscreen unavailable",error);}}
 else if(document.fullscreenElement&&document.exitFullscreen){await document.exitFullscreen();}
});
stage.addEventListener("pointerdown",event=>{dragStart={x:event.clientX,yaw};stage.setPointerCapture?.(event.pointerId);});
stage.addEventListener("pointerup",event=>{if(!dragStart)return;const dx=event.clientX-dragStart.x;if(Math.abs(dx)>18)rotate(dx>0?1:-1);dragStart=null;});
stage.addEventListener("pointercancel",()=>{dragStart=null;});
window.addEventListener("keydown",event=>{if(event.key==="ArrowLeft")rotate(-1);if(event.key==="ArrowRight")rotate(1);});
load(true);
