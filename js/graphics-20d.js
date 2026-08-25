// 🎬 تفعيل ظهور الأقسام عند التمرير (Scroll Reveal 3D)

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll(".wall-section").forEach(section => {
    observer.observe(section);
});

// 🖱️ تأثير الإمالة 3D مع حركة الماوس على بطاقة اليوم
const hero = document.querySelector(".today-wallpaper");

if (hero && window.matchMedia("(hover:hover)").matches) {
    hero.addEventListener("mousemove", (e) => {
        const rect = hero.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;

        hero.style.transform =
            `rotateY(x∗10deg)rotateX({x * 10}deg) rotateX(x∗10deg)rotateX({-y * 8}deg) translateY(-4px)`;
    });

    hero.addEventListener("mouseleave", () => {
        hero.style.transform = "";
    });
}
