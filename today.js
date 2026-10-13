/* =========================================================
   WallpaperHub — Today Wallpaper (Complete & Updated JS)
   مستقل عن home.js
========================================================= */

function todayGetImageUrl(image) {
    if (!image) {
        return "assets/logo/no-image.png";
    }

    image = String(image);
    if (image.startsWith("http") || image.startsWith("data:") || image.startsWith("/")) {
        return image;
    }

    if (image.startsWith("assets/")) {
        return image;
    }

    return "assets/wallpapers/" + image;
}

function todayIsGifMedia(wallpaper){
    if(!wallpaper) return false;
    const type = String(wallpaper.type || "").toLowerCase();
    if(type === "gif") return true;
    return String(wallpaper.image || "").toLowerCase().includes(".gif");
}



/* =========================================================
   تحميل واجهة خلفية اليوم وبطاقة الذكاء الاصطناعي من today.html
========================================================= */

async function loadTodayComponent() {
    const container = document.getElementById("todaySection");

    if (!container) {
        console.error("Today: #todaySection غير موجود في الصفحة");
        return false;
    }

    try {
        const response = await fetch("today.html?_=" + Date.now());

        if (!response.ok) {
            throw new Error("تعذر تحميل today.html: " + response.status);
        }

        const html = await response.text();
        container.innerHTML = html;
        return true;

    } catch (error) {
        console.error("Today component load error:", error);
        return false;
    }
}


/* =========================================================
   Dynamic Today Wallpaper
   النظام 1: اختيار صورة حسب الوقت والطقس.
   النظام 2: استعمال نسخة مرتبطة بنفس الخلفية إذا كانت متوفرة.
   الطقس لا يُطلب إلا بعد اختيار الزائر، أو اختيار مدينة يدوياً.
========================================================= */

const TODAY_WEATHER_STORAGE_KEY = "wallpaperHubTodayWeatherPreference";
let todayWallpaperPool = [];
let todayWeatherInfo = null;
let todayCurrentWallpaper = null;

function todaySafeStorageGet(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
}
function todaySafeStorageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
}
function todaySafeStorageRemove(key) {
    try { localStorage.removeItem(key); } catch (_) {}
}

function todayGetLocalDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function todayGetTimePeriod(date = new Date()) {
    const hour = date.getHours();
    if (hour >= 6 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "day";
    if (hour >= 17 && hour < 20) return "sunset";
    return "night";
}

function todayPeriodLabel(period) {
    return ({
        morning: "الصباح",
        day: "النهار",
        sunset: "الغروب",
        night: "الليل"
    })[period] || "خلفية اليوم";
}

function todayWeatherLabel(weather) {
    return ({
        sunny: "مشمس",
        rainy: "ممطر",
        cloudy: "غائم",
        snowy: "ثلجي",
        foggy: "ضبابي",
        stormy: "عاصف"
    })[weather] || "";
}

function todayNormalizeText(value) {
    if (Array.isArray(value)) return value.join(" ").toLowerCase();
    if (value && typeof value === "object") return Object.values(value).join(" ").toLowerCase();
    return String(value || "").toLowerCase();
}

function todayWallpaperText(wallpaper) {
    return [
        wallpaper.title, wallpaper.description, wallpaper.category,
        wallpaper.tags, wallpaper.timeOfDay, wallpaper.time_of_day,
        wallpaper.weather, wallpaper.weatherType, wallpaper.weather_type,
        wallpaper.mood, wallpaper.keywords
    ].map(todayNormalizeText).join(" ");
}

function todayHasTerm(text, terms) {
    return terms.some(term => text.includes(term));
}

function todayScoreWallpaper(wallpaper, period, weather) {
    const text = todayWallpaperText(wallpaper);
    const timeFields = todayNormalizeText(
        wallpaper.timeOfDay || wallpaper.time_of_day || wallpaper.time || ""
    );
    const weatherFields = todayNormalizeText(
        wallpaper.weather || wallpaper.weatherType || wallpaper.weather_type || ""
    );
    const timeTerms = {
        morning: ["morning", "sunrise", "dawn", "صباح", "شروق", "فجر"],
        day: ["day", "daylight", "noon", "نهار", "ظهر"],
        sunset: ["sunset", "dusk", "golden hour", "غروب", "شفق"],
        night: ["night", "moon", "stars", "dark", "ليل", "قمر", "نجوم"]
    };
    const weatherTerms = {
        sunny: ["sunny", "sun", "clear", "مشمس", "شمس", "صحو"],
        rainy: ["rain", "rainy", "storm", "مطر", "ممطر", "عاصف"],
        cloudy: ["cloud", "cloudy", "overcast", "غائم", "غيوم"],
        snowy: ["snow", "snowy", "ثلج", "ثلجي"],
        foggy: ["fog", "mist", "foggy", "ضباب", "ضبابي"],
        stormy: ["storm", "thunder", "عاصفة", "رعد"]
    };
    let score = 0;

    if (timeFields) {
        if (todayHasTerm(timeFields, timeTerms[period] || [])) score += 8;
        else if (todayHasTerm(timeFields, ["all", "any", "كل الأوقات", "all-day"])) score += 1;
        else score -= 2;
    } else if (todayHasTerm(text, timeTerms[period] || [])) {
        score += 3;
    }

    if (weather) {
        if (weatherFields) {
            if (todayHasTerm(weatherFields, weatherTerms[weather] || [])) score += 10;
            else if (todayHasTerm(weatherFields, ["any", "all", "كل الحالات"])) score += 1;
            else score -= 2;
        } else if (todayHasTerm(text, weatherTerms[weather] || [])) {
            score += 4;
        }
    }
    return score;
}

function todayStableHash(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function todayPickWallpaper(wallpapers, period, weather, dateKey) {
    if (!wallpapers.length) return null;
    const scored = wallpapers.map(w => ({
        wallpaper: w,
        score: todayScoreWallpaper(w, period, weather)
    }));
    const maxScore = Math.max(...scored.map(item => item.score));
    const candidates = scored.filter(item => item.score === maxScore).map(item => item.wallpaper);
    const seed = `${dateKey}|${period}|${weather || "no-weather"}`;
    return candidates[todayStableHash(seed) % candidates.length];
}

function todayGetVariant(wallpaper, period, weather) {
    if (!wallpaper || typeof wallpaper !== "object") return null;
    const containers = [
        wallpaper.variants,
        wallpaper.timeVariants,
        wallpaper.time_variants,
        wallpaper.weatherVariants,
        wallpaper.weather_variants,
        wallpaper.dynamicVariants,
        wallpaper.dynamic_variants
    ].filter(value => value && typeof value === "object" && !Array.isArray(value));

    const keys = [];
    if (weather) keys.push(`${period}_${weather}`, `${weather}_${period}`, weather);
    keys.push(period, ({
        morning: "sunrise",
        sunset: "dusk",
        night: "evening",
        day: "daylight"
    })[period]);

    for (const container of containers) {
        for (const key of keys) {
            const variant = container[key];
            if (variant) {
                if (typeof variant === "string") return { image: variant };
                if (typeof variant === "object") return variant;
            }
        }
    }
    return null;
}

function todayResolveVariantImage(variant) {
    if (!variant) return null;
    return variant.image || variant.src || variant.url || variant.thumbnail || null;
}

function todayRenderWallpaper(wallpaper, period, weather) {
    if (!wallpaper) return;
    const img = document.getElementById("todayImage");
    const title = document.getElementById("todayTitle");
    const desc = document.getElementById("todayDescription");
    const view = document.getElementById("todayView");
    const download = document.getElementById("todayDownload");
    const weatherButton = document.getElementById("todayWeatherButton");
    const weatherLabel = document.getElementById("todayWeatherButtonLabel");

    const variant = todayGetVariant(wallpaper, period, weather);
    const variantImage = todayResolveVariantImage(variant);
    const displayImage = variantImage || (todayIsGifMedia(wallpaper)
        ? wallpaper.image
        : (wallpaper.thumbnail || wallpaper.image));
    const displayTitle = (variant && variant.title) || wallpaper.title || "خلفية اليوم";

    if (img) {
        img.onerror = () => {
            img.onerror = null;
            const fallback = todayGetImageUrl(wallpaper.thumbnail || wallpaper.image);
            if (img.src !== new URL(fallback, window.location.href).href) img.src = fallback;
            else img.src = "assets/logo/no-image.png";
        };
        img.src = todayGetImageUrl(displayImage);
        img.alt = displayTitle;
    }
    if (title) title.textContent = displayTitle;
    if (desc) {
        const baseDescription = wallpaper.description || wallpaper.category || "جمال العالم بين يديك";
        const weatherText = weather ? ` • ${todayWeatherLabel(weather)}` : "";
        desc.textContent = `${baseDescription} • ${todayPeriodLabel(period)}${weatherText}`;
    }
    if (view) {
        view.onclick = () => {
            window.location.href = "wallpaper.html?id=" + encodeURIComponent(wallpaper.id);
        };
    }
    if (download) {
        download.onclick = () => {
            const a = document.createElement("a");
            a.href = todayGetImageUrl(variantImage || wallpaper.image);
            const ext = String(variantImage || wallpaper.image || "").split("?")[0].split(".").pop();
            a.download = (displayTitle || "wallpaper") + "." + (ext && ext.length <= 5 ? ext : "jpg");
            document.body.appendChild(a);
            a.click();
            a.remove();
        };
    }
    if (weatherButton) {
        weatherButton.setAttribute("aria-pressed", todayWeatherInfo ? "true" : "false");
        if (weatherLabel) weatherLabel.textContent = todayWeatherInfo
            ? (todayWeatherInfo.city ? todayWeatherInfo.city : todayWeatherLabel(weather))
            : "حسب الطقس";
        weatherButton.title = todayWeatherInfo
            ? `الطقس مفعّل: ${todayWeatherLabel(weather) || "حالة محلية"} — اضغط للتغيير`
            : "اختيار الطقس حسب موقعك أو مدينتك";
    }
    todayCurrentWallpaper = wallpaper;
}

async function todayFetchWeather(latitude, longitude, cityName = "") {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&current=temperature_2m,weather_code&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("تعذر جلب الطقس");
    const data = await response.json();
    const code = Number(data.current && data.current.weather_code);
    let weather = "cloudy";
    if (code === 0 || code === 1) weather = "sunny";
    else if ([2, 3, 45, 48].includes(code)) weather = [45, 48].includes(code) ? "foggy" : "cloudy";
    else if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) weather = "rainy";
    else if ([71, 73, 75, 77, 85, 86].includes(code)) weather = "snowy";
    else if ([95, 96, 99].includes(code)) weather = "stormy";

    return {
        weather,
        city: cityName || "طقس موقعك",
        temperature: data.current && data.current.temperature_2m,
        fetchedAt: Date.now()
    };
}

async function todayGeocodeCity(city) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ar&format=json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("تعذر العثور على المدينة");
    const data = await response.json();
    const result = data.results && data.results[0];
    if (!result) throw new Error("لم يتم العثور على المدينة");
    return {
        latitude: result.latitude,
        longitude: result.longitude,
        name: [result.name, result.admin1, result.country].filter(Boolean).join("، ")
    };
}

