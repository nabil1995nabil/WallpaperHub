// WallpaperHub — Categories FIX
// مهم: هذا الملف لا يحتاج أي تعديل في home.html.
// يعمل سواء تم تحميل home-categories.html مباشرة أو عبر components.js.

const HOME_CATEGORY_DEFINITIONS = [
    { key: "all", title: "All" },
    { key: "nature", title: "Nature" },
    { key: "cars", title: "Cars" },
    { key: "anime", title: "Anime" },
    { key: "space", title: "Space" },
    { key: "ai", title: "AI Art" },
    { key: "animals", title: "Animals" },
    { key: "city", title: "City" },
    { key: "amoled", title: "AMOLED" },
    { key: "minimal", title: "Minimal" },
    { key: "games", title: "Gaming" },
    { key: "dark", title: "Dark" },
    { key: "4k", title: "4K Ultra" },
    { key: "sports", title: "Sports" }
];

const CATEGORY_ALIASES = {
    nature: ["nature", "طبيعة", "الطبيعة"],
    cars: ["cars", "car", "سيارات", "السيارات"],
    anime: ["anime", "انمي", "الأنمي", "أنمي"],
    space: ["space", "فضاء", "الفضاء"],
    ai: ["ai", "ai art", "ذكاء اصطناعي", "الذكاء الاصطناعي"],
    animals: ["animals", "animal", "حيوانات", "الحيوانات"],
    city: ["city", "cities", "مدن", "المدن"],
    amoled: ["amoled", "اموليد"],
    minimal: ["minimal", "مينيمال"],
    games: ["games", "gaming", "game", "العاب", "الألعاب", "ألعاب"],
    dark: ["dark", "داكن", "مظلم"],
    "4k": ["4k", "فور كي"],
    sports: ["sports", "sport", "رياضة", "الرياضة"]
};

let categoriesInitRunning = false;
let categoriesObserverStarted = false;

function normalizeCategory(value) {
    return String(value ?? "").trim().toLowerCase();
}

function categoryMatches(key, value) {
    const normalized = normalizeCategory(value);

    return normalized === key ||
        (CATEGORY_ALIASES[key] || []).some(
            alias => normalizeCategory(alias) === normalized
        );
}

function formatCategoryCount(value) {
    const count = Number(value);

    return Number.isFinite(count)
        ? new Intl.NumberFormat("en-US").format(Math.max(0, count))
        : "0";
}

function getImageUrl(value) {
    if (!value) return "";

    const image = String(value).trim();

    if (/^https?:\/\//i.test(image)) return image;
    if (image.startsWith("//")) return image;
    if (image.startsWith("/")) return image;
    if (image.startsWith("assets/")) return image;

    return "assets/wallpapers/" + image;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getCategoryContainer() {
    return document.getElementById("homeCategories");
}

function buildCategoryData(wallpapers) {
    const list = Array.isArray(wallpapers)
        ? wallpapers.filter(Boolean)
        : [];

    return HOME_CATEGORY_DEFINITIONS.map(definition => {
        if (definition.key === "all") {
            return {
                ...definition,
                count: list.length,
                preview: list[0]
                    ? getImageUrl(list[0].thumbnail || list[0].image)
                    : ""
            };
        }

        const matches = list.filter(wallpaper =>
            categoryMatches(definition.key, wallpaper?.category)
        );

        return {
            ...definition,
            count: matches.length,
            preview: matches[0]
                ? getImageUrl(matches[0].thumbnail || matches[0].image)
                : ""
        };
    });
}

function createCategoryCard(item) {
    const card = document.createElement("div");

    card.className = "category";
    card.dataset.category = item.key;
    card.setAttribute("role", "listitem");
    card.setAttribute("tabindex", "0");
    card.setAttribute(
        "aria-label",
        `${item.title}: ${formatCategoryCount(item.count)} wallpapers`
    );

    card.innerHTML = `
        <div class="category-media">
            <div class="category-fallback" aria-hidden="true"></div>

            ${
                item.preview
                    ? `<img src="${escapeHtml(item.preview)}"
                            alt=""
                            loading="lazy"
                            decoding="async">`
                    : ""
            }

            <div class="category-overlay" aria-hidden="true"></div>
            <span class="category-icon" aria-hidden="true"></span>
        </div>

        <div class="category-bottom">
            <p class="cat-title">${escapeHtml(item.title)}</p>
            <span class="cat-count" data-count>
                ${formatCategoryCount(item.count)}
            </span>
        </div>
    `;

    const image = card.querySelector("img");

    if (image) {
        image.addEventListener(
            "error",
            () => image.remove(),
            { once: true }
        );
    }

    const openCategory = () => {
        window.location.href =
            item.key === "all"
                ? "all-wallpapers.html"
                : "all-wallpapers.html?category=" +
                  encodeURIComponent(item.key);
    };

    card.addEventListener("click", openCategory);

    card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openCategory();
        }
    });

    return card;
}

