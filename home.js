// ===================================================
// WallpaperHub Home JS
// Clean 100D Version
// ===================================================


console.log("HOME JS LOADED");



// ===================================================
// Helpers
// ===================================================


function getImageUrl(image){


    if(!image){

        return "assets/logo/no-image.png";

    }


    if(image.startsWith("http")){

        return image;

    }


    if(image.startsWith("assets/")){

        return image;

    }


    return "assets/wallpapers/" + image;


}






function isVideoMedia(wallpaper){


    if(!wallpaper){

        return false;

    }



    if(wallpaper.type === "video"){

        return true;

    }



    const url = String(

        wallpaper.image || ""

    ).toLowerCase();





    return [

        ".mp4",
        ".webm",
        ".mov",
        ".m3u8"

    ].some(ext =>

        url.includes(ext)

    );


}






// ===================================================
// Global Data
// ===================================================


let wallpapers = [];




// ===================================================
// DOM Containers
// ===================================================


const popularContainer =

document.getElementById(
"popularWallpapers"
);



const latestContainer =

document.getElementById(
"latestWallpapers"
);



const downloadedContainer =

document.getElementById(
"downloadedWallpapers"
);



const likedContainer =

document.getElementById(
"likedWallpapers"
);



const recommendedContainer =

document.getElementById(
"recommendedWallpapers"
);



const dynamicSections =

document.getElementById(
"dynamicSections"
);






// ===================================================
// Categories Names
// ===================================================


const categoryNames = {


    nature:"🌿 الطبيعة",

    cars:"🚗 السيارات",

    games:"🎮 الألعاب",

    space:"🌌 الفضاء",

    ai:"🤖 الذكاء الاصطناعي",

    amoled:"🖤 AMOLED",

    animals:"🐾 الحيوانات",

    anime:"🌀 الأنمي",

    city:"🏙️ المدن",

    dark:"🖤 Dark",

    "4k":"💎 4K",

    sports:"⚽ الرياضة",

    minimal:"✨ Minimal"


};






// ===================================================
// Create Wallpaper Card
// ===================================================


function createWallpaperCard(wall){



    let media = "";





    if(isVideoMedia(wall)){


        media = `


        <div class="video-preview">


            <video

            src="${getImageUrl(wall.image)}"

            muted

            loop

            autoplay

            playsinline>

            </video>



            <div class="video-icon">

            ▶

            </div>


        </div>


        `;


    }else{



        media = `


        <img


        src="${getImageUrl(

            wall.thumbnail ||

            wall.image

        )}"


        alt="${wall.title || "Wallpaper"}"


        loading="lazy"


        onerror="this.src='assets/logo/no-image.png'">


        `;


    }






    return `


    <div class="wall-card"

    data-id="${wall.id}">


        ${media}



        <button

        class="fav-btn"

        data-fav="${wall.id}">

        ❤

        </button>



    </div>


    `;



}

// ===================================================
// Load Wallpapers From API
// ===================================================


async function loadWallpapers(){


    try{


        const response = await fetch(
            "/api/wallpapers"
        );



        if(!response.ok){


            throw new Error(
                "API ERROR"
            );


        }



        wallpapers = await response.json();




        console.log(
            "Wallpapers Loaded:",
            wallpapers.length
        );




        loadTodayWallpaper();


        renderPopular();


        renderLatest();


        renderDownloaded();


        renderLiked();


        renderRecommended();


        createDynamicSections();



    }

    catch(error){


        console.error(

            "Wallpaper Loading Error:",

            error

        );


    }



}






// ===================================================
// Render Latest
// ===================================================


function renderLatest(){



    if(!latestContainer)

    return;




    latestContainer.innerHTML = "";





    wallpapers

    .slice()

    .reverse()

    .slice(0,8)

    .forEach(wall=>{


        latestContainer.innerHTML +=

        createWallpaperCard(wall);


    });



}








// ===================================================
// Render Popular
// ===================================================


