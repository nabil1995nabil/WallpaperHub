/* =========================================================
   WallpaperHub — Founder Crown Controller
   Only the site founder receives the avatar crown.
   ========================================================= */

(() => {
    const FOUNDER_UID = "0bad1b2a-b993-45f2-992c-f18509d9fa34";

    function getTargetUID() {
        return String(
            new URLSearchParams(window.location.search).get("uid") || ""
        ).trim();
    }

    function updateFounderCrown() {
        const crown = document.querySelector(".profile-avatar-crown");
        if (!crown) return;

        const targetUID = getTargetUID();

        const profileUID =
            targetUID ||
            String(window.WallpaperHubCurrentUserId || "").trim();

        const isFounder = profileUID === FOUNDER_UID;

        crown.classList.toggle("is-founder", isFounder);
        crown.hidden = !isFounder;
        crown.setAttribute("aria-hidden", isFounder ? "false" : "true");
    }

    const crown = document.querySelector(".profile-avatar-crown");
    if (crown) {
        crown.hidden = true;
        crown.classList.remove("is-founder");
    }

    window.addEventListener("WallpaperHubAuthReady", updateFounderCrown);
    window.addEventListener("popstate", updateFounderCrown);

    document.addEventListener("DOMContentLoaded", () => {
        updateFounderCrown();

        let tries = 0;
        const timer = setInterval(() => {
            updateFounderCrown();
            tries += 1;
            if (tries >= 20) clearInterval(timer);
        }, 250);
    });
})();
