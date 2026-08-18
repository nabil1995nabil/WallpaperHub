// ==========================================
// WallpaperHub - All Wallpapers
// ==========================================

const API_URL = "/api/wallpapers";

const SERVER_URL = "";

function getImageUrl(imagePath) {

    if (!imagePath) {
        return "assets/logo/no-image.png";
    }

    if (
        imagePath.startsWith("http://") ||
        imagePath.startsWith("https://")
    ) {
        return imagePath;
    }

    if (imagePath.startsWith("assets/")) {
        return "/" + imagePath;
    }

    return "/assets/wallpapers/" + imagePath;
}

// ============================
// العناصر
// ============================

const wallpapersGrid =
document.getElementById("wallpapersGrid");

const pageTitle =
document.getElementById("pageTitle");

const wallpaperCount =
document.getElementById("wallpaperCount");

const loading =
document.getElementById("loading");

const emptyState =
document.getElementById("emptyState");

const searchInput =
document.getElementById("searchInput");

const searchBtn =
document.getElementById("searchBtn");

const searchBox =
document.getElementById("searchBox");

const backBtn =
document.getElementById("backBtn");

const scrollTopBtn =
document.getElementById("scrollTop");

const filterButtons =
document.querySelectorAll(".filter-btn");


// ============================
// قراءة الرابط
// ============================

const params =
new URLSearchParams(location.search);

const type =
params.get("type");

const category =
params.get("category");


// ============================
// البيانات
// ============================

let allWallpapers = [];

let pageWallpapers = [];

let visibleWallpapers = [];

let currentFilter = "all";


// ============================
// أسماء الأقسام
// ============================

const categoryNames = {

    all: "جميع الخلفيات",

    nature: "🌿 خلفيات الطبيعة",

    cars: "🚗 خلفيات السيارات",

    games: "🎮 خلفيات الألعاب",

    space: "🌌 خلفيات الفضاء",

    ai: "🤖 خلفيات الذكاء الاصطناعي",

    amoled: "📱 خلفيات AMOLED",

    animals: "🐱 خلفيات الحيوانات",

    anime: "🌀 خلفيات الأنمي",

    city: "🏙️ خلفيات المدن",

    dark: "🖤 الخلفيات الداكنة",

    "4k": "💎 خلفيات 4K",

    sports: "⚽ خلفيات الرياضة",

    minimal: "✨ خلفيات Minimal"

};


// ============================
// أسماء أنواع عرض الكل
// ============================

const typeNames = {

    popular:
        "🔥 الأكثر شعبية",

    latest:
        "🆕 أحدث الخلفيات",

    downloaded:
        "🔥 الأكثر تحميلاً",

    liked:
        "❤️ الأكثر إعجاباً",

    recommended:
        "⭐ المقترحة لك"

};


// ============================
// تحميل الخلفيات
// ============================

async function loadWallpapers() {

    try {

        loading.style.display = "flex";

        emptyState.style.display = "none";

        wallpapersGrid.innerHTML = "";


        const response = await fetch(API_URL);


        if (!response.ok) {

            throw new Error(
                "HTTP " + response.status
            );

        }


        allWallpapers =
        await response.json();


        if (!Array.isArray(allWallpapers)) {

            allWallpapers = [];

        }


        preparePage();

        applyFilters();


    } catch (error) {

        console.error(
            "Wallpaper load error:",
            error
        );


        loading.style.display = "none";

        wallpapersGrid.innerHTML = "";


        emptyState.style.display = "block";

        emptyState.querySelector("h3")
        .textContent =
        "تعذر تحميل الخلفيات";

        emptyState.querySelector("p")
        .textContent =
        "تأكد أن السيرفر يعمل ثم حاول مرة أخرى.";

    }

}


// ============================
// تجهيز نوع الصفحة
// ============================

