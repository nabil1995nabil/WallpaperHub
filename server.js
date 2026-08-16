// ======================================
// WallpaperHub Server v3.1
// Express Edition
// ======================================


const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");


const app = express();

const PORT = 3000;



// ================================
// Middlewares
// ================================


app.use(cors());


app.use(express.json({
    limit:"10mb"
}));


app.use(express.urlencoded({
    extended:true
}));



// ================================
// Static Files
// ================================


app.use(
    express.static(__dirname)
);



// ================================
// Admin Panel
// ================================


app.get("/admin",(req,res)=>{

    res.sendFile(
        path.join(
            __dirname,
            "admin",
            "admin.html"
        )
    );

});



// ================================
// Home
// ================================


app.get("/",(req,res)=>{

    res.sendFile(
        path.join(
            __dirname,
            "index.html"
        )
    );

});



// ================================
// Database Path
// ================================


const DATA_FILE =
path.join(
    __dirname,
    "data",
    "wallpapers.json"
);



console.log(
    "DATA PATH:",
    DATA_FILE
);

const NOTIFICATIONS_FILE =
path.join(
    __dirname,
    "data",
    "notifications.json"
);


function readNotifications(){

    try{

        return JSON.parse(
            fs.readFileSync(
                NOTIFICATIONS_FILE,
                "utf8"
            )
        );

    }catch{

        return [];

    }

}



function saveNotifications(list){

    fs.writeFileSync(
        NOTIFICATIONS_FILE,
        JSON.stringify(
            list,
            null,
            2
        ),
        "utf8"
    );

}

// ================================
// Read Data
// ================================


function readWallpapers(){

    try{

        const data =
        fs.readFileSync(
            DATA_FILE,
            "utf8"
        );


        return JSON.parse(data);


    }catch(error){

        console.log(error);

        return [];

    }

}



// ================================
// Save Data
// ================================


function saveWallpapers(list){


    fs.writeFileSync(

        DATA_FILE,

        JSON.stringify(
            list,
            null,
            2
        ),

        "utf8"

    );


}


// ================================
// Notifications System
// ================================


function createNotification(wallpaper){


    const notifications =
    readNotifications();



    notifications.unshift({

        id:
        Date.now(),


        title:
        "🆕 خلفية جديدة",


        message:
        `${wallpaper.title} تمت إضافتها`,


        wallpaperId:
        wallpaper.id,


        date:
        wallpaper.date

    });



    saveNotifications(
        notifications
    );


}

// ================================
// Notifications API
// ================================


app.get(
"/api/notifications",
(req,res)=>{

    const notifications =
    readNotifications();


    res.json(
        notifications
    );

});

// ================================
// Delete All Notifications
// ================================

app.delete(
"/api/notifications",
(req,res)=>{


try{


saveNotifications([]);



res.json({

    success:true,

    message:
    "Notifications cleared"

});


}catch(error){


console.log(error);


res.status(500).json({

    success:false,

    message:
    "Server Error"

});


}


});

// ================================
// Wallpapers API
// ================================


// جميع الخلفيات

app.get("/api/wallpapers",(req,res)=>{


    const wallpapers =
    readWallpapers();


    res.json(wallpapers);


});





// ================================
// Add Wallpaper
// ================================


