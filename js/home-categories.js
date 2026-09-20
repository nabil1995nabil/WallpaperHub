// WallpaperHub — Categories
// Uses the preview image + real Supabase count returned by /api/categories.

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

function formatCategoryCount(value) {
    const count = Number(value);
    if (!Number.isFinite(count)) return "—";
    return new Intl.NumberFormat("en-US").format(Math.max(0, count));
}

function createCategoryCard(definition, item) {
    const card = document.createElement("div");
    card.className = "category";
    card.dataset.category = definition.key;
    card.setAttribute("role", "listitem");
    card.setAttribute("tabindex", "0");

    const count = formatCategoryCount(item?.count ?? 0);
    const preview = item?.preview || null;
    const imageUrl = preview?.thumbnail || preview?.image || "";

    card.setAttribute(
        "aria-label",
        `${definition.title}: ${count} wallpapers`
    );

    card.innerHTML = `
        <div class="category-media">
            <div class="category-fallback" aria-hidden="true"></div>
            <div class="category-overlay" aria-hidden="true"></div>
            <span class="category-icon" aria-hidden="true"></span>
            ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" decoding="async">` : ""}
        </div>
        <div class="category-bottom">
            <p class="cat-title">${escapeHtml(definition.title)}</p>
            <span class="cat-count" data-count>${count}</span>
        </div>
    `;

    const image = card.querySelector("img");
    if (image) {
        image.addEventListener("error", () => image.remove(), { once: true });
    }

    const openCategory = () => {
        if (definition.key === "all") {
            window.location.href = "all-wallpapers.html";
            return;
        }
        window.location.href =
            "all-wallpapers.html?category=" +
            encodeURIComponent(definition.key);
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

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function fetchCategoryData() {
    const response = await fetch("/api/categories?_=" + Date.now(), {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" }
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
    const container =
        document.getElementById("homeCategories") ||
        document.querySelector(".category-grid");

    if (!container) return;

    try {
        const serverCategories = await fetchCategoryData();

        const dataMap = new Map(
            serverCategories.map(item => [
                String(item.key).toLowerCase(),
                item
            ])
        );

        container.innerHTML = "";

        HOME_CATEGORY_DEFINITIONS.forEach(definition => {
            const item = dataMap.get(definition.key) || {
                key: definition.key,
                count: 0,
                preview: null
            };

            container.appendChild(createCategoryCard(definition, item));
        });

        // Reference-image style: All is the active/selected card.
        const allCard = container.querySelector('[data-category="all"]');
        if (allCard) allCard.classList.add("active");
    } catch (error) {
        console.error("CATEGORIES LOAD ERROR:", error);

        container.innerHTML = `
            <div class="categories-state error" role="status">
                Unable to load category data.
            </div>
        `;
    }
}

document.addEventListener("DOMContentLoaded", initCategories);
window.initHomeCategories = initCategories;
