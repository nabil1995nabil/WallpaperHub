// =====================================
// WallpaperHub wallpaper.js
// =====================================
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

    const colors = Array.isArray(currentWallpaper.colors)
        ? currentWallpaper.colors
        : [];

    colors.forEach((color) => {

        const hex = typeof color === "string"
            ? color.trim()
            : "";

        if(!hex) return;

        const item = document.createElement("div");
        item.className = "color-item";

        const swatch = document.createElement("span");
        swatch.className = "color-swatch";
        swatch.style.backgroundColor = hex;

        const value = document.createElement("span");
        value.className = "color-hex";
        value.textContent = hex.toUpperCase();

        const copyBtn = document.createElement("button");
        copyBtn.className = "color-copy-btn";
        copyBtn.type = "button";
        copyBtn.textContent = "نسخ";

        copyBtn.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(hex);
                copyBtn.textContent = "✓";
                setTimeout(() => {
                    copyBtn.textContent = "نسخ";
                }, 1200);
            } catch(error) {
                console.error("Copy color failed:", error);
            }
        });

        item.appendChild(swatch);
        item.appendChild(value);
        item.appendChild(copyBtn);
        colorPalette.appendChild(item);
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
        ctx.font = "300 24px Arial";
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

const userId = getCurrentUserId() || "guest";

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


        const userId = getCurrentUserId() || "guest";


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
// ===============================
// COMMENTS + MENTION SYSTEM (SUPABASE)
// ===============================

const commentInput = document.getElementById("commentInput");
const sendCommentBtn = document.getElementById("sendCommentBtn");
const mentionBtn = document.getElementById("mentionBtn");
const mentionSuggestions = document.getElementById("mentionSuggestions");
const commentsContainer = document.getElementById("commentsContainer");
const commentsCountBadge = document.getElementById("commentsCountBadge");

// ===============================
// CURRENT USER ID
// ===============================
// لا يوجد اعتماد على Firebase هنا.
// نحاول أخذ UID من بيانات المستخدم الموجودة في المشروع.
function getCurrentUserId(){
    const directKeys = ["userId", "uid", "userUID"];

    for(const key of directKeys){
        const value = String(localStorage.getItem(key) || "").trim();
        if(value) return value;
    }

    try{
        const raw = localStorage.getItem("userData");
        if(raw){
            const data = JSON.parse(raw);
            const value = String(
                data?.uid || data?.userId || data?.user_id || data?.id || ""
            ).trim();
            if(value) return value;
        }
    }catch(error){
        console.warn("USER DATA READ ERROR", error);
    }

    return "";
}

// ===============================
// MENTION TARGET = WALLPAPER OWNER
// ===============================
let savedMentionRange = null;

function getWallpaperMentionTarget(){
    if(!currentWallpaper) return null;

    let userId = String(
        currentWallpaper.ownerUID ||
        currentWallpaper.userId ||
        currentWallpaper.user_id ||
        ""
    ).trim();

    const name = String(
        currentWallpaper.author || ""
    ).trim();

    // بعض الخلفيات القديمة قد لا يكون لها user_id محفوظ.
    // إذا كانت الخلفية منشورة من الحساب الحالي، نستعمل UID الحساب الحالي
    // كحل احتياطي حتى تظهر الإشارة بشكل صحيح.
    if(!userId){
        const currentUserId = getCurrentUserId();
        const currentUserName = String(
            localStorage.getItem("userName") || ""
        ).trim();

        if(
            currentUserId &&
            name &&
            currentUserName &&
            name === currentUserName
        ){
            userId = currentUserId;
        }
    }

    if(!userId) return null;

    return {
        userId,
        name: name || "صاحب الخلفية"
    };
}

async function resolveWallpaperMentionTarget(){
    let target = getWallpaperMentionTarget();
    if(target) return target;

    if(!currentWallpaper?.id) return null;

    try{
        const response = await fetch(API, { cache:"no-store" });
        if(!response.ok) return null;

        const wallpapers = await response.json();
        const fresh = (Array.isArray(wallpapers) ? wallpapers : [])
            .find(w => Number(w.id) === Number(currentWallpaper.id));

        if(fresh){
            currentWallpaper = {
                ...currentWallpaper,
                ...fresh,
                id:Number(fresh.id)
            };
        }
    }catch(error){
        console.warn("MENTION OWNER LOAD ERROR", error);
    }

    return getWallpaperMentionTarget();
}

