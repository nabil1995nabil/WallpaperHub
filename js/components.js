// ==============================
 //Load Components
 //==============================

const bottomNav = document.getElementById("bottomNav");

if(bottomNav){

fetch("bottom-nav.html")

.then(response=>response.text())

.then(html=>{

bottomNav.innerHTML = html;

// Initialize the active item after the asynchronous component is mounted.
// Keep native anchors so keyboard, long-press and open-in-new-tab keep working.
if (window.initBottomNavigation) {
    window.initBottomNavigation(bottomNav);
} else {
    const currentParts = location.pathname.split("/").filter(Boolean);
    const current = (currentParts.pop() || "home.html").toLowerCase();
    bottomNav.querySelectorAll(".nav-item").forEach(item => {
        const targetParts = (item.dataset.page || "").split(/[?#]/)[0].split("/").filter(Boolean);
        const target = (targetParts.pop() || "").toLowerCase();
        const active = target === current || (current === "index.html" && target === "home.html");
        item.classList.toggle("active", active);
        if (active) item.setAttribute("aria-current", "page");
        else item.removeAttribute("aria-current");
    });
}
document.body.classList.add("has-bottom-nav");

});

}

// ==============================
// Home Categories Component
// ==============================

const homeCategories =
document.getElementById("homeCategories");


if(homeCategories){

fetch("/components/home-categories.html")

.then(response=>response.text())

.then(html=>{


homeCategories.innerHTML = html;



// تشغيل JS الخاص بالأقسام

if(window.initHomeCategories){

    window.initHomeCategories();

}


});


}

//==============================
//AI Button
//==============================

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
 //==============================

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

