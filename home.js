console.log("HOME JS LOADED");

// =======================================
// WallpaperHub Home
// =======================================

function getImageUrl(image) {

    if(!image){
        return "assets/logo/no-image.png";
    }

    if(image.startsWith("http")){
        return image;
    }

    if(image.startsWith("assets/")){
        return image;
    }

    return "assets/wallpapers/" + image;

}


// =======================================
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

        const response = await fetch(
    "/api/wallpapers?_=" + Date.now()
);

        const text = await response.text();

        console.log("API RESPONSE:", text);

        try {
            wallpapers = JSON.parse(text);
        }
        catch(e){
            console.error("Invalid API JSON:", text);
            return;
        }
        initSlider(wallpapers);
        renderPopular();
        renderDownloaded();
        renderLiked();
        renderLatest();
        renderWeatherTime();
        renderRecommended();
        createDynamicSections();
        renderOtherWallpapers();
        // تحميل التوصيات الشخصية من الخادم بعد تحميل الخلفيات الأساسية.
        await loadPersonalizedRecommendations();

    } catch(err) {

        console.error("API wallpapers error:", err);

    }

}

// =======================================
// إنشاء بطاقة الخلفية
// Image + Video Support
// =======================================

function createWallpaperCard(wall) {

    let mediaHTML = "";


    // GIF متحرك: استخدم الملف الأصلي، وليس thumbnail ثابت.
    if(isGifMedia(wall)){

        mediaHTML = `

        <img
        src="${getImageUrl(wall.image)}"
        alt="${wall.title || 'Wallpaper'}"
        loading="lazy"
        decoding="async"
        onerror="this.src='assets/logo/no-image.png'">

        `;

    // فيديو
    }else if(isVideoMedia(wall)){

        mediaHTML = `

        <div class="video-preview">

            <video
            src="${getImageUrl(wall.image)}"
            muted
            loop
            autoplay
            playsinline
            preload="metadata">
            </video>

            <div class="video-icon">
                ▶
            </div>

        </div>

        `;


    }else{


        // صورة

        mediaHTML = `

        <img

        src="${getImageUrl(
            wall.thumbnail || wall.image
        )}"

        alt="${wall.title || 'Wallpaper'}"

        loading="lazy"

        onerror="this.src='assets/logo/no-image.png'">

        `;

    }



// افتح معرض WallpaperHub حتى للصور القادمة من Pixabay.
const cardAction = wall.source === "pixabay"
        ? `openExternalWallpaper('${encodeURIComponent(JSON.stringify({
            id: String(wall.id || ""),
            title: String(wall.title || "خلفية"),
            image: String(wall.image || wall.thumbnail || ""),
            thumbnail: String(wall.thumbnail || wall.image || ""),
            category: String(wall.category || "other"),
            source: "pixabay",
            pageURL: String(wall.pageURL || ""),
            downloads: Number(wall.downloads || 0),
            likes: Number(wall.likes || 0)
        }))}')`
        : `openWallpaper('${String(wall.id ?? "").replace(/'/g, "%27")}')`;

return `

<div class="wall-card"
onclick="${cardAction}">

${mediaHTML}

</div>

`;

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

    weatherTimeContainer.innerHTML = "";
    pool.slice(0, 8).forEach(wall => {
        weatherTimeContainer.insertAdjacentHTML("beforeend", createWallpaperCard(wall));
    });

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

    source
        .slice(0,8)
        .forEach(wall => {
            recommendedContainer.innerHTML +=
                createWallpaperCard(wall);
        });

}

// =======================================
// إنشاء الأقسام تلقائياً
// =======================================

const categoryNames = {

    nature: "🌿 الطبيعة",

    cars: "🚗 السيارات",

    games: "🎮 الألعاب",

    space: "🌌 الفضاء",

    ai: "🤖 الذكاء الاصطناعي",

    amoled: "🖤 AMOLED",

    animals: "🐾 الحيوانات",

    anime: "🌀 الأنمي",

    city: "🏙️ المدن",

    dark: "🖤 Dark",

    "4k": "💎 4K",

    sports: "⚽ الرياضة",

    minimal: "✨ Minimal",
rain:"🌧️ المطر",

sunset:"🌅 الغروب",

architecture:"🏛️ العمارة",

"deep-space":"🚀 الفضاء العميق",
    "snow": "❄️ الثلج والشتاء",
    "aurora": "🌌 الشفق القطبي",
    "cyberpunk": "🌃 السايبربانك",
    "gradients": "🎨 التدرجات والألوان"
};

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

