const API_URL = "/api/wallpapers";

const journalPage = document.querySelector(".journal-page");
const featuredLink = document.getElementById("featuredWallpaperLink");
const featuredImage = document.getElementById("featuredWallpaperImage");
const featuredTitle = document.getElementById("featuredWallpaperTitle");
const featuredMeta = document.getElementById("featuredWallpaperMeta");
const collage = document.getElementById("curatedWallpaperGrid");
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
    nature: "الطبيعة",
    cars: "السيارات",
    games: "الألعاب",
    gaming: "الألعاب",
    space: "الفضاء",
    anime: "الأنمي",
    ai: "الذكاء الاصطناعي",
    amoled: "AMOLED",
    animals: "الحيوانات",
    religious: "الخلفيات الدينية",
    city: "المدن",
    dark: "خلفيات داكنة",
    "4k": "4K",
    sports: "الرياضة",
    minimal: "Minimal",
    ocean: "البحر",
    mountains: "الجبال",
    sunset: "الغروب",
    flowers: "الزهور",
    technology: "التقنية",
    abstract: "تصاميم تجريدية",
    cyberpunk: "سايبربانك",
    aurora: "الشفق القطبي",
    snow: "الثلج والشتاء"
};

const memoryNotes = {
    nature: ["مكان يستحق التأمل", "هدوء يشبه الصباح", "من دفتر الطبيعة"],
    cars: ["تفاصيل لا تمرّ عابرة", "سرعة وأناقة", "من شوارع الخيال"],
    anime: ["مشهد يبقى في الذاكرة", "قصة داخل صورة", "من عالم آخر"],
    games: ["استراحة بين المراحل", "عالم من الخيال", "لقطة من المغامرة"],
    space: ["بعيد… لكنه قريب", "رسالة من النجوم", "اتساع لا ينتهي"],
    religious: ["طمأنينة للقلب", "لحظة سكون", "نور ومعنى"],
    amoled: ["هدوء بلون الليل", "بساطة تليق بالشاشة", "مساحة من الظلال"],
    animals: ["تفاصيل صغيرة وجميلة", "حياة في لقطة", "من دفتر الطبيعة"],
    ai: ["خيال صار صورة", "تفاصيل من المستقبل", "فكرة خارج المألوف"],
    default: ["احتفظ بهذه اللحظة", "صورة تستحق الوقوف", "تفصيل جميل من اليوم"]
};

let wallpapers = [];
let featuredWallpaper = null;

function normalize(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي");
}

function numeric(value) {
    const result = Number(value ?? 0);
    return Number.isFinite(result) ? result : 0;
}

function wallpaperId(wallpaper) {
    return String(wallpaper?.id ?? "").trim();
}

function wallpaperTitle(wallpaper) {
    return String(wallpaper?.title || wallpaper?.name || "").trim();
}

function categoryName(wallpaper) {
    const key = normalize(wallpaper?.category);
    return categoryLabels[key] || String(wallpaper?.category || "مختارات");
}

function getImageUrl(wallpaper) {
    const raw = String(wallpaper?.thumbnail || wallpaper?.preview || wallpaper?.image || "").trim();
    if (!raw) return "/assets/logo/no-image.png";
    if (/^(https?:|data:|blob:|\/\/)/i.test(raw) || raw.startsWith("/")) {
        return window.WallpaperHubSettings?.optimizeImageUrl?.(raw) || raw;
    }
    if (raw.startsWith("assets/")) return "/" + raw;
    return "/assets/wallpapers/" + raw.replace(/^\/+/, "");
}

function rememberWallpaper(wallpaper) {
    const id = wallpaperId(wallpaper);
    if (!id) return;
    try { localStorage.setItem("selectedWallpaper", id); }
    catch (error) { console.warn("Explore selection could not be saved:", error); }
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
        const aDate = Date.parse(a.created_at || a.date || "");
        const bDate = Date.parse(b.created_at || b.date || "");
        if (Number.isFinite(aDate) && Number.isFinite(bDate) && aDate !== bDate) return bDate - aDate;
        return numeric(b.id) - numeric(a.id);
    });
}

function getMemoryNote(wallpaper, index) {
    const key = normalize(wallpaper?.category);
    const notes = memoryNotes[key] || memoryNotes.default;
    return notes[index % notes.length];
}

function buildMemoryPhoto(wallpaper, index) {
    const id = wallpaperId(wallpaper);
    const link = document.createElement("a");
    link.className = "memory-photo memory-photo--" + ((index % 4) + 1);
    link.href = "wallpaper.html?id=" + encodeURIComponent(id);
    link.setAttribute("aria-label", "افتح خلفية " + (wallpaperTitle(wallpaper) || categoryName(wallpaper)));
    link.addEventListener("click", () => rememberWallpaper(wallpaper));

    const tape = document.createElement("span");
    tape.className = "memory-photo-tape";
    tape.setAttribute("aria-hidden", "true");

    const photo = document.createElement("span");
    photo.className = "memory-photo-image";

    const image = document.createElement("img");
    image.src = getImageUrl(wallpaper);
    image.alt = wallpaperTitle(wallpaper) || categoryName(wallpaper);
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => {
        image.onerror = null;
        image.src = "/assets/logo/no-image.png";
    }, { once: true });
    photo.appendChild(image);

    const caption = document.createElement("span");
    caption.className = "memory-photo-caption";

    const overline = document.createElement("small");
    overline.textContent = "قصاصة رقم " + String(index + 1).padStart(2, "0");

    const title = document.createElement("strong");
    title.textContent = wallpaperTitle(wallpaper) || categoryName(wallpaper);

    const note = document.createElement("span");
    note.textContent = getMemoryNote(wallpaper, index);

    caption.append(overline, title, note);
    link.append(tape, photo, caption);
    return link;
}

