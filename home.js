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



let wallpapers = [];

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


    // فيديو
    if(isVideoMedia(wall)){

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

    wallpapers

    .filter(w => w.featured)

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
;



container.appendChild(card);


});



}catch(error){

console.log(
"Wallhaven AI Error",
error
);


}

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
