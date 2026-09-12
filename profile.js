/* ===================================================
   WallpaperHub Profile JS
   Part 1/4
=================================================== */


/* ==========================
   Firebase
========================== */


import { supabase } from "./supabase.js";





console.log(
"WallpaperHub Profile Loaded"
);





/* ==========================
   Provider
========================== */


// Google OAuth is configured in Supabase Auth.






/* ==========================
   User State
========================== */


let currentUser = null;


/* ===================================================
   Supabase User Cloud Sync
   المصدر الدائم لبيانات المستخدم عبر الأجهزة
   =================================================== */
const USER_SYNC_TABLE = "user_profile_sync";

function normalizeActionList(value){
    if(!Array.isArray(value)) return [];
    return [...new Set(value
        .map(item => {
            if(item && typeof item === "object"){
                return item.id ?? item.wallpaperId ?? item.wallpaper_id ?? item.wallId ?? null;
            }
            return item;
        })
        .filter(id => id !== null && id !== undefined && String(id).trim() !== "")
        .map(String)
    )];
}

function getLocalSyncData(){
    const read = key => {
        try { return JSON.parse(localStorage.getItem(key) || "[]"); }
        catch { return []; }
    };

    return {
        full_name: localStorage.getItem("userName") || "",
        username: localStorage.getItem("username") || "",
        avatar_url: localStorage.getItem("userAvatar") || "",
        cover_url: localStorage.getItem("userCover") || "",
        bio: localStorage.getItem("profileBio") || "",
        join_date: localStorage.getItem("joinDate") || "",
        favorite_ids: normalizeActionList(read("favorites")),
        download_ids: normalizeActionList(read("downloads")),
        view_ids: normalizeActionList(read("views"))
    };
}

function applyCloudUserData(data){
    if(!data) return;

    const setIfPresent = (key, value) => {
        if(value !== null && value !== undefined && String(value) !== ""){
            localStorage.setItem(key, String(value));
        }
    };

    setIfPresent("userName", data.full_name);
    setIfPresent("username", data.username);
    setIfPresent("userAvatar", data.avatar_url);
    setIfPresent("userCover", data.cover_url);
    setIfPresent("profileBio", data.bio);
    setIfPresent("joinDate", data.join_date);

    [
        ["favorites", data.favorite_ids],
        ["downloads", data.download_ids],
        ["views", data.view_ids]
    ].forEach(([key, value]) => {
        if(Array.isArray(value)){
            localStorage.setItem(key, JSON.stringify(normalizeActionList(value)));
        }
    });
}

function mergeSyncData(cloud, local){
    const merged = { ...(cloud || {}) };
    const textFields = ["full_name","username","avatar_url","cover_url","bio","join_date"];

    textFields.forEach(key => {
        if((!merged[key] || String(merged[key]).trim() === "") && local[key]){
            merged[key] = local[key];
        }
    });

    ["favorite_ids","download_ids","view_ids"].forEach(key => {
        merged[key] = normalizeActionList([
            ...(Array.isArray(cloud?.[key]) ? cloud[key] : []),
            ...(Array.isArray(local?.[key]) ? local[key] : [])
        ]);
    });

    return merged;
}

async function loadCloudUserData(user, options = {}){
    if(!user?.id || (isPublicProfile && !isOwnProfile())) return null;

    try{
        const { data: cloud, error } = await supabase
            .from(USER_SYNC_TABLE)
            .select("user_id,full_name,username,avatar_url,cover_url,bio,join_date,favorite_ids,download_ids,view_ids")
            .eq("user_id", user.id)
            .maybeSingle();

        if(error) throw error;

        const local = getLocalSyncData();
        const merged = mergeSyncData(cloud, local);

        applyCloudUserData(merged);

        const shouldWrite = !cloud || options.forceWrite || JSON.stringify(merged) !== JSON.stringify(cloud);
        if(shouldWrite){
            await saveCloudUserData(user, merged);
        }

        if(user.email) localStorage.setItem("userEmail", user.email);
        if(merged.cover_url && coverImage) coverImage.src = merged.cover_url;
        if(merged.bio && heroBio) heroBio.textContent = merged.bio;

        updateHeroIdentity(user, merged.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "مستخدم");
        return merged;
    }catch(error){
        console.error("USER CLOUD LOAD ERROR:", error);
        return null;
    }
}

async function saveCloudUserData(user, data = getLocalSyncData()){
    if(!user?.id || (isPublicProfile && !isOwnProfile())) return false;

    const payload = {
        user_id: user.id,
        full_name: data.full_name || "",
        username: data.username || "",
        avatar_url: data.avatar_url || "",
        cover_url: data.cover_url || "",
        bio: data.bio || "",
        join_date: data.join_date || "",
        favorite_ids: normalizeActionList(data.favorite_ids),
        download_ids: normalizeActionList(data.download_ids),
        view_ids: normalizeActionList(data.view_ids)
    };

    try{
        const { error } = await supabase
            .from(USER_SYNC_TABLE)
            .upsert(payload, { onConflict:"user_id" });

        if(error) throw error;
        return true;
    }catch(error){
        console.error("USER CLOUD SAVE ERROR:", error);
        return false;
    }
}

