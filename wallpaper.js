// =====================================
// WallpaperHub wallpaper.js
// =====================================
import { auth } from "./firebase.js";
console.log("WallpaperHub Player Loaded");
// ===============================
// URL Helper
// ===============================
function getImageUrl(url){

    if(!url)
        return "/assets/logo/no-image.png";

    if(
        url.startsWith("http://") ||
        url.startsWith("https://")
    ){
        return url;
    }

    return "/" + url.replace(/^\/+/, "");

}
// ===============================
// Media Detector
// ===============================
function isVideoMedia(wallpaper){
    if(!wallpaper)
        return false;
    if(wallpaper.type === "video")
        return true;
    const url =
    wallpaper.image || "";
    return [
        ".mp4",
        ".webm",
        ".mov",
        ".m3u8"
    ].some(ext =>
        url.toLowerCase().includes(ext)
    );
}
// ===============================
// API
// ===============================
const API = "/api/wallpapers";
// ===============================
// Elements
// ===============================
const wallImage =
document.getElementById("wallImage");
const wallVideo =
document.getElementById("wallVideo");
const wallResolution =
document.getElementById("wallResolution");
const wallSize =
document.getElementById("wallSize");
const wallDownloads =
document.getElementById("wallDownloads");
const wallRating =
document.getElementById("wallRating");
const wallAuthor =
document.getElementById("wallAuthor");
const wallDate =
document.getElementById("wallDate");
const qualityBadge =
document.getElementById("qualityBadge");
const tagsContainer =
document.getElementById("tagsContainer");
const colorPalette =
document.getElementById("colorPalette");
const similarContainer =
document.getElementById("similarWallpapers");
const ratingStars =
document.querySelectorAll(".star");
const ratingCount =
document.getElementById("ratingCount");
const moreOptionsBtn =
document.getElementById("moreOptionsBtn");
const optionsMenu =
document.getElementById("optionsMenu");
const wallDescription =
document.getElementById("wallDescription");
const captureLocation =
document.getElementById("captureLocation");
const captureDate =
document.getElementById("captureDate");
const captureTime =
document.getElementById("captureTime");
const imageSource =
document.getElementById("imageSource");
if(moreOptionsBtn){
moreOptionsBtn.onclick = ()=>{
optionsMenu.classList.toggle("active");
};
}
// ===============================
// Variables
// ===============================
const params =

new URLSearchParams(location.search);



let wallpaperId =

Number(params.get("id"))

||

Number(localStorage.getItem("selectedWallpaper"))

||

1;
let currentWallpaper = null;
let allWallpapers = [];
let categoryWallpapers = [];
let currentWallpaperIndex = -1;
// ===============================
// User Actions
// ===============================
function saveUserAction(key,id){
let list =
JSON.parse(
localStorage.getItem(key)
||
"[]"
);
id = String(id);
if(!list.map(String).includes(id)){
list.push(id);
localStorage.setItem(

key,

JSON.stringify(list)

);


}


}
// ===============================
// Load Wallpaper
// ===============================

async function loadWallpaper() {
    try {
        const response = await fetch(API);
        if (!response.ok) throw new Error("API ERROR");

        allWallpapers = await response.json();
        allWallpapers = allWallpapers.map(w => ({
            ...w,
            id: Number(w.id)
        }));

        currentWallpaper = allWallpapers.find(w => w.id === wallpaperId);

        if (!currentWallpaper) {
            console.error("Wallpaper Not Found");
            return;
        }

        categoryWallpapers = allWallpapers.filter(w => w.category === currentWallpaper.category);
        currentWallpaperIndex = categoryWallpapers.findIndex(w => w.id === currentWallpaper.id);

showWallpaper();
autoAnalyzeWallpaper();
loadSimilar();
checkLikeStatus();
loadComments();
        saveUserAction("views", currentWallpaper.id);
        // ✅ حفظ المشاهدة في الإحصائيات
        window.syncUserStats("views", currentWallpaper.id);

        sendView(currentWallpaper.id);

    } catch (error) {
        console.error("LOAD WALLPAPER ERROR", error);
    }
}
// ===============================
// View Counter
// ===============================