function escapeHtml(value){
    return String(value ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}

function formatCommentText(value){
    const safe = escapeHtml(value);
    return safe.replace(
        /(^|\s)(@[\w\u0600-\u06FF][\w\u0600-\u06FF._-]*)/g,
        '$1<span class="comment-mention">$2</span>'
    );
}

function getCommentText(){
    if(!commentInput) return "";

    return String(commentInput.innerText || "")
        .replace(/\u00a0/g," ")
        .replace(/\n{3,}/g,"\n\n")
        .trim();
}

function getMentionPayload(){
    if(!commentInput) return null;

    const tag = commentInput.querySelector(".mention-tag[data-user-id]");
    if(!tag) return null;

    return {
        userId:String(tag.dataset.userId || "").trim(),
        name:String(tag.dataset.name || tag.textContent || "")
            .replace(/^@/,'')
            .trim()
    };
}

function saveCurrentMentionCaret(){
    if(!commentInput) return;

    const selection = window.getSelection();
    if(!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    if(commentInput.contains(range.commonAncestorContainer)){
        savedMentionRange = range.cloneRange();
    }
}

function hideMentionSuggestions(){
    if(!mentionSuggestions) return;
    mentionSuggestions.hidden = true;
    mentionSuggestions.innerHTML = "";
}

async function showOwnerMentionSuggestion(){
    if(!mentionSuggestions) return;

    mentionSuggestions.innerHTML = `
        <div class="mention-loading" aria-live="polite">جاري البحث</div>
    `;
    mentionSuggestions.hidden = false;

    const target = await resolveWallpaperMentionTarget();

    if(!target){
        mentionSuggestions.innerHTML = `
            <div class="mention-empty">صاحب الخلفية غير مرتبط بحساب</div>
        `;
        return;
    }

    mentionSuggestions.innerHTML = `
        <button type="button" class="mention-suggestion-item" aria-label="الإشارة إلى ${escapeHtml(target.name)}">
            <span class="mention-suggestion-avatar">@</span>
            <span class="mention-suggestion-info">
                <strong>@${escapeHtml(target.name)}</strong>
                <small>صاحب الخلفية</small>
            </span>
        </button>
    `;

    const item = mentionSuggestions.querySelector(".mention-suggestion-item");
    if(item){
        item.onclick = async(event)=>{
            event.preventDefault();
            event.stopPropagation();
            await insertOwnerMention();
        };
    }
}

async function insertOwnerMention(){
    if(!commentInput) return;

    const target = await resolveWallpaperMentionTarget();
    if(!target) return;

    commentInput.focus();

    const selection = window.getSelection();
    let range = null;

    if(savedMentionRange){
        range = savedMentionRange.cloneRange();
    }else if(selection && selection.rangeCount){
        const current = selection.getRangeAt(0);
        if(commentInput.contains(current.commonAncestorContainer)){
            range = current.cloneRange();
        }
    }

    if(!range){
        range = document.createRange();
        range.selectNodeContents(commentInput);
        range.collapse(false);
    }

    // حذف @ أو بداية Mention المكتوبة قبل اختيار النتيجة.
    if(range.collapsed && range.startContainer.nodeType === Node.TEXT_NODE){
        const node = range.startContainer;
        const before = node.textContent.slice(0, range.startOffset);
        const match = before.match(/(^|\s)@[\w\u0600-\u06FF._-]*$/);

        if(match){
            const removeLength = match[0].length - (match[1] ? 1 : 0);
            range.setStart(node, Math.max(0, range.startOffset - removeLength));
            range.deleteContents();
        }
    }

    const mention = document.createElement("span");
    mention.className = "mention-tag";
    mention.dataset.userId = target.userId;
    mention.dataset.name = target.name;
    mention.contentEditable = "false";
    mention.textContent = `@${target.name}`;

    range.insertNode(mention);

    const space = document.createTextNode(" ");
    mention.after(space);

    range.setStart(space,1);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);
    savedMentionRange = range.cloneRange();

    hideMentionSuggestions();
}

// ===============================
// LOAD COMMENTS
// ===============================
let allComments = [];
let showAllComments = false;

async function loadComments(){
    if(!currentWallpaper || !commentsContainer) return;

    try{
        const res = await fetch(`${API}/${currentWallpaper.id}/comments`);
        const comments = await res.json();

        allComments = comments.slice().reverse();
        commentsContainer.innerHTML = "";

        if(commentsCountBadge){
            commentsCountBadge.textContent = `${comments.length} تعليق`;
        }

        if(allComments.length === 0){
            commentsContainer.innerHTML = `
                <p class="no-comments">لا توجد تعليقات بعد، كن أول من يعلق!</p>
            `;
            return;
        }

        const displayComments = showAllComments
            ? allComments
            : allComments.slice(0,2);

        displayComments.forEach(comment=>{
            const box = document.createElement("div");
            box.className = "comment-card";

            const avatarHtml = comment.avatar
                ? `<img src="${escapeHtml(comment.avatar)}" alt="">`
                : `<span class="material-icons">account_circle</span>`;

            box.innerHTML = `
                <div class="user-avatar">${avatarHtml}</div>

                <div class="comment-content">
                    <div class="comment-header">
                        <div>
                            <div class="comment-author">
                                ${escapeHtml(comment.user || "مستخدم")}
                            </div>
                            <span class="comment-email">
                                ${escapeHtml(comment.email || "غير مسجل")}
                            </span>
                        </div>
                    </div>

                    <div class="comment-text">
                        ${formatCommentText(comment.text || "")}
                    </div>

                    <div class="comment-footer">
                        <div class="comment-date">
                            ⏱ ${escapeHtml(comment.date || "")}
                            ${escapeHtml(comment.time || "")}
                        </div>

                        <button
                            class="comment-like"
                            onclick="likeComment(${Number(comment.id)})">
                            ❤️ ${Number(comment.likes || 0)}
                        </button>
                    </div>
                </div>
            `;

            commentsContainer.appendChild(box);
        });

        if(allComments.length > 2 && !showAllComments){
            const btn = document.createElement("button");
            btn.className = "show-all-comments-btn";
            btn.innerHTML = "⋯";
            btn.onclick = ()=>{
                showAllComments = true;
                loadComments();
            };
            commentsContainer.appendChild(btn);
        }
    }catch(error){
        console.log("LOAD COMMENTS ERROR", error);
    }
}

// ===============================
// SEND COMMENT + REAL MENTION
// ===============================
async function sendComment(){
    if(!currentWallpaper || !commentInput) return;

    const text = getCommentText();
    if(!text) return;

    try{
        const now = new Date();
        const userName = localStorage.getItem("userName") || "مستخدم";
        const userEmail = localStorage.getItem("userEmail") || "user@email.com";
        const userAvatar = localStorage.getItem("userAvatar") || "";
        const userId = getCurrentUserId();
        const mention = getMentionPayload();

        const res = await fetch(
            `${API}/${currentWallpaper.id}/comments`,
            {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({
                    text,
                    user:userName,
                    email:userEmail,
                    avatar:userAvatar,
                    userId,
                    likes:0,
                    likedBy:[],
                    mentionedUserId: mention?.userId || "",
                    mentionedName: mention?.name || "",
                    date:now.toLocaleDateString("ar-MA"),
                    time:now.toLocaleTimeString("ar-MA", {
                        hour:"2-digit",
                        minute:"2-digit"
                    })
                })
            }
        );

        const data = await res.json();

        if(data.success){
            commentInput.innerHTML = "";
            hideMentionSuggestions();
            loadComments();
        }else{
            console.error("SEND COMMENT FAILED:", data);
        }
    }catch(error){
        console.log("SEND COMMENT ERROR", error);
    }
}

if(sendCommentBtn){
    sendCommentBtn.onclick = sendComment;
}

// ===============================
// @ BUTTON + TYPING SUGGESTION
// ===============================
if(mentionBtn && commentInput){
    mentionBtn.addEventListener("mousedown", (event)=>{
        // نحافظ على مكان المؤشر قبل ما يفقد الـ button التركيز.
        event.preventDefault();
        saveCurrentMentionCaret();
    });

    mentionBtn.addEventListener("click", async (event)=>{
        event.preventDefault();
        event.stopPropagation();
        saveCurrentMentionCaret();
        await showOwnerMentionSuggestion();
    });

    commentInput.addEventListener("keyup", ()=>{
        saveCurrentMentionCaret();
    });

    commentInput.addEventListener("input", async ()=>{
        saveCurrentMentionCaret();

        const text = getCommentText();
        if(/(^|\s)@[\w\u0600-\u06FF._-]*$/.test(text)){
            await showOwnerMentionSuggestion();
        }else{
            hideMentionSuggestions();
        }
    });

    commentInput.addEventListener("keydown", (event)=>{
        if(event.key === "Escape"){
            hideMentionSuggestions();
            return;
        }

        if(event.key === "Enter" && !event.shiftKey){
            event.preventDefault();
            sendComment();
        }
    });

    document.addEventListener("click", (event)=>{
        if(
            mentionSuggestions &&
            !mentionSuggestions.contains(event.target) &&
            event.target !== mentionBtn &&
            !commentInput.contains(event.target)
        ){
            hideMentionSuggestions();
        }
    });
}

// ===============================
// LIKE COMMENT
// ===============================
async function likeComment(id){
    try{
        const user = localStorage.getItem("userName") || "مستخدم";
        const userId = getCurrentUserId();

        const res = await fetch(
            `/api/comments/${id}/like`,
            {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({user,userId})
            }
        );

        const data = await res.json();
        if(data.success) loadComments();
    }catch(error){
        console.log("LIKE COMMENT ERROR", error);
    }
}

window.likeComment = likeComment;

// ===============================
// Start
// ===============================


document.addEventListener(

"DOMContentLoaded",

()=>{


loadWallpaper();



});