// =========================================================
// WallpaperHub — HOME
// Logic preserved, presentation rebuilt.
// Bottom navigation logic is intentionally not touched.
// =========================================================

console.log("WALLPAPERHUB HOME — MODERN UI LOADED");

let wallpapers = [];

const latestContainer = document.getElementById("latestWallpapers");
const recommendedContainer = document.getElementById("recommendedWallpapers");
const dynamicSections = document.getElementById("dynamicSections");
const popularContainer = document.getElementById("popularWallpapers");
const likedContainer = document.getElementById("likedWallpapers");
const downloadedContainer = document.getElementById("downloadedWallpapers");
const wallhavenContainer = document.getElementById("wallhavenAI");

function getImageUrl(image){
    if(!image) return "assets/logo/no-image.png";

    const value = String(image);

    if(value.startsWith("http")) return value;
    if(value.startsWith("assets/")) return value;

    return "assets/wallpapers/" + value;
}

function isVideoMedia(wallpaper){
    if(!wallpaper) return false;

    if(wallpaper.type === "video") return true;

    const url = String(wallpaper.image || "").toLowerCase();

    return [".mp4",".webm",".mov",".m3u8"].some(ext => url.includes(ext));
}

// ---------------------------------------------------------
// Data
// ---------------------------------------------------------

async function loadWallpapers(){
    try{
        const response = await fetch("/api/wallpapers?_=" + Date.now());

        if(!response.ok){
            throw new Error("HTTP " + response.status);
        }

        const text = await response.text();

        try{
            wallpapers = JSON.parse(text);
        }catch(error){
            console.error("Invalid API JSON:", text);
            return;
        }

        if(!Array.isArray(wallpapers)){
            wallpapers = [];
            console.error("Wallpaper API must return an array.");
            return;
        }

        if(typeof initSlider === "function"){
            initSlider(wallpapers);
        }

        loadTodayWallpaper();
        renderPopular();
        renderDownloaded();
        renderLiked();
        renderLatest();
        renderRecommended();
        renderWallhavenAI();
        createDynamicSections();

    }catch(error){
        console.error("API wallpapers error:", error);
    }
}

// ---------------------------------------------------------
// Wallpaper card
// ---------------------------------------------------------

