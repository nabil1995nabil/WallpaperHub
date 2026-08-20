/* ===================================================
   WallpaperHub Profile JS
   Part 1/4
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

}

from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";





console.log(
"WallpaperHub Profile Loaded"
);





/* ==========================
   Provider
========================== */


const provider =
new GoogleAuthProvider();






/* ==========================
   User State
========================== */


let currentUser = null;






/* ==========================
   DOM
========================== */


const loginBtn =
document.getElementById(
"loginBtn"
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







/* ==========================
   Update Login Button
========================== */


function updateLoginState(user){



if(!loginBtn)

return;





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
   Firebase Listener - WITH FULL DATA RESTORE
========================== */

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateLoginState(user);
    
    if (user) {
        // ============================
        // تسجيل الدخول - استعادة كل البيانات
        // ============================
        
        // حفظ بيانات المستخدم الأساسية
        localStorage.setItem("userName", user.displayName || "مستخدم");
        localStorage.setItem("userEmail", user.email || "");
        localStorage.setItem("userAvatar", user.photoURL || "");
        localStorage.setItem("joinDate", new Date().toLocaleDateString("ar-MA"));
        localStorage.setItem("lastLogin", new Date().toLocaleString("ar-MA"));
        
        // تحديث الواجهة - البيانات الشخصية
        const userNameEl = document.getElementById("userName");
        if (userNameEl) userNameEl.textContent = user.displayName || "مستخدم";
        
        const userEmailEl = document.getElementById("userEmail");
        if (userEmailEl) userEmailEl.textContent = user.email || "غير مسجل";
        
        const infoUserNameEl = document.getElementById("infoUserName");
        if (infoUserNameEl) infoUserNameEl.textContent = user.displayName || "مستخدم";
        
        const infoUserEmailEl = document.getElementById("infoUserEmail");
        if (infoUserEmailEl) infoUserEmailEl.textContent = user.email || "غير مسجل";
        
        const accountTypeEl = document.getElementById("accountType");
        if (accountTypeEl) accountTypeEl.textContent = "حساب Google";
        
        const joinDateEl = document.getElementById("joinDate");
        if (joinDateEl) joinDateEl.textContent = new Date().toLocaleDateString("ar-MA");
        
        const lastLoginEl = document.getElementById("lastLogin");
        if (lastLoginEl) lastLoginEl.textContent = new Date().toLocaleString("ar-MA");
        
        // تحديث الصورة
        const avatarEl = document.getElementById("userAvatar");
        if (avatarEl && user.photoURL) {
            avatarEl.src = user.photoURL;
        }
        
        // ============================
        // استعادة الإحصائيات من localStorage
        // ============================
        const downloads = JSON.parse(localStorage.getItem("downloads") || "[]");
        const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
        const views = JSON.parse(localStorage.getItem("views") || "[]");
        
        const downloadCountEl = document.getElementById("downloadCount");
        if (downloadCountEl) downloadCountEl.textContent = downloads.length;
        
        const likeCountEl = document.getElementById("likeCount");
        if (likeCountEl) likeCountEl.textContent = favorites.length;
        
        const viewCountEl = document.getElementById("viewCount");
        if (viewCountEl) viewCountEl.textContent = views.length;
        
        // ============================
        // تحميل الخلفيات وعرضها
        // ============================
        loadWallpapers();
        
        console.log("✅ تم تسجيل الدخول واستعادة البيانات:");
        console.log("📥 تحميلات:", downloads.length);
        console.log("❤️ إعجابات:", favorites.length);
        console.log("👁️ مشاهدات:", views.length);
        
    } else {
        // ============================
        // تسجيل الخروج - تصفير كل شيء
        // ============================
        resetGuestProfile();
    }
});

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
    ["downloadedWallpapers", "likedWallpapers", "viewedWallpapers"].forEach(id => {
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
                // تسجيل الخروج
                // ============================
                await signOut(auth);
                resetGuestProfile(); // تصفير كل شيء فوراً
                
                // تنظيف localStorage من بيانات المستخدم
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
                
                // تحديث الصفحة بعد الخروج
                location.reload();
                return;
            }
            
            // ============================
            // تسجيل الدخول
            // ============================
            await signInWithPopup(auth, provider);
            // بعد تسجيل الدخول، onAuthStateChanged سيتولى الباقي
            
        } catch (error) {
            console.error("AUTH ERROR", error);
            alert("حدث خطأ في تسجيل الدخول");
        }
    };
}

/* ===================================================
   User Profile Data
   Part 2/4
=================================================== */


/* ==========================
   UID
========================== */


let userUID = "";


let uidVisible = false;



const uidText =
document.getElementById(
"userUid"
);


const toggleUid =
document.getElementById(
"toggleUid"
);


const copyUid =
document.getElementById(
"copyUid"
);






onAuthStateChanged(
auth,
(user)=>{


if(user){


userUID =
user.uid;



if(uidText)

uidText.textContent =
"••••••••••••••";



}else{


userUID = "";



if(uidText)

uidText.textContent =
"••••••••••••••";


}



});







if(toggleUid){


toggleUid.onclick = ()=>{


uidVisible =
!uidVisible;



if(uidVisible){


uidText.textContent =
userUID;


toggleUid.textContent =
"🙈";



}else{


uidText.textContent =
"••••••••••••••";


toggleUid.textContent =
"👁️";


}



};



}







if(copyUid){


copyUid.onclick = ()=>{


if(userUID){


navigator.clipboard.writeText(
userUID
);



alert(
"تم نسخ UID"
);



}



};



}








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








/* ==========================
   Load User Data
========================== */


function loadUserData(){



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


return JSON.parse(

localStorage.getItem(key)

||

"[]"

);


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
    
    if (downloadCount) downloadCount.textContent = downloads.length;
    if (likeCount) likeCount.textContent = likes.length;
    if (viewCount) viewCount.textContent = views.length;
    
    renderWalls(downloadedContainer, downloads);
    renderWalls(likedContainer, likes);
    renderWalls(viewedContainer, views);
    
    // 🔄 تحديث الإحصائيات بعد التحميل
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
}

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


<h3>

${wall.title || "بدون اسم"}

</h3>

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


const changeAvatarBtn =
document.getElementById(
"changeAvatarBtn"
);





/* ==========================
   Open Edit
========================== */


if(editProfileBtn){


editProfileBtn.onclick = ()=>{


if(editModal)

editModal.classList.add(
"show"
);



if(editName)

editName.value =
userName.textContent;



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


const name =
editName.value.trim();



if(name){


localStorage.setItem(
"userName",
name
);



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


avatarInput.click();


};


}




if(avatarInput){


avatarInput.onchange = ()=>{


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



}
);


};



}








/* ==========================
   Cover
========================== */


if(coverInput){


coverInput.onchange = ()=>{


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



}
);



};


}








/* ==========================
   Start App
========================== */


document.addEventListener(
"DOMContentLoaded",
()=>{


loadUserData();


loadWallpapers();


});