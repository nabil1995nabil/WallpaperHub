// ===================================
// WallpaperHub - categories.js
// ===================================


const categories = 
document.querySelectorAll(".category-card");



// أسماء الأقسام

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




// عند الضغط على قسم

categories.forEach(card=>{


    card.addEventListener("click",()=>{


        const category =
        card.dataset.category;



        // حفظ القسم

        localStorage.setItem(
            "selectedCategory",
            category
        );



        // حفظ اسم القسم

        localStorage.setItem(

            "selectedCategoryName",

            categoryNames[category] || category

        );



        // تأثير الضغط

        card.style.transform =
        "scale(.96)";



        setTimeout(()=>{


            card.style.transform =
            "";



            location.href =

            "all-wallpapers.html?category=" +

            encodeURIComponent(category);



        },180);



    });


});





// تمييز آخر قسم تم اختياره

const lastCategory =

localStorage.getItem(
"selectedCategory"
);



if(lastCategory){


    document.querySelectorAll(".category-card")

    .forEach(card=>{


        if(card.dataset.category === lastCategory){


            card.style.border =
            "2px solid #3f51b5";


        }


    });


}