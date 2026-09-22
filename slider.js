// =======================================
// WallpaperHub — Interactive Slider Pro
// =======================================

let sliderIndex = 0;
let sliderTimer = null;
let sliderItems = [];
let sliderTouchStartX = 0;
let sliderTouchStartY = 0;
let sliderTouchActive = false;
let miniDragging = false;
let miniSuppressClick = false;
let miniStartX = 0;
let miniStartScroll = 0;


// =======================================
// تهيئة السلايدر
// =======================================

function initSlider(data){

    const slider =
        document.getElementById("sliderContent");

    if(!slider)
        return;


    sliderItems =
        data
        .slice()
        .reverse();


    slider.innerHTML = "";


    sliderItems.forEach((wall,index)=>{

        const slide =
            document.createElement("div");

        slide.className = "slide";

        if(index === 0)
            slide.classList.add("active");


        slide.innerHTML = `

            <img
                src="${wall.image}"
                alt="${wall.title || "Wallpaper"}"
                draggable="false">

            <div class="slider-info">

                <div class="slider-category">
                    ${wall.category || ""}
                </div>

                <button
                    type="button"
                    class="slider-view-button">
                    عرض الخلفية
                </button>

            </div>
        `;


        const viewButton =
            slide.querySelector(".slider-view-button");


        viewButton.onclick = (event)=>{

            event.stopPropagation();

            openWallpaper(wall.id);

        };


        slider.appendChild(slide);

    });


    createMiniCards();

    createSliderDots();

    showSlider(0, false);

    bindSliderArrows();

    bindMainSliderSwipe();

    bindMiniSliderDrag();

    startAutoSlider(sliderItems.length);

}


// =======================================
// عرض خلفية معينة
// =======================================

function showSlider(index, restartTimer = true){

    const slides =
        document.querySelectorAll(
            "#sliderContent .slide"
        );


    if(!slides.length)
        return;


    const total =
        slides.length;


    index =
        ((index % total) + total) % total;


    sliderIndex = index;


    slides.forEach((slide,i)=>{

        slide.classList.toggle(
            "active",
            i === index
        );

    });


    updateMiniCards(index);

    updateSliderDots(index);


    if(restartTimer)
        startAutoSlider(total);

}


// =======================================
// الخلفية التالية
// =======================================

function nextSlider(){

    if(!sliderItems.length)
        return;

    showSlider(sliderIndex + 1);

}


// =======================================
// الخلفية السابقة
// =======================================

function prevSlider(){

    if(!sliderItems.length)
        return;

    showSlider(sliderIndex - 1);

}


// =======================================
// الأسهم
// =======================================

function bindSliderArrows(){

    const prev =
        document.getElementById("sliderPrev");

    const next =
        document.getElementById("sliderNext");


    if(prev){

        prev.onclick = (event)=>{

            event.preventDefault();

            prevSlider();

        };

    }


    if(next){

        next.onclick = (event)=>{

            event.preventDefault();

            nextSlider();

        };

    }

}


// =======================================
// إنشاء شريط الصور المصغرة
// =======================================

function createMiniCards(){

    const container =
        document.getElementById("miniCards");


    if(!container)
        return;


    container.innerHTML = "";


    sliderItems.forEach((wall,index)=>{

        const card =
            document.createElement("button");


        card.type = "button";

        card.className = "mini-card";

        card.setAttribute(
            "aria-label",
            `الخلفية ${index + 1}`
        );


        card.innerHTML = `

            <img
                src="${wall.thumbnail || wall.image}"
                alt=""
                draggable="false">

        `;


        card.addEventListener(
            "click",
            (event)=>{

                // إذا كانت العملية سحباً لا نعتبرها نقرة
                if(miniDragging || miniSuppressClick){
                    miniSuppressClick = false;
                    return;
                }


                event.preventDefault();

                showSlider(index);

            }
        );


        container.appendChild(card);

    });

}


// =======================================
// تحديث الصورة المصغرة النشطة
// =======================================

function updateMiniCards(index){

    const cards =
        document.querySelectorAll(
            "#miniCards .mini-card"
        );


    /*
     * الإطار البنفسجي أصبح ثابتاً فوق منتصف الشريط.
     * لا نضيف active للبطاقات حتى لا يتحرك الإطار مع الخلفية.
     * الخلفيات نفسها هي التي تمر من تحت الإطار.
     */
    cards.forEach((card)=>{
        card.classList.remove("active");
    });


    const activeCard =
        cards[index];

    const viewport =
        document.getElementById("miniViewport");

    /*
     * نحرك محتوى الصور المصغرة فقط داخل النافذة الثابتة.
     * النافذة والإطار لا يتحركان مع الصفحة أو مع الخلفية.
     */
    if(activeCard && viewport){

        const targetLeft =
            activeCard.offsetLeft -
            (viewport.clientWidth - activeCard.offsetWidth) / 2;

        const maxLeft =
            Math.max(0, viewport.scrollWidth - viewport.clientWidth);

        viewport.scrollTo({
            left: Math.max(0, Math.min(targetLeft, maxLeft)),
            behavior: "smooth"
        });

    }

}


