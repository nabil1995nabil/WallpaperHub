/* =========================================================
   WallpaperHub — Founder Crown
   Single source of truth: the founder UID below.
   ========================================================= */

(() => {
    const FOUNDER_UID = "0bad1b2a-b993-45f2-992c-f18509d9fa34";

    const normalize = value => String(value || "").trim().toLowerCase();

    function getProfileUID() {
        const params = new URLSearchParams(window.location.search);

        // Public profile pages use ?uid=...
        const publicUID =
            params.get("uid") ||
            params.get("user") ||
            params.get("profile");

        if (publicUID) return normalize(publicUID);

        // Own profile: profile.js already persists the authenticated UID
        // in localStorage. No auth token is read or exposed here.
        return normalize(
            localStorage.getItem("userId") ||
            localStorage.getItem("uid") ||
            localStorage.getItem("userUID")
        );
    }

    function renderFounderCrown() {
        const crown = document.querySelector(".profile-avatar-crown");
        if (!crown) return;

        const isFounder = getProfileUID() === normalize(FOUNDER_UID);

        crown.classList.toggle("is-founder", isFounder);
        crown.hidden = !isFounder;
        crown.setAttribute("aria-hidden", isFounder ? "false" : "true");
    }

    // Hidden by default: nobody sees the crown while identity is loading.
    document.addEventListener("DOMContentLoaded", () => {
        renderFounderCrown();

        // Auth/profile data may arrive shortly after DOM ready.
        let attempts = 0;
        const timer = setInterval(() => {
            renderFounderCrown();
            attempts += 1;

            if (attempts >= 20) {
                clearInterval(timer);
            }
        }, 250);
    });

    window.addEventListener("storage", renderFounderCrown);
    window.addEventListener("popstate", renderFounderCrown);
})();
