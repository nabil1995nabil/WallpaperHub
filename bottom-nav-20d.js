// WallpaperHub — Accessible responsive bottom navigation
(() => {
    "use strict";

    function normalizePath(value) {
        const parts = String(value || "").split(/[?#]/)[0].split("/").filter(Boolean);
        return (parts.pop() || "home.html").toLowerCase();
    }

    function initBottomNavigation(root = document) {
        const nav = root.matches?.(".bottom-nav")
            ? root
            : root.querySelector?.(".bottom-nav") || document.querySelector(".bottom-nav");
        if (!nav) return false;

        document.body?.classList.add("has-bottom-nav");
        const currentPath = normalizePath(window.location.pathname);
        const items = [...nav.querySelectorAll(".nav-item")];

        items.forEach(item => {
            const page = item.dataset.page || item.getAttribute("href") || "";
            const targetPath = normalizePath(page);
            const active = targetPath === currentPath ||
                (currentPath === "index.html" && targetPath === "home.html");

            item.classList.toggle("active", active);
            if (active) item.setAttribute("aria-current", "page");
            else item.removeAttribute("aria-current");

            if (page) {
                item.setAttribute("href", page);
                if (!item.hasAttribute("aria-label")) {
                    const label = item.querySelector("p")?.textContent?.trim();
                    if (label) item.setAttribute("aria-label", label);
                }
            }
        });

        nav.dataset.initialized = "true";
        return true;
    }

    window.initBottomNavigation = initBottomNavigation;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => initBottomNavigation(), { once: true });
    } else {
        initBottomNavigation();
    }
})();
