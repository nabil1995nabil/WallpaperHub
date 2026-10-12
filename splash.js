(() => {
    let navigated = false;

    function goHome() {
        if (navigated) return;
        navigated = true;
        window.location.replace(new URL("home.html", window.location.href).href);
    }

    // Keep the splash brief; the skip link remains available as a fallback.
    window.setTimeout(goHome, 1800);

    document.querySelector(".splash-skip")?.addEventListener("click", (event) => {
        event.preventDefault();
        goHome();
    });
})();
