const API_URL = "/api/wallpapers";
const page = document.querySelector(".explore-page");
const featuredLink = document.getElementById("featuredWallpaperLink");
const featuredImage = document.getElementById("featuredWallpaperImage");
const featuredTitle = document.getElementById("featuredWallpaperTitle");
const featuredMeta = document.getElementById("featuredWallpaperMeta");
const curatedGrid = document.getElementById("curatedWallpaperGrid");
const curatedSubtitle = document.getElementById("curatedSubtitle");
const viewAllLink = document.getElementById("viewAllWallpapersLink");
const searchForm = document.getElementById("exploreSearchForm");
const searchInput = document.getElementById("exploreSearchInput");
const clearSearchButton = document.getElementById("clearExploreSearch");
const searchResultsSection = document.getElementById("exploreSearchResults");
const searchResultsGrid = document.getElementById("searchResultsGrid");
const searchResultsCount = document.getElementById("searchResultsCount");
const searchEmptyState = document.getElementById("searchEmptyState");
const feedback = document.getElementById("exploreFeedback");
const randomButton = document.getElementById("randomWallpaperBtn");

const categoryLabels = {
    all: "كل الخلفيات",
    nature: "الطبيعة",
    cars: "السيارات",
    games: "الألعاب",
    gaming: "الألعاب",
    space: "الفضاء",
    anime: "الأنمي",
    ai: "الذكاء الاصطناعي",
    amoled: "AMOLED",
    animals: "الحيوانات",
    religious: "خلفيات دينية",
    city: "المدن",
    dark: "خلفيات داكنة",
    "4k": "4K",
    sports: "الرياضة",
    minimal: "Minimal",
    ocean: "البحر والمحيطات",
    mountains: "الجبال",
    sunset: "الغروب والشروق",
    flowers: "الزهور",
    technology: "التقنية",
    abstract: "تصاميم تجريدية",
    cyberpunk: "سايبربانك",
    aurora: "الشفق القطبي",
    snow: "الثلج والشتاء"
};

let wallpapers = [];
let currentMode = "popular";
let featuredWallpaper = null;

function normalize(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي");
}

function getWallpaperImage(wallpaper) {
    const value = String(
        wallpaper?.thumbnail ||
        wallpaper?.preview ||
        wallpaper?.image ||
        ""
    ).trim();

    if (!value) return "/assets/logo/no-image.png";
    if (/^(https?:|data:|blob:|\/\/)/i.test(value)) {
        return window.WallpaperHubSettings?.optimizeImageUrl?.(value) || value;
    }
    if (value.startsWith("/")) {
        return window.WallpaperHubSettings?.optimizeImageUrl?.(value) || value;
    }
    if (value.startsWith("assets/")) return "/" + value;
    return "/assets/wallpapers/" + value.replace(/^\/+/, "");
}

function wallpaperTitle(wallpaper) {
    return String(wallpaper?.title || wallpaper?.name || "خلفية مميزة").trim();
}

function wallpaperId(wallpaper) {
    return String(wallpaper?.id ?? "").trim();
}

function categoryName(wallpaper) {
    const value = normalize(wallpaper?.category);
    return categoryLabels[value] || String(wallpaper?.category || "مختارات WallpaperHub");
}

function numeric(value) {
    const result = Number(value ?? 0);
    return Number.isFinite(result) ? result : 0;
}

function sortPopular(list) {
    return [...list].sort((a, b) =>
        numeric(b.downloads) - numeric(a.downloads) ||
        numeric(b.likes) - numeric(a.likes) ||
        numeric(b.views) - numeric(a.views)
    );
}

function sortLatest(list) {
    return [...list].sort((a, b) => {
        const dateA = Date.parse(a.date || a.created_at || "");
        const dateB = Date.parse(b.date || b.created_at || "");
        if (Number.isFinite(dateA) && Number.isFinite(dateB) && dateA !== dateB) {
            return dateB - dateA;
        }
        return numeric(b.id) - numeric(a.id);
    });
}

function rememberSelectedWallpaper(wallpaper) {
    const id = wallpaperId(wallpaper);
    if (!id) return;
    try {
        localStorage.setItem("selectedWallpaper", id);
    } catch (error) {
        console.warn("Could not save selected wallpaper:", error);
    }
}

