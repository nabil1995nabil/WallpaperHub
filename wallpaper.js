// ======================================
// WallpaperHub wallpaper.js
// Auto Video Wallpaper System
// Full Fixed Version
// ======================================

console.log("WallpaperHub Player Loaded");

// ===============================
// URL Helper
// ===============================
function getImageUrl(url) {
    if (!url) return "/assets/logo/no-image.png";
    if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
    }
    return "/" + url.replace(/^\/+/, "");
}

// ===============================
// Media Detector
// ===============================
function isVideoMedia(wpaper) {
    if (!wallpaper) return false;
    if (wallpaper.type === "video") return true;

    const url = wallpaper.image || "";

    return [".mp4", ".webm", ".mov", ".m3u8"]
        .some(ext => url.toLowerCase().includes(ext));
}

// ===============================
// API
// ===============================
const API = "/api/wallpapers";

// ===============================
// Elements
// ===============================
const wallImage = document.getElementById("wallImage");
const wallVideo = document.getElementById("wallVideo");
const wallResolution = document.getElementById("wallResolution");
const wallSize = document.getElementById("wallSize");
const wallDownloads = document.getElementById("wallDownloads");
const wallRating = document.getElementById("wallRating");
const wallAuthor = document.getElementById("wallAuthor");
const wallDate = document.getElementById("wallDate");
const qualityBadge = document.getElementById("qualityBadge");
const tags = document.getElementById("tagsContainer");
const colorPalette = document.getElementById("colorPalette");
const similarContainer = document.getElementById("similarWallpapers");
const ratingStars = document.querySelectorAll(".star");
const ratingCount = document.getElementById("ratingCount");
const moreOptionsBtn = document.getElementById("moreOptionsBtn");
const optionsMenu = document.getElementById("optionsMenu");
const wallDescription = document.getElementById("wallDescription");
const captureLocation = document.getElementById("captureLocation");
const captureDate = document.getElementById("captureDate");
const captureTime = document.getElementById("captureTime");
const imageSource = document.getElementById("imageSource");

if (moreOptionsBtn && optionsMenu) {
    moreOptionsBtn.onclick = () => {
        optionsMenu.classList.toggle("active");
   }

// ===============================
// Variables
// ===============================
const params = new URLSearchParams(location.search);

let wallpaperId =
    Number(params.get("id")) ||
    Number(localStorage.getItem("selectedWallpaper")) ||
    1;

let currentWallpaper = null;   // ✅ إصلاح: كان الاسم currentWall
let allWallpapers = [];
let categoryWallpapers = [];
let currentWallpaperIndex = -1;

// ===============================
// User Actions
// ===============================
function saveUserAction(key, id {
    try {
        let list = JSON.parse(localStorage.getItem(key) || "[]");
        id = String(id);
        if (!list.map(String).includes(id)) {
            list.push(id);
            localStorage.setItem(key, JSON.stringify(list));
        }
    } catch (error) {
        console.error("SAVE USER ACTION ERROR", error);
    }
}

 ===============================
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

        categoryWallpapers = allWallpapers.filter(
            w => w.category === currentWallpaper.category
        );
        currentWallpaperIndex = categoryWallpapers.findIndex(
            w => w.id === currentWallpaper.id
               showWallpaper();
        loadComments();
        autoAnalyzeWallpaper();
        loadSimilar();
        updateFavorite();

        saveUserAction("views", currentWallpaper.id);
        window.syncUserStats?.("views", currentWallpaper.id);   // ✅ حماية

        sendViewWallpaper.id);
    } catch (error) {
        console.error("LOAD WALLPAPER ERROR", error);
    }
}

// ===============================
// View Counter
// ===============================
async function sendView(id) {
    try {
        await fetch(`API/{API}/API/{id}/view`, { method: "POST" });   // ✅ إصلاح الرابط
    } catch (error) {
        console.error("VIEW ERROR", error);
    }
}

