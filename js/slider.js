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

    createMiniCards(items);
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

    updateMiniCards(index);

}

function updateMiniCards(index){

    const cards =
    document.querySelectorAll(".mini-card img");


    const labels =
    document.querySelectorAll(".mini-card span");


    const total =
    wallpapers.length;


    cards.forEach((card,i)=>{

        let imgIndex =
        (index + i + total - 1) % total;


        card.src =
        wallpapers[imgIndex].thumbnail ||
        wallpapers[imgIndex].image;


        if(labels[i]){

            labels[i].textContent =
            wallpapers[imgIndex].title || "";

        }


    });


    document
    .querySelectorAll(".mini-card")
    .forEach((card,i)=>{

        card.classList.toggle(
            "active",
            i === 1
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