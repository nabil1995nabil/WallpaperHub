// =========================================================
// WallpaperHub — All Wallpapers / Premium UI
// =========================================================

const API_URL = "/api/wallpapers";

function getImageUrl(imagePath){
    if(!imagePath) return "/assets/logo/no-image.png";

    const value = String(imagePath).trim();

    if(/^https?:\/\//i.test(value)) return value;
    if(value.startsWith("/")) return value;
    if(value.startsWith("assets/")) return "/" + value;

    return "/assets/wallpapers/" + value.replace(/^\/+/, "");
}

const wallpapersGrid = document.getElementById("wallpapersGrid");
const pageTitle = document.getElementById("pageTitle");
const wallpaperCount = document.getElementById("wallpaperCount");
const loading = document.getElementById("loading");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const searchBox = document.getElementById("searchBox");
const backBtn = document.getElementById("backBtn");
const scrollTopBtn = document.getElementById("scrollTop");
const advancedFilterBtn = document.getElementById("advancedFilterBtn");
const sortSelect = document.getElementById("sortSelect");
const gridViewBtn = document.getElementById("gridViewBtn");
const compactViewBtn = document.getElementById("compactViewBtn");
const filterButtons = document.querySelectorAll(".filter-btn");

const params = new URLSearchParams(location.search);
const type = params.get("type");
const category = params.get("category");

let allWallpapers = [];
let pageWallpapers = [];
let visibleWallpapers = [];
let currentFilter = "all";
let currentView = "grid";

const categoryNames = {
    all:"جميع الخلفيات",
    nature:"🌿 خلفيات الطبيعة",
    cars:"🚗 خلفيات السيارات",
    games:"🎮 خلفيات الألعاب",
    space:"🌌 خلفيات الفضاء",
    ai:"🤖 خلفيات الذكاء الاصطناعي",
    amoled:"📱 خلفيات AMOLED",
    animals:"🐱 خلفيات الحيوانات",
    anime:"🌀 خلفيات الأنمي",
    city:"🏙️ خلفيات المدن",
    dark:"🖤 الخلفيات الداكنة",
    "4k":"💎 خلفيات 4K",
    sports:"⚽ خلفيات الرياضة",
    minimal:"✨ خلفيات Minimal"
};

const typeNames = {
    popular:"🔥 الأكثر شعبية",
    latest:"🆕 أحدث الخلفيات",
    downloaded:"🔥 الأكثر تحميلاً",
    liked:"❤️ الأكثر إعجاباً",
    recommended:"⭐ المقترحة لك"
};

function normalizeText(value){
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[أإآ]/g,"ا")
        .replace(/ة/g,"ه")
        .replace(/ى/g,"ي");
}

function getCategory(wallpaper){
    return normalizeText(wallpaper?.category);
}

function categoryMatches(wallpaper, target){
    const value = getCategory(wallpaper);
    const wanted = normalizeText(target);

    if(value === wanted) return true;

    const aliases = {
        space:["spaces","galaxy","astronomy","فضاء"],
        nature:["nature","natural","طبيعه","طبيعة"],
        cars:["car","cars","vehicle","سيارات"],
        anime:["anime","انمي","أنمي"],
        dark:["dark","داكن","داكنه"],
        city:["city","cities","مدن","مدينه"],
        sports:["sport","sports","رياضه","رياضة"],
        minimal:["minimal","بسيط","مينيمال"]
    };

    return (aliases[wanted] || []).some(alias => value === normalizeText(alias));
}

function getQuality(resolution){
    if(!resolution) return "HD";

    const numbers = String(resolution).match(/\d+/g);
    if(!numbers || numbers.length < 2) return "HD";

    const width = Number(numbers[0]);
    const height = Number(numbers[1]);
    const maxSide = Math.max(width,height);
    const minSide = Math.min(width,height);

    if(maxSide >= 3840 || minSide >= 2160) return "4K";
    if(maxSide >= 2560 || minSide >= 1440) return "2K";
    if(maxSide >= 1920 || minSide >= 1080) return "FHD";
    return "HD";
}