function createDynamicSections() {

    if (!dynamicSections) return;

    dynamicSections.innerHTML = "";

    const categories = [
        "nature",
        "cars",
        "games",
        "space",
        "ai",
        "amoled",
        "animals",
        "anime",
        "city",
        "dark",
        "4k",
        "sports",
        "minimal",
        "rain",
        "sunset",
        "architecture",
        "deep-space",
        "snow",
        "aurora",
        "cyberpunk",
        "gradients"
    ];

    categories.forEach(category => {

        const section =
            document.createElement("section");

        section.className = "wall-section";

        section.innerHTML = `

            <div class="title">

                <h3>
                    ${categoryNames[category] || category}
                </h3>

                <a href="all-wallpapers.html?category=${encodeURIComponent(category)}">
                    عرض الكل
                </a>

            </div>

            <div
                class="wall-grid"
                id="section-${category}">
            </div>

        `;

        dynamicSections.appendChild(section);

        renderCategory(category);

    });

}
// =======================================
// عرض خلفيات القسم (نسخة محسنة)
// =======================================

function renderCategory(category) {

    const container = document.getElementById(`section-${category}`);
    if (!container) return;

    container.innerHTML = "";

    const targetCat = String(category || "").trim().toLowerCase();

    const sectionWalls = wallpapers.filter(w => {
        if (!w || !w.category) return false;
        
        const wallCat = String(w.category).trim().toLowerCase();

        // 1. مطابقة مباشرة
        if (wallCat === targetCat) return true;

        // 2. مطابقة الأقسام الخاصة والأسماء العربية/البديلة
        const aliasMap = {
            "nature": ["طبيعة", "الطبيعة"],
            "cars": ["سيارات", "السيارات"],
            "games": ["العاب", "الألعاب"],
            "space": ["فضاء", "الفضاء"],
            "ai": ["ذكاء اصطناعي", "الذكاء الاصطناعي"],
            "amoled": ["اموليد"],
            "animals": ["حيوانات", "الحيوانات"],
            "anime": ["انمي", "الأنمي"],
            "city": ["مدن", "المدن"],
            "dark": ["داكن", "مظلم"],
            "4k": ["فور كي"],
            "sports": ["رياضة", "الرياضة"],
            "minimal": ["مينيمال"],
            "rain": ["مطر", "المطر"],
            "sunset": ["غروب", "الغروب"],
            "architecture": ["عمارة", "العمارة"],
            "deep-space": ["فضاء عميق", "الفضاء العميق"],
            "snow": ["winter", "ثلج", "الثلج", "شتاء", "الشتاء"],
            "aurora": ["aurora borealis", "الشفق القطبي", "الشفق"],
            "cyberpunk": ["سايبربانك", "سايبر بانك"],
            "gradients": ["gradient", "colors", "colours", "تدرجات", "التدرجات", "ألوان", "الوان"]
        };

        if (aliasMap[targetCat] && aliasMap[targetCat].includes(wallCat)) {
            return true;
        }

        return false;
    });

    console.log(`SECTION [${targetCat}] Found:`, sectionWalls.length);

    sectionWalls
        .slice()
        .reverse()
        .slice(0, 6)
        .forEach(wall => {
            container.innerHTML += createWallpaperCard(wall);
        });
}

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

    return wallpapers

        .slice()

        .sort(
            (a, b) =>
                (b.downloads || 0) -
                (a.downloads || 0)
        );

}

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

    if (!popularContainer) return;

    popularContainer.innerHTML = "";

    wallpapers

    .slice()

    .sort((a,b)=>(b.downloads||0)-(a.downloads||0))

    .slice(0,8)

    .forEach(wall=>{

        popularContainer.innerHTML +=
        createWallpaperCard(wall);

    });

}

// ==============================
// الأكثر إعجاباً
// ==============================

function renderLiked() {

    if (!likedContainer) return;

    likedContainer.innerHTML = "";

    wallpapers

    .slice()

    .sort((a,b)=>(b.likes||0)-(a.likes||0))

    .slice(0,8)

    .forEach(wall=>{

        likedContainer.innerHTML +=
        createWallpaperCard(wall);

    });

}

function renderDownloaded() {

    if (!downloadedContainer) return;

    downloadedContainer.innerHTML = "";

    wallpapers
        .slice()
        .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
        .slice(0, 8)
        .forEach(wall => {

            downloadedContainer.innerHTML +=
                createWallpaperCard(wall);

        });

}



// ==============================
// Notification Badge
// ==============================

function updateNotificationCount(){

    const badge =
    document.getElementById("notificationCount");


    if(!badge) return;


    const notifications =
    JSON.parse(
        localStorage.getItem("notifications") || "[]"
    );


    if(notifications.length > 0){

        badge.textContent =
        notifications.length;

        badge.style.display =
        "flex";

    }else{

        badge.style.display =
        "none";

    }

}


