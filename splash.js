const title = document.getElementById("title");
const loadingBar = document.getElementById("loadingBar");
const loadingText = document.getElementById("loadingText");
const loadingPercent = document.getElementById("loadingPercent");

if (title) {
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

function updateProgress() {
    progress = Math.min(100, progress + Math.random() * 8 + 4);

    if (loadingBar) loadingBar.style.width = `${progress}%`;
    if (loadingPercent) loadingPercent.textContent = `${Math.round(progress)}%`;

    if (progress > 32 && messageIndex === 0) {
        messageIndex = 1;
        if (loadingText) loadingText.textContent = messages[messageIndex];
    }

    if (progress > 72 && messageIndex === 1) {
        messageIndex = 2;
        if (loadingText) loadingText.textContent = messages[messageIndex];
    }

    if (progress < 100) {
        setTimeout(updateProgress, 120);
    }
}

requestAnimationFrame(updateProgress);

setTimeout(() => {
    window.location.href = "home.html";
}, 5000);
