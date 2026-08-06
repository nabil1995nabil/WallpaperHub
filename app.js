/* ==================================
   WallpaperHub - app.js
================================== */

const API_URL = "http://localhost:3000/api/wallpapers";
const SERVER_URL = "http://localhost:3000";

function getImageUrl(imagePath) {

    if (!imagePath) return "";

    if (
        imagePath.startsWith("http://") ||
        imagePath.startsWith("https://")
    ) {
        return imagePath;
    }

    return SERVER_URL + "/" +
        imagePath.replace(/^\/+/, "");
}

let wallpapers = [];
let currentCategory = "all";

/* ==========================
   تحميل الخلفيات
========================== */

async function loadWallpapers() {

    try {

        const response = await fetch(API_URL);

        wallpapers = await response.json();

        // عند القدوم من صفحة الأقسام
        const selectedCategory = localStorage.getItem("selectedCategory");

        if (selectedCategory) {

            if (selectedCategory === "all") {

                renderWallpapers(wallpapers);

            } else {

                const filtered = wallpapers.filter(w =>
                    w.category === selectedCategory
                );

                renderWallpapers(filtered);

            }

            localStorage.removeItem("selectedCategory");

        } else {

            renderWallpapers(wallpapers);

        }

        loadTodayWallpaper();

    } catch (err) {

        console.error("Error:", err);

    }

}

/* ==========================
   عرض الخلفيات
========================== */

function renderWallpapers(list) {

    const popular = document.getElementById("popularWallpapers");
    const newest = document.getElementById("newWallpapers");

    if (!popular || !newest) return;

    popular.innerHTML = "";
    newest.innerHTML = "";

    list.forEach((wallpaper, index) => {

        const card = createCard(wallpaper);

        if (index < 6)
            popular.appendChild(card);

        if (index < 4)
            newest.appendChild(card.cloneNode(true));

    });

    addCardEvents();

}

/* ==========================
   إنشاء البطاقة
========================== */

function createCard(wallpaper) {

    const card = document.createElement("div");

    card.className = "wall-card";

    card.dataset.id = wallpaper.id;

    card.innerHTML = `

    <div class="favorite-btn">❤</div>

    <img
    src="${getImageUrl(wallpaper.thumbnail || wallpaper.image)}"
    alt="${wallpaper.title}"
>

    <div class="wall-info">

        <h4>${wallpaper.title}</h4>

        <p>${wallpaper.category}</p>

    </div>

    `;

    return card;

}

/* ==========================
   الضغط على البطاقة
========================== */

function addCardEvents() {

    document.querySelectorAll(".wall-card").forEach(card => {

        card.onclick = () => {

            location.href =
            "wallpaper.html?id=" + card.dataset.id;

        };

    });

}

/* ==========================
   المفضلة
========================== */

document.addEventListener("click", e => {

    if (e.target.classList.contains("favorite-btn")) {

        e.stopPropagation();

        const card = e.target.closest(".wall-card");

        const id = Number(card.dataset.id);

        let favorites = JSON.parse(
            localStorage.getItem("favorites") || "[]"
        );

        if (favorites.includes(id)) {

            favorites = favorites.filter(item => item !== id);

            e.target.classList.remove("active");

        } else {

            favorites.push(id);

            e.target.classList.add("active");

        }

        localStorage.setItem(
            "favorites",
            JSON.stringify(favorites)
        );

    }

});

/* ==========================
   البحث
========================== */

const searchInput = document.getElementById("searchInput");

if (searchInput) {

    searchInput.addEventListener("input", () => {

        const text = searchInput.value.toLowerCase().trim();

        if (text === "") {

            renderWallpapers(wallpapers);

            return;

        }

        const result = wallpapers.filter(w =>

            w.title.toLowerCase().includes(text) ||

            w.category.toLowerCase().includes(text) ||

            (w.tags && w.tags.join(" ").toLowerCase().includes(text))

        );

        renderWallpapers(result);

    });

}

/* ==========================
   الأقسام
========================== */

document.querySelectorAll(".category").forEach(category => {

    category.onclick = () => {

        document.querySelectorAll(".category")
        .forEach(c => c.classList.remove("active"));

        category.classList.add("active");

        currentCategory = category.dataset.category;

        if (currentCategory === "all") {

            renderWallpapers(wallpapers);

        } else {

            renderWallpapers(

                wallpapers.filter(w =>
                    w.category === currentCategory
                )

            );

        }

    };

});

/* ==========================
   السلايدر
========================== */

const slides = document.querySelectorAll(".slide");

let currentSlide = 0;

if (slides.length > 0) {

    setInterval(() => {

        slides[currentSlide].classList.remove("active");

        currentSlide++;

        if (currentSlide >= slides.length)
            currentSlide = 0;

        slides[currentSlide].classList.add("active");

    }, 4000);

}

/* ==========================
   خلفية اليوم
========================== */

function loadTodayWallpaper() {

    const today = wallpapers.find(w => w.featured);

    if (!today) return;

    const image = document.getElementById("todayImage");
    const title = document.getElementById("todayTitle");
    const view = document.getElementById("todayView");
    const download = document.getElementById("todayDownload");

    if (image)
        image.src = getImageUrl(today.image);

    if (title)
        title.textContent = today.title;

    if (view) {

        view.onclick = () => {

            location.href =
            "wallpaper.html?id=" + today.id;

        };

    }

    if (download) {

        download.onclick = () => {

            const a = document.createElement("a");

            a.href = getImageUrl(today.image);

            a.download = today.title + ".jpg";

            a.click();

        };

    }

}

/* ==========================
   تشغيل التطبيق
========================== */

loadWallpapers();