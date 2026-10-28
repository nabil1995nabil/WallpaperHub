// =======================================
// WallpaperHub — Cinematic Slider v2
// =======================================

const SLIDER_DURATION = 5000;

let sliderIndex = 0;
let sliderTimer = null;
let sliderItems = [];
let sliderTouchStartX = 0;
let sliderTouchStartY = 0;
let sliderTouchActive = false;
let sliderHovering = false;
let sliderBound = false;


// =======================================
// أدوات مساعدة
// =======================================

function escHtml(value){
    return String(value ?? "").replace(/[&<>"']/g, c => ({
        "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    }[c]));
}


// =======================================
// تهيئة السلايدر
// =======================================

function initSlider(data){

    const slider = document.getElementById("sliderContent");

    if(!slider || !Array.isArray(data) || !data.length)
        return;

    sliderItems = data.slice().reverse();

    slider.innerHTML = "";

    sliderItems.forEach((wall, index) => {

        const slide = document.createElement("div");
        slide.className = "slide" + (index === 0 ? " active" : "");

        slide.innerHTML = `
            <img src="${escHtml(wall.image)}"
                 alt="${escHtml(wall.title || "Wallpaper")}"
                 draggable="false"
                 loading="${index < 2 ? "eager" : "lazy"}">
            <div class="slider-info">
                <div class="slider-category">${escHtml(wall.category || "")}</div>
                <h3 class="slider-title">${escHtml(wall.title || "")}</h3>
                <button type="button" class="slider-view-button">عرض الخلفية</button>
            </div>
        `;

        slide.querySelector(".slider-view-button").onclick = (event) => {
            event.stopPropagation();
            openWallpaper(wall.id);
        };

        slider.appendChild(slide);
    });

    // العداد وشريط التقدم
    const total = String(sliderItems.length).padStart(2, "0");
    slider.insertAdjacentHTML("beforeend", `
        <div class="slider-counter"><b>01</b><span>/ ${total}</span></div>
        <div class="slider-progress"><span></span></div>
    `);

    const progress = slider.querySelector(".slider-progress");
    if(progress)
        progress.style.setProperty("--slider-duration", SLIDER_DURATION + "ms");

    createSliderDots();
    createMiniCards();
    bindSliderArrows();

    if(!sliderBound){
        bindMainSliderSwipe();
        bindHoverPause();
        sliderBound = true;
    }

    showSlider(0, false);
    startAutoSlider(sliderItems.length);
}


// =======================================
// عرض خلفية معينة
// =======================================

function showSlider(index, restartTimer = true){

    const slides = document.querySelectorAll("#sliderContent .slide");

    if(!slides.length)
        return;

    const total = slides.length;

    index = ((index % total) + total) % total;

    sliderIndex = index;

    slides.forEach((slide, i) => {
        slide.classList.toggle("active", i === index);
    });

    updateSliderDots(index);
    updateMiniCards(index);
    updateCounter(index);
    restartProgress();

    if(restartTimer)
        startAutoSlider(total);
}


// =======================================
// التنقل
// =======================================

function nextSlider(){
    if(!sliderItems.length) return;
    showSlider(sliderIndex + 1);
}

function prevSlider(){
    if(!sliderItems.length) return;
    showSlider(sliderIndex - 1);
}


// =======================================
// الأسهم
// =======================================

function bindSliderArrows(){

    const prev = document.getElementById("sliderPrev");
    const next = document.getElementById("sliderNext");

    if(prev){
        prev.onclick = (event) => {
            event.preventDefault();
            prevSlider();
        };
    }

    if(next){
        next.onclick = (event) => {
            event.preventDefault();
            nextSlider();
        };
    }
}


// =======================================
// النقاط
// =======================================

function createSliderDots(){

    const dots = document.getElementById("sliderDots");

    if(!dots) return;

    dots.innerHTML = "";

    sliderItems.forEach((wall, index) => {

        const dot = document.createElement("button");

        dot.type = "button";
        dot.className = "slider-dot";
        dot.setAttribute("aria-label", `الانتقال إلى الخلفية ${index + 1}`);

        dot.onclick = () => showSlider(index);

        dots.appendChild(dot);
    });
}

function updateSliderDots(index){

    document.querySelectorAll("#sliderDots .slider-dot").forEach((dot, i) => {
        dot.classList.toggle("active", i === index);
    });
}


// =======================================
// الخلفيات المصغرة
// =======================================

function createMiniCards(){

    const wrap = document.getElementById("miniCards");

    if(!wrap) return;

    wrap.innerHTML = "";

    sliderItems.forEach((wall, index) => {

        const card = document.createElement("button");

        card.type = "button";
        card.className = "mini-card";
        card.setAttribute("aria-label", `الخلفية ${index + 1}`);
        card.innerHTML = `<img src="${escHtml(wall.image)}" alt="" loading="lazy" draggable="false">`;
        card.dataset.title = wall.title || "";
        card.style.setProperty("--i", index);

        card.onclick = () => showSlider(index);

        wrap.appendChild(card);
    });
}

function updateMiniCards(index){

    const cards = document.querySelectorAll("#miniCards .mini-card");
    const viewport = document.getElementById("miniViewport");

    cards.forEach((card, i) => {
        card.classList.toggle("active", i === index);
    });

    const active = cards[index];

    if(!active || !viewport) return;

    // تمركز البطاقة النشطة داخل الشريط (بدون تحريك الصفحة)
    const target = active.offsetLeft - (viewport.clientWidth - active.offsetWidth) / 2;

    viewport.scrollTo({ left: target, behavior: "smooth" });
}


// =======================================
// العداد وشريط التقدم
// =======================================

function updateCounter(index){

    const el = document.querySelector("#sliderContent .slider-counter b");

    if(el)
        el.textContent = String(index + 1).padStart(2, "0");
}

function restartProgress(){

    const bar = document.querySelector("#sliderContent .slider-progress");

    if(!bar) return;

    bar.classList.remove("run", "paused");
    void bar.offsetWidth; // إعادة تشغيل الأنيميشن
    bar.classList.add("run");

    if(sliderHovering)
        bar.classList.add("paused");
}


// =======================================
// إيقاف مؤقت عند مرور الماوس
// =======================================

function bindHoverPause(){

    const frame = document.querySelector(".slider-frame");

    if(!frame) return;

    frame.addEventListener("mouseenter", () => {
        sliderHovering = true;
        clearInterval(sliderTimer);
        document.querySelector("#sliderContent .slider-progress")
            ?.classList.add("paused");
    });

    frame.addEventListener("mouseleave", () => {
        sliderHovering = false;
        restartProgress();
        startAutoSlider(sliderItems.length);
    });
}


// =======================================
// سحب السلايدر (موبايل)
// =======================================

function bindMainSliderSwipe(){

    const slider = document.getElementById("sliderContent");

    if(!slider) return;

    slider.addEventListener("touchstart", (event) => {

        if(!event.touches || !event.touches.length)
            return;

        sliderTouchStartX = event.touches[0].clientX;
        sliderTouchStartY = event.touches[0].clientY;
        sliderTouchActive = true;

    }, { passive: true });

    slider.addEventListener("touchend", (event) => {

        if(!sliderTouchActive || !event.changedTouches || !event.changedTouches.length)
            return;

        sliderTouchActive = false;

        const deltaX = event.changedTouches[0].clientX - sliderTouchStartX;
        const deltaY = event.changedTouches[0].clientY - sliderTouchStartY;

        // نتجاهل السحب العمودي والسحب القصير
        if(Math.abs(deltaX) < 45 || Math.abs(deltaX) <= Math.abs(deltaY))
            return;

        if(deltaX < 0)
            nextSlider();
        else
            prevSlider();

    }, { passive: true });
}


// =======================================
// التشغيل التلقائي
// =======================================

function startAutoSlider(length){

    clearInterval(sliderTimer);

    if(!length || length < 2 || sliderHovering)
        return;

    sliderTimer = setInterval(() => {
        nextSlider();
    }, SLIDER_DURATION);
}