function preparePage() {

    pageWallpapers =
    [...allWallpapers];


    // ========================
    // قسم محدد
    // ========================

    if (category) {

        if (category !== "all") {

pageWallpapers =
pageWallpapers.filter(

wallpaper =>

String(wallpaper.category).toLowerCase()
===
String(category).toLowerCase()

);

        }


        pageTitle.textContent =
        categoryNames[category] ||
        "الخلفيات";


        return;

    }


    // ========================
    // أحدث الخلفيات
    // ========================

    if (type === "latest") {

        pageTitle.textContent =
        typeNames.latest;


        pageWallpapers.sort(
            (a, b) =>
            Number(b.id || 0) -
            Number(a.id || 0)
        );


        return;

    }


    // ========================
    // الأكثر شعبية
    // ========================

    if (type === "popular") {

        pageTitle.textContent =
        typeNames.popular;


        pageWallpapers =
        pageWallpapers.filter(
            wallpaper =>
            wallpaper.popular === true
        );


        return;

    }


    // ========================
    // الأكثر تحميلًا
    // ========================

if (type === "downloaded") {

    pageTitle.textContent =
    typeNames.downloaded;


    // إخفاء الخلفيات التي لم يتم تحميلها
    pageWallpapers =
    pageWallpapers.filter(
        wallpaper =>
        Number(wallpaper.downloads || 0) > 0
    );


    // ترتيب من الأكثر تحميلاً إلى الأقل
    pageWallpapers.sort(
        (a, b) =>
        Number(b.downloads || 0) -
        Number(a.downloads || 0)
    );


    return;

}


    // ========================
    // الأكثر إعجابًا
    // ========================

if (type === "liked") {

    pageTitle.textContent =
    typeNames.liked;

    // إخفاء الخلفيات التي ليس لديها إعجابات
    pageWallpapers =
    pageWallpapers.filter(
        wallpaper =>
        Number(wallpaper.likes || 0) > 0
    );

    // ترتيب من الأكثر إعجاباً إلى الأقل
    pageWallpapers.sort(
        (a, b) =>
        Number(b.likes || 0) -
        Number(a.likes || 0)
    );

    return;
}


    // ========================
    // المقترحة لك
    // ========================

    if (type === "recommended") {

        pageTitle.textContent =
        typeNames.recommended;


        /*
          حاليًا نرتبها حسب:
          التقييم + الشعبية + التحميلات
        */

        pageWallpapers.sort(
            (a, b) => {

                const scoreA =
                    Number(a.rating || 0) * 10 +
                    Number(a.downloads || 0) +
                    (a.popular ? 50 : 0);


                const scoreB =
                    Number(b.rating || 0) * 10 +
                    Number(b.downloads || 0) +
                    (b.popular ? 50 : 0);


                return scoreB - scoreA;

            }
        );


        return;

    }


    // ========================
    // الافتراضي
    // ========================

    pageTitle.textContent =
    "جميع الخلفيات";

}


// ============================
// تطبيق البحث والفلاتر
// ============================

function applyFilters() {

    visibleWallpapers =
    [...pageWallpapers];


    // ========================
    // البحث
    // ========================

    const search =
    searchInput.value
    .trim()
    .toLowerCase();


    if (search) {

        visibleWallpapers =
        visibleWallpapers.filter(
            wallpaper => {

                const title =
                String(
                    wallpaper.title || ""
                ).toLowerCase();


                const tags =
                Array.isArray(wallpaper.tags)
                ? wallpaper.tags.join(" ")
                .toLowerCase()
                : "";


                const wallCategory =
                String(
                    wallpaper.category || ""
                ).toLowerCase();


                return (
                    title.includes(search) ||
                    tags.includes(search) ||
                    wallCategory.includes(search)
                );

            }
        );

    }


    // ========================
    // فلتر 4K
    // ========================

    if (currentFilter === "4k") {

        visibleWallpapers =
        visibleWallpapers.filter(
            wallpaper =>
            getQuality(
                wallpaper.resolution
            ) === "4K"
        );

    }


    // ========================
    // الأكثر تحميلًا
    // ========================

    if (
        currentFilter ===
        "downloads"
    ) {

        visibleWallpapers.sort(
            (a, b) =>
            Number(b.downloads || 0) -
            Number(a.downloads || 0)
        );

    }


// ========================
// الأعلى تقييمًا
// ========================

if (
    currentFilter ===
    "rating"
) {

    visibleWallpapers.sort(
        (a, b) =>
        Number(b.rating || 0) -
        Number(a.rating || 0)
    );

}


// ========================
// فلتر الأقسام الجديدة
// ========================

if(
[
"anime",
"city",
"dark",
"sports",
"minimal"
]
.includes(currentFilter)

){


    visibleWallpapers =
    visibleWallpapers.filter(

        wallpaper =>

        String(wallpaper.category)
        .toLowerCase()
        ===
        currentFilter

    );


}


// رسم النتائج

renderWallpapers();

}
// ============================
// تحديد الجودة
// ============================

function getQuality(resolution) {

    if (!resolution) {

        return "HD";

    }


    const numbers =
    String(resolution)
    .match(/\d+/g);


    if (
        !numbers ||
        numbers.length < 2
    ) {

        return "HD";

    }


    const width =
    Number(numbers[0]);


    const height =
    Number(numbers[1]);


    const maxSide =
    Math.max(width, height);


    const minSide =
    Math.min(width, height);


    // 4K
    if (
        maxSide >= 3840 ||
        minSide >= 2160
    ) {

        return "4K";

    }


    // 2K
    if (
        maxSide >= 2560 ||
        minSide >= 1440
    ) {

        return "2K";

    }


    // Full HD
    if (
        maxSide >= 1920 ||
        minSide >= 1080
    ) {

        return "FHD";

    }


    return "HD";

}


// ============================
// رسم الخلفيات
// ============================

