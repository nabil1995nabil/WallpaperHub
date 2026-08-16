// ==========================================
// WallpaperHub Admin JS
// Part 1/5
// ==========================================
// ============================
// العناصر
// ============================


const wallpapersCount =
document.getElementById("wallpapersCount");


const downloadsCount =
document.getElementById("downloadsCount");


const favoritesCount =
document.getElementById("favoritesCount");


const wallpaperContainer =
document.getElementById("wallpaperContainer");


const logoutBtn =
document.getElementById("logoutBtn");



const form =
document.getElementById("wallpaperForm");



const imageInput =
document.getElementById("wallImage");



const typeInput =
document.getElementById("wallType");



const videoThumbnailInput =
document.getElementById("videoThumbnail");



const imagesPreview =
document.getElementById("imagesPreview");



const selectedImagesCount =
document.getElementById("selectedImagesCount");



const uploadProgressBox =
document.getElementById("uploadProgressBox");



const uploadProgressText =
document.getElementById("uploadProgressText");



const uploadProgressBar =
document.getElementById("uploadProgressBar");



const saveWallpaper =
document.getElementById("saveWallpaper");




// ============================
// المتغيرات
// ============================


let wallpapers = [];

let editingId = null;


let selectedFiles = [];


// نوع الخلفية

let wallpaperType = "image";


// صورة الفيديو المصغرة

let videoThumbnail = "";



// ============================
// Cloudinary
// ============================


const CLOUDINARY_CLOUD_NAME =
"ls9wdurp";


const CLOUDINARY_UPLOAD_PRESET =
"wallpaperhub_upload";




// ============================
// تحميل بيانات اللوحة
// ============================


async function loadDashboard(){


try{


const response =
await fetch("/api/wallpapers");



if(!response.ok){

throw new Error(
"API ERROR"
);

}



wallpapers =
await response.json();



if(!Array.isArray(wallpapers)){

wallpapers=[];

}




renderWallpapers();


refreshStats();



}catch(error){


console.error(
"Dashboard Load Error:",
error
);



if(wallpaperContainer){

wallpaperContainer.innerHTML =
"<p>فشل تحميل الخلفيات</p>";

}



}



}




// ============================
// إحصائيات
// ============================


function refreshStats(){


if(wallpapersCount)

wallpapersCount.textContent =
wallpapers.length;



let downloads =

wallpapers.reduce(
(sum,wall)=>
sum + Number(wall.downloads || 0),
0
);



if(downloadsCount)

downloadsCount.textContent =
downloads;




let likes =

wallpapers.reduce(
(sum,wall)=>
sum + Number(wall.likes || 0),
0
);



if(favoritesCount)

favoritesCount.textContent =
likes;

}

// ==========================================
// عرض الخلفيات في لوحة التحكم
// ==========================================