function renderPopular(){



    if(!popularContainer)

    return;




    popularContainer.innerHTML = "";





    wallpapers

    .slice()

    .sort(

        (a,b)=>

        (b.downloads || 0)

        -

        (a.downloads || 0)

    )

    .slice(0,8)

    .forEach(wall=>{


        popularContainer.innerHTML +=

        createWallpaperCard(wall);


    });



}








// ===================================================
// Render Most Downloaded
// ===================================================


function renderDownloaded(){



    if(!downloadedContainer)

    return;




    downloadedContainer.innerHTML = "";





    wallpapers

    .slice()

    .sort(

        (a,b)=>

        (b.downloads || 0)

        -

        (a.downloads || 0)

    )

    .slice(0,8)

    .forEach(wall=>{


        downloadedContainer.innerHTML +=

        createWallpaperCard(wall);


    });



}








// ===================================================
// Render Most Liked
// ===================================================


function renderLiked(){



    if(!likedContainer)

    return;




    likedContainer.innerHTML = "";





    wallpapers

    .slice()

    .sort(

        (a,b)=>

        (b.likes || 0)

        -

        (a.likes || 0)

    )

    .slice(0,8)

    .forEach(wall=>{


        likedContainer.innerHTML +=

        createWallpaperCard(wall);


    });



}








// ===================================================
// Render Recommended
// ===================================================


function renderRecommended(){



    if(!recommendedContainer)

    return;




    recommendedContainer.innerHTML = "";





    wallpapers

    .filter(

        wall=>

        wall.featured

    )

    .slice(0,8)

    .forEach(wall=>{


        recommendedContainer.innerHTML +=

        createWallpaperCard(wall);


    });



}








// ===================================================
// Dynamic Category Sections
// ===================================================


function createDynamicSections(){



    if(!dynamicSections)

    return;





    dynamicSections.innerHTML = "";





    const categories =

    [

        ...new Set(

            wallpapers.map(

                wall=>

                wall.category

            )

        )

    ];







    categories.forEach(category=>{



        const section =

        document.createElement(
            "section"
        );





        section.className =

        "wall-section";





        section.innerHTML = `


        <div class="title">


            <h3>

            ${

            categoryNames[category]

            ||

            category

            }

            </h3>



            <a href="all-wallpapers.html?category=${encodeURIComponent(category)}">

            عرض الكل

            </a>



        </div>




        <div

        class="wall-grid"

        id="section-${category}">

        </div>



        `;





        dynamicSections.appendChild(
            section
        );





        renderCategory(
            category
        );



    });



}








// ===================================================
// Render Category
// ===================================================


function renderCategory(category){



    const container =

    document.getElementById(

        `section-${category}`

    );





    if(!container)

    return;





    wallpapers

    .filter(

        wall=>

        wall.category === category

    )

    .slice(0,6)

    .forEach(wall=>{


        container.innerHTML +=

        createWallpaperCard(wall);


    });



}

// ===================================================
// Wallpaper Of The Day
// ===================================================


function loadTodayWallpaper(){


    const today =

    wallpapers.find(

        wall =>

        wall.todayWallpaper

    )

    ||

    wallpapers.find(

        wall =>

        wall.featured

    )

    ||

    wallpapers[0];





    if(!today)

    return;







    const image =

    document.getElementById(
        "todayImage"
    );



    const title =

    document.getElementById(
        "todayTitle"
    );



    const description =

    document.getElementById(
        "todayDescription"
    );





    if(image){


        image.src =

        getImageUrl(

            today.thumbnail ||

            today.image

        );


    }






    if(title){


        title.textContent =

        today.title ||

        "خلفية اليوم";


    }






    if(description){


        description.textContent =

        today.category ||

        "";

    }



}








// ===================================================
// Open Wallpaper
// ===================================================


function openWallpaper(id){


    window.location.href =

    `wallpaper.html?id=${id}`;


}








// ===================================================
// Favorite System
// ===================================================


