// WallpaperHub — Categories (fixed)
// Uses the same /api/wallpapers endpoint already used by the home page.
// This avoids depending on a separate /api/categories route.

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
    { key: "sports", title: "Sports" },
    { key: "snow", title: "Snow & Winter" },
    { key: "aurora", title: "Aurora" },
    { key: "cyberpunk", title: "Cyberpunk" },
    { key: "gradients", title: "Gradients" }
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
    sports: ["sports", "sport", "رياضة", "الرياضة"],
    snow: ["snow", "winter", "ثلج", "الثلج", "شتاء", "الشتاء"],
    aurora: ["aurora", "aurora borealis", "الشفق القطبي", "الشفق"],
    cyberpunk: ["cyberpunk", "سايبربانك", "سايبر بانك"],
    gradients: ["gradients", "gradient", "colors", "colours", "تدرجات", "التدرجات", "ألوان", "الوان"]
};

function normalizeCategory(value) {
    return String(value ?? "").trim().toLowerCase();
}

function categoryMatches(key, value) {
    const normalized = normalizeCategory(value);
    return normalized === key ||
        (CATEGORY_ALIASES[key] || []).some(alias => normalizeCategory(alias) === normalized);
}

function formatCategoryCount(value) {
    const count = Number(value);
    return Number.isFinite(count)
        ? new Intl.NumberFormat("en-US").format(Math.max(0, count))
        : "0";
}

