/* =========================================================
   WallpaperHub — Daily Wallpaper + Original AI Orb
   اختيار يومي مستقل تماماً عن الطقس أو الموقع الجغرافي
========================================================= */

const TODAY_DAILY_STORAGE_KEY = "wallpaperHubDailyWallpaper";
const TODAY_COMPONENT_VERSION = "20261123-daily-refresh-1";

let todayWallpaperPool = [];
let todayCurrentIndex = -1;
let todayCurrentWallpaper = null;

function todayGetImageUrl(image) {
    const raw = String(image || "").trim();
    if (!raw) return "/assets/logo/no-image.png";
    if (/^(https?:|data:|blob:)/i.test(raw)) {
        return window.WallpaperHubSettings?.optimizeImageUrl?.(raw) || raw;
    }
    if (raw.startsWith("//")) return "https:" + raw;
    if (raw.startsWith("/")) return raw;
    if (raw.startsWith("assets/")) return "/" + raw;
    return "/assets/wallpapers/" + raw.replace(/^\/+/, "");
}

function todaySafeStorageGet(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
}

function todaySafeStorageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
}

function todayGetDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
}

function todayGetDateLabel(date = new Date()) {
    try {
        return new Intl.DateTimeFormat("ar-MA", {
            weekday: "long",
            day: "numeric",
            month: "long"
        }).format(date);
    } catch (_) {
        return todayGetDateKey(date);
    }
}

function todayStableHash(value) {
    let hash = 2166136261;
    const text = String(value);
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function todayPopularityScore(wallpaper) {
    const downloads = Math.max(0, Number(wallpaper?.downloads) || 0);
    const likes = Math.max(0, Number(wallpaper?.likes) || 0);
    const views = Math.max(0, Number(wallpaper?.views) || 0);
    return Math.log1p(downloads) * 3 + Math.log1p(likes) * 2.4 + Math.log1p(views);
}

function todaySortWallpapers(list) {
    return [...list].sort((a, b) => {
        const scoreDifference = todayPopularityScore(b) - todayPopularityScore(a);
        if (Math.abs(scoreDifference) > 0.0001) return scoreDifference;

        const aDate = Date.parse(a?.created_at || a?.date || "");
        const bDate = Date.parse(b?.created_at || b?.date || "");
        if (Number.isFinite(aDate) && Number.isFinite(bDate) && aDate !== bDate) {
            return bDate - aDate;
        }
        return String(b?.id ?? "").localeCompare(String(a?.id ?? ""), undefined, { numeric: true });
    });
}

function todayGetDailyIndex(pool, date = new Date()) {
    if (!pool.length) return -1;

    // A stable pool fingerprint makes the first pick reproducible.
    // Advancing the local calendar day also advances the default selection.
    const fingerprint = pool.map(item => String(item.id)).join("|");
    const offset = todayStableHash(fingerprint) % pool.length;
    const dayNumber = Math.floor(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    ) / 86400000);

    return ((dayNumber + offset) % pool.length + pool.length) % pool.length;
}

function todaySaveDailyChoice(wallpaper, dateKey) {
    if (!wallpaper || wallpaper.id == null) return;
    todaySafeStorageSet(TODAY_DAILY_STORAGE_KEY, JSON.stringify({
        date: dateKey,
        id: String(wallpaper.id)
    }));
}

function todayGetSavedDailyIndex(dateKey) {
    const saved = todaySafeStorageGet(TODAY_DAILY_STORAGE_KEY);
    if (!saved) return -1;

    try {
        const choice = JSON.parse(saved);
        if (choice.date !== dateKey || choice.id == null) return -1;
        return todayWallpaperPool.findIndex(item => String(item.id) === String(choice.id));
    } catch (_) {
        return -1;
    }
}