async function syncCloudAction(type, id){
    if(!currentUser?.id || id === null || id === undefined) return;

    const keyMap = {
        favorites:"favorite_ids",
        favorite:"favorite_ids",
        likes:"favorite_ids",
        like:"favorite_ids",
        downloads:"download_ids",
        download:"download_ids",
        views:"view_ids",
        view:"view_ids"
    };
    const key = keyMap[String(type).toLowerCase()];
    if(!key) return;

    try{
        const { data: cloud } = await supabase
            .from(USER_SYNC_TABLE)
            .select("user_id,full_name,username,avatar_url,cover_url,bio,join_date,favorite_ids,download_ids,view_ids")
            .eq("user_id", currentUser.id)
            .maybeSingle();

        const local = getLocalSyncData();
        const merged = mergeSyncData(cloud, local);
        const value = String(id);

        merged[key] = normalizeActionList([...(merged[key] || []), value]);
        applyCloudUserData(merged);
        await saveCloudUserData(currentUser, merged);
        updateUserStats();
        renderProfile();
    }catch(error){
        console.error("USER CLOUD ACTION SYNC ERROR:", error);
    }
}

window.syncCloudUserAction = syncCloudAction;

// ==========================
// Public Profile Mode
// ==========================
// إذا كان هناك uid في الرابط فهذا بروفايل مستخدم آخر/عام.
const profileTargetUID = String(
    new URLSearchParams(window.location.search).get("uid") || ""
).trim();

const isPublicProfile = Boolean(profileTargetUID);
let publicProfileLoaded = false;

function isOwnProfile(){
    if(!isPublicProfile) return true;
    return Boolean(currentUser?.id && String(currentUser.id) === profileTargetUID);
}

function hideOwnerEditControls(){
    const ids = [
        "editProfileBtn",
        "changeAvatarBtn",
        "changeCoverBtn",
        "avatarInput",
        "coverInput"
    ];

    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = "none";
    });
}

function showOwnerEditControls(){
    const editBtn = document.getElementById("editProfileBtn");
    const avatarBtn = document.getElementById("changeAvatarBtn");

    if(editBtn) editBtn.style.display = "";
    if(avatarBtn) avatarBtn.style.display = "";
}