async function sendView(id){


try{


await fetch(

`${API}/${id}/view`,

{

method:"POST"

}

);



}catch(error){


console.error(

"VIEW ERROR",

error

);


}


}







// ===============================
// Video Auto Play
// ===============================

function setupVideo(src){


    if(!wallVideo)
        return;



    wallVideo.src =
    getImageUrl(src);



    wallVideo.style.display =
    "block";


    wallVideo.style.pointerEvents =
    "none";



    if(wallImage)

        wallImage.style.display =
        "none";




    wallVideo.muted = true;

    wallVideo.loop = true;

    wallVideo.playsInline = true;



    wallVideo.setAttribute(
        "playsinline",
        ""
    );



    wallVideo.load();



    wallVideo.play()

    .catch(error=>{


        console.log(
        "Video autoplay blocked",
        error
        );


    });


}

// ===============================
// Stop Video
// ===============================


function stopVideo(){


if(!wallVideo)

return;



wallVideo.pause();



wallVideo.removeAttribute(
"src"
);



wallVideo.load();



wallVideo.style.display =

"none";


}

// ===============================
// Show Wallpaper
// ===============================


function showWallpaper(){


if(!currentWallpaper)

return;



const media =

currentWallpaper.image || "";





if(isVideoMedia(currentWallpaper)){


setupVideo(media);



}else{


stopVideo();



if(wallImage){


wallImage.src =

getImageUrl(media);



wallImage.style.display =

"block";


}



}

if(wallDescription)

wallDescription.textContent =

currentWallpaper.description || "";

const wallTitle2 =
document.getElementById("wallTitle2");

if(wallTitle2){

wallTitle2.textContent =
currentWallpaper.title || "بدون اسم";


wallTitle2.classList.remove("scroll-title");


if(
    wallTitle2.scrollWidth >
    wallTitle2.clientWidth
){

    wallTitle2.classList.add("scroll-title");

}

}

// ===============================
// Image Origin Detection
// ===============================
if(imageSource){


let source =
currentWallpaper.source ||
"unknown";

if(source === "ai"){


imageSource.textContent =
"🤖 مولدة بالذكاء الاصطناعي";


}

else if(source === "camera"){


imageSource.textContent =
"📷 تصوير بشري";


}

else{


imageSource.textContent =
"غير معروف";


}


}

// ===============================
// Information
// ===============================

if(wallResolution)

wallResolution.textContent =

currentWallpaper.resolution || "";



if(wallSize)

wallSize.textContent =

currentWallpaper.size || "";



if(wallDownloads)

wallDownloads.textContent =

currentWallpaper.downloads || 0;



if(wallAuthor)

wallAuthor.textContent =

currentWallpaper.author || "";



if(wallDate)

wallDate.textContent =

currentWallpaper.date || "";

// ===============================
// Photo Metadata
// ===============================

if(captureLocation){

captureLocation.textContent =

currentWallpaper.location ||

"غير معروف";

}

if(captureDate){

captureDate.textContent =

currentWallpaper.captureDate ||

"غير معروف";

}

if(captureTime){

captureTime.textContent =

currentWallpaper.captureTime ||

"غير معروف";

}

if(wallRating)

wallRating.textContent =

currentWallpaper.rating || 0;



if(ratingCount)

ratingCount.textContent =

`(${currentWallpaper.ratingCount || 0} تقييم)`;



updateStars(

currentWallpaper.rating || 0

);








// ===============================
// Quality Badge
// ===============================


if(qualityBadge){


let quality = "HD";



const nums =

(

currentWallpaper.resolution || ""

)

.match(/\d+/g);





if(nums && nums.length >= 2){


const max =

Math.max(

Number(nums[0]),

Number(nums[1])

);




if(max >= 3840)

quality = "4K";


else if(max >= 2560)

quality = "2K";


else if(max >= 1920)

quality = "FULL HD";


}



qualityBadge.textContent =

quality;


}







// ===============================
// Tags
// ===============================


if(tagsContainer){


tagsContainer.innerHTML = "";



(currentWallpaper.tags || [])

.forEach(tag=>{


const span =

document.createElement("span");



span.className = "tag";



span.textContent = "#" + tag;



tagsContainer.appendChild(span);



});


}







// ===============================
// Colors
// ===============================


if(colorPalette){


colorPalette.innerHTML = "";



(currentWallpaper.colors || [])

.forEach(color=>{


const div =

document.createElement("div");



div.style.cssText = `

width:30px;
height:30px;
border-radius:50%;
background:${color};
display:inline-block;
margin:5px;

`;



colorPalette.appendChild(div);



});


}


}

