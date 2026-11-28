let categories = [];
let categoryCatalog = [];
let categoryNames = {all:"الكل"};
const searchInput=document.getElementById("categorySearch");
const clearSearch=document.getElementById("clearSearch");
const resultsCount=document.getElementById("resultsCount");
const favoritesOnlyBtn=document.getElementById("favoritesOnlyBtn");
const resetFiltersBtn=document.getElementById("resetFiltersBtn");
const noResults=document.getElementById("noResults");
const categoriesGrid=document.getElementById("categoriesGrid");

let favorites=[];
try{
 const stored=JSON.parse(localStorage.getItem("favoriteCategories")||"[]");
 favorites=Array.isArray(stored)?stored.map(String):[];
}catch(_){favorites=[]}
let favoritesOnly=false;

function normalize(value){
 return String(value||"").trim().toLowerCase()
  .replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي");
}
function escapeHTML(value){
 return String(value??"").replace(/[&<>"']/g,ch=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
 }[ch]));
}
function saveFavorites(){
 try{localStorage.setItem("favoriteCategories",JSON.stringify(favorites));}catch(error){console.warn("CATEGORY FAVORITES:",error);}
}

function createCategoryCard(item){
 const card=document.createElement("button");
 card.type="button";
 card.className="category-card";
 card.dataset.category=item.id;
 card.dataset.search=[item.name,item.nameEn,...(item.aliases||[])].filter(Boolean).join(" ");
 card.style.setProperty("--card-accent",item.accent||"#5479c8");
 card.style.setProperty("--card-glow",String(item.accent||"#5479c8")+"55");
 const safeName=escapeHTML(item.name);
 const icon=escapeHTML(item.icon||"category");
 const emoji=escapeHTML(item.emoji||"");
 const desc=escapeHTML(item.description||item.nameEn||"خلفيات متنوعة");
 card.innerHTML=
  '<span class="category-media">'+
   '<span class="category-image" aria-hidden="true"></span>'+
   '<span class="category-icon"><span class="material-icons">'+icon+'</span></span>'+
   '<span class="category-arrow material-icons">chevron_left</span>'+
  '</span>'+
  '<span class="category-content">'+
   '<strong>'+emoji+" "+safeName+'</strong>'+
   '<small>'+desc+'</small>'+
   '<span class="favorite-toggle" aria-label="إضافة إلى الأقسام المفضلة"><span class="material-icons">star_border</span></span>'+
  '</span>';
 const image=card.querySelector(".category-image");
 const color=item.accent||"#5479c8";
 image.style.backgroundImage=
  "radial-gradient(circle at 75% 18%, "+color+"88 0, transparent 42%),"+
  "linear-gradient(135deg, "+color+" 0%, #18243e 100%)";
 return card;
}

function createAllCard(){
 return createCategoryCard({id:"all",name:"جميع الخلفيات",nameEn:"All Wallpapers",icon:"public",emoji:"🌍",accent:"#287cff",description:"استكشف مكتبة WallpaperHub كاملة",aliases:["الكل","all","جميع الخلفيات"]});
}
function renderCategoryCards(){
 categoriesGrid.replaceChildren();
 categoriesGrid.appendChild(createAllCard());
 categoryCatalog.forEach(item=>categoriesGrid.appendChild(createCategoryCard(item)));
 categories=[...categoriesGrid.querySelectorAll(".category-card")];
 updateFavoriteUI();
}

function updateFavoriteUI(){
 categories.forEach(card=>{
  const on=favorites.includes(card.dataset.category);
  card.classList.toggle("is-favorite",on);
  const icon=card.querySelector(".favorite-toggle .material-icons");
  if(icon)icon.textContent=on?"star":"star_border";
 });
 favoritesOnlyBtn.classList.toggle("active",favoritesOnly);
 const icon=favoritesOnlyBtn.querySelector(".material-icons");
 if(icon)icon.textContent=favoritesOnly?"star":"star_border";
}

function applyView(){
 const query=normalize(searchInput.value);
 let visible=0;
 categories.forEach(card=>{
  const item=categoryCatalog.find(category=>category.id===card.dataset.category);
  const hay=normalize([card.dataset.category,card.dataset.search,categoryNames[card.dataset.category],...(item?.aliases||[])].join(" "));
  const show=(!query||hay.includes(query))&&(!favoritesOnly||favorites.includes(card.dataset.category));
  card.classList.toggle("is-hidden",!show);
  if(show)visible++;
 });
 resultsCount.textContent=visible.toLocaleString("ar-MA");
 noResults.hidden=visible!==0;
 clearSearch.classList.toggle("visible",!!searchInput.value);
 resetFiltersBtn.classList.toggle("hidden",!query&&!favoritesOnly);
 updateFavoriteUI();
}

