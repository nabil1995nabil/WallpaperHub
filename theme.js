/* WallpaperHub unified theme controller
   Single preference: wallpaperSettings.darkMode (settings page).
   Adds page identity classes so page-specific palettes can stay nuanced.
*/
(function () {
    "use strict";
    if (window.__wallpaperHubUnifiedThemeReady) return;
    window.__wallpaperHubUnifiedThemeReady = true;

    const SETTINGS_KEY = "wallpaperSettings";
    const LEGACY_KEY = "darkMode";

    const PAGE_ALIASES = {
        "index": "home",
        "home": "home",
        "social": "social",
        "community": "community",
        "community-creation": "community-creation",
        "community-appeal": "community-appeal",
        "publish": "publish",
        "publish-telegram": "publish-telegram",
        "studio": "studio",
        "photo-editor": "photo-editor",
        "all-wallpapers": "all-wallpapers",
        "categories": "categories",
        "artguru": "artguru",
        "points": "points",
        "points-earn": "points-earn",
        "premium-user": "premium-user",
        "profile": "profile",
        "favorites": "favorites",
        "wallpaper": "wallpaper",
        "today": "today",
        "about": "about",
        "privacy": "privacy",
        "settings": "settings",
        "support": "support",
        "developers": "developers",
        "unsplash": "unsplash",
        "wallhaven": "wallhaven",
        "notice": "notice",
        "notifications": "notifications",
        "login": "login"
    };

    function readSettings() {
        try {
            const value = localStorage.getItem(SETTINGS_KEY);
            const parsed = value ? JSON.parse(value) : {};
            return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
        } catch (error) {
            console.warn("WallpaperHub theme settings could not be read:", error);
            return {};
        }
    }

    function readDarkMode() {
        const settings = readSettings();
        if (typeof settings.darkMode === "boolean") return settings.darkMode;
        try { return localStorage.getItem(LEGACY_KEY) === "true"; }
        catch (_) { return false; }
    }

    function applyPageIdentity() {
        const rawPath = String(window.location.pathname || "/");
        const filename = rawPath.split("/").filter(Boolean).pop() || "home";
        const slug = decodeURIComponent(filename).replace(/\.html?$/i, "").toLowerCase();
        const page = PAGE_ALIASES[slug] || slug.replace(/[^a-z0-9-]/g, "-");
        const body = document.body;
        const root = document.documentElement;

        root.dataset.whPage = page;
        if (body) {
            body.classList.add("wh-page-" + page);
            body.dataset.whPage = page;
            if (rawPath.toLowerCase().includes("/admin/")) {
                body.classList.add("wh-page-admin");
            }
        }
        return page;
    }

    function updateThemeColor(isDark) {
        const color = isDark ? "#0b0f19" : "#f6f8fc";
        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement("meta");
            meta.name = "theme-color";
            document.head.appendChild(meta);
        }
        meta.setAttribute("content", color);
    }

    function applyTheme() {
        const isDark = readDarkMode();
        const themeName = isDark ? "dark" : "light";
        const root = document.documentElement;
        const body = document.body;

        applyPageIdentity();
        root.classList.toggle("dark", isDark);
        root.dataset.whTheme = themeName;
        root.style.colorScheme = themeName;

        if (body) {
            body.classList.toggle("dark", isDark);
            body.dataset.theme = themeName;
            body.style.colorScheme = themeName;
        }

        updateThemeColor(isDark);
        document.querySelectorAll("#darkMode").forEach(function (input) {
            if (input.checked !== isDark) input.checked = isDark;
        });
        return themeName;
    }

    function setWallpaperHubTheme(enabled) {
        const isDark = Boolean(enabled);
        const settings = readSettings();
        settings.darkMode = isDark;
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            localStorage.setItem(LEGACY_KEY, String(isDark));
        } catch (error) {
            console.warn("WallpaperHub theme preference could not be saved:", error);
        }
        const themeName = applyTheme();
        window.dispatchEvent(new CustomEvent("wallpaperhub:themechange", {
            detail: { darkMode: isDark, theme: themeName }
        }));
        return themeName;
    }

    window.applyTheme = applyTheme;
    window.setWallpaperHubTheme = setWallpaperHubTheme;
    window.getWallpaperHubTheme = function () {
        return readDarkMode() ? "dark" : "light";
    };

    document.addEventListener("change", function (event) {
        const target = event.target;
        if (target && target.id === "darkMode") setWallpaperHubTheme(target.checked);
    });

    window.addEventListener("storage", function (event) {
        if (!event.key || event.key === SETTINGS_KEY || event.key === LEGACY_KEY) applyTheme();
    });
    window.addEventListener("wallpaperhub:settings-updated", applyTheme);

    applyTheme();
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", applyTheme, { once: true });
    }
})();
