// WallpaperHub — one shared, route-aware bottom navigation
(() => {
  "use strict";

  function pageName(value) {
    const raw = String(value ?? "").trim().split(/[?#]/)[0];
    if (!raw) return "";
    const parts = raw.split("/").filter(Boolean);
    return (parts.pop() || "").toLowerCase();
  }

  function initializeBottomNavigation(root = document) {
    const nav = root.matches?.(".bottom-nav")
      ? root
      : root.querySelector?.(".bottom-nav") || document.querySelector(".bottom-nav");

    if (!nav) return false;

    document.body?.classList.add("has-bottom-nav");

    // An empty data-pages attribute must not be interpreted as home.html.
    const current = pageName(window.location.pathname) || "home.html";
    const items = Array.from(nav.querySelectorAll(".nav-item"));

    const directMatch = items.find(item => {
      const target = pageName(item.dataset.page || item.getAttribute("href") || "");
      return target === current;
    });

    // Aliases keep category and wallpaper detail routes under Explore.
    const aliasMatch = directMatch || items.find(item => {
      const aliases = String(item.dataset.pages || "")
        .split(",")
        .map(value => pageName(value.trim()))
        .filter(Boolean);
      return aliases.includes(current);
    });

    // Exactly one item may be active, even if routes overlap.
    items.forEach(item => {
      const active = item === aliasMatch;
      item.classList.toggle("active", active);
      if (active) {
        item.setAttribute("aria-current", "page");
      } else {
        item.removeAttribute("aria-current");
      }

      const label = item.querySelector("p,small")?.textContent?.trim();
      if (label && !item.hasAttribute("aria-label")) {
        item.setAttribute("aria-label", label);
      }
    });

    nav.dataset.initialized = "true";
    nav.dataset.activePage = current;
    return true;
  }

  window.initBottomNavigation = initializeBottomNavigation;

  const slot = document.getElementById("bottomNav");
  if (slot) document.body?.classList.add("has-bottom-nav");

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initializeBottomNavigation(), { once: true });
  } else {
    initializeBottomNavigation();
  }

  if (!document.querySelector(".bottom-nav") && document.body) {
    const observer = new MutationObserver(() => {
      if (initializeBottomNavigation()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("pagehide", () => observer.disconnect(), { once: true });
  }
})();