async function loadPublicProfile(uid){
    const targetUID = String(uid || "").trim();
    if(!targetUID) return;

    // منع استدعاءات متكررة من Auth + DOMContentLoaded.
    if(publicProfileLoaded === targetUID) return;

    hideOwnerEditControls();

    try{
        let profile = null;

        // ==================================================
        // المصدر الأول: السيرفر (Service Role)
        // مهم لأن RLS قد يمنع المتصفح من قراءة profiles مباشرة.
        // ==================================================
        try{
            const response = await fetch(
                `/api/users/${encodeURIComponent(targetUID)}/profile`,
                { cache:"no-store" }
            );

            if(response.ok){
                const payload = await response.json();
                if(payload?.success && payload?.user){
                    profile = payload.user;
                }
            }
        }catch(serverError){
            console.warn("PUBLIC PROFILE SERVER LOAD:", serverError);
        }

        // ==================================================
        // المصدر الثاني: Supabase مباشرة كاحتياطي.
        // ==================================================
        if(!profile){
            try{
                const { data, error } = await supabase
                    .from("profiles")
                    .select("id, full_name, username, avatar_url")
                    .eq("id", targetUID)
                    .maybeSingle();

                if(!error && data){
                    profile = data;
                }else if(error){
                    console.warn("PUBLIC PROFILE SUPABASE LOAD:", error.message);
                }
            }catch(supabaseError){
                console.warn("PUBLIC PROFILE SUPABASE ERROR:", supabaseError);
            }
        }

        if(!profile){
            if(userName) userName.textContent = "المستخدم غير موجود";
            if(userEmail) userEmail.textContent = "";
            if(infoUserName) infoUserName.textContent = "المستخدم غير موجود";
            if(infoUserEmail) infoUserEmail.textContent = "";
            if(accountType) accountType.textContent = "ملف عام";
            if(uidText) uidText.textContent = "••••••••••••••";
            userUID = targetUID;
            return;
        }

        const name = String(
            profile.full_name ||
            profile.username ||
            "مستخدم WallpaperHub"
        ).trim();

        const avatar = String(
            profile.avatar_url ||
            profile.avatar ||
            profile.photoURL ||
            ""
        ).trim();

        // الغلاف العام: نستخدم غلاف صاحب البروفايل القادم من المصدر العام،
        // ولا نستخدم userCover الموجود في جهاز الزائر.
        const publicCover = String(
            profile.cover_url ||
            profile.cover ||
            ""
        ).trim();

        if(coverImage){
            if(publicCover){
                coverImage.src = publicCover;
            }else{
                coverImage.removeAttribute("src");
            }
        }

        // عرض بيانات UID الموجود في الرابط فقط.
        if(userName) userName.textContent = name;
        if(infoUserName) infoUserName.textContent = name;
        if(userEmail) userEmail.textContent = "البريد الإلكتروني مخفي";
        if(infoUserEmail) infoUserEmail.textContent = "البريد الإلكتروني مخفي";
        if(accountType) accountType.textContent = "ملف عام";
        if(joinDate) joinDate.textContent = "—";
        if(lastLogin) lastLogin.textContent = "—";

        updateHeroIdentity(null, name);
        if(heroUsername){
            const publicUsername = String(profile.username || "").trim().replace(/^@+/, "");
            heroUsername.textContent = "@" + (publicUsername || "user");
        }
        if(heroBio){
            heroBio.textContent =
                String(profile.bio || "مصمم خلفيات ومحب للتصميم ✨").trim();
        }
        if(heroJoinDate){
            heroJoinDate.textContent =
                String(profile.join_date || profile.created_at || "—").trim();
        }

        if(userAvatar){
            userAvatar.src = avatar || "assets/images/user.png";
            userAvatar.onerror = () => {
                userAvatar.onerror = null;
                userAvatar.src = "assets/images/user.png";
            };
        }

        if(uidText) uidText.textContent = "••••••••••••••";
        userUID = targetUID;
        uidVisible = false;

        ["downloadCount", "likeCount", "viewCount"].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.textContent = "—";
        });

        const response = await fetch(API, { cache:"no-store" });
        if(!response.ok) throw new Error("PUBLIC WALLPAPERS API ERROR");

        const list = await response.json();
        const ownerWalls = Array.isArray(list)
            ? list.filter(w => {
                const owner = String(
                    w.ownerUID || w.userId || w.user_id || ""
                ).trim();
                return owner === targetUID;
            })
            : [];

        wallpapers = ownerWalls;
        updateWallpaperCount(ownerWalls.length);

        const containers = [ownWallpapersContainer, downloadedContainer, likedContainer, viewedContainer];
        containers.forEach(container => {
            if(!container) return;
            container.innerHTML = "";
        });

        if(ownerWalls.length === 0){
            if(ownWallpapersContainer){
                ownWallpapersContainer.innerHTML =
                    '<div class="empty-profile">لا توجد خلفيات منشورة حاليا</div>';
            }
        }else{
            renderWalls(ownWallpapersContainer, ownerWalls.map(w => w.id));
        }

        document.querySelectorAll('.profile-tab[data-profile-tab="favorites"], .profile-tab[data-profile-tab="downloads"], .profile-tab[data-profile-tab="views"]').forEach(tab => {
            tab.style.display = "none";
        });

        publicProfileLoaded = targetUID;
        console.log("✅ PUBLIC PROFILE LOADED:", targetUID);
    }catch(error){
        console.error("PUBLIC PROFILE LOAD ERROR:", error);
    }
}





/* ==========================
   DOM
========================== */


const loginBtn =
document.getElementById(
"loginBtn"
);

const settingsBtn =
document.getElementById(
"settingsBtn"
);

const profileMenuBtn =
document.getElementById(
"profileMenuBtn"
);



const userName =
document.getElementById(
"userName"
);



const userEmail =
document.getElementById(
"userEmail"
);



const userAvatar =
document.getElementById(
"userAvatar"
);

const coverImage =
document.getElementById(
"coverImage"
);







/* ==========================
   Update Login Button
========================== */


function updateLoginState(user){

    if(!loginBtn) return;

    // في البروفايل العام لشخص آخر لا نعرض زر تسجيل الدخول/الخروج.
    // هذا الزر يخص صاحب الجلسة الحالية، وليس صاحب البروفايل الذي تتم مشاهدته.
    if(isPublicProfile && !isOwnProfile()){
        loginBtn.style.display = "none";
        loginBtn.setAttribute("aria-hidden", "true");
        loginBtn.setAttribute("tabindex", "-1");
        return;
    }

    // في الحساب الشخصي نعيد إظهار الزر بشكل طبيعي.
    loginBtn.style.display = "";
    loginBtn.removeAttribute("aria-hidden");
    loginBtn.removeAttribute("tabindex");

    if(user){
        loginBtn.innerHTML = `
            <span class="material-icons">
                logout
            </span>
        `;
    }else{
        loginBtn.innerHTML = `
            <span class="material-icons">
                person
            </span>
        `;
    }
}








/* ==========================
   Supabase Auth Listener - WITH FULL DATA RESTORE
========================== */