// ===============================
// Change Wallpaper
// ===============================

function changeWallpaper(index) {

    if (!categoryWallpapers.length) return;


    if (index >= categoryWallpapers.length)
        index = 0;


    if (index < 0)
        index = categoryWallpapers.length - 1;



    currentWallpaperIndex = index;

    currentWallpaper = categoryWallpapers[index];

    wallpaperId = currentWallpaper.id;



    localStorage.setItem(
        "selectedWallpaper",
        currentWallpaper.id
    );


    history.replaceState(
        {},
        "",
        "wallpaper.html?id=" + currentWallpaper.id
    );


showWallpaper();

loadSimilar();

checkLikeStatus();

    // تحديث تعليقات الخلفية الجديدة
    if(typeof showAllComments !== "undefined"){

        showAllComments = false;

    }


    if(typeof loadComments === "function"){

        loadComments();

    }




    saveUserAction(
        "views",
        currentWallpaper.id
    );


    // ✅ حفظ المشاهدة في الإحصائيات
    window.syncUserStats(
        "views",
        currentWallpaper.id
    );


    sendView(
        currentWallpaper.id
    );

}

// ===============================
// Swipe
// ===============================


let touchStartX = 0;



if(wallImage){


wallImage.addEventListener(

"touchstart",

(e)=>{


touchStartX =

e.touches[0].clientX;


},

{passive:true}

);





wallImage.addEventListener(

"touchend",

(e)=>{


const diff =

e.changedTouches[0].clientX -

touchStartX;




if(Math.abs(diff)<60)

return;




if(diff < 0){


changeWallpaper(

currentWallpaperIndex + 1

);



}else{


changeWallpaper(

currentWallpaperIndex - 1

);



}



},

{passive:true}

);



}







// ===============================
// Similar Wallpapers
// Video Support Version
// ===============================


function loadSimilar(){


if(!similarContainer || !currentWallpaper)

return;



similarContainer.innerHTML = "";




allWallpapers

.filter(w =>

w.category === currentWallpaper.category

&&

w.id !== currentWallpaper.id

)

.slice(0,4)

.forEach(item=>{



const card =

document.createElement("div");



card.className =
"similar-card";





let media = "";





// ===============================
// تحديد نوع الوسائط
// ===============================


if(isVideoMedia(item)){



media = `


<video

src="${getImageUrl(item.image)}"

muted

loop

autoplay

playsinline

loading="lazy"

>

</video>


`;



}else{



media = `


<img

src="${getImageUrl(

item.thumbnail || item.image

)}"

loading="lazy"

alt="${item.title || "Wallpaper"}"

>


`;



}







card.innerHTML = `



${media}




<p>

${item.title || "بدون اسم"}

</p>



`;






card.onclick = ()=>{


location.href =

"wallpaper.html?id="

+

encodeURIComponent(
item.id
);



};





similarContainer.appendChild(card);



});



}

// ===============================
// Fullscreen
// ===============================


const fullscreenBtn =

document.getElementById("fullscreenBtn");



const fullscreenViewer =

document.getElementById("fullscreenViewer");



const fullscreenImage =

document.getElementById("fullscreenImage");



const fullscreenVideo =

document.getElementById("fullscreenVideo");



const closeFullscreenBtn =

document.getElementById("closeFullscreenBtn");







if(

fullscreenBtn &&

fullscreenViewer &&

fullscreenImage &&

fullscreenVideo

){



fullscreenBtn.onclick = ()=>{


if(!currentWallpaper)

return;




fullscreenViewer.classList.add(

"active"

);





document.body.classList.add(

"viewer-open"

);

if(isVideoMedia(currentWallpaper)){

fullscreenImage.style.display =

"none";

fullscreenVideo.style.display =

"block";

fullscreenVideo.src =

getImageUrl(

currentWallpaper.image

);

fullscreenVideo.play()

.catch(()=>{});



}else{



fullscreenVideo.style.display =

"none";



fullscreenVideo.pause();

fullscreenImage.style.display =

"block";

fullscreenImage.src =

getImageUrl(

currentWallpaper.image

);

}

};

}