function todayRenderWallpaper(wallpaper, index) {
    if (!wallpaper) return;

    const image = document.getElementById("todayImage");
    const title = document.getElementById("todayTitle");
    const description = document.getElementById("todayDescription");
    const viewButton = document.getElementById("todayView");
    const dateLabel = document.getElementById("todayDate");
    const card = document.querySelector(".today-card");

    const imageSource = wallpaper.image || wallpaper.thumbnail || wallpaper.preview;
    const displayTitle = String(wallpaper.title || wallpaper.name || "خلفية اليوم");
    const displayDescription = String(
        wallpaper.description ||
        wallpaper.category ||
        "اختيار يومي من مكتبة WallpaperHub"
    );

    if (image) {
        image.onerror = () => {
            image.onerror = null;
            const fallback = todayGetImageUrl(wallpaper.thumbnail || wallpaper.image);
            if (image.src !== new URL(fallback, window.location.href).href) {
                image.src = fallback;
            } else {
                image.src = "/assets/logo/no-image.png";
            }
        };
        image.src = todayGetImageUrl(imageSource);
        image.alt = displayTitle;
    }

    if (title) title.textContent = displayTitle;
    if (description) description.textContent = displayDescription;
    if (dateLabel) dateLabel.textContent = todayGetDateLabel();
    if (viewButton) {
        viewButton.onclick = () => {
            window.location.href = "wallpaper.html?id=" + encodeURIComponent(wallpaper.id);
        };
    }

    if (card) {
        card.classList.remove("is-changing");
        // Restart the subtle image entrance without changing the page layout.
        void card.offsetWidth;
        card.classList.add("is-changing");
    }

    todayCurrentWallpaper = wallpaper;
    todayCurrentIndex = index;
}

function todayChooseAnotherWallpaper() {
    if (todayWallpaperPool.length < 2) return;

    const nextIndex = (todayCurrentIndex + 1) % todayWallpaperPool.length;
    const nextWallpaper = todayWallpaperPool[nextIndex];
    const dateKey = todayGetDateKey();

    todaySaveDailyChoice(nextWallpaper, dateKey);
    todayRenderWallpaper(nextWallpaper, nextIndex);
}

async function todayLoadWallpaperData() {
    let wallpapers = window.WallpaperHubHomeWallpapers;

    if (!Array.isArray(wallpapers) && window.WallpaperHubHomeWallpapersPromise) {
        try {
            wallpapers = await window.WallpaperHubHomeWallpapersPromise;
        } catch (error) {
            console.warn("Today: shared wallpaper data was unavailable:", error);
        }
    }

    if (!Array.isArray(wallpapers)) {
        const response = await fetch("/api/wallpapers", {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "default"
        });
        if (!response.ok) throw new Error("Wallpaper API returned " + response.status);
        wallpapers = await response.json();
    }

    if (!Array.isArray(wallpapers)) {
        throw new Error("Wallpaper API response is invalid");
    }

    return wallpapers.filter(item =>
        item &&
        item.id != null &&
        (item.image || item.thumbnail || item.preview)
    );
}

async function loadTodayComponent() {
    const container = document.getElementById("todaySection");
    if (!container) return false;

    try {
        const response = await fetch(
            "/today.html?v=" + encodeURIComponent(TODAY_COMPONENT_VERSION),
            { cache: "reload" }
        );
        if (!response.ok) throw new Error("Today component returned " + response.status);

        const html = await response.text();
        if (!html.includes('id="todayImage"') || !html.includes('id="aiFab"')) {
            throw new Error("Today component markup is incomplete");
        }

        container.innerHTML = html;
        return true;
    } catch (error) {
        console.error("Today component load error:", error);
        return false;
    }
}