supabase.auth.onAuthStateChange(async (event, session) => {
    const user = session?.user ?? null;
    currentUser = user;
    updateLoginState(user);

    // بروفايل عام: لا نستخدم localStorage الخاص بالزائر ولا نسمح بالتعديل.
    if (isPublicProfile && !isOwnProfile()) {
        hideOwnerEditControls();
        loadPublicProfile(profileTargetUID);
        return;
    }

    if (user) {
        // استعادة الحساب من Supabase قبل الاعتماد على بيانات المتصفح.
        await loadCloudUserData(user);

        const metadata = user.user_metadata || {};
        const displayName =
            metadata.full_name ||
            metadata.name ||
            user.email?.split("@")[0] ||
            "مستخدم";

        updateHeroIdentity(user, displayName);

        const photoURL =
            metadata.avatar_url ||
            metadata.picture ||
            "";

        localStorage.setItem("userName", displayName);
        localStorage.setItem("userEmail", user.email || "");
        localStorage.setItem("userAvatar", photoURL);
        localStorage.setItem(
            "joinDate",
            localStorage.getItem("joinDate") || new Date().toLocaleDateString("ar-MA")
        );
        localStorage.setItem("lastLogin", new Date().toLocaleString("ar-MA"));

        const userNameEl = document.getElementById("userName");
        if (userNameEl) userNameEl.textContent = displayName;

        const userEmailEl = document.getElementById("userEmail");
        if (userEmailEl) userEmailEl.textContent = user.email || "غير مسجل";

        const infoUserNameEl = document.getElementById("infoUserName");
        if (infoUserNameEl) infoUserNameEl.textContent = displayName;

        const infoUserEmailEl = document.getElementById("infoUserEmail");
        if (infoUserEmailEl) infoUserEmailEl.textContent = user.email || "غير مسجل";

        const accountTypeEl = document.getElementById("accountType");
        if (accountTypeEl) accountTypeEl.textContent = "حساب Google";

        const joinDateEl = document.getElementById("joinDate");
        if (joinDateEl) {
            joinDateEl.textContent =
                localStorage.getItem("joinDate") || new Date().toLocaleDateString("ar-MA");
        }

        const lastLoginEl = document.getElementById("lastLogin");
        if (lastLoginEl) {
            lastLoginEl.textContent =
                localStorage.getItem("lastLogin") || new Date().toLocaleString("ar-MA");
        }

        const avatarEl = document.getElementById("userAvatar");
        if (avatarEl && photoURL) avatarEl.src = photoURL;

        const downloads = JSON.parse(localStorage.getItem("downloads") || "[]");
        const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
        const views = JSON.parse(localStorage.getItem("views") || "[]");

        const downloadCountEl = document.getElementById("downloadCount");
        if (downloadCountEl) downloadCountEl.textContent = downloads.length;

        const likeCountEl = document.getElementById("likeCount");
        if (likeCountEl) likeCountEl.textContent = favorites.length;

        const viewCountEl = document.getElementById("viewCount");
        if (viewCountEl) viewCountEl.textContent = views.length;

        loadWallpapers();

        console.log("✅ تم تسجيل الدخول واستعادة البيانات:");
        console.log("📥 تحميلات:", downloads.length);
        console.log("❤️ إعجابات:", favorites.length);
        console.log("👁️ مشاهدات:", views.length);
    } else {
        resetGuestProfile();
    }
});// استعادة الإحصائيات من localStorage
const downloads = JSON.parse(localStorage.getItem("downloads") || "[]");
const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
const views = JSON.parse(localStorage.getItem("views") || "[]");

document.getElementById("downloadCount").textContent = downloads.length;
document.getElementById("likeCount").textContent = favorites.length;
document.getElementById("viewCount").textContent = views.length;;

/* ==========================
   Reset Guest Profile - FULL RESET
========================== */

function resetGuestProfile() {
    // 1. تصفير النصوص
    const textElements = {
        "userName": "زائر",
        "userEmail": "غير مسجل",
        "infoUserName": "زائر",
        "infoUserEmail": "غير مسجل",
        "accountType": "زائر",
        "joinDate": "-",
        "lastLogin": "-"
    };
    
    Object.keys(textElements).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = textElements[id];
    });

    if(heroDisplayName) heroDisplayName.textContent = "زائر";
    if(heroUsername) heroUsername.textContent = "@user";
    if(heroBio) heroBio.textContent = "مصمم خلفيات ومحب للتصميم ✨";
    if(heroJoinDate) heroJoinDate.textContent = "-";
    
    // 2. تصفير UID
    const uidEl = document.getElementById("userUid");
    if (uidEl) uidEl.textContent = "••••••••••••••";
    
    // 3. تصفير الإحصائيات
    ["downloadCount", "likeCount", "viewCount"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "0";
    });
    
    // 4. تصفير الصورة الشخصية
    const avatar = document.getElementById("userAvatar");
    if (avatar) avatar.src = "assets/images/user.png";
    
    // 5. تصفير الخلفيات المعروضة
    ["ownWallpapers", "downloadedWallpapers", "likedWallpapers", "viewedWallpapers"].forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.innerHTML = '<div class="empty-profile">لا توجد خلفيات حاليا</div>';
        }
    });
    
    // 6. تنظيف localStorage من بيانات المستخدم
    const userKeys = [
        "userName", 
        "userEmail", 
        "userAvatar", 
        "joinDate", 
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
   Login / Logout Button - FIXED
========================== */

if (loginBtn) {
    loginBtn.onclick = async () => {
        try {
            if (currentUser) {
                // ============================
                // تسجيل الخروج من Supabase
                // ============================
                const { error } = await supabase.auth.signOut({ scope: "local" });

                if (error) throw error;

                resetGuestProfile();

                const userKeys = [
                    "joinDate",
                    "lastLogin",
                    "downloads",
                    "favorites",
                    "views",
                    "userName",
                    "userEmail",
                    "userAvatar",
                    "userData"
                ];

                userKeys.forEach(key => localStorage.removeItem(key));

                location.reload();
                return;
            }

            // ============================
            // تسجيل الدخول بواسطة Google عبر Supabase
            // ============================
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: window.location.origin + "/profile.html"
                }
            });

            if (error) throw error;

        } catch (error) {
            console.error("AUTH ERROR", error);
            alert("حدث خطأ في تسجيل الدخول");
        }
    };
}

