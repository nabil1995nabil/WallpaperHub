console.log("HOME JS LOADED");

// =======================================
// WallpaperHub Home
// =======================================

function getImageUrl(image) {
    if(!image) return "/assets/logo/no-image.png";
    const value=String(image).trim();
    if(/^(https?:|data:|blob:|\/\/)/i.test(value) || value.startsWith("/")) return window.WallpaperHubSettings?.optimizeImageUrl(value) || value;
    if(value.startsWith("assets/")) return value;
    return "assets/wallpapers/" + value;
}

function escapeHomeHtml(value){
    return String(value ?? "").replace(/[&<>"']/g,character=>({
        "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[character]));
}

// =======================================
// Detect Video Wallpaper// =======================================
// Detect Video Wallpaper
// =======================================

function isVideoMedia(wallpaper){

    if(!wallpaper)
        return false;


    if(wallpaper.type === "video")
        return true;


    const url =
    String(wallpaper.image || "")
    .toLowerCase();


    return [
        ".mp4",
        ".webm",
        ".mov",
        ".m3u8"
    ].some(ext =>
        url.includes(ext)
    );

}




function isGifMedia(wallpaper){
    if(!wallpaper) return false;
    const type = String(wallpaper.type || "").toLowerCase();
    if(type === "gif") return true;
    return String(wallpaper.image || "").toLowerCase().includes(".gif");
}



let wallpapers = [];
let personalizedRecommendations = [];
let recommendationsLoaded = false;
let popularWallpaperCache = [];
let likedWallpaperCache = [];

function getSupabaseAccessTokenFromBrowser(){
    try{
        // Supabase JS يخزن جلسة المصادقة في localStorage بمفتاح يبدأ بـ sb-.
        for(let i=0; i<localStorage.length; i++){
            const key = localStorage.key(i) || "";
            if(!key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;

            const raw = localStorage.getItem(key);
            if(!raw) continue;

            const session = JSON.parse(raw);
            const token = String(
                session?.access_token ||
                session?.currentSession?.access_token ||
                ""
            ).trim();

            if(token) return token;
        }
    }catch(error){
        console.warn("AUTH TOKEN READ ERROR:", error);
    }
    return "";
}

function getLocalFavoriteIdsForRecommendations(){
    try{
        const favorites = JSON.parse(
            localStorage.getItem("favorites") || "[]"
        );
        if(!Array.isArray(favorites)) return [];
        return favorites
            .map(id => String(id))
            .filter(Boolean)
            .slice(0,200);
    }catch(_error){
        return [];
    }
}

async function loadPersonalizedRecommendations(){
    recommendationsLoaded = false;

    if(!recommendedContainer) return;

    const token = getSupabaseAccessTokenFromBrowser();

    // الزائر غير المسجل: يبقى السلوك القديم كاحتياط.
    if(!token){
        personalizedRecommendations = [];
        recommendationsLoaded = true;
        renderRecommended();
        return;
    }

    try{
        const favorites = getLocalFavoriteIdsForRecommendations();
        const params = new URLSearchParams();
        params.set("limit","8");
        if(favorites.length){
            params.set("favorites",favorites.join(","));
        }

        const response = await fetch(
            "/api/recommendations?" + params.toString(),
            {
                headers:{
                    "Authorization":"Bearer " + token
                },
                cache:"no-store"
            }
        );

        if(!response.ok) throw new Error("Recommendations API " + response.status);

        const data = await response.json();
        personalizedRecommendations =
            Array.isArray(data?.recommendations)
                ? data.recommendations
                : [];

        recommendationsLoaded = true;
        renderRecommended();
    }catch(error){
        console.warn("PERSONALIZED RECOMMENDATIONS ERROR:", error);
        personalizedRecommendations = [];
        recommendationsLoaded = true;
        renderRecommended();
    }
}

const latestContainer =
document.getElementById("latestWallpapers");

const weatherTimeContainer =
document.getElementById("weatherTimeWallpapers");

const recommendedContainer =
document.getElementById("recommendedWallpapers");

const dynamicSections =
document.getElementById("dynamicSections");

const popularContainer =
document.getElementById("popularWallpapers");

const likedContainer =
document.getElementById("likedWallpapers");

const downloadedContainer =
document.getElementById("downloadedWallpapers");

const otherWallpapersContainer =
document.getElementById("otherWallpapers");

// =======================================
// تحميل البيانات
// =======================================
async function loadWallpapers() {
    try {
        const response = await fetch("/api/wallpapers", {
            method:"GET",
            headers:{Accept:"application/json"},
            cache:"default"
        });
        if(!response.ok) throw new Error("Wallpapers API " + response.status);
        const data = await response.json();
        if(!Array.isArray(data)) throw new Error("Wallpapers API returned an invalid response");

        wallpapers = data;
        window.WallpaperHubHomeWallpapers = wallpapers;
        window.dispatchEvent(new CustomEvent("wallpaperhub:home-wallpapers-ready", {detail:{wallpapers}}));
        popularWallpaperCache = wallpapers.slice().sort((a,b)=>(Number(b.downloads)||0)-(Number(a.downloads)||0));
        likedWallpaperCache = wallpapers.slice().sort((a,b)=>(Number(b.likes)||0)-(Number(a.likes)||0));
        if(typeof window.renderHomeCategories === "function") window.renderHomeCategories(wallpapers);

        initSlider(wallpapers);
        renderPopular();
        renderDownloaded();
        renderLiked();
        renderLatest();
        renderWeatherTime();
        renderRecommended();
        createDynamicSections();
        scheduleOtherWallpapers();
        void loadPersonalizedRecommendations();
        return wallpapers;
    } catch(error) {
        console.error("API wallpapers error:",error);
        wallpapers = [];
        popularWallpaperCache = [];
        likedWallpaperCache = [];
        window.WallpaperHubHomeWallpapers = wallpapers;
        window.dispatchEvent(new CustomEvent("wallpaperhub:home-wallpapers-ready", {detail:{wallpapers}}));
        if(typeof window.renderHomeCategories === "function") window.renderHomeCategories(wallpapers);
        renderRecommended();
        return wallpapers;
    }
}

window.addEventListener("wallpaperhub:refresh-content", () => {
    if(document.visibilityState === "visible") void loadWallpapers();
});
window.addEventListener("wallpaperhub:settings-loaded", () => {
    if(document.visibilityState === "visible") void loadWallpapers();
});

// =======================================
// إنشاء بطاقة الخلفية// =======================================
// إنشاء بطاقة الخلفية
// Image + Video Support
// =======================================

function createWallpaperCard(wall) {
    if(!wall) return "";
    const isVideo = isVideoMedia(wall);
    const videoEnabled = window.WallpaperHubSettings?.videosEnabled?.() !== false;
    const imageSource = isVideo && !videoEnabled ? (wall.thumbnail || wall.preview || "/assets/logo/no-image.png") : (wall.thumbnail || wall.image || "");
    const imageUrl = escapeHomeHtml(getImageUrl(imageSource));
    const alt = escapeHomeHtml(wall.title || "Wallpaper");
    const fallback = "/assets/logo/no-image.png";
    let mediaHTML = "";
    if(isVideo && videoEnabled){
        mediaHTML = '<div class="video-preview"><img src="' + imageUrl + '" alt="' + alt + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'' + fallback + '\'"><span class="video-icon" aria-hidden="true">▶</span></div>';
    }else{
        mediaHTML = '<img src="' + imageUrl + '" alt="' + alt + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'' + fallback + '\'">';
    }

    let cardAction;
    if(wall.source === "pixabay"){
        const external = {
            id:String(wall.id || ""),
            title:String(wall.title || "خلفية"),
            image:String(wall.image || wall.thumbnail || ""),
            thumbnail:String(wall.thumbnail || wall.image || ""),
            category:String(wall.category || "other"),
            source:"pixabay",
            pageURL:String(wall.pageURL || ""),
            downloads:Number(wall.downloads || 0),
            likes:Number(wall.likes || 0)
        };
        cardAction = "openExternalWallpaper('" + encodeURIComponent(JSON.stringify(external)) + "')";
    }else{
        cardAction = "openWallpaper('" + String(wall.id ?? "").replace(/'/g,"%27") + "')";
    }
    return '<div class="wall-card" onclick="' + cardAction + '">' + mediaHTML + '</div>';
}

window.toggleFavorite =
toggleFavorite;

// =======================================
// أحدث الخلفيات
// =======================================

function renderLatest() {

    if (!latestContainer) return;

    latestContainer.innerHTML = "";

    wallpapers

    .slice()

    .reverse()

    .slice(0,8)

    .forEach(wall => {

        latestContainer.innerHTML +=
        createWallpaperCard(wall);

    });

}

// =======================================
// حسب الطقس والوقت — المرحلة الأولى: اختيار حسب وقت اليوم
// يعتمد على بيانات الخلفيات الموجودة، ويتجدد الاختيار مع كل تحميل للرئيسية.
// ربط الطقس وصفحة "عرض الكل" سيضاف في المرحلة التالية.
// =======================================

function getCurrentWallpaperTimePeriod() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "day";
    if (hour >= 17 && hour < 20) return "sunset";
    return "night";
}

function getWallpaperSearchText(wall) {
    const values = [
        wall?.title, wall?.description, wall?.category,
        wall?.tags, wall?.keywords, wall?.timeOfDay, wall?.time_of_day,
        wall?.weather, wall?.type
    ];
    return values.flatMap(value => Array.isArray(value) ? value : [value])
        .filter(Boolean).join(" ").toLowerCase();
}

function wallpaperMatchesTimePeriod(wall, period) {
    const text = getWallpaperSearchText(wall);
    const groups = {
        morning: ["sunrise", "sun rise", "morning", "dawn", "sunrise", "شروق", "الصباح", "صباح", "الفجر"],
        day: ["daytime", "sunny day", "day light", "daylight", "noon", "نهار", "النهار", "نهارية", "مشمس"],
        sunset: ["sunset", "sun set", "golden hour", "dusk", "evening", "غروب", "الغروب", "مساء", "الشفق"],
        night: ["night", "nighttime", "moon", "stars", "starry", "dark sky", "ليل", "الليل", "ليلي", "قمر", "نجوم"]
    };
    const tags = groups[period] || [];
    return tags.some(tag => text.includes(tag));
}

function getPeriodFallbackCategories(period) {
    const map = {
        morning: ["sunrise", "nature"],
        day: ["nature"],
        sunset: ["sunset"],
        night: ["dark", "amoled", "space", "deep-space"]
    };
    return map[period] || [];
}

function renderWeatherTime() {
    if (!weatherTimeContainer || !Array.isArray(wallpapers)) return;

    const period = getCurrentWallpaperTimePeriod();
    const periodNames = {
        morning: "الصباح والشروق",
        day: "النهار",
        sunset: "الغروب",
        night: "الليل"
    };
    const note = document.getElementById("weatherTimeNote");
    if (note) note.textContent = `خلفيات ${periodNames[period]} — تتجدد مع كل زيارة`;

    const matching = wallpapers.filter(wall => wallpaperMatchesTimePeriod(wall, period));
    const fallbackCategories = getPeriodFallbackCategories(period);
    const fallback = wallpapers.filter(wall => {
        const category = String(wall?.category || "").toLowerCase();
        return fallbackCategories.includes(category);
    });

    // لا نخلط الفترات: إذا لم توجد صور مصنفة بوضوح، نستخدم أقرب فئات احتياطية.
    let pool = matching.length ? matching : fallback;
    const seen = new Set();
    pool = pool.filter(wall => {
        const id = String(wall?.id ?? wall?.image ?? "");
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
    });

    // تبديل ترتيب الاختيار عند كل تحميل، مع تجنب ترتيب ثابت دائمًا.
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    weatherTimeContainer.innerHTML = pool.slice(0,8).map(createWallpaperCard).join("");

    if (!pool.length) {
        weatherTimeContainer.innerHTML =
            '<div class="weather-time-empty">ما لقيناش حالياً خلفيات مصنفة لهاد الفترة. غادي نعرضوها هنا ملي تتوفر بيانات مناسبة.</div>';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const viewAll = document.getElementById("weatherTimeViewAll");
    if (viewAll) {
        viewAll.addEventListener("click", event => {
            // رابط "عرض الكل" سيتصل بصفحة التصفية الخاصة في المرحلة التالية.
            event.preventDefault();
        });
    }
});

// =======================================
// المقترحة
// =======================================

function renderRecommended() {

    if (!recommendedContainer) return;

    recommendedContainer.innerHTML = "";

    const source =
        personalizedRecommendations.length
            ? personalizedRecommendations
            : wallpapers.filter(w => w.featured).slice(0,8);

    recommendedContainer.innerHTML = source.slice(0,8).map(createWallpaperCard).join("");

}

// =======================================
// إنشاء الأقسام تلقائياً
// =======================================

let homeWallpaperCategoryCatalog = [];
let categoryNames = {};
let homeWallpaperCategoryPromise = null;

function ensureHomeWallpaperCategoryCatalog(){
    if(homeWallpaperCategoryPromise) return homeWallpaperCategoryPromise;
    homeWallpaperCategoryPromise = (async()=>{
        const response = await fetch("/data/categories.json?v=20261128-catalog-2",{cache:"no-store",headers:{Accept:"application/json"}});
        if(!response.ok) throw new Error("تعذر تحميل تصنيفات الصفحة الرئيسية");
        const data = await response.json();
        if(!Array.isArray(data.categories) || !data.categories.length) throw new Error("دليل الأقسام فارغ");
        homeWallpaperCategoryCatalog = data.categories;
        categoryNames = Object.fromEntries(homeWallpaperCategoryCatalog.map(item=>[
            item.id,
            (item.emoji ? item.emoji+" " : "") + item.name
        ]));
        return data;
    })();
    return homeWallpaperCategoryPromise;
}

// =======================================
// خلفيات أخرى — جلب الصور من Pixabay عبر API الخادم
// =======================================
async function renderOtherWallpapers() {
    if (!otherWallpapersContainer) return;

    otherWallpapersContainer.innerHTML =
        '<div class="other-wallpapers-loading">جاري تحميل خلفيات جديدة…</div>';

    try {
        const response = await fetch(
            "/api/pixabay-wallpapers?q=wallpaper%20backgrounds&per_page=12",
            { cache: "no-store" }
        );
        if (!response.ok) throw new Error("Pixabay API " + response.status);

        const data = await response.json();
        const items = Array.isArray(data?.wallpapers) ? data.wallpapers : [];
        if (!items.length) throw new Error("No Pixabay images returned");

        otherWallpapersContainer.innerHTML = "";
        items.slice(0, 12).forEach(wall => {
            otherWallpapersContainer.insertAdjacentHTML("beforeend", createWallpaperCard(wall));
        });
    } catch (error) {
        console.warn("PIXABAY WALLPAPERS ERROR:", error);
        otherWallpapersContainer.innerHTML =
            '<div class="other-wallpapers-empty">تعذر تحميل الصور الجديدة حالياً. جرّب مرة أخرى لاحقاً.</div>';
    }
}

// =======================================
// إنشاء أقسام الخلفيات
// الأقسام لا تختفي عند إضافة خلفيات جديدة
// =======================================

async function createDynamicSections() {
    if(!dynamicSections) return;
    try{
        await ensureHomeWallpaperCategoryCatalog();
    }catch(error){
        console.warn("HOME CATEGORY CATALOG:",error);
        return;
    }
    dynamicSections.replaceChildren();
    const categories = homeWallpaperCategoryCatalog.map(item=>item.id);
    let observer = null;
    if("IntersectionObserver" in window){
        observer = new IntersectionObserver(entries=>{
            entries.forEach(entry=>{
                if(!entry.isIntersecting) return;
                const category=entry.target.dataset.homeCategory;
                if(category) renderCategory(category);
                observer.unobserve(entry.target);
            });
        },{rootMargin:"850px 0px",threshold:0.01});
    }
    categories.forEach(category=>{
        const definition=homeWallpaperCategoryCatalog.find(item=>item.id===category);
        if(!definition) return;
        const section=document.createElement("section");
        section.className="wall-section home-dynamic-section";
        section.dataset.homeCategory=category;
        const categoryUrl = "all-wallpapers.html?category=" + encodeURIComponent(category);
        const sectionActions = category === "religious"
            ? '<div class="religious-section-actions">' +
                '<a class="religious-view-all" href="' + categoryUrl + '">عرض الكل</a>' +
                '<a class="religious-general-link" href="/islamic.html" aria-label="فتح الركن الإسلامي العامة">العامة</a>' +
              '</div>'
            : '<a href="' + categoryUrl + '">عرض الكل</a>';
        section.innerHTML='<div class="title"><h3>' + (categoryNames[category] || definition.name || category) + '</h3>' + sectionActions + '</div>' +
            '<div class="wall-grid" id="section-' + category + '" aria-label="' + (definition.name || category) + '"></div>';
        dynamicSections.appendChild(section);
        if(observer) observer.observe(section);
        else renderCategory(category);
    });
}

function renderCategory(category) {
    const container=document.getElementById("section-" + category);
    if(!container || container.dataset.rendered === "true") return;
    container.dataset.rendered = "true";
    const definition=homeWallpaperCategoryCatalog.find(item=>item.id===category);
    const normalize=value=>String(value||"").trim().toLowerCase()
        .replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي");
    const targetCat=normalize(category);
    const aliases=(definition?.aliases || []).map(normalize);
    const matches=wallpapers.filter(w=>{
        if(!w || !w.category) return false;
        const wallCat=normalize(w.category);
        return wallCat===targetCat || aliases.includes(wallCat);
    });
    if(!matches.length){
        container.closest(".home-dynamic-section")?.classList.add("is-empty");
        return;
    }
    container.innerHTML=matches.slice().reverse().slice(0,6).map(createWallpaperCard).join("");
}

function scheduleOtherWallpapers(){
    if(!otherWallpapersContainer) return;
    if(!("IntersectionObserver" in window)){ void renderOtherWallpapers(); return; }
    const observer=new IntersectionObserver(entries=>{
        if(!entries.some(entry=>entry.isIntersecting)) return;
        observer.disconnect();
        void renderOtherWallpapers();
    },{rootMargin:"700px 0px",threshold:0.01});
    observer.observe(otherWallpapersContainer);
}

// =======================================
// =======================================
// فتح صفحة الخلفية
// =======================================

function openWallpaper(id) {

    window.location.href =
    `wallpaper.html?id=${id}`;

}


window.openWallpaper =
openWallpaper;

// فتح صورة Pixabay داخل معرض WallpaperHub بدلاً من الموقع الخارجي.
function openExternalWallpaper(encodedWallpaper){
    try{
        const wallpaper = JSON.parse(decodeURIComponent(encodedWallpaper));
        sessionStorage.setItem("selectedExternalWallpaper", JSON.stringify(wallpaper));
        window.location.href =
            `wallpaper.html?source=pixabay&id=${encodeURIComponent(wallpaper.id)}`;
    }catch(error){
        console.error("Unable to open external wallpaper in local gallery:", error);
    }
}
window.openExternalWallpaper = openExternalWallpaper;

// =======================================
// المفضلة
// =======================================

function toggleFavorite(id) {

    let favorites =
        JSON.parse(
            localStorage.getItem("favorites") || "[]"
        );

    if (favorites.includes(id)) {

        favorites =
            favorites.filter(item => item !== id);

        } else {

    favorites.push(id);

    const wall = findWallpaper(id);

    if (wall) {
        addNotification(
            "❤️ تمت الإضافة إلى المفضلة",
            `"${wall.title}" أضيفت إلى المفضلة.`
        );
    }

}

    localStorage.setItem(
        "favorites",
        JSON.stringify(favorites)
    );

}

// =======================================
// البحث عن خلفية
// =======================================

function findWallpaper(id) {

    return wallpapers.find(
        wall => wall.id == id
    );

}

// =======================================
// أكثر الخلفيات تحميلاً
// =======================================

function getPopularWallpapers() {
    return popularWallpaperCache.length ? popularWallpaperCache.slice() : wallpapers.slice();
}

// =======================================
// =======================================
// أحدث الخلفيات
// =======================================

function getLatestWallpapers() {

    return wallpapers

        .slice()

        .reverse();

}

// ==============================
// الأكثر تحميلاً
// ==============================

function renderPopular() {
    if(!popularContainer) return;
    popularContainer.innerHTML = popularWallpaperCache.slice(0,8).map(createWallpaperCard).join("");
}

// ==============================
// الأكثر إعجاباً
// ==============================
function renderLiked() {
    if(!likedContainer) return;
    likedContainer.innerHTML = likedWallpaperCache.slice(0,8).map(createWallpaperCard).join("");
}

function renderDownloaded() {
    if(!downloadedContainer) return;
    downloadedContainer.innerHTML = popularWallpaperCache.slice(0,8).map(createWallpaperCard).join("");
}

// ==============================
// ==============================
// فتح الأقسام في صفحة جميع الخلفيات
// =======================================

document.querySelectorAll(".category").forEach(category => {

    category.addEventListener("click", function () {

        const categoryName = this.dataset.category;

        if (!categoryName) return;

        // قسم الكل
        if (categoryName === "all") {

            window.location.href =
                "all-wallpapers.html";

            return;
        }

        // باقي الأقسام
        window.location.href =
            "all-wallpapers.html?category=" +
            encodeURIComponent(categoryName);

    });

});

// ======================
// Bottom Nav Animation
// ======================

const navItems =
document.querySelectorAll(".nav-item");

const indicator =
document.querySelector(".nav-indicator");


if(navItems.length && indicator){

    navItems.forEach((item,index)=>{

        item.onclick = ()=>{


            navItems.forEach(i =>
                i.classList.remove("active")
            );


            item.classList.add("active");


            indicator.style.left =
            `calc(${index * 20}% + 10%)`;

        };

    });

}
// =======================================

// تحميل الصفحة
// =======================================

document.addEventListener("DOMContentLoaded", () => {
    if(!window.WallpaperHubHomeWallpapersPromise){
        window.WallpaperHubHomeWallpapersPromise = loadWallpapers();
    }
},{once:true});


/* =========================================================
   Community Press — published Studio designs
========================================================= */
(function(){
    "use strict";
    const lanes={
        lock:document.getElementById("communityLockCreations"),
        home:document.getElementById("communityHomeCreations"),
        wallpaper:document.getElementById("communityWallpaperCreations")
    };
    if(!lanes.lock||!lanes.home||!lanes.wallpaper)return;

    const editorial={
        lock:{label:"شاشة القفل",kicker:"LOCK SCREEN",mark:"01"},
        home:{label:"الشاشة الرئيسية",kicker:"HOME SCREEN",mark:"02"},
        wallpaper:{label:"الخلفيات",kicker:"WALLPAPER ART",mark:"03"}
    };

    function showState(kind,message){
        const lane=lanes[kind];
        if(!lane)return;
        lane.replaceChildren();
        const state=document.createElement("div");
        state.className="community-paper-state";
        state.textContent=message;
        lane.appendChild(state);
    }

    function creationKind(item){
        const config=item.config||{};
        const mode=String(config.screenMode||"").toLowerCase();
        if(["lock","home","wallpaper"].includes(mode))return mode;
        const tool=String(config.tool||item.category||"").toLowerCase();
        if(tool==="lock")return "lock";
        if(["theme","icons","widget"].includes(tool))return "home";
        return "wallpaper";
    }

    function safeImageUrl(value){
        try{
            const url=new URL(String(value||""),window.location.origin);
            return ["https:","http:"].includes(url.protocol)?url.href:"";
        }catch(_error){return ""}
    }

    function makeCard(item,kind){
        const href=safeImageUrl(item.image_url);
        if(!href)return null;

        const info=editorial[kind]||editorial.wallpaper;
        const link=document.createElement("a");
        link.className="community-paper-story";
        link.href="community-creation.html?id="+encodeURIComponent(item.id);
        link.setAttribute("aria-label",(item.title||"إبداع من المجتمع")+" — عرض تفاصيل الإبداع");

        const imageFrame=document.createElement("span");
        imageFrame.className="community-paper-story-image";

        const img=document.createElement("img");
        img.src=href;
        img.alt=item.title||"إبداع من مجتمع WallpaperHub";
        img.loading="lazy";
        img.decoding="async";
        img.referrerPolicy="no-referrer";
        img.addEventListener("error",()=>link.remove(),{once:true});

        const index=document.createElement("span");
        index.textContent="W.H / "+info.mark;
        imageFrame.append(img,index);

        const copy=document.createElement("span");
        copy.className="community-paper-story-copy";

        const kicker=document.createElement("span");
        kicker.className="community-paper-story-kicker";
        kicker.textContent=info.kicker;

        const title=document.createElement("strong");
        title.textContent=item.title||"إبداع من المجتمع";

        const meta=document.createElement("span");
        meta.className="community-paper-story-meta";

        const date=document.createElement("span");
        const parsed=item.created_at?new Date(item.created_at):null;
        date.textContent=parsed&&!Number.isNaN(parsed.getTime())?parsed.toLocaleDateString("ar-MA"):"WallpaperHub";

        const open=document.createElement("span");
        open.className="community-paper-story-link";
        open.textContent="عرض التفاصيل ←";
        meta.append(date,open);
        copy.append(kicker,title,meta);

        if(item.config?.themeUrl){
            const pack=document.createElement("span");
            pack.className="community-paper-pack";
            pack.textContent="ملف الثيم متاح";
            copy.appendChild(pack);
        }

        link.append(imageFrame,copy);
        return link;
    }

    function renderLane(kind,items){
        const lane=lanes[kind];
        const count=document.querySelector('[data-creation-count="'+kind+'"]');
        const cards=(Array.isArray(items)?items:[])
            .slice(0,4)
            .map(item=>makeCard(item,kind))
            .filter(Boolean);

        lane.replaceChildren();
        if(count){
            const total=Array.isArray(items)?items.length:0;
            count.textContent=total>cards.length
                ?cards.length+" من "+total
                :cards.length+" مواد";
        }

        if(!cards.length){
            showState(kind,"لا توجد إبداعات منشورة في هذا القسم بعد. كن أول من يضيف عملاً إلى صفحات الجريدة.");
            return;
        }
        cards.forEach(card=>lane.appendChild(card));
    }

    async function loadCommunityCreations(){
        try{
            const configResponse=await fetch("/api/supabase/config",{cache:"no-store"});
            if(!configResponse.ok)throw new Error("تعذر الاتصال بإعدادات المعرض");
            const config=await configResponse.json();
            const base=String(config.url||"").replace(/\/+$/,"");
            const anonKey=String(config.anonKey||"");
            if(!base||!anonKey)throw new Error("إعدادات قاعدة البيانات غير مكتملة");

            const query=new URLSearchParams({
                select:"id,title,category,config,image_url,created_at",
                visibility:"eq.published",
                order:"created_at.desc",
                limit:"60"
            });
            const response=await fetch(base+"/rest/v1/studio_designs?"+query.toString(),{
                method:"GET",
                headers:{apikey:anonKey,Authorization:"Bearer "+anonKey,Accept:"application/json"},
                cache:"no-store"
            });
            if(!response.ok)throw new Error("تعذر تحميل إبداعات المجتمع");

            const records=await response.json();
            const groups={lock:[],home:[],wallpaper:[]};
            (Array.isArray(records)?records:[]).forEach(item=>{
                const kind=creationKind(item);
                if(groups[kind])groups[kind].push(item);
            });
            Object.keys(groups).forEach(kind=>renderLane(kind,groups[kind]));
        }catch(error){
            console.warn("COMMUNITY CREATIONS:",error);
            Object.keys(lanes).forEach(kind=>showState(kind,"تعذر تحميل هذا العمود مؤقتاً. حاول تحديث الصفحة لاحقاً."));
        }
    }

    if(document.readyState==="loading"){
        document.addEventListener("DOMContentLoaded",loadCommunityCreations,{once:true});
    }else{
        loadCommunityCreations();
    }
})();

// Home header: hide on downward scroll and reveal on the first small upward movement.
(function initSmartHomeHeader(){
    const header = document.querySelector(".header");
    if(!header) return;

    let lastScrollY = Math.max(0, window.scrollY || 0);
    let downwardDistance = 0;
    let upwardDistance = 0;
    let framePending = false;

    const HIDE_AFTER_PX = 12;
    const SHOW_AFTER_PX = 3;
    const ALWAYS_SHOW_NEAR_TOP_PX = 16;

    function showHeader(){
        header.classList.remove("is-scroll-hidden");
        upwardDistance = 0;
        downwardDistance = 0;
    }

    function updateHeader(){
        const currentY = Math.max(0, window.scrollY || 0);
        const delta = currentY - lastScrollY;
        lastScrollY = currentY;

        if(currentY <= ALWAYS_SHOW_NEAR_TOP_PX){
            showHeader();
            return;
        }

        if(delta > 0){
            downwardDistance += delta;
            upwardDistance = 0;
            if(downwardDistance >= HIDE_AFTER_PX){
                header.classList.add("is-scroll-hidden");
            }
        }else if(delta < 0){
            upwardDistance += Math.abs(delta);
            downwardDistance = 0;
            // Reveal quickly: a few pixels of upward movement are enough.
            if(upwardDistance >= SHOW_AFTER_PX){
                showHeader();
            }
        }
    }

    window.addEventListener("scroll", () => {
        if(framePending) return;
        framePending = true;
        window.requestAnimationFrame(() => {
            framePending = false;
            updateHeader();
        });
    }, {passive:true});

    window.addEventListener("pageshow", () => {
        lastScrollY = Math.max(0, window.scrollY || 0);
        showHeader();
    }, {passive:true});
})();