app.post(
"/api/wallpapers",
(req,res)=>{


try{


const wallpapers =
readWallpapers();



const newWallpaper = {


id:Date.now(),



title:
req.body.title ||
"Untitled",

description:
req.body.description || "",


aiDescription:
req.body.aiDescription || "",

category:
req.body.category ||
"other",



type:
req.body.type ||
"image",



animated:

req.body.type==="video" ||
req.body.type==="gif",



thumbnail:

req.body.thumbnail ||
req.body.image ||
"",



image:

req.body.image ||
req.body.thumbnail ||
"",



resolution:

req.body.resolution ||
"",



size:

req.body.size ||
"",



downloads:0,


likes:0,


views:0,



rating:0,


ratingCount:0,


ratingSum:0,



author:

req.body.author ||
"WallpaperHub",



date:

new Date()
.toLocaleString("ar-MA"),



colors:

req.body.colors ||
[],



tags:

req.body.tags ||
[],



featured:

req.body.featured ||
false,



todayWallpaper:

req.body.todayWallpaper ||
false,



popular:

req.body.popular ||
false



};




// خلفية اليوم واحدة فقط

if(newWallpaper.todayWallpaper){


wallpapers.forEach(w=>{


w.todayWallpaper=false;


});


}



wallpapers.push(
newWallpaper
);



saveWallpapers(
    wallpapers
);



// إنشاء إشعار للخلفية الجديدة

createNotification(
    newWallpaper
);



res.json({

    success:true,

    wallpaper:newWallpaper

});



}catch(error){


console.log(error);


res.status(500).json({

success:false,

message:"Server Error"

});


}



});






// ================================
// Update Wallpaper
// ================================


app.put(
"/api/wallpapers/:id",
(req,res)=>{


try{


const wallpapers =
readWallpapers();



const id =
Number(req.params.id);



const index =
wallpapers.findIndex(
w=>w.id===id
);




if(index===-1){


return res.status(404).json({

success:false

});


}





wallpapers[index]={


...wallpapers[index],


...req.body,


id


};




saveWallpapers(
wallpapers
);



res.json({

success:true,

wallpaper:
wallpapers[index]

});



}catch(error){


res.status(500).json({

success:false

});


}



});







// ================================
// Delete Wallpaper
// ================================


app.delete(
"/api/wallpapers/:id",
(req,res)=>{


try{


let wallpapers =
readWallpapers();



const id =
Number(req.params.id);



const index =
wallpapers.findIndex(
w=>w.id===id
);




if(index===-1){


return res.status(404).json({

success:false

});


}



wallpapers.splice(
index,
1
);



saveWallpapers(
wallpapers
);



res.json({

success:true

});



}catch(error){


res.status(500).json({

success:false

});


}



});

// ================================
// Download Count
// ================================


app.post(
"/api/wallpapers/:id/download",
(req,res)=>{


try{


const wallpapers =
readWallpapers();



const id =
Number(req.params.id);



const wall =
wallpapers.find(
w=>w.id===id
);




if(!wall){


return res.status(404).json({

success:false

});


}



wall.downloads =
(wall.downloads || 0) + 1;



saveWallpapers(
wallpapers
);



res.json({

success:true,

downloads:
wall.downloads

});



}catch(error){


console.log(error);


res.status(500).json({

success:false

});


}



});







// ================================
// Like Wallpaper
// ================================


app.post(
"/api/wallpapers/:id/like",
(req,res)=>{


try{


const wallpapers =
readWallpapers();



const id =
Number(req.params.id);



const wall =
wallpapers.find(
w=>w.id===id
);



if(!wall){


return res.status(404).json({

success:false

});


}



wall.likes =
(wall.likes || 0) + 1;



saveWallpapers(
wallpapers
);



res.json({

success:true,

likes:
wall.likes

});



}catch(error){


console.log(error);


res.status(500).json({

success:false

});


}



});







// ================================
// View Wallpaper
// ================================


app.post(
"/api/wallpapers/:id/view",
(req,res)=>{


try{


const wallpapers =
readWallpapers();



const id =
Number(req.params.id);



const wall =
wallpapers.find(
w=>w.id===id
);




if(!wall){


return res.status(404).json({

success:false

});


}



wall.views =
(wall.views || 0) + 1;



saveWallpapers(
wallpapers
);



res.json({

success:true,

views:
wall.views

});



}catch(error){


console.log(error);


res.status(500).json({

success:false

});


}



});







// ================================
// Rating
// ================================


