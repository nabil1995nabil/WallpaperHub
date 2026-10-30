// =========================================================
// WallpaperHub Adaptive Performance Engine
// كلما كان الجهاز أقوى: حركة وتأثيرات أكثر وتحميل مسبق أوسع.
// كلما كان أضعف: عناصر أخف وتمرير أكثر استقرارًا.
//
// 1) تصنيف ثابت للجهاز عند الفتح (نواة، ذاكرة، وضع التوفير، الحركة)
// 2) مراقبة حية أثناء التفاعل فقط (تمرير/لمس) مقارنةً بمعدل تحديث الشاشة
// 3) نزول سريع عند التقطيع، وصعود بطيء عند الاستقرار، دون تجاوز تصنيف الجهاز
//
// الواجهة العامة (متوافقة مع النسخة السابقة):
//   WallpaperPerformance.mode / .fps / .longTasks / .tier / .limits
//   getFPS() getMode() getDeviceInfo() getStats() refresh() onChange(fn)
// ويصدر الحدث "wallpaperperformancechange" على window عند تغيّر المستوى.
// =========================================================

(function () {
    "use strict";

    if (window.WallpaperPerformance && window.WallpaperPerformance.__ready) return;

    const TIERS = ["low", "medium", "high"];
    const STORE_KEY = "wph-perf-tier";
    const STORE_TTL = 7 * 24 * 60 * 60 * 1000;
    const STYLE_ID = "wallpaperhub-performance-style";

    const CONFIG = {
        sampleMs: 1000,          // طول نافذة قياس واحدة
        activeWindowMs: 2500,    // نستمر بالقياس بعد آخر تفاعل
        calibrateMs: 1600,       // معايرة معدل التحديث عند البدء
        downRatio: 0.72,         // أقل من 72% من معدل الشاشة = تقطيع
        upRatio: 0.93,           // أكثر من 93% = استقرار
        downStreak: 2,           // عينتان سيئتان للنزول
        upStreak: 5,             // خمس عينات جيدة للصعود
        downCooldownMs: 2500,
        upCooldownMs: 6000,
        longTaskLimit: 50,
        longTaskWindowMs: 2400,
        longTaskPressure: 6
    };

    // ---------------------------------------------------------
    // الحالة
    // ---------------------------------------------------------
    const nav = navigator;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection || {};

    let baseTier = "medium";     // سقف الجهاز
    let tier = "medium";         // المستوى الحالي (≤ baseTier)
    let fps = 60;
    let refreshHz = 0;           // يُعاير عند البدء (30/60/90/120...)
    let longTaskTimes = [];
    let longTasks = 0;
    let reduceMotion = false;
    let batteryLow = false;

    let rafId = 0;
    let frames = 0;
    let lastFrame = 0;
    let sampleStart = 0;
    let lastInteraction = 0;
    let calibrateUntil = 0;
    let badStreak = 0;
    let goodStreak = 0;
    let lastChange = 0;
    let sampleHadInteraction = false;
    const listeners = new Set();

    const now = () => performance.now();
    const rank = t => TIERS.indexOf(t);

    // ---------------------------------------------------------
    // 1) تصنيف الجهاز (ثابت)
    // ---------------------------------------------------------
    function classifyDevice() {
        const cores = Number(nav.hardwareConcurrency) || 0;
        const memory = Number(nav.deviceMemory) || 0; // Chrome/Android فقط

        let score = 0;

        if (memory >= 8) score += 3;
        else if (memory >= 4) score += 2;
        else if (memory >= 2) score += 1;
        else if (memory > 0) score += 0;
        else score += 2; // غير معروف (iOS/Safari/Firefox): نفترض متوسطًا جيدًا

        if (cores >= 8) score += 3;
        else if (cores >= 6) score += 2;
        else if (cores >= 4) score += 1;
        else if (cores > 0) score += 0;
        else score += 1;

        // شاشة كثافة عالية جدًا مع قدرة متواضعة تكلّف أكثر
        const dpr = window.devicePixelRatio || 1;
        if (dpr >= 3 && score < 5) score -= 1;

        let result = score >= 5 ? "high" : score >= 3 ? "medium" : "low";

        // وضع توفير البيانات أو شبكة بطيئة: لا نرفع المستوى فوق المتوسط
        if (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || "")) {
            if (rank(result) > rank("medium")) result = "medium";
        }

        return result;
    }

    function readStoredTier() {
        try {
            const raw = localStorage.getItem(STORE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data || !TIERS.includes(data.tier)) return null;
            if (Date.now() - Number(data.time || 0) > STORE_TTL) return null;
            return data.tier;
        } catch (_) {
            return null;
        }
    }

    function storeTier(value) {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify({ tier: value, time: Date.now() }));
        } catch (_) { /* التخزين غير متاح */ }
    }

    // ---------------------------------------------------------
    // حدود يستخدمها باقي الموقع (تحميل مسبق، إلخ)
    // ---------------------------------------------------------
    function computeLimits() {
        const slowNet = !!conn.saveData || /(^|-)2g$|3g/.test(conn.effectiveType || "");
        let preload = tier === "high" ? 2 : tier === "medium" ? 1 : 0;
        if (slowNet || batteryLow) preload = 0;
        return {
            preloadNeighbors: preload,          // 2 = السابقة والتالية، 1 = التالية فقط، 0 = بدون
            richEffects: tier === "high" && !reduceMotion,
            smoothTransitions: tier !== "low" && !reduceMotion
        };
    }

    // ---------------------------------------------------------
    // 2) CSS المحقون
    // ---------------------------------------------------------
    const CARD_SELECTOR =
        ".wallpaper-card,.card,.list-item,.profile-wall-card,.similar-card,.comment-card";
    const GLASS_SELECTOR =
        '[class*="blur"],[class*="glass"],[class*="glow"],' +
        ".wallpaper-nav-btn,.more-options-btn,.options-menu,.cover-nav-btn,.cover-history-overlay," +
        ".menu-btn,.settings-btn,.login-btn,.phone-preview-backdrop,.download-options-backdrop";
    const KEEP_MOVING = ':not([class*="spin"]):not([class*="loader"]):not([class*="loading"])';

    function installStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
            /* لا ارتداد/سحب للتحديث يهز الصفحة أثناء التصفح */
            html.wph-perf-low,html.wph-perf-medium,html.wph-perf-high{
                overscroll-behavior-y:none;
            }

            /* LOW: ثبات الإطارات أولًا */
            html.wph-perf-low *${KEEP_MOVING},
            html.wph-perf-low *::before,
            html.wph-perf-low *::after{
                animation:none !important;
                scroll-behavior:auto !important;
            }
            html.wph-perf-low *{
                transition-duration:.12s !important;
            }
            html.wph-perf-low :is(${GLASS_SELECTOR}){
                -webkit-backdrop-filter:none !important;
                backdrop-filter:none !important;
            }

            /* MEDIUM: إيقاف التأثيرات المستمرة الثقيلة فقط */
            html.wph-perf-medium .performance-heavy{
                animation:none !important;
            }

            /* الجهاز الضعيف والمتوسط: لا نرسم البطاقات خارج الشاشة */
            html.wph-perf-low :is(${CARD_SELECTOR}),
            html.wph-perf-medium :is(${CARD_SELECTOR}){
                content-visibility:auto;
                contain-intrinsic-size:auto 220px;
            }

            /* HIGH: جودة بصرية كاملة */
            html.wph-perf-high .performance-heavy{
                animation-play-state:running;
            }

            /* تفضيل المستخدم لتقليل الحركة */
            html.wph-reduce-motion *${KEEP_MOVING},
            html.wph-reduce-motion *::before,
            html.wph-reduce-motion *::after{
                animation:none !important;
                scroll-behavior:auto !important;
            }
            html.wph-reduce-motion *{
                transition-duration:.01ms !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ---------------------------------------------------------
    // تطبيق المستوى
    // ---------------------------------------------------------
    function applyTier(next, persist) {
        const changed = next !== tier;
        tier = next;

        const root = document.documentElement;
        const body = document.body;

        TIERS.forEach(t => {
            root.classList.toggle("wph-perf-" + t, t === tier);
            if (body) body.classList.toggle("performance-" + t, t === tier);
        });
        root.classList.toggle("wph-reduce-motion", reduceMotion);
        root.dataset.perf = tier;

        publish();

        if (changed) {
            if (persist) storeTier(tier);
            const detail = snapshot();
            listeners.forEach(fn => { try { fn(detail); } catch (_) {} });
            try {
                window.dispatchEvent(new CustomEvent("wallpaperperformancechange", { detail }));
            } catch (_) {}
        }
    }

    function snapshot() {
        return {
            mode: tier,
            baseMode: baseTier,
            fps: Math.round(fps),
            refreshHz,
            longTasks,
            limits: computeLimits()
        };
    }

    function publish() {
        const api = window.WallpaperPerformance;
        if (!api) return;
        api.mode = tier;
        api.tier = tier;
        api.fps = Math.round(fps);
        api.longTasks = longTasks;
        api.limits = computeLimits();
    }

    // ---------------------------------------------------------
    // 3) القياس الحي (أثناء التفاعل فقط)
    // ---------------------------------------------------------
    function snapHz(value) {
        const steps = [30, 48, 60, 72, 90, 120, 144, 165, 240];
        return steps.reduce((best, s) =>
            Math.abs(s - value) < Math.abs(best - value) ? s : best, 60);
    }

    function cleanLongTasks(time) {
        const limit = time - CONFIG.longTaskWindowMs;
        longTaskTimes = longTaskTimes.filter(t => t >= limit);
        longTasks = longTaskTimes.length;
    }

    function evaluate(time, calibrating) {
        cleanLongTasks(time);
        const pressure = longTasks >= CONFIG.longTaskPressure;

        // معايرة: أعلى معدل ملاحظ يمثّل معدل تحديث الشاشة
        if (fps > 20) refreshHz = refreshHz ? Math.max(refreshHz, snapHz(fps)) : snapHz(fps);
        if (calibrating || !refreshHz || !sampleHadInteraction) return;

        const ratio = fps / refreshHz;
        const bad = ratio < CONFIG.downRatio || pressure;
        const good = ratio >= CONFIG.upRatio && !pressure;

        badStreak = bad ? badStreak + 1 : 0;
        goodStreak = good ? goodStreak + 1 : 0;

        if (badStreak >= CONFIG.downStreak && rank(tier) > 0 &&
            time - lastChange >= CONFIG.downCooldownMs) {
            badStreak = 0;
            goodStreak = 0;
            lastChange = time;
            applyTier(TIERS[rank(tier) - 1], true);
        } else if (goodStreak >= CONFIG.upStreak && rank(tier) < rank(baseTier) &&
            time - lastChange >= CONFIG.upCooldownMs) {
            badStreak = 0;
            goodStreak = 0;
            lastChange = time;
            applyTier(TIERS[rank(tier) + 1], true);
        }
    }

    function loop(time) {
        rafId = 0;
        if (document.hidden) return;

        const delta = time - lastFrame;
        lastFrame = time;

        // فجوة كبيرة (تبديل تبويب/تجميد): نبدأ نافذة جديدة
        if (delta > 250) {
            frames = 0;
            sampleStart = time;
            sampleHadInteraction = false;
        } else {
            frames++;
        }

        if (time - lastInteraction < CONFIG.sampleMs) sampleHadInteraction = true;

        if (time - sampleStart >= CONFIG.sampleMs) {
            const elapsed = time - sampleStart;
            fps = Math.round(Math.min(240, Math.max(1, frames * 1000 / elapsed)));
            frames = 0;
            sampleStart = time;
            evaluate(time, time < calibrateUntil);
            sampleHadInteraction = false;
            publish();
            if (window.WallpaperPerformance) window.WallpaperPerformance.lastUpdate = Date.now();
        }

        // نتوقف عند الخمول بدل رسم حلقة دائمة تستهلك البطارية
        if (time < calibrateUntil || time - lastInteraction < CONFIG.activeWindowMs) {
            rafId = requestAnimationFrame(loop);
        }
    }

    function wake() {
        lastInteraction = now();
        if (rafId || document.hidden) return;
        lastFrame = now();
        sampleStart = lastFrame;
        frames = 0;
        rafId = requestAnimationFrame(loop);
    }

    let wakeGate = 0;
    function onInteraction() {
        const t = now();
        if (t - wakeGate < 120) return; // لا نزيد حمل الأحداث
        wakeGate = t;
        wake();
    }

    function installInteractionListeners() {
        const opts = { passive: true, capture: true };
        ["scroll", "touchstart", "touchmove", "wheel", "pointerdown", "keydown"]
            .forEach(type => window.addEventListener(type, onInteraction, opts));
    }

    function installLongTaskObserver() {
        if (!("PerformanceObserver" in window)) return;
        try {
            const observer = new PerformanceObserver(list => {
                const time = now();
                list.getEntries().forEach(entry => {
                    if (entry.duration >= CONFIG.longTaskLimit) longTaskTimes.push(time);
                });
                cleanLongTasks(time);
            });
            observer.observe({ entryTypes: ["longtask"] });
        } catch (_) { /* longtask غير مدعوم */ }
    }

    function installEnvironmentWatchers() {
        // تفضيل تقليل الحركة
        try {
            const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
            reduceMotion = mq.matches;
            const onMotion = e => { reduceMotion = e.matches; applyTier(tier, false); };
            if (mq.addEventListener) mq.addEventListener("change", onMotion);
            else if (mq.addListener) mq.addListener(onMotion);
        } catch (_) {}

        // بطارية منخفضة وغير موصولة: نخفف التحميل المسبق
        try {
            if (typeof nav.getBattery === "function") {
                nav.getBattery().then(battery => {
                    const update = () => {
                        batteryLow = !battery.charging && battery.level <= 0.2;
                        publish();
                    };
                    update();
                    battery.addEventListener("levelchange", update);
                    battery.addEventListener("chargingchange", update);
                }).catch(() => {});
            }
        } catch (_) {}

        // تغيّر الشبكة
        try {
            if (conn.addEventListener) conn.addEventListener("change", publish);
        } catch (_) {}
    }

    // ---------------------------------------------------------
    // الصور: decoding غير متزامن لكل صورة (حالية ولاحقة)
    // ---------------------------------------------------------
    function optimizeImage(image) {
        if (image && image.tagName === "IMG" && !image.hasAttribute("decoding")) {
            image.decoding = "async";
        }
    }

    function installImageOptimizer() {
        Array.prototype.forEach.call(document.images, optimizeImage);
        if (!("MutationObserver" in window)) return;

        let queue = [];
        let scheduled = false;
        const flush = () => {
            scheduled = false;
            const items = queue;
            queue = [];
            items.forEach(node => {
                if (node.nodeType !== 1) return;
                if (node.tagName === "IMG") optimizeImage(node);
                else if (node.querySelectorAll) node.querySelectorAll("img").forEach(optimizeImage);
            });
        };

        new MutationObserver(records => {
            records.forEach(r => r.addedNodes.forEach(n => queue.push(n)));
            if (!scheduled && queue.length) {
                scheduled = true;
                requestAnimationFrame(flush);
            }
        }).observe(document.documentElement, { childList: true, subtree: true });
    }

    // ---------------------------------------------------------
    // الرؤية: نوقف القياس والتبويب مخفي
    // ---------------------------------------------------------
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
        } else {
            wake();
        }
    }, { passive: true });

    // ---------------------------------------------------------
    // الواجهة العامة
    // ---------------------------------------------------------
    window.WallpaperPerformance = {
        __ready: true,
        mode: tier,
        tier: tier,
        fps: 60,
        longTasks: 0,
        limits: computeLimits(),

        getFPS() { return Math.round(fps); },
        getMode() { return tier; },

        getDeviceInfo() {
            return {
                cores: nav.hardwareConcurrency || "unknown",
                memory: nav.deviceMemory || "unknown",
                pixelRatio: window.devicePixelRatio || 1,
                refreshHz,
                baseMode: baseTier,
                fps: Math.round(fps),
                mode: tier,
                longTasks
            };
        },

        getStats() {
            return {
                fps: Math.round(fps),
                refreshHz,
                mode: tier,
                baseMode: baseTier,
                longTasks,
                visible: !document.hidden,
                limits: computeLimits()
            };
        },

        onChange(fn) {
            if (typeof fn !== "function") return () => {};
            listeners.add(fn);
            return () => listeners.delete(fn);
        },

        // يعيد التصنيف الأساسي ويفرض تطبيقه
        refresh() {
            baseTier = classifyDevice();
            badStreak = goodStreak = 0;
            applyTier(baseTier, false);
            wake();
        }
    };

    // ---------------------------------------------------------
    // البدء
    // ---------------------------------------------------------
    function init() {
        installStyles();
        installEnvironmentWatchers();

        baseTier = classifyDevice();

        // نبدأ بما تعلّمناه سابقًا عن هذا الجهاز إن كان أقل من سقفه
        const stored = readStoredTier();
        const start = stored && rank(stored) < rank(baseTier) ? stored : baseTier;
        applyTier(start, false);

        installLongTaskObserver();
        installImageOptimizer();
        installInteractionListeners();

        // معايرة معدل تحديث الشاشة بعد أول عرض
        requestAnimationFrame(() => {
            calibrateUntil = now() + CONFIG.calibrateMs;
            wake();
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
