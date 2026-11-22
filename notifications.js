// ======================================
// WallpaperHub — Notification Center (bell system)
// Authenticated loading, safe rendering, polling and read state.
// ======================================
(function () {
    "use strict";

    const notificationsList = document.getElementById("notificationsList");
    const clearBtn = document.getElementById("clearBtn");

    let notifications = [];
    let wallpapers = [];
    let wallpapersLoaded = false;
    let lastWallpaperRefreshAt = 0;
    let initialized = false;
    let pollingTimer = null;
    let isLoading = false;

    const NOTIFICATION_POLL_MS = 12000;
    const WALLPAPER_REFRESH_COOLDOWN_MS = 60000;
    const FALLBACK_IMAGE = "/assets/logo/no-image.png";
    const notificationSound = new Audio("/assets/sounds/notification.wav");
    notificationSound.preload = "auto";
    notificationSound.volume = 0.72;

    function getSupabaseAccessTokenFromBrowser() {
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i) || "";
                if (!key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;

                const raw = localStorage.getItem(key);
                if (!raw) continue;

                let session;
                try {
                    session = JSON.parse(raw);
                } catch (_) {
                    if (!raw.startsWith("base64-")) continue;
                    const binary = atob(raw.slice(7));
                    const bytes = Uint8Array.from(binary, function (char) { return char.charCodeAt(0); });
                    session = JSON.parse(new TextDecoder().decode(bytes));
                }

                const token = String(
                    session && (session.access_token ||
                    (session.currentSession && session.currentSession.access_token)) || ""
                ).trim();

                if (token) return token;
            }
        } catch (error) {
            console.warn("AUTH TOKEN READ ERROR:", error);
        }
        return "";
    }

    function apiHeaders() {
        const token = getSupabaseAccessTokenFromBrowser();
        const headers = { "Accept": "application/json" };
        if (token) headers.Authorization = "Bearer " + token;
        return headers;
    }

    function setListMessage(message, className) {
        if (!notificationsList) return;
        notificationsList.replaceChildren();
        const paragraph = document.createElement("p");
        paragraph.className = className || "empty-notification";
        paragraph.textContent = message;
        notificationsList.appendChild(paragraph);
        notificationsList.setAttribute("aria-busy", "false");
    }

    async function playNotificationSound() {
        if(window.WallpaperHubSettings?.soundEnabled?.() === false) return;
        try {
            notificationSound.currentTime = 0;
            await notificationSound.play();
        } catch (error) {
            console.debug("NOTIFICATION SOUND BLOCKED:", error && error.message || error);
        }
    }

    async function unlockNotificationSound() {
        try {
            notificationSound.muted = true;
            await notificationSound.play();
            notificationSound.pause();
            notificationSound.currentTime = 0;
        } catch (_) {
            // Audio remains optional; the page must work even when autoplay is blocked.
        } finally {
            notificationSound.muted = false;
            document.removeEventListener("pointerdown", unlockNotificationSound);
            document.removeEventListener("keydown", unlockNotificationSound);
        }
    }

    document.addEventListener("pointerdown", unlockNotificationSound, { once: true });
    document.addEventListener("keydown", unlockNotificationSound, { once: true });

    async function loadWallpapers(force) {
        if (wallpapersLoaded && !force) return;
        const now = Date.now();
        if (force && now - lastWallpaperRefreshAt < WALLPAPER_REFRESH_COOLDOWN_MS) return;
        lastWallpaperRefreshAt = now;

        try {
            const response = await fetch("/api/wallpapers?_notifications=" + now, {
                cache: "no-store",
                headers: apiHeaders()
            });
            if (!response.ok) throw new Error("Wallpapers API " + response.status);

            const data = await response.json();
            wallpapers = Array.isArray(data) ? data : [];
            wallpapersLoaded = true;
        } catch (error) {
            // Wallpaper thumbnails are optional; never block notification text.
            console.warn("OPTIONAL WALLPAPER DATA ERROR:", error);
        }
    }

    async function fetchNotifications() {
        const token = getSupabaseAccessTokenFromBrowser();
        if (!token) throw new Error("AUTH_REQUIRED");

        const response = await fetch("/api/notifications?_=" + Date.now(), {
            cache: "no-store",
            headers: apiHeaders()
        });

        if (response.status === 401) throw new Error("AUTH_REQUIRED");
        if (!response.ok) throw new Error("Notifications API " + response.status);

        const data = await response.json();
        return Array.isArray(data) ? data : [];
    }

    function getWallpaperId(item) {
        return String(item && (item.wallpaperId || item.wallpaper_id) || "").trim();
    }

    function getWallpaperImage(id) {
        if (!id) return FALLBACK_IMAGE;
        const wallpaper = wallpapers.find(function (entry) {
            return String(entry.id) === String(id);
        });
        const candidate = String(wallpaper && (wallpaper.thumbnail || wallpaper.image) || "").trim();
        if (!candidate) return FALLBACK_IMAGE;

        try {
            const url = new URL(candidate, window.location.origin);
            if (url.protocol !== "https:" && url.origin !== window.location.origin) return FALLBACK_IMAGE;
            if (url.protocol !== "https:" && url.protocol !== "http:") return FALLBACK_IMAGE;
            return url.href;
        } catch (_) {
            return FALLBACK_IMAGE;
        }
    }

    function getNotificationTarget(item) {
        const type = String(item && item.type || "").toLowerCase();
        const wallpaperId = getWallpaperId(item);
        const userId = String(item && (item.userId || item.from_user || item.fromUser) || "").trim();
        const communityMessageId = String(item && (
            item.communityMessageId || item.community_message_id || item.messageId
        ) || "").trim();

        if (type === "community_moderation" || type === "community_appeal_update") {
            return "community-appeal.html";
        }
        if (type.indexOf("community_") === 0) {
            return communityMessageId
                ? "community.html?message=" + encodeURIComponent(communityMessageId)
                : "community.html";
        }
        if (["new_follower", "new_follow", "follow", "user_follow", "follow_user", "user_followed"].indexOf(type) !== -1 && userId) {
            return "profile.html?uid=" + encodeURIComponent(userId);
        }
        if (wallpaperId) {
            return "wallpaper.html?id=" + encodeURIComponent(wallpaperId);
        }
        return "";
    }

    function markItemReadLocally(id) {
        const item = notifications.find(function (entry) {
            return String(entry.id) === String(id);
        });
        if (!item) return;
        item.is_read = true;
        item.read = true;
        renderNotifications();
        window.dispatchEvent(new CustomEvent("wallpaperhub:notifications-updated"));
    }

    async function markNotificationRead(id) {
        const token = getSupabaseAccessTokenFromBrowser();
        if (!token || !id) return false;

        try {
            const response = await fetch(
                "/api/notifications/" + encodeURIComponent(id) + "/read",
                {
                    method: "PATCH",
                    headers: {
                        "Authorization": "Bearer " + token,
                        "Accept": "application/json"
                    }
                }
            );
            if (!response.ok) throw new Error("Mark notification read API " + response.status);
            markItemReadLocally(id);
            return true;
        } catch (error) {
            console.warn("MARK NOTIFICATION READ ERROR:", error);
            return false;
        }
    }

    async function openNotification(item) {
        if (!item) return;
        const target = getNotificationTarget(item);
        await markNotificationRead(item.id);
        if (target) window.location.href = target;
    }

    function createNotificationCard(item) {
        const card = document.createElement("article");
        const id = String(item && item.id || "");
        const title = String(item && item.title || "إشعار جديد");
        const message = String(item && (item.message || item.content) || "");
        const date = String(item && item.date || "");
        const target = getNotificationTarget(item);
        const unread = item && item.is_read === false;

        card.className = "notification-card" + (unread ? " unread" : "");
        card.dataset.notificationId = id;
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", title + (unread ? "، غير مقروء" : ""));
        card.addEventListener("click", function () { openNotification(item); });
        card.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openNotification(item);
            }
        });

        const thumb = document.createElement("div");
        thumb.className = "wallpaper-thumb";
        const image = document.createElement("img");
        image.src = getWallpaperImage(getWallpaperId(item));
        image.alt = "";
        image.loading = "lazy";
        image.decoding = "async";
        image.addEventListener("error", function () {
            if (image.src.indexOf(FALLBACK_IMAGE) === -1) image.src = FALLBACK_IMAGE;
        }, { once: true });
        thumb.appendChild(image);

        const body = document.createElement("div");
        body.className = "card-body";

        const content = document.createElement("div");
        const heading = document.createElement("h2");
        heading.textContent = title;
        const paragraph = document.createElement("p");
        paragraph.textContent = message;
        content.appendChild(heading);
        content.appendChild(paragraph);

        const footer = document.createElement("div");
        footer.className = "card-footer";
        const time = document.createElement("span");
        time.className = "time-tag";
        time.textContent = date;

        const action = document.createElement("button");
        action.className = "action-link";
        action.type = "button";
        action.textContent = target ? "عرض" : "تحديد كمقروء";
        action.addEventListener("click", function (event) {
            event.stopPropagation();
            openNotification(item);
        });

        footer.appendChild(time);
        footer.appendChild(action);
        body.appendChild(content);
        body.appendChild(footer);
        card.appendChild(thumb);
        card.appendChild(body);

        return card;
    }

    function renderNotifications() {
        if (!notificationsList) return;
        notificationsList.replaceChildren();
        notificationsList.setAttribute("aria-busy", "false");

        if (!notifications.length) {
            setListMessage("لا توجد إشعارات", "empty-notification");
            return;
        }

        const fragment = document.createDocumentFragment();
        notifications.forEach(function (item) {
            fragment.appendChild(createNotificationCard(item));
        });
        notificationsList.appendChild(fragment);
    }

    async function loadNotifications(options) {
        if (isLoading) return;
        isLoading = true;
        const settings = options || {};
        try {
            if(window.WallpaperHubSettings?.notificationsEnabled?.() === false){
                notifications=[];
                initialized=true;
                setListMessage("مركز الإشعارات متوقف من صفحة الإعدادات","empty-notification");
                return;
            }
            const nextNotifications = await fetchNotifications();
            const previousIds = new Set(notifications.map(function (item) {
                return String(item.id);
            }));

            const newItems = nextNotifications.filter(function (item) {
                return !previousIds.has(String(item.id));
            });

            const wallpaperIds = nextNotifications.map(getWallpaperId).filter(Boolean);
            const hasMissingWallpaper = wallpaperIds.some(function (id) {
                return !wallpapers.some(function (entry) {
                    return String(entry.id) === String(id);
                });
            });

            await loadWallpapers(!wallpapersLoaded || hasMissingWallpaper);

            notifications = nextNotifications;

            if (settings.announceNew && initialized && newItems.length) {
                await playNotificationSound();
            }

            initialized = true;
            renderNotifications();
        } catch (error) {
            console.warn("Notifications Error:", error);
            if (error && error.message === "AUTH_REQUIRED") {
                notifications = [];
                setListMessage("يجب تسجيل الدخول لعرض الإشعارات", "empty-notification");
            } else if (!notifications.length) {
                setListMessage("تعذر تحميل الإشعارات، حاول مرة أخرى", "empty-notification");
            }
        } finally {
            isLoading = false;
            schedulePolling();
        }
    }

    function schedulePolling() {
        if (pollingTimer) window.clearTimeout(pollingTimer);
        if(window.WallpaperHubSettings?.notificationsEnabled?.() === false) return;
        pollingTimer = window.setTimeout(function () {
            if (!document.hidden) loadNotifications({ announceNew: true });
            else schedulePolling();
        }, NOTIFICATION_POLL_MS);
    }

    if (clearBtn) {
        clearBtn.addEventListener("click", async function () {
            const token = getSupabaseAccessTokenFromBrowser();
            if (!token) {
                window.alert("يجب تسجيل الدخول أولاً");
                return;
            }

            clearBtn.disabled = true;
            try {
                const response = await fetch("/api/notifications", {
                    method: "DELETE",
                    headers: {
                        "Authorization": "Bearer " + token,
                        "Accept": "application/json"
                    }
                });

                const result = await response.json();
                if (!response.ok || !result || !result.success) {
                    throw new Error(result && result.message || "Clear notifications failed");
                }

                notifications = [];
                renderNotifications();
                window.dispatchEvent(new CustomEvent("wallpaperhub:notifications-updated"));
            } catch (error) {
                console.error("Clear notifications error:", error);
                window.alert("تعذر مسح الإشعارات");
            } finally {
                clearBtn.disabled = false;
            }
        });
    }

    window.addEventListener("wallpaperhub:settings-updated",function(){
        if(window.WallpaperHubSettings?.notificationsEnabled?.() === false){
            notifications=[];
            setListMessage("مركز الإشعارات متوقف من صفحة الإعدادات","empty-notification");
            if(pollingTimer)window.clearTimeout(pollingTimer);
        }else{
            void loadNotifications({announceNew:false});
        }
    });

    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) loadNotifications({ announceNew: false });
    });

    window.addEventListener("pagehide", function () {
        if (pollingTimer) window.clearTimeout(pollingTimer);
    }, { once: true });

    loadNotifications();
})();
