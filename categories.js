const categories = Array.from(document.querySelectorAll(".category-card"));

const categoryNames = {
    all: "الكل",
    nature: "الطبيعة",
    cars: "السيارات",
    games: "الألعاب",
    space: "الفضاء",
    ai: "الذكاء الاصطناعي",
    amoled: "AMOLED",
    animals: "الحيوانات",
    anime: "الأنمي",
    city: "المدن",
    dark: "Dark",
    "4k": "4K",
    sports: "الرياضة",
    minimal: "Minimal"
};

const searchInput = document.getElementById("categorySearch");
const clearSearch = document.getElementById("clearSearch");
const resultsCount = document.getElementById("resultsCount");
const noResults = document.getElementById("noResults");
const favoritesOnlyBtn = document.getElementById("favoritesOnlyBtn");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");
const lastVisited = document.getElementById("lastVisited");
const lastVisitedName = document.getElementById("lastVisitedName");
const continueLastBtn = document.getElementById("continueLastBtn");

let favorites = JSON.parse(localStorage.getItem("favoriteCategories") || "[]");
let favoritesOnly = false;

function normalize(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه");
}

function saveFavorites() {
    localStorage.setItem("favoriteCategories", JSON.stringify(favorites));
}

function updateFavoriteUI() {
    categories.forEach(card => {
        const category = card.dataset.category;
        const isFavorite = favorites.includes(category);
        card.classList.toggle("is-favorite", isFavorite);

        const icon = card.querySelector(".favorite-toggle .material-icons");
        if (icon) icon.textContent = isFavorite ? "star" : "star_border";
    });

    favoritesOnlyBtn.classList.toggle("active", favoritesOnly);
    favoritesOnlyBtn.querySelector(".material-icons").textContent =
        favoritesOnly ? "star" : "star_border";
}

function applyCategoryView() {
    const query = normalize(searchInput.value);
    let visible = 0;

    categories.forEach(card => {
        const haystack = normalize(
            `${card.dataset.category} ${card.dataset.search} ${categoryNames[card.dataset.category] || ""}`
        );

        const matchesSearch = !query || haystack.includes(query);
        const matchesFavorite = !favoritesOnly || favorites.includes(card.dataset.category);
        const show = matchesSearch && matchesFavorite;

        card.classList.toggle("is-hidden", !show);

        if (show) visible++;
    });

    resultsCount.textContent = visible;
    noResults.hidden = visible !== 0;

    clearSearch.classList.toggle("visible", Boolean(searchInput.value));
    resetFiltersBtn.classList.toggle("hidden", !query && !favoritesOnly);

    updateFavoriteUI();
}

function openCategory(category) {
    if (!category) return;

    localStorage.setItem("selectedCategory", category);
    localStorage.setItem(
        "selectedCategoryName",
        categoryNames[category] || category
    );
    localStorage.setItem("lastVisitedCategory", category);

    window.location.href =
        "all-wallpapers.html?category=" + encodeURIComponent(category);
}

function openType(type) {
    localStorage.setItem("lastWallpaperType", type);
    window.location.href =
        "all-wallpapers.html?type=" + encodeURIComponent(type);
}

function markSelected(category) {
    categories.forEach(card => {
        card.classList.toggle("is-selected", card.dataset.category === category);
    });
}

/* Category cards */
categories.forEach(card => {
    card.addEventListener("click", event => {
        if (event.target.closest(".favorite-toggle")) return;

        const category = card.dataset.category;
        markSelected(category);
        openCategory(category);
    });

    const favoriteButton = card.querySelector(".favorite-toggle");

    if (favoriteButton) {
        favoriteButton.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();

            const category = card.dataset.category;

            if (favorites.includes(category)) {
                favorites = favorites.filter(item => item !== category);
            } else {
                favorites.push(category);
            }

            saveFavorites();
            applyCategoryView();
        });
    }
});

/* Search */
searchInput.addEventListener("input", applyCategoryView);

clearSearch.addEventListener("click", () => {
    searchInput.value = "";
    searchInput.focus();
    applyCategoryView();
});

/* Quick filters */
document.querySelectorAll(".quick-filter").forEach(button => {
    button.addEventListener("click", () => {
        const type = button.dataset.route;
        const category = button.dataset.categoryFilter;

        document.querySelectorAll(".quick-filter").forEach(item => {
            item.classList.remove("active");
        });
        button.classList.add("active");

        if (type === "all") {
            favoritesOnly = false;
            searchInput.value = "";
            applyCategoryView();
            return;
        }

        if (category) {
            markSelected(category);
            openCategory(category);
            return;
        }

        if (type) openType(type);
    });
});

/* Favorites filter */
favoritesOnlyBtn.addEventListener("click", () => {
    favoritesOnly = !favoritesOnly;
    applyCategoryView();
});

/* Reset */
resetFiltersBtn.addEventListener("click", () => {
    favoritesOnly = false;
    searchInput.value = "";

    document.querySelectorAll(".quick-filter").forEach(item => {
        item.classList.toggle("active", item.dataset.route === "all");
    });

    applyCategoryView();
});

/* Empty state */
document.getElementById("showAllBtn").addEventListener("click", () => {
    favoritesOnly = false;
    searchInput.value = "";
    applyCategoryView();
});

/* Random category */
document.getElementById("randomCategoryBtn").addEventListener("click", () => {
    const available = categories.filter(card => card.dataset.category !== "all");
    const selected = available[Math.floor(Math.random() * available.length)];
    if (selected) openCategory(selected.dataset.category);
});

/* Last visited */
const lastCategory = localStorage.getItem("lastVisitedCategory");

if (lastCategory && categoryNames[lastCategory]) {
    lastVisited.hidden = false;
    lastVisitedName.textContent = categoryNames[lastCategory];

    continueLastBtn.addEventListener("click", () => {
        openCategory(lastCategory);
    });
}

/* Support direct links such as categories.html?category=cars */
const urlCategory = new URLSearchParams(window.location.search).get("category");

if (urlCategory && categoryNames[urlCategory]) {
    markSelected(urlCategory);
}

updateFavoriteUI();
applyCategoryView();
