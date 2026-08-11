// ======================================
// WallpaperHub Notifications JS
// ======================================


console.log("Notifications JS Loaded");


const notificationsList =
document.getElementById("notificationsList");


const clearBtn =
document.getElementById("clearBtn");



let notifications = [];

let wallpapers = [];




// ======================================
// تحميل البيانات
// ======================================

async function loadNotifications(){


try{


const notiResponse =
await fetch("/api/notifications");


notifications =
await notiResponse.json();



const wallResponse =
await fetch("/api/wallpapers");


wallpapers =
await wallResponse.json();




renderNotifications();



}catch(error){


console.log(
"Notifications Error:",
error
);



notificationsList.innerHTML =

`
<p class="empty-notification">
لا توجد إشعارات
</p>
`;

}


}





// ======================================
// البحث عن الخلفية
// ======================================


function getWallpaperImage(id){


const wall =

wallpapers.find(
w=>String(w.id)===String(id)
);



if(!wall)
return "assets/logo/no-image.png";



return wall.thumbnail || wall.image;


}







// ======================================
// إنشاء البطاقة
// ======================================


function createNotificationCard(item){



return `


<div class="notification-card"
data-id="${item.wallpaperId}">



<div class="wallpaper-thumb">


<img

src="${getWallpaperImage(item.wallpaperId)}"

onerror="this.src='assets/logo/no-image.png'"

>


</div>




<div class="card-body">


<div>


<h2>

${item.title}

</h2>



<p>

${item.message}

</p>


</div>





<div class="card-footer">


<span class="time-tag">

${item.date}

</span>



<button
class="action-link"
onclick="openWallpaper('${item.wallpaperId}')">

عرض

</button>



</div>


</div>


</div>


`;

}





// ======================================
// عرض
// ======================================


function renderNotifications(){


if(!notificationsList)
return;



notificationsList.innerHTML="";



if(notifications.length===0){


notificationsList.innerHTML=

`
<p class="empty-notification">
لا توجد إشعارات
</p>
`;


return;

}



notifications.forEach(item=>{


notificationsList.innerHTML +=

createNotificationCard(item);


});



activateCards();


}






// ======================================
// فتح الخلفية
// ======================================


function openWallpaper(id){


window.location.href =

`wallpaper.html?id=${id}`;


}







// ======================================
// تأثير 3D
// ======================================


function activateCards(){


document
.querySelectorAll(".notification-card")
.forEach(card=>{


card.addEventListener(
"mousemove",
(e)=>{


const rect =
card.getBoundingClientRect();


const x =
e.clientX -
rect.left -
rect.width/2;


const y =
e.clientY -
rect.top -
rect.height/2;



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


card.style.transform="";

});


});


}






// ======================================
// مسح الكل (مؤقت)
// ======================================


if(clearBtn){


clearBtn.onclick = async ()=>{


try{


const response =
await fetch(
"/api/notifications",
{
method:"DELETE"
}
);



const result =
await response.json();



if(result.success){


notifications=[];


renderNotifications();


}


}catch(error){


console.log(
"Clear Error:",
error
);


}



};


}

// تشغيل

loadNotifications();