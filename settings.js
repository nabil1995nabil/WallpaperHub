// =================================
// WallpaperHub Settings JS
// =================================


const defaultSettings = {

    darkMode:false,

    animations:true,

    appColor:true,

    glassCards:false,


    videos:true,

    highQuality:true,

    fullscreen:true,

    autoUpdate:true,

    wifiOnly:false,


    notifications:true,

    ratingsNotify:true,

    updatesNotify:true,


    previewSave:true,

    watermark:false,


    ai:true,

    smartAI:true,


    systemUpdate:true

};



// تحميل الإعدادات

let settings = JSON.parse(

localStorage.getItem(
"wallpaperSettings"
)

) || defaultSettings;




// جميع المفاتيح

const settingIds = Object.keys(
defaultSettings
);





// ================================
// ربط الأزرار
// ================================


settingIds.forEach(id=>{


const input =

document.getElementById(id);



if(input){


input.checked =

settings[id];



input.addEventListener(
"change",

()=>{


settings[id] =

input.checked;



saveSettings();



applySetting(id);



}

);


}


});







// ================================
// حفظ
// ================================


function saveSettings(){


localStorage.setItem(

"wallpaperSettings",

JSON.stringify(settings)

);


}







// ================================
// تطبيق الإعدادات
// ================================


function applySetting(type){



switch(type){



case "darkMode":


if(settings.darkMode){

document.body.classList.add(
"dark"
);


}else{


document.body.classList.remove(
"dark"
);


}

break;






case "animations":



if(settings.animations){


document.body.classList.remove(
"no-animation"
);


}else{


document.body.classList.add(
"no-animation"
);


}


break;






case "glassCards":



document.body.classList.toggle(

"glass-mode",

settings.glassCards

);


break;






case "appColor":


console.log(
"لون التطبيق:",
settings.appColor
);


break;






case "videos":


console.log(
"الخلفيات المتحركة:",
settings.videos
);


break;






case "highQuality":


console.log(
"الجودة:",
settings.highQuality
);


break;






case "notifications":


console.log(
"الإشعارات:",
settings.notifications
);


break;






case "ai":


console.log(
"AI:",
settings.ai
);


break;





default:


console.log(

type,

settings[type]

);


}




}








// ================================
// تشغيل عند فتح الصفحة
// ================================


Object.keys(settings).forEach(

key=>{


applySetting(key);


const input =

document.getElementById(key);



if(input){

input.checked =

settings[key];

}


}

);








// ================================
// أدوات الخصوصية
// ================================


// مسح البحث

const clearSearchBtn =

document.querySelector(
".action-btn"
);



if(clearSearchBtn){


clearSearchBtn.onclick=()=>{


localStorage.removeItem(
"searchHistory"
);


alert(
"تم مسح سجل البحث"
);


};


}






// مسح المفضلة


const buttons =

document.querySelectorAll(
".action-btn"
);



if(buttons[1]){


buttons[1].onclick=()=>{


localStorage.removeItem(
"favorites"
);


alert(
"تم مسح المفضلة"
);


};


}







// إعادة ضبط


if(buttons[2]){


buttons[2].onclick=()=>{


localStorage.removeItem(
"wallpaperSettings"
);



location.reload();



};


}

const cardStyleBtn =
document.getElementById("cardStyleBtn");

const cardStyleMenu =
document.getElementById("cardStyleMenu");


cardStyleBtn.onclick = ()=>{

cardStyleMenu.classList.toggle("show");

};



let savedStyle =
localStorage.getItem("cardStyle") || "classic";


document.querySelectorAll(".style-option")
.forEach(option=>{


if(option.dataset.style === savedStyle){

option.classList.add("active");

option.querySelector("span").textContent="☑️";

}


option.onclick=()=>{


document.querySelectorAll(".style-option")
.forEach(o=>{

o.classList.remove("active");

o.querySelector("span").textContent="☐";

});


option.classList.add("active");

option.querySelector("span").textContent="☑️";


localStorage.setItem(
"cardStyle",
option.dataset.style
);


};


});