function renderMemoryCollage(target, items, limit = 4) {
    target.replaceChildren();
    const selected = items.slice(0, limit);
    selected.forEach((wallpaper, index) => target.appendChild(buildMemoryPhoto(wallpaper, index)));

    if (!selected.length) {
        const empty = document.createElement("p");
        empty.className = "journal-empty";
        empty.textContent = "لا توجد صور في هذه الصفحة بعد.";
        target.appendChild(empty);
    }
    return selected.length;
}

function updateFeatured(wallpaper) {
    featuredWallpaper = wallpaper || null;
    if (!wallpaper) {
        featuredLink.href = "all-wallpapers.html";
        featuredImage.src = "/assets/logo/no-image.png";
        featuredTitle.textContent = "افتح الألبوم وابدأ الاكتشاف";
        featuredMeta.textContent = "كل صورة لها حكاية";
        return;
    }

    const id = wallpaperId(wallpaper);
    featuredLink.href = "wallpaper.html?id=" + encodeURIComponent(id);
    featuredLink.setAttribute("aria-label", "افتح صورة " + (wallpaperTitle(wallpaper) || categoryName(wallpaper)));
    featuredLink.onclick = () => rememberWallpaper(wallpaper);
    featuredImage.src = getImageUrl(wallpaper);
    featuredImage.alt = wallpaperTitle(wallpaper) || categoryName(wallpaper);
    featuredImage.onerror = () => {
        featuredImage.onerror = null;
        featuredImage.src = "/assets/logo/no-image.png";
    };
    featuredTitle.textContent = wallpaperTitle(wallpaper) || categoryName(wallpaper);
    featuredMeta.textContent = categoryName(wallpaper) + " · لقطة من مكتبة WallpaperHub";
}

function renderSearchResults() {
    const query = normalize(searchInput.value);
    const active = query.length > 0;
    journalPage.classList.toggle("is-searching", active);
    searchResultsSection.hidden = !active;
    clearSearchButton.hidden = !active;

    if (!active) {
        searchResultsGrid.replaceChildren();
        searchResultsCount.textContent = "";
        searchEmptyState.hidden = true;
        return;
    }

    const found = wallpapers.filter(wallpaper => {
        const fields = [
            wallpaper?.title,
            wallpaper?.category,
            wallpaper?.description,
            ...(Array.isArray(wallpaper?.tags) ? wallpaper.tags : []),
            ...(Array.isArray(wallpaper?.colors) ? wallpaper.colors : [])
        ];
        return normalize(fields.join(" ")).includes(query);
    }).slice(0, 8);

    searchResultsCount.textContent = found.length.toLocaleString("ar-MA") + " نتيجة";
    renderMemoryCollage(searchResultsGrid, found, 8);
    searchEmptyState.hidden = found.length > 0;
    if (!found.length) searchResultsGrid.replaceChildren();
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
        return data.length ? data : await loadWallpapersFromSupabase();
    } catch (error) {
        console.warn("Explore API fallback:", error);
        return await loadWallpapersFromSupabase();
    } finally {
        window.clearTimeout(timeout);
    }
}

function openRandomWallpaper() {
    if (!wallpapers.length) {
        feedback.hidden = false;
        feedback.textContent = "لا توجد خلفيات متاحة حالياً. جرّب مرة أخرى بعد قليل.";
        return;
    }
    const chosen = wallpapers[Math.floor(Math.random() * wallpapers.length)];
    rememberWallpaper(chosen);
    window.location.href = "wallpaper.html?id=" + encodeURIComponent(wallpaperId(chosen));
}

async function initializeJournal() {
    randomButton.addEventListener("click", openRandomWallpaper);

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

        const popular = sortPopular(wallpapers);
        const latest = sortLatest(wallpapers);
        const selected = [];
        const candidates = [
            popular[1],
            latest[0],
            [...wallpapers].sort((a, b) => numeric(b.likes) - numeric(a.likes))[0],
            popular[2],
            latest[1],
            popular[3]
        ];

        const seen = new Set();
        candidates.forEach(item => {
            if (!item) return;
            const id = wallpaperId(item);
            if (!id || seen.has(id)) return;
            seen.add(id);
            selected.push(item);
        });

        updateFeatured(popular[0] || latest[0] || null);
        renderMemoryCollage(collage, selected.slice(0, 4), 4);

        if (!wallpapers.length) {
            feedback.hidden = false;
            feedback.textContent = "دفترنا ينتظر الصور الأولى. ستظهر الخلفيات هنا بمجرد توفرها في المكتبة.";
        }
    } catch (error) {
        console.error("Explore journal load error:", error);
        feedback.hidden = false;
        feedback.textContent = "تعذر فتح صفحات الألبوم الآن. تحقق من الاتصال ثم أعد تحميل الصفحة.";
        collage.replaceChildren();
        updateFeatured(null);
        renderMemoryCollage(collage, [], 4);
    }
}

initializeJournal();
