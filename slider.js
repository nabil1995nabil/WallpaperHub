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

    const viewport =
        document.getElementById("miniViewport");

    if(!container || !viewport || !sliderItems.length)
        return;

    container.innerHTML = "";

    /*
     * Mini carousel architecture:
     * - the purple frame belongs to .mini-wrapper and never moves
     * - this track is the only thing that moves
     * - five copies give us enough room to move in either direction
     * - after a transition, we silently return to the middle copy
     */
    const copies = 5;
    const middleCopy = 2;
    const count = sliderItems.length;

    container.dataset.copies = String(copies);
    container.dataset.middleCopy = String(middleCopy);
    container.dataset.itemCount = String(count);
    container.dataset.visualIndex = String(middleCopy * count);
    container.dataset.trackX = "0";

    for(let copy = 0; copy < copies; copy++){

        sliderItems.forEach((wall,index)=>{

            const visualIndex =
                copy * count + index;

            const card =
                document.createElement("button");

            card.type = "button";
            card.className = "mini-card";
            card.dataset.index = String(index);
            card.dataset.visualIndex = String(visualIndex);

            card.setAttribute(
                "aria-label",
                `الخلفية ${index + 1}`
            );

            card.innerHTML = `
                <img
                    src="${wall.thumbnail || wall.image}"
                    alt=""
                    draggable="false"
                    loading="lazy"
                    decoding="async">
            `;

            card.addEventListener("click", (event)=>{

                if(miniDragging || miniSuppressClick){
                    miniSuppressClick = false;
                    return;
                }

                event.preventDefault();
                showSlider(index);
            });

            container.appendChild(card);
        });
    }

    /*
     * The track is positioned only after it has been laid out.
     * This prevents the first render from being shifted.
     */
    requestAnimationFrame(()=>{
        updateMiniCards(0, false);
    });
}


/* =======================================
   حساب موضع بطاقة داخل الإطار الثابت
======================================= */

function getMiniTargetLeft(card){

    const viewport =
        document.getElementById("miniViewport");

    if(!viewport || !card)
        return 0;

    return (
        card.offsetLeft -
        (viewport.clientWidth - card.offsetWidth) / 2
    );
}


/* =======================================
   تحريك شريط الصور المصغرة
   الإطار ثابت — الـ track فقط يتحرك
======================================= */

function moveMiniTrack(left, animate = true){

    const viewport =
        document.getElementById("miniViewport");

    const container =
        document.getElementById("miniCards");

    if(!viewport || !container)
        return;

    container.style.transition =
        animate
            ? "transform .45s cubic-bezier(.22,.61,.36,1)"
            : "none";

    container.style.transform =
        `translate3d(${-left}px, 0, 0)`;

    container.dataset.trackX = String(left);
}


/* =======================================
   مزامنة البطاقة الحالية مع الإطار الثابت
======================================= */

function updateMiniCards(index, animate = true){

    const viewport =
        document.getElementById("miniViewport");

    const container =
        document.getElementById("miniCards");

    if(!viewport || !container || !sliderItems.length)
        return;

    const count = sliderItems.length;
    const middleCopy =
        Number(container.dataset.middleCopy) || 2;

    const currentVisual =
        Number(container.dataset.visualIndex);

    const baseTarget =
        middleCopy * count + index;

    /*
     * اختر النسخة الأقرب للموضع الحالي.
     * لا يوجد scrollLeft ولا إعادة تمركز أثناء الحركة.
     */
    let target = baseTarget;

    if(Number.isFinite(currentVisual)){

        const candidates = [
            baseTarget - count * 2,
            baseTarget - count,
            baseTarget,
            baseTarget + count,
            baseTarget + count * 2
        ];

        target = candidates.reduce((nearest, candidate)=>{
            return Math.abs(candidate - currentVisual) <
                   Math.abs(nearest - currentVisual)
                ? candidate
                : nearest;
        });
    }

    const cards =
        container.querySelectorAll(".mini-card");

    const card = cards[target];

    if(!card)
        return;

    container.dataset.visualIndex = String(target);

    const left = getMiniTargetLeft(card);

    moveMiniTrack(left, animate);

    /*
     * بعد انتهاء الحركة، إذا اقتربنا من نسخة خارجية،
     * ننقل الموضع إلى النسخة الوسطى بدون أي حركة مرئية.
     */
    const lowLimit = count;
    const highLimit = count * 4;

    if(target < lowLimit || target >= highLimit){

        const middleTarget =
            middleCopy * count + index;

        const middleCard =
            cards[middleTarget];

        if(middleCard){

            const middleLeft =
                getMiniTargetLeft(middleCard);

            window.setTimeout(()=>{

                container.dataset.visualIndex =
                    String(middleTarget);

                moveMiniTrack(middleLeft, false);

            }, animate ? 470 : 0);
        }
    }
}


