// WallpaperHub - Bottom navigation
(() => {
    const bottomNav = document.querySelector(".bottom-nav");
    if (!bottomNav) return;

    const items = [...bottomNav.querySelectorAll(".nav-item")];
    const currentPath = window.location.pathname.split("/").pop() || "home.html";

    // Keep the active item correct after direct navigation or page refresh.
    items.forEach(item => {
        const page = item.dataset.page || "";
        const active = page === currentPath || (currentPath === "" && page === "home.html");
        item.classList.toggle("active", active);
        if (active) item.setAttribute("aria-current", "page");
        else item.removeAttribute("aria-current");
    });

    // Anchors provide normal navigation and remain usable if JS is unavailable.
    items.forEach(item => {
        const page = item.dataset.page;
        if (page) item.setAttribute("href", page);
    });
})();