/* ==========================
   Header Actions
========================== */

// الإعدادات: الزر موجود وجاهز لربطه لاحقاً بصفحة/نافذة الإعدادات.
if (settingsBtn) {
    settingsBtn.onclick = () => {
        console.log("⚙️ Settings button clicked");
    };
}

// الثلاث نقاط: مكان مخصص لقائمة خيارات سنضيفها لاحقاً.
if (profileMenuBtn) {
    profileMenuBtn.onclick = () => {
        console.log("⋮ Profile menu clicked");
    };
}


/* ===================================================
   User Profile Data
   Part 2/4
=================================================== */


/* ==========================
   UID - Professional Style
========================== */

let userUID = "";
let uidVisible = false;

const uidText = document.getElementById("userUid");
const toggleUid = document.getElementById("toggleUid");
const copyUid = document.getElementById("copyUid");

// تحديث UID عند تغيير حالة المستخدم
supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user ?? null;

    // في البروفايل العام، UID المطلوب يأتي من الرابط وليس من الزائر.
    if (isPublicProfile && !isOwnProfile()) {
        userUID = profileTargetUID;
        if (uidText) uidText.textContent = "••••••••••••••";
        return;
    }

    if (user) {
        userUID = user.id;
        if (uidText) uidText.textContent = "••••••••••••••";
    } else {
        userUID = "";
        if (uidText) uidText.textContent = "••••••••••••••";
    }
});

// ============================
// زر إظهار/إخفاء UID (احترافي)
// ============================
if (toggleUid) {
    toggleUid.onclick = () => {
        uidVisible = !uidVisible;
        
        if (uidVisible) {
            // إظهار UID
            uidText.textContent = userUID || "لا يوجد UID";
            toggleUid.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
            `;
            toggleUid.title = "إخفاء UID";
        } else {
            // إخفاء UID
            uidText.textContent = "••••••••••••••";
            toggleUid.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
            `;
            toggleUid.title = "إظهار UID";
        }
    };
}

// ============================
// زر نسخ UID (احترافي)
// ============================
if (copyUid) {
    copyUid.onclick = async () => {
        if (!userUID) {
            // رسالة خطأ أنيقة
            const toast = document.createElement("div");
            toast.style.cssText = `
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: #ff3b30;
                color: white;
                padding: 12px 24px;
                border-radius: 12px;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 8px 30px rgba(255, 59, 48, 0.4);
                z-index: 9999;
                animation: fadeInUp 0.3s ease;
                direction: rtl;
            `;
            toast.textContent = "⚠️ لا يوجد UID لتنسخه";
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.opacity = "0";
                toast.style.transition = "opacity 0.3s";
                setTimeout(() => toast.remove(), 300);
            }, 2500);
            return;
        }
        
        try {
            await navigator.clipboard.writeText(userUID);
            
            // رسالة نجاح أنيقة
            const toast = document.createElement("div");
            toast.style.cssText = `
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: #34c759;
                color: white;
                padding: 12px 24px;
                border-radius: 12px;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 8px 30px rgba(52, 199, 89, 0.4);
                z-index: 9999;
                animation: fadeInUp 0.3s ease;
                direction: rtl;
            `;
            toast.innerHTML = `
                <span style="display:flex;align-items:center;gap:8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    تم نسخ UID بنجاح ✅
                </span>
            `;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.opacity = "0";
                toast.style.transition = "opacity 0.3s";
                setTimeout(() => toast.remove(), 300);
            }, 2500);
            
        } catch (error) {
            console.error("نسخ UID فشل:", error);
            alert("❌ فشل نسخ UID");
        }
    };
}