function renderHomeCategories(wallpapers) {
    const container = getCategoryContainer();

    if (!container) return;

    container.innerHTML = "";

    buildCategoryData(wallpapers).forEach(item => {
        container.appendChild(createCategoryCard(item));
    });

    const allCard =
        container.querySelector('[data-category="all"]');

    if (allCard) {
        allCard.classList.add("active");
    }
}

async function fetchWallpapersForCategories() {
    const controller = new AbortController();

    const timeout = setTimeout(
        () => controller.abort(),
        10000
    );

    try {
        const response = await fetch(
            "/api/wallpapers?_categories=" + Date.now(),
            {
                method: "GET",
                cache: "no-store",
                headers: {
                    Accept: "application/json"
                },
                signal: controller.signal
            }
        );

        if (!response.ok) {
            throw new Error(
                `Wallpaper API failed: ${response.status}`
            );
        }

        const data = await response.json();

        // يدعم أكثر من شكل للـAPI:
        // [ ... ]
        // { data: [ ... ] }
        // { wallpapers: [ ... ] }
        if (Array.isArray(data)) {
            return data;
        }

        if (Array.isArray(data?.data)) {
            return data.data;
        }

        if (Array.isArray(data?.wallpapers)) {
            return data.wallpapers;
        }

        throw new Error(
            "Wallpaper API returned an unsupported format."
        );

    } finally {
        clearTimeout(timeout);
    }
}

async function initCategories() {
    const container = getCategoryContainer();

    // الصفحة الرئيسية تحمل component لاحقاً،
    // لذلك إذا لم يصل بعد نخرج بدون تسجيل خطأ.
    if (!container) return;

    // منع تشغيل الطلب مرتين في نفس اللحظة.
    if (categoriesInitRunning) return;

    categoriesInitRunning = true;

    container.innerHTML = `
        <div class="categories-state" role="status">
            Loading categories…
        </div>
    `;

    try {
        const wallpapers =
            await fetchWallpapersForCategories();

        renderHomeCategories(wallpapers);

    } catch (error) {
        console.error(
            "CATEGORIES LOAD ERROR:",
            error
        );

        // لا نترك Loading عالقاً أبداً.
        // حتى لو تعطل API، نظهر البطاقات بأعداد 0.
        renderHomeCategories([]);

    } finally {
        categoriesInitRunning = false;
    }
}

/*
 * مهم جداً:
 * components.js يقوم بإدخال home-categories.html
 * ثم يستدعي window.initHomeCategories().
 *
 * وفي بعض التحميلات قد يتم تحميل هذا JS بعد components.js.
 * لذلك نستخدم MutationObserver كشبكة أمان.
 */
function startCategoriesObserver() {
    if (categoriesObserverStarted) return;

    categoriesObserverStarted = true;

    const tryInit = () => {
        if (getCategoryContainer()) {
            initCategories();
        }
    };

    // إذا كان DOM جاهزاً بالفعل.
    if (
        document.readyState === "interactive" ||
        document.readyState === "complete"
    ) {
        tryInit();
    } else {
        document.addEventListener(
            "DOMContentLoaded",
            tryInit,
            { once: true }
        );
    }

    // يلتقط لحظة إدخال home-categories.html بواسطة components.js.
    const observer = new MutationObserver(() => {
        if (getCategoryContainer()) {
            tryInit();
            observer.disconnect();
        }
    });

    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    } else {
        window.addEventListener(
            "DOMContentLoaded",
            () => {
                if (document.body) {
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                }

                tryInit();
            },
            { once: true }
        );
    }
}

// components.js يستعمل هذه الدالة بعد تحميل component.
window.initHomeCategories = initCategories;
window.renderHomeCategories = renderHomeCategories;

// تشغيل آمن سواء تم تحميل الملف قبل أو بعد DOM.
startCategoriesObserver();