async function todayEnableWeatherByLocation() {
    if (!navigator.geolocation) throw new Error("المتصفح لا يدعم تحديد الموقع");
    const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 30 * 60 * 1000
        });
    });
    const weather = await todayFetchWeather(
        position.coords.latitude,
        position.coords.longitude,
        "طقس موقعك"
    );
    todayWeatherInfo = weather;
    todaySafeStorageSet(TODAY_WEATHER_STORAGE_KEY, JSON.stringify({
        mode: "location",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        city: weather.city,
        savedAt: Date.now()
    }));
}

async function todayEnableWeatherByCity() {
    const city = window.prompt("اكتب اسم مدينتك لتخصيص خلفية اليوم حسب الطقس:");
    if (!city || !city.trim()) return false;
    const location = await todayGeocodeCity(city.trim());
    const weather = await todayFetchWeather(location.latitude, location.longitude, location.name);
    todayWeatherInfo = weather;
    todaySafeStorageSet(TODAY_WEATHER_STORAGE_KEY, JSON.stringify({
        mode: "city",
        latitude: location.latitude,
        longitude: location.longitude,
        city: location.name,
        savedAt: Date.now()
    }));
    return true;
}

async function todayUpdateDynamicWallpaper() {
    if (!todayWallpaperPool.length) return;
    const now = new Date();
    const period = todayGetTimePeriod(now);
    const weather = todayWeatherInfo ? todayWeatherInfo.weather : null;
    const dateKey = todayGetLocalDateKey(now);
    const selected = todayPickWallpaper(todayWallpaperPool, period, weather, dateKey);
    if (!selected) return;
    todayRenderWallpaper(selected, period, weather);
}

