document.addEventListener("DOMContentLoaded", () => {



/*
    Load Admin Announcements
*/


async function loadAnnouncements(){


try{


const response =
await fetch("/api/announcements");



const announcements =
await response.json();



const feed =
document.querySelector(".notif-feed");



if(!feed) return;



announcements.forEach(ad=>{


const card =
document.createElement("article");



card.className =
"notif-card admin-post unread";



card.dataset.category =
"admin";



card.innerHTML = `


<div class="card-side-indicator"></div>



<div class="admin-header">


<div class="avatar-container">


<div 
class="avatar gold-border"
style="
display:flex;
align-items:center;
justify-content:center;
font-size:25px;
background:#fff;
"
>
📢
</div>


<span class="type-badge admin">
📢
</span>


</div>



<div class="admin-info">


<div class="admin-name">

WallpaperHub

<span class="verified-badge">
✓
</span>


</div>


<span class="time">

${ad.date || "الآن"}

</span>


</div>


</div>





<div class="broadcast-content">


<h3 class="post-title">

${ad.title}

</h3>



<p class="post-text">

${ad.content}

</p>





${
ad.image ?

`

<div class="post-media-container">

<img 
src="${ad.image}"
class="post-image"
>

</div>

`

:

""

}



</div>


`;



feed.prepend(card);



});



}catch(error){


console.log(
"ANNOUNCEMENTS ERROR:",
error
);


}


}









/*
    Notification Filters
*/


const tabs =
document.querySelectorAll(".tab-btn");


tabs.forEach(tab => {


tab.addEventListener("click",()=>{


tabs.forEach(t =>
t.classList.remove("active")
);



tab.classList.add("active");



const filter =
tab.getAttribute("data-filter");



const cards =
document.querySelectorAll(
".notif-card"
);



cards.forEach(card=>{


const category =
card.getAttribute(
"data-category"
);



if(
filter==="all" ||
category===filter
){


card.classList.remove(
"hidden"
);


}else{


card.classList.add(
"hidden"
);


}



});


});


});










/*
    Quick Reply
*/


const replyButtons =
document.querySelectorAll(
".reply-toggle-btn"
);



replyButtons.forEach(btn=>{


btn.addEventListener(
"click",
e=>{


const card =
e.target.closest(
".notif-card"
);



const replyBox =
card.querySelector(
".quick-reply-box"
);



if(replyBox){

replyBox.classList.toggle(
"active"
);

}


});


});









/*
    Like Button
*/


const likeButtons =
document.querySelectorAll(
".like-btn"
);



likeButtons.forEach(btn=>{


btn.addEventListener(
"click",
()=>{


const card =
btn.closest(
".notif-card"
);



const counter =
card.querySelector(
".count-num"
);



if(!counter) return;



let likes =
parseInt(
counter.textContent
);



if(
btn.classList.contains(
"liked"
)
){


btn.classList.remove(
"liked"
);



btn.textContent =
"❤️ إعجاب";



counter.textContent =
likes - 1;



}else{


btn.classList.add(
"liked"
);



btn.textContent =
"💖 تم الإعجاب";



counter.textContent =
likes + 1;



}



});


});










/*
    Mark All As Read
*/


const markBtn =
document.getElementById(
"mark-all-btn"
);



const unreadCount =
document.getElementById(
"unread-count"
);



if(markBtn){


markBtn.addEventListener(
"click",
()=>{


const unreadCards =
document.querySelectorAll(
".notif-card.unread"
);



unreadCards.forEach(card=>{


card.classList.remove(
"unread"
);



const indicator =
card.querySelector(
".card-side-indicator"
);



if(indicator){

indicator.style.opacity="0";

}


});




if(unreadCount){


unreadCount.textContent="0";


unreadCount.style.opacity="0.5";


}



});


}

// تشغيل جلب الإعلانات

loadAnnouncements();



});