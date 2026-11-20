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
let sliderVisible = true;
let sliderPageVisible = !document.hidden;
let sliderReducedMotion = false;


// =======================================
// أدوات مساعدة
// =======================================

function escHtml(value){
    return String(value ?? "").replace(/[&<>"']/g, c => ({
        "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    }[c]));
}

function sliderImageUrl(value){
    const image=String(value || "").trim();
    if(!image) return "/assets/logo/no-image.png";
    if(/^(https?:|data:|blob:|\/\/)/i.test(image) || image.startsWith("/") || image.startsWith("assets/")) return image;
    return "assets/wallpapers/" + image;
}

// =======================================
// تهيئة السلايدر// =======================================
// تهيئة السلايدر
// =======================================

function initSlider(data){
    const slider=document.getElementById("sliderContent");
    if(!slider || !Array.isArray(data) || !data.length) return;
    sliderItems=data.slice().reverse().slice(0,8);
    slider.replaceChildren();

    sliderItems.forEach((wall,index)=>{
        const slide=document.createElement("div");
        slide.className="slide" + (index===0 ? " active" : "");
        const imageUrl=escHtml(sliderImageUrl(wall.image || wall.thumbnail));
        const imageSource=index===0 ? 'src="' + imageUrl + '" fetchpriority="high"' : 'data-src="' + imageUrl + '"';
        slide.innerHTML='<img ' + imageSource + ' alt="' + escHtml(wall.title || "Wallpaper") + '" draggable="false" loading="' + (index===0 ? "eager" : "lazy") + '" decoding="async" onerror="this.onerror=null;this.src=\'/assets/logo/no-image.png\'">' +
            '<div class="slider-info"><div class="slider-category">' + escHtml(wall.category || "") + '</div><h3 class="slider-title">' + escHtml(wall.title || "") + '</h3><button type="button" class="slider-view-button">عرض الخلفية</button></div>';
        slide.querySelector(".slider-view-button").onclick=event=>{event.stopPropagation();openWallpaper(wall.id);};
        slider.appendChild(slide);
    });

    const total=String(sliderItems.length).padStart(2,"0");
    slider.insertAdjacentHTML("beforeend",'<div class="slider-counter"><b>01</b><span>/ ' + total + '</span></div><div class="slider-progress"><span></span></div>');
    const progress=slider.querySelector(".slider-progress");
    if(progress) progress.style.setProperty("--slider-duration",SLIDER_DURATION + "ms");

    createSliderDots();
    createMiniCards();
    bindSliderArrows();
    if(!sliderBound){
        bindMainSliderSwipe();
        bindHoverPause();
        bindSliderVisibility();
        sliderBound=true;
    }
    showSlider(0,false);
    startAutoSlider(sliderItems.length);
}

// =======================================
// عرض خلفية معينة// =======================================
// عرض خلفية معينة
// =======================================

function showSlider(index, restartTimer = true){

    const slides = document.querySelectorAll("#sliderContent .slide");

    if(!slides.length)
        return;

    const total = slides.length;

    index = ((index % total) + total) % total;

    sliderIndex = index;

    const activeImage = slides[index]?.querySelector("img[data-src]");
    if(activeImage){
        activeImage.src = activeImage.dataset.src;
        activeImage.removeAttribute("data-src");
    }

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
    const wrap=document.getElementById("miniCards");
    if(!wrap) return;
    wrap.replaceChildren();
    sliderItems.forEach((wall,index)=>{
        const card=document.createElement("button");
        card.type="button";
        card.className="mini-card";
        card.setAttribute("aria-label","الخلفية " + (index+1));
        const image=document.createElement("img");
        image.src=sliderImageUrl(wall.thumbnail || wall.image);
        image.alt="";
        image.loading="lazy";
        image.decoding="async";
        image.draggable=false;
        image.onerror=()=>{image.onerror=null;image.src="/assets/logo/no-image.png";};
        card.appendChild(image);
        card.dataset.title=wall.title || "";
        card.style.setProperty("--i",index);
        card.onclick=()=>showSlider(index);
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
    const frame=document.querySelector(".slider-frame");
    if(!frame) return;
    frame.addEventListener("mouseenter",()=>{
        sliderHovering=true;
        clearInterval(sliderTimer);
        document.querySelector("#sliderContent .slider-progress")?.classList.add("paused");
    });
    frame.addEventListener("mouseleave",()=>{
        sliderHovering=false;
        restartProgress();
        startAutoSlider(sliderItems.length);
    });
}

function bindSliderVisibility(){
    const frame=document.querySelector(".slider-frame");
    const motionQuery=window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    sliderReducedMotion=Boolean(motionQuery && motionQuery.matches);
    if(frame && "IntersectionObserver" in window){
        const observer=new IntersectionObserver(entries=>{
            sliderVisible=Boolean(entries[0] && entries[0].isIntersecting);
            if(sliderVisible) startAutoSlider(sliderItems.length);
            else clearInterval(sliderTimer);
        },{threshold:0.15});
        observer.observe(frame);
    }
    document.addEventListener("visibilitychange",()=>{
        sliderPageVisible=!document.hidden;
        if(sliderPageVisible) startAutoSlider(sliderItems.length);
        else clearInterval(sliderTimer);
    });
    if(motionQuery){
        const updateMotion=event=>{
            sliderReducedMotion=Boolean(event.matches);
            if(sliderReducedMotion) clearInterval(sliderTimer);
            else startAutoSlider(sliderItems.length);
        };
        if(motionQuery.addEventListener) motionQuery.addEventListener("change",updateMotion);
        else if(motionQuery.addListener) motionQuery.addListener(updateMotion);
    }
}

// =======================================
// سحب السلايدر (موبايل)// =======================================
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
    if(!length || length<2 || sliderHovering || !sliderVisible || !sliderPageVisible || sliderReducedMotion) return;
    sliderTimer=window.setInterval(()=>nextSlider(),SLIDER_DURATION);
}