/* =======================================
   تحديد البطاقة الأقرب للإطار
======================================= */

function getCenteredMiniIndex(){

    const viewport =
        document.getElementById("miniViewport");

    const container =
        document.getElementById("miniCards");

    if(!viewport || !container || !sliderItems.length)
        return sliderIndex;

    const cards =
        container.querySelectorAll(".mini-card");

    const viewportCenter =
        viewport.clientWidth / 2;

    const trackX =
        Number(container.dataset.trackX) || 0;

    let nearest = 0;
    let nearestDistance = Infinity;

    cards.forEach((card, visualIndex)=>{

        const center =
            card.offsetLeft -
            trackX +
            card.offsetWidth / 2;

        const distance =
            Math.abs(center - viewportCenter);

        if(distance < nearestDistance){
            nearestDistance = distance;
            nearest = visualIndex;
        }
    });

    return Number(cards[nearest]?.dataset.index) || 0;
}


/* =======================================
   سحب شريط الصور المصغرة
   نفس نظام الـ track المستخدم في كل الحالات
======================================= */

function bindMiniSliderDrag(){

    const viewport =
        document.getElementById("miniViewport");

    const cards =
        document.getElementById("miniCards");

    if(!viewport || !cards)
        return;

    let pointerActive = false;
    let pointerStartX = 0;
    let pointerStartTrack = 0;

    const beginDrag = (x)=>{
        pointerActive = true;
        miniDragging = false;
        miniSuppressClick = false;
        pointerStartX = x;
        pointerStartTrack =
            Number(cards.dataset.trackX) || 0;

        cards.style.transition = "none";
        viewport.classList.add("is-dragging");
    };

    const moveDrag = (x)=>{
        if(!pointerActive)
            return;

        const delta = x - pointerStartX;

        if(Math.abs(delta) > 6){
            miniDragging = true;
            miniSuppressClick = true;
        }

        const nextLeft =
            pointerStartTrack - delta;

        moveMiniTrack(nextLeft, false);
    };

    const endDrag = ()=>{
        if(!pointerActive)
            return;

        pointerActive = false;
        viewport.classList.remove("is-dragging");

        if(!miniDragging){
            miniSuppressClick = false;
            return;
        }

        /*
         * Snap to the card that is now under the fixed frame.
         * Then make that card the main wallpaper.
         */
        const index = getCenteredMiniIndex();

        miniDragging = false;

        showSlider(index);

        window.setTimeout(()=>{
            miniSuppressClick = false;
        }, 80);
    };

    viewport.addEventListener(
        "touchstart",
        (event)=>{
            if(!event.touches?.length)
                return;

            beginDrag(event.touches[0].clientX);
        },
        {passive:true}
    );

    viewport.addEventListener(
        "touchmove",
        (event)=>{
            if(!event.touches?.length)
                return;

            moveDrag(event.touches[0].clientX);
        },
        {passive:true}
    );

    viewport.addEventListener(
        "touchend",
        endDrag,
        {passive:true}
    );

    viewport.addEventListener(
        "mousedown",
        (event)=>{
            event.preventDefault();
            beginDrag(event.clientX);
        }
    );

    window.addEventListener(
        "mousemove",
        (event)=>{
            moveDrag(event.clientX);
        }
    );

    window.addEventListener(
        "mouseup",
        endDrag
    );
}


/* =======================================
   إعادة ضبط موضع الـ track عند تغيير حجم الشاشة
======================================= */

window.addEventListener("resize", ()=>{

    if(!sliderItems.length)
        return;

    requestAnimationFrame(()=>{
        updateMiniCards(sliderIndex, false);
    });

});

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
