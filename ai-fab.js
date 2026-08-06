document.addEventListener("DOMContentLoaded", () => {

    const aiFab = document.getElementById("aiFab");

    if (!aiFab) return;

    // الصفحات اللي ما خاصش يظهر فيها زر AI
    const currentPage =
        window.location.pathname.split("/").pop().toLowerCase();

    const hiddenFabPages = [
        "login.html",
        "register.html"
    ];

    if (hiddenFabPages.includes(currentPage)) {
        aiFab.style.display = "none";
        return;
    }

    // فتح WallpaperHub AI
    aiFab.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        window.location.href = "ai.html";
    });

});