// =======================================
// النقاط
// =======================================

function createSliderDots(){

    const dots =
        document.getElementById("sliderDots");


    if(!dots)
        return;


    dots.innerHTML = "";


    sliderItems.forEach((wall,index)=>{

        const dot =
            document.createElement("button");


        dot.type = "button";

        dot.className = "slider-dot";

        dot.setAttribute(
            "aria-label",
            `الانتقال إلى الخلفية ${index + 1}`
        );


        dot.onclick = ()=>{

            showSlider(index);

        };


        dots.appendChild(dot);

    });

}


function updateSliderDots(index){

    const dots =
        document.querySelectorAll(
            "#sliderDots .slider-dot"
        );


    dots.forEach((dot,i)=>{

        dot.classList.toggle(
            "active",
            i === index
        );

    });

}


// =======================================
// سحب السلايدر الرئيسي
// =======================================

function bindMainSliderSwipe(){

    const slider =
        document.getElementById("sliderContent");


    if(!slider)
        return;


    slider.addEventListener(
        "touchstart",
        (event)=>{

            if(
                !event.touches ||
                !event.touches.length
            )
                return;


            sliderTouchStartX =
                event.touches[0].clientX;

            sliderTouchStartY =
                event.touches[0].clientY;

            sliderTouchActive = true;

        },
        {passive:true}
    );


    slider.addEventListener(
        "touchend",
        (event)=>{

            if(
                !sliderTouchActive ||
                !event.changedTouches ||
                !event.changedTouches.length
            )
                return;


            sliderTouchActive = false;


            const endX =
                event.changedTouches[0].clientX;

            const endY =
                event.changedTouches[0].clientY;


            const deltaX =
                endX - sliderTouchStartX;

            const deltaY =
                endY - sliderTouchStartY;


            // نتجاهل السحب العمودي
            if(
                Math.abs(deltaX) < 45 ||
                Math.abs(deltaX) <= Math.abs(deltaY)
            )
                return;


            if(deltaX < 0)
                nextSlider();
            else
                prevSlider();

        },
        {passive:true}
    );

}


// =======================================
// سحب شريط الصور المصغرة
// يعمل باللمس والفأرة
// =======================================

function bindMiniSliderDrag(){

    const viewport =
        document.getElementById("miniViewport");

    const cards =
        document.getElementById("miniCards");


    if(!viewport || !cards)
        return;


    // اللمس
    viewport.addEventListener(
        "touchstart",
        (event)=>{

            if(
                !event.touches ||
                !event.touches.length
            )
                return;


            miniDragging = false;

            miniStartX =
                event.touches[0].clientX;

            miniStartScroll =
                viewport.scrollLeft;

        },
        {passive:true}
    );


    viewport.addEventListener(
        "touchmove",
        (event)=>{

            if(
                !event.touches ||
                !event.touches.length
            )
                return;


            const delta =
                event.touches[0].clientX -
                miniStartX;


            if(Math.abs(delta) > 7){
                miniDragging = true;
                miniSuppressClick = true;
            }


            viewport.scrollLeft =
                miniStartScroll - delta;

        },
        {passive:true}
    );


    viewport.addEventListener(
        "touchend",
        ()=>{
            setTimeout(()=>{
                miniDragging = false;
            },80);
        },
        {passive:true}
    );


    // الفأرة / الكمبيوتر
    viewport.addEventListener(
        "mousedown",
        (event)=>{

            miniDragging = false;

            miniStartX =
                event.clientX;

            miniStartScroll =
                viewport.scrollLeft;

            viewport.classList.add(
                "is-dragging"
            );

        }
    );


    window.addEventListener(
        "mousemove",
        (event)=>{

            if(
                !viewport.classList.contains(
                    "is-dragging"
                )
            )
                return;


            const delta =
                event.clientX -
                miniStartX;


            if(Math.abs(delta) > 5){
                miniDragging = true;
                miniSuppressClick = true;
            }


            viewport.scrollLeft =
                miniStartScroll - delta;

        }
    );


    window.addEventListener(
        "mouseup",
        ()=>{

            viewport.classList.remove(
                "is-dragging"
            );


            setTimeout(()=>{
                miniDragging = false;
            },80);

        }
    );

}


// =======================================
// التشغيل التلقائي
// =======================================

function startAutoSlider(length){

    clearInterval(sliderTimer);


    if(!length || length < 2)
        return;


    sliderTimer =
        setInterval(()=>{

            nextSlider();

        },5000);

}


// =======================================
// عند تحميل الصفحة
// =======================================

document.addEventListener(
    "DOMContentLoaded",
    ()=>{

        // الأدوات تُربط داخل initSlider أيضاً.
        // هذا السطر فقط يضمن عدم وجود أخطاء
        // إذا لم يتم تحميل بيانات السلايدر.

    }
);
