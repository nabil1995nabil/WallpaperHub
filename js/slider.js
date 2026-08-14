// =======================================
// WallpaperHub New Interactive Slider
// =======================================

let sliderIndex = 0;
let sliderTimer;


// تشغيل السلايدر
function initSlider(data){

    const slider =
    document.getElementById("sliderContent");

    const dots =
    document.getElementById("sliderDots");


    if(!slider) return;


    slider.innerHTML = "";
    
    if(dots){
        dots.innerHTML = "";
    }


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
${wall.category}
</div>


<div class="title-marquee">

<div class="title-box">

<h2>
${wall.title}
</h2>

</div>


            <p>
            ${wall.description || "خلفية مميزة من WallpaperHub"}
            </p>


            <button>
            عرض الخلفية
            </button>


        </div>



        <div class="mini-cards"></div>


        `;



        slide.querySelector("button")
        .onclick = ()=>{

            openWallpaper(wall.id);

        };



        slider.appendChild(slide);



        // النقاط

        if(dots){

            const dot =
            document.createElement("span");


            dot.className =
            "slider-dot";


            if(index===0)
            dot.classList.add("active");



            dot.onclick=()=>{

                showSlider(index);

            };


            dots.appendChild(dot);

        }


    });



    createMiniCards(items);


    startAutoSlider(items.length);

}




// عرض سلايد

function showSlider(index){


    const slides =
    document.querySelectorAll(
        "#sliderContent .slide"
    );


    const dots =
    document.querySelectorAll(
        "#sliderDots .slider-dot"
    );


    if(!slides.length)
    return;



    sliderIndex = index;



    slides.forEach((slide,i)=>{

        slide.classList.toggle(
            "active",
            i===index
        );

    });



    dots.forEach((dot,i)=>{

        dot.classList.toggle(
            "active",
            i===index
        );

    });


}





// الصور الصغيرة

function createMiniCards(items){

    const container =
    document.querySelector(".mini-cards");


    if(!container) return;


    container.innerHTML="";


    items.forEach((wall,index)=>{


        const card =
        document.createElement("div");


        card.className="mini-card";


        card.innerHTML=`

        <img src="${wall.thumbnail || wall.image}">

        <span>
        ${wall.title || ""}
        </span>

        `;


        card.onclick=()=>{

            showSlider(index);

        };


        container.appendChild(card);


    });

}

// تشغيل تلقائي

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