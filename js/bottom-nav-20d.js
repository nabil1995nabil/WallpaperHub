// ===================================================
// WallpaperHub - LIQUID GLOW Nav Engine
// ===================================================

const bottomNav = document.querySelector(".bottom-nav");

if (bottomNav) {

    const items = document.querySelectorAll(".nav-item");

    // 1. إنشاء القطرة السائلة
    const blob = document.createElement("div");
    blob.className = "liquid-blob";
    bottomNav.appendChild(blob);

    // 2. نقل القطرة خلف العنصر النشط
    function moveBlob(item, stretch = true) {
        const rect = item.getBoundingClientRect();
        const navRect = bottomNav.getBoundingClientRect();
        const targetX = rect.left - navRect.left + rect.width / 2;

        if (stretch) {
            blob.classList.add("stretch");
            // نرجّع العرض بعد نصف الحركة = تأثير المطر المطاطي
            setTimeout(() => blob.classList.remove("stretch"), 180);
        }

        blob.style.left = targetX + "px";
    }

    // 3. موجة اللمس (Ripple)
    function spawnRipple(item) {
        const rect = item.getBoundingClientRect();
        const navRect = bottomNav.getBoundingClientRect();
        const ripple = document.createElement("div");
        ripple.className = "ripple";
        const size = 80;
        ripple.style.width = ripple.style.height = size + "px";
        ripple.style.left = (rect.left - navRect.left + rect.width / 2 - size / 2) + "px";
        ripple.style.top = (rect.top - navRect.top + rect.height / 2 - size / 2) + "px";
        bottomNav.appendChild(ripple);
        setTimeout(() => ripple.remove(), 650);
    }

    // 4. أحداث النقر
    items.forEach(item => {
        item.addEventListener("click", () => {
            items.forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            moveBlob(item);
            spawnRipple(item);
        });
    });

    // 5. وضع القطرة في مكانها الأول عند التحميل
    const first = document.querySelector(".nav-item.active") || items[0];
    if (first) {
        // بدون حركة أول مرة — تظهر مباشرة في مكانها
        blob.style.transition = "none";
        moveBlob(first, false);
        setTimeout(() => blob.style.transition = "", 50);
    }

    // 6. إعادة التموضع عند تدوير الشاشة أو تغيير الحجم
    window.addEventListener("resize", () => {
        const current = document.querySelector(".nav-item.active");
        if (current) moveBlob(current, false);
    });
}
