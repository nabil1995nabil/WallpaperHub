(() => {
    const title = document.getElementById("title");
    const loadingBar = document.getElementById("loadingBar");
    const loadingText = document.getElementById("loadingText");
    const loadingPercent = document.getElementById("loadingPercent");

    if (title) {
        title.textContent = "WallpaperHub";
        title.innerHTML = "WallpaperHub"
            .split("")
            .map((letter, index) => `<span style="--i:${index}">${letter}</span>`)
            .join("");
    }

    const messages = [
        "نجهّز عالمك...",
        "نرتّب أجمل الخلفيات...",
        "لحظات وتبدأ التجربة..."
    ];

    let progress = 0;
    let messageIndex = 0;
    let redirected = false;

    function goHome() {
        if (redirected) return;
        redirected = true;
        window.location.replace(new URL("home.html", window.location.href).href);
    }

    function updateProgress() {
        if (redirected) return;

        progress = Math.min(100, progress + 5);
        if (loadingBar) loadingBar.style.width = `${progress}%`;
        if (loadingPercent) loadingPercent.textContent = `${progress}%`;

        if (progress >= 35 && messageIndex === 0) {
            messageIndex = 1;
            if (loadingText) loadingText.textContent = messages[1];
        } else if (progress >= 75 && messageIndex === 1) {
            messageIndex = 2;
            if (loadingText) loadingText.textContent = messages[2];
        }

        if (progress < 100) {
            window.setTimeout(updateProgress, 70);
        }
    }

    requestAnimationFrame(updateProgress);

    // Navigate after a short, predictable splash; this is independent of the progress animation.
    window.setTimeout(goHome, 2200);

    // Safety net: if the splash remains visible unusually long, retry navigation once.
    window.setTimeout(goHome, 4500);
})();
