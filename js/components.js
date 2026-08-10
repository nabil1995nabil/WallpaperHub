// ==============================
// Load Components
// ==============================


const bottomNav =
document.getElementById("bottomNav");


if(bottomNav){


fetch("/components/bottom-nav.html")

.then(response=>response.text())

.then(html=>{


bottomNav.innerHTML = html;



// Navigation

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