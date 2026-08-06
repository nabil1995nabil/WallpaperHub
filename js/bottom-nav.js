// ===============================
// WallpaperHub Bottom Navigation
// ===============================


const navItems = document.querySelectorAll(".nav-item");

const indicator = document.querySelector(".nav-indicator");


// إذا كان الشريط موجود
if(navItems.length && indicator){


    navItems.forEach((item,index)=>{


        item.addEventListener("click",()=>{


            // إزالة active من الجميع
            navItems.forEach(i=>{

                i.classList.remove("active");

            });



            // إضافة active للعنصر المختار
            item.classList.add("active");



            // تحريك الدائرة

            indicator.style.left =
            `calc(${index * 20}% + 10%)`;


        });


    });



    // تحديد الصفحة الحالية

    const page =
    location.pathname.split("/").pop();



    navItems.forEach((item)=>{


        const link =
        item.getAttribute("data-page");


        if(link === page){

            item.classList.add("active");

        }


    });


}