app.post(
"/api/wallpapers/:id/rate",
(req,res)=>{


try{


const wallpapers =
readWallpapers();



const id =
Number(req.params.id);



const wall =
wallpapers.find(
w=>w.id===id
);




if(!wall){


return res.status(404).json({

success:false

});


}





const rating =
Number(req.body.rating);





if(
rating < 1 ||
rating > 5
){


return res.status(400).json({

success:false,

message:"Rating must be 1-5"

});


}





wall.ratingCount =
(wall.ratingCount || 0) + 1;



wall.ratingSum =
(wall.ratingSum || 0) + rating;



wall.rating =

Number(

(
wall.ratingSum /
wall.ratingCount

).toFixed(1)

);




saveWallpapers(
wallpapers
);



res.json({

success:true,

rating:
wall.rating,

ratingCount:
wall.ratingCount

});



}catch(error){


console.log(error);


res.status(500).json({

success:false

});


}



});

// ================================
// Gemini AI Chat
// ================================


app.post(
"/api/chat",
async(req,res)=>{


try{


const {

message,

imageData,

mimeType,

locale,

timezone


}=req.body;





let parts = [];





parts.push({

text:

`أنت WallpaperHub AI.

جاوب المستخدم بنفس لغته ولهجته.

إذا كان من المغرب استعمل الدارجة المغربية.

حلل الصورة إذا كانت موجودة.

لغة المستخدم:
${locale}

المنطقة:
${timezone}

رسالة المستخدم:
${message}`


});







// إذا كانت هناك صورة

if(imageData){


parts.push({

inlineData:{


mimeType:

mimeType || "image/jpeg",


data:

imageData


}


});


}







const response = await fetch(


`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,


{


method:"POST",


headers:{


"Content-Type":"application/json"


},



body:JSON.stringify({

contents:[

{

parts:parts

}

]

})


}



);







const data =
await response.json();





console.log(
"Gemini Status:",
response.status
);







if(!response.ok){


console.log(data);


return res.json({

reply:
"⚠️ مشكلة في الاتصال بـ Gemini"

});


}







if(
!data.candidates ||
!data.candidates[0]
){


return res.json({

reply:
"⚠️ Gemini لم يرجع جواب"

});


}







res.json({

reply:

data
.candidates[0]
.content
.parts[0]
.text


});






}catch(error){


console.log(
"Gemini Error:",
error
);



res.json({

reply:
"⚠️ وقع خطأ مؤقت"

});


}



});

// ================================
// Generate Image
// Models:
// stable = Stable Diffusion
// unsplash = Ready Wallpapers
// ================================


app.post(
"/api/generate-image",
async(req,res)=>{


try{


const {

prompt,

model


}=req.body;





// ===============================
// Stable Diffusion
// ===============================


if(model==="stable"){



const response =
await fetch(


"https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",


{


method:"POST",


headers:{


Authorization:

`Bearer ${process.env.HF_TOKEN}`,



"Content-Type":

"application/json"


},



body:JSON.stringify({

inputs:


`
Premium smartphone wallpaper.

${prompt}

Requirements:

- 4K quality
- vertical phone wallpaper
- no text
- no watermark
- ultra detailed

`


})


}



);







if(!response.ok){



const error =
await response.text();



console.log(
"HuggingFace Error:",
error
);



return res.status(500).json({

error:
"Stable Diffusion failed"

});


}







const buffer =
await response.arrayBuffer();





const base64 =
Buffer.from(buffer)
.toString("base64");







return res.json({

image:

`data:image/png;base64,${base64}`


});



}







// ===============================
// Unsplash
// ===============================


if(model==="unsplash"){



const response =
await fetch(



`https://api.unsplash.com/search/photos?query=${encodeURIComponent(prompt)}&per_page=1`,



{


headers:{


Authorization:

`Client-ID ${process.env.UNSPLASH_KEY}`


}


}



);







const data =
await response.json();







if(

data.results &&

data.results.length > 0

){



return res.json({

image:

data.results[0]
.urls
.regular


});



}







return res.json({

error:
"لم يتم العثور على خلفية"

});



}







// ===============================
// Unknown Model
// ===============================


return res.status(400).json({

error:
"Unknown model"

});






}catch(error){



console.log(

"Image API Error:",

error

);




res.status(500).json({

error:
error.message

});



}



});

// ================================
// AI Wallpaper Analysis
// ================================