function buildWallpaperCard(wallpaper) {
    const link = document.createElement("a");
    link.className = "explore-wallpaper-card";
    link.href = "wallpaper.html?id=" + encodeURIComponent(wallpaperId(wallpaper));
    link.setAttribute("aria-label", "فتح خلفية " + wallpaperTitle(wallpaper));
    link.addEventListener("click", () => rememberSelectedWallpaper(wallpaper));

    const media = document.createElement("div");
    media.className = "wallpaper-card-media";

    const image = document.createElement("img");
    image.src = getWallpaperImage(wallpaper);
    image.alt = wallpaperTitle(wallpaper);
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => {
        image.onerror = null;
        image.src = "/assets/logo/no-image.png";
    }, { once: true });
    media.appendChild(image);

    const resolution = String(wallpaper?.resolution || "").toLowerCase();
    if (resolution.includes("4k") || resolution.includes("2160") || resolution.includes("3840")) {
        const quality = document.createElement("span");
        quality.className = "wallpaper-quality";
        quality.textContent = "4K";
        media.appendChild(quality);
    }

    const copy = document.createElement("div");
    copy.className = "wallpaper-card-copy";

    const category = document.createElement("span");
    category.className = "wallpaper-card-category";
    category.textContent = categoryName(wallpaper);

    const title = document.createElement("strong");
    title.className = "wallpaper-card-title";
    title.textContent = wallpaperTitle(wallpaper);

    const stats = document.createElement("span");
    stats.className = "card-stats";

    const downloads = document.createElement("span");
    downloads.className = "card-stat";
    const downloadIcon = document.createElement("span");
    downloadIcon.className = "material-icons";
    downloadIcon.textContent = "download";
    const downloadValue = document.createElement("span");
    downloadValue.textContent = numeric(wallpaper?.downloads).toLocaleString("ar-MA");
    downloads.append(downloadIcon, downloadValue);

    const likes = document.createElement("span");
    likes.className = "card-stat";
    const likeIcon = document.createElement("span");
    likeIcon.className = "material-icons";
    likeIcon.textContent = "favorite_border";
    const likeValue = document.createElement("span");
    likeValue.textContent = numeric(wallpaper?.likes).toLocaleString("ar-MA");
    likes.append(likeIcon, likeValue);

    stats.append(downloads, likes);
    copy.append(category, title, stats);
    link.append(media, copy);
    return link;
}

function renderWallpaperCards(target, list, limit = 2) {
    target.replaceChildren();
    const items = list.slice(0, limit);
    items.forEach(wallpaper => target.appendChild(buildWallpaperCard(wallpaper)));
    return items.length;
}

function updateFeatured(wallpaper) {
    featuredWallpaper = wallpaper || null;
    if (!wallpaper) {
        featuredLink.href = "all-wallpapers.html";
        featuredTitle.textContent = "اكتشف عالماً من الخلفيات";
        featuredMeta.textContent = "اختر القسم الذي يشبه ذوقك وابدأ رحلتك";
        featuredImage.alt = "";
        featuredImage.src = "/assets/logo/no-image.png";
        featuredLink.setAttribute("aria-label", "تصفح جميع الخلفيات");
        return;
    }

    const id = wallpaperId(wallpaper);
    featuredLink.href = "wallpaper.html?id=" + encodeURIComponent(id);
    featuredLink.setAttribute("aria-label", "فتح الخلفية " + wallpaperTitle(wallpaper));
    featuredLink.onclick = () => rememberSelectedWallpaper(wallpaper);
    featuredImage.src = getWallpaperImage(wallpaper);
    featuredImage.alt = wallpaperTitle(wallpaper);
    featuredImage.onerror = () => {
        featuredImage.onerror = null;
        featuredImage.src = "/assets/logo/no-image.png";
    };
    featuredTitle.textContent = wallpaperTitle(wallpaper);
    const resolution = wallpaper?.resolution ? " • " + String(wallpaper.resolution) : "";
    featuredMeta.textContent = categoryName(wallpaper) + resolution;
}

function renderCurated() {
    const sorted = currentMode === "latest" ? sortLatest(wallpapers) : sortPopular(wallpapers);
    const featuredId = wallpaperId(featuredWallpaper);
    const selected = sorted.filter(item => wallpaperId(item) !== featuredId);
    const count = renderWallpaperCards(curatedGrid, selected, 2);

    curatedSubtitle.textContent = currentMode === "latest"
        ? "وصلت حديثاً إلى المكتبة، وربما تصبح خلفيتك المفضلة."
        : "خلفيتان فقط من اختيارات المجتمع الأكثر رواجاً.";

    viewAllLink.href = currentMode === "latest"
        ? "all-wallpapers.html?type=latest"
        : "all-wallpapers.html?type=popular";

    if (!count) {
        const empty = document.createElement("p");
        empty.className = "search-empty";
        empty.textContent = "ستظهر الاختيارات هنا بمجرد توفر المزيد من الخلفيات.";
        curatedGrid.appendChild(empty);
    }
}

