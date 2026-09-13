// ===========================
// WallpaperHub Favorites
// ===========================


const favoritesGrid =
document.getElementById("favoritesGrid");


const emptyState =
document.getElementById("emptyState");



const API_URL =
"/api/wallpapers";



const SERVER_URL =
"";



function getImageUrl(imagePath){


    if(!imagePath)
        return "";


    if(
        imagePath.startsWith("http://") ||
        imagePath.startsWith("https://")
    ){

        return imagePath;

    }


    return SERVER_URL + "/" +
    imagePath.replace(/^\/+/,"");


}





async function getCloudFavorites() {
    try {
        const { supabase } = await import("./supabase.js");
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user?.id) return null;

        const local = JSON.parse(localStorage.getItem("favorites") || "[]").map(String);
        if (local.length) {
            const rows = local.map(id => ({ user_id:user.id, wallpaper_id:Number(id) }))
                .filter(row => Number.isFinite(row.wallpaper_id));
            if (rows.length) await supabase.from("favorites").upsert(rows, { onConflict:"user_id,wallpaper_id", ignoreDuplicates:true });
        }

        const { data, error } = await supabase.from("favorites")
            .select("wallpaper_id").eq("user_id", user.id);
        if (error) throw error;
        const ids = [...new Set((data || []).map(r => String(r.wallpaper_id)))];
        localStorage.setItem("favorites", JSON.stringify(ids));
        return ids;
    } catch (error) {
        console.warn("CLOUD FAVORITES LOAD ERROR:", error);
        return null;
    }
}

async function loadFavorites(){


try{


    await getCloudFavorites();

    const response =
    await fetch(API_URL);



    const wallpapers =
    await response.json();




    const favorites =
    JSON.parse(
        localStorage.getItem("favorites") || "[]"
    )
    .map(String);




    favoritesGrid.innerHTML="";





    if(favorites.length === 0){


        emptyState.style.display =
        "block";


        favoritesGrid.style.display =
        "none";


        return;


    }





    emptyState.style.display =
    "none";


    favoritesGrid.style.display =
    "grid";







    wallpapers.forEach(wallpaper=>{



        if(
            !favorites.includes(
                String(wallpaper.id)
            )
        )
        return;





        const card =
        document.createElement("div");



        card.className =
        "favorite-card";





        card.innerHTML = `


        <img

        src="${getImageUrl(
            wallpaper.image ||
            wallpaper.thumbnail
        )}"

        alt="Wallpaper"

        loading="lazy"

        >


        `;






        card.onclick=()=>{


            location.href =
            "wallpaper.html?id=" +
            wallpaper.id;


        };






        favoritesGrid.appendChild(card);



    });





}

catch(err){


    console.log(
        "Favorites Error:",
        err
    );


}



}






// تشغيل

loadFavorites();





// تحديث عند تغيير LocalStorage

window.addEventListener(
"storage",
()=>{

    loadFavorites();

});






// تحديث داخلي

window.addEventListener(
"wallpaperhub:user-synced",
()=>{

    loadFavorites();

});