// ==============================
// Load Components
// ==============================


// Bottom Navigation

const bottomNav =
document.getElementById("bottomNav");


if(bottomNav){


fetch("/components/bottom-nav.html")

.then(response=>response.text())

.then(html=>{


bottomNav.innerHTML = html;



document
.querySelectorAll(".nav-item")
.forEach(item=>{


item.onclick=()=>{


const page =
item.dataset.page;



if(page){

location.href = page;

}


};


});



});



}

// ==============================
// Load AI Button
// ==============================

const aiButton =
document.getElementById("aiButton");


if(aiButton){


fetch("/components/ai-button.html")

.then(response=>response.text())

.then(html=>{


aiButton.innerHTML = html;



const script =
document.createElement("script");


script.src =
"/js/ai-button.js";


document.body.appendChild(script);



});


}

// ==============================
// Load Components
// ==============================
// Notification Button

const notificationButton =
document.getElementById("notificationButton");


if(notificationButton){

fetch("/components/notification-button.html")

.then(response=>response.text())

.then(html=>{


notificationButton.innerHTML = html;



const script =
document.createElement("script");


script.src =
"/js/notification-button.js";


document.body.appendChild(script);



});

}