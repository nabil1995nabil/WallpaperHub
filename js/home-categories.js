// =======================================
// WallpaperHub Home Categories
// =======================================


function initHomeCategories(){


const categories =
document.querySelectorAll(".category");



categories.forEach(category=>{


category.onclick = function(){


const categoryName =
this.dataset.category;



if(!categoryName)
return;



if(categoryName === "all"){


window.location.href =
"all-wallpapers.html";


return;


}




window.location.href =

"all-wallpapers.html?category="

+

encodeURIComponent(categoryName);



};


});


}


// نخليه متاح لـ components.js

window.initHomeCategories =
initHomeCategories;