if(closeFullscreenBtn){



closeFullscreenBtn.onclick = ()=>{


fullscreenViewer.classList.remove(

"active"

);

document.body.classList.remove(

"viewer-open"

);

if(fullscreenVideo)

fullscreenVideo.pause();

};

}

// ===============================
// Download Wallpaper + Watermark
// ===============================

const downloadBtn = document.getElementById("downloadBtn");

// تحديد لون الشعار حسب الخلفية
function getWatermarkColor(ctx, canvas) {
    const x = 50;
    const y = canvas.height - 50;

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const brightness = (pixel[0] * 299 + pixel[1] * 587 + pixel[2] * 114) / 1000;

    if (brightness > 150) {
        return "rgba(0,0,0,0.18)";
    } else {
        return "rgba(255,255,255,0.18)";
    }
}

async function downloadWithWatermark(imageUrl, title) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const maxWidth = 1440;

        let scale = 1;
        if (img.width > maxWidth) {
            scale = maxWidth / img.width;
        }

        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        // رسم الخلفية
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // =========================
        // WallpaperHub Watermark
        // =========================
        ctx.font = "300 30px Arial";
        ctx.fillStyle = getWatermarkColor(ctx, canvas);
        ctx.shadowColor = "rgba(0,0,0,0.30)";
        ctx.shadowBlur = 3;
        ctx.fillText("WallpaperHub", 35, canvas.height - 35);

        // =========================
        // تحميل الصورة
        // =========================
        const link = document.createElement("a");
        link.download = (title || "wallpaper") + ".jpg";
        link.href = canvas.toDataURL("image/jpeg", 0.95);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };
}

if (downloadBtn) {
    downloadBtn.onclick = async (e) => {
        e.preventDefault();

        if (!currentWallpaper) return;

        const url = getImageUrl(currentWallpaper.image);

        // تحميل مع الشعار
        downloadWithWatermark(url, currentWallpaper.title);

        // ✅ حفظ التحميل في الإحصائيات
        window.syncUserStats("downloads", currentWallpaper.id);

        // حفظ التحميل
        saveUserAction("downloads", currentWallpaper.id);

        try {
            await fetch(`${API}/${currentWallpaper.id}/download`, {
                method: "POST"
            });
        } catch (error) {
            console.error("DOWNLOAD ERROR", error);
        }
    };
}

// ===============================
// Like System (Wallpaper)
// ===============================

const favoriteBtn = document.getElementById("favoriteBtn");


// فحص هل المستخدم ضغط إعجاب سابقاً
async function checkLikeStatus(){

    try{

        if(!currentWallpaper || !favoriteBtn)
            return;


        const wallpaperCheckId = currentWallpaper.id;

const userId = auth.currentUser?.uid || "guest";

const res = await fetch(
    `/api/wallpapers/${wallpaperCheckId}/like-status?userId=${userId}`
);


        const data = await res.json();

if(
    !currentWallpaper ||
    currentWallpaper.id !== wallpaperCheckId
){
    return;
}

        if(data.liked){

            favoriteBtn.innerHTML = `
            <span class="material-icons">
            favorite
            </span>
            `;

            favoriteBtn.classList.add("liked");

        }else{

            favoriteBtn.innerHTML = `
            <span class="material-icons">
            favorite_border
            </span>
            `;

            favoriteBtn.classList.remove("liked");

        }


    }catch(error){

        console.error(
            "LIKE STATUS ERROR",
            error
        );

    }

}

// ===============================
// Like Wallpaper
// ===============================