// فتح صفحة الإشعارات

function openNotifications(){

    window.location.href =
    "notifications.html";

}



document.addEventListener(
"DOMContentLoaded",
()=>{

    updateNotificationCount();

});

// =======================================
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

document.addEventListener(

    "DOMContentLoaded",

    () => {

        loadWallpapers();
}

);


/* COMMUNITY LIVE BACKGROUND — optimized for smooth mobile scrolling */
(function(){
    function boot(){
        const section=document.querySelector(".community-section");
        const canvas=document.getElementById("communityMotionCanvas");
        if(!section||!canvas)return;
        const ctx=canvas.getContext("2d",{alpha:true});
        if(!ctx)return;

        let w=1,h=1,t=0,raf=0,last=0,visible=true;
        const ribbons=[
            {speed:.34,phase:0,amp:.12,y:.38,hue:205,width:2.4},
            {speed:.27,phase:2.1,amp:.16,y:.49,hue:224,width:2.1},
            {speed:.22,phase:4.2,amp:.13,y:.61,hue:267,width:2.2}
        ];
        const particles=Array.from({length:18},(_,i)=>({
            ribbon:i%3,p:Math.random(),speed:.0009+Math.random()*.001,
            size:.8+Math.random()*1.5,phase:Math.random()*Math.PI*2
        }));

        function resize(){
            const r=section.getBoundingClientRect();
            w=Math.max(1,r.width); h=Math.max(1,r.height);
            canvas.width=Math.round(w);
            canvas.height=Math.round(h);
            canvas.style.width=w+"px";
            canvas.style.height=h+"px";
            ctx.setTransform(1,0,0,1,0,0);
        }
        function point(r,x){
            const n=x/w;
            return {
                x:x,
                y:h*r.y+h*r.amp*(
                    Math.sin(n*6.5+t*r.speed+r.phase)*.5+
                    Math.sin(n*11-t*r.speed*1.2+r.phase*1.5)*.2+
                    Math.sin(n*3+t*.4+r.phase)*.3
                )
            };
        }
        function path(r){
            ctx.beginPath();
            for(let i=0;i<=54;i++){
                const q=point(r,w*i/54);
                if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);
            }
        }
        function drawRibbon(r){
            const g=ctx.createLinearGradient(0,0,w,h);
            g.addColorStop(0,`hsla(${r.hue},100%,70%,0)`);
            g.addColorStop(.2,`hsla(${r.hue},100%,70%,.62)`);
            g.addColorStop(.52,`hsla(${r.hue+22},100%,74%,.84)`);
            g.addColorStop(.76,`hsla(${r.hue+48},100%,76%,.58)`);
            g.addColorStop(1,`hsla(${r.hue+70},100%,70%,0)`);
            path(r); ctx.strokeStyle=g; ctx.lineWidth=r.width+5; ctx.globalAlpha=.10; ctx.stroke();
            path(r); ctx.strokeStyle=g; ctx.lineWidth=r.width; ctx.globalAlpha=.78; ctx.stroke();
        }
        function drawParticle(p){
            const r=ribbons[p.ribbon];
            p.p=(p.p+p.speed)%1;
            const q=point(r,w*p.p);
            const pulse=.72+.28*Math.sin(t*2.5+p.phase);
            ctx.globalAlpha=.55*pulse;
            ctx.fillStyle=`hsl(${r.hue+35},100%,78%)`;
            ctx.beginPath(); ctx.arc(q.x,q.y,p.size*pulse,0,Math.PI*2); ctx.fill();
        }
        function frame(now){
            if(!visible){raf=0;return;}
            if(now-last<33){raf=requestAnimationFrame(frame);return;}
            last=now; t+=.032;
            ctx.clearRect(0,0,w,h);
            ctx.globalCompositeOperation="lighter";
            ribbons.forEach(drawRibbon); particles.forEach(drawParticle);
            ctx.globalCompositeOperation="source-over"; ctx.globalAlpha=1;
            raf=requestAnimationFrame(frame);
        }
        function start(){if(visible&&!raf)raf=requestAnimationFrame(frame);}
        const io=new IntersectionObserver(es=>{
            visible=!!es[0]?.isIntersecting;
            if(visible)start(); else if(raf){cancelAnimationFrame(raf);raf=0;}
        },{threshold:.01});
        io.observe(section);
        const ro=new ResizeObserver(resize); ro.observe(section);
        resize(); start();
        addEventListener("pagehide",()=>{
            if(raf)cancelAnimationFrame(raf);
            io.disconnect();ro.disconnect();
        },{once:true});
    }
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
    else boot();
})();
