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
        renderRecommended();
        createDynamicSections();
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



return `

<div class="wall-card"
onclick="openWallpaper('${wall.id}')">

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

"deep-space":"🚀 الفضاء العميق"
};

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
        "deep-space",];

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
            "deep-space": ["فضاء عميق", "الفضاء العميق"]
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


/* COMMUNITY LIVE BACKGROUND — animated luminous ribbons */
(function(){
    function boot(){
        const section=document.querySelector(".community-section");
        const canvas=document.getElementById("communityMotionCanvas");
        if(!section||!canvas)return;
        const ctx=canvas.getContext("2d",{alpha:true});
        if(!ctx)return;
        let w=0,h=0,dpr=1,t=0,raf=0;
        const ribbons=[
            {speed:.34,phase:0,amp:.12,y:.38,hue:205,width:2.8},
            {speed:.27,phase:2.1,amp:.16,y:.49,hue:224,width:2.4},
            {speed:.22,phase:4.2,amp:.13,y:.61,hue:267,width:2.6},
            {speed:.18,phase:1.1,amp:.10,y:.72,hue:286,width:1.8}
        ];
        const particles=Array.from({length:34},(_,i)=>({
            ribbon:i%ribbons.length,
            p:Math.random(),
            speed:.0008+Math.random()*.0012,
            size:1+Math.random()*2.1,
            phase:Math.random()*Math.PI*2
        }));
        function resize(){
            const r=section.getBoundingClientRect();
            dpr=Math.min(devicePixelRatio||1,1.8);
            w=Math.max(1,r.width); h=Math.max(1,r.height);
            canvas.width=Math.round(w*dpr);
            canvas.height=Math.round(h*dpr);
            canvas.style.width=w+"px";
            canvas.style.height=h+"px";
            ctx.setTransform(dpr,0,0,dpr,0,0);
        }
        function point(r,x,time){
            const n=x/w;
            return {
                x:x,
                y:h*r.y+h*r.amp*(
                    Math.sin(n*7+time*r.speed+r.phase)*.48+
                    Math.sin(n*12.5-time*r.speed*1.35+r.phase*1.7)*.22+
                    Math.sin(n*3.2+time*.45+r.phase)*.30
                )
            };
        }
        function path(r){
            ctx.beginPath();
            for(let i=0;i<=90;i++){
                const q=point(r,w*i/90,t);
                i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);
            }
        }
        function drawRibbon(r){
            const g=ctx.createLinearGradient(0,0,w,h);
            g.addColorStop(0,`hsla(${r.hue},100%,70%,0)`);
            g.addColorStop(.16,`hsla(${r.hue},100%,70%,.72)`);
            g.addColorStop(.48,`hsla(${r.hue+22},100%,74%,.95)`);
            g.addColorStop(.72,`hsla(${r.hue+48},100%,76%,.72)`);
            g.addColorStop(1,`hsla(${r.hue+70},100%,70%,0)`);
            path(r);
            ctx.strokeStyle=g;
            ctx.lineWidth=r.width+7;
            ctx.globalAlpha=.18;
            ctx.shadowBlur=22;
            ctx.shadowColor=`hsla(${r.hue+25},100%,70%,.9)`;
            ctx.stroke();
            path(r);
            ctx.strokeStyle=g;
            ctx.lineWidth=r.width;
            ctx.globalAlpha=.88;
            ctx.shadowBlur=9;
            ctx.stroke();
            ctx.shadowBlur=0;
        }
        function drawParticle(p){
            const r=ribbons[p.ribbon];
            p.p=(p.p+p.speed)%1;
            const q=point(r,w*p.p,t);
            const pulse=.65+.35*Math.sin(t*3+p.phase);
            ctx.globalAlpha=.7*pulse;
            ctx.fillStyle=`hsl(${r.hue+35},100%,78%)`;
            ctx.shadowBlur=12;
            ctx.shadowColor=`hsl(${r.hue+35},100%,68%)`;
            ctx.beginPath();
            ctx.arc(q.x,q.y,p.size*pulse,0,Math.PI*2);
            ctx.fill();
        }
        function animate(){
            t+=.022;
            ctx.clearRect(0,0,w,h);
            ctx.globalCompositeOperation="lighter";
            ribbons.forEach(drawRibbon);
            particles.forEach(drawParticle);
            ctx.globalCompositeOperation="source-over";
            ctx.globalAlpha=1;
            raf=requestAnimationFrame(animate);
        }
        new ResizeObserver(resize).observe(section);
        resize();
        animate();
        addEventListener("beforeunload",()=>cancelAnimationFrame(raf),{once:true});
    }
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true});
    else boot();
})();
