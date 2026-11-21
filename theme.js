/* WallpaperHub unified theme controller
   The appearance preference is stored in wallpaperSettings.darkMode.
   This file is safe to load from every page and can be loaded more than once.
*/
(function () {
    "use strict";

    if (window.__wallpaperHubUnifiedThemeReady) return;
    window.__wallpaperHubUnifiedThemeReady = true;

    const SETTINGS_KEY = "wallpaperSettings";
    const LEGACY_KEY = "darkMode";

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

        try {
            return localStorage.getItem(LEGACY_KEY) === "true";
        } catch (_) {
            return false;
        }
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

    // The settings checkbox remains the single user-facing theme control.
    document.addEventListener("change", function (event) {
        const target = event.target;
        if (target && target.id === "darkMode") {
            setWallpaperHubTheme(target.checked);
        }
    });

    // Keep other open tabs in sync when the preference changes elsewhere.
    window.addEventListener("storage", function (event) {
        if (!event.key || event.key === SETTINGS_KEY || event.key === LEGACY_KEY) {
            applyTheme();
        }
    });

    window.addEventListener("wallpaperhub:settings-updated", applyTheme);

    applyTheme();
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", applyTheme, { once: true });
    }
})();
