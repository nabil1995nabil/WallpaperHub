import { supabase } from "./supabase.js";


document.addEventListener("DOMContentLoaded", () => {

// ===============================
// تنسيق الإشارات داخل الإشعار
// ===============================
function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatMentionText(text) {
    const safe = escapeHTML(text);
    return safe.replace(
        /(@[\w\u0600-\u06FF]+)/g,
        '<span class="mention-tag">$1</span>'
    );
}

function getWallpaperUrl(id) {
    const value = String(id ?? "").trim();
    return value ? `wallpaper.html?id=${encodeURIComponent(value)}` : "";
}

function openWallpaper(id) {
    const url = getWallpaperUrl(id);
    if (url) window.location.href = url;
}



// ===============================
// Load Admin Announcements
// ===============================

async function loadAnnouncements(){

try{

const response =
await fetch("/api/announcements");


const announcements =
await response.json();


const feed =
document.getElementById(
"announcementsFeed"
);


if(!feed) return;


// تنظيف الإعلانات فقط
feed.innerHTML = "";


// ===============================
// إنشاء الإعلانات
// ===============================

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

            ${escapeHTML(ad.date || "الآن")}

        </span>

    </div>

</div>


<div class="broadcast-content">

    <h3 class="post-title">

        ${escapeHTML(ad.title || "إعلان")}

    </h3>


    <p class="post-text">

        ${escapeHTML(ad.content || "")}

    </p>


    ${
        ad.image ?

        `

        <div class="post-media-container">

            <img
            src="${escapeHTML(ad.image)}"
            class="post-image"
            >

        </div>

        `

        :

        ""

    }

</div>

`;


feed.appendChild(card);

});


}catch(error){

console.log(
"ANNOUNCEMENTS ERROR:",
error
);

}

}


// ===============================
// Load User Notifications
// ===============================

async function getSession(){
    const { data, error } = await supabase.auth.getSession();
    if(error) throw error;
    return data?.session || null;
}

function renderNotificationCard(notif){

    const type = String(notif.type || "");
    const wallpaperId = escapeHTML(notif.wallpaperId || "");
    const wallpaperTitle = escapeHTML(notif.wallpaperTitle || "الخلفية");
    const avatar = escapeHTML(notif.avatar || "assets/images/user.png");
    const content = escapeHTML(notif.content || "");
    const commentText = escapeHTML(notif.commentText || "");
    const date = escapeHTML(notif.date || "الآن");
    const userName = escapeHTML(notif.userName || "مستخدم");

    if(type === "wallpaper_like"){
        return {
            category: "like",
            html: `
                <div class="card-side-indicator like-indicator"></div>
                <div class="avatar-container">
                    <img src="${avatar}" class="avatar" loading="lazy" onerror="this.src='assets/images/user.png'">
                    <span class="type-badge like">❤️</span>
                </div>
                <div class="notif-body">
                    <p class="notif-text"><strong>${userName}</strong> ${content || "أعجب بخلفيتك"}</p>
                    <button type="button" class="notification-wallpaper-btn" data-wallpaper-id="${wallpaperId}">📱 فتح الخلفية <span>${wallpaperTitle}</span></button>
                    <div class="notif-meta">${date}</div>
                </div>
            `
        };
    }

    if(type === "comment_like"){
        return {
            category: "like",
            html: `
                <div class="card-side-indicator like-indicator"></div>
                <div class="avatar-container">
                    <img src="${avatar}" class="avatar" loading="lazy" onerror="this.src='assets/images/user.png'">
                    <span class="type-badge like">❤️</span>
                </div>
                <div class="notif-body">
                    <p class="notif-text"><strong>${userName}</strong> ${content || "أعجب بتعليقك"}</p>
                    <div class="comment-quote">"${commentText}"</div>
                    <button type="button" class="notification-wallpaper-btn" data-wallpaper-id="${wallpaperId}">📱 فتح الخلفية <span>${wallpaperTitle}</span></button>
                    <div class="notif-meta">${date}</div>
                </div>
            `
        };
    }

    if(type === "wallpaper_comment"){
        return {
            category: "comment",
            html: `
                <div class="card-side-indicator"></div>
                <div class="avatar-container">
                    <img src="${avatar}" class="avatar" loading="lazy" onerror="this.src='assets/images/user.png'">
                    <span class="type-badge comment-badge">💬</span>
                </div>
                <div class="notif-body">
                    <p class="notif-text"><strong>${userName}</strong> ${content || "علق على خلفيتك"}</p>
                    <div class="comment-quote">💬 ${commentText || "تعليق جديد"}</div>
                    <button type="button" class="notification-wallpaper-btn" data-wallpaper-id="${wallpaperId}">📱 فتح الخلفية <span>${wallpaperTitle}</span></button>
                    <div class="notif-meta">${date}</div>
                </div>
            `
        };
    }

    if(type === "wallpaper_mention"){
        return {
            category: "mention",
            html: `
                <div class="card-side-indicator mention-indicator"></div>
                <div class="avatar-container">
                    <img src="${avatar}" class="avatar" loading="lazy" onerror="this.src='assets/images/user.png'">
                    <span class="type-badge mention-badge">@</span>
                </div>
                <div class="notif-body">
                    <p class="notif-text"><strong>${userName}</strong> ${formatMentionText(notif.content || "أشار إليك في تعليق")}</p>
                    <div class="comment-quote mention-comment">💬 ${formatMentionText(notif.commentText || "تمت الإشارة إليك في تعليق")}</div>
                    <button type="button" class="notification-wallpaper-btn" data-wallpaper-id="${wallpaperId}">📱 فتح الخلفية <span>${wallpaperTitle}</span></button>
                    <div class="notif-meta">${date}</div>
                </div>
            `
        };
    }

    return null;
}

async function loadUserNotifications(){

    try{

        const session = await getSession();
        const currentUser = session?.user || null;

        if(!currentUser){
            notifications = [];
            renderUserNotifications();
            return;
        }

        const response = await fetch("/api/notifications", {
            cache: "no-store",
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        });

        if(!response.ok) throw new Error("NOTIFICATIONS API ERROR");

        const data = await response.json();
        notifications = Array.isArray(data) ? data : [];
        renderUserNotifications();

    }catch(error){
        console.error("USER NOTIFICATIONS ERROR:", error);
        const feed = document.getElementById("userNotificationsFeed");
        if(feed) feed.innerHTML = `<div class="notifications-empty">تعذر تحميل الإشعارات</div>`;
    }
}

function renderUserNotifications(){

    const feed = document.getElementById("userNotificationsFeed");
    if(!feed) return;

    feed.innerHTML = "";

    let rendered = 0;

    notifications.forEach(notif => {

        const type = String(notif.type || "");
        if(!["comment_like", "wallpaper_like", "wallpaper_comment", "wallpaper_mention"].includes(type)) return;

        const card = document.createElement("article");
        const isRead = Boolean(notif.is_read || notif.read);

        card.className = isRead ? "notif-card" : "notif-card unread";
        card.dataset.notificationId = String(notif.id || "");
        card.dataset.notificationType = type;
        card.dataset.wallpaperId = String(notif.wallpaperId || "");

        const renderedCard = renderNotificationCard(notif);
        if(!renderedCard) return;

        card.dataset.category = renderedCard.category;
        card.innerHTML = renderedCard.html;
        feed.appendChild(card);
        rendered++;
    });

    if(rendered === 0){
        feed.innerHTML = `<div class="notifications-empty">لا توجد إشعارات جديدة حالياً</div>`;
    }

    updateUnreadCount();
}

function updateUnreadCount(){
    if(!unreadCount) return;

    const count = notifications.filter(notif => !notif.is_read && !notif.read).length;
    unreadCount.textContent = String(count);
    unreadCount.style.opacity = count > 0 ? "1" : "0.5";
}



// ===============================
// Notification Filters
// ===============================

const tabs =
document.querySelectorAll(
    ".tab-btn"
);


tabs.forEach(tab=>{


    tab.addEventListener(
        "click",
        ()=>{


            tabs.forEach(t=>{

                t.classList.remove(
                    "active"
                );

            });


            tab.classList.add(
                "active"
            );


            const filter =
                tab.getAttribute(
                    "data-filter"
                );


            const cards =
                document.querySelectorAll(
                    ".notif-card"
                );


            cards.forEach(card=>{


                const category =
                    card.dataset.category;


                if(
                    filter === "all" ||
                    category === filter
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


        }
    );

});


// ===============================
// Quick Reply
// ===============================

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


        }
    );

});


// ===============================
// Persist Read State
// ===============================

async function markNotificationRead(card){
    try{
        const notificationId = String(card?.dataset?.notificationId || "").trim();
        if(!notificationId || !card || !card.classList.contains("unread")) return true;

        const { data, error } = await supabase.auth.getSession();
        if(error) throw error;

        const token = data?.session?.access_token;
        if(!token) return false;

        const response = await fetch(
            `/api/notifications/${encodeURIComponent(notificationId)}/read`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if(!response.ok) throw new Error("READ API ERROR");

        card.classList.remove("unread");

        const item = notifications.find(n => String(n.id) === notificationId);
        if(item){
            item.is_read = true;
            item.read = true;
        }

        const indicator = card.querySelector(".card-side-indicator");
        if(indicator) indicator.style.opacity = "0";

        updateUnreadCount();
        return true;

    }catch(error){
        console.error("MARK NOTIFICATION READ ERROR:", error);
        return false;
    }
}

// ===============================
// Mark All Read
// ===============================

const markBtn =
document.getElementById(
    "mark-all-btn"
);


const unreadCount =
document.getElementById(
    "unread-count"
);


if(markBtn){
    markBtn.addEventListener("click", async ()=>{
        if(!currentUser) return;

        markBtn.disabled = true;

        try{
            const { data, error } = await supabase.auth.getSession();
            if(error) throw error;

            const token = data?.session?.access_token;
            if(!token) return;

            const response = await fetch(
                "/api/notifications/read-all",
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if(!response.ok) throw new Error("READ ALL API ERROR");

            notifications.forEach(notif=>{
                notif.is_read = true;
                notif.read = true;
            });

            const unreadCards = document.querySelectorAll(
                "#userNotificationsFeed .notif-card.unread"
            );

            unreadCards.forEach(card=>{
                card.classList.remove("unread");

                const indicator = card.querySelector(
                    ".card-side-indicator"
                );

                if(indicator) indicator.style.opacity = "0";
            });

            updateUnreadCount();
        }catch(error){
            console.error("MARK ALL READ ERROR:", error);
        }finally{
            markBtn.disabled = false;
        }
    });
}

// الضغط على أي إشعار شخصي يجعله مقروءاً ويحفظ ذلك في Supabase
document.addEventListener("click", async (event)=>{

    const openBtn = event.target.closest(".notification-wallpaper-btn");

    if(openBtn){
        event.preventDefault();
        const card = openBtn.closest(".notif-card");
        await markNotificationRead(card);
        openWallpaper(openBtn.dataset.wallpaperId);
        return;
    }

    const card = event.target.closest(
        "#userNotificationsFeed .notif-card"
    );

    if(card){
        markNotificationRead(card);
    }
});


// ===============================
// Start
// ===============================

let currentUser = null;
let notifications = [];
let realtimeChannel = null;
let refreshTimer = null;

loadAnnouncements();

async function setupRealtimeNotifications(){

    if(realtimeChannel){
        try{
            await supabase.removeChannel(realtimeChannel);
        }catch(error){}
        realtimeChannel = null;
    }

    clearInterval(refreshTimer);

    if(!currentUser) return;

    realtimeChannel = supabase
        .channel(`notifications-${currentUser.id}`)
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "notifications",
                filter: `user_id=eq.${currentUser.id}`
            },
            () => loadUserNotifications()
        )
        .subscribe(status=>{
            console.log("NOTIFICATIONS REALTIME:", status);
        });

    // احتياطي إذا لم تكن Realtime مفعلة على جدول notifications.
    refreshTimer = setInterval(()=>{
        if(document.visibilityState === "visible") loadUserNotifications();
    }, 30000);
}

supabase.auth.onAuthStateChange((event, session)=>{

    currentUser = session?.user || null;

    if(currentUser){
        loadUserNotifications();
        setupRealtimeNotifications();
    }else{
        notifications = [];
        renderUserNotifications();
        clearInterval(refreshTimer);

        if(realtimeChannel){
            supabase.removeChannel(realtimeChannel);
            realtimeChannel = null;
        }
    }
});

getSession()
    .then(async session=>{
        currentUser = session?.user || null;
        if(currentUser){
            await loadUserNotifications();
            await setupRealtimeNotifications();
        }else{
            renderUserNotifications();
        }
    })
    .catch(error=>console.error("NOTICE AUTH ERROR:", error));

});