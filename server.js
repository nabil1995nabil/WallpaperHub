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
// فلترة الجودة 4K - 8K
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



// ===============================
// منع التكرار
// ===============================

const exists =
wallpapers.find(
w=>w.image === item.path
);


if(exists){

continue;

}



// ===============================
// تحميل الصورة للذكاء الاصطناعي
// ===============================

const imageResponse =
await fetch(item.path);


const buffer =
await imageResponse.arrayBuffer();


const base64 =
Buffer.from(buffer)
.toString("base64");





// ===============================
// Gemini Analysis
// ===============================

const aiResponse =
await fetch(

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

text:`

حلل هذه الخلفية.

قوانين مهمة:

- ارفض أي صورة فيها إنسان أو وجه.
- ارفض صور البورتريه.
- اقبل فقط خلفيات عالية الجودة.
- اختر القسم المناسب.

الأقسام:

games
animals
cars
amoled
space
nature
other


إذا كانت تحتوي إنسان:

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

}

]

}]

})

}

);





const ai =
await aiResponse.json();



if(
!ai.candidates ||
!ai.candidates[0]
){

continue;

}



const text =
ai.candidates[0]
.content
.parts[0]
.text;



let result;


try{


const clean =
text
.replace(/```json/g,"")
.replace(/```/g,"")
.trim();


result =
JSON.parse(clean);


}catch(e){


console.log(
"AI JSON ERROR",
text
);


continue;

}




// ===============================
// رفض صور البشر
// ===============================

if(
result.category === "reject"
){

continue;

}





// ===============================
// حفظ الخلفية
// ===============================

wallpapers.push({

id:
Date.now()+Math.floor(Math.random()*9999),


title:
"Wallhaven AI",


description:"",


aiDescription:
result.description || "",


image:
item.path,


thumbnail:
item.thumbs.large,


category:
result.category || "other",


tags:
result.tags || [],


source:
"wallhaven",


downloads:0,

likes:0,

views:0,


rating:0,

ratingCount:0,


date:
new Date()
.toLocaleString("ar-MA")

});



}



saveWallpapers(
wallpapers
);



res.json({

success:true,

message:
"AI Import Completed",

count:
wallpapers.length

});



}catch(error){


console.log(
"Wallhaven AI Import Error",
error
);



res.status(500).json({

success:false,

error:error.message

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

setTimeout(()=>{

fetch("http://localhost:3000/api/wallhaven/import-ai",{
method:"POST"
})
.then(res=>res.json())
.then(data=>console.log("AI Import:",data))
.catch(err=>console.log(err));

},5000);