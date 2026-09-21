const categories = document.querySelectorAll(".category-card");

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

/*
 * تم حذف كل محرك 3D / Tilt / translateZ / hover / animation.
 * الضغط الآن يحفظ الاختيار وينتقل مباشرة بدون انتظار ثانيتين.
 */
categories.forEach(card => {
    card.addEventListener("click", () => {
        const category = card.dataset.category;

        categories.forEach(item => {
            item.classList.remove("is-selected");
        });

        card.classList.add("is-selected");

        localStorage.setItem("selectedCategory", category);
        localStorage.setItem(
            "selectedCategoryName",
            categoryNames[category] || category
        );

        location.href =
            "all-wallpapers.html?category=" +
            encodeURIComponent(category);
    });
});

/* إبقاء القسم الأخير محدداً عند العودة للصفحة */
const lastCategory = localStorage.getItem("selectedCategory");

if (lastCategory) {
    const activeCard = document.querySelector(
        `.category-card[data-category="${CSS.escape(lastCategory)}"]`
    );

    if (activeCard) {
        activeCard.classList.add("is-selected");
    }
}
