// =====================================
// WallpaperHub - Wallhaven Section
// Wallhaven images are imported by server.js
// and then treated as normal Supabase wallpapers.
// =====================================

(() => {
    "use strict";

    const API_URL = "/api/wallpapers";
    const IMPORT_URL = "/api/wallhaven/import";
    const SECTION_URL = "wallhaven.html";

    async function loadWallhavenSection() {
        const mount = document.getElementById("wallhavenSection");
        if (!mount) return;

        try {
            const response = await fetch(SECTION_URL, { cache: "no-cache" });

            if (!response.ok) {
                throw new Error(`Wallhaven HTML error: ${response.status}`);
            }

            mount.innerHTML = await response.text();
            await loadWallhavenWallpapers();

        } catch (error) {
            console.error("Wallhaven module error:", error);
        }
    }

    async function importWallhavenWallpapers() {
        try {
            const response = await fetch(
                `${IMPORT_URL}?_=${Date.now()}`,
                {
                    method: "POST",
                    cache: "no-store",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({})
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok || data?.success === false) {
                throw new Error(
                    data?.message ||
                    `Wallhaven import error: ${response.status}`
                );
            }

            return data;
        } catch (error) {
            console.error("Wallhaven import error:", error);
            return null;
        }
    }

    async function loadWallhavenWallpapers() {
        const container = document.getElementById("wallhavenAI");
        if (!container) return;

        try {
            // Import fresh Wallhaven images before reading the local collection.
            await importWallhavenWallpapers();

            const response = await fetch(
                `${API_URL}?_=${Date.now()}`,
                { cache: "no-store" }
            );

            if (!response.ok) {
                throw new Error(
                    `Wallhaven wallpapers API error: ${response.status}`
                );
            }

            const data = await response.json();

            const wallpapers = (Array.isArray(data) ? data : [])
                .filter(w =>
                    w &&
                    (
                        String(w.source || "").toLowerCase() === "wallhaven" ||
                        String(w.category || "").toLowerCase() === "wallhaven"
                    )
                )
                .slice(0, 10);

            container.innerHTML = "";

            if (!wallpapers.length) {
                container.innerHTML = `
                    <div class="wallhaven-empty">
                        لا توجد خلفيات Wallhaven حالياً.
                    </div>
                `;
                return;
            }

            wallpapers.forEach(w => {
                const card = document.createElement("div");
                card.className = "wall-card";

                const img = document.createElement("img");
                img.src =
                    w.thumbnail ||
                    w.image ||
                    "assets/logo/no-image.png";

                img.alt = "Wallhaven wallpaper";
                img.loading = "lazy";
                img.decoding = "async";

                img.addEventListener("error", () => {
                    if (img.src.endsWith("no-image.png")) return;
                    img.src = "assets/logo/no-image.png";
                }, { once: true });

                card.appendChild(img);

                card.addEventListener("click", () => {
                    if (!w.id) return;

                    location.href =
                        `wallpaper.html?id=${encodeURIComponent(w.id)}`;
                });

                container.appendChild(card);
            });

        } catch (error) {
            console.error("Wallhaven wallpapers load error:", error);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            loadWallhavenSection,
            { once: true }
        );
    } else {
        loadWallhavenSection();
    }
})();
