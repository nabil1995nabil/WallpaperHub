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
const wallhavenContainer =
document.getElementById("wallhavenAI");

// =======================================
// تحميل البيانات
// =======================================
async function loadWallpapers() {

    try {

        const response = await fetch("/api/wallpapers");

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
        loadTodayWallpaper();
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

<button
class="fav-btn"
onclick="event.stopPropagation(); toggleFavorite('${wall.id}')">

❤

</button>

</div>

`;

}

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
    
    wallhaven:"Wallhaven AI 🌐",
    
rain:"🌧️ المطر",

sunset:"🌅 الغروب",

architecture:"🏛️ العمارة",

"deep-space":"🚀 الفضاء العميق"
};

// =======================================

function createDynamicSections() {

    if (!dynamicSections) return;


    dynamicSections.innerHTML = "";


const categories = [
    ...new Set(
        wallpapers
        .map(w =>
            String(w.category || "")
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    )
];



    categories.forEach(category=>{


const exists =
wallpapers.some(
    w =>
    String(w.category || "")
    .trim()
    .toLowerCase()
    === category
);


        if(!exists)
        return;



        const section =
        document.createElement("section");


        section.className =
        "wall-section";



        section.innerHTML = `

        <div class="title">

        <h3>
        ${categoryNames[category] || category}
        </h3>


        <a href="all-wallpapers.html?category=${category}">
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
// عرض خلفيات القسم
// =======================================

function renderCategory(category) {


const container =
document.getElementById(
`section-${category}`
);


if(!container)
return;


container.innerHTML="";



wallpapers

.filter(w =>
String(w.category || "")
.trim()
.toLowerCase()
===
String(category)
.trim()
.toLowerCase()
)


.slice(0,6)

.forEach(wall=>{


container.innerHTML +=
createWallpaperCard(wall);


});


}

// =======================================
// فتح صفحة الخلفية
// =======================================

function openWallpaper(id) {

    window.location.href =
        `wallpaper.html?id=${id}`;

}

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

//========
// عرض خلفية اليوم
// تتغير عشوائياً كل 24 ساعة
//========

function loadTodayWallpaper() {


    if(!wallpapers || wallpapers.length === 0){
        return;
    }



    const todayKey =
    new Date()
    .toISOString()
    .split("T")[0];



    let today = null;



    // جلب الخلفية المحفوظة لليوم
    const saved =
    localStorage.getItem(
        "dailyWallpaper"
    );



    if(saved){

        try{

            const data =
            JSON.parse(saved);



            if(data.date === todayKey){

                today =
                wallpapers.find(
                    w =>
                    String(w.id) === String(data.id)
                );

            }


        }catch(error){

            console.log(
                "Daily wallpaper cache error:",
                error
            );

        }

    }



    // إذا لا توجد خلفية اليوم نختار عشوائياً
    if(!today){


        today =
        wallpapers[
            Math.floor(
                Math.random() *
                wallpapers.length
            )
        ];



        localStorage.setItem(

            "dailyWallpaper",

            JSON.stringify({

                id:
                today.id,

                date:
                todayKey

            })

        );


    }



    if(!today){
        return;
    }



    const img =
    document.getElementById(
        "todayImage"
    );


    const title =
    document.getElementById(
        "todayTitle"
    );


    const desc =
    document.getElementById(
        "todayDescription"
    );


    const view =
    document.getElementById(
        "todayView"
    );


    const download =
    document.getElementById(
        "todayDownload"
    );



    if(img){

        img.src =
        getImageUrl(
            today.thumbnail ||
            today.image
        );

    }



    if(title){

        title.textContent =
        today.title ||
        "خلفية اليوم";

    }



    if(desc){

        desc.textContent =
        today.category ||
        "Wallpaper";

    }



    if(view){

        view.onclick = () => {

            openWallpaper(
                today.id
            );

        };

    }



    if(download){

        download.onclick = () => {


            const a =
            document.createElement(
                "a"
            );


            a.href =
            getImageUrl(
                today.image
            );


            a.download =
            (today.title || "wallpaper")
            + ".jpg";


            document.body.appendChild(a);


            a.click();


            a.remove();


        };

    }


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

// ======================
// Side Drawer
// ======================

const menuBtn = document.getElementById("menuBtn");
const sideDrawer = document.getElementById("sideDrawer");
const drawerOverlay = document.getElementById("drawerOverlay");
const drawerClose = document.getElementById("drawerClose");
const aiFab = document.getElementById("aiFab");


if(menuBtn && sideDrawer && drawerOverlay){


menuBtn.onclick = () => {

    // تحريك الزر ☰ إلى X
    menuBtn.classList.add("active");


    // فتح القائمة
    setTimeout(()=>{

        sideDrawer.classList.add("show");
        drawerOverlay.classList.add("show");
        document.body.classList.add("drawer-open");

    },120);


    // إخفاء AI
    if(aiFab){
        aiFab.classList.add("drawer-open");
    }

};



}


if(drawerClose){

drawerClose.onclick = closeDrawer;

}


if(drawerOverlay){

drawerOverlay.onclick = closeDrawer;

}



function closeDrawer(){

    // إغلاق القائمة
    sideDrawer.classList.remove("show");
    drawerOverlay.classList.remove("show");
document.body.classList.remove("drawer-open");

    // رجوع X إلى ☰
    if(menuBtn){

        menuBtn.classList.remove("active");

    }


    // إظهار AI
    if(aiFab){

        aiFab.classList.remove("drawer-open");

    }

}

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

//دالة جلب خلفيات //

async function loadWallhavenAI(){

try{


const res =
await fetch("/api/wallpapers");



const wallpapers =
await res.json();



const container =
document.getElementById("wallhavenAI");



if(!container)
return;



container.innerHTML="";



wallpapers

.filter(w =>
w.source === "wallhaven" &&
w.category === "wallhaven"
)

.slice(0,10)

.forEach(w=>{


const card =
document.createElement("div");


card.className =
"wall-card";



card.innerHTML = `

<img src="${w.thumbnail || w.image}">


`;



card.onclick=()=>{


location.href =
"wallpaper.html?id="+w.id;


};



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
        loadWallhavenAI();

    }

);