// ============================
// إضافة أنيميشن fadeInUp
// ============================
const style = document.createElement("style");
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
`;
document.head.appendChild(style);


/* ==========================
   Profile Elements
========================== */


const infoUserName =
document.getElementById(
"infoUserName"
);



const infoUserEmail =
document.getElementById(
"infoUserEmail"
);



const accountType =
document.getElementById(
"accountType"
);



const joinDate =
document.getElementById(
"joinDate"
);



const lastLogin =
document.getElementById(
"lastLogin"
);

// ==========================
// New Profile Identity UI
// ==========================
const heroDisplayName = document.getElementById("heroDisplayName");
const heroUsername = document.getElementById("heroUsername");
const heroBio = document.getElementById("heroBio");
const heroJoinDate = document.getElementById("heroJoinDate");
const heroEditProfileBtn = document.getElementById("heroEditProfileBtn");

function getHeroUsername(name, user){
    const metadata = user?.user_metadata || {};
    const username =
        metadata.username ||
        metadata.user_name ||
        localStorage.getItem("username") ||
        "";

    if(String(username).trim()){
        return "@" + String(username).trim().replace(/^@+/, "");
    }

    const fallback = String(name || "user").trim()
        .toLowerCase()
        .replace(/\s+/g, "");
    return "@" + (fallback || "user");
}

function getHeroBio(user){
    const metadata = user?.user_metadata || {};
    return String(
        metadata.bio ||
        localStorage.getItem("profileBio") ||
        "مصمم خلفيات ومحب للتصميم ✨"
    ).trim();
}

function updateHeroIdentity(user, name){
    const displayName = String(name || "زائر").trim();

    if(heroDisplayName) heroDisplayName.textContent = displayName;
    if(heroUsername) heroUsername.textContent = getHeroUsername(displayName, user);
    if(heroBio) heroBio.textContent = getHeroBio(user);

    if(heroJoinDate){
        const savedJoinDate = localStorage.getItem("joinDate");
        heroJoinDate.textContent =
            savedJoinDate ||
            (user?.created_at
                ? new Date(user.created_at).toLocaleDateString("ar-MA", {
                    year:"numeric",
                    month:"long"
                })
                : "-");
    }
}

if(heroEditProfileBtn){
    heroEditProfileBtn.onclick = () => {
        const originalEditBtn = document.getElementById("editProfileBtn");
        if(originalEditBtn) originalEditBtn.click();
    };
}









/* ==========================
   Load User Data
========================== */


function loadUserData(){

    // عند فتح بروفايل مستخدم آخر، ممنوع تحميل بيانات الزائر
    // من localStorage لأنها كانت تستبدل بروفايل صاحب UID الموجود في الرابط.
    if (isPublicProfile && !isOwnProfile()) {
        return;
    }


const name =

localStorage.getItem(
"userName"
)
||
"زائر";




const email =

localStorage.getItem(
"userEmail"
)
||
"غير مسجل";




const avatar =

localStorage.getItem(
"userAvatar"
);

const cover =
localStorage.getItem(
"userCover"
);







if(userName)

userName.textContent =
name;




if(userEmail)

userEmail.textContent =
email;





if(userAvatar)

userAvatar.src =
avatar ||
"assets/images/user.png";

if(coverImage && cover)

coverImage.src = cover;







if(infoUserName)

infoUserName.textContent =
name;





if(infoUserEmail)

infoUserEmail.textContent =
email;







if(email !== "غير مسجل"){


if(accountType)

accountType.textContent =
"حساب Google";


}else{


if(accountType)

accountType.textContent =
"زائر";


}






let join =

localStorage.getItem(
"joinDate"
);





if(joinDate)

joinDate.textContent =
join ||
"-";





if(lastLogin)

lastLogin.textContent =
new Date()
.toLocaleString(
"ar-MA"
);



}

/* ===================================================
   Wallpapers + Statistics
   Part 3/4
=================================================== */


/* ==========================
   API
========================== */


const API =
"/api/wallpapers";



let wallpapers = [];







/* ==========================
   Containers
========================== */


const ownWallpapersContainer = document.getElementById("ownWallpapers");

const downloadedContainer =
document.getElementById(
"downloadedWallpapers"
);



const likedContainer =
document.getElementById(
"likedWallpapers"
);



const viewedContainer =
document.getElementById(
"viewedWallpapers"
);






const downloadCount =
document.getElementById(
"downloadCount"
);



const likeCount =
document.getElementById(
"likeCount"
);



const viewCount =
document.getElementById(
"viewCount"
);








/* ==========================
   Local Data
========================== */


function getList(key){
    try{
        const raw = JSON.parse(localStorage.getItem(key) || "[]");
        if(!Array.isArray(raw)) return [];

        return raw
            .map(item => {
                if(item && typeof item === "object"){
                    return item.id ?? item.wallpaperId ?? item.wallpaper_id ?? item.wallId ?? null;
                }
                return item;
            })
            .filter(id => id !== null && id !== undefined && String(id).trim() !== "")
            .map(id => String(id));
    }catch(error){
        console.warn("PROFILE LIST READ ERROR:", key, error);
        return [];
    }
}








function clearUserStats(){


localStorage.removeItem(
"downloads"
);


localStorage.removeItem(
"favorites"
);


localStorage.removeItem(
"views"
);


}








/* ==========================
   Wallpaper count
========================== */

function updateWallpaperCount(count){
    const value = Number.isFinite(Number(count)) ? Number(count) : 0;

    const countEl = document.getElementById("wallpaperCount");
    if(countEl) countEl.textContent = value;

    const headingEl = document.getElementById("wallpaperHeadingCount");
    if(headingEl) headingEl.textContent = value;
}


/* ==========================
   Load Wallpapers
========================== */


async function loadWallpapers(){


try{


const res =
await fetch(API);



wallpapers =
await res.json();



renderProfile();



}

catch(error){


console.log(
"Wallpapers Error",
error
);


}



}



/* ==========================
   Render Statistics
========================== */

function renderProfile() {
    const downloads = getList("downloads");
    const likes = getList("favorites");
    const views = getList("views");

    const ownUID = String(currentUser?.id || "").trim();
    const ownWalls = ownUID
        ? wallpapers.filter(w => {
            const owner = String(
                w.ownerUID || w.userId || w.user_id || w.owner_id || ""
            ).trim();
            return owner === ownUID;
        })
        : [];

    const downloadCountEl = document.getElementById("downloadCount");
    if(downloadCountEl) downloadCountEl.textContent = downloads.length;

    const likeCountEl = document.getElementById("likeCount");
    if(likeCountEl) likeCountEl.textContent = likes.length;

    const viewCountEl = document.getElementById("viewCount");
    if(viewCountEl) viewCountEl.textContent = views.length;

    updateWallpaperCount(ownWalls.length);
    renderWalls(ownWallpapersContainer, ownWalls.map(w => w.id));
    renderWalls(downloadedContainer, downloads);
    renderWalls(likedContainer, likes);
    renderWalls(viewedContainer, views);

    updateUserStats();
}

/* ==========================
   Update User Stats (after download/like/view)
========================== */

function updateUserStats() {
    const downloads = JSON.parse(localStorage.getItem("downloads") || "[]");
    const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
    const views = JSON.parse(localStorage.getItem("views") || "[]");
    
    document.getElementById("downloadCount").textContent = downloads.length;
    document.getElementById("likeCount").textContent = favorites.length;
    document.getElementById("viewCount").textContent = views.length;
    const ownUID = String(currentUser?.id || "").trim();
    const ownWalls = ownUID
        ? wallpapers.filter(w => String(w.ownerUID || w.userId || w.user_id || w.owner_id || "").trim() === ownUID)
        : [];
    updateWallpaperCount(ownWalls.length);
}

/* ==========================
   Sync User Stats (Global)
========================== */

window.syncUserStats = function(type, id) {
    if(id === null || id === undefined || String(id).trim() === "") return;

    const allowed = {
        like: "favorites",
        likes: "favorites",
        favorite: "favorites",
        favorites: "favorites",
        download: "downloads",
        downloads: "downloads",
        view: "views",
        views: "views"
    };

    const key = allowed[String(type).toLowerCase()] || String(type);
    const list = getList(key);
    const value = String(id);

    if(!list.includes(value)){
        list.push(value);
        localStorage.setItem(key, JSON.stringify(list));
    }

    updateUserStats();
    renderProfile();
    syncCloudAction(key, value);
    window.dispatchEvent(new CustomEvent("wallpaperStatsChanged", {
        detail:{ type:key, id:value }
    }));
};

/* ==========================
   Render Cards
========================== */


function renderWalls(
container,
ids
){



if(!container)

return;




container.innerHTML = "";




if(ids.length===0){


container.innerHTML = `

