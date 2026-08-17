// =====================================
// WallpaperHub Adaptive Performance Engine
// 30Hz - 240Hz
// =====================================


(function(){


let fps = 60;
let lastTime = performance.now();
let frames = 0;



// ==============================
// حساب FPS الحقيقي
// ==============================

function measureFPS(){


const now =
performance.now();


frames++;



if(now - lastTime >= 1000){


fps = frames;


frames = 0;


lastTime = now;



applyPerformanceMode();



}



requestAnimationFrame(
measureFPS
);



}





// ==============================
// تحديد وضع الأداء
// ==============================


function applyPerformanceMode(){



document.body.classList.remove(

"performance-low",

"performance-medium",

"performance-high"

);





if(fps < 45){


// أجهزة ضعيفة

document.body.classList.add(
"performance-low"
);



}

else if(fps < 90){


// 60Hz تقريباً

document.body.classList.add(
"performance-medium"
);



}

else{


// 90Hz - 240Hz

document.body.classList.add(
"performance-high"
);



}



console.log(
"WallpaperHub FPS:",
fps
);



}







// ==============================
// معلومات الجهاز
// ==============================


window.WallpaperPerformance = {


getFPS(){

return fps;

},


getDeviceInfo(){


return {

cores:
navigator.hardwareConcurrency || "unknown",


memory:
navigator.deviceMemory || "unknown",


fps

};


}


};






// تشغيل

measureFPS();



})();