function renderSearchResults() {
    const query = normalize(searchInput.value);
    const active = query.length > 0;
    page.classList.toggle("is-searching", active);
    searchResultsSection.hidden = !active;
    clearSearchButton.hidden = !active;

    if (!active) {
        searchResultsGrid.replaceChildren();
        searchEmptyState.hidden = true;
        searchResultsCount.textContent = "";
        return;
    }

    const found = wallpapers.filter(wallpaper => {
        const haystack = normalize([
            wallpaper?.title,
            wallpaper?.category,
            wallpaper?.description,
            ...(Array.isArray(wallpaper?.tags) ? wallpaper.tags : []),
            ...(Array.isArray(wallpaper?.colors) ? wallpaper.colors : [])
        ].join(" "));
        return haystack.includes(query);
    }).slice(0, 6);

    searchResultsCount.textContent = found.length.toLocaleString("ar-MA") + " نتيجة";
    searchResultsGrid.replaceChildren();
    found.forEach(wallpaper => searchResultsGrid.appendChild(buildWallpaperCard(wallpaper)));
    searchEmptyState.hidden = found.length > 0;
}

async function loadWallpapersFromSupabase() {
    const { supabase } = await import("./supabase.js");
    const { data, error } = await supabase
        .from("wallpapers")
        .select("*")
        .order("id", { ascending: false })
        .limit(120);

    if (error) throw error;

    return (data || []).map(row => ({
        id: row.id,
        title: row.title ?? "",
        category: row.category ?? "other",
        thumbnail: row.thumbnail ?? row.image ?? "",
        image: row.image ?? row.thumbnail ?? "",
        resolution: row.resolution ?? "",
        downloads: numeric(row.downloads),
        likes: numeric(row.likes),
        views: numeric(row.views),
        date: row.date ?? row.created_at ?? "",
        created_at: row.created_at ?? "",
        colors: Array.isArray(row.colors) ? row.colors : [],
        tags: Array.isArray(row.tags) ? row.tags : [],
        type: row.type ?? "image"
    }));
}

async function fetchWallpapers() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);

    try {
        const response = await fetch(API_URL, {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "default",
            signal: controller.signal
        });

        if (!response.ok) throw new Error("Wallpaper API returned " + response.status);
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("Wallpaper API response is invalid");
        if (data.length) return data;
        return await loadWallpapersFromSupabase();
    } catch (apiError) {
        console.warn("EXPLORE API FALLBACK:", apiError);
        return await loadWallpapersFromSupabase();
    } finally {
        window.clearTimeout(timeout);
    }
}

function setMode(mode) {
    currentMode = mode === "latest" ? "latest" : "popular";
    document.querySelectorAll(".mode-button").forEach(button => {
        const active = button.dataset.mode === currentMode;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
    });
    renderCurated();
}

function openRandomWallpaper() {
    if (!wallpapers.length) {
        feedback.hidden = false;
        feedback.textContent = "لا توجد خلفيات متاحة حالياً. أعد المحاولة بعد قليل.";
        return;
    }
    const selected = wallpapers[Math.floor(Math.random() * wallpapers.length)];
    rememberSelectedWallpaper(selected);
    window.location.href = "wallpaper.html?id=" + encodeURIComponent(wallpaperId(selected));
}

async function initializeExplore() {
    randomButton.addEventListener("click", openRandomWallpaper);
    document.querySelectorAll(".mode-button").forEach(button => {
        button.addEventListener("click", () => setMode(button.dataset.mode));
    });

    searchForm.addEventListener("submit", event => {
        event.preventDefault();
        renderSearchResults();
    });
    searchInput.addEventListener("input", renderSearchResults);
    clearSearchButton.addEventListener("click", () => {
        searchInput.value = "";
        renderSearchResults();
        searchInput.focus();
    });

    try {
        wallpapers = await fetchWallpapers();
        if (!Array.isArray(wallpapers)) wallpapers = [];

        const latest = sortLatest(wallpapers);
        const popular = sortPopular(wallpapers);
        updateFeatured(popular[0] || latest[0] || null);
        setMode("popular");

        if (!wallpapers.length) {
            feedback.hidden = false;
            feedback.textContent = "لم تصل خلفيات إلى المكتبة بعد. يمكنك تصفح الأقسام أو العودة لاحقاً.";
        }
    } catch (error) {
        console.error("EXPLORE PAGE LOAD ERROR:", error);
        feedback.hidden = false;
        feedback.textContent = "تعذر تحميل الخلفيات الآن. تحقق من الاتصال ثم أعد تحميل الصفحة.";
        curatedGrid.replaceChildren();
        updateFeatured(null);
        renderCurated();
    }
}

initializeExplore();