function getImageUrl(value) {
    if (!value) return "";
    const image = String(value);

    if (/^https?:\/\//i.test(image) || image.startsWith("//")) return image;
    if (image.startsWith("/")) return image;
    if (image.startsWith("assets/")) return image;

    return "assets/wallpapers/" + image;
}

function categoryIsGifMedia(wallpaper){
    if(!wallpaper) return false;
    const type = String(wallpaper.type || "").toLowerCase();
    if(type === "gif") return true;
    return String(wallpaper.image || "").toLowerCase().includes(".gif");
}


function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function buildCategoryData(wallpapers) {
    const list = Array.isArray(wallpapers) ? wallpapers.filter(Boolean) : [];

    return HOME_CATEGORY_DEFINITIONS.map(definition => {
        if (definition.key === "all") {
            return {
                ...definition,
                count: list.length,
                preview: list[0] ? getImageUrl(categoryIsGifMedia(list[0]) ? list[0].image : (list[0].thumbnail || list[0].image)) : ""
            };
        }

        const matches = list.filter(wallpaper =>
            categoryMatches(definition.key, wallpaper.category)
        );

        return {
            ...definition,
            count: matches.length,
            preview: matches[0] ? getImageUrl(categoryIsGifMedia(matches[0]) ? matches[0].image : (matches[0].thumbnail || matches[0].image)) : ""
        };
    });
}

const CATEGORY_INLINE_SVGS = {
    all: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    nature: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V11"/><path d="M12 15C5 15 3 10 4 5c5 0 9 2 8 10Z"/><path d="M12 17c0-6 4-9 8-9 1 5-2 9-8 9Z"/></svg>',
    cars: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 11 2-5h10l2 5 2 2v5h-2"/><path d="M5 18H3v-5l2-2"/><path d="M5 11h14"/><path d="M7 18h10"/><circle cx="7" cy="17" r="1.5"/><circle cx="17" cy="17" r="1.5"/></svg>',
    anime: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 14 8l5-2-2 5 4 3-6 1-3 5-3-5-6-1 4-3-2-5 5 2Z"/></svg>',
    space: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M3 12c2-7 16-10 18-3s-11 13-16 9c-2-1-3-3-2-6Z"/><circle cx="18.5" cy="5" r="1"/></svg>',
    ai: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="6" width="14" height="13" rx="3"/><path d="M9 3v3m6-3v3M9 12h.01M15 12h.01M9 16h6M2 10h3m14 0h3M9 19v2m6-2v2"/></svg>',
    animals: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 13c-3-1-5 1-4 4 1 2 4 2 6 1h4c2 1 5 1 6-1 1-3-1-5-4-4l-4 2Z"/><circle cx="6" cy="8" r="2"/><circle cx="11" cy="6" r="2"/><circle cx="16" cy="6" r="2"/><circle cx="20" cy="9" r="2"/></svg>',
    city: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21V9h6v12M9 21V4h7v17M16 21v-9h5v9"/><path d="M5 12h2m-2 3h2m5-8h2m-2 4h2m-2 4h2m5 0h1m-1 3h1"/></svg>',
    amoled: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2"/></svg>',
    minimal: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><path d="M12 5v14M5 12h14"/></svg>',
    games: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8h10a4 4 0 0 1 4 4l1 5a2 2 0 0 1-3 2l-4-3H9l-4 3a2 2 0 0 1-3-2l1-5a4 4 0 0 1 4-4Z"/><path d="M8 11v4m-2-2h4m6-1h.01M18 14h.01"/></svg>',
    dark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></svg>',
    "4k": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>',
    sports: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m12 7 4 3-2 5h-5l-2-5 5-3Zm-5 3-3-1m10 6 2 4m-7-4-2 4m7-9 3-2"/></svg>',
    snow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M3.34 7l17.32 10M3.34 17 20.66 7M8 4l4 3 4-3M8 20l4-3 4 3M3 11l4-1 1-4M20 13l-4 1-1 4M3 13l4 1 1 4M20 11l-4-1-1-4"/></svg>',
    aurora: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 18c3-7 4-12 7-12s4 9 7 9 4-6 6-8"/><path d="M2 21h20M3 18l5-4 4 3 4-5 5 3"/><path d="M6 4h.01M17 3h.01"/></svg>',
    cyberpunk: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21V9h5v12M8 21V4h7v17M15 21v-9h6v9"/><path d="M10 7h3m-3 4h3m-3 4h3M5 12h1m13 3h1"/><path d="m2 5 3-2 3 2M16 3l2-2 2 2"/></svg>',
    gradients: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="5"/><circle cx="16" cy="8" r="5"/><circle cx="8" cy="16" r="5"/><circle cx="16" cy="16" r="5"/></svg>'
};

function applyCategoryIcon(card, key) {
    const icon = card.querySelector(".home-category-icon");
    if (!icon) return;
    icon.innerHTML = CATEGORY_INLINE_SVGS[key] || CATEGORY_INLINE_SVGS.all;
}

function createCategoryCard(item) {
    const card = document.createElement("div");
    card.className = "home-category";
    card.dataset.category = item.key;
    card.setAttribute("role", "listitem");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label",
        `${item.title}: ${formatCategoryCount(item.count)} wallpapers`);

    card.innerHTML = `
        <div class="home-category-media">
            <div class="home-category-fallback" aria-hidden="true"></div>
            <div class="home-category-overlay" aria-hidden="true"></div>
            <span class="home-category-icon" aria-hidden="true"></span>
        </div>
        <div class="home-category-bottom">
            <p class="home-cat-title">${escapeHtml(item.title)}</p>
            <span class="home-cat-count" data-count>${formatCategoryCount(item.count)}</span>
        </div>
    `;
    applyCategoryIcon(card, item.key);

    const openCategory = () => {
        window.location.href = item.key === "all"
            ? "all-wallpapers.html"
            : "all-wallpapers.html?category=" + encodeURIComponent(item.key);
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

function getCategoryGrid() {
    // components.js may place this component inside an outer #homeCategories.
    // Always render into the internal horizontal grid, never into the wrapper.
    return document.querySelector("#homeCategories .home-category-grid") ||
        document.querySelector(".home-category-grid");
}

function renderHomeCategories(wallpapers) {
    const container = getCategoryGrid();
    if (!container) return;

    container.innerHTML = "";
    buildCategoryData(wallpapers).forEach(item => {
        container.appendChild(createCategoryCard(item));
    });

    const allCard = container.querySelector('[data-category="all"]');
    if (allCard) allCard.classList.add("active");
}

async function fetchWallpapersForCategories() {
    const response = await fetch("/api/wallpapers?_categories=" + Date.now(), {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" }
    });

    if (!response.ok) {
        throw new Error(`Wallpaper API failed: ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Wallpaper API did not return an array.");

    return data;
}

async function initCategories() {
    const container = getCategoryGrid();
    if (!container) return;

    container.innerHTML = `
        <div class="home-categories-state" role="status">Loading categories…</div>
    `;

    try {
        const wallpapers = await fetchWallpapersForCategories();
        renderHomeCategories(wallpapers);
    } catch (error) {
        console.error("CATEGORIES LOAD ERROR:", error);
        // لا نترك Loading عالقًا. نعرض البطاقات حتى لو تعذر API.
        renderHomeCategories([]);
    }
}

window.initHomeCategories = initCategories;
window.renderHomeCategories = renderHomeCategories;

document.addEventListener("DOMContentLoaded", () => {
    // If the component is already present, initialize it.
    if (getCategoryGrid()) initCategories();
});
