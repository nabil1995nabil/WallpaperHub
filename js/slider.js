// =======================================
// WallpaperHub New Interactive Slider
// =======================================

let sliderIndex = 0;
let sliderTimer;


// تشغيل السلايدر
function initSlider(data){

    const slider =
    document.getElementById("sliderContent");


    if(!slider) return;


    slider.innerHTML = "";


    // آخر 10 خلفيات
    const items =
data
.slice()
.reverse();



    items.forEach((wall,index)=>{


        const slide =
        document.createElement("div");


        slide.className =
        "slide";


        if(index === 0)
        slide.classList.add("active");



        slide.innerHTML = `

        <img 
        src="${wall.image}"
        alt="${wall.title || 'Wallpaper'}">


        <div class="slider-info">


<div class="slider-category">
${wall.category || ""}
</div>


            <button>
            عرض الخلفية
            </button>


        </div>



        `;



        slide.querySelector("button")
        .onclick = ()=>{

            openWallpaper(wall.id);

        };



        slider.appendChild(slide);




        


    });

    startAutoSlider(items.length);

}




// عرض سلايد

function showSlider(index){

    const slides =
    document.querySelectorAll(
        "#sliderContent .slide"
    );

    if(!slides.length)
    return;


    sliderIndex = index;


    slides.forEach((slide,i)=>{

        slide.classList.toggle(
            "active",
            i === index
        );

    });


}


// =======================================
// السحب على السلايدر الرئيسي
// =======================================

function bindSliderSwipe(){

    const slider =
        document.getElementById("sliderContent");

    if(!slider)
        return;

    let startX = 0;
    let startY = 0;
    let touching = false;

    slider.addEventListener("touchstart", (event)=>{

        if(!event.touches || !event.touches.length)
            return;

        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
        touching = true;

    }, {passive:true});


    slider.addEventListener("touchend", (event)=>{

        if(!touching ||
           !event.changedTouches ||
           !event.changedTouches.length)
            return;

        touching = false;

        const endX =
            event.changedTouches[0].clientX;

        const endY =
            event.changedTouches[0].clientY;

        const deltaX = endX - startX;
        const deltaY = endY - startY;


        // تجاهل السحب العمودي
        if(
            Math.abs(deltaX) < 45 ||
            Math.abs(deltaX) <= Math.abs(deltaY)
        ){
            return;
        }


        const total =
            document.querySelectorAll(
                "#sliderContent .slide"
            ).length;


        if(!total)
            return;


        // سحب إلى اليسار = التالية
        if(deltaX < 0){

            sliderIndex++;

            if(sliderIndex >= total)
                sliderIndex = 0;

        }

        // سحب إلى اليمين = السابقة
        else{

            sliderIndex--;

            if(sliderIndex < 0)
                sliderIndex = total - 1;

        }


        showSlider(sliderIndex);

    }, {passive:true});

}


// =======================================
// تشغيل تلقائي
// =======================================

function startAutoSlider(length){


    clearInterval(sliderTimer);


    sliderTimer =
    setInterval(()=>{


        sliderIndex++;


        if(sliderIndex>=length)
        sliderIndex=0;



        showSlider(sliderIndex);



    },5000);



}

// تفعيل السحب على السلايدر الكبير
document.addEventListener("DOMContentLoaded", ()=>{

    bindSliderSwipe();

});
