// =======================================
// WallpaperHub — Modern Categories Handler
// تنقل سريع ومباشر بدون أنيميشن
// =======================================

function initCategories() {
    // تحديد جميع بطاقات الأقسام
    const categories = document.querySelectorAll(".category");

    categories.forEach(category => {
        // إضافة حدث النقر لكل قسم
        category.addEventListener("click", function () {
            const categoryName = this.dataset.category;
            
            if (!categoryName) return;

            // توجيه المستخدم مباشرة إلى الصفحة
            if (categoryName === "all") {
                window.location.href = "all-wallpapers.html";
            } else {
                window.location.href = "all-wallpapers.html?category=" + encodeURIComponent(categoryName);
            }
        });
    });
}

// تشغيل الدالة فور تحمبل المستند
document.addEventListener("DOMContentLoaded", initCategories);

// تصدير الدالة للنافذة للربط مع باقي الشفرة البرمجية
window.initHomeCategories = initCategories;
