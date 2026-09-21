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
            img.src = todayGetImageUrl(today.thumbnail || today.image);
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
                a.download = (today.title || "wallpaper") + ".jpg";
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
   التشغيل التلقائي عند اكتمال تحميل الصفحة
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    const loaded = await loadTodayComponent();

    if (!loaded) {
        return;
    }

    await loadTodayWallpaper();
});
