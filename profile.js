/* ===================================================
   WallpaperHub Profile JS
   Clean 100D Version
   Part 1/4
=================================================== */


/* ==========================
   Firebase Imports
========================== */


import { auth } from "./firebase.js";


import {

    GoogleAuthProvider,
    signInWithPopup,
    signOut,
onAuthStateChanged,
}

from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";





console.log(
"WallpaperHub Profile Loaded"
);


// هنا ضع كود UID
let uidVisible = false;

let userUID = "";


const uidText =
document.getElementById("userUid");

const toggleUid =
document.getElementById("toggleUid");

const copyUid =
document.getElementById("copyUid");


onAuthStateChanged(auth,(user)=>{

if(user){

userUID = user.uid;

}

});


if(toggleUid){

toggleUid.onclick = ()=>{

uidVisible = !uidVisible;


if(uidVisible){

uidText.textContent = userUID;

toggleUid.textContent="🙈";

}else{

uidText.textContent="••••••••••••••";

toggleUid.textContent="👁️";

}

};

}


if(copyUid){

copyUid.onclick = ()=>{

navigator.clipboard.writeText(userUID);

alert("تم نسخ UID");

};

}




/* ==========================
   API
========================== */


const API = "/api/wallpapers";


let wallpapers = [];






/* ==========================
   Firebase Provider
========================== */


const provider = new GoogleAuthProvider();






/* ==========================
   DOM Elements
========================== */


const loginBtn =
document.getElementById("loginBtn");


const userName =
document.getElementById("userName");


const userEmail =
document.getElementById("userEmail");


const userAvatar =
document.getElementById("userAvatar");


const coverImage =
document.getElementById("coverImage");



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


        loginBtn.classList.add(
        "logout"
        );



    }else{


        loginBtn.innerHTML = `

        <span class="material-icons">
        login
        </span>

        `;


        loginBtn.classList.remove(
        "logout"
        );


    }


}








/* ==========================
   Login / Logout
========================== */


if(loginBtn){


loginBtn.addEventListener(
"click",

async()=>{


try{



const currentUser =
auth.currentUser;





/* Logout */


if(currentUser){



await signOut(auth);



localStorage.removeItem(
"userName"
);


localStorage.removeItem(
"userEmail"
);


localStorage.removeItem(
"userAvatar"
);



updateLoginState(null);


loadUserData();



return;



}






/* Login Google */


const result =
await signInWithPopup(
auth,
provider
);



const user =
result.user;




const name =
user.displayName ||
"مستخدم";



const email =
user.email ||
"غير مسجل";



const avatar =
user.photoURL ||
"assets/images/avatar.png";






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






updateLoginState(user);


loadUserData();



}

catch(error){


console.error(

"LOGIN ERROR:",

error

);



alert(

"خطأ تسجيل الدخول: "
+
error.message

);



}



});


}

/* ===================================================
   User Data + Wallpapers
   Part 2/4
=================================================== */


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
    "assets/images/avatar.png";





    if(coverImage)

    coverImage.src =
    cover ||
    "assets/images/default-cover.jpg";








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




    if(!join && email !== "غير مسجل"){


        join =
        new Date()
        .toLocaleString(
        "ar-MA"
        );



        localStorage.setItem(
        "joinDate",
        join
        );


    }






    if(joinDate)

    joinDate.textContent =
    join ||
    "-";








    const loginTime =

    new Date()
    .toLocaleString(
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









/* ==========================
   Load Wallpapers API
========================== */


async function loadWallpapers(){


    try{


        const response =

        await fetch(API);




        if(!response.ok)

        throw new Error(
        "SERVER ERROR"
        );





        wallpapers =

        await response.json();





        renderProfile();



    }

    catch(error){


        console.error(

        "LOAD WALLPAPERS ERROR:",

        error

        );


    }



}








/* ==========================
   Local Storage Lists
========================== */


function getUserList(key){


    return JSON.parse(

        localStorage.getItem(key)

        ||

        "[]"

    );


}









/* ==========================
   Render Profile
========================== */


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









/* ==========================
   Render Wallpaper Cards
========================== */


function renderUserWalls(
container,
ids
){



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


        <img

        src="${getImageUrl(
        wall.thumbnail ||
        wall.image
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

            "wallpaper.html?id="

            +

            wall.id;



        };







        container.appendChild(card);



    });



}