function toggleFavorite(id){



    let favorites =

    JSON.parse(

        localStorage.getItem(
            "favorites"
        )

        ||

        "[]"

    );





    if(

        favorites.includes(id)

    ){



        favorites =

        favorites.filter(

            item =>

            item !== id

        );



    }

    else{



        favorites.push(id);




        const wall =

        findWallpaper(id);





        if(

            wall &&

            typeof addNotification === "function"

        ){



            addNotification(

                "❤️ تمت الإضافة إلى المفضلة",

                wall.title ||

                "خلفية جديدة"

            );


        }



    }







    localStorage.setItem(

        "favorites",

        JSON.stringify(favorites)

    );



}








// ===================================================
// Find Wallpaper
// ===================================================


function findWallpaper(id){



    return wallpapers.find(

        wall =>

        wall.id == id

    );



}








// ===================================================
// Notification Counter
// ===================================================


function updateNotificationCount(){



    const badge =

    document.getElementById(

        "notificationCount"

    );





    if(!badge)

    return;





    const notifications =

    JSON.parse(

        localStorage.getItem(

            "notifications"

        )

        ||

        "[]"

    );





    if(notifications.length){



        badge.textContent =

        notifications.length;



        badge.style.display =

        "flex";



    }

    else{



        badge.style.display =

        "none";



    }



}








function openNotifications(){


    location.href =

    "notifications.html";


}

// ===================================================
// Side Drawer
// ===================================================


const menuBtn =

document.getElementById(
    "menuBtn"
);



const sideDrawer =

document.getElementById(
    "sideDrawer"
);



const drawerOverlay =

document.getElementById(
    "drawerOverlay"
);



const drawerClose =

document.getElementById(
    "drawerClose"
);






function openDrawer(){



    if(!sideDrawer || !drawerOverlay)

    return;




    sideDrawer.classList.add(
        "show"
    );



    drawerOverlay.classList.add(
        "show"
    );



    document.body.classList.add(
        "drawer-open"
    );



}






function closeDrawer(){



    if(!sideDrawer || !drawerOverlay)

    return;




    sideDrawer.classList.remove(
        "show"
    );



    drawerOverlay.classList.remove(
        "show"
    );



    document.body.classList.remove(
        "drawer-open"
    );


}







if(menuBtn){


    menuBtn.onclick = openDrawer;


}





if(drawerClose){


    drawerClose.onclick = closeDrawer;


}





if(drawerOverlay){


    drawerOverlay.onclick = closeDrawer;


}







// ===================================================
// Drawer User Data
// ===================================================


function updateDrawerUser(){



    const drawerAvatar =

    document.getElementById(
        "drawerAvatar"
    );



    const drawerName =

    document.getElementById(
        "drawerName"
    );





    if(drawerName){


        drawerName.textContent =

        localStorage.getItem(
            "userName"
        )

        ||

        "زائر";


    }






    if(drawerAvatar){


        drawerAvatar.src =

        localStorage.getItem(
            "userAvatar"
        )

        ||

        "assets/images/user.png";


    }



}








// ===================================================
// Events After Load
// ===================================================


document.addEventListener(

"DOMContentLoaded",

()=>{


    loadWallpapers();


    updateNotificationCount();


    updateDrawerUser();



});








// ===================================================
// Dynamic Card Events
// ===================================================


document.addEventListener(

"click",

(event)=>{



    const card =

    event.target.closest(
        ".wall-card"
    );





    if(card){


        openWallpaper(

            card.dataset.id

        );


    }






    const favorite =

    event.target.closest(
        ".fav-btn"
    );





    if(favorite){



        event.stopPropagation();



        toggleFavorite(

            favorite.dataset.fav

        );



    }



});







// ===================================================
// Bottom Nav Support
// ===================================================
// يتم تشغيله بعد تحميل components.js


function initBottomNav(){


    const items =

    document.querySelectorAll(
        ".nav-item"
    );





    if(!items.length)

    return;






    items.forEach(item=>{


        item.onclick = ()=>{


            items.forEach(nav=>

                nav.classList.remove(
                    "active"
                )

            );



            item.classList.add(
                "active"
            );


        };


    });



}






window.addEventListener(

"load",

()=>{


    initBottomNav();


});