async function todayConfigureWeatherButton() {
    const button = document.getElementById("todayWeatherButton");
    if (!button || button.dataset.bound === "true") return;
    button.dataset.bound = "true";

    button.addEventListener("click", async () => {
        const choice = window.confirm(
            "لتخصيص خلفية اليوم حسب الطقس، اختر موافق للسماح بتحديد موقعك، أو إلغاء لاختيار المدينة يدوياً."
        );
        button.disabled = true;
        const originalLabel = document.getElementById("todayWeatherButtonLabel");
        try {
            if (choice) {
                await todayEnableWeatherByLocation();
            } else {
                const ok = await todayEnableWeatherByCity();
                if (!ok) return;
            }
            await todayUpdateDynamicWallpaper();
        } catch (error) {
            console.warn("Today weather unavailable:", error);
            window.alert("ما قدرناش نجيبوا الطقس دابا. غادي تبقى خلفية اليوم كتتبدل حسب الوقت فقط.");
            todayWeatherInfo = null;
            todaySafeStorageRemove(TODAY_WEATHER_STORAGE_KEY);
            await todayUpdateDynamicWallpaper();
        } finally {
            button.disabled = false;
        }
    });
}

async function todayRestoreWeatherPreference() {
    const saved = todaySafeStorageGet(TODAY_WEATHER_STORAGE_KEY);
    if (!saved) return;
    try {
        const preference = JSON.parse(saved);
        if (!preference.latitude || !preference.longitude) return;
        const age = Date.now() - Number(preference.savedAt || 0);
        if (age > 3 * 60 * 60 * 1000) {
            const refreshed = await todayFetchWeather(preference.latitude, preference.longitude, preference.city || "");
            todayWeatherInfo = refreshed;
            todaySafeStorageSet(TODAY_WEATHER_STORAGE_KEY, JSON.stringify({
                ...preference,
                savedAt: Date.now()
            }));
        } else {
            todayWeatherInfo = await todayFetchWeather(preference.latitude, preference.longitude, preference.city || "");
        }
    } catch (error) {
        console.warn("Today weather restore error:", error);
        todayWeatherInfo = null;
    }
}

async function loadTodayWallpaper() {
    try {
        const response = await fetch("/api/wallpapers?_=" + Date.now());
        if (!response.ok) throw new Error("API error: " + response.status);
        const wallpapers = await response.json();
        if (!Array.isArray(wallpapers) || wallpapers.length === 0) {
            console.warn("Today: لا توجد خلفيات في API");
            return;
        }

        todayWallpaperPool = wallpapers.filter(w => w && (w.id != null) && (w.image || w.thumbnail));
        await todayRestoreWeatherPreference();
        await todayConfigureWeatherButton();
        await todayUpdateDynamicWallpaper();
    } catch (error) {
        console.error("Today wallpaper error:", error);
    }
}