function escapeHTML(value){
    return String(value ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}

function formatNumber(value){
    const number = Number(value || 0);

    if(number >= 1000000){
        return (number / 1000000).toFixed(number >= 10000000 ? 0 : 1) + "M";
    }

    if(number >= 1000){
        return (number / 1000).toFixed(number >= 10000 ? 0 : 1) + "K";
    }

    return String(number);
}

function createWallpaperCard(wall){
    if(!wall) return "";

    const id = escapeHTML(wall.id);
    const title = escapeHTML(wall.title || "Wallpaper");
    const image = getImageUrl(wall.thumbnail || wall.image);

    let mediaHTML = "";

    if(isVideoMedia(wall)){
        mediaHTML = `
            <div class="video-preview">
                <video
                    src="${escapeHTML(getImageUrl(wall.image))}"
                    muted
                    loop
                    autoplay
                    playsinline
                    preload="metadata">
                </video>
                <div class="video-icon">▶</div>
            </div>
        `;
    }else{
        mediaHTML = `
            <img
                src="${escapeHTML(image)}"
                alt="${title}"
                loading="lazy"
                onerror="this.src='assets/logo/no-image.png'">
        `;
    }

    const likes = formatNumber(wall.likes);
    const views = formatNumber(wall.views);
    const downloads = formatNumber(wall.downloads);

    const stats = `
        <div class="wall-info">
            <h4>${title}</h4>
            <p>♥ ${likes} &nbsp; · &nbsp; 👁 ${views || downloads}</p>
        </div>
    `;

    return `
        <article
            class="wall-card"
            data-wallpaper-id="${id}"
            tabindex="0"
            role="button"
            aria-label="فتح ${title}">
            ${mediaHTML}
            ${stats}
        </article>
    `;
}

function bindWallpaperCards(root = document){
    root.querySelectorAll(".wall-card[data-wallpaper-id]").forEach(card => {
        if(card.dataset.bound === "1") return;

        card.dataset.bound = "1";

        const open = () => openWallpaper(card.dataset.wallpaperId);

        card.addEventListener("click", open);

        card.addEventListener("keydown", event => {
            if(event.key === "Enter" || event.key === " "){
                event.preventDefault();
                open();
            }
        });
    });
}

function renderCards(container, list){
    if(!container) return;

    container.innerHTML = list.map(createWallpaperCard).join("");
    bindWallpaperCards(container);
}

// ---------------------------------------------------------
// Main lists
// ---------------------------------------------------------

function renderLatest(){
    if(!latestContainer) return;

    renderCards(
        latestContainer,
        wallpapers.slice().reverse().slice(0,8)
    );
}

function renderRecommended(){
    if(!recommendedContainer) return;

    renderCards(
        recommendedContainer,
        wallpapers.filter(w => w && w.featured).slice(0,8)
    );
}

function renderPopular(){
    if(!popularContainer) return;

    renderCards(
        popularContainer,
        wallpapers
            .slice()
            .sort((a,b) => (Number(b.downloads)||0) - (Number(a.downloads)||0))
            .slice(0,8)
    );
}

function renderLiked(){
    if(!likedContainer) return;

    renderCards(
        likedContainer,
        wallpapers
            .slice()
            .sort((a,b) => (Number(b.likes)||0) - (Number(a.likes)||0))
            .slice(0,8)
    );
}

function renderDownloaded(){
    if(!downloadedContainer) return;

    renderCards(
        downloadedContainer,
        wallpapers
            .slice()
            .sort((a,b) => (Number(b.downloads)||0) - (Number(a.downloads)||0))
            .slice(0,8)
    );
}

// ---------------------------------------------------------
// Dynamic categories
// ---------------------------------------------------------

const categoryNames = {
    nature:"🌿 الطبيعة",
    cars:"🚗 السيارات",
    games:"🎮 الألعاب",
    space:"🌌 الفضاء",
    ai:"🤖 الذكاء الاصطناعي",
    amoled:"🖤 AMOLED",
    animals:"🐾 الحيوانات",
    anime:"🌀 الأنمي",
    city:"🏙️ المدن",
    dark:"🖤 Dark",
    "4k":"💎 4K",
    sports:"⚽ الرياضة",
    minimal:"✨ Minimal",
    wallhaven:"Wallhaven AI 🌐",
    rain:"🌧️ المطر",
    sunset:"🌅 الغروب",
    architecture:"🏛️ العمارة",
    "deep-space":"🚀 الفضاء العميق"
};

const categoryAliases = {
    nature:["طبيعة","الطبيعة"],
    cars:["سيارات","السيارات"],
    games:["العاب","الألعاب"],
    space:["فضاء","الفضاء"],
    ai:["ذكاء اصطناعي","الذكاء الاصطناعي"],
    amoled:["اموليد"],
    animals:["حيوانات","الحيوانات"],
    anime:["انمي","الأنمي"],
    city:["مدن","المدن"],
    dark:["داكن","مظلم"],
    "4k":["فور كي"],
    sports:["رياضة","الرياضة"],
    minimal:["مينيمال"],
    rain:["مطر","المطر"],
    sunset:["غروب","الغروب"],
    architecture:["عمارة","العمارة"],
    "deep-space":["فضاء عميق","الفضاء العميق"]
};

function createDynamicSections(){
    if(!dynamicSections) return;

    dynamicSections.innerHTML = "";

    const categories = [
        "nature","cars","games","space","ai","amoled","animals","anime",
        "city","dark","4k","sports","minimal","rain","sunset",
        "architecture","deep-space"
    ];

    categories.forEach(category => {
        const section = document.createElement("section");
        section.className = "wall-section";

        section.innerHTML = `
            <div class="title">
                <div class="section-heading">
                    <span class="heading-icon">✦</span>
                    <div>
                        <h3>${escapeHTML(categoryNames[category] || category)}</h3>
                        <small>خلفيات مختارة لهذا القسم</small>
                    </div>
                </div>
                <a href="all-wallpapers.html?category=${encodeURIComponent(category)}">
                    عرض الكل <span>←</span>
                </a>
            </div>

            <div class="wall-grid" id="section-${escapeHTML(category)}"></div>
        `;

        dynamicSections.appendChild(section);
        renderCategory(category);
    });
}

function renderCategory(category){
    const container = document.getElementById(`section-${category}`);
    if(!container) return;

    const targetCat = String(category || "").trim().toLowerCase();

    const sectionWalls = wallpapers.filter(w => {
        if(!w || !w.category) return false;

        const wallCat = String(w.category).trim().toLowerCase();

        if(wallCat === targetCat) return true;

        return Array.isArray(categoryAliases[targetCat]) &&
            categoryAliases[targetCat].some(alias =>
                String(alias).toLowerCase() === wallCat
            );
    });

    renderCards(
        container,
        sectionWalls.slice().reverse().slice(0,6)
    );
}

// ---------------------------------------------------------
// Wallpaper page
// ---------------------------------------------------------

function openWallpaper(id){
    window.location.href = `wallpaper.html?id=${encodeURIComponent(id)}`;
}

window.openWallpaper = openWallpaper;

// ---------------------------------------------------------
// Favorites
// ---------------------------------------------------------

function toggleFavorite(id){
    let favorites = [];

    try{
        favorites = JSON.parse(
            localStorage.getItem("favorites") || "[]"
        );
    }catch{
        favorites = [];
    }

    if(favorites.includes(id)){
        favorites = favorites.filter(item => item !== id);
    }else{
        favorites.push(id);

        const wall = findWallpaper(id);

        if(wall && typeof addNotification === "function"){
            addNotification(
                "❤️ تمت الإضافة إلى المفضلة",
                `"${wall.title || "الخلفية"}" أضيفت إلى المفضلة.`
            );
        }
    }

    localStorage.setItem("favorites",JSON.stringify(favorites));
}

window.toggleFavorite = toggleFavorite;

function findWallpaper(id){
    return wallpapers.find(wall => String(wall.id) === String(id));
}

// ---------------------------------------------------------
// Today wallpaper
// ---------------------------------------------------------

function getLocalDateKey(){
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth()+1).padStart(2,"0");
    const day = String(now.getDate()).padStart(2,"0");

    return `${year}-${month}-${day}`;
}

