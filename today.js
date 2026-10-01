/* =========================================================
   WallpaperHub — Today Wallpaper (Complete & Updated JS)
   مستقل عن home.js
========================================================= */

function todayGetImageUrl(image) {
    if (!image) {
        return "assets/logo/no-image.png";
    }

    if (image.startsWith("http")) {
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
   تحميل بيانات خلفية اليوم وتفعيل الأزرار
========================================================= */

async function loadTodayWallpaper() {
    try {
        const response = await fetch("/api/wallpapers?_=" + Date.now());

        if (!response.ok) {
            throw new Error("API error: " + response.status);
        }

        const wallpapers = await response.json();

        if (!Array.isArray(wallpapers) || wallpapers.length === 0) {
            console.warn("Today: لا توجد خلفيات في API");
            return;
        }

        /* تاريخ اليوم لضمان ثبات الخلفية طوال اليوم */
        const todayKey = new Date().toISOString().split("T")[0];
        let today = null;

        /* الخلفية المحفوظة مسبقاً */
        const saved = localStorage.getItem("dailyWallpaper");

        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.date === todayKey) {
                    today = wallpapers.find(w => String(w.id) === String(data.id));
                }
            } catch (error) {
                console.warn("Today cache error:", error);
            }
        }

        /* إذا لم توجد خلفية محفوظة لهذا اليوم، اختر واحدة عشوائياً */
        if (!today) {
            today = wallpapers[Math.floor(Math.random() * wallpapers.length)];

            localStorage.setItem(
                "dailyWallpaper",
                JSON.stringify({
                    id: today.id,
                    date: todayKey
                })
            );
        }

        if (!today) {
            return;
        }

        /* ربط عناصر HTML */
        const img = document.getElementById("todayImage");
        const title = document.getElementById("todayTitle");
        const desc = document.getElementById("todayDescription");
        const view = document.getElementById("todayView");
        const download = document.getElementById("todayDownload");

        /* تعيين الصورة */
        if (img) {
            img.src = todayGetImageUrl(todayIsGifMedia(today) ? today.image : (today.thumbnail || today.image));
            img.onerror = () => {
                img.src = "assets/logo/no-image.png";
            };
        }

        /* تعيين العنوان */
        if (title) {
            title.textContent = today.title || "خلفية اليوم";
        }

        /* تعيين الوصف أو القسم */
        if (desc) {
            desc.textContent = today.description || today.category || "جمال العالم بين يديك";
        }

        /* حدث النقر على زر العرض الآن */
        if (view) {
            view.onclick = () => {
                window.location.href = "wallpaper.html?id=" + encodeURIComponent(today.id);
            };
        }

        /* حدث النقر على التحميل (إن وجد) */
        if (download) {
            download.onclick = () => {
                const a = document.createElement("a");
                a.href = todayGetImageUrl(today.image);
                a.download = (today.title || "wallpaper") + (todayIsGifMedia(today) ? ".gif" : ".jpg");
                document.body.appendChild(a);
                a.click();
                a.remove();
            };
        }

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
