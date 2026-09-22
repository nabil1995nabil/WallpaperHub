/* =========================================================
   WallpaperHub — Unsplash Module
   Unsplash -> server.js -> Supabase -> wallpaper.html?id=LOCAL_ID
========================================================= */

(() => {
    "use strict";

    const SECTION_URL = "unsplash.html";
    const API_URL = "/api/unsplash";

    async function loadUnsplashSection() {
        const mount = document.getElementById("unsplashSection");
        if (!mount) return;

        try {
            const response = await fetch(SECTION_URL, { cache: "no-cache" });

            if (!response.ok) {
                throw new Error(`Unsplash HTML error: ${response.status}`);
            }

            mount.innerHTML = await response.text();
            await loadUnsplashWallpapers();
        } catch (error) {
            console.error("Unsplash module error:", error);
        }
    }

    function createUnsplashCard(photo) {
        const localId = Number(photo?.localId ?? photo?.id);

        const imageUrl =
            photo?.urls?.small ||
            photo?.thumbnail ||
            photo?.urls?.regular ||
            photo?.image;

        if (!imageUrl || !Number.isFinite(localId)) return null;

        const card = document.createElement("div");
        card.className = "wall-card unsplash-card";
        card.dataset.wallpaperId = String(localId);

        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt =
            photo?.alt_description ||
            photo?.description ||
            photo?.title ||
            "Unsplash wallpaper";
        img.loading = "lazy";
        img.decoding = "async";

        img.addEventListener("error", () => {
            card.remove();
        }, { once: true });

        const credit = document.createElement("div");
        credit.className = "unsplash-credit";

        const photographer = document.createElement("a");
        photographer.className = "unsplash-name";
        photographer.href =
            photo?.user?.profile_url ||
            "https://unsplash.com/?utm_source=WallpaperHub&utm_medium=referral";
        photographer.target = "_blank";
        photographer.rel = "noopener noreferrer";
        photographer.textContent =
            "Photo by " +
            (photo?.user?.name ||
             photo?.author ||
             "Unsplash photographer");

        // رابط المصور يبقى خارجياً فقط من أجل Attribution.
        photographer.addEventListener("click", event => {
            event.stopPropagation();
        });

        const brand = document.createElement("a");
        brand.className = "unsplash-brand";
        brand.href =
            "https://unsplash.com/?utm_source=WallpaperHub&utm_medium=referral";
        brand.target = "_blank";
        brand.rel = "noopener noreferrer";
        brand.textContent = "Unsplash";

        brand.addEventListener("click", event => {
            event.stopPropagation();
        });

        credit.append(photographer, brand);
        card.append(img, credit);

        // الضغط على الصورة/البطاقة يفتح صفحة WallpaperHub الخاصة بنا.
        card.addEventListener("click", () => {
            window.location.href =
                `wallpaper.html?id=${encodeURIComponent(localId)}`;
        });

        return card;
    }

    async function loadUnsplashWallpapers() {
        const container = document.getElementById("unsplashWallpapers");
        if (!container) return;

        try {
            // server.js يجلب 10 صور من Unsplash ويحفظ الجديد منها
            // في Supabase ثم يرجع الـ local IDs الخاصة بـ WallpaperHub.
            const response = await fetch(
                `${API_URL}?query=wallpaper&order_by=latest&_=${Date.now()}`,
                {
                    headers: { Accept: "application/json" },
                    cache: "no-store"
                }
            );

            let data = {};
            try {
                data = await response.json();
            } catch (_) {}

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    `Unsplash API error ${response.status}`
                );
            }

            const photos = Array.isArray(data.results)
                ? data.results.slice(0, 10)
                : [];

            container.innerHTML = "";

            if (!photos.length) {
                const state = document.createElement("div");
                state.className = "unsplash-state";
                state.textContent =
                    "لا توجد خلفيات متاحة من Unsplash حالياً.";
                container.appendChild(state);
                return;
            }

            photos.forEach(photo => {
                const card = createUnsplashCard(photo);
                if (card) container.appendChild(card);
            });

        } catch (error) {
            console.error("Unsplash API error:", error);

            container.innerHTML = "";

            const state = document.createElement("div");
            state.className = "unsplash-state is-error";
            state.textContent =
                "تعذر تحميل خلفيات Unsplash حالياً.";
            container.appendChild(state);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            loadUnsplashSection,
            { once: true }
        );
    } else {
        loadUnsplashSection();
    }
})();