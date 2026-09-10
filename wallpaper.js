// =====================================
// WallpaperHub wallpaper.js
// =====================================
import { supabase } from "./supabase.js";

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

const wallLikes = document.getElementById("wallLikes");
const wallViews = document.getElementById("wallViews");
const wallQuickRating = document.getElementById("wallQuickRating");
const wallQuickDate = document.getElementById("wallQuickDate");
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
// Normalize + Load Full Wallpaper Details
// ===============================
// التفاصيل تعتمد على سجل Supabase الكامل، وليس فقط mapper في server.js.
function normalizeWallpaperData(base = {}, row = {}) {
    const merged = { ...base, ...row };

    const first = (...values) => {
        for (const value of values) {
            if (value !== undefined && value !== null && String(value).trim() !== "") {
                return value;
            }
        }
        return undefined;
    };

    const numeric = (value, fallback = 0) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    };

    merged.id = numeric(first(row.id, base.id), 0);
    merged.title = first(row.title, base.title) ?? "";
    merged.description = first(
        row.description, row.wallpaper_description, row.desc, base.description
    ) ?? "";

    merged.image = first(row.image, row.image_url, base.image) ?? "";
    merged.thumbnail = first(
        row.thumbnail, row.thumbnail_url, base.thumbnail, merged.image
    ) ?? "";

    merged.category = String(
        first(row.category, base.category) ?? "other"
    ).trim().toLowerCase();

    merged.type = first(row.type, base.type) ?? "image";
    merged.animated = Boolean(
        row.animated ?? base.animated ??
        ["video", "gif"].includes(String(merged.type).toLowerCase())
    );

    merged.resolution = first(
        row.resolution, row.dimensions, row.size_dimensions, base.resolution
    ) ?? "";

    merged.size = first(
        row.size, row.file_size, row.fileSize, base.size
    ) ?? "";

    merged.downloads = numeric(
        first(row.downloads, row.download_count, base.downloads), 0
    );
    merged.views = numeric(
        first(row.views, row.view_count, base.views), 0
    );
    merged.likes = numeric(
        first(row.likes, row.like_count, row.favorites, base.likes), 0
    );
    merged.rating = numeric(first(row.rating, base.rating), 0);
    merged.ratingCount = numeric(
        first(row.rating_count, row.ratingCount, base.ratingCount), 0
    );
    merged.ratingSum = numeric(
        first(row.rating_sum, row.ratingSum, base.ratingSum), 0
    );

    merged.author = first(
        row.author, row.author_name, row.username, base.author
    ) ?? "WallpaperHub";

    merged.date = first(
        row.date, row.created_at, row.createdAt, base.date
    ) ?? "";

    merged.colors = Array.isArray(row.colors)
        ? row.colors
        : (Array.isArray(base.colors) ? base.colors : []);

    merged.tags = Array.isArray(row.tags)
        ? row.tags
        : (Array.isArray(base.tags) ? base.tags : []);

    merged.location = first(
        row.location, row.capture_location, row.captureLocation, base.location
    ) ?? "";

    merged.captureDate = first(
        row.capture_date, row.captureDate, row.taken_date, base.captureDate
    ) ?? "";

    merged.captureTime = first(
        row.capture_time, row.captureTime, row.taken_time, base.captureTime
    ) ?? "";

    merged.camera = first(
        row.camera, row.camera_model, row.cameraModel, base.camera
    ) ?? "";

    merged.source = first(
        row.source, row.image_source, row.imageSource, base.source
    ) ?? "";

    // user_id هو المصدر الأساسي لمالك الخلفية.
    merged.ownerUID = String(first(
        row.user_id, row.owner_uid, row.ownerUID, row.userId,
        base.ownerUID, base.userId, base.user_id
    ) ?? "").trim();

    merged.userId = merged.ownerUID;

    merged.authorAvatar = first(
        row.author_avatar, row.authorAvatar, row.avatar_url, row.avatar,
        base.authorAvatar, base.avatar
    ) ?? "";

    merged.authorName = first(
        row.author_name, row.authorName, row.full_name, row.username,
        base.authorName, base.author
    ) ?? "WallpaperHub";

    merged.aiDescription = first(
        row.ai_description, row.aiDescription, base.aiDescription
    ) ?? "";

    return merged;
}