app.post("/api/wallpapers/:id/analyze",
async(req,res)=>{

try{

const wallpapers = readWallpapers();

const id = Number(req.params.id);

const wall = wallpapers.find(
w=>w.id===id
);


if(!wall){

return res.status(404).json({
success:false
});

}


// إذا كان عنده تحليل لا نعيد الطلب

if(wall.aiDescription){

return res.json({

success:true,

description:wall.aiDescription

});

}

const imageResponse = await fetch(wall.image);


const buffer =
await imageResponse.arrayBuffer();


const base64 =
Buffer.from(buffer).toString("base64");

const response = await fetch(

`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,

{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

contents:[{

parts:[

{

text:
`
حلل هذه الخلفية.
اكتب وصف احترافي بين 100 و200 حرف.
اذكر العناصر، الألوان، الجو، والأسلوب.
`

},

{

inlineData:{

mimeType:"image/jpeg",

data:
base64


}

}

]

}]

})

}

);


const data =
await response.json();



const description =
data.candidates[0]
.content
.parts[0]
.text;



wall.aiDescription =
description;



saveWallpapers(
wallpapers
);



res.json({

success:true,

description

});



}catch(error){

console.log(error);

res.status(500).json({

success:false

});

}


});

/// =====================================
// Wallhaven Import API
// =====================================

app.get("/api/wallhaven",
async(req,res)=>{

try{

const response = await fetch(
"https://wallhaven.cc/api/v1/search?sorting=toplist&purity=100&categories=111"
);


const data = await response.json();


const wallpapers = data.data.map(item=>({

id:item.id,

image:item.path,

thumbnail:item.thumbs.large,

source:"wallhaven"

}));


res.json(wallpapers);


}catch(error){

console.log(error);

res.status(500).json({
success:false
});

}


});

// =====================================
// AI Wallhaven Import + Auto Category
// =====================================

app.post("/api/wallhaven/import-ai",
async(req,res)=>{


try{


const response = await fetch(
"https://wallhaven.cc/api/v1/search?sorting=toplist&purity=100&categories=111"
);



const data = await response.json();



let wallpapers = readWallpapers();





for(const item of data.data){



// ===============================
// فلترة الجودة 4K إلى 8K
// ===============================

if(item.resolution){


const [w,h] =
item.resolution
.split("x")
.map(Number);



if(
w < 3840 ||
h < 2160
){

continue;

}


}





// منع التكرار

const exists =
wallpapers.find(
w => w.image === item.path
);



if(exists){

continue;

}





// تحميل الصورة

const imageResponse =
await fetch(item.path);



const buffer =
await imageResponse.arrayBuffer();



const base64 =
Buffer.from(buffer)
.toString("base64");







// ===============================
// Gemini AI
// ===============================


const aiResponse = await fetch(

`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,

{

method:"POST",

headers:{

"Content-Type":"application/json"

},


body:JSON.stringify({

contents:[{

parts:[


{

text:
`
حلل هذه الخلفية.

مهم:
- ارفض صور البشر والوجوه.
- ارفض صور البورتريه.
- اقبل فقط خلفيات عالية الجودة.
- اقبل خلفيات الطبيعة وسيارات فارهة وحيوانات.
- اقبل خلفيات طائرات بواخر وسفن.

اختر القسم المناسب فقط:

games
animals
cars
amoled
space
nature
other


إذا كانت الصورة تحتوي إنسان أرجع:

{
"category":"reject"
}


أرجع JSON فقط:

{
"category":"",
"description":"",
"tags":[]
}

`

},


{

inlineData:{

mimeType:"image/jpeg",

data:base64

}
});

//=====تشغيل سيرفر===\\

app.listen(PORT,()=>{

console.log(
"WallpaperHub Server Started"
);

console.log(
"PORT:",
PORT
);

});

setTimeout(()=>{

fetch("http://localhost:3000/api/wallhaven/import-ai",{
method:"POST"
})
.then(res=>res.json())
.then(data=>console.log("AI Import:",data))
.catch(err=>console.log(err));

},5000);