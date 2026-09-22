/* WallpaperHub — isolated Wallhaven module */
(() => {
    "use strict";

    const API_URL = "/api/wallpapers";
    const SECTION_URL = "wallhaven.html";

    async function loadWallhavenSection() {
        const mount = document.getElementById("wallhavenSection");
        if (!mount) return;

        try {
            const response = await fetch(SECTION_URL, { cache: "no-cache" });
            if (!response.ok) throw new Error(`Wallhaven HTML error: ${response.status}`);
            mount.innerHTML = await response.text();
            await loadWallhavenWallpapers();
        } catch (error) {
            console.error("Wallhaven module error:", error);
        }
    }

    async function loadWallhavenWallpapers() {
        const container = document.getElementById("wallhavenAI");
        if (!container) return;

        try {
            const response = await fetch(`${API_URL}?_=${Date.now()}`, { cache: "no-store" });
            if (!response.ok) throw new Error(`Wallhaven API error: ${response.status}`);

            const data = await response.json();
            const wallpapers = Array.isArray(data) ? data : [];

            container.innerHTML = "";

            wallpapers
                .filter(w => w && w.source === "wallhaven" && w.category === "wallhaven")
                .slice(0, 10)
                .forEach(w => {
                    const card = document.createElement("div");
                    card.className = "wall-card";

                    const img = document.createElement("img");
                    img.src = w.thumbnail || w.image || "assets/logo/no-image.png";
                    img.alt = w.title || "Wallhaven wallpaper";
                    img.loading = "lazy";
                    img.decoding = "async";
                    img.addEventListener("error", () => {
                        img.src = "assets/logo/no-image.png";
                    }, { once: true });

                    card.appendChild(img);
                    card.addEventListener("click", () => {
                        if (w.id) location.href = `wallpaper.html?id=${encodeURIComponent(w.id)}`;
                    });
                    container.appendChild(card);
                });
        } catch (error) {
            console.error("Wallhaven API error:", error);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadWallhavenSection, { once: true });
    } else {
        loadWallhavenSection();
    }
})();
