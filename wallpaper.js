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

function isGifMedia(wallpaper){
    if(!wallpaper) return false;
    const type = String(wallpaper.type || "").toLowerCase();
    if(type === "gif") return true;
    return String(wallpaper.image || "").toLowerCase().includes(".gif");
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


/* ===================================================
   Supabase User Action Sync
   يحفظ تفضيلات المستخدم على الحساب وليس على الجهاز فقط
   =================================================== */
async function syncUserActionToSupabase(type, id){
    if(id === null || id === undefined) return;

    const keyMap = {
        favorites:"favorite_ids",
        favorite:"favorite_ids",
        // الإعجابات لها نظام مستقل في جدول likes ولا تُحفظ داخل favorite_ids.
        likes:null,
        like:null,
        downloads:"download_ids",
        download:"download_ids",
        views:"view_ids",
        view:"view_ids"
    };

    const key = keyMap[String(type).toLowerCase()];
    if(!key) return;

    try{
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if(!user?.id) return;

        const readLocal = localKey => {
            try{
                const value = JSON.parse(localStorage.getItem(localKey) || "[]");
                return Array.isArray(value) ? value.map(String) : [];
            }catch{
                return [];
            }
        };

        const { data: cloud } = await supabase
            .from("user_profile_sync")
            .select("user_id,full_name,username,avatar_url,cover_url,bio,join_date,favorite_ids,download_ids,view_ids")
            .eq("user_id", user.id)
            .maybeSingle();

        const unique = values => [...new Set((values || [])
            .filter(value => value !== null && value !== undefined && String(value).trim() !== "")
            .map(String))];

        const merged = {
            user_id:user.id,
            full_name:cloud?.full_name || localStorage.getItem("userName") || "",
            username:cloud?.username || localStorage.getItem("username") || "",
            avatar_url:cloud?.avatar_url || localStorage.getItem("userAvatar") || "",
            cover_url:cloud?.cover_url || localStorage.getItem("userCover") || "",
            bio:cloud?.bio || localStorage.getItem("profileBio") || "",
            join_date:cloud?.join_date || localStorage.getItem("joinDate") || "",
            favorite_ids:unique([...(cloud?.favorite_ids || []), ...readLocal("favorites")]),
            download_ids:unique([...(cloud?.download_ids || []), ...readLocal("downloads")]),
            view_ids:unique([...(cloud?.view_ids || []), ...readLocal("views")])
        };

        merged[key] = unique([...(merged[key] || []), String(id)]);
        localStorage.setItem(key === "favorite_ids" ? "favorites" : key === "download_ids" ? "downloads" : "views", JSON.stringify(merged[key]));

        const { error } = await supabase
            .from("user_profile_sync")
            .upsert(merged, { onConflict:"user_id" });

        if(error) throw error;
    }catch(error){
        console.error("SUPABASE USER ACTION SYNC ERROR:", error);
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

    merged.ratingDistribution = normalizeRatingDistribution(
        first(
            row.rating_distribution,
            row.ratingDistribution,
            row.rating_breakdown,
            row.ratingBreakdown,
            base.ratingDistribution
        ) || {
            1: row.rating_1_count ?? base.rating_1_count ?? 0,
            2: row.rating_2_count ?? base.rating_2_count ?? 0,
            3: row.rating_3_count ?? base.rating_3_count ?? 0,
            4: row.rating_4_count ?? base.rating_4_count ?? 0,
            5: row.rating_5_count ?? base.rating_5_count ?? 0
        }
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
        syncUserActionToSupabase("views", currentWallpaper.id);

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
async function loadPublisherProfile(uid, wallpaperId = null) {
    const publisherUID = String(uid || "").trim();
    if (!publisherUID) return null;

    const targetWallpaperId = wallpaperId ?? currentWallpaper?.id ?? null;

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

    // fallback للسيرفر.
    try {
        if (targetWallpaperId == null) return null;

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

    // عرض النسخة الأصلية الموجودة في image، وليس thumbnail.
    const originalImageUrl = getImageUrl(currentWallpaper.image || media);

    wallImage.removeAttribute("srcset");
    wallImage.removeAttribute("sizes");
    wallImage.decoding = "sync";
    wallImage.loading = "eager";
    wallImage.src = originalImageUrl;

    wallImage.style.display = "block";

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

    // الرابط يجب أن يعتمد دائماً على UID مالك الخلفية المحفوظ معها،
    // وليس UID الحساب الذي يشاهد الصفحة.
    if(publisherUID){
        if(wallAuthorName){
            wallAuthorName.dataset.uid = publisherUID;
            wallAuthorName.style.cursor = "pointer";
            wallAuthorName.onclick = () => {
                location.href = `profile.html?uid=${encodeURIComponent(publisherUID)}`;
            };
        }

        if(wallAuthorAvatar){
            wallAuthorAvatar.dataset.uid = publisherUID;
            wallAuthorAvatar.style.cursor = "pointer";
            wallAuthorAvatar.onclick = () => {
                location.href = `profile.html?uid=${encodeURIComponent(publisherUID)}`;
            };
        }

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
    wallQuickRating.textContent = formatQuickStat(
        currentWallpaper.ratingCount ?? 0
    );
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

updateRatingUI(
    currentWallpaper.rating || 0,
    currentWallpaper.ratingCount || 0,
    getWallpaperRatingDistribution(currentWallpaper)
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

// تحليل الخلفية الجديدة أيضًا عند التنقل بين الخلفيات.
autoAnalyzeWallpaper();

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
    syncUserActionToSupabase("views", currentWallpaper.id);


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

isGifMedia(item) ? item.image : (item.thumbnail || item.image)

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

fullscreenImage.removeAttribute("srcset");
fullscreenImage.removeAttribute("sizes");
fullscreenImage.decoding = "sync";
fullscreenImage.src = getImageUrl(currentWallpaper.image);

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
    // تحميل الملف الأصلي بدون تصغير أو إعادة ضغط.
    try {
        const response = await fetch(imageUrl, { mode: "cors" });
        if (!response.ok) throw new Error("IMAGE DOWNLOAD ERROR");

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.download = (title || "wallpaper") + getExtensionFromMime(blob.type);
        link.href = objectUrl;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
        console.error("ORIGINAL IMAGE DOWNLOAD ERROR:", error);

        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = title || "wallpaper";
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
}

function getExtensionFromMime(mime) {
    const map = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/avif": ".avif",
        "image/gif": ".gif"
    };

    return map[mime] || "";
}

if (downloadBtn) {
    downloadBtn.onclick = async (e) => {
        e.preventDefault();

        if (!currentWallpaper) return;

        const url = getImageUrl(currentWallpaper.image);

        // تحميل الملف الأصلي بدون تصغير أو إعادة ضغط
        downloadWithWatermark(url, currentWallpaper.title);

        // ✅ حفظ التحميل في الإحصائيات
        window.syncUserStats("downloads", currentWallpaper.id);

        // حفظ التحميل
        saveUserAction("downloads", currentWallpaper.id);
        await syncUserActionToSupabase("downloads", currentWallpaper.id);

        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData?.session?.access_token || "";
            await fetch(`${API}/${currentWallpaper.id}/download`, {
                method: "POST",
                headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
            });
        } catch (error) {
            console.error("DOWNLOAD ERROR", error);
        }
    };
}

// ===============================
// Like System (Wallpaper)
// ===============================

const likeBtn = document.getElementById("likeBtn");


// فحص هل المستخدم ضغط إعجاب سابقاً
async function checkLikeStatus(){

    try{

        if(!currentWallpaper || !likeBtn)
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

            likeBtn.innerHTML = `
            <span class="material-icons">
            favorite
            </span>
            `;

            likeBtn.classList.add("liked");
            // حالة الإعجاب تخص جدول likes فقط، ولا تُضاف إلى المحفوظات.
            saveUserAction("likedWallpapers", currentWallpaper.id);

        }else{

            likeBtn.innerHTML = `
            <span class="material-icons">
            favorite_border
            </span>
            `;

            likeBtn.classList.remove("liked");

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

        if(!currentWallpaper || !likeBtn)
            return;


        const userId = getCurrentUserId() || "guest";


        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token || "";

        const response = await fetch(
            `/api/wallpapers/${currentWallpaper.id}/like`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    ...(accessToken ? { Authorization:`Bearer ${accessToken}` } : {})
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
            likeBtn.innerHTML = `
                <span class="material-icons">
                    favorite
                </span>
            `;

            likeBtn.classList.add("liked");

            // الإعجاب بالخلفية نظام مستقل عن المحفوظات.
            saveUserAction("likedWallpapers", currentWallpaper.id);
            if (typeof window.syncUserStats === "function") {
                window.syncUserStats("likes", currentWallpaper.id);
            }

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

if(likeBtn){

    likeBtn.addEventListener(
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
// Rating — 5-row distribution
// ===============================

const ratingRows = document.querySelectorAll(".rating-row");
const ratingStars = document.querySelectorAll(".rating-row-star");
const ratingTotalInline = document.getElementById("ratingTotalInline");
const ratingTotalFooter = document.getElementById("ratingTotalFooter");

function normalizeRatingDistribution(source = {}){
    return {
        1: Number(source[1] ?? source["1"] ?? source.rating_1_count ?? source.rating1 ?? 0) || 0,
        2: Number(source[2] ?? source["2"] ?? source.rating_2_count ?? source.rating2 ?? 0) || 0,
        3: Number(source[3] ?? source["3"] ?? source.rating_3_count ?? source.rating3 ?? 0) || 0,
        4: Number(source[4] ?? source["4"] ?? source.rating_4_count ?? source.rating4 ?? 0) || 0,
        5: Number(source[5] ?? source["5"] ?? source.rating_5_count ?? source.rating5 ?? 0) || 0
    };
}

function getWallpaperRatingDistribution(wallpaper){
    return normalizeRatingDistribution(
        wallpaper?.ratingDistribution ||
        wallpaper?.rating_distribution ||
        wallpaper?.ratingBreakdown ||
        wallpaper?.rating_breakdown ||
        {}
    );
}

function updateRatingDistribution(distribution = {}){
    const counts = normalizeRatingDistribution(distribution);

    ratingRows.forEach(row => {
        const rate = Number(row.dataset.rate);
        const count = counts[rate] || 0;
        const fill = row.querySelector(".rating-bar-fill");
        const countEl = row.querySelector(".rating-row-count");
        const star = row.querySelector(".rating-row-star");

        // كل 200 تقييم من نفس الدرجة يملأ الشريط 100%.
        const percent = Math.min(100, (count / 200) * 100);

        if(fill) fill.style.width = `${percent}%`;
        if(countEl) countEl.textContent = formatQuickStat(count);

        row.classList.toggle("has-ratings", count > 0);
        if(star) star.classList.toggle("active", count > 0);
    });

    if(currentWallpaper){
        currentWallpaper.ratingDistribution = counts;
    }
}

function updateStars(value){
    // النجوم داخل الصفوف لا تمثل "نجوم المتوسط"،
    // لذلك لا نلوّنها حسب المتوسط هنا.
    const selected = Number(value) || 0;
    ratingRows.forEach(row => {
        row.classList.toggle(
            "selected-rating-row",
            Number(row.dataset.rate) === selected
        );
    });
}

function updateRatingUI(rating, ratingCountValue, distribution){
    const average = Number(rating) || 0;
    const total = Number(ratingCountValue) || 0;
    const counts = normalizeRatingDistribution(distribution);

    if(wallRating){
        wallRating.textContent = average.toFixed(1);
    }

    if(ratingTotalInline){
        ratingTotalInline.textContent = formatQuickStat(total);
    }

    if(ratingTotalFooter){
        ratingTotalFooter.textContent = formatQuickStat(total);
    }

    if(wallQuickRating){
        wallQuickRating.textContent = formatQuickStat(total);
    }

    if(currentWallpaper){
        currentWallpaper.rating = average;
        currentWallpaper.ratingCount = total;
        currentWallpaper.ratingDistribution = counts;
    }

    updateRatingDistribution(counts);
    updateStars(0);
}

function createRatingBurst(star){
    if(!star) return;

    const row = star.closest(".rating-row");
    if(!row) return;

    const burst = document.createElement("span");
    burst.className = "rating-burst";
    burst.setAttribute("aria-hidden", "true");

    const directions = [
        [-25,-12],[-18,-22],[-7,-28],[9,-25],[20,-17],
        [26,-4],[22,11],[12,21],[-3,27],[-17,21],[-25,10]
    ];

    directions.forEach(([x,y],index)=>{
        const particle = document.createElement("span");
        particle.className = "rating-burst-star";
        particle.textContent = "★";
        particle.style.setProperty("--dx",`${x}px`);
        particle.style.setProperty("--dy",`${y}px`);
        particle.style.setProperty("--delay",`${index*14}ms`);
        particle.style.setProperty("--size",`${3+(index%2)}px`);
        burst.appendChild(particle);
    });

    row.appendChild(burst);

    const rr=row.getBoundingClientRect();
    const sr=star.getBoundingClientRect();

    burst.style.left=`${sr.left-rr.left+sr.width/2}px`;
    burst.style.top=`${sr.top-rr.top+sr.height/2}px`;

    setTimeout(()=>burst.remove(),760);
}

function animateRatingRow(rate){
    const row=document.querySelector(`.rating-row[data-rate="${rate}"]`);
    if(!row) return;

    row.classList.remove("rating-row-pulse");
    void row.offsetWidth;
    row.classList.add("rating-row-pulse");
}

async function submitRating(star){
    if(!currentWallpaper || !star) return;

    const value=Number(star.dataset.rate);
    if(!Number.isInteger(value) || value<1 || value>5) return;

    createRatingBurst(star);
    animateRatingRow(value);

    try{
        const res=await fetch(
            `${API}/${currentWallpaper.id}/rate`,
            {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({rating:value})
            }
        );

        const data=await res.json();

        if(!res.ok || !data.success){
            throw new Error(data?.message || "Rating request failed");
        }

        updateRatingUI(
            data.rating,
            data.ratingCount,
            data.ratingDistribution || data.rating_distribution || {}
        );

    }catch(error){
        console.error("RATE ERROR:",error);
    }
}

ratingStars.forEach(star=>{
    star.addEventListener("click",()=>submitRating(star));

    star.addEventListener("keydown",event=>{
        if(event.key==="Enter" || event.key===" "){
            event.preventDefault();
            submitRating(star);
        }
    });
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



if(data.success && data.description){

currentWallpaper.aiDescription =
String(data.description).trim();

if(wallDescription)
wallDescription.textContent =
currentWallpaper.aiDescription;

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
function formatCommentText(value, mentionedUserId, mentionedName){
    const safe = escapeHtml(value);

    // الإشارة الحقيقية مرتبطة بـ UID + الاسم الكامل المحفوظ في mentions.
    // نطابق الاسم كاملاً حتى لا يصبح "Nabil" أزرق و"Rahali" أسود.
    if(mentionedUserId && mentionedName){
        const fullMention = `@${String(mentionedName).trim()}`;
        const escapedMention = escapeHtml(fullMention).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const fullMentionRegex = new RegExp(`(^|\\s)(${escapedMention})(?=\\s|$|[.,!?،؛:])`, "g");

        return safe.replace(
            fullMentionRegex,
            `$1<a href="profile.html?uid=${encodeURIComponent(mentionedUserId)}" class="comment-mention-link" style="color:#007aff;font-weight:bold;text-decoration:underline;">$2</a>`
        );
    }

    // توافق مع التعليقات القديمة التي لا تحتوي mentionedName.
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
function showOwnerMentionSuggestion(){
    if(!mentionSuggestions) return;

    const target = getWallpaperMentionTarget();
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
                        ${formatCommentText(comment.text || "", comment.mentionedUserId, comment.mentionedName)}
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

        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token || "";

        const res = await fetch(
            `${API}/${currentWallpaper.id}/comments`,
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json",
                    ...(accessToken ? { Authorization:`Bearer ${accessToken}` } : {})
                },
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

        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token || "";

        const res = await fetch(
            `/api/comments/${id}/like`,
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json",
                    ...(accessToken ? { Authorization:`Bearer ${accessToken}` } : {})
                },
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