async function loadTodayWallpaper() {
    const changeButton = document.getElementById("todayChange");

    try {
        const source = await todayLoadWallpaperData();
        todayWallpaperPool = todaySortWallpapers(source);

        if (!todayWallpaperPool.length) {
            const title = document.getElementById("todayTitle");
            const description = document.getElementById("todayDescription");
            if (title) title.textContent = "ننتظر صوراً جديدة";
            if (description) description.textContent = "ستظهر خلفية اليوم هنا بمجرد توفر صور في المكتبة.";
            const dateLabel = document.getElementById("todayDate");
            if (dateLabel) dateLabel.textContent = todayGetDateLabel();
            return;
        }

        const dateKey = todayGetDateKey();
        const savedIndex = todayGetSavedDailyIndex(dateKey);
        todayCurrentIndex = savedIndex >= 0
            ? savedIndex
            : todayGetDailyIndex(todayWallpaperPool);

        const selected = todayWallpaperPool[todayCurrentIndex];
        todaySaveDailyChoice(selected, dateKey);
        todayRenderWallpaper(selected, todayCurrentIndex);

        if (changeButton) {
            changeButton.disabled = todayWallpaperPool.length < 2;
            changeButton.addEventListener("click", todayChooseAnotherWallpaper);
        }
    } catch (error) {
        console.error("Today wallpaper error:", error);
        const title = document.getElementById("todayTitle");
        const description = document.getElementById("todayDescription");
        if (title) title.textContent = "تعذر تحميل خلفية اليوم";
        if (description) description.textContent = "تحقق من الاتصال ثم أعد تحميل الصفحة.";
        if (changeButton) changeButton.disabled = true;
    }
}

/* =========================================================
   Original AI Orb — fluid, iridescent motion
   Animation pauses off-screen and respects reduced motion.
========================================================= */

