// ===================================================
// WallpaperHub 100D Bottom Nav Engine
// Canvas Plasma + Magnetic Animation (Full Complete Code)
// ===================================================

const bottomNav = document.querySelector(".bottom-nav");

if (bottomNav) {

    // 1. إنشاء وتهيئة كافنس البلازما (Plasma Canvas Setup)
    const canvas = document.createElement("canvas");
    canvas.className = "plasma-canvas";
    bottomNav.prepend(canvas);

    const ctx = canvas.getContext("2d");

    let width = canvas.width = bottomNav.offsetWidth;
    let height = canvas.height = bottomNav.offsetHeight;

    // تحديث أبعاد الكانفاس عند تغيير حجم الشاشة لضمان دقة الرسوميات
    window.addEventListener("resize", () => {
        width = canvas.width = bottomNav.offsetWidth;
        height = canvas.height = bottomNav.offsetHeight;
    });

    let particles = [];

    // 2. دالة توليد الجزيئات المضيئة (Particle Generator)
    function createParticles(x, y) {
        for (let i = 0; i < 18; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - .5) * 4,
                vy: (Math.random() - .5) * 4,
                size: Math.random() * 2.5 + 1,
                alpha: 1
            });
        }
    }

    // 3. حلقة رسم وتحديث حركة جزيئات البلازما (Animation Loop)
    function drawParticles() {
        ctx.clearRect(0, 0, width, height);

        particles.forEach((p, index) => {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= .025; // سرعة تلاشي الجزيئات

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

            // تعديل ألوان الجزيئات إلى اللون الأزرق النقي المتناسق مع النحت الكريستالي الجديد
            ctx.fillStyle = `rgba(80, 96, 255, ${p.alpha})`;
            ctx.shadowBlur = 8;
            ctx.shadowColor = "#5060ff";
            ctx.fill();

            // حذف الجزيئات الميتة لتوفير الذاكرة وسرعة الأداء
            if (p.alpha <= 0) {
                particles.splice(index, 1);
            }
        });

        requestAnimationFrame(drawParticles);
    }

    // تشغيل محرك الرسوميات الخاص بالجزيئات
    drawParticles();

    // ===============================================
    // 4. التحكم في العنصر النشط والخط المضيء (Active State & Indicator)
    // ===============================================
    const items = document.querySelectorAll(".nav-item");
    let active = document.createElement("div");
    active.className = "plasma-line";
    bottomNav.appendChild(active);

    // دالة نقل المؤشر المضيء أسفل العنصر النشط بسلاسة
    function moveIndicator(item) {
        const rect = item.getBoundingClientRect();
        const navRect = bottomNav.getBoundingClientRect();
        // تم تعديل المعادلة لتتوافق مع العرض المطور للمؤشر (40px) بالمنتصف تماماً
        active.style.left = (rect.left - navRect.left + rect.width / 2 - 20) + "px";
    }

    // إضافة مستمعات الأحداث للنقر على عناصر الشريط
    items.forEach((item, index) => {
        item.addEventListener("click", () => {
            // إزالة الحالة النشطة من جميع العناصر
            items.forEach(i => i.classList.remove("active"));

            // تفعيل العنصر الحالي
            item.classList.add("active");
            moveIndicator(item);

            // حساب موقع النقر لتوليد تأثير انفجار البلازما بدقة في منتصف الأيقونة
            const rect = item.getBoundingClientRect();
            const navRect = bottomNav.getBoundingClientRect();

            createParticles(
                rect.left - navRect.left + rect.width / 2,
                rect.top - navRect.top + rect.height / 2
            );
        });
    });

    // تشغيل وضبط موضع المؤشر عند تحميل الصفحة لأول مرة بناءً على العنصر النشط حالياً
    const first = document.querySelector(".nav-item.active");
    if (first) {
        setTimeout(() => {
            moveIndicator(first);
        }, 200);
    }

    // ===============================================
    // 5. تأثير الإمالة والمغناطيسية ثلاثية الأبعاد (100D Magnetic 3D Mouse Effect)
    // ===============================================
    bottomNav.addEventListener("mousemove", (e) => {
        const rect = bottomNav.getBoundingClientRect();
        const x = e.clientX - (rect.left + rect.width / 2);
        const y = e.clientY - (rect.top + rect.height / 2);

        // إمالة الشريطة بالكامل بنعومة فائقة حول المركز لمنع تشوه أبعاد النحت البارز
        bottomNav.style.transform = `translateX(-50%) rotateX(${-y * .08}deg) rotateY(${x * .04}deg) translateZ(5px)`;

        // تطبيق التأثير المغناطيسي الجاذب على الأيقونات الداخلية الفردية القريبة من الماوس
        items.forEach(btn => {
            const b = btn.getBoundingClientRect();
            const bx = e.clientX - (b.left + b.width / 2);
            const by = e.clientY - (b.top + b.height / 2);
            const dist = Math.sqrt(bx * bx + by * by);

            // إذا كان مؤشر الماوس قريباً من الأيقونة بمسافة أقل من 70 بكسل
            if (dist < 70) {
                btn.style.transform = `translateZ(15px) rotateY(${bx * .1}deg) rotateX(${-by * .1}deg)`;
            } else {
                btn.style.transform = "";
            }
        });
    });

    // إعادة الأبعاد والحركات لوضعها الطبيعي المستقر فور خروج مؤشر الماوس من شريط التنقل
    bottomNav.addEventListener("mouseleave", () => {
        bottomNav.style.transform = "translateX(-50%) rotateX(0deg) rotateY(0deg) translateZ(0px)";
        items.forEach(btn => {
            btn.style.transform = "";
        });
    });
}
