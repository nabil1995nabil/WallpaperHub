// ===========================
// WallpaperHub Favorites
// ===========================

const favoritesGrid = document.getElementById("favoritesGrid");
const emptyState = document.getElementById("emptyState");

const API_URL = "/api/wallpapers";
const SERVER_URL = "";

function getImageUrl(imagePath) {

    if (!imagePath) return "";

    if (
        imagePath.startsWith("http://") ||
        imagePath.startsWith("https://")
    ) {
        return imagePath;
    }

    return SERVER_URL + "/" +
        imagePath.replace(/^\/+/, "");
}

async function loadFavorites() {

    try {

        const response = await fetch(API_URL);
        const wallpapers = await response.json();

        const favorites =
    JSON.parse(
        localStorage.getItem("favorites") || "[]"
    ).map(String);

        favoritesGrid.innerHTML = "";

        if (favorites.length === 0) {

            emptyState.style.display = "block";
            favoritesGrid.style.display = "none";
            return;

        }

        emptyState.style.display = "none";
        favoritesGrid.style.display = "grid";

        wallpapers.forEach(wallpaper => {

        
        if (
    !favorites.includes(
        String(wallpaper.id)
    )
) return;

            const card = document.createElement("div");

            card.className = "favorite-card";

            card.innerHTML = `

                <img
    src="${getImageUrl(wallpaper.thumbnail || wallpaper.image)}"
    alt="${wallpaper.title}"
>

                <div class="favorite-info">

                    <h4>${wallpaper.title}</h4>

                    <p>${wallpaper.category}</p>

                </div>

            `;

            card.onclick = () => {

                location.href =
                "wallpaper.html?id=" + wallpaper.id;

            };

            favoritesGrid.appendChild(card);

        });

    }

    catch(err){

        console.log(err);

    }

}

loadFavorites();


// تحديث عند تغيير المفضلة من صفحة أخرى
window.addEventListener(
"storage",
()=>{
    loadFavorites();
});


// تحديث عبر event داخلي
window.addEventListener(
"wallpaperhub:user-synced",
()=>{
    loadFavorites();
});