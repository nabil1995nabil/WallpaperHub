// =================================
// WallpaperHub Notification Bell
// =================================


const notiBtn =
document.getElementById("notiBtn");


const notiBadge =
document.getElementById("notiBadge");


const bellIcon =
document.getElementById("bellIcon");





// جلب عدد الإشعارات من السيرفر

async function loadNotificationCount(){


try{


const response =
await fetch("/api/notifications");



const notifications =
await response.json();




const count =
notifications.length;




updateNotifications(
count
);



}catch(error){


console.log(
"Notification Error:",
error
);


}



}






function updateNotifications(amount){


if(!notiBadge) return;


if(amount > 0){



notiBadge.textContent =
amount;



notiBadge.classList.add(
"badge-active"
);



if(bellIcon){


bellIcon.classList.add(
"bell-shake"
);



setTimeout(()=>{


bellIcon.classList.remove(
"bell-shake"
);


},1000);



}



}else{



notiBadge.textContent =
"";


notiBadge.classList.remove(
"badge-active"
);



}



}






// عند الضغط على الجرس

if(notiBtn){


notiBtn.onclick = ()=>{


window.location.href =
"notifications.html";


};


}






// تشغيل عند فتح الصفحة

loadNotificationCount();



// تحديث كل دقيقة

setInterval(
loadNotificationCount,
60000
);