function formatNumber(value){
    const number = Number(value || 0);
    if(!Number.isFinite(number)) return "0";
    if(number >= 1000000) return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`;
    if(number >= 1000) return `${(number / 1000).toFixed(number >= 100000 ? 0 : 1)}K`;
    return number.toLocaleString("ar-MA");
}

function escapeHTML(value){
    return String(value ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}

async function loadWallpapers(){
    loading.style.display = "flex";
    emptyState.style.display = "none";

    try{
        const response = await fetch(API_URL,{headers:{Accept:"application/json"}});
        if(!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        allWallpapers = Array.isArray(data) ? data : [];

        preparePage();
        applyFilters();
        syncFavoritesOnLogin().catch(()=>{});
    }catch(error){
        console.error("Wallpaper load error:",error);
        loading.style.display = "none";
        wallpapersGrid.innerHTML = "";
        emptyState.style.display = "block";
        emptyState.querySelector("h3").textContent = "تعذر تحميل الخلفيات";
        emptyState.querySelector("p").textContent = "تأكد أن السيرفر يعمل ثم حاول مرة أخرى.";
    }
}

function preparePage(){
    pageWallpapers = [...allWallpapers];

    if(category){
        if(normalizeText(category) !== "all"){
            pageWallpapers = pageWallpapers.filter(wallpaper => categoryMatches(wallpaper,category));
        }
        pageTitle.textContent = categoryNames[category] || "الخلفيات";
        return;
    }

    if(type === "latest"){
        pageTitle.textContent = typeNames.latest;
        pageWallpapers.sort((a,b) => Number(b.id || 0) - Number(a.id || 0));
        return;
    }

    if(type === "popular"){
        pageTitle.textContent = typeNames.popular;
        pageWallpapers = pageWallpapers.filter(wallpaper => wallpaper.popular === true || wallpaper.popular === "true");
        return;
    }

    if(type === "downloaded"){
        pageTitle.textContent = typeNames.downloaded;
        pageWallpapers = pageWallpapers.filter(wallpaper => Number(wallpaper.downloads || 0) > 0);
        pageWallpapers.sort((a,b) => Number(b.downloads || 0) - Number(a.downloads || 0));
        return;
    }

    if(type === "liked"){
        pageTitle.textContent = typeNames.liked;
        pageWallpapers = pageWallpapers.filter(wallpaper => Number(wallpaper.likes || 0) > 0);
        pageWallpapers.sort((a,b) => Number(b.likes || 0) - Number(a.likes || 0));
        return;
    }

    if(type === "recommended"){
        pageTitle.textContent = typeNames.recommended;
        pageWallpapers.sort((a,b) => {
            const scoreA = Number(a.rating || 0) * 10 + Number(a.downloads || 0) + (a.popular ? 50 : 0);
            const scoreB = Number(b.rating || 0) * 10 + Number(b.downloads || 0) + (b.popular ? 50 : 0);
            return scoreB - scoreA;
        });
        return;
    }

    pageTitle.textContent = "جميع الخلفيات";
}

function applySort(list){
    const sort = sortSelect?.value || "default";
    if(sort === "latest") list.sort((a,b) => Number(b.id || 0) - Number(a.id || 0));
    if(sort === "downloads") list.sort((a,b) => Number(b.downloads || 0) - Number(a.downloads || 0));
    if(sort === "rating") list.sort((a,b) => Number(b.rating || 0) - Number(a.rating || 0));
    if(sort === "likes") list.sort((a,b) => Number(b.likes || 0) - Number(a.likes || 0));
}

function applyFilters(){
    visibleWallpapers = [...pageWallpapers];

    const search = normalizeText(searchInput.value);
    if(search){
        visibleWallpapers = visibleWallpapers.filter(wallpaper => {
            const title = normalizeText(wallpaper.title);
            const tags = Array.isArray(wallpaper.tags)
                ? normalizeText(wallpaper.tags.join(" "))
                : normalizeText(wallpaper.tags);
            const wallCategory = normalizeText(wallpaper.category);
            return title.includes(search) || tags.includes(search) || wallCategory.includes(search);
        });
    }

    if(currentFilter === "4k"){
        visibleWallpapers = visibleWallpapers.filter(wallpaper => getQuality(wallpaper.resolution) === "4K");
    }else if(currentFilter === "downloads"){
        visibleWallpapers.sort((a,b) => Number(b.downloads || 0) - Number(a.downloads || 0));
    }else if(currentFilter === "rating"){
        visibleWallpapers.sort((a,b) => Number(b.rating || 0) - Number(a.rating || 0));
    }else if(["anime","city","dark","sports","minimal","nature","cars","space"].includes(currentFilter)){
        visibleWallpapers = visibleWallpapers.filter(wallpaper => categoryMatches(wallpaper,currentFilter));
    }

    applySort(visibleWallpapers);
    renderWallpapers();
}

function createIcon(name,className=""){
    const span = document.createElement("span");
    span.className = `material-icons ${className}`.trim();
    span.textContent = name;
    return span;
}

function renderWallpapers(){
    loading.style.display = "none";
    wallpapersGrid.innerHTML = "";
    wallpaperCount.textContent = `${visibleWallpapers.length.toLocaleString("ar-MA")} خلفية`;

    if(!visibleWallpapers.length){
        emptyState.style.display = "block";
        return;
    }

    emptyState.style.display = "none";

    visibleWallpapers.forEach((wallpaper,index) => {
        const card = document.createElement("article");
        card.className = "wallpaper-card";
        card.style.animationDelay = `${Math.min(index * 18,180)}ms`;
        card.dataset.id = String(wallpaper.id ?? "");

        const quality = getQuality(wallpaper.resolution);
        const image = document.createElement("img");
        image.src = getImageUrl(wallpaper.thumbnail || wallpaper.image || "");
        image.alt = String(wallpaper.title || "Wallpaper");
        image.loading = "lazy";
        image.decoding = "async";
        image.addEventListener("error",() => {
            image.src = "/assets/logo/no-image.png";
            image.classList.add("image-error");
        },{once:true});

        const qualityBadge = document.createElement("span");
        qualityBadge.className = "quality-badge";
        qualityBadge.textContent = quality;

        const favoriteButton = document.createElement("button");
        favoriteButton.type = "button";
        favoriteButton.className = "card-favorite";
        favoriteButton.setAttribute("aria-label",isFavorite(wallpaper.id) ? "إزالة من المفضلة" : "إضافة إلى المفضلة");
        updateFavoriteButton(favoriteButton,wallpaper.id);

        favoriteButton.addEventListener("click",event => {
            event.stopPropagation();
            toggleFavorite(wallpaper.id,favoriteButton);
        });

        const overlay = document.createElement("div");
        overlay.className = "wallpaper-overlay";

        const title = document.createElement("div");
        title.className = "wallpaper-title";
        title.textContent = wallpaper.title || "Wallpaper";

        const meta = document.createElement("div");
        meta.className = "wallpaper-meta";

        const resolution = document.createElement("span");
        resolution.className = "wallpaper-resolution";
        resolution.textContent = wallpaper.resolution || quality;

        const stats = document.createElement("div");
        stats.className = "wallpaper-stats";

        const downloads = document.createElement("span");
        downloads.className = "wallpaper-stat";
        downloads.append(createIcon("file_download"));
        downloads.append(document.createTextNode(formatNumber(wallpaper.downloads)));

        const likes = document.createElement("span");
        likes.className = "wallpaper-stat";
        likes.append(createIcon("favorite"));
        likes.append(document.createTextNode(formatNumber(wallpaper.likes)));

        stats.append(downloads,likes);
        meta.append(resolution,stats);
        overlay.append(title,meta);
        card.append(image,qualityBadge,favoriteButton,overlay);

        card.addEventListener("click",() => {
            localStorage.setItem("selectedWallpaper",String(wallpaper.id ?? ""));
            location.href = `wallpaper.html?id=${encodeURIComponent(wallpaper.id)}`;
        });

        wallpapersGrid.appendChild(card);
    });
}

// ============================
// المفضلة
// ============================

async function getCloudFavorites(){
    try{
        const {supabase} = await import("./supabase.js");
        const {data:sessionData} = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if(!user?.id) return null;

        const local = JSON.parse(localStorage.getItem("favorites") || "[]").map(String);
        const rows = local
            .map(id => ({user_id:user.id,wallpaper_id:Number(id)}))
            .filter(row => Number.isFinite(row.wallpaper_id));

        if(rows.length){
            await supabase.from("favorites").upsert(rows,{onConflict:"user_id,wallpaper_id",ignoreDuplicates:true});
        }

        const {data,error} = await supabase
            .from("favorites")
            .select("wallpaper_id")
            .eq("user_id",user.id);

        if(error) throw error;

        const ids = [...new Set((data || []).map(row => String(row.wallpaper_id)))];
        localStorage.setItem("favorites",JSON.stringify(ids));
        return ids;
    }catch(error){
        console.warn("CLOUD FAVORITES LOAD ERROR:",error);
        return null;
    }
}

async function saveFavoriteToCloud(id){
    const {supabase} = await import("./supabase.js");
    const {data:sessionData} = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if(!user?.id) return false;

    const {error} = await supabase.from("favorites").upsert(
        [{user_id:user.id,wallpaper_id:Number(id)}],
        {onConflict:"user_id,wallpaper_id",ignoreDuplicates:true}
    );
    if(error) throw error;
    return true;
}

async function removeFavoriteFromCloud(id){
    const {supabase} = await import("./supabase.js");
    const {data:sessionData} = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if(!user?.id) return false;

    const {error} = await supabase.from("favorites")
        .delete()
        .eq("user_id",user.id)
        .eq("wallpaper_id",Number(id));
    if(error) throw error;
    return true;
}

async function syncFavoritesOnLogin(){
    const cloud = await getCloudFavorites();
    if(cloud !== null) applyFavoriteIcons();
}

function isFavorite(id){
    try{
        return JSON.parse(localStorage.getItem("favorites") || "[]")
            .map(String)
            .includes(String(id));
    }catch(_error){
        return false;
    }
}

function updateFavoriteButton(button,id){
    const active = isFavorite(id);
    button.innerHTML = "";
    button.append(createIcon(active ? "favorite" : "favorite_border"));
    button.classList.toggle("is-favorite",active);
    button.setAttribute("aria-label",active ? "إزالة من المفضلة" : "إضافة إلى المفضلة");
}

function applyFavoriteIcons(){
    document.querySelectorAll(".card-favorite").forEach(button => {
        const card = button.closest(".wallpaper-card");
        const id = card?.dataset.id;
        if(id) updateFavoriteButton(button,id);
    });
}

async function toggleFavorite(id,button){
    const key = String(id);
    let favorites;

    try{
        favorites = JSON.parse(localStorage.getItem("favorites") || "[]").map(String);
    }catch(_error){
        favorites = [];
    }

    const wasFavorite = favorites.includes(key);

    // تحديث الواجهة فورًا حتى لا يشعر المستخدم بتأخير الشبكة.
    favorites = wasFavorite
        ? favorites.filter(item => item !== key)
        : [...favorites,key];

    localStorage.setItem("favorites",JSON.stringify([...new Set(favorites)]));
    updateFavoriteButton(button,key);

    try{
        const {supabase} = await import("./supabase.js");
        const {data:sessionData} = await supabase.auth.getSession();
        const user = sessionData?.session?.user;

        if(user?.id){
            if(wasFavorite) await removeFavoriteFromCloud(key);
            else await saveFavoriteToCloud(key);
        }
    }catch(error){
        // نعيد الحالة المحلية إذا فشلت المزامنة السحابية.
        const current = JSON.parse(localStorage.getItem("favorites") || "[]").map(String);
        const restored = wasFavorite
            ? [...new Set([...current,key])]
            : current.filter(item => item !== key);
        localStorage.setItem("favorites",JSON.stringify(restored));
        updateFavoriteButton(button,key);
        console.warn("FAVORITE SYNC ERROR:",error);
    }
}

// ============================
// البحث والفلاتر
// ============================

searchInput.addEventListener("input",applyFilters);

searchBtn.addEventListener("click",() => {
    searchInput.focus();
    searchBox.scrollIntoView({behavior:"smooth",block:"center"});
});

advancedFilterBtn?.addEventListener("click",() => {
    document.getElementById("filters")?.scrollIntoView({behavior:"smooth",block:"center"});
});

filterButtons.forEach(button => {
    button.addEventListener("click",() => {
        filterButtons.forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        currentFilter = button.dataset.filter || "all";
        applyFilters();
    });
});

sortSelect?.addEventListener("change",applyFilters);

function setView(mode){
    currentView = mode;
    wallpapersGrid.classList.toggle("compact-grid",mode === "compact");
    gridViewBtn?.classList.toggle("active",mode === "grid");
    compactViewBtn?.classList.toggle("active",mode === "compact");
}

gridViewBtn?.addEventListener("click",() => setView("grid"));
compactViewBtn?.addEventListener("click",() => setView("compact"));

backBtn.addEventListener("click",() => history.back());

window.addEventListener("scroll",() => {
    scrollTopBtn.style.display = window.scrollY > 500 ? "flex" : "none";
});

scrollTopBtn.addEventListener("click",() => {
    window.scrollTo({top:0,behavior:"smooth"});
});

// Bottom navigation is intentionally a UI layer for now.
// Routes can be connected later without changing the wallpaper grid.
document.querySelectorAll(".page-bottom-nav button").forEach(button => {
    button.addEventListener("click",() => {
        const target = button.dataset.nav;
        if(target === "explore"){
            searchInput.focus();
            searchBox.scrollIntoView({behavior:"smooth",block:"center"});
        }else if(target === "wallpapers"){
            window.scrollTo({top:0,behavior:"smooth"});
        }
    });
});

setView("grid");
loadWallpapers();