/* ==========================
   Image URL Handler
========================== */


function getImageUrl(url){



    if(!url)

    return "assets/images/no-image.png";





    if(url.startsWith("http"))

    return url;





    if(url.startsWith("assets/"))

    return url;





    return "assets/wallpapers/" + url;



}

/* ===================================================
   Edit Profile + Image Upload
   Part 3/4
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
   Open Edit Modal
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
   Close Modal
========================== */


if(closeEditBtn){


closeEditBtn.onclick = ()=>{


    if(editModal)

    editModal.classList.remove(
    "show"
    );


};


}








if(editModal){


editModal.onclick = (event)=>{


    if(event.target === editModal){


        editModal.classList.remove(
        "show"
        );


    }


};



}








/* ==========================
   Save Profile Name
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
   Read Image
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




    reader.readAsDataURL(file);



}








/* ==========================
   Change Avatar
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









/* ==========================
   Change Cover
========================== */


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

/* ===================================================
   Start App + 100D Motion Engine
   Part 4/4
=================================================== */


/* ==========================
   Start Profile
========================== */


document.addEventListener(
"DOMContentLoaded",
()=>{


    loadUserData();


    loadWallpapers();


});







/* ==========================
   100D Card Motion Engine
========================== */


function init100DMotion(){



const cards = document.querySelectorAll(

".info-card, .stat-card, .profile-wall-card"

);






cards.forEach(card=>{



    let targetX = 0;

    let targetY = 0;


    let currentX = 0;

    let currentY = 0;





    card.style.transformStyle =
    "preserve-3d";







    const light =
    document.createElement("div");



    light.className =
    "motion-light";





    Object.assign(

    light.style,

    {


        position:"absolute",

        inset:"0",

        pointerEvents:"none",

        opacity:"0",

        borderRadius:"inherit",

        transition:"opacity .3s ease",

        background:

        "radial-gradient(circle, rgba(255,255,255,.35), transparent 50%)",

        zIndex:"5"


    }

    );




    card.appendChild(light);








    function animate(){



        currentX +=

        (targetX - currentX)
        * .12;




        currentY +=

        (targetY - currentY)
        * .12;






        card.style.transform =


        `

        perspective(1000px)

        rotateX(${currentX}deg)

        rotateY(${currentY}deg)

        translateZ(10px)

        `;






        requestAnimationFrame(
        animate
        );



    }





    animate();








    function moveCard(x,y){



        const rect =

        card.getBoundingClientRect();





        const px =

        (x - rect.left)

        /

        rect.width;





        const py =

        (y - rect.top)

        /

        rect.height;






        targetY =

        (px - .5)
        *
        12;






        targetX =

        (py - .5)
        *
        -12;








        light.style.opacity =
        "1";





        light.style.background =


        `

        radial-gradient(

        circle at

        ${px*100}%

        ${py*100}%,

        rgba(255,255,255,.45),

        transparent 45%

        )

        `;



    }








    card.addEventListener(

    "mousemove",

    e=>{


        moveCard(

        e.clientX,

        e.clientY

        );


    }

    );








    card.addEventListener(

    "mouseleave",

    ()=>{


        targetX = 0;

        targetY = 0;


        light.style.opacity =
        "0";



    }

    );








    card.addEventListener(

    "touchmove",

    e=>{


        const touch =

        e.touches[0];



        moveCard(

        touch.clientX,

        touch.clientY

        );



    },

    {

    passive:true

    }

    );







    card.addEventListener(

    "touchend",

    ()=>{


        targetX = 0;

        targetY = 0;


        light.style.opacity =
        "0";



    }

    );



});



}







/* تشغيل محرك 3D */

document.addEventListener(

"DOMContentLoaded",

()=>{


    init100DMotion();


}

);