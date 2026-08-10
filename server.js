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