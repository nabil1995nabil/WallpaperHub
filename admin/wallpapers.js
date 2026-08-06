// ==========================================
// WallpaperHub Wallpapers Page JS
// ==========================================


const wallpaperContainer =
document.getElementById("wallpaperContainer");


let wallpapers = [];



// ===============================
// تحميل الخلفيات
// ===============================

async function loadWallpapers(){


try{


const response =
await fetch("/api/wallpapers");


if(!response.ok)
throw new Error("API ERROR");



wallpapers =
await response.json();



if(!Array.isArray(wallpapers))
wallpapers = [];



renderWallpapers();



}catch(error){


console.error(error);



if(wallpaperContainer){

wallpaperContainer.innerHTML =

`
<p>
فشل تحميل الخلفيات
</p>
`;

}


}


}





// ===============================
// عرض الخلفيات
// ===============================


function renderWallpapers(){


if(!wallpaperContainer)
return;



wallpaperContainer.innerHTML = "";



if(wallpapers.length === 0){


wallpaperContainer.innerHTML =

`
<p>
لا توجد خلفيات حاليا
</p>
`;

return;

}


// ترتيب الأحدث أولا
wallpapers.sort((a,b)=>{

return new Date(b.date || b.createdAt || 0) -
       new Date(a.date || a.createdAt || 0);

});

wallpapers.forEach(wall=>{



const card =
document.createElement("div");



card.className =
"admin-wall";




let media = "";



if(wall.type === "video"){


media =

`
<video

src="${wall.image}"

autoplay

muted

loop

playsinline>

</video>

`;



}else{


media =

`
<img

src="${wall.thumbnail || wall.image}"

loading="lazy">

`;

}





card.innerHTML =


`

${media}



<div class="admin-info">


<h3>

${wall.title || "بدون اسم"}

</h3>



<p>

${wall.category || "عام"}

</p>



<p>

⬇️ ${wall.downloads || 0}

&nbsp;

❤️ ${wall.likes || 0}

</p>




<div class="admin-actions">


<button

class="edit-btn"

onclick="editWallpaper('${wall.id}')"

>

تعديل

</button>



<button

class="delete-btn"

onclick="deleteWallpaper('${wall.id}')"

>

حذف

</button>



</div>



</div>


`;



wallpaperContainer.appendChild(card);



});



}



// ===============================
// حذف خلفية
// ===============================


async function deleteWallpaper(id){


if(!confirm("هل تريد حذف الخلفية؟"))
return;



try{


await fetch(

"/api/wallpapers/"+id,

{

method:"DELETE"

}

);



loadWallpapers();



}catch(error){


console.error(error);

alert("فشل الحذف");


}


}




// ===============================
// تعديل
// ===============================


function editWallpaper(id){


alert(
"سيتم تعديل الخلفية رقم: " + id
);


}




window.deleteWallpaper =
deleteWallpaper;


window.editWallpaper =
editWallpaper;



// تشغيل

loadWallpapers();