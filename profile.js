/* ===================================================
   WallpaperHub Profile JS - FIXED VERSION
   Part 1/2
=================================================== */


/* ==========================
   Firebase
========================== */

import { auth } from "./firebase.js";

import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

console.log("WallpaperHub Profile Loaded");


/* ==========================
   Provider
========================== */

const provider = new GoogleAuthProvider();


/* ==========================
   User State
========================== */

let currentUser = null;
let userUID = "";
let uidVisible = false;


/* ==========================
   DOM Elements
========================== */

const loginBtn      = document.getElementById("loginBtn");
const userName      = document.getElementById("userName");
const userEmail     = document.getElementById("userEmail");
const userAvatar    = document.getElementById("userAvatar");
const infoUserName  = document.getElementById("infoUserName");
const infoUserEmail = document.getElementById("infoUserEmail");
const accountType   = document.getElementById("accountType");
const joinDateEl    = document.getElementById("joinDate");
const lastLoginEl   = document.getElementById("lastLogin");

const downloadedContainer = document.getElementById("downloadedWallpapers");
const likedContainer      = document.getElementById("likedWallpapers");
const viewedContainer     = document.getElementById("viewedWallpapers");

const uidText   = document.getElementById("userUid");
const toggleUid = document.getElementById("toggleUid");
const copyUid   = document.getElementById("copyUid");

const editProfileBtn = document.getElementById("editProfileBtn");
const editModal      = document.getElementById("editModal");
const closeEditBtn   = document.getElementById("closeEditBtn");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const editName       = document.getElementById("editName");
const avatarInput    = document.getElementById("avatarInput");
const coverInput     = document.getElementById("coverInput");
const changeAvatarBtn = document.getElementById("changeAvatarBtn");
const coverImage      = document.getElementById("coverImage"); // ✅ إصلاح: كان غير معرّف


/* ==========================
   Update Login Button
========================== */

function updateLoginState(user) {
    if (!loginBtn) return;

    if (user) {
        loginBtn.innerHTML = `<span class="material-icons">logout</span>`;
    } else {
        loginBtn.innerHTML = `<span class="material-icons">person</span>`;
    }
}


/* ==========================
   Firebase Listener - SINGLE LISTENER (مدمج)
========================== */

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateLoginState(user);

    if (user) {

        // ============================
        // تسجيل الدخول - حفظ البيانات
        // ============================

        localStorage.setItem("userName", user.displayName || "مستخدم");
        localStorage.setItem("userEmail", user.email || "");
        localStorage.setItem("userAvatar", user.photoURL || "");
        localStorage.setItem("lastLogin", new Date().toLocaleString("ar-MA"));

        // ✅ إصلاح: تاريخ الانضمام يُحفظ مرة واحدة فقط
        if (!localStorage.getItem("joinDate")) {
            localStorage.setItem("joinDate", new Date().toLocaleDateString("ar-MA"));
        }

        userUID = user.uid;
        if (uidText) uidText.textContent = "••••••••••••••";

        // ============================
        // تحديث الواجهة - البيانات الشخصية
        // ============================

        if (userName)      userName.textContent = user.displayName || "مستخدم";
        if (userEmail)     userEmail.textContent = user.email || "غير مسجل";
        if (infoUserName)  infoUserName.textContent = user.displayName || "مستخدم";
        if (infoUserEmail) infoUserEmail.textContent = user.email || "غير مسجل";
        if (accountType)   accountType.textContent = "حساب Google";

        if (joinDateEl)  joinDateEl.textContent = localStorage.getItem("joinDate") || "-";
        if (lastLoginEl) lastLoginEl.textContent = localStorage.getItem("lastLogin") || "-";

        if (userAvatar && user.photoURL) {
            userAvatar.src = user.photoURL;
        }

        // ============================
        // تحديث الإحصائيات + تحميل الخلفيات
        // ============================

        updateUserStats();
        loadWallpapers();

        const downloads = getList("downloads");
        console.log("✅ تم تسجيل الدخول واستعادة البيانات:");
        console.log("📥 تحميلات:", downloads.length);

    } else {

        // ============================
        // تسجيل الخروج - تصفير كل شيء
        // ============================

        resetGuestProfile();
    }
});