function openCategory(category){
 localStorage.setItem("selectedCategory",category);
 localStorage.setItem("selectedCategoryName",categoryNames[category]||category);
 localStorage.setItem("lastVisitedCategory",category);
 window.location.href=category==="all"
  ?"all-wallpapers.html"
  :"all-wallpapers.html?category="+encodeURIComponent(category);
}
function openRoute(route){
 localStorage.setItem("lastWallpaperType",route);
 window.location.href="all-wallpapers.html?type="+encodeURIComponent(route);
}

function setupCategoryEvents(){
 categories.forEach(card=>{
  card.addEventListener("click",event=>{
   if(event.target.closest(".favorite-toggle"))return;
   categories.forEach(item=>item.classList.remove("is-selected"));
   card.classList.add("is-selected");
   openCategory(card.dataset.category);
  });
  const favorite=card.querySelector(".favorite-toggle");
  if(favorite)favorite.addEventListener("click",event=>{
   event.preventDefault();event.stopPropagation();
   const key=card.dataset.category;
   favorites=favorites.includes(key)?favorites.filter(item=>item!==key):[...favorites,key];
   saveFavorites();applyView();
  });
 });
}

async function initCategoryDirectory(){
 try{
  categoriesGrid.innerHTML='<div class="category-loading" role="status">جار تحميل دليل التصنيفات…</div>';
  const response=await fetch("/data/categories.json?v=20261128-catalog-2",{cache:"no-store",headers:{Accept:"application/json"}});
  if(!response.ok)throw new Error("HTTP "+response.status);
  const data=await response.json();
  if(!Array.isArray(data.categories)||!data.categories.length)throw new Error("قائمة الأقسام فارغة");
  categoryCatalog=data.categories;
  categoryNames={all:"الكل"};
  categoryCatalog.forEach(item=>categoryNames[item.id]=item.name);
  renderCategoryCards();
  setupCategoryEvents();
  const urlCategory=new URLSearchParams(location.search).get("category");
  if(urlCategory){
   const selected=categoriesGrid.querySelector('.category-card[data-category="'+CSS.escape(urlCategory)+'"]');
   if(selected)selected.classList.add("is-selected");
  }
  applyView();
  const last=localStorage.getItem("lastVisitedCategory");
  const lastBox=document.getElementById("lastVisited");
  if(last&&categoryNames[last]){
   lastBox.hidden=false;
   document.getElementById("lastVisitedName").textContent=categoryNames[last];
   document.getElementById("continueLastBtn").addEventListener("click",()=>openCategory(last));
  }
 }catch(error){
  console.error("CATEGORY DIRECTORY LOAD:",error);
  categoriesGrid.innerHTML='<div class="category-loading category-load-error">تعذر تحميل الأقسام. تحقق من الاتصال ثم أعد المحاولة.</div>';
  resultsCount.textContent="0";
 }
}

searchInput.addEventListener("input",applyView);
clearSearch.addEventListener("click",()=>{searchInput.value="";searchInput.focus();applyView();});
document.querySelectorAll(".quick-filter").forEach(button=>{
 button.addEventListener("click",()=>{
  document.querySelectorAll(".quick-filter").forEach(item=>item.classList.remove("active"));
  button.classList.add("active");
  const route=button.dataset.route;
  const category=button.dataset.categoryFilter;
  if(route==="all"){favoritesOnly=false;searchInput.value="";applyView();return;}
  if(category){openCategory(category);return;}
  if(route)openRoute(route);
 });
});
favoritesOnlyBtn.addEventListener("click",()=>{favoritesOnly=!favoritesOnly;applyView();});
resetFiltersBtn.addEventListener("click",()=>{
 favoritesOnly=false;searchInput.value="";
 document.querySelectorAll(".quick-filter").forEach(item=>item.classList.toggle("active",item.dataset.route==="all"));
 applyView();
});
document.getElementById("showAllBtn").addEventListener("click",()=>{
 favoritesOnly=false;searchInput.value="";applyView();
});
document.getElementById("randomCategoryBtn").addEventListener("click",()=>{
 if(!categories.length)return;
 const pool=categories.filter(card=>card.dataset.category!=="all");
 const chosen=pool[Math.floor(Math.random()*pool.length)];
 if(chosen)openCategory(chosen.dataset.category);
});
initCategoryDirectory();