async function likeWallpaper(){

    try{

        if(!currentWallpaper || !favoriteBtn)
            return;


        const userId = auth.currentUser?.uid || "guest";


        const response = await fetch(
            `/api/wallpapers/${currentWallpaper.id}/like`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

    userId: userId,

    userName:
        localStorage.getItem("userName")
        || "مستخدم"

})
            }
        );


        const data = await response.json();


        console.log("LIKE RESPONSE:", data);


        if(data.success){

            // إظهار القلب مباشرة
            favoriteBtn.innerHTML = `
                <span class="material-icons">
                    favorite
                </span>
            `;

            favoriteBtn.classList.add("liked");

        }else{

            console.error(
                "LIKE FAILED:",
                data
            );

        }


    }catch(error){

        console.error(
            "LIKE ERROR:",
            error
        );

    }

}

if(favoriteBtn){

    favoriteBtn.addEventListener(
        "click",
        likeWallpaper
    );

}

// ===============================
// Share
// ===============================


const shareBtn =

document.getElementById("shareBtn");





if(shareBtn){



shareBtn.onclick = async()=>{


if(!currentWallpaper)

return;




if(navigator.share){



await navigator.share({

title:

currentWallpaper.title,

url:

location.href

});



}else{



navigator.clipboard.writeText(

location.href

);



alert(

"تم نسخ الرابط"

);



}



};


}








// ===============================
// Rating
// ===============================


function updateStars(value){



ratingStars.forEach(

(star,index)=>{


star.classList.toggle(

"active",

index < Math.round(value)

);



});


}







ratingStars.forEach(star=>{



star.onclick = async()=>{



if(!currentWallpaper)

return;




const value =

Number(

star.dataset.rate

);





try{



const res =

await fetch(

`${API}/${currentWallpaper.id}/rate`,

{

method:"POST",

headers:{

"Content-Type":

"application/json"

},

body:JSON.stringify({

rating:value

})

}

);





const data =

await res.json();





if(data.success){



wallRating.textContent =

data.rating;



ratingCount.textContent =

`(${data.ratingCount} تقييم)`;





updateStars(

data.rating

);



}



}catch(error){



console.error(

"RATE ERROR",

error

);



}



};


});

// ===============================
// Swipe Close Fullscreen
// ===============================

let fullscreenStartY = 0;


if(fullscreenViewer){


fullscreenViewer.addEventListener(
"touchstart",
(e)=>{

fullscreenStartY =
e.touches[0].clientY;

},
{passive:true}
);



fullscreenViewer.addEventListener(
"touchend",
(e)=>{


let diff =
e.changedTouches[0].clientY -
fullscreenStartY;



if(diff > 120){


fullscreenViewer.classList.add("closing");


setTimeout(()=>{


fullscreenViewer.classList.remove("active");

fullscreenViewer.classList.remove("closing");


document.body.classList.remove(
"viewer-open"
);



if(fullscreenVideo)

fullscreenVideo.pause();



},500);


}



},
{passive:true}

);


}

// ===============================
// Set Wallpaper
// ===============================

const setWallpaperBtn =
document.getElementById("setWallpaperBtn");


if(setWallpaperBtn){

setWallpaperBtn.onclick = ()=>{


if(!currentWallpaper)
return;


const image =
getImageUrl(
currentWallpaper.image
);


// Android App Bridge

if(window.Android && Android.setWallpaper){


Android.setWallpaper(image);


}else{


alert(
"هذه الميزة تعمل بعد تثبيت WallpaperHub كتطبيق Android"
);


}



};


}

//=====
//تحليل صورة بي دكاء الاصطناعي 
//=}===

async function autoAnalyzeWallpaper(){


if(!currentWallpaper)

return;


// إذا موجود لا نعيد التحليل

if(currentWallpaper.aiDescription){


if(wallDescription)

wallDescription.textContent =
currentWallpaper.aiDescription;


return;

}



try{


const res =
await fetch(

`${API}/${currentWallpaper.id}/analyze`,

{

method:"POST"

}

);



const data =
await res.json();



if(data.success){


currentWallpaper.aiDescription =
data.description;



if(wallDescription)

wallDescription.textContent =
data.description;


}



}catch(error){

console.log(
"AI ANALYSIS ERROR",
error
);


}


}

const backBtn =
document.getElementById("backBtn");


if(backBtn){

backBtn.onclick = ()=>{

history.back();

};

}

