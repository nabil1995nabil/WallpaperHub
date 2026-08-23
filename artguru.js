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

const file = this.files[0];

if(!file)
return;


const reader = new FileReader();


reader.onload = function(e){

selectedImageBase64 = e.target.result;


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
// البحث عن رابط الصورة من رد API
// =================================

function findImageUrl(data){


if(!data)
return null;



if(typeof data === "string"){

if(
data.startsWith("http") ||
data.startsWith("data:image")
){

return data;

}

return null;

}



if(Array.isArray(data)){


for(const item of data){

const result =
findImageUrl(item);

if(result)
return result;

}


return null;

}



if(typeof data === "object"){


const priorityKeys = [

"url",
"image",
"image_url",
"result_url",
"output",
"download_url"

];



for(const key of priorityKeys){


if(data[key]){


const result =
findImageUrl(data[key]);


if(result)
return result;


}

}



for(const key in data){


const result =
findImageUrl(data[key]);


if(result)
return result;


}


}



return null;


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



enhanceBtn.disabled=true;



let progress=0;


enhanceBtn.textContent =
"جاري التحسين... 0%";



const timer =
setInterval(()=>{


if(progress < 90){

progress += 5;

enhanceBtn.textContent =
`جاري التحسين... ${progress}%`;

enhanceBtn.style.setProperty(
"--progress",
progress+"%"
);

}


},300);




try{


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
"REPLICATE RESPONSE:",
result
);





clearInterval(timer);



if(!response.ok){


throw new Error(
result.message ||
"API Error"
);


}




const imageUrl =
findImageUrl(result);



console.log(
"FOUND IMAGE:",
imageUrl
);




if(
imageUrl &&
resultImage
){


resultImage.src =
imageUrl;


resultImage.style.display =
"block";



}else{


console.log(
"No image found",
result
);



alert(
"تم التحسين لكن لم يتم العثور على رابط الصورة"
);


}




enhanceBtn.textContent =
"اكتمل التحسين 100%";




}catch(error){


clearInterval(timer);


console.log(
"Replicate Error:",
error
);



alert(
error.message
);



}





setTimeout(()=>{


enhanceBtn.disabled=false;


enhanceBtn.textContent =
"✨ تحسين بالذكاء الاصطناعي";


enhanceBtn.style.setProperty(
"--progress",
"0%"
);



},1000);



};


}




// =================================
// تحميل الصورة
// =================================

if(downloadBtn){


downloadBtn.onclick = ()=>{


if(
!resultImage ||
!resultImage.src ||
resultImage.src === window.location.href
){

alert(
"لا توجد صورة محسنة"
);

return;

}



const link =
document.createElement("a");


link.href =
resultImage.src;


link.download =
"enhanced-image.jpg";


document.body.appendChild(link);


link.click();


document.body.removeChild(link);



};


}

// =================================
// التحقق من حالة API عند التحميل
// =================================

async function checkApiStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        if (!data.artguruKey) {
            console.warn('⚠️ Artguru API Key مفقود');
            enhanceBtn.textContent = '🔑 أضف مفتاح API';
            enhanceBtn.disabled = true;
            
            // عرض رسالة للمستخدم
            const msg = document.createElement('div');
            msg.style.cssText = `
                background: #fff3cd;
                color: #856404;
                padding: 10px;
                border-radius: 8px;
                margin: 10px 0;
                text-align: center;
            `;
            msg.innerHTML = `
                ⚠️ يرجى إضافة مفتاح Artguru API في الإعدادات<br>
                <small>اتصل بالمسؤول لإضافة المفتاح</small>
            `;
            document.querySelector('.upload-zone').after(msg);
        }
    } catch(e) {
        console.log('Status check failed:', e);
    }
}

// استدعاء عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    checkApiStatus();
});