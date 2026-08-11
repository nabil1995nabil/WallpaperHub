// ======================================
// WallpaperHub Notifications 100D JS
// ======================================


console.log("Notifications JS Loaded");



const notificationsList =
document.getElementById("notificationsList");


const clearBtn =
document.getElementById("clearBtn");




// بيانات تجريبية حاليا
// من بعد نربطوها مع API أو Firebase

let notifications = [

{
id:1,

title:
"إضافة خلفية طبيعية نيون 🌌",

description:
"تم رفع خلفية جديدة فائقة الدقة في قسم الطبيعة.",

image:
"assets/wallpapers/nature1.jpg",

time:
"منذ دقيقتين",

action:
"عرض وتعيين"

},


{
id:2,

title:
"تحديث قسم السيارات 🔥",

description:
"تمت إضافة خلفيات سيارات رياضية جديدة.",

image:
"assets/wallpapers/car1.jpg",

time:
"منذ ساعة",

action:
"استكشف الآن"

},


{
id:3,

title:
"خلفية فضائية جديدة 🌍",

description:
"تصميم جديد عالي الجودة لشاشات AMOLED.",

image:
"assets/wallpapers/space1.jpg",

time:
"منذ يوم",

action:
"تحميل فوري"

}


];





// ======================================
// إنشاء البطاقة
// ======================================


function createNotificationCard(item){


return `


<div class="notification-card"
data-id="${item.id}">



<div class="wallpaper-thumb">

<img 

src="${item.image}"

onerror="this.src='assets/logo/no-image.png'"

>


</div>




<div class="card-body">


<div>


<h2>

${item.title}

</h2>



<p>

${item.description}

</p>


</div>





<div class="card-footer">


<span class="time-tag">

${item.time}

</span>



<button class="action-link">

${item.action}

</button>



</div>



</div>



</div>



`;

}





// ======================================
// عرض الإشعارات
// ======================================


function renderNotifications(){


if(!notificationsList)
return;



notificationsList.innerHTML="";



notifications.forEach(item=>{


notificationsList.innerHTML +=

createNotificationCard(item);



});



activateCards();


}




// ======================================
// تأثير 3D للبطاقات
// ======================================


function activateCards(){


const cards =
document.querySelectorAll(".notification-card");



cards.forEach(card=>{



card.addEventListener(
"mousemove",
(e)=>{


const rect =
card.getBoundingClientRect();



const x =
e.clientX - rect.left
- rect.width/2;



const y =
e.clientY - rect.top
- rect.height/2;




card.style.transform =

`
rotateX(${-y*0.12}deg)
rotateY(${x*0.12}deg)
translateZ(15px)
`;



});





card.addEventListener(
"mouseleave",
()=>{


card.style.transform =

`
rotateX(0)
rotateY(0)
translateZ(0)
`;


});





card.addEventListener(
"click",
()=>{


playBeep(
1800,
0.05
);


});



});



}




// ======================================
// صوت التفاعل
// ======================================


const audioCtx =

new
(window.AudioContext ||
window.webkitAudioContext)();



function playBeep(freq,duration){


if(audioCtx.state==="suspended"){

audioCtx.resume();

}



const osc =
audioCtx.createOscillator();



const gain =
audioCtx.createGain();



osc.frequency.value=freq;



gain.gain.value=.015;



osc.connect(gain);

gain.connect(audioCtx.destination);



osc.start();



gain.gain.exponentialRampToValueAtTime(
0.0001,
audioCtx.currentTime + duration
);



osc.stop(
audioCtx.currentTime + duration
);



}





// ======================================
// مسح الكل
// ======================================


if(clearBtn){


clearBtn.onclick=()=>{


playBeep(600,.1);



const cards =
document.querySelectorAll(".notification-card");



cards.forEach((card,index)=>{


setTimeout(()=>{


card.style.opacity="0";

card.style.transform=
"translateX(150%)";



setTimeout(()=>{


card.remove();


},400);



},index*120);



});



setTimeout(()=>{


notifications=[];


},600);



};



}




// تشغيل

renderNotifications();