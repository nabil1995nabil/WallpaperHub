// ======================================
// WallpaperHub Notifications JS
// Reliable authenticated loading + polling + notification sound
// ======================================

console.log("Notifications JS Loaded");

const notificationsList = document.getElementById("notificationsList");
const clearBtn = document.getElementById("clearBtn");

let notifications = [];
let wallpapers = [];
let initialized = false;
let pollingTimer = null;

const NOTIFICATION_POLL_MS = 8000;
const notificationSound = new Audio("assets/sounds/notification.wav");
notificationSound.preload = "auto";
notificationSound.volume = 0.72;

function getSupabaseAccessTokenFromBrowser(){
    try{
        for(let i = 0; i < localStorage.length; i++){
            const key = localStorage.key(i) || "";
            if(!key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;

            const raw = localStorage.getItem(key);
            if(!raw) continue;

            const session = JSON.parse(raw);
            const token = String(
                session?.access_token ||
                session?.currentSession?.access_token ||
                ""
            ).trim();

            if(token) return token;
        }
    }catch(error){
        console.warn("AUTH TOKEN READ ERROR:", error);
    }
    return "";
}

function apiHeaders(){
    const token = getSupabaseAccessTokenFromBrowser();

    return token
        ? {
            "Authorization":"Bearer " + token,
            "Accept":"application/json"
        }
        : {"Accept":"application/json"};
}

async function playNotificationSound(){
    try{
        notificationSound.currentTime = 0;
        await notificationSound.play();
    }catch(error){
        // Browser autoplay policies may block audio before the first
        // user interaction. The unlock handlers below handle that case.
        console.debug("NOTIFICATION SOUND BLOCKED:", error?.message || error);
    }
}

function unlockNotificationSound(){
    notificationSound.muted = true;

    const promise = notificationSound.play();

    if(promise?.then){
        promise.then(()=>{
            notificationSound.pause();
            notificationSound.currentTime = 0;
            notificationSound.muted = false;
        }).catch(()=>{
            notificationSound.muted = false;
        });
    }else{
        notificationSound.muted = false;
    }

    document.removeEventListener("pointerdown", unlockNotificationSound);
    document.removeEventListener("keydown", unlockNotificationSound);
}

document.addEventListener("pointerdown", unlockNotificationSound, {once:true});
document.addEventListener("keydown", unlockNotificationSound, {once:true});

// ======================================
// تحميل البيانات
// ======================================

async function loadWallpapers(){
    const response = await fetch(
        "/api/wallpapers?_notifications=" + Date.now(),
        {
            cache:"no-store",
            headers:apiHeaders()
        }
    );

    if(!response.ok){
        throw new Error("Wallpapers API " + response.status);
    }

    const data = await response.json();
    wallpapers = Array.isArray(data) ? data : [];
}

async function fetchNotifications(){
    const token = getSupabaseAccessTokenFromBrowser();

    if(!token){
        throw new Error("AUTH_REQUIRED");
    }

    const response = await fetch(
        "/api/notifications?_=" + Date.now(),
        {
            cache:"no-store",
            headers:apiHeaders()
        }
    );

    if(response.status === 401){
        throw new Error("AUTH_REQUIRED");
    }

    if(!response.ok){
        throw new Error("Notifications API " + response.status);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
}

async function loadNotifications({announceNew = false} = {}){
    try{
        const [nextNotifications] = await Promise.all([
            fetchNotifications(),
            loadWallpapers()
        ]);

        const previousIds = new Set(
            notifications.map(item => String(item.id))
        );

        notifications = nextNotifications;

        if(announceNew && initialized){
            const newItems = notifications.filter(
                item => !previousIds.has(String(item.id))
            );

            if(newItems.length){
                await playNotificationSound();
            }
        }

        initialized = true;
        renderNotifications();
        schedulePolling();
    }catch(error){
        console.warn("Notifications Error:", error);

        if(error?.message === "AUTH_REQUIRED"){
            notifications = [];

            if(notificationsList){
                notificationsList.innerHTML = `
                    <p class="empty-notification">
                        يجب تسجيل الدخول لعرض الإشعارات
                    </p>
                `;
            }
        }else if(notificationsList){
            notificationsList.innerHTML = `
                <p class="empty-notification">
                    تعذر تحميل الإشعارات، حاول مرة أخرى
                </p>
            `;
        }

        schedulePolling();
    }
}

function schedulePolling(){
    if(pollingTimer) clearTimeout(pollingTimer);

    pollingTimer = setTimeout(()=>{
        loadNotifications({announceNew:true});
    }, NOTIFICATION_POLL_MS);
}

// ======================================
// البحث عن الخلفية
// ======================================

function getWallpaperImage(id){
    const wall = wallpapers.find(
        w => String(w.id) === String(id)
    );

    if(!wall) return "assets/logo/no-image.png";

    return wall.thumbnail || wall.image;
}

// ======================================
// إنشاء البطاقة
// ======================================

function createNotificationCard(item){
    const title = item.title || "إشعار جديد";
    const message = item.message || item.content || "";

    return `
        <div class="notification-card"
            data-notification-id="${item.id}"
            onclick="openNotification('${item.id}', '${item.wallpaperId || ""}')">

            <div class="wallpaper-thumb">
                <img
                    src="${getWallpaperImage(item.wallpaperId)}"
                    alt=""
                    onerror="this.src='assets/logo/no-image.png'">
            </div>

            <div class="card-body">
                <div>
                    <h2>${title}</h2>
                    <p>${message}</p>
                </div>

                <div class="card-footer">
                    <span class="time-tag">${item.date || ""}</span>

                    <button
                        class="action-link"
                        onclick="event.stopPropagation(); openNotification('${item.id}', '${item.wallpaperId || ""}')">
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
    if(!notificationsList) return;

    notificationsList.innerHTML = "";

    if(notifications.length === 0){
        notificationsList.innerHTML = `
            <p class="empty-notification">
                لا توجد إشعارات
            </p>
        `;
        return;
    }

    notifications.forEach(item=>{
        notificationsList.insertAdjacentHTML(
            "beforeend",
            createNotificationCard(item)
        );
    });

    activateCards();
}

async function markNotificationRead(id){
    const token = getSupabaseAccessTokenFromBrowser();
    if(!token || !id) return;

    try{
        await fetch(
            "/api/notifications/" +
            encodeURIComponent(id) +
            "/read",
            {
                method:"PATCH",
                headers:{
                    "Authorization":"Bearer " + token,
                    "Accept":"application/json"
                }
            }
        );
    }catch(error){
        console.debug("MARK NOTIFICATION READ ERROR:", error);
    }
}

async function openNotification(id, wallpaperId){
    await markNotificationRead(id);

    if(!wallpaperId) return;

    window.location.href =
        "wallpaper.html?id=" + encodeURIComponent(wallpaperId);
}

window.openNotification = openNotification;

// ======================================
// تأثير 3D
// ======================================

function activateCards(){
    document
        .querySelectorAll(".notification-card")
        .forEach(card=>{
            card.addEventListener("mousemove",(e)=>{
                const rect = card.getBoundingClientRect();

                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;

                card.style.transform =
                    `rotateX(${-y*0.12}deg)
                     rotateY(${x*0.12}deg)
                     translateZ(15px)`;
            });

            card.addEventListener("mouseleave",()=>{
                card.style.transform = "";
            });
        });
}

// ======================================
// مسح الكل
// ======================================

if(clearBtn){
    clearBtn.onclick = async ()=>{
        const token = getSupabaseAccessTokenFromBrowser();

        if(!token){
            alert("يجب تسجيل الدخول أولاً");
            return;
        }

        clearBtn.disabled = true;

        try{
            const response = await fetch(
                "/api/notifications",
                {
                    method:"DELETE",
                    headers:{
                        "Authorization":"Bearer " + token,
                        "Accept":"application/json"
                    }
                }
            );

            const result = await response.json();

            if(!response.ok || !result.success){
                throw new Error(
                    result?.message || "Clear notifications failed"
                );
            }

            notifications = [];
            renderNotifications();
        }catch(error){
            console.error("Clear Error:", error);
            alert("تعذر مسح الإشعارات");
        }finally{
            clearBtn.disabled = false;
        }
    };
}

// تشغيل
loadNotifications();
