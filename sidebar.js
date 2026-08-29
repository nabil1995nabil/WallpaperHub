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





// فتح القائمة

if(menuBtn && sideDrawer && drawerOverlay){


    menuBtn.onclick = () => {


        menuBtn.classList.add("active");



        setTimeout(()=>{


            sideDrawer.classList.add("show");


            drawerOverlay.classList.add("show");


            document.body.classList.add(
                "drawer-open"
            );



        },120);




        if(aiFab){

            aiFab.classList.add(
                "drawer-open"
            );

        }


    };


}







// زر الإغلاق

if(drawerClose){


    drawerClose.onclick =
    closeDrawer;


}






// الضغط على الخلفية

if(drawerOverlay){


    drawerOverlay.onclick =
    closeDrawer;


}






// إغلاق القائمة

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



}