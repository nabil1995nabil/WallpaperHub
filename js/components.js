// ==============================
// Load Components
// ==============================


// Bottom Navigation

const bottomNav = document.getElementById("bottomNav");

if(bottomNav){

fetch("/components/bottom-nav.html")

.then(response=>response.text())

.then(html=>{

bottomNav.innerHTML = html;


document.querySelectorAll(".nav-item")
.forEach(item=>{

item.onclick=()=>{

const page = item.dataset.page;

if(page){
location.href = page;
}

};

});

});

}


// ==============================
// AI Button
// ==============================

const aiButton = document.getElementById("aiButton");

if(aiButton){

fetch("/components/ai-button.html")

.then(response=>response.text())

.then(html=>{

aiButton.innerHTML = html;


const script=document.createElement("script");

script.src="/js/ai-button.js";

document.body.appendChild(script);

});

}


// ==============================
// Notification Button
// ==============================

const notificationButton =
document.getElementById("notificationButton");


if(notificationButton){

fetch("/components/notification-button.html")

.then(response=>response.text())

.then(html=>{

notificationButton.innerHTML = html;


const script=document.createElement("script");

script.src="/js/notification-button.js";

document.body.appendChild(script);

});

}

// ==============================
// Side Drawer
// ==============================

const menuBtn = document.getElementById("menuBtn");
const sideDrawer = document.getElementById("sideDrawer");
const drawerOverlay = document.getElementById("drawerOverlay");
const drawerClose = document.getElementById("drawerClose");


if(menuBtn && sideDrawer){

menuBtn.onclick = ()=>{

sideDrawer.classList.add("show");

drawerOverlay.classList.add("show");

menuBtn.classList.add("active");

};

}


if(drawerClose){

drawerClose.onclick = ()=>{

sideDrawer.classList.remove("show");

drawerOverlay.classList.remove("show");

menuBtn.classList.remove("active");

};

}


if(drawerOverlay){

drawerOverlay.onclick = ()=>{

sideDrawer.classList.remove("show");

drawerOverlay.classList.remove("show");

menuBtn.classList.remove("active");

};

}