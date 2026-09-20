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
                preview: list[0] ? getImageUrl(list[0].thumbnail || list[0].image) : ""
            };
        }

        const matches = list.filter(wallpaper =>
            categoryMatches(definition.key, wallpaper.category)
        );

        return {
            ...definition,
            count: matches.length,
            preview: matches[0] ? getImageUrl(matches[0].thumbnail || matches[0].image) : ""
        };
    });
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
            ${item.preview ? `<img src="${escapeHtml(item.preview)}" alt="" loading="lazy" decoding="async">` : ""}
            <div class="home-category-overlay" aria-hidden="true"></div>
            <span class="home-category-icon" aria-hidden="true"></span>
        </div>
        <div class="home-category-bottom">
            <p class="home-cat-title">${escapeHtml(item.title)}</p>
            <span class="home-cat-count" data-count>${formatCategoryCount(item.count)}</span>
        </div>
    `;

    const image = card.querySelector("img");
    if (image) image.addEventListener("error", () => image.remove(), { once: true });

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

function renderHomeCategories(wallpapers) {
    const container = document.getElementById("homeCategories");
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
    const container = document.getElementById("homeCategories");
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

document.addEventListener("DOMContentLoaded", initCategories);
window.initHomeCategories = initCategories;
window.renderHomeCategories = renderHomeCategories;