// ===============================
// Video Auto Play
// ===============================
function setupVideo(src) {
    if (!wallVideo return;

    wallVideo.src = getImageUrl(src    wallVideo.style.display = "block";

    if (wallImage) wallImage.style.display "none";

    wallVideo.muted = true;
    wallVideo.loop = true;
    wallVideo.playsInline = true;

    wallVideo.load();

    wallVideo.play().catch(error => {
        console.log("Video autoplay blocked", error);
    });
}

// ===============================
// Stop Video
 ===============================
function stopVideo() {
    if (!wallVideo) return;

    wallVideo.pause();
    wallVideo.removeAttribute("src");
    wallVideo.load();
    wallVideo.style.display = "none";
}

// ===============================
// Show Wallpaper
// ===============================
function showWallpaper() {
    if (!currentWallpaper) return;

    const media = currentWallpaper.image || "";

    // عرض الميديا (ورة أو فيديو)
    if (isVideoMedia(currentWallpaper)) {
        setupVideo(media    } else {
        stopVideo();
        if (wallImage) {
            wallImage.src = getImageUrl(media);
            wallImage.style.display = "block";
        }
    }

    // الوصف
    if (wallDescription) {
        wallDescription.textContent = currentWallpaper.description || "";
    }

    // العنوان (مع تمرير إذا طويل)
    const wallTitle2 = document.getElementById("wallTitle2");
    if (wallTitle2) {
        wallTitle2.textContent currentWallpaper.title || "بدون اسم";
        wallTitle2.classList.remove("scroll-title");
        if (wallTitle2.scrollWidth > wallTitle2.clientWidth) {
            wallTitle2.classList.add("scroll-title");
        }
    }

 // مصدر الصورة (ذكاء اصطناعي / تصوير)
    if (imageSource) {
        const source = currentWallpaper.source || "unknown";
        if (source === "ai") {
            imageSource.textContent = "🤖 مولدة بالذكاء الاصطاعي";
        } else if (source === "camera") {
            imageSource.textContent = "📷 تصوير بشري";
        } else {
            imageSource.textContent = "غير معروف";
        }
    }

    // معلومات
    if (wallResolution) wallResolution.textContent = currentWallpaper.resolution || "";
    if (wallSize) wallSize.textContent = currentWallpaper.size || "";
    if (wallDownloads) wallDownloads.textContent = currentpaper.downloads || 0;
    if (wallAuthor) wallAuthor.textContent = currentWallpaper.author || "";
    if (wallDate wallDate.textContent = currentWallpaper.date || "";

    // بيانات التصوير
    if (captureLocation) {
        captureLocation.textContent = currentWallpaper.location || "غير معروف";
    }
    if (captureDate) {
        captureDate.textContent = currentWallpaper.captureDate || "غير معروف";
    }
    if (captureTime) {
        captureTime.textContent = currentWallpaper.captureTime || "غير معروف";
    }

    // التقييم
    if (wallRating) wallRating.textContent = currentWallpaper.rating || 0;
    if (ratingCount) {
        ratingCount = `(${currentWallpaper.ratingCount || 0} تقييم)`;
    }

    updateStars(currentWallpaper.rating || 0);

    // شارة الجودة
    if (qualityBadge) {
 let quality = "HD";
        const nums = (currentWallpaper.resolution || "").match(/\d+/g);
        if (nums && nums.length >= 2) {
            const max = Math.max(Number(nums[0]), Number(nums[1]));
            if (max >= 3840) quality = "4K";
 if (max >= 2560) quality = "2K";
            else if (max >= 1920) quality = "FULL HD";
        }
        qualityBadge.textContent = quality;
    }

    // الوسوم
    if (tagsContainer) {
       Container.innerHTML = "";
        (currentWallpaper.tags || []).forEach(tag => {
            const span = document.createElement("span");
           .className = "tag";
            span.textContent = "#" + tag;
            tagsContainer.appendChild(span);
        });
    }

    // لوحة الألوان
    if (colorPalette) {
        colorPalette.innerHTML = "";
       currentWallpaper.colors || []).forEach(color => {
            const div = document.createElement("div");
            div.style.cssText = `
                width:40px;
                height:40px;
                border-radius:50                background:${color};
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

    if (index >= categoryWallpapers.length index = 0;
    if (index < 0) index = categoryWallpapers.length - 1;

    currentWallpaperIndex = index;
    currentWallpaper =Wallpapers[index];
    wallpaperId = currentWallpaper.id;

    localStorage.setItem("selectedWallpaper", currentWallpaper.id);
    history.replaceState({}, "", "paper.html=" + currentWallpaper.id);

    showWallpaper();
    loadSimilar();
    updateFavorite();

    saveUserAction("views", currentWallpaper.id);
    window.syncUserStats?.("views", currentWallpaper.id);

    sendView(currentWallpaper.id);
}

// ===============================
// Swipe
// ===============================
let touchStartX = 0;

if (Image) {
 wallImage.addEventListener("touchstart", (e) => {
        touchStartX = e.touches[0].clientX;
    }, { passive: true });

    wallImage.addEventListener("touchend", (e) => {
        const diff = e.changedTouches[0].clientX - touchStartX;
        if (Math(diff) < 60) return;

        if ( < 0 {
            changeWallpaper(currentWallpaperIndex + 1);
        } else {
            changeWallpaper(currentWallpaperIndex - 1);
        }
    }, { passive: true });
}

// ===============================
// Similar Wallpapers
// ===============================
function loadSimilar() {
    if (!similarContainer || !currentWallpaper) return;

 similarContainer.innerHTML = "";

    allWallpapers
        .filter(w =>
            w.category === currentWallpaper.category &&
            w.id !== currentWallpaper.id
        )
        .slice(0, )
        .forEach(item => {
            const card = document.createElement("div");
            card.className = "similar-card";

            let media = "";
            if (isVideoMedia(item)) {
                media = `
                    <video
                        src="${getImageUrl(item)}"
                        muted
                        loop
                        autoplay
                        playsinline
                        loadinglazy"
                    ></video>
                `;
            } else {
                media = `
                    <img
                        src="${getImage(item.thumbnail || item.image)}"
                        loading="lazy"
                        alt="${item || "Wallpaper"}"
                    >
 `;
            }

            card.innerHTML = `
                ${media}
                <p>${item.title || "بدون اسم"}</p>
            `;

            card.onclick = () =>                location.href = "wallpaper.html?id=" + encodeURIComponent(item.id);
            };

            similarContainer.appendChild(card);
        });
}

// ===============================
// Fullscreen// =================const fullscreenBtn = document.getElementById("fullscreenBtn");
const fullscreenViewer = document.getElementById("fullscreenViewer");
const fullscreenImage = document.getElementById("fullscreenImage");
const fullscreenVideo = document.getElementById("fullscreenVideo");
const closeFullscreenBtn = document.getElementById("closeFullscreenBtn");

if (fullscreenBtn && fullscreenViewer && fullscreenImage && fullscreenVideo) {
    fullscreenBtn.onclick = () => {
        if (!currentWallpaper) return;

        fullscreenViewer.classList.add("active");
        document.body.classList("viewer-open");

        if (isVideoMedia(currentWallpaper {
            fullscreenImage.style.display = "none";
            fullscreenVideo.style.display = "block";
            fullscreenVideo.src = getImageUrl(currentWallpaper.image);   // ✅ إصلاح
            fullscreenVideo.play().catch(() => {});
        } else {
 fullscreenVideo.style.display = "none";
            fullscreenVideo.pause();
            fullscreenImage.style.display = "block";
            fullscreenImage.src = getImageUrl(currentWallpaper.image);
        }
   }

if (closeFullscreenBtn) {
    closeFullscreenBtn.onclick = () => {
        fullscreenViewer.classList.remove("active");
        document.body.classList.remove("viewer");
        if (fullscreenVideo) fullscreenVideo.pause();
   }

// ===============================
// Download Wallpaper + Watermark
// ===============================
const downloadBtn = document.getElementById("downloadBtn");

function getWatermarkColor, canvas) {
    const x = 50;
    const y = canvas - 50;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const brightness =
        (pixel[0] * 299 + pixel[1] * 587 + pixel[2] * 114) / 1000;
    return brightness > 150
        ? "rgba(0,0,0,0.18)"
        : "rgba(255,255,255,0.18)";
}

async function downloadWatermark(imageUrl, title) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const maxWidth = 1440;

        let scale = 1;
        (img.width > maxWidth) {
            scale = maxWidth / img.width;
        }

        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        ctx = "300 24px Arial";
        ctx.fillStyle = getWatermarkColor(ctx, canvas);
        ctx.shadowColor = "rgba(00,0,0.30)";
        ctx.shadowBlur = 3;
        ctx.fillTextWallpaperHub", 35, canvas.height - 35);

        const link = document.createElement("a");
        link.download = (title || "wallpaper") + ".jpg";
        link.href = canvas.toDataURL("image/jpeg", 0.95);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };
}

if (downloadBtn) {
    downloadBtn.onclick async (e) => {
        e.preventDefault();
        if (!currentWallpaper) return;

        const url = getImageUrl(currentWallpaper.image);

        downloadWithWatermark(url, currentWallpaper.title);

        window.syncUserStats?.("downloads", currentWallpaper.id);
        saveUserAction("downloads", currentWallpaper.id);

        try {
            await fetch(`API/{API}/API/{currentWallpaper.id}/download`, {   // ✅ إصلاح الرابط
                method: "POST"
            });
        } catch (error) {
            console.error("DOWNLOAD ERROR", error);
        }
    };
}

// ===============================
// Favorite System  ✅ قسم التجمّد — مُصلَح بالكامل
// ===============================
const favoriteBtn = document.getElementById("favoriteBtn");

function getFavorites() {
    try {
        return JSON.parse(
            localStorage.getItem("favorites") || "[]"
 ).map(String    } catch (error) {
        console.error("FAVORITES READ ERROR", error);
        return [];
    }
}

function updateFavorite() {
    try {
        if (!favoriteBtn || !currentWallpaper) return;

        const favorites = getFavorites();
 const id =(currentWallpaper.id);

        if (favorites.includes(id)) {
            favoriteBtn.innerHTML = `
                <span class="material-icons">favorite</span>
            `;
            favoriteBtn.classList.add("liked");
        } else {
            favoriteBtn.innerHTML = `
                <span class="material-icons">favorite_border</span>
            `;
            favoriteBtn.classList.remove("liked");
        }
    } catch (error) {
        console.error("UPDATE FAVORITE ERROR", error);
    }
}

if (favoriteBtn) {
    favoriteBtn.addEventListener("click", () => {   // ✅ try لها أقواس صحيحة
        try {
            if (!currentWallpaper) return;

            let favorites = getFavorites();
            const id = String(currentWallpaper.id);

            if (favorites.includes(id)) {
                favorites = favorites.filter(item => item !== id);
            } else {
                favorites.push(id);
                window.syncUserStats?.("favorites", currentWallpaper.id);
            }

            localStorage.setItem("favorites", JSON.stringify(favorites));
            updateFavorite();
        } catch (error) {
            console.error("FAVORITE CLICK ERROR", error);
        }
    });
}

// ===============================
// Share
// ===============================
const shareBtn = document.getElementById("shareBtn");

if (shareBtn) {
    shareBtn.onclick = async () => {
        ifcurrentWallpaper) return;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: currentWallpaper.title,
                    url: location.href
                });
            } catch (error) {
                // المستخدم ألغى المشاركة
            }
        } else {
            navigator.clipboard.writeText(location.href);
            alert("تم نسخ الرابط");
        }
    };
}

// ===============================
// Rating
// ===============================
function updateStars(value) {
    ratingStars.forEach((star, index) => {
        star.classList.toggle("active", index < Math.round(value));
    });
}

ratingStars.forEach(star => {
    star.onclick = async () => {
        if (!currentWallpaper) return;

        const value = Number(star.dataset.rate);

        try {
            const res = await fetch(`API/{API}/API/{currentWallpaper.id}/rate`, {   // ✅ إصلاح الرابط
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rating: value })
            });

            const data = await res.json();

            if (data.success) {
                wallRating.textContent = data.rating;
                ratingCount.textContent = `(${data.ratingCount} تقييم)`;
                updateStars(data.rating);
            }
        } catch (error) {
            console.error("RATE ERROR", error);
        }
    };
});

// ===============================
// Swipe Close Fullscreen
// ===============================
let fullscreenStartY = 0;

if (fullscreenViewer) {
    fullscreenViewer.addEventListener("touchstart", (e) => {
        fullscreenStartY = e.touches[0].clientY;
    }, { passive: true });

    fullscreenViewer.addEventListener("touchend", (e) => {
        const diff = e.changedTouches[0].clientY - fullscreenStartY;

        if (diff > 100) {
            fullscreenViewer.classList.add("closing");
 setTimeout(() => {
                fullscreenViewer.classList.remove("active");
                fullscreenViewer.classList.remove("closing");
                document.body.classList.remove("viewer-open");
                if (fullscreenVideo) fullscreenVideo.pause();
            }, 500);
        }
    }, { passive: true });
}

// ===============================
// Set Wallpaper
// ===============================
const setWallpaperBtn = document.getElementById("setWallpaperBtnif (setWallpaperBtn) {
    setWallpaperBtn.onclick = () => {
        if (!currentWallpaper) return;

        const image = getImageUrl(currentWallpaper.image);

        if (window.Android && window.Android.setWallpaper) {
            window.Android.setWallpaper(image);
        } else {
            alert("هذه الميزة تعمل بعد تثبيت WallpaperHub كتطبيق Android");
        }
    };
}

// ===============================
// AI Analysis
// ===============================
async function autoAnalyzeWallpaper() {
    if (!currentWallpaper return;

    if (currentWallpaper.aiDescription) {
        if (wallDescription) {
            wallDescription.textContent = currentWallpaper.aiDescription;
        }
        return;
    }

    try {
        const res = await fetch(`API/{API}/API/{currentWallpaper.id}/analyze`, {   // ✅ إصلاحابط
            method: "POST"
        });

        const data = await res.json();

        if (data.success) {
            currentWallpaper.aiDescription = data.description;
            if (wallDescription) {
                wallDescription.textContent = data.description;
            }
        }
    } catch (error) {
        console.log("AI ANALYSIS ERROR", error);
    }
}

// ===============================
// Back Button
// ===============================
const backBtn = document.getElementById("backBtn");

if (backBtn) {
    backBtn.onclick = () => {
        history.back();
    };
}

// ===============================
// Comments System
// ===============================
const commentInput = document.getElementById("commentInput");
const sendCommentBtn = document.getElementById("sendCommentBtn");
const commentsContainer = document.getElementById("commentsContainer");
const commentsCountBadge = document.getElementById("CountBadge");

let loadingComments = false;
let sendingComment = false;

// ---------- Load Comments ----------
async function loadComments() {
    if (loadingComments || !commentsContainer || !currentWallpaper) return;

    loadingComments = true;

    try {
        const response = await fetch(
            `API/{API}/API/{currentWallpaper.id}/comments`   // ✅ إصلاح الرابط
        );

        const comments = await response.json();
        if (!Array.isArray(comments)) return;

        if (commentsCountBadge) {
            commentsCountBadge.textContent = `${comments.length} تعليقات`;
        }

        commentsContainer.innerHTML = "";

        if (comments.length === 0) {
            commentsContainer.innerHTML = `
                <div class="no-comments">
                    لا توجد تعليقات بعد، كن أول من يعلق!
                </div>
            `;
            return;
        }

        [...comments].reverse().forEach(comment => {
            const card = document.createElement("div");
            card.className = "comment-card";
            card.innerHTML = `
                <div class="user-avatar">
                    ${(comment.user || "م").charAt(0)}
                </div>
                <div classcomment-content">
                    <b>${comment.user || "مستخدم"}</b>
                    <p>${comment.text || ""}</p>
                </div>
            `;
            commentsContainer.appendChild(card);
        });
    } catch (error) {
        console.error("LOAD COMMENTS ERROR", error);
    } finally {
        loadingComments = false;
    }
}

// ---------- Send Comment ----------
if (sendCommentBtn && commentInput) {
    sendCommentBtn.onclick = async () {
        if (sendingComment || !currentWallpaper) return;

        const text = commentInput.value.trim();
        if (!text) return;

        try {
            sendingComment = true;
            sendCommentBtn.disabled = true;

            const response = await fetch(
                `API/{API}/API/{currentWallpaper.id}/comments`,   // ✅ إصلا الرابط
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user: "مستخدم",
                        text: text
                    })
                }
            );

            const result = await response.json();

            if (result.success) {
                commentInput.value = "";
                await loadComments();
            }
        } catch (error) {
            console.error("SEND COMMENT ERROR", error);
        } finally {
            sendingComment = false;
            sendCommentBtn.disabled = false;
        }
    };
}

// ===============================
// Start
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    loadWallpaper();
});