function createTodayAIOrb(canvas) {
    if (!canvas || canvas.dataset.orbReady === "true") return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const size = 200;
    const center = size / 2;
    const radius = 67;
    const tau = Math.PI * 2;
    const reducedMotion = Boolean(
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );

    canvas.width = size;
    canvas.height = size;

    let time = 0;
    let frameId = 0;
    let lastFrame = 0;
    let visible = false;

    function drawBlob(phase, scale, colors) {
        context.save();
        const driftX = Math.sin(time * 0.72 + phase) * 14;
        const driftY = Math.cos(time * 0.61 + phase) * 12;
        context.translate(center + driftX, center + driftY);
        context.rotate(time * 0.16 + phase);
        context.scale(scale, scale * 0.82);

        const gradient = context.createRadialGradient(-15, -24, 2, 0, 0, 76);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(0.48, colors[1]);
        gradient.addColorStop(1, colors[2]);

        context.beginPath();
        for (let step = 0; step <= 120; step++) {
            const angle = (step / 120) * tau;
            const wave =
                Math.sin(angle * 3 + time * 1.25 + phase) * 7 +
                Math.sin(angle * 5 - time * 0.8 + phase) * 4;
            const r = 43 + wave;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (step === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
        }
        context.closePath();
        context.fillStyle = gradient;
        context.filter = "blur(5px)";
        context.fill();
        context.filter = "none";
        context.restore();
    }

    function drawOrb(timestamp = 0, singleFrame = false) {
        if (!singleFrame) {
            if (!visible || document.hidden) {
                frameId = 0;
                return;
            }
            if (timestamp - lastFrame < 32) {
                frameId = requestAnimationFrame(drawOrb);
                return;
            }
            lastFrame = timestamp;
        }

        time += 0.022;
        context.clearRect(0, 0, size, size);

        const ambient = context.createRadialGradient(center, center, 8, center, center, 94);
        ambient.addColorStop(0, "rgba(94,196,255,.22)");
        ambient.addColorStop(0.56, "rgba(117,66,255,.16)");
        ambient.addColorStop(1, "rgba(20,10,45,0)");
        context.fillStyle = ambient;
        context.beginPath();
        context.arc(center, center, 94, 0, tau);
        context.fill();

        context.save();
        context.beginPath();
        context.arc(center, center, radius, 0, tau);
        context.clip();

        const base = context.createLinearGradient(25, 22, 175, 180);
        base.addColorStop(0, "#b9f8ff");
        base.addColorStop(0.24, "#537cff");
        base.addColorStop(0.58, "#6637c9");
        base.addColorStop(0.82, "#b43fc3");
        base.addColorStop(1, "#081b4a");
        context.fillStyle = base;
        context.fillRect(0, 0, size, size);

        context.globalCompositeOperation = "screen";
        drawBlob(0.2, 1.1, [
            "rgba(70,245,255,.96)",
            "rgba(38,147,255,.80)",
            "rgba(18,58,160,0)"
        ]);
        drawBlob(2.35, 1.02, [
            "rgba(255,140,224,.95)",
            "rgba(160,65,255,.85)",
            "rgba(64,27,145,0)"
        ]);
        drawBlob(4.25, 0.94, [
            "rgba(179,255,245,.92)",
            "rgba(80,116,255,.76)",
            "rgba(22,38,120,0)"
        ]);

        // A soft liquid wave that glides across the glass-like surface.
        for (let layer = 0; layer < 3; layer++) {
            const yBase = 74 + layer * 24 + Math.sin(time + layer) * 9;
            const wave = context.createLinearGradient(18, yBase - 22, 178, yBase + 22);
            wave.addColorStop(0, "rgba(255,255,255,0)");
            wave.addColorStop(0.34, "rgba(160,244,255,.22)");
            wave.addColorStop(0.62, "rgba(255,210,248,.30)");
            wave.addColorStop(1, "rgba(255,255,255,0)");

            context.beginPath();
            context.moveTo(-8, yBase);
            context.bezierCurveTo(
                40, yBase - 30 + Math.sin(time * 1.2 + layer) * 12,
                128, yBase + 34 + Math.cos(time + layer) * 14,
                210, yBase - 8
            );
            context.lineTo(210, yBase + 16);
            context.bezierCurveTo(
                128, yBase + 56,
                40, yBase - 6,
                -8, yBase + 22
            );
            context.closePath();
            context.fillStyle = wave;
            context.fill();
        }

        context.globalCompositeOperation = "source-over";

        const gloss = context.createRadialGradient(69, 54, 1, 81, 71, 73);
        gloss.addColorStop(0, "rgba(255,255,255,.72)");
        gloss.addColorStop(0.13, "rgba(220,250,255,.25)");
        gloss.addColorStop(0.5, "rgba(255,255,255,.04)");
        gloss.addColorStop(1, "rgba(255,255,255,0)");
        context.fillStyle = gloss;
        context.fillRect(0, 0, size, size);

        context.restore();

        context.lineWidth = 1.4;
        context.strokeStyle = "rgba(227,249,255,.48)";
        context.beginPath();
        context.arc(center, center, radius - 0.7, 0, tau);
        context.stroke();

        if (!singleFrame) frameId = requestAnimationFrame(drawOrb);
    }

    canvas.dataset.orbReady = "true";

    if (reducedMotion) {
        drawOrb(0, true);
        return;
    }

    const syncAnimation = () => {
        const shouldRun = visible && !document.hidden;
        if (shouldRun && !frameId) frameId = requestAnimationFrame(drawOrb);
        if (!shouldRun && frameId) {
            cancelAnimationFrame(frameId);
            frameId = 0;
        }
    };

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(entries => {
            visible = Boolean(entries[0] && entries[0].isIntersecting);
            syncAnimation();
        }, { threshold: 0.01 });
        observer.observe(canvas);
        window.addEventListener("pagehide", () => observer.disconnect(), { once: true });
    } else {
        visible = true;
    }

    document.addEventListener("visibilitychange", syncAnimation);
    syncAnimation();
}

function initTodayAIOrb() {
    const canvas = document.getElementById("aiCanvas");
    if (canvas) createTodayAIOrb(canvas);
}

document.addEventListener("DOMContentLoaded", async () => {
    const loaded = await loadTodayComponent();
    if (!loaded) return;

    initTodayAIOrb();
    await loadTodayWallpaper();
});
