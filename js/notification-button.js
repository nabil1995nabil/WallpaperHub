// WallpaperHub notification bell — authenticated, unread count only.
(() => {
    "use strict";

    const button = document.getElementById("notiBtn");
    const badge = document.getElementById("notiBadge");
    const icon = document.getElementById("bellIcon");
    if (!button || !badge) return;

    function getAccessToken() {
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i) || "";
                if (!key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
                const raw = localStorage.getItem(key);
                if (!raw) continue;
                const session = JSON.parse(raw);
                const token = String(session?.access_token || session?.currentSession?.access_token || "").trim();
                if (token) return token;
            }
        } catch (error) {
            console.warn("Notification auth token error:", error);
        }
        return "";
    }

    function renderCount(count) {
        const safeCount = Math.max(0, Number(count) || 0);
        badge.textContent = safeCount > 99 ? "99+" : String(safeCount);
        badge.classList.toggle("badge-active", safeCount > 0);
        badge.hidden = safeCount === 0;
        button.setAttribute("aria-label", safeCount
            ? `الإشعارات، ${safeCount} غير مقروء`
            : "الإشعارات");
    }

    async function loadNotificationCount() {
        const token = getAccessToken();
        if (!token) {
            renderCount(0);
            return;
        }

        try {
            const response = await fetch("/api/notifications?_=" + Date.now(), {
                method: "GET",
                cache: "no-store",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Accept": "application/json"
                }
            });

            if (response.status === 401) {
                renderCount(0);
                return;
            }
            if (!response.ok) throw new Error("Notifications API " + response.status);

            const data = await response.json();
            const items = Array.isArray(data) ? data : [];
            const unread = items.filter(item =>
                item?.isRead === false || item?.is_read === false ||
                (item?.isRead == null && item?.is_read == null)
            ).length;
            renderCount(unread);

            if (unread > 0 && icon && !document.hidden) {
                icon.classList.add("bell-shake");
                window.setTimeout(() => icon.classList.remove("bell-shake"), 900);
            }
        } catch (error) {
            // Keep the last known count if a transient network error occurs.
            console.warn("Notification count load failed:", error);
        }
    }

    button.setAttribute("role", "link");
    button.setAttribute("tabindex", "0");
    button.setAttribute("aria-label", "الإشعارات");
    button.addEventListener("click", () => {
        window.location.href = "notice.html";
    });
    button.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            window.location.href = "notice.html";
        }
    });

    loadNotificationCount();
    const timer = window.setInterval(() => {
        if (!document.hidden) loadNotificationCount();
    }, 30000);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) loadNotificationCount();
    });
    window.addEventListener("pagehide", () => window.clearInterval(timer), { once: true });
})();
