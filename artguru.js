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


// تهيئة شريط التقدم بداخل الزر عبر متغيّر CSS
let progress = 0;

enhanceBtn.style.setProperty("--progress", "0%");

enhanceBtn.textContent = "جاري التحسين... 0%";



// محاكاة امتلاء الشريط حركياً إلى غاية 90%
const progressInterval = setInterval(()=>{

if(progress < 90){

progress += Math.floor(Math.random() * 8) + 2;

if(progress > 90) progress = 90;

enhanceBtn.style.setProperty("--progress", `${progress}%`);

enhanceBtn.textContent = `جاري التحسين... ${progress}%`;

}

}, 250);



try{


// إرسال طلب التحسين إلى السيرفر
const response =
await fetch(
"/api/artguru/enhance",
{

method:"POST",

headers:{

"Content-Type":
"application/json"

},

body:JSON.stringify({

image:selectedImageBase64

})

}

);



const result =
await response.json();


console.log(
"Artguru Full Response:",
result
);



// إنهاء شريط التقدم عند الاستجابة
clearInterval(progressInterval);

enhanceBtn.style.setProperty("--progress", "100%");

enhanceBtn.textContent = "اكتمل التحسين! 100%";



await new Promise(
resolve => setTimeout(resolve, 300)
);



// دالة للبحث الذكي عن رابط الصورة داخل رد الـ API
function findImageUrl(obj) {
    if (!obj || typeof obj !== 'object') return null;
    if (typeof obj === 'string' && (obj.startsWith('http://') || obj.startsWith('https://') || obj.startsWith('data:image'))) {
        return obj;
    }
    for (let key in obj) {
        if (['url', 'result_url', 'image_url', 'image', 'output', 'task_result'].includes(key.toLowerCase())) {
            const val = obj[key];
            if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('data:image'))) {
                return val;
            }
        }
        if (typeof obj[key] === 'object') {
            const found = findImageUrl(obj[key]);
            if (found) return found;
        }
    }
    return null;
}



const imageUrl = findImageUrl(result);



if(
imageUrl &&
resultImage
){

resultImage.src = imageUrl;

}else{

console.error("الاستجابة الحالية من السيرفر:", result);

alert("تم التحسين لكن لم يتم العثور على رابط الصورة في النتيجة. تفقد الكونسول لمشاهدة البيانات.");

}



}catch(error){


clearInterval(progressInterval);


console.log(
"Artguru Error:",
error
);


alert(
"حدث خطأ أثناء الاتصال بـ Artguru"
);



}



// إرجاع حالة الزر للشكل الطبيعي
enhanceBtn.disabled = false;

enhanceBtn.style.setProperty("--progress", "0%");

enhanceBtn.textContent = "✨ تحسين بالذكاء الاصطناعي";



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

alert("لا توجد صورة محسنة لتحميلها");

return;

}



const a =
document.createElement("a");


a.href =
resultImage.src;


a.download =
"artguru-enhanced.jpg";


document.body.appendChild(a);

a.click();

document.body.removeChild(a);



};


}
