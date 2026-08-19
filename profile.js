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
   Firebase Listener
========================== */


onAuthStateChanged(
auth,
(user)=>{


currentUser = user;



updateLoginState(
user
);



if(user){



localStorage.setItem(
"userName",
user.displayName || "مستخدم"
);



localStorage.setItem(
"userEmail",
user.email || ""
);



localStorage.setItem(
"userAvatar",
user.photoURL || ""
);



// تحميل بيانات المستخدم

loadUserProfile(user.uid);



}else{


localStorage.removeItem(
"userName"
);


localStorage.removeItem(
"userEmail"
);


localStorage.removeItem(
"userAvatar"
);



// تصفير بيانات الزائر

document.getElementById("userName").textContent =
"زائر";


document.getElementById("userEmail").textContent =
"غير مسجل";


document.getElementById("accountType").textContent =
"زائر";


document.getElementById("joinDate").textContent =
"-";


document.getElementById("lastLogin").textContent =
"-";



document.getElementById("downloadsCount").textContent =
"0";


document.getElementById("favoritesCount").textContent =
"0";


document.getElementById("viewsCount").textContent =
"0";



const wallpapers =
document.getElementById("userWallpapers");


if(wallpapers){

wallpapers.innerHTML = "";

}



}



});

/* ==========================
   Login / Logout Button
========================== */


if(loginBtn){


loginBtn.onclick = async()=>{


try{


if(currentUser){


await signOut(auth);

resetGuestProfile();

location.reload();


// تنظيف بيانات المستخدم المحلية

localStorage.removeItem("joinDate");

localStorage.removeItem("lastLogin");

localStorage.removeItem("downloads");

localStorage.removeItem("favorites");

localStorage.removeItem("views");


// تحديث الصفحة بعد الخروج

location.reload();


return;

}





await signInWithPopup(

auth,

provider

);



}


catch(error){


console.error(

"AUTH ERROR",

error

);



alert(

"حدث خطأ في تسجيل الدخول"

);



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


function renderProfile(){



const downloads =
getList("downloads");



const likes =
getList("favorites");



const views =
getList("views");





if(downloadCount)

downloadCount.textContent =
downloads.length;




if(likeCount)

likeCount.textContent =
likes.length;




if(viewCount)

viewCount.textContent =
views.length;





renderWalls(
downloadedContainer,
downloads
);



renderWalls(
likedContainer,
likes
);



renderWalls(
viewedContainer,
views
);



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