/* ===================================================
   WallpaperHub Profile JS - FIXED VERSION
   Part 2/2
=================================================== */


/* ==========================
   Reset Guest Profile - FULL RESET
========================== */

function resetGuestProfile() {

    // 1. تصفير النصوص
    const textElements = {
        "userName":      "زائر",
        "userEmail":     "غير مسجل",
        "infoUserName":  "زائر",
        "infoUserEmail": "غير مسجل",
        "accountType":   "زائر",
        "joinDate":      "-",
        "lastLogin":     "-"
    };

    Object.keys(textElements).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = textElements[id];
    });

    // 2. تصفير UID
    userUID = "";
    if (uidText) uidText.textContent = "••••••••••••••";

    // 3. تصفير الإحصائيات
    ["downloadCount", "likeCount", "viewCount"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "0";
    });

    // 4. تصفير الصورة الشخصية
    if (userAvatar) userAvatar.src = "assets/images/user.png";

    // 5. تصفير الخلفيات المعروضة
    ["downloadedWallpapers", "likedWallpapers", "viewedWallpapers"].forEach(id => {
        const container = document.getElementById(id);
        if (container) container.innerHTML = '<div class="empty-profile">لا توجد خلفيات حاليا</div>';
    });

    // 6. تنظيف localStorage (بدون joinDate حتى لا يُفقد تاريخ الانضمام)
    const userKeys = [
        "userName",
        "userEmail",
        "userAvatar",
        "lastLogin",
        "downloads",
        "favorites",
        "views",
        "userData"
    ];
    userKeys.forEach(key => localStorage.removeItem(key));

    console.log("👋 تم تسجيل الخروج وتصفير البيانات");
}


/* ==========================
   Login / Logout Button
========================== */

if (loginBtn) {
    loginBtn.onclick = async () => {
        try {
            if (currentUser) {
                await signOut(auth);
                location.reload();
                return;
            }

            await signInWithPopup(auth, provider);

        } catch (error) {
            console.error("AUTH ERROR", error);
            alert("حدث خطأ في تسجيل الدخول");
        }
    };
}


/* ===================================================
   UID Buttons
=================================================== */

// زر إظهار/إخفاء UID
if (toggleUid) {
    toggleUid.onclick = () => {
        uidVisible = !uidVisible;

        if (uidVisible) {
            uidText.textContent = userUID || "لا يوجد UID";
            toggleUid.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>`;
            toggleUid.title = "إخفاء UID";
        } else {
            uidText.textContent = "••••••••••••••";
            toggleUid.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>`;
            toggleUid.title = "إظهار UID";
        }
    };
}

// زر نسخ UID
if (copyUid) {
    copyUid.onclick = async () => {
        if (!userUID) {
            showToast("⚠️ لا يوجد UID لتنسخه", "#ff3b30", true);
            return;
        }

        try {
            await navigator.clipboard.writeText(userUID);
            showToast("تم نسخ UID بنجاح ✅", "#34c759", false, true);

        } catch (error) {
            console.error("نسخ UID فشل:", error);
            alert("❌ فشل نسخ UID");
        }
    };
}