// ===============================
// COMMENTS SYSTEM NEW
// ===============================
const commentInput =
document.getElementById("commentInput");
const mentionBtn =
document.getElementById("mentionBtn");
const mentionPopup =
document.getElementById("mentionPopup");
const closeMentionBtn =
document.getElementById("closeMentionBtn");
const mentionOwnerBtn =
document.getElementById("mentionOwnerBtn");
const mentionOwnerName =
document.getElementById("mentionOwnerName");
const mentionOwnerAvatar =
document.getElementById("mentionOwnerAvatar");
const sendCommentBtn =
document.getElementById("sendCommentBtn");
const commentsContainer =
document.getElementById("commentsContainer");
const commentsCountBadge =
document.getElementById("commentsCountBadge");
// ===============================
// MENTION SYSTEM
// ===============================

function openMentionPopup(){

    if(!mentionPopup || !mentionBtn)
        return;

    // اسم صاحب الخلفية
    const ownerName =
        currentWallpaper?.author ||
        "صاحب الخلفية";

    if(mentionOwnerName){
        mentionOwnerName.textContent =
            ownerName;
    }

    // صورة صاحب الخلفية
    if(mentionOwnerAvatar){

        const ownerAvatar =
            currentWallpaper?.avatar ||
            currentWallpaper?.authorAvatar ||
            "";

        mentionOwnerAvatar.src =
            ownerAvatar || "/assets/logo/no-image.png";
    }

    // تحديد مكان النافذة بجانب زر @
    const rect =
        mentionBtn.getBoundingClientRect();

    mentionPopup.style.left =
        Math.max(
            15,
            Math.min(
                rect.left,
                window.innerWidth - 275
            )
        ) + "px";

    mentionPopup.style.top =
        Math.max(
            15,
            rect.top - 150
        ) + "px";

    mentionPopup.classList.add("active");
}


// فتح النافذة
if(mentionBtn){

    mentionBtn.addEventListener(
        "click",
        (e)=>{

            e.stopPropagation();

            if(
                mentionPopup.classList.contains(
                    "active"
                )
            ){

                mentionPopup.classList.remove(
                    "active"
                );

            }else{

                openMentionPopup();

            }

        }
    );
}


// إغلاق النافذة
if(closeMentionBtn){

    closeMentionBtn.addEventListener(
        "click",
        ()=>{

            mentionPopup.classList.remove(
                "active"
            );

        }
    );

}


// اختيار صاحب الخلفية
if(mentionOwnerBtn){

    mentionOwnerBtn.addEventListener(
        "click",
        ()=>{

            if(!currentWallpaper || !commentInput)
                return;

            const ownerName =
    currentWallpaper.author ||
    "صاحب الخلفية";

const ownerUID =
    currentWallpaper.ownerUID ||
    currentWallpaper.userId ||
    "";

mentionedUserId = ownerUID;

const mention =
    "@" + ownerName + " ";
    
            const start =
                commentInput.selectionStart;

            const end =
                commentInput.selectionEnd;

            const text =
                commentInput.value;

            commentInput.value =
                text.substring(0,start) +
                mention +
                text.substring(end);

            // وضع المؤشر بعد الإشارة
            const newPosition =
                start + mention.length;

            commentInput.focus();

            commentInput.setSelectionRange(
                newPosition,
                newPosition
            );

            // إغلاق النافذة
            mentionPopup.classList.remove(
                "active"
            );

        }
    );

}


// إغلاق عند الضغط خارج النافذة
document.addEventListener(
    "click",
    (e)=>{

        if(
            mentionPopup &&
            mentionPopup.classList.contains("active") &&
            !mentionPopup.contains(e.target) &&
            e.target !== mentionBtn
        ){

            mentionPopup.classList.remove(
                "active"
            );

        }

    }
);
// ===============================
// LOAD COMMENTS
// ===============================

let allComments = [];
let showAllComments = false;
let mentionedUserId = "";