function renderWallpapers() {

    loading.style.display =
    "none";


    wallpapersGrid.innerHTML =
    "";


    wallpaperCount.textContent =
    `${visibleWallpapers.length} خلفية`;


    if (
        visibleWallpapers.length === 0
    ) {

        emptyState.style.display =
        "block";

        return;

    }


    emptyState.style.display =
    "none";


    visibleWallpapers.forEach(
        wallpaper => {

            const card =
            document.createElement("article");


            card.className =
            "wallpaper-card";


            const quality =
            getQuality(
                wallpaper.resolution
            );


            const imageSource =
    getImageUrl(
        wallpaper.thumbnail ||
        wallpaper.image ||
        ""
    );


            card.innerHTML = `

                <img
                    src="${imageSource}"
                    alt="${escapeHTML(
                        wallpaper.title ||
                        "Wallpaper"
                    )}"
                    loading="lazy"
                    decoding="async"
                >


                <span
                    class="quality-badge"
                >
                    ${quality}
                </span>


                <button
                    class="card-favorite"
                    type="button"
                    aria-label="المفضلة"
                >

                    <span
                        class="material-icons"
                    >
                        ${
                            isFavorite(
                                wallpaper.id
                            )
                            ? "favorite"
                            : "favorite_border"
                        }
                    </span>

                </button>


                <div
                    class="wallpaper-overlay"
                >

                    <div
                        class="wallpaper-title"
                    >
                        ${escapeHTML(
                            wallpaper.title ||
                            "Wallpaper"
                        )}
                    </div>


                   <div class="wallpaper-meta">

    <span class="wallpaper-resolution">
        ${
            wallpaper.resolution ||
            quality
        }
    </span>

    <div class="wallpaper-stats">

        <span class="wallpaper-stat">
            <span class="material-icons">
                file_download
            </span>

            ${
                Number(
                    wallpaper.downloads || 0
                )
            }
        </span>

        <span class="wallpaper-stat">
            <span class="material-icons">
                favorite
            </span>

            ${
                Number(
                    wallpaper.likes || 0
                )
            }
        </span>

    </div>

</div>

            `;


            // فتح الخلفية

            card.addEventListener(
                "click",
                () => {

                    localStorage.setItem(
                        "selectedWallpaper",
                        wallpaper.id
                    );


                    location.href =
                    "wallpaper.html?id=" +
                    encodeURIComponent(
                        wallpaper.id
                    );

                }
            );


            // زر المفضلة

            const favoriteButton =
            card.querySelector(
                ".card-favorite"
            );


            favoriteButton
            .addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    toggleFavorite(
                        wallpaper.id,
                        favoriteButton
                    );

                }
            );


            wallpapersGrid
            .appendChild(card);

        }
    );

}


// ============================
// المفضلة
// ============================

function isFavorite(id) {

    const favorites =
    JSON.parse(
        localStorage.getItem(
            "favorites"
        ) || "[]"
    )
    .map(String);


    return favorites.includes(
        String(id)
    );

}


function toggleFavorite(
    id,
    button
) {

    let favorites =
    JSON.parse(
        localStorage.getItem(
            "favorites"
        ) || "[]"
    )
    .map(String);



    id = String(id);



    if (
        favorites.includes(id)
    ) {


        favorites =
        favorites.filter(
            item =>
            item !== id
        );


        button.innerHTML = `
            <span class="material-icons">
                favorite_border
            </span>
        `;


    } else {


        favorites.push(id);


        button.innerHTML = `
            <span class="material-icons">
                favorite
            </span>
        `;

    }



    localStorage.setItem(
        "favorites",
        JSON.stringify(favorites)
    );

}


// ============================
// حماية النصوص
// ============================

function escapeHTML(value) {

    return String(value)

    .replace(
        /&/g,
        "&amp;"
    )

    .replace(
        /</g,
        "&lt;"
    )

    .replace(
        />/g,
        "&gt;"
    )

    .replace(
        /"/g,
        "&quot;"
    )

    .replace(
        /'/g,
        "&#039;"
    );

}


// ============================
// البحث
// ============================

searchInput.addEventListener(
    "input",
    () => {

        applyFilters();

    }
);


// زر البحث

searchBtn.addEventListener(
    "click",
    () => {

        searchInput.focus();

        searchBox.scrollIntoView({
            behavior:"smooth",
            block:"center"
        });

    }
);


// ============================
// الفلاتر
// ============================

filterButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                filterButtons
                .forEach(btn =>
                    btn.classList
                    .remove("active")
                );


                button.classList
                .add("active");


                currentFilter =
                button.dataset.filter;


                applyFilters();

            }
        );

    }
);


// ============================
// رجوع
// ============================

backBtn.addEventListener(
    "click",
    () => {

        history.back();

    }
);


// ============================
// العودة للأعلى
// ============================

window.addEventListener(
    "scroll",
    () => {

        if (
            window.scrollY > 500
        ) {

            scrollTopBtn.style.display =
            "flex";

        } else {

            scrollTopBtn.style.display =
            "none";

        }

    }
);


scrollTopBtn.addEventListener(
    "click",
    () => {

        window.scrollTo({
            top:0,
            behavior:"smooth"
        });

    }
);


// ============================
// تشغيل الصفحة
// ============================

loadWallpapers();