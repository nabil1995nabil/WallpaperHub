// =======================================
// WallpaperHub — Dynamic Categories
// Counts come from the server / Supabase.
// No fake/static counts and no old animation.
// =======================================

const HOME_CATEGORY_DEFINITIONS = [
    { key: "all",      title: "All",     icon: "🌍", iconClass: "all-bg" },
    { key: "nature",  title: "Nature", icon: "🌿", iconClass: "nature-bg" },
    { key: "anime",   title: "Anime",  icon: "⭐", iconClass: "anime-bg" },
    { key: "cars",    title: "Cars",   icon: "🚗", iconClass: "cars-bg" },
    { key: "space",   title: "Space",  icon: "🪐", iconClass: "space-bg" },
    { key: "minimal", title: "Minimal",icon: "◎",  iconClass: "minimal-bg" },
    { key: "games",   title: "Gaming", icon: "🎮", iconClass: "games-bg" },
    { key: "ai",      title: "AI Art", icon: "🤖", iconClass: "ai-bg" },
    { key: "city",    title: "City",   icon: "🏙️", iconClass: "city-bg" },
    { key: "amoled",  title: "AMOLED", icon: "📱", iconClass: "amoled-bg" },
    { key: "animals", title: "Animals",icon: "🐱", iconClass: "animals-bg" },
    { key: "dark",    title: "Dark",   icon: "🖤", iconClass: "dark-bg" },
    { key: "4k",      title: "4K Ultra",icon:"💎", iconClass: "k4-bg" },
    { key: "sports",  title: "Sports", icon: "⚽", iconClass: "sports-bg" }
];

function formatCategoryCount(value) {
    const count = Number(value);
    if (!Number.isFinite(count)) return "—";
    return new Intl.NumberFormat("en-US").format(Math.max(0, count));
}

function createCategoryCard(definition, count) {
    const card = document.createElement("div");
    card.className = "category";
    card.dataset.category = definition.key;
    card.setAttribute("role", "listitem");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `${definition.title}: ${formatCategoryCount(count)} wallpapers`);

    card.innerHTML = `
        <div class="emoji-box ${definition.iconClass}" aria-hidden="true">${definition.icon}</div>
        <div class="cat-info">
            <p class="cat-title">${definition.title}</p>
            <span class="cat-count">${formatCategoryCount(count)}</span>
        </div>
    `;

    const openCategory = () => {
        if (definition.key === "all") {
            window.location.href = "all-wallpapers.html";
            return;
        }
        window.location.href =
            "all-wallpapers.html?category=" + encodeURIComponent(definition.key);
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

async function fetchCategoryCounts() {
    const response = await fetch("/api/categories?_=" + Date.now(), {
        method: "GET",
        cache: "no-store",
        headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
        throw new Error(`Categories API failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.categories)) {
        throw new Error("Invalid categories response");
    }

    return data.categories;
}

async function initCategories() {
    const container = document.getElementById("homeCategories") ||
        document.querySelector(".category-grid");

    if (!container) return;

    container.innerHTML = "";

    try {
        const serverCategories = await fetchCategoryCounts();
        const countMap = new Map(
            serverCategories.map(item => [String(item.key).toLowerCase(), Number(item.count)])
        );

        HOME_CATEGORY_DEFINITIONS.forEach(definition => {
            container.appendChild(
                createCategoryCard(definition, countMap.get(definition.key) ?? 0)
            );
        });
    } catch (error) {
        console.error("CATEGORIES LOAD ERROR:", error);

        const state = document.createElement("div");
        state.className = "categories-state error";
        state.textContent = "Unable to load category counts.";
        state.setAttribute("role", "status");
        container.appendChild(state);
    }
}

document.addEventListener("DOMContentLoaded", initCategories);

// Compatibility with the rest of WallpaperHub.
window.initHomeCategories = initCategories;