async function loadComments(){


    if(!currentWallpaper || !commentsContainer)
        return;


    try{


        const res =
        await fetch(
        `${API}/${currentWallpaper.id}/comments`
        );


        const comments =
        await res.json();


        allComments =
        comments.slice().reverse();



        commentsContainer.innerHTML = "";



        if(commentsCountBadge){

            commentsCountBadge.textContent =
            `${comments.length} تعليق`;

        }





        if(allComments.length === 0){


            commentsContainer.innerHTML =

            `
            <p class="no-comments">
            لا توجد تعليقات بعد، كن أول من يعلق!
            </p>
            `;


            return;

        }





        const displayComments =
        showAllComments

        ?

        allComments

        :

        allComments.slice(0,2);






        displayComments.forEach(comment=>{


            const box =
            document.createElement("div");


            box.className =
            "comment-card";



            box.innerHTML =

            `

            <div class="user-avatar">

            ${
                comment.avatar

                ?

                `
                <img src="${comment.avatar}">
                `

                :

                `
                <span class="material-icons">
                account_circle
                </span>
                `

            }

            </div>




            <div class="comment-content">


                <div class="comment-header">


                    <div>

                        <div class="comment-author">

                        ${comment.user || "مستخدم"}

                        </div>



                        <span class="comment-email">

                        ${comment.email || "غير مسجل"}

                        </span>


                    </div>


                </div>




                <div class="comment-text">

                ${comment.text}

                </div>




                <div class="comment-footer">


                    <div class="comment-date">

                    ⏱ ${comment.date || ""}

                    ${comment.time || ""}

                    </div>



                    <button
                    class="comment-like"
                    onclick="likeComment(${comment.id})">

                    ❤️ ${comment.likes || 0}

                    </button>


                </div>


            </div>


            `;



            commentsContainer.appendChild(box);


        });







        // زر عرض الكل

        if(allComments.length > 2 && !showAllComments){


const btn =
document.createElement("button");


btn.className =
"show-all-comments-btn";


btn.innerHTML =
"⋯";



            btn.onclick = ()=>{


                showAllComments = true;


                loadComments();


            };



            commentsContainer.appendChild(btn);


        }






    }catch(error){


        console.log(
        "LOAD COMMENTS ERROR",
        error
        );


    }


}

// ===============================
// SEND COMMENT
// ===============================


async function sendComment(){


    if(!currentWallpaper || !commentInput)
        return;



    const text =
    commentInput.value.trim();



    if(!text)
        return;




    try{


        const now =
        new Date();



        const userName =
        localStorage.getItem("userName")
        ||
        "مستخدم";



        const userEmail =
        localStorage.getItem("userEmail")
        ||
        "user@email.com";



        const userAvatar =
        localStorage.getItem("userAvatar")
        ||
        "";





        const res =
        await fetch(

        `${API}/${currentWallpaper.id}/comments`,

        {

        method:"POST",

        headers:{

            "Content-Type":
            "application/json"

        },


        body:JSON.stringify({

    text:text,

    user:userName,

    email:userEmail,

    avatar:userAvatar,

    userId:
        auth.currentUser?.uid || "",
mentionedUserId:
    mentionedUserId,
    likes:0,

    likedBy:[],


            date:
            now.toLocaleDateString("ar-MA"),



            time:
            now.toLocaleTimeString(
            "ar-MA",
            {
                hour:"2-digit",
                minute:"2-digit"
            })


        })

        });



        const data =
        await res.json();




        if(data.success){


            commentInput.value = "";
mentionedUserId = "";

            loadComments();


        }




    }catch(error){


        console.log(
        "SEND COMMENT ERROR",
        error
        );


    }


}





if(sendCommentBtn){


    sendCommentBtn.onclick =
    sendComment;

}




async function likeComment(id){

try{

const user =
localStorage.getItem("userName")
||
"مستخدم";

const userId =
auth.currentUser?.uid || "";


const res =
await fetch(
`/api/comments/${id}/like`,
{
method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
    user:user,
    userId:userId
})

});


const data =
await res.json();


if(data.success){

loadComments();

}


}catch(error){

console.log(
"LIKE COMMENT ERROR",
error
);

}

}


// مهم جدا
window.likeComment = likeComment;

// ===============================
// Start
// ===============================


document.addEventListener(

"DOMContentLoaded",

()=>{


loadWallpaper();



});