// ======================
// Load Sidebar HTML
// ======================

fetch("sidebar.html")
.then(response => response.text())
.then(data => {

    const container =
    document.getElementById("sidebar-container");


    if(container){

        container.innerHTML = data;

    }


    initSidebar();

})
.catch(error => {

    console.error(
        "Sidebar loading error:",
        error
    );

});





// ======================
// Side Drawer
// ======================


function initSidebar(){


const menuBtn =
document.getElementById("menuBtn");


const sideDrawer =
document.getElementById("sideDrawer");


const drawerOverlay =
document.getElementById("drawerOverlay");


const drawerClose =
document.getElementById("drawerClose");


const aiFab =
document.getElementById("aiFab");




function openDrawer(){


    if(menuBtn){

        menuBtn.classList.add("active");

    }


    if(sideDrawer){

        sideDrawer.classList.add("show");

    }


    if(drawerOverlay){

        drawerOverlay.classList.add("show");

    }


    document.body.classList.add(
        "drawer-open"
    );



    if(aiFab){

        aiFab.classList.add(
            "drawer-open"
        );

    }


}





function closeDrawer(){


    if(sideDrawer){

        sideDrawer.classList.remove(
            "show"
        );

    }



    if(drawerOverlay){

        drawerOverlay.classList.remove(
            "show"
        );

    }



    document.body.classList.remove(
        "drawer-open"
    );



    if(menuBtn){

        menuBtn.classList.remove(
            "active"
        );

    }



    if(aiFab){

        aiFab.classList.remove(
            "drawer-open"
        );

    }


}






// ======================
// Button Open
// ======================


if(menuBtn){


    menuBtn.onclick = () => {


        openDrawer();


    };


}





// ======================
// Close Button
// ======================


if(drawerClose){


    drawerClose.onclick =
    closeDrawer;


}





// ======================
// Overlay Close
// ======================


if(drawerOverlay){


    drawerOverlay.onclick =
    closeDrawer;


}







// ======================
// Swipe Control
// ======================


let touchStartX = 0;


document.addEventListener(
"touchstart",
function(e){


    touchStartX =
    e.touches[0].clientX;


},
{passive:true});





document.addEventListener(
"touchend",
function(e){


    let touchEndX =
    e.changedTouches[0].clientX;


    let distance =
    touchEndX - touchStartX;



    // فتح من اليمين

    if(

        !sideDrawer.classList.contains("show")

        &&

        touchStartX >
        window.innerWidth - 50

        &&

        distance < -70

    ){

        openDrawer();

    }





    // إغلاق بالسحب لليمين


    if(

        sideDrawer.classList.contains("show")

        &&

        distance > 80

    ){

        closeDrawer();

    }



},
{passive:true});



}