// =====================================
// WallpaperHub Profile JS
// Clean Firebase Version
// Part 1/4
// =====================================


import {
auth
} from "./firebase.js";


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




// ===============================
// API
// ===============================


const API =
"/api/wallpapers";



let wallpapers = [];





// ===============================
// Firebase Login System
// ===============================

const provider = new GoogleAuthProvider();


// ===============================
// Elements
// ===============================

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

const coverImage =
document.getElementById(
"coverImage"
);

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

const infoUserName =
document.getElementById("infoUserName");


const infoUserEmail =
document.getElementById("infoUserEmail");


const accountType =
document.getElementById("accountType");


const joinDate =
document.getElementById("joinDate");


const lastLogin =
document.getElementById("lastLogin");

/// ===============================
// تحديث حالة الزر
// ===============================

function updateLoginState(user){

    if(!loginBtn) return;


    if(user){

        loginBtn.innerHTML = `
        <span class="material-icons">
        logout
        </span>
        `;

        loginBtn.classList.add("logout");


    }else{

        loginBtn.innerHTML = `
        <span class="material-icons">
        login
        </span>
        `;

        loginBtn.classList.remove("logout");

    }

}




// ===============================
// تسجيل الدخول والخروج Google
// ===============================

if(loginBtn){


loginBtn.addEventListener("click", async()=>{


try{


const currentUser = auth.currentUser;



// ===============================
// تسجيل الخروج
// ===============================

if(currentUser){


await signOut(auth);



localStorage.removeItem("userName");
localStorage.removeItem("userEmail");
localStorage.removeItem("userAvatar");
localStorage.removeItem("joinDate");



updateLoginState(null);


loadUserData();



return;


}




// ===============================
// تسجيل الدخول Google
// ===============================


const result = await signInWithPopup(
    auth,
    provider
);



const user = result.user;



console.log(
"Firebase Login Success:",
user
);




const name =
user.displayName || "مستخدم";


const email =
user.email || "غير مسجل";


const avatar =
user.photoURL || "assets/images/avatar.png";





// حفظ البيانات

localStorage.setItem(
"userName",
name
);


localStorage.setItem(
"userEmail",
email
);


localStorage.setItem(
"userAvatar",
avatar
);



if(!localStorage.getItem("joinDate")){


localStorage.setItem(
"joinDate",
new Date().toLocaleString("ar-MA")
);


}




// تحديث الصفحة مباشرة

if(userName){

userName.textContent =
name;

}


if(userEmail){

userEmail.textContent =
email;

}


if(userAvatar){

userAvatar.src =
avatar;

}




updateLoginState(user);


loadUserData();



}



catch(error){


console.error(
"GOOGLE LOGIN ERROR:",
error.code,
error.message
);



alert(
"خطأ تسجيل الدخول: " + error.message
);



}



});


}

// ===============================
// تحميل الخلفيات من السيرفر
// ===============================


async function loadWallpapers(){


try{


const res =
await fetch(API);



if(!res.ok)

throw new Error(
"SERVER ERROR"
);



wallpapers =
await res.json();



renderProfile();



}catch(error){


console.error(
"LOAD WALLPAPERS ERROR:",
error
);



}



}







/// ===============================
// تحميل بيانات المستخدم
// ===============================


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




const cover =

localStorage.getItem(
"userCover"
);





// الاسم الرئيسي

if(userName)

userName.textContent =
name;





// البريد الرئيسي

if(userEmail)

userEmail.textContent =
email;






// الصورة الشخصية

if(userAvatar)

userAvatar.src =
avatar || "assets/images/avatar.png";






// صورة الغلاف

if(coverImage)

coverImage.src =
cover || "assets/images/default-cover.jpg";






// ===============================
// معلومات المستخدم الإضافية
// ===============================


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






// تاريخ الانضمام

let join =

localStorage.getItem(
"joinDate"
);




if(!join && email !== "غير مسجل"){


join =
new Date().toLocaleString(
"ar-MA"
);



localStorage.setItem(
"joinDate",
join
);



}




if(joinDate)

joinDate.textContent =
join || "-";







// تحديث آخر دخول كل مرة

const loginTime =

new Date().toLocaleString(
"ar-MA"
);




localStorage.setItem(
"lastLogin",
loginTime
);





if(lastLogin)

lastLogin.textContent =
loginTime;



}

// ===============================
// جلب قوائم المستخدم
// ===============================


function getUserList(key){


return JSON.parse(

localStorage.getItem(key)

||

"[]"

);



}









// ===============================
// عرض البروفايل
// ===============================


function renderProfile(){



const downloads =

getUserList(
"downloads"
);




const likes =

getUserList(
"favorites"
);




const views =

getUserList(
"views"
);







renderUserWalls(

downloadedContainer,

downloads

);





renderUserWalls(

likedContainer,

likes

);





renderUserWalls(

viewedContainer,

views

);






if(downloadCount)

downloadCount.textContent =
downloads.length;





if(likeCount)

likeCount.textContent =
likes.length;





if(viewCount)

viewCount.textContent =
views.length;



}









// ===============================
// عرض الخلفيات
// ===============================


function renderUserWalls(container,ids){


if(!container)

return;





container.innerHTML = "";





if(!ids.length){


container.innerHTML = `

<div class="empty-profile">

لا توجد خلفيات هنا حاليا

</div>

`;

return;


}






ids.forEach(id=>{



const wall =

wallpapers.find(

w =>

String(w.id) === String(id)

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


<img

src="${getImageUrl(

wall.thumbnail || wall.image

)}"

loading="lazy"


>




<div class="profile-wall-info">


<h3>

${wall.title || "بدون اسم"}

</h3>



<p>

${wall.category || "عام"}

</p>



</div>


`;








card.onclick = ()=>{


location.href =

"wallpaper.html?id="+wall.id;



};






container.appendChild(card);



});



}







// ===============================
// معالجة رابط الصورة
// ===============================


function getImageUrl(url){



if(!url)

return "assets/images/no-image.png";





if(url.startsWith("http"))

return url;





if(url.startsWith("assets/"))

return url;





return "assets/wallpapers/"+url;



}

// ===============================
// Edit Profile
// ===============================


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








if(closeEditBtn){


closeEditBtn.onclick = ()=>{


if(editModal)

editModal.classList.remove(
"show"
);



};


}








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



}






if(editModal)

editModal.classList.remove(
"show"
);



};



}








// ===============================
// Image Upload
// ===============================


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






function readImage(file,callback){



if(!file)

return;




const reader =

new FileReader();





reader.onload = ()=>{


callback(
reader.result
);



};



reader.readAsDataURL(file);



}







// تغيير الصورة الشخصية


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



if(userAvatar)

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








// تغيير صورة الغلاف


if(coverInput){


coverInput.onchange = ()=>{



const file =

coverInput.files[0];




readImage(

file,

(src)=>{



if(coverImage)

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








// ===============================
// إغلاق النافذة عند الضغط خارجها
// ===============================


if(editModal){



editModal.onclick = (e)=>{


if(e.target === editModal){



editModal.classList.remove(
"show"
);



}



};



}

// ===============================
// Start Profile
// ===============================


document.addEventListener(
"DOMContentLoaded",
()=>{


loadUserData();


loadWallpapers();



});