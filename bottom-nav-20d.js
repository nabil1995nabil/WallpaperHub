// WallpaperHub - Plain Bottom Navigation
const bottomNav = document.querySelector(".bottom-nav");

if(bottomNav){
    const items = bottomNav.querySelectorAll(".nav-item");

    items.forEach(item => item.addEventListener("click", () => {
        items.forEach(i => i.classList.remove("active"));
        item.classList.add("active");

        const page = item.dataset.page;
        if(page && !location.pathname.endsWith(page)){
            window.location.href = page;
        }
    }));
}