/* =========================================================
   AI ORB — حركة أصلية مستوحاة من Siri Orb
========================================================= */
function createTodayAILogo(canvas) {
    if (!canvas || canvas.dataset.orbReady === "true") return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 180;
    canvas.width = size;
    canvas.height = size;

    const cx = size / 2;
    const cy = size / 2;
    const TAU = Math.PI * 2;
    let t = 0;

    const particles = Array.from({length: 34}, (_, i) => ({
        a: (TAU / 34) * i,
        r: 42 + Math.random() * 28,
        speed: 0.35 + Math.random() * 0.65,
        size: 1.1 + Math.random() * 2.1,
        phase: Math.random() * TAU
    }));

    function glowCircle(x, y, r, color, alpha) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, color.replace("ALPHA", String(alpha)));
        g.addColorStop(1, color.replace("ALPHA", "0"));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
    }

    function drawOrb() {
        t += 0.018;
        ctx.clearRect(0, 0, size, size);
        ctx.globalCompositeOperation = "lighter";

        // Ambient inner light.
        glowCircle(
            cx + Math.cos(t * .8) * 5,
            cy + Math.sin(t * .7) * 5,
            58,
            "rgba(0,220,255,ALPHA)",
            .18
        );
        glowCircle(
            cx - Math.cos(t * .6) * 8,
            cy - Math.sin(t * .9) * 7,
            50,
            "rgba(145,65,255,ALPHA)",
            .22
        );

        // Flowing luminous ribbons.
        for (let band = 0; band < 5; band++) {
            ctx.beginPath();
            const base = band * 1.15 + t * (0.55 + band * .045);
            for (let s = 0; s <= 80; s++) {
                const a = base + (s / 80) * TAU;
                const wave =
                    Math.sin(a * (2.1 + band * .17) + t * (1.4 + band * .2)) * 3.2 +
                    Math.sin(a * 4.7 - t * 1.1) * 1.5;
                const r = 35 + band * 5 + wave;
                const x = cx + Math.cos(a) * r;
                const y = cy + Math.sin(a) * r * .82;
                if (s === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            const grad = ctx.createLinearGradient(25, 25, 155, 155);
            grad.addColorStop(0, "rgba(0,235,255,.05)");
            grad.addColorStop(.35, "rgba(73,119,255,.70)");
            grad.addColorStop(.62, "rgba(184,75,255,.85)");
            grad.addColorStop(.82, "rgba(255,75,176,.58)");
            grad.addColorStop(1, "rgba(0,235,255,.05)");
            ctx.strokeStyle = grad;
            ctx.lineWidth = 3.5 - band * .35;
            ctx.globalAlpha = .86 - band * .10;
            ctx.stroke();
        }

        // Rotating luminous arc.
        ctx.globalAlpha = .95;
        ctx.lineWidth = 5;
        const arcGrad = ctx.createConicGradient(-t, cx, cy);
        arcGrad.addColorStop(0, "#00eaff");
        arcGrad.addColorStop(.28, "#6c63ff");
        arcGrad.addColorStop(.52, "#d64cff");
        arcGrad.addColorStop(.75, "#ff4fa8");
        arcGrad.addColorStop(1, "#00eaff");
        ctx.strokeStyle = arcGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 49, t * .8, t * .8 + Math.PI * 1.35);
        ctx.stroke();

        // Orbiting particles.
        particles.forEach(p => {
            const a = p.a + t * p.speed;
            const rr = p.r + Math.sin(t * 2 + p.phase) * 4;
            const x = cx + Math.cos(a) * rr;
            const y = cy + Math.sin(a) * rr * .82;
            const pulse = .55 + .45 * Math.sin(t * 3 + p.phase);
            ctx.globalAlpha = pulse;
            ctx.fillStyle = (p.a % .9 < .45) ? "#65e9ff" : "#bd72ff";
            ctx.beginPath();
            ctx.arc(x, y, p.size * pulse, 0, TAU);
            ctx.fill();
        });

        // Core orb.
        ctx.globalAlpha = 1;
        const core = ctx.createRadialGradient(cx-7, cy-8, 2, cx, cy, 27);
        core.addColorStop(0, "rgba(255,255,255,.98)");
        core.addColorStop(.16, "rgba(133,244,255,.92)");
        core.addColorStop(.46, "rgba(103,104,255,.72)");
        core.addColorStop(1, "rgba(70,30,150,0)");
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, TAU);
        ctx.fill();

        // Small breathing center.
        const pulse = 4 + Math.sin(t * 2.4) * 1.5;
        ctx.fillStyle = "rgba(255,255,255,.92)";
        ctx.shadowBlur = 16;
        ctx.shadowColor = "#7defff";
        ctx.beginPath();
        ctx.arc(cx - 2, cy - 2, pulse, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.globalCompositeOperation = "source-over";
        requestAnimationFrame(drawOrb);
    }

    canvas.dataset.orbReady = "true";
    drawOrb();
}

function initTodayAiFab() {
    const aiFab = document.getElementById("aiFab");
    const canvas = document.getElementById("aiCanvas");
    if (!aiFab) return;

    createTodayAILogo(canvas);

    if (aiFab.dataset.clickBound === "true") return;

    const openAI = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        aiFab.style.setProperty("transition", "transform .16s ease");
        aiFab.style.transform = "translateY(-50%) scale(.88)";
        setTimeout(() => {
            window.location.href = "ai.html";
        }, 90);
    };

    aiFab.addEventListener("click", openAI);
    aiFab.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") openAI(e);
    });
    aiFab.dataset.clickBound = "true";
}

/* =========================================================
   التشغيل التلقائي عند اكتمال تحميل الصفحة
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    const loaded = await loadTodayComponent();

    if (!loaded) {
        return;
    }

    // ربط نفس AI FAB الأصلي بعد إدخال today.html في الصفحة
    initTodayAiFab();

    await loadTodayWallpaper();
});