async function loadWallpaperDetails(id, fallbackWallpaper) {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
        return normalizeWallpaperData(fallbackWallpaper);
    }

    // المصدر الأول: السجل الكامل من Supabase.
    try {
        const { data, error } = await supabase
            .from("wallpapers")
            .select("*")
            .eq("id", numericId)
            .maybeSingle();

        if (!error && data) {
            return normalizeWallpaperData(fallbackWallpaper, data);
        }

        if (error) {
            console.warn("DIRECT WALLPAPER SUPABASE LOAD:", error.message);
        }
    } catch (error) {
        console.warn("DIRECT WALLPAPER SUPABASE ERROR:", error);
    }

    // المصدر الثاني: endpoint التفاصيل إن كان موجودًا.
    try {
        const res = await fetch(
            `${API}/${encodeURIComponent(numericId)}`,
            { cache: "no-store" }
        );

        if (res.ok) {
            const payload = await res.json();
            const data = payload?.wallpaper || payload?.data || payload;

            if (data && typeof data === "object" && !Array.isArray(data)) {
                return normalizeWallpaperData(fallbackWallpaper, data);
            }
        }
    } catch (error) {
        console.warn("WALLPAPER DETAIL API FALLBACK:", error);
    }

    // المصدر الأخير: بيانات القائمة.
    return normalizeWallpaperData(fallbackWallpaper);
}

// ===============================
// Load Wallpaper
// ===============================

