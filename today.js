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

async function loadTodayWallpaper() {

    try {

        const response = await fetch(
            "/api/wallpapers?_=" + Date.now()
        );

        const wallpapers = await response.json();

        if (!Array.isArray(wallpapers) || wallpapers.length === 0) {
            return;
        }

        const todayKey =
            new Date().toISOString().split("T")[0];

        let today = null;

        const saved =
            localStorage.getItem("dailyWallpaper");

        if (saved) {

            try {

                const data = JSON.parse(saved);

                if (data.date === todayKey) {

                    today = wallpapers.find(
                        w => String(w.id) === String(data.id)
                    );

                }

            } catch (error) {

                console.log(
                    "Daily wallpaper cache error:",
                    error
                );

            }

        }

        if (!today) {

            today =
                wallpapers[
                    Math.floor(
                        Math.random() * wallpapers.length
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

        const img =
            document.getElementById("todayImage");

        const title =
            document.getElementById("todayTitle");

        const desc =
            document.getElementById("todayDescription");

        const view =
            document.getElementById("todayView");

        const download =
            document.getElementById("todayDownload");

        if (img) {

            img.src =
                todayGetImageUrl(
                    today.thumbnail || today.image
                );

            img.onerror = () => {
                img.src = "assets/logo/no-image.png";
            };
        }

        if (title) {
            title.textContent =
                today.title || "خلفية اليوم";
        }

        if (desc) {
            desc.textContent =
                today.category || "Wallpaper";
        }

        if (view) {

            view.onclick = () => {

                window.location.href =
                    "wallpaper.html?id=" +
                    encodeURIComponent(today.id);

            };

        }

        if (download) {

            download.onclick = () => {

                const a =
                    document.createElement("a");

                a.href =
                    todayGetImageUrl(today.image);

                a.download =
                    (today.title || "wallpaper") +
                    ".jpg";

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

document.addEventListener(
    "DOMContentLoaded",
    () => {
        loadTodayWallpaper();
    }
);
