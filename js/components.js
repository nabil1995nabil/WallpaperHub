// Shared page components
const bottomNav = document.getElementById("bottomNav");
if(bottomNav){
    document.body.classList.add("has-bottom-nav");
    fetch("/bottom-nav.html?v=20261123-explore-1",{cache:"reload"})
        .then(response=>{
            if(!response.ok)throw new Error("Bottom navigation request failed: "+response.status);
            return response.text();
        })
        .then(html=>{
            if(!html.includes('class="bottom-nav"'))throw new Error("Bottom navigation markup is invalid");
            bottomNav.innerHTML=html;
            if(window.initBottomNavigation)window.initBottomNavigation(bottomNav);
            else{document.body.classList.remove("has-bottom-nav");console.warn("BOTTOM NAV: initializer is not available");}
        })
        .catch(error=>{document.body.classList.remove("has-bottom-nav");console.warn("BOTTOM NAV LOAD ERROR:",error)});
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