<div class="empty-profile">

لا توجد خلفيات حاليا

</div>

`;


return;


}





ids.forEach(id=>{


const wall =

wallpapers.find(

item =>

String(item.id)
===
String(id)

);




if(!wall)

return;





const card =
document.createElement(
"div"
);



card.className =
"profile-wall-card";



card.innerHTML = `

<img src="${
    wall.thumbnail ||
    wall.image
}">

`;



card.onclick = ()=>{


location.href =
"wallpaper.html?id="
+
wall.id;


};



container.appendChild(card);



});



}

/* ===================================================
   Edit Profile + Start
   Part 4/4
=================================================== */


/* ==========================
   Edit Elements
========================== */


const editProfileBtn =
document.getElementById(
"editProfileBtn"
);


const editModal =
document.getElementById(
"editModal"
);


const closeEditBtn =
document.getElementById(
"closeEditBtn"
);


const saveProfileBtn =
document.getElementById(
"saveProfileBtn"
);


const editName =
document.getElementById(
"editName"
);


const avatarInput =
document.getElementById(
"avatarInput"
);


const coverInput =
document.getElementById(
"coverInput"
);

const changeCoverBtn =
document.getElementById("changeCoverBtn");

if(changeCoverBtn && coverInput){
    changeCoverBtn.onclick = ()=>{
        if(!isOwnProfile()) return;
        coverInput.click();
    };
}


const changeAvatarBtn =
document.getElementById(
"changeAvatarBtn"
);





/* ==========================
   Open Edit
========================== */


if(editProfileBtn){


editProfileBtn.onclick = ()=>{

if(!isOwnProfile()){
    hideOwnerEditControls();
    return;
}

if(editModal)

editModal.classList.add(
"show"
);



if(editName)

editName.value =
(heroDisplayName?.textContent || infoUserName?.textContent || "");



};


}








/* ==========================
   Close Edit
========================== */


if(closeEditBtn){


closeEditBtn.onclick = ()=>{


if(editModal)

editModal.classList.remove(
"show"
);


};


}








/* ==========================
   Save Name
========================== */


if(saveProfileBtn){


saveProfileBtn.onclick = ()=>{

if(!isOwnProfile()){
    if(editModal) editModal.classList.remove("show");
    return;
}

const name =
editName.value.trim();



if(name){


localStorage.setItem(
"userName",
name
);

        if(currentUser){
            const cloudData = getLocalSyncData();
            cloudData.full_name = name;
            await saveCloudUserData(currentUser, cloudData);
        }



if(userName)

userName.textContent =
name;



if(infoUserName)

infoUserName.textContent =
name;


}



if(editModal)

editModal.classList.remove(
"show"
);



};


}








/* ==========================
   Image Reader
========================== */


function readImage(
file,
callback
){


if(!file)

return;



const reader =
new FileReader();



reader.onload = ()=>{


callback(
reader.result
);


};



reader.readAsDataURL(
file
);


}








/* ==========================
   Avatar
========================== */


if(changeAvatarBtn && avatarInput){


changeAvatarBtn.onclick = ()=>{

if(!isOwnProfile()) return;

avatarInput.click();


};


}




if(avatarInput){


avatarInput.onchange = ()=>{

if(!isOwnProfile()) return;

const file =
avatarInput.files[0];



readImage(
file,
(src)=>{


userAvatar.src =
src;



localStorage.setItem(
"userAvatar",
src
);

        if(currentUser){
            const cloudData = getLocalSyncData();
            cloudData.avatar_url = src;
            await saveCloudUserData(currentUser, cloudData);
        }


}
);


};



}








/* ==========================
   Cover
========================== */


if(coverInput){


coverInput.onchange = ()=>{

if(!isOwnProfile()) return;

const file =
coverInput.files[0];



readImage(
file,
(src)=>{


coverImage.src =
src;



localStorage.setItem(
"userCover",
src
);

        if(currentUser){
            const cloudData = getLocalSyncData();
            cloudData.cover_url = src;
            await saveCloudUserData(currentUser, cloudData);
        }

window.dispatchEvent(new CustomEvent("profileCoverChanged", {
    detail:{ src }
}));



}
);



};


}








/* ===================================================
   Profile Live Sync
   =================================================== */

window.addEventListener("wallpaperStatsChanged", () => {
    renderProfile();
});

window.addEventListener("storage", event => {
    if(["favorites", "downloads", "views", "userCover"].includes(event.key)){
        if(event.key === "userCover" && coverImage){
            coverImage.src = event.newValue || "";
        }
        renderProfile();
        updateUserStats();
    }
});

/* ===================================================
   Profile Tabs
   =================================================== */

const profileTabs = document.querySelectorAll(".profile-tab");
const profilePanels = document.querySelectorAll(".profile-panel");

profileTabs.forEach(tab => {
    tab.addEventListener("click", () => {
        const target = tab.dataset.profileTab;
        if(!target) return;

        profileTabs.forEach(item => item.classList.remove("active"));
        profilePanels.forEach(panel => panel.classList.remove("active"));

        tab.classList.add("active");

        const panel = document.querySelector(
            `.profile-panel[data-profile-panel="${target}"]`
        );

        if(panel) panel.classList.add("active");
    });
});


/* ==========================
   Start App
========================== */


document.addEventListener(
"DOMContentLoaded",
()=>{

    // إذا كان الرابط يحمل UID، ابدأ بالبروفايل المطلوب مباشرة.
    // هذا يمنع ظهور بيانات الحساب الحالي أثناء انتظار Auth.
    if (isPublicProfile && (!currentUser || !isOwnProfile())) {
        hideOwnerEditControls();
        if (loginBtn) {
            loginBtn.style.display = "none";
            loginBtn.setAttribute("aria-hidden", "true");
            loginBtn.setAttribute("tabindex", "-1");
        }
        loadPublicProfile(profileTargetUID);
        return;
    }

    loadUserData();
    loadWallpapers();

});