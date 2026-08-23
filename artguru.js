// =================================
// Artguru AI Enhancer JS
// =================================


const imageInput =
document.getElementById("imageInput");


const uploadZone =
document.querySelector(".upload-zone");


const previewImage =
document.getElementById("previewImage");


const enhanceBtn =
document.getElementById("enhanceBtn");


const resultImage =
document.getElementById("resultImage");


const downloadBtn =
document.getElementById("downloadBtn");



let selectedImageBase64 = "";



// =================================
// اختيار الصورة
// =================================

if(imageInput){

imageInput.addEventListener(
"change",
function(){


const file =
this.files[0];


if(!file)
return;



const reader =
new FileReader();



reader.onload = function(e){


selectedImageBase64 =
e.target.result;



if(previewImage){

previewImage.src =
selectedImageBase64;

}


};



reader.readAsDataURL(file);



});

}



// =================================
// فتح اختيار الصورة
// =================================

if(uploadZone && imageInput){

uploadZone.onclick = ()=>{

imageInput.click();

};

}



// =================================
// رفع الصورة إلى Artguru API
// =================================

async function uploadToArtguru(image){


const response =
await fetch(
"/api/artguru/upload",
{

method:"POST",

headers:{

"Content-Type":
"application/json"

},

body:JSON.stringify({

image:image

})

}

);



const data =
await response.json();


return data;


}





// =================================
// تحسين الصورة عبر Artguru
// =================================

if(enhanceBtn){


enhanceBtn.onclick = async()=>{


if(!selectedImageBase64){

alert("اختر صورة أولا");

return;

}



enhanceBtn.disabled = true;


enhanceBtn.textContent =
"جاري الرفع والتحسين...";



try{


// رفع الصورة

const uploadResult =
await uploadToArtguru(
selectedImageBase64
);



console.log(
"Artguru Upload:",
uploadResult
);



// هنا نعرض الرد للتأكد

if(uploadResult.image){

console.log(
"Image ID:",
uploadResult.image
);

}



// مؤقتاً إذا رجعت صورة مباشرة

if(
uploadResult.url &&
resultImage
){

resultImage.src =
uploadResult.url;

}



}catch(error){


console.log(
"Artguru Error:",
error
);


alert(
"حدث خطأ أثناء الاتصال بـ Artguru"
);



}



enhanceBtn.disabled=false;


enhanceBtn.textContent =
"✨ تحسين بالذكاء الاصطناعي";



};


}




// =================================
// تحميل النتيجة
// =================================

if(downloadBtn){


downloadBtn.onclick=()=>{


if(
!resultImage ||
!resultImage.src
){

return;

}



const a =
document.createElement("a");


a.href =
resultImage.src;


a.download =
"artguru-enhanced.jpg";


a.click();



};


}