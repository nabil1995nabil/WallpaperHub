/* =========================================================
   WallpaperHub — Today Wallpaper
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
   تحميل واجهة خلفية اليوم من today.html
========================================================= */

async function loadTodayComponent() {

    const container =
        document.getElementById("todaySection");

    if (!container) {
        console.error("Today: #todaySection غير موجود في home.html");
        return false;
    }

    try {

        const response =
            await fetch("today.html?_=" + Date.now());

        if (!response.ok) {
            throw new Error(
                "تعذر تحميل today.html: " + response.status
            );
        }

        const html =
            await response.text();

        container.innerHTML = html;

        return true;

    } catch (error) {

        console.error(
            "Today component load error:",
            error
        );

        return false;
    }
}


/* =========================================================
   تحميل بيانات خلفية اليوم
========================================================= */

async function loadTodayWallpaper() {

    try {

        const response =
            await fetch(
                "/api/wallpapers?_=" + Date.now()
            );

        if (!response.ok) {
            throw new Error(
                "API error: " + response.status
            );
        }

        const wallpapers =
            await response.json();

        if (
            !Array.isArray(wallpapers) ||
            wallpapers.length === 0
        ) {
            console.warn(
                "Today: لا توجد خلفيات في API"
            );
            return;
        }


        /* تاريخ اليوم */
        const todayKey =
            new Date()
                .toISOString()
                .split("T")[0];


        let today = null;


        /* الخلفية المحفوظة */
        const saved =
            localStorage.getItem(
                "dailyWallpaper"
            );


        if (saved) {

            try {

                const data =
                    JSON.parse(saved);

                if (
                    data.date === todayKey
                ) {

                    today =
                        wallpapers.find(
                            w =>
                                String(w.id) ===
                                String(data.id)
                        );

                }

            } catch (error) {

                console.warn(
                    "Today cache error:",
                    error
                );

            }

        }


        /* إذا لم توجد خلفية محفوظة */
        if (!today) {

            today =
                wallpapers[
                    Math.floor(
                        Math.random() *
                        wallpapers.length
                    )
                ];


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


        /* عناصر today.html */
        const img =
            document.getElementById(
                "todayImage"
            );

        const title =
            document.getElementById(
                "todayTitle"
            );

        const desc =
            document.getElementById(
                "todayDescription"
            );

        const view =
            document.getElementById(
                "todayView"
            );

        const download =
            document.getElementById(
                "todayDownload"
            );


        /* الصورة */
        if (img) {

            img.src =
                todayGetImageUrl(
                    today.thumbnail ||
                    today.image
                );

            img.onerror = () => {

                img.src =
                    "assets/logo/no-image.png";

            };

        }


        /* العنوان */
        if (title) {

            title.textContent =
                today.title ||
                "خلفية اليوم";

        }


        /* الوصف / القسم */
        if (desc) {

            desc.textContent =
                today.category ||
                "Wallpaper";

        }


        /* مشاهدة */
        if (view) {

            view.onclick = () => {

                window.location.href =
                    "wallpaper.html?id=" +
                    encodeURIComponent(
                        today.id
                    );

            };

        }


        /* تحميل */
        if (download) {

            download.onclick = () => {

                const a =
                    document.createElement(
                        "a"
                    );

                a.href =
                    todayGetImageUrl(
                        today.image
                    );

                a.download =
                    (
                        today.title ||
                        "wallpaper"
                    ) + ".jpg";

                document.body.appendChild(a);

                a.click();

                a.remove();

            };

        }

    } catch (error) {

        console.error(
            "Today wallpaper error:",
            error
        );

    }
}


/* =========================================================
   التشغيل بالترتيب الصحيح

   1. تحميل today.html
   2. بعدها تحميل بيانات الخلفية
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const loaded =
            await loadTodayComponent();

        if (!loaded) {
            return;
        }

        await loadTodayWallpaper();

    }
);
