const categories = document.querySelectorAll(".category-card");

// تحديث أسماء كافة الأقسام الـ 14 بالكامل لمنع أي توقف برمي
const categoryNames = {
    all: "الكل",
    nature: "الطبيعة",
    cars: "السيارات",
    games: "الألعاب",
    space: "الفضاء",
    ai: "الذكاء الاصطناعي",
    amoled: "AMOLED",
    animals: "الحيوانات",
    anime: "الأنمي",
    city: "المدن",
    dark: "Dark",
    "4k": "4K",
    sports: "الرياضة",
    minimal: "Minimal"
};

// محرك الإمالة ثلاثي الأبعاد المطور (1000D)
categories.forEach(card => {
    card.style.transition = "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)";
    card.style.transformStyle = "preserve-3d";

    card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(1000px) rotateX(${y * -8}deg) rotateY(${x * 8}deg) translateZ(5px)`;
    });

    card.addEventListener("mouseleave", () => {
        card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)";
    });
});

// معالجة الضغط وتفعيل الإطارات الدوارة لجميع الأقسام بدون استثناء
categories.forEach(card => {
    card.addEventListener("click", () => {
        const category = card.dataset.category;

        categories.forEach(c => {
            c.classList.remove("active-border");
            c.style.border = "1px solid rgba(255, 255, 255, 0.6)";
        });

        card.classList.add("active-border");
        card.style.border = "none";

        localStorage.setItem("selectedCategory", category);
        localStorage.setItem("selectedCategoryName", categoryNames[category] || category);

        card.style.transform = "scale(0.95) translateZ(0px)";

        setTimeout(() => {
            card.style.transform = "";
            location.href = "all-wallpapers.html?category=" + encodeURIComponent(category);
        }, 2000); // مهلة ثانيتين لمشاهدة الدوران اللوني الفاخر لإطار الحافة
    });
});

// تفعيل كرت آخر قسم تلقائياً عند تحميل الصفحة
const lastCategory = localStorage.getItem("selectedCategory");
if (lastCategory) {
    const activeCard = document.querySelector(`.category-card[data-category="${lastCategory}"]`);
    if (activeCard) {
        activeCard.classList.add("active-border");
        activeCard.style.border = "none";
    }
}
