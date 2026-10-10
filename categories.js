const categories = [...document.querySelectorAll(".category-card")];

const categoryNames = {
 all:"الكل",nature:"الطبيعة",cars:"السيارات",games:"الألعاب",space:"الفضاء",
 ai:"الذكاء الاصطناعي",amoled:"AMOLED",animals:"الحيوانات",anime:"الأنمي",
 city:"المدن",dark:"Dark","4k":"4K",sports:"الرياضة",minimal:"Minimal",
 snow:"الثلج والشتاء",aurora:"الشفق القطبي",cyberpunk:"السايبربانك",gradients:"التدرجات والألوان"
};

const searchInput=document.getElementById("categorySearch");
const clearSearch=document.getElementById("clearSearch");
const resultsCount=document.getElementById("resultsCount");
const favoritesOnlyBtn=document.getElementById("favoritesOnlyBtn");
const resetFiltersBtn=document.getElementById("resetFiltersBtn");
const noResults=document.getElementById("noResults");

let favorites=JSON.parse(localStorage.getItem("favoriteCategories")||"[]");
let favoritesOnly=false;

function normalize(v){
 return String(v||"").trim().toLowerCase()
   .replace(/[أإآ]/g,"ا").replace(/ة/g,"ه");
}

function saveFavorites(){
 localStorage.setItem("favoriteCategories",JSON.stringify(favorites));
}

function updateFavoriteUI(){
 categories.forEach(card=>{
  const on=favorites.includes(card.dataset.category);
  card.classList.toggle("is-favorite",on);
  const icon=card.querySelector(".favorite-toggle .material-icons");
  if(icon) icon.textContent=on?"star":"star_border";
 });
 favoritesOnlyBtn.classList.toggle("active",favoritesOnly);
 const icon=favoritesOnlyBtn.querySelector(".material-icons");
 if(icon) icon.textContent=favoritesOnly?"star":"star_border";
}

function applyView(){
 const q=normalize(searchInput.value);
 let visible=0;

 categories.forEach(card=>{
  const hay=normalize(`${card.dataset.category} ${card.dataset.search} ${categoryNames[card.dataset.category]||""}`);
  const show=(!q||hay.includes(q))&&(!favoritesOnly||favorites.includes(card.dataset.category));
  card.classList.toggle("is-hidden",!show);
  if(show) visible++;
 });

 resultsCount.textContent=visible;
 noResults.hidden=visible!==0;
 clearSearch.classList.toggle("visible",!!searchInput.value);
 resetFiltersBtn.classList.toggle("hidden",!q&&!favoritesOnly);
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

categories.forEach(card=>{
 card.addEventListener("click",e=>{
  if(e.target.closest(".favorite-toggle")) return;
  categories.forEach(x=>x.classList.remove("is-selected"));
  card.classList.add("is-selected");
  openCategory(card.dataset.category);
 });

 const fav=card.querySelector(".favorite-toggle");
 if(fav) fav.addEventListener("click",e=>{
  e.preventDefault();e.stopPropagation();
  const c=card.dataset.category;
  favorites=favorites.includes(c)?favorites.filter(x=>x!==c):[...favorites,c];
  saveFavorites();applyView();
 });
});

searchInput.addEventListener("input",applyView);

clearSearch.addEventListener("click",()=>{
 searchInput.value="";searchInput.focus();applyView();
});

document.querySelectorAll(".quick-filter").forEach(button=>{
 button.addEventListener("click",()=>{
  document.querySelectorAll(".quick-filter").forEach(x=>x.classList.remove("active"));
  button.classList.add("active");

  const route=button.dataset.route;
  const category=button.dataset.categoryFilter;

  if(route==="all"){
   favoritesOnly=false;searchInput.value="";applyView();return;
  }
  if(category){openCategory(category);return;}
  if(route) openRoute(route);
 });
});

favoritesOnlyBtn.addEventListener("click",()=>{
 favoritesOnly=!favoritesOnly;applyView();
});

resetFiltersBtn.addEventListener("click",()=>{
 favoritesOnly=false;searchInput.value="";
 document.querySelectorAll(".quick-filter").forEach(x=>x.classList.toggle("active",x.dataset.route==="all"));
 applyView();
});

document.getElementById("showAllBtn").addEventListener("click",()=>{
 favoritesOnly=false;searchInput.value="";applyView();
});

document.getElementById("randomCategoryBtn").addEventListener("click",()=>{
 const pool=categories.filter(c=>c.dataset.category!=="all");
 const item=pool[Math.floor(Math.random()*pool.length)];
 if(item) openCategory(item.dataset.category);
});

const last=localStorage.getItem("lastVisitedCategory");
const lastBox=document.getElementById("lastVisited");
if(last&&categoryNames[last]){
 lastBox.hidden=false;
 document.getElementById("lastVisitedName").textContent=categoryNames[last];
 document.getElementById("continueLastBtn").addEventListener("click",()=>openCategory(last));
}

const urlCategory=new URLSearchParams(location.search).get("category");
if(urlCategory) {
 const card=document.querySelector(`.category-card[data-category="${CSS.escape(urlCategory)}"]`);
 if(card) card.classList.add("is-selected");
}

updateFavoriteUI();
applyView();