function renderWallpapers(){


if(!wallpaperContainer)
return;



wallpaperContainer.innerHTML = "";



if(wallpapers.length === 0){


wallpaperContainer.innerHTML = `

<p>
لا توجد خلفيات حاليا
</p>

`;

return;

}





wallpapers.forEach(wall=>{



const card =
document.createElement("div");



card.className =
"admin-wall";





let media = "";





// ======================
// نوع الوسائط
// ======================


if(wall.type === "video"){



media = `


<video

src="${wall.image}"

autoplay

muted

loop

playsinline

></video>



<span class="file-type-badge">

🎞 فيديو

</span>


`;



}

else if(wall.type === "gif"){



media = `


<img

src="${wall.image}"

loading="lazy"

>



<span class="file-type-badge">

🌀 GIF

</span>


`;



}

else{


media = `


<img

src="${wall.thumbnail || wall.image}"

loading="lazy"

>


<span class="file-type-badge">

🖼 صورة

</span>


`;



}








card.innerHTML = `


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

// ==========================================
// اختيار الملفات والمعاينة
// Part 3/5
// ==========================================



if(typeInput){


typeInput.addEventListener(
"change",
()=>{


wallpaperType =
typeInput.value;



console.log(
"Type:",
wallpaperType
);



});



}






// ============================
// صورة معاينة الفيديو
// ============================


if(videoThumbnailInput){


videoThumbnailInput.addEventListener(
"change",
()=>{


const file =
videoThumbnailInput.files[0];



if(!file)
return;



const reader =
new FileReader();



reader.onload = ()=>{


videoThumbnail =
reader.result;


};



reader.readAsDataURL(file);



});



}







// ============================
// اختيار الملفات
// ============================


if(imageInput){


imageInput.addEventListener(
"change",
()=>{



const files =
Array.from(
imageInput.files
);




if(files.length > 100){


alert(
"الحد الأقصى 100 ملف"
);



imageInput.value="";

selectedFiles=[];


renderSelectedFiles();


return;


}





selectedFiles =

files.filter(file=>{


return (

file.type.startsWith("image/")

||

file.type.startsWith("video/")

);



});





renderSelectedFiles();



});



}








// ============================
// عرض المعاينة
// ============================


function renderSelectedFiles(){


if(!imagesPreview)
return;




imagesPreview.innerHTML = "";





if(selectedImagesCount){


selectedImagesCount.textContent =

`تم اختيار ${selectedFiles.length} ملف`;



}





if(selectedFiles.length === 0){


imagesPreview.innerHTML = `


<p class="preview-empty">

اختر ملفات

</p>


`;

return;


}








selectedFiles.forEach(
(file,index)=>{


const item =
document.createElement("div");



item.className =
"preview-item";



const url =
URL.createObjectURL(file);



let media = "";





if(file.type.startsWith("video/")){


media = `


<video

src="${url}"

autoplay

muted

loop

playsinline>

</video>


`;



}

else{


media = `


<img

src="${url}"

>


`;



}






item.innerHTML = `


${media}



<span class="preview-number">

${index + 1}

</span>




<button

type="button"

class="remove-preview"

data-index="${index}"

>

×

</button>


`;





imagesPreview.appendChild(item);



});






document
.querySelectorAll(".remove-preview")
.forEach(button=>{


button.onclick = ()=>{


const index =
Number(
button.dataset.index
);



selectedFiles.splice(
index,
1
);



renderSelectedFiles();



};



});



}

// ==========================================
// رفع الملفات إلى Cloudinary
// Part 4/5
// ==========================================



async function uploadToCloudinary(file, onProgress){


return new Promise((resolve,reject)=>{


const formData = new FormData();


formData.append(
"file",
file
);


formData.append(
"upload_preset",
CLOUDINARY_UPLOAD_PRESET
);


let resourceType="image";


if(file.type.startsWith("video/")){
resourceType="video";
}



const xhr = new XMLHttpRequest();


xhr.open(
"POST",
`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`
);



xhr.upload.onprogress = (event)=>{

if(event.lengthComputable && onProgress){

const percent =
Math.round(
(event.loaded / event.total) * 100
);


onProgress(percent);

}

};



xhr.onload=()=>{

const result =
JSON.parse(xhr.responseText);


if(xhr.status >= 200 && xhr.status < 300){

resolve(result.secure_url);

}else{

reject(
new Error(
result.error?.message || "فشل الرفع"
)
);

}

};



xhr.onerror=()=>{

reject(
new Error("خطأ في الاتصال")
);

};



xhr.send(formData);


});


}

// ============================
// معلومات الملف
// ============================


async function getFileInfo(file){


return new Promise(
(resolve)=>{



// فيديو

if(
file.type.startsWith("video/")
){



const video =
document.createElement("video");



video.preload =
"metadata";



video.onloadedmetadata =
()=>{



resolve({

resolution:

video.videoWidth +

"×" +

video.videoHeight,


size:

(
file.size /
1024 /
1024
)

.toFixed(2)

+

" MB"


});



URL.revokeObjectURL(
video.src
);



};



video.src =
URL.createObjectURL(file);



}

else{


// صورة

const img =
new Image();



img.onload =
()=>{



resolve({

resolution:

img.width +

"×" +

img.height,


size:

(
file.size /
1024 /
1024
)

.toFixed(2)

+

" MB"


});



URL.revokeObjectURL(
img.src
);



};



img.src =
URL.createObjectURL(file);



}



});


}





// ============================
// إنشاء بيانات الخلفية
// ============================


function createWallpaperData(
file,
url,
info,
index
){



const title =

document
.getElementById("wallTitle")
.value
.trim();



const category =

document
.getElementById("wallCategory")
.value;




const tags =

document
.getElementById("wallTags")
.value

.split(",")

.map(
tag=>tag.trim()
)

.filter(Boolean);






return {


title:

title

?

`${title} ${index+1}`

:

file.name.replace(
(/\.[^/.]+$/),
""
),




category,



type:

file.type.startsWith("video/")

?

"video"

:

"image",




image:url,



thumbnail:

url,



resolution:

info.resolution,



size:

info.size,



tags,



downloads:0,

likes:0,

views:0,

rating:0,



popular:

document
.getElementById("popular")
.checked,



todayWallpaper:

document
.getElementById("todayWallpaper")
.checked && index===0,



author:"WallpaperHub",

date:
new Date().toISOString()


};



}

// ==========================================
// نشر الخلفيات
// Part 5/5
// ==========================================


if(form){


form.addEventListener(
"submit",
async(e)=>{


e.preventDefault();




if(selectedFiles.length === 0){


alert(
"اختر ملف واحد على الأقل"
);


return;


}




saveWallpaper.disabled = true;


saveWallpaper.textContent =
"جاري الرفع...";





let success = 0;

let failed = 0;



const total =
selectedFiles.length;

// إعادة ضبط شريط التقدم

if(uploadProgressBar){

    uploadProgressBar.style.width = "0%";

}


if(uploadProgressText){

const percent =
Math.round(
((i + 1) / total) * 100
);

uploadProgressText.textContent =
`${i+1} / ${total} (${percent}%)`;

}

for(
let i=0;
i<selectedFiles.length;
i++
){



const file =
selectedFiles[i];



try{


// معلومات الملف

const info =
await getFileInfo(file);



// رفع Cloudinary

const url =
await uploadToCloudinary(
file,
(percent)=>{


if(uploadProgressText){

uploadProgressText.textContent =
`رفع الملف ${i+1}/${total} : ${percent}%`;

}


if(uploadProgressBar){

uploadProgressBar.style.width =
percent+"%";

}


}
);



// إنشاء البيانات

const data =
createWallpaperData(
file,
url,
info,
i
);





const response =
await fetch(
"/api/wallpapers",
{

method:"POST",

headers:{

"Content-Type":
"application/json"

},

body:
JSON.stringify(data)

}

);




if(!response.ok){

throw new Error(
"API ERROR"
);

}



success++;




}

catch(error){


console.error(
error
);


failed++;


}




// التقدم

const percent =

Math.round(

((i+1)/total)*100

);



if(uploadProgressBar){

uploadProgressBar.style.width =
percent+"%";

}



if(uploadProgressText){

uploadProgressText.textContent =

`${i+1} / ${total}`;

}



}



saveWallpaper.disabled = false;


saveWallpaper.textContent =
"🚀 نشر الخلفيات";





alert(

`تم نشر ${success} خلفية، فشل ${failed}`

);






form.reset();


selectedFiles=[];


renderSelectedFiles();



await loadDashboard();



});


}





// ==========================================
// تعديل الخلفية
// ==========================================


async function editWallpaper(id){


const wall =
wallpapers.find(
w=>String(w.id)===String(id)
);



if(!wall)
return;




document.getElementById(
"wallTitle"
).value =
wall.title || "";



document.getElementById(
"wallCategory"
).value =
wall.category || "";



document.getElementById(
"wallTags"
).value =
(wall.tags || []).join(",");



alert(
"تم تحميل بيانات الخلفية للتعديل"
);



}






// ==========================================
// حذف الخلفية
// ==========================================


async function deleteWallpaper(id){


if(
!confirm(
"هل تريد حذف الخلفية؟"
)

)
return;



try{


await fetch(

"/api/wallpapers/"+id,

{

method:"DELETE"

}

);



await loadDashboard();



}

catch(error){


console.error(
error
);


alert(
"فشل الحذف"
);


}



}





window.editWallpaper =
editWallpaper;


window.deleteWallpaper =
deleteWallpaper;


// فتح صفحة الخلفيات

function openWallpapers(){

location.href = "wallpapers.html";

}


window.openWallpapers =
openWallpapers;



// ==========================================
// تشغيل
// ==========================================


loadDashboard();