async function loadWallpaper() {
    try {
        const response = await fetch(API, { cache: "no-store" });
        if (!response.ok) throw new Error("API ERROR");

        const list = await response.json();

        allWallpapers = Array.isArray(list)
            ? list.map(w => normalizeWallpaperData({}, w))
            : [];

        const listWallpaper = allWallpapers.find(
            w => Number(w.id) === Number(wallpaperId)
        );

        if (!listWallpaper) {
            console.error("Wallpaper Not Found:", wallpaperId);
            return;
        }

        // لا نرسم المعلومات قبل جلب السجل الكامل.
        currentWallpaper = await loadWallpaperDetails(
            wallpaperId,
            listWallpaper
        );

        // دمج التفاصيل في القائمة حتى تبقى أزرار التنقل متزامنة.
        allWallpapers = allWallpapers.map(w =>
            Number(w.id) === Number(currentWallpaper.id)
                ? normalizeWallpaperData(w, currentWallpaper)
                : w
        );

        categoryWallpapers = allWallpapers.filter(
            w => w.category === currentWallpaper.category
        );

        currentWallpaperIndex = categoryWallpapers.findIndex(
            w => Number(w.id) === Number(currentWallpaper.id)
        );

        showWallpaper();
        autoAnalyzeWallpaper();
        loadSimilar();
        checkLikeStatus();
        loadComments();

        saveUserAction("views", currentWallpaper.id);

        if (typeof window.syncUserStats === "function") {
            window.syncUserStats("views", currentWallpaper.id);
        }

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
// Quick Stats Formatter
// ===============================
function formatQuickStat(value){
    const n = Number(value);
    if(!Number.isFinite(n)) return String(value ?? 0);
    if(n >= 1000000) return (n/1000000).toFixed(n >= 10000000 ? 0 : 1).replace(/\.0$/,"") + "M";
    if(n >= 1000) return (n/1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/,"") + "K";
    return String(n);
}

// ===============================
// Real Publisher Profile (UID -> profiles)
// ===============================
async function loadPublisherProfile(uid = "", wallpaperId = null) {
    let publisherUID = String(uid || "").trim();
    const targetWallpaperId = wallpaperId ?? currentWallpaper?.id ?? null;

    if (targetWallpaperId == null) return null;

    // إذا كان UID غير معروف في الواجهة، نطلبه من السيرفر مباشرةً من
    // wallpapers.user_id. هذا مهم جداً للإشارة إلى صاحب الخلفية.
    if (!publisherUID) {
        try {
            const res = await fetch(
                `/api/wallpapers/${encodeURIComponent(targetWallpaperId)}/publisher`,
                { cache: "no-store" }
            );

            if (res.ok) {
                const data = await res.json();
                const user = data?.user;
                const serverUID = String(data?.uid || user?.id || "").trim();

                if (data?.success && serverUID) {
                    publisherUID = serverUID;
                    applyPublisherProfile(user || {}, publisherUID, targetWallpaperId);
                    return user || { id: publisherUID };
                }
            }
        } catch (error) {
            console.warn("OWNER PUBLISHER API ERROR:", error);
        }
    }

    if (!publisherUID) return null;

    // المصدر الحقيقي: جدول profiles.
    try {
        const { data: profile, error } = await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url")
            .eq("id", publisherUID)
            .maybeSingle();

        if (!error && profile) {
            applyPublisherProfile(profile, publisherUID, targetWallpaperId);
            return profile;
        }

        if (error) {
            console.warn("DIRECT PUBLISHER SUPABASE LOAD:", error.message);
        }
    } catch (error) {
        console.warn("DIRECT PUBLISHER SUPABASE ERROR:", error);
    }

    // fallback للسيرفر مع UID معروف.
    try {
        const res = await fetch(
            `/api/wallpapers/${encodeURIComponent(targetWallpaperId)}/publisher?uid=${encodeURIComponent(publisherUID)}`,
            { cache: "no-store" }
        );

        if (!res.ok) throw new Error("PUBLISHER API ERROR");

        const data = await res.json();
        const user = data?.user;

        if (!data?.success || !user) return null;

        applyPublisherProfile(user, publisherUID, targetWallpaperId);
        return user;

    } catch (error) {
        console.warn("LOAD PUBLISHER PROFILE ERROR:", error);
        return null;
    }
}

function applyPublisherProfile(user, publisherUID, wallpaperId = null) {
    if (
        wallpaperId != null &&
        currentWallpaper &&
        Number(currentWallpaper.id) !== Number(wallpaperId)
    ) {
        return;
    }

    const profile = user || {};

    // احفظ UID الحقيقي داخل الخلفية الحالية حتى يستطيع زر @
    // تحديد صاحب الخلفية حتى لو لم يصل user_id في بيانات القائمة.
    if (currentWallpaper && publisherUID) {
        currentWallpaper.ownerUID = String(publisherUID).trim();
        currentWallpaper.userId = String(publisherUID).trim();
    }

    const name =
        profile.full_name ||
        profile.username ||
        profile.name ||
        "مستخدم";

    const avatar =
        profile.avatar_url ||
        profile.avatar ||
        profile.photoURL ||
        "";

    const nameEl = document.getElementById("wallAuthorName");
    const avatarEl = document.getElementById("wallAuthorAvatar");

    if (nameEl) {
        nameEl.textContent = name;
        nameEl.dataset.uid = publisherUID;
        nameEl.style.cursor = "pointer";
        nameEl.onclick = () => {
            location.href =
                `profile.html?uid=${encodeURIComponent(publisherUID)}`;
        };
    }

    if (avatarEl) {
        avatarEl.src = avatar
            ? getImageUrl(avatar)
            : "/assets/logo/no-image.png";

        avatarEl.dataset.uid = publisherUID;
        avatarEl.style.cursor = "pointer";
        avatarEl.onclick = () => {
            location.href =
                `profile.html?uid=${encodeURIComponent(publisherUID)}`;
        };

        avatarEl.onerror = () => {
            avatarEl.onerror = null;
            avatarEl.src = "/assets/logo/no-image.png";
        };
    }

    if (
        currentWallpaper &&
        (wallpaperId == null ||
         Number(currentWallpaper.id) === Number(wallpaperId))
    ) {
        currentWallpaper.publisher = profile;
        currentWallpaper.authorName = name;
        currentWallpaper.authorAvatar = avatar;
    }
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

// معلومات ناشر الخلفية في رأس الصفحة
const wallAuthorName = document.getElementById("wallAuthorName");
const wallAuthorAvatar = document.getElementById("wallAuthorAvatar");

if(wallAuthorName){
    wallAuthorName.textContent =
        currentWallpaper.author ||
        currentWallpaper.userName ||
        "WallpaperHub";
}

if(wallAuthorAvatar){
    const avatar =
        currentWallpaper.authorAvatar ||
        currentWallpaper.avatar ||
        currentWallpaper.userAvatar ||
        currentWallpaper.profileImage ||
        currentWallpaper.userImage ||
        "";

    wallAuthorAvatar.src = avatar
        ? getImageUrl(avatar)
        : "/assets/logo/no-image.png";

    wallAuthorAvatar.onerror = () => {
        wallAuthorAvatar.onerror = null;
        wallAuthorAvatar.src = "/assets/logo/no-image.png";
    };
}



    // جلب معلومات الناشر الحقيقية من profiles باستخدام UID المحفوظ مع الخلفية.
    const publisherUID = String(
        currentWallpaper.ownerUID ||
        currentWallpaper.userId ||
        currentWallpaper.user_id ||
        ""
    ).trim();
    if(publisherUID){
        loadPublisherProfile(publisherUID, currentWallpaper.id);
    }

if(wallDate)

wallDate.textContent =

currentWallpaper.date || "";


// Quick stats: likes / views / rating / date
if(wallLikes){
    wallLikes.textContent = formatQuickStat(
        currentWallpaper.likes ??
        currentWallpaper.likeCount ??
        currentWallpaper.favorites ??
        0
    );
}
if(wallViews){
    wallViews.textContent = formatQuickStat(
        currentWallpaper.views ??
        currentWallpaper.viewCount ??
        0
    );
}
if(wallQuickRating){
    wallQuickRating.textContent = currentWallpaper.rating ?? 0;
}
if(wallQuickDate){
    wallQuickDate.textContent = currentWallpaper.date || "—";
}
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
// COMMENTS + REAL MENTION SYSTEM (SUPABASE)
// ===============================

const commentInput = document.getElementById("commentInput");
const sendCommentBtn = document.getElementById("sendCommentBtn");
const mentionBtn = document.getElementById("mentionBtn");
const mentionSuggestions = document.getElementById("mentionSuggestions");
const commentsContainer = document.getElementById("commentsContainer");
const commentsCountBadge = document.getElementById("commentsCountBadge");

let currentAuthUser = null;
let savedMentionRange = null;

// ===============================
// SUPABASE AUTH - جلسة المستخدم
// ===============================
async function restoreWallpaperAuth(){
    try{
        const { data, error } = await supabase.auth.getSession();
        if(error) throw error;
        currentAuthUser = data?.session?.user || null;
        console.log("Wallpaper Auth UID:", currentAuthUser?.id || "guest");
    }catch(error){
        console.warn("WALLPAPER AUTH RESTORE ERROR", error);
    }
}

supabase.auth.onAuthStateChange((event, session) => {
    currentAuthUser = session?.user || null;
    console.log("Wallpaper Auth Changed:", currentAuthUser?.id || "guest");
});

restoreWallpaperAuth();

function getCurrentUserId(){
    if(currentAuthUser?.id){
        return String(currentAuthUser.id).trim();
    }

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
// MENTION LOGIC - OWNER ONLY
// ===============================
function escapeHtml(value){
    return String(value ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}

function getWallpaperMentionTarget(){
    if(!currentWallpaper) return null;

    const userId = String(
        currentWallpaper.ownerUID ||
        currentWallpaper.userId ||
        currentWallpaper.user_id ||
        ""
    ).trim();

    if(!userId) return null;

    const publisher = currentWallpaper.publisher || {};
    const name = String(
        currentWallpaper.authorName ||
        publisher.full_name ||
        publisher.username ||
        currentWallpaper.author ||
        "صاحب الخلفية"
    ).trim();

    const avatar = String(
        currentWallpaper.authorAvatar ||
        publisher.avatar_url ||
        currentWallpaper.avatar ||
        ""
    ).trim();

    return { userId, name, avatar };
}

// تحويل نص الإشارة إلى رابط حقيقي إلى صاحب الخلفية
function formatCommentText(value, mentionedUserId){
    const safe = escapeHtml(value);

    if(mentionedUserId){
        return safe.replace(
            /(^|\s)(@[\w\u0600-\u06FF][\w\u0600-\u06FF._-]*)/g,
            `$1<a href="profile.html?uid=${encodeURIComponent(mentionedUserId)}" class="comment-mention-link" style="color:#007aff;font-weight:bold;text-decoration:underline;">$2</a>`
        );
    }

    return safe.replace(
        /(^|\s)(@[\w\u0600-\u06FF][\w\u0600-\u06FF._-]*)/g,
        '$1<span class="comment-mention" style="color:#007aff;font-weight:bold;">$2</span>'
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

    const userId = String(tag.dataset.userId || "").trim();
    const owner = getWallpaperMentionTarget();

    // الواجهة نفسها لا تسمح بأي UID غير UID صاحب الخلفية.
    if(!owner || !userId || userId !== owner.userId){
        return null;
    }

    return {
        userId,
        name: String(tag.dataset.name || tag.textContent || "")
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

// يعرض صاحب الخلفية فقط، ولا يبحث في جميع المستخدمين.
async function showOwnerMentionSuggestion(){
    if(!mentionSuggestions) return;

    let target = getWallpaperMentionTarget();

    // محاولة أخيرة للحصول على صاحب الخلفية من السيرفر قبل إظهار الخطأ.
    if(!target && currentWallpaper?.id){
        mentionSuggestions.innerHTML = `
            <div class="mention-empty" style="padding:10px;text-align:center;color:#888;">
                جاري تحديد صاحب الخلفية...
            </div>
        `;
        mentionSuggestions.hidden = false;

        await loadPublisherProfile("", currentWallpaper.id);
        target = getWallpaperMentionTarget();
    }

    if(!target){
        mentionSuggestions.innerHTML = `
            <div class="mention-empty" style="padding:10px;text-align:center;color:#888;">
                تعذر تحديد صاحب الخلفية
            </div>
        `;
        mentionSuggestions.hidden = false;
        return;
    }

    const avatarHtml = target.avatar
        ? `<img src="${escapeHtml(target.avatar)}" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`
        : `<span class="mention-suggestion-avatar">@</span>`;

    mentionSuggestions.innerHTML = `
        <button type="button" class="mention-suggestion-item">
            ${avatarHtml}
            <span class="mention-suggestion-info">
                <strong style="display:block;font-size:14px;">@${escapeHtml(target.name)}</strong>
                <small>صاحب الخلفية</small>
            </span>
        </button>
    `;

    mentionSuggestions.hidden = false;

    const item = mentionSuggestions.querySelector(".mention-suggestion-item");
    if(item){
        item.onclick = (event)=>{
            event.preventDefault();
            event.stopPropagation();
            insertOwnerMention();
        };
    }
}

function insertOwnerMention(){
    if(!commentInput) return;

    const target = getWallpaperMentionTarget();
    if(!target){
        hideMentionSuggestions();
        return;
    }

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

    // حذف @ أو @جزء من الاسم قبل إدخال صاحب الخلفية.
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
    mention.style.cssText = "color:#007aff;font-weight:bold;";
    mention.textContent = `@${target.name}`;

    range.insertNode(mention);

    const space = document.createTextNode(" ");
    mention.after(space);

    range.setStart(space, 1);
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

            // اسم الكاتب برابط بروفايل حقيقي إن توفر الـ UID
            const authorLink = comment.userId 
                ? `<a href="profile.html?uid=${encodeURIComponent(comment.userId)}" style="text-decoration:none; color:inherit; font-weight:bold;" class="comment-author-link">${escapeHtml(comment.user || "مستخدم")}</a>`
                : escapeHtml(comment.user || "مستخدم");

            box.innerHTML = `
                <div class="user-avatar">${avatarHtml}</div>

                <div class="comment-content">
                    <div class="comment-header">
                        <div>
                            <div class="comment-author">
                                ${authorLink}
                            </div>
                            <span class="comment-email">
                                ${escapeHtml(comment.email || "غير مسجل")}
                            </span>
                        </div>
                    </div>

                    <div class="comment-text">
                        ${formatCommentText(comment.text || "", comment.mentionedUserId)}
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
        event.preventDefault();
        saveCurrentMentionCaret();
    });

    mentionBtn.addEventListener("click", (event)=>{
        event.preventDefault();
        event.stopPropagation();
        saveCurrentMentionCaret();
        showOwnerMentionSuggestion();
    });

    commentInput.addEventListener("keyup", ()=>{
        saveCurrentMentionCaret();
    });

    commentInput.addEventListener("input", ()=>{
        saveCurrentMentionCaret();

        const text = getCommentText();
        const match = text.match(/(^|\s)@([\w\u0600-\u06FF._-]*)$/);

        if(match){
            showOwnerMentionSuggestion();
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
// =========================================================
// Wallpaper Tabs
// المعلومات / خلفيات مشابهة / التعليقات
// =========================================================
(function setupWallpaperTabs(){
    const tabs = Array.from(document.querySelectorAll(".wallpaper-tab[data-tab]"));
    const panels = Array.from(document.querySelectorAll(".tab-panel[data-panel]"));

    if(!tabs.length || !panels.length) return;

    function updateCommentsTabCount(){
        const source = document.getElementById("commentsCountBadge");
        const target = document.getElementById("tabCommentsCount");
        if(!target) return;

        const text = source ? source.textContent : "0";
        const match = String(text).match(/\d+/);
        target.textContent = match ? match[0] : "0";
    }

    function activateTab(name, updateHash = true){
        tabs.forEach(tab => {
            const active = tab.dataset.tab === name;
            tab.classList.toggle("active", active);
            tab.setAttribute("aria-selected", active ? "true" : "false");
            tab.tabIndex = active ? 0 : -1;
        });

        panels.forEach(panel => {
            const active = panel.dataset.panel === name;
            panel.hidden = !active;
            panel.classList.toggle("active", active);
        });

        updateCommentsTabCount();

        // لا نقفز لأعلى الصفحة عند تغيير التبويب.
        if(updateHash){
            try{
                history.replaceState(null, "", `#${name}`);
            }catch(error){}
        }
    }

    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => {
            activateTab(tab.dataset.tab);
        });

        tab.addEventListener("keydown", (event) => {
            if(event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

            event.preventDefault();

            const direction = event.key === "ArrowRight" ? -1 : 1;
            const nextIndex = (index + direction + tabs.length) % tabs.length;
            tabs[nextIndex].focus();
            activateTab(tabs[nextIndex].dataset.tab);
        });
    });

    const countBadge = document.getElementById("commentsCountBadge");
    if(countBadge && typeof MutationObserver !== "undefined"){
        new MutationObserver(updateCommentsTabCount).observe(countBadge, {
            childList:true,
            characterData:true,
            subtree:true
        });
    }

    const initialHash = location.hash.replace("#", "");
    const initialTab = tabs.some(t => t.dataset.tab === initialHash)
        ? initialHash
        : "info";

    activateTab(initialTab, false);
    updateCommentsTabCount();
})();
