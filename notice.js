import { auth } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";


document.addEventListener("DOMContentLoaded", () => {

// ===============================
// تنسيق الإشارات داخل الإشعار
// ===============================
function formatMentionText(text) {
    if (!text) return "";
    return String(text).replace(
        /(@[\w\u0600-\u06FF]+)/g,
        '<span class="mention-tag">$1</span>'
    );
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

async function loadUserNotifications(){

    try{

        const currentUser =
            auth.currentUser;


        if(!currentUser){

            return;

        }


        // UID المستخدم الحالي
        const OWNER_UID =
            currentUser.uid;


        const response =
            await fetch(
                "/api/notifications?recipientUID=" +
                encodeURIComponent(OWNER_UID)
            );


        const notifications =
            await response.json();


        const feed =
            document.getElementById(
                "userNotificationsFeed"
            );


        if(!feed) return;


        // تنظيف الإشعارات الشخصية فقط
        feed.innerHTML = "";


        // ===============================
        // عرض الإشعارات
        // ===============================

        notifications.forEach(notif=>{


            // ======================================
            // السماح بأنواع الإشعارات المطلوبة فقط
            // ======================================

if(
    notif.type !== "comment_like" &&
    notif.type !== "wallpaper_like" &&
    notif.type !== "wallpaper_comment" &&
    notif.type !== "wallpaper_mention"
){
    return;
}


            const card =
                document.createElement("article");

            // نحتفظ بمعرف الإشعار حتى نقدر نحفظ حالة القراءة في Supabase
            card.dataset.notificationId = String(notif.id || "");
            card.dataset.notificationType = String(notif.type || "");

            card.className =
                notif.is_read || notif.read
                    ? "notif-card"
                    : "notif-card unread";


            // ===============================
            // إعجاب الخلفية
            // ===============================

            if(
                notif.type === "wallpaper_like"
            ){

                card.dataset.category =
                    "like";


                card.innerHTML = `

                <div class="card-side-indicator"></div>


                <div class="avatar-container">

                    <img

                    src="${
                        notif.avatar ||
                        'assets/images/user.png'
                    }"

                    class="avatar"

                    >

                    <span class="type-badge like">
                        ❤️
                    </span>

                </div>


                <div class="notif-body">

                    <p class="notif-text">

                        ${notif.content}

                    </p>


                    <div class="comment-quote">

                        ❤️ ${
                            notif.wallpaperTitle ||
                            "خلفيتك"
                        }

                    </div>


                    <div class="notif-meta">

                        ${notif.date || "الآن"}

                    </div>

                </div>

                `;

            }


            // ===============================
            // إعجاب التعليق
            // ===============================

            else if(
                notif.type === "comment_like"
            ){

                card.dataset.category =
                    "like";


                card.innerHTML = `

                <div class="card-side-indicator"></div>


                <div class="avatar-container">

                    <img

                    src="${
                        notif.avatar ||
                        'assets/images/user.png'
                    }"

                    class="avatar"

                    >

                    <span class="type-badge like">
                        ❤️
                    </span>

                </div>


                <div class="notif-body">

                    <p class="notif-text">

                        ${notif.content}

                    </p>


                    <div class="comment-quote">

                        "${notif.commentText || ""}"

                    </div>


                    <div class="notif-meta">

                        ${notif.date || "الآن"}

                    </div>

                </div>

                `;

            }


            // ===============================
            // تعليق على الخلفية
            // ===============================

            else if(
                notif.type === "wallpaper_comment"
            ){

                card.dataset.category =
                    "comment";


                card.innerHTML = `

                <div class="card-side-indicator"></div>


                <div class="avatar-container">

                    <img

                    src="${
                        notif.avatar ||
                        'assets/images/user.png'
                    }"

                    class="avatar"

                    >

                    <span class="type-badge">
                        💬
                    </span>

                </div>


                <div class="notif-body">

                    <p class="notif-text">

                        ${notif.content}

                    </p>


                    <div class="comment-quote">

                        💬 ${
                            notif.wallpaperTitle ||
                            "خلفيتك"
                        }

                    </div>


                    <div class="notif-meta">

                        ${notif.date || "الآن"}

                    </div>

                </div>

                `;

            }
// ===============================
// الإشارة في تعليق
// ===============================

else if(
    notif.type === "wallpaper_mention"
){
    card.dataset.category = "mention";
    card.classList.add("mention-card");

    card.innerHTML = `
    <div class="card-side-indicator mention-indicator"></div>

    <div class="avatar-container">
        <img
            src="${notif.avatar || 'assets/images/user.png'}"
            class="avatar"
        >
        <span class="type-badge mention-badge">
            @
        </span>
    </div>

    <div class="notif-body">
        <p class="notif-text">
            ${formatMentionText(notif.content)}
        </p>

        <div class="comment-quote mention-comment">
            💬 ${formatMentionText(
                notif.commentText || "تمت الإشارة إليك في تعليق"
            )}
        </div>

        <div class="comment-quote">
            📱 ${notif.wallpaperTitle || "خلفيتك"}
        </div>

        <div class="notif-meta">
            ${notif.date || "الآن"}
        </div>
    </div>
    `;
}
            // ===============================
            // إضافة الإشعار
            // ===============================

            feed.appendChild(card);

        });

        updateUnreadCount();


    }catch(error){

        console.log(
            "USER NOTIFICATIONS ERROR:",
            error
        );

    }

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
        const currentUser = auth.currentUser;
        const notificationId = card?.dataset?.notificationId;

        if(!currentUser || !notificationId || card?.dataset?.notificationType === "") return false;
        if(!card.classList.contains("unread")) return true;

        const response = await fetch(
            `/api/notifications/${encodeURIComponent(notificationId)}/read`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    recipientUID: currentUser.uid
                })
            }
        );

        if(!response.ok) throw new Error("READ API ERROR");

        card.classList.remove("unread");

        const indicator = card.querySelector(".card-side-indicator");
        if(indicator) indicator.style.opacity = "0";

        updateUnreadCount();
        return true;
    }catch(error){
        console.error("MARK NOTIFICATION READ ERROR:", error);
        return false;
    }
}

function updateUnreadCount(){
    if(!unreadCount) return;

    const count = document.querySelectorAll(
        "#userNotificationsFeed .notif-card.unread"
    ).length;

    unreadCount.textContent = String(count);
    unreadCount.style.opacity = count > 0 ? "1" : "0.5";
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
        const currentUser = auth.currentUser;
        if(!currentUser) return;

        markBtn.disabled = true;

        try{
            const response = await fetch(
                "/api/notifications/read-all",
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        recipientUID: currentUser.uid
                    })
                }
            );

            if(!response.ok) throw new Error("READ ALL API ERROR");

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
document.addEventListener("click", (event)=>{
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

loadAnnouncements();


// ننتظر Firebase حتى يتأكد من المستخدم الحالي
onAuthStateChanged(
    auth,
    (user) => {


        if(user){

            // المستخدم معروف الآن
            loadUserNotifications();

        }else{

            // لا يوجد مستخدم مسجل الدخول
            const feed =
                document.getElementById(
                    "userNotificationsFeed"
                );


            if(feed){

                feed.innerHTML = "";

            }

        }

    }
);

});