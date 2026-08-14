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
renderSlider();
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
let currentSlide = 0;
let sliderInterval;

function startSlider() {

    const slides =
        document.querySelectorAll("#sliderContent .slide");

    const dots =
        document.querySelectorAll("#sliderDots .slider-dot");

    if (!slides.length) return;

    clearInterval(sliderInterval);

    currentSlide = 0;


    function showSlide(index) {

        const newIndex =
            (index + slides.length) % slides.length;

        const oldSlide =
            document.querySelector(
                "#sliderContent .slide.active"
            );

        const newSlide = slides[newIndex];


        // إذا كانت هي نفس الصورة
        if (oldSlide === newSlide) {

            currentSlide = newIndex;

            updateSliderDots(
                dots,
                currentSlide
            );

            return;
        }


        // إخراج الصورة القديمة
        if (oldSlide) {

            oldSlide.classList.remove("active");

            oldSlide.classList.add("slide-out");

            setTimeout(() => {

                oldSlide.classList.remove("slide-out");

            }, 560);

        }


        // إظهار الصورة الجديدة
        newSlide.classList.add("active");

        currentSlide = newIndex;


        // تحديث النقاط
        updateSliderDots(
            dots,
            currentSlide
        );

    }


    // إظهار أول صورة
    showSlide(0);


    // التبديل التلقائي
    sliderInterval = setInterval(() => {

        showSlide(currentSlide + 1);

    }, 4000);


    // الضغط على النقاط
    dots.forEach((dot, index) => {

        dot.onclick = function(event) {

            event.stopPropagation();

            showSlide(index);

            clearInterval(sliderInterval);

            sliderInterval = setInterval(() => {

                showSlide(currentSlide + 1);

            }, 4000);

        };

    });

}

function updateSliderDots(dots, index) {

    dots.forEach((dot, i) => {

        dot.classList.toggle(
            "active",
            i === index
        );

    });
    
}

// =======================================
// إنشاء السلايدر
// =======================================

function renderSlider(){


    const slider =
    document.getElementById("sliderContent");


    const dotsContainer =
    document.getElementById("sliderDots");


    if(!slider)
        return;



    slider.innerHTML = "";


    if(dotsContainer){

        dotsContainer.innerHTML = "";

    }




    const sliderWallpapers =

    wallpapers

    .slice()

    .reverse()

    .slice(0,10);





    sliderWallpapers.forEach((wall,index)=>{


        const slide =
        document.createElement("div");



        slide.className =
        "slide";



        slide.dataset.id =
        wall.id;




        let media = "";




        if(isVideoMedia(wall)){


            media = `

            <video

            src="${getImageUrl(wall.image)}"

            muted

            autoplay

            loop

            playsinline>

            </video>

            `;



        }else{


            media = `

            <img

            src="${getImageUrl(
                wall.thumbnail || wall.image
            )}"

            alt="${wall.title || 'Wallpaper'}">

            `;


        }





        slide.innerHTML = media;




        slide.onclick = ()=>{

            openWallpaper(wall.id);

        };



        slider.appendChild(slide);






        if(dotsContainer){


            const dot =
            document.createElement("span");


            dot.className =
            "slider-dot";



            dotsContainer.appendChild(dot);


        }



    });




    startSlider();

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

    4k: "💎 4K",

    sports: "⚽ الرياضة",

    minimal: "✨ Minimal"


};

// =======================================

function createDynamicSections() {

    if (!dynamicSections) return;

    dynamicSections.innerHTML = "";

    const categories =
    [...new Set(wallpapers.map(w => w.category))];

    categories.forEach(category => {

        const section =
        document.createElement("section");

        section.className =
        "wall-section";

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
// عرض خلفيات القسم
// =======================================

function renderCategory(category) {

    const container =
    document.getElementById(
        `section-${category}`
    );

    if (!container) return;

    container.innerHTML = "";

    wallpapers

    .filter(w => w.category === category)

    .slice(0,6)

    .forEach(wall => {

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
//========

function loadTodayWallpaper() {

    const today =
        wallpapers.find(w => w.todayWallpaper)
        || wallpapers.find(w => w.featured)
        || wallpapers[0];

    if (!today) return;


    const img = document.getElementById("todayImage");
    const title = document.getElementById("todayTitle");
    const desc = document.getElementById("todayDescription");
    const view = document.getElementById("todayView");
    const download = document.getElementById("todayDownload");


    if(img){
        img.src = getImageUrl(today.thumbnail || today.image);
    }

    if(title){
        title.textContent = today.title;
    }

    if(desc){
        desc.textContent = today.category;
    }

    if(view){
        view.onclick = () => openWallpaper(today.id);
    }

    if(download){
        download.onclick = () => {

            const a = document.createElement("a");
            a.href = getImageUrl(today.image);
            a.download = today.title + ".jpg";
            a.click();

        };
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