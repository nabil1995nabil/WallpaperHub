/* ==================================
   WallpaperHub Global Theme
================================== */


function applyTheme(){


    const settings =
    JSON.parse(
        localStorage.getItem("wallpaperSettings")
    );


    if(
        settings &&
        settings.darkMode === true
    ){

        document.body.classList.add("dark");

    }else{

        document.body.classList.remove("dark");

    }


}




// تشغيل عند فتح أي صفحة
applyTheme();





// زر الوضع الليلي (صفحة الإعدادات)

document.addEventListener(
"DOMContentLoaded",
()=>{


const darkBtn =
document.getElementById("darkMode");



if(darkBtn){


    const settings =
    JSON.parse(
        localStorage.getItem("wallpaperSettings")
    ) || {};



    darkBtn.checked =
    settings.darkMode || false;



    darkBtn.addEventListener(
    "change",
    ()=>{


        settings.darkMode =
        darkBtn.checked;



        localStorage.setItem(
            "wallpaperSettings",
            JSON.stringify(settings)
        );



        applyTheme();


    });


}


});