function loadTodayWallpaper(){
    if(!wallpapers.length) return;

    const todayKey = getLocalDateKey();
    let today = null;

    try{
        const saved = JSON.parse(
            localStorage.getItem("dailyWallpaper") || "null"
        );

        if(saved && saved.date === todayKey){
            today = wallpapers.find(
                w => String(w.id) === String(saved.id)
            ) || null;
        }
    }catch(error){
        console.log("Daily wallpaper cache error:",error);
    }

    if(!today){
        today = wallpapers[
            Math.floor(Math.random() * wallpapers.length)
        ];

        localStorage.setItem(
            "dailyWallpaper",
            JSON.stringify({
                id:today.id,
                date:todayKey
            })
        );
    }

    const img = document.getElementById("todayImage");
    const title = document.getElementById("todayTitle");
    const desc = document.getElementById("todayDescription");
    const view = document.getElementById("todayView");
    const download = document.getElementById("todayDownload");

    if(img){
        img.src = getImageUrl(today.thumbnail || today.image);
        img.alt = today.title || "خلفية اليوم";
    }

    if(title){
        title.textContent = today.title || "خلفية اليوم";
    }

    if(desc){
        desc.textContent = today.category || "Wallpaper";
    }

    if(view){
        view.onclick = () => openWallpaper(today.id);
    }

    if(download){
        download.onclick = () => {
            const url = getImageUrl(today.image);

            const a = document.createElement("a");
            a.href = url;
            a.download = (today.title || "wallpaper") + ".jpg";
            document.body.appendChild(a);
            a.click();
            a.remove();
        };
    }
}

// ---------------------------------------------------------
// Wallhaven — uses the already loaded API data.
// No second network request.
// ---------------------------------------------------------

function renderWallhavenAI(){
    if(!wallhavenContainer) return;

    const list = wallpapers
        .filter(w =>
            w &&
            w.source === "wallhaven" &&
            w.category === "wallhaven"
        )
        .slice(0,10);

    renderCards(wallhavenContainer,list);
}

// ---------------------------------------------------------
// Notification badge
// ---------------------------------------------------------

function updateNotificationCount(){
    const badge = document.getElementById("notificationCount");
    if(!badge) return;

    let notifications = [];

    try{
        notifications = JSON.parse(
            localStorage.getItem("notifications") || "[]"
        );
    }catch{
        notifications = [];
    }

    if(notifications.length > 0){
        badge.textContent = notifications.length;
        badge.style.display = "flex";
    }else{
        badge.style.display = "none";
    }
}

function openNotifications(){
    window.location.href = "notifications.html";
}

// ---------------------------------------------------------
// Legacy category click support
// ---------------------------------------------------------

document.addEventListener("click",event => {
    const category = event.target.closest(".category");
    if(!category) return;

    const categoryName = category.dataset.category;
    if(!categoryName) return;

    if(categoryName === "all"){
        window.location.href = "all-wallpapers.html";
        return;
    }

    window.location.href =
        "all-wallpapers.html?category=" +
        encodeURIComponent(categoryName);
});

// ---------------------------------------------------------
// Small header visual control
// ---------------------------------------------------------

document.addEventListener("DOMContentLoaded",() => {
    updateNotificationCount();

    const quickThemeButton = document.querySelector(".header-quick");

    if(quickThemeButton){
        quickThemeButton.addEventListener("click",() => {
            document.documentElement.classList.toggle("home-soft-light");
        });
    }
});

// ---------------------------------------------------------
// Boot
// ---------------------------------------------------------

document.addEventListener("DOMContentLoaded",() => {
    loadWallpapers();
});