// رسائل Toast أنيقة
function showToast(message, color, plainText = false, withCheck = false) {
    const toast = document.createElement("div");
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: ${color};
        color: white;
        padding: 12px 24px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 8px 30px ${color}66;
        z-index: 9999;
        animation: fadeInUp 0.3s ease;
        direction: rtl;`;

    if (withCheck) {
        toast.innerHTML = `
            <span style="display:flex;align-items:center;gap:8px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                ${message}
            </span>`;
    } else {
        toast.textContent = message;
    }

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.3s";
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// أنيميشن fadeInUp
const animStyle = document.createElement("style");
animStyle.textContent = `
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }`;
document.head.appendChild(animStyle);


/* ===================================================
   Wallpapers + Statistics
=================================================== */

const API = "/api/wallpapers";
let wallpapers = [];


/* ==========================
   Local Data Helpers
========================== */

function getList(key) {
    return JSON.parse(localStorage.getItem(key) || "[]");
}


/* ==========================
   Load Wallpapers
========================== */

async function loadWallpapers() {
    try {
        const res = await fetch(API);
        wallpapers = await res.json();
        renderProfile();
    } catch (error) {
        console.log("Wallpapers Error", error);
    }
}


/* ==========================
   Render Profile
========================== */

function renderProfile() {
    const downloads = getList("downloads");
    const likes = getList("favorites");
    const views = getList("views");

    setStat("downloadCount", downloads.length);
    setStat("likeCount", likes.length);
    setStat("viewCount", views.length);

    renderWalls(downloadedContainer, downloads);
    renderWalls(likedContainer, likes);
    renderWalls(viewedContainer, views);
}

function setStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function updateUserStats() {
    setStat("downloadCount", getList("downloads").length);
    setStat("likeCount", getList("favorites").length);
    setStat("viewCount", getList("views").length);
}


/* ==========================
   Sync User Stats (Global)
========================== */

window.syncUserStats = function(type, id) {
    let list = getList(type);
    if (!list.includes(String(id))) {
        list.push(String(id));
        localStorage.setItem(type, JSON.stringify(list));
        console.log(`✅ ${type}:`, list.length);
    }
};


/* ==========================
   Render Cards
========================== */

function renderWalls(container, ids) {

    if (!container) return;

    container.innerHTML = "";

    if (ids.length === 0) {
        container.innerHTML = `<div class="empty-profile">لا توجد خلفيات حاليا</div>`;
        return;
    }

    let foundAny = false;

    ids.forEach(id => {
        const wall = wallpapers.find(item => String(item.id) === String(id));
        if (!wall) return;

        foundAny = true;

        const card = document.createElement("div");
        card.className = "profile-wall-card";

        card.innerHTML = `
            <img src="wall.thumbnail∣∣wall.image"alt="{wall.thumbnail || wall.image}" alt="wall.thumbnail∣∣wall.image"alt="{wall.title || ""}">
            <div class="profile-wall-info">
                <h3>${wall.title || "بدون اسم"}</h3>
            </div>`;

        card.onclick = () => {
            location.href = "wallpaper.html?id=" + wall.id;
        };

        container.appendChild(card);
    });

    // إذا لم نجد أي خلفية مطابقة في الـ API
    if (!foundAny) {
        container.innerHTML = `<div class="empty-profile">لا توجد خلفيات حاليا</div>`;
    }
}


/* ===================================================
   Edit Profile Modal
=================================================== */

if (editProfileBtn) {
    editProfileBtn.onclick = () => {
        if (editModal) editModal.classList.add("show");
        if (editName && userName) editName.value = userName.textContent;
    };
}

if (closeEditBtn) {
    closeEditBtn.onclick = () => {
        if (editModal) editModal.classList.remove("show");
    };
}

if (saveProfileBtn) {
    saveProfileBtn.onclick = () => {
        const name = editName.value.trim();

        if (name) {
            localStorage.setItem("userName", name);
            if (userName) userName.textContent = name;
            if (infoUserName) infoUserName.textContent = name;
        }

        if (editModal) editModal.classList.remove("show");
    };
}


/* ==========================
   Image Reader
========================== */

function readImage(file, callback) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => callback(reader.result);
    reader.readAsDataURL(file);
}


/* ==========================
   Avatar Upload
========================== */

if (changeAvatarBtn && avatarInput) {
    changeAvatarBtn.onclick = () => avatarInput.click();
}

if (avatarInput) {
    avatarInput.onchange = () => {
        const file = avatarInput.files[0];
        readImage(file, (src) => {
            if (userAvatar) userAvatar.src = src;
            localStorage.setItem("userAvatar", src);
        });
    };
}


/* ==========================
   Cover Upload
========================== */

if (coverInput) {
    coverInput.onchange = () => {
        const file = coverInput.files[0];
        readImage(file, (src) => {
            if (coverImage) coverImage.src = src;  // ✅ إصلاح: كان ReferenceError
            localStorage.setItem("userCover", src);
        });
    };
}


/* ===================================================
   Start App
=================================================== */

document.addEventListener("DOMContentLoaded", () => {
    loadWallpapers();
    updateUserStats();
});
