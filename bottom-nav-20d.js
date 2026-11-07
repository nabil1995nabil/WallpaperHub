// WallpaperHub — reliable bottom navigation initialization
(() => {
    "use strict";

    function getPageName(value) {
        const clean = String(value || "").split(/[?#]/)[0];
        const parts = clean.split("/").filter(Boolean);
        return (parts.pop() || "home.html").toLowerCase();
    }

    function initializeBottomNavigation(root = document) {
        const nav = root.matches?.(".bottom-nav")
            ? root
            : root.querySelector?.(".bottom-nav") || document.querySelector(".bottom-nav");

        if (!nav) return false;

        document.body?.classList.add("has-bottom-nav");

        const currentPage = getPageName(window.location.pathname);

        nav.querySelectorAll(".nav-item").forEach(item => {
            const page = item.dataset.page || item.getAttribute("href") || "";
            const targetPage = getPageName(page);
            const active = targetPage === currentPage ||
                (currentPage === "index.html" && targetPage === "home.html");

            item.classList.toggle("active", active);

            if (active) item.setAttribute("aria-current", "page");
            else item.removeAttribute("aria-current");

            // Keep normal anchor navigation and open-in-new-tab behavior.
            if (page && !item.hasAttribute("href")) {
                item.setAttribute("href", page);
            }

            if (!item.hasAttribute("aria-label")) {
                const label = item.querySelector("p")?.textContent?.trim();
                if (label) item.setAttribute("aria-label", label);
            }
        });

        nav.dataset.initialized = "true";
        return true;
    }

    window.initBottomNavigation = initializeBottomNavigation;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            initializeBottomNavigation();
        }, { once: true });
    } else {
        initializeBottomNavigation();
    }

    // The nav HTML is fetched asynchronously by components.js.
    if (!document.querySelector(".bottom-nav") && document.body) {
        const observer = new MutationObserver(() => {
            if (initializeBottomNavigation()) observer.disconnect();
        });

        observer.observe(document.body, { childList: true, subtree: true });
        window.addEventListener("pagehide", () => observer.disconnect(), { once: true });
    }
})();
