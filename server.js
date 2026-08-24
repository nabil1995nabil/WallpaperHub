// ======================================
// WallpaperHub Server v4
// Clean Stable Version
// ======================================


const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const FormData = require("form-data");
console.log(
"ARTGURU KEY:",
process.env.ARTGURU_API_KEY ? "FOUND" : "MISSING"
);

// ======================================
// Firebase Admin
// ======================================


let db = null;
let tokensCollection = null;
let useFirestore = false;



try {


const admin = require("firebase-admin");


if(!admin.apps.length){


const serviceAccount =
process.env.FIREBASE_SERVICE_ACCOUNT;



if(serviceAccount){


admin.initializeApp({

credential:
admin.credential.cert(
JSON.parse(serviceAccount)
)

});


}else{


admin.initializeApp();


}



}



db =
admin.firestore();


tokensCollection =
db.collection("tokens");


useFirestore = false;


console.log(
"Firestore Ready"
);



}catch(error){


console.log(
"Firestore Disabled:",
error.message
);


}





// ======================================
// Express
// ======================================


const app =
express();



const PORT =
3000;





// ======================================
// Middleware
// ======================================


app.use(
cors()
);



app.use(
express.json({
limit:"10mb"
})
);



app.use(
express.urlencoded({
extended:true
})
);





// ======================================
// Static Files
// ======================================


app.use(
express.static(__dirname)
);





// ======================================
// Pages
// ======================================


app.get(
"/",
(req,res)=>{


res.sendFile(

path.join(
__dirname,
"index.html"
)

);


});





app.get(
"/admin",
(req,res)=>{


res.sendFile(

path.join(
__dirname,
"admin",
"admin.html"
)

);


});





// ======================================
// Database Files
// ======================================


const DATA_FILE =
path.join(
__dirname,
"data",
"wallpapers.json"
);



const NOTIFICATIONS_FILE =
path.join(
__dirname,
"data",
"notifications.json"
);



const TOKENS_FILE =
path.join(
__dirname,
"data",
"tokens.json"
);





// ======================================
// Ensure Data Folder
// ======================================


if(
!fs.existsSync(
path.join(__dirname,"data")
)
){


fs.mkdirSync(
path.join(__dirname,"data"),
{
recursive:true
}
);


}





if(
!fs.existsSync(
TOKENS_FILE
)
){


fs.writeFileSync(
TOKENS_FILE,
"[]",
"utf8"
);


}





// ======================================
// Wallpapers Storage
// ======================================


function readWallpapers(){


try{


return JSON.parse(

fs.readFileSync(
DATA_FILE,
"utf8"
)

);


}catch{


return [];


}


}




function saveWallpapers(data){


fs.writeFileSync(

DATA_FILE,

JSON.stringify(
data,
null,
2
),

"utf8"

);


}





// ======================================
// Notifications Storage
// ======================================


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





function saveNotifications(data){


fs.writeFileSync(

NOTIFICATIONS_FILE,

JSON.stringify(
data,
null,
2
),

"utf8"

);


}

// ======================================
// Token Storage Helpers
// ======================================


function readTokensFile(){


try{


return JSON.parse(

fs.readFileSync(
TOKENS_FILE,
"utf8"
)

);


}catch{


return [];


}


}




function saveTokensFile(tokens){


fs.writeFileSync(

TOKENS_FILE,

JSON.stringify(
tokens,
null,
2
),

"utf8"

);


}






// ======================================
// Firestore Token Helpers
// ======================================


async function saveTokenFirestore(token){


if(!tokensCollection)
return null;



try{


await tokensCollection
.doc(
String(token.id)
)
.set(token);



return token;



}catch(error){


console.log(
"Firestore Save Token Error:",
error.message
);



return null;


}



}





async function getUserTokensFirestore(userId){


if(!tokensCollection)
return [];



try{


const snapshot =
await tokensCollection
.where(
"userId",
"==",
String(userId)
)
.get();



return snapshot.docs.map(
doc=>doc.data()
);



}catch(error){


console.log(
"Firestore Read Error:",
error.message
);


return [];


}


}





async function deleteTokenFirestore(id){


if(!tokensCollection)
return false;



try{


await tokensCollection
.doc(
String(id)
)
.delete();



return true;



}catch(error){


console.log(
"Firestore Delete Error:",
error.message
);



return false;


}


}





// ======================================
// Notifications API
// ======================================


app.get(
"/api/notifications",
(req,res)=>{


res.json(
readNotifications()
);


});






app.delete(
"/api/notifications",
(req,res)=>{


try{


saveNotifications([]);



res.json({

success:true

});



}catch(error){


res.status(500)
.json({

success:false

});


}



});





// ======================================
// Wallpapers API
// ======================================


app.get(
"/api/wallpapers",
(req,res)=>{


const wallpapers =
readWallpapers();



res.json(
wallpapers
);


});





// ======================================
// Add Wallpaper
// ======================================


app.post(
"/api/wallpapers",
(req,res)=>{


try{


const wallpapers =
readWallpapers();



const wallpaper = {


id:
Date.now(),



title:
req.body.title ||
"Untitled",



description:
req.body.description ||
"",



image:
req.body.image ||
"",



thumbnail:
req.body.thumbnail ||
req.body.image ||
"",



category:
String(req.body.category || "other")
.trim()
.toLowerCase(),



type:
req.body.type ||
"image",



downloads:0,


likes:0,


views:0,


rating:0,


ratingCount:0,


ratingSum:0,



date:
new Date()
.toLocaleString("ar-MA")



};




wallpapers.push(
wallpaper
);



saveWallpapers(
wallpapers
);



res.json({

success:true,

wallpaper

});



}catch(error){


console.log(error);



res.status(500)
.json({

success:false

});


}



});





// ======================================
// Update Wallpaper
// ======================================


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

return res.status(404)
.json({

success:false

});


}



wallpapers[index] = {

...wallpapers[index],

...req.body,

category:
req.body.category
?
String(req.body.category)
.trim()
.toLowerCase()
:
wallpapers[index].category,

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


res.status(500)
.json({

success:false

});


}



});


// ======================================
// TOKEN SYSTEM
// ======================================


function createTokenValue(){


return (

"wall_live_" +

Math.random()
.toString(36)
.substring(2)

+

Date.now()

);


}





// ======================================
// Create API Token
// ======================================


app.post(
"/api/tokens/create",
async(req,res)=>{


try{


const {

userId,

appName,

domain

}=req.body;



if(!userId){


return res.status(400)
.json({

success:false,

message:
"User ID required"

});


}





const tokenData = {

id:
Date.now(),

userId:
String(userId),

appName:
appName ||
"My App",

domain:
domain ||
"",

token:
createTokenValue(),

limit:
200,

requests:
0,

lastRequestDate:
null,

lastUsed:
null,

lastIp:
null,

active:
true,

created:
new Date()
.toISOString()

};







let saved =
false;





// Firestore

if(useFirestore){


const result =
await saveTokenFirestore(
tokenData
);



if(result){

saved=true;

}


}





// File fallback

if(!saved){


let tokens =
readTokensFile();



tokens.push(
tokenData
);



saveTokensFile(
tokens
);



}







res.json({

success:true,

token:tokenData

});





}catch(error){


console.log(
"CREATE TOKEN ERROR:",
error
);



res.status(500)
.json({

success:false

});


}



});







// ======================================
// Get User Tokens
// ======================================


app.get(
"/api/tokens/:userId",
async(req,res)=>{


try{


const userId =
String(
req.params.userId
);



let tokens=[];





if(useFirestore){


tokens =
await getUserTokensFirestore(
userId
);


}





if(tokens.length===0){


tokens =
readTokensFile()
.filter(

t=>

String(t.userId)
===
userId

);


}




res.json(
tokens
);



}catch(error){


console.log(
"GET TOKEN ERROR:",
error
);


res.status(500)
.json([]);


}



});








// ======================================
// Delete Token
// ======================================


app.delete(
"/api/tokens/:id",
async(req,res)=>{


try{


const id =
req.params.id;



let deleted =
false;




if(useFirestore){


deleted =
await deleteTokenFirestore(
id
);


}





if(!deleted){


let tokens =
readTokensFile();



tokens =
tokens.filter(

t=>

String(t.id)
!==
String(id)

);



saveTokensFile(
tokens
);



deleted=true;


}




res.json({

success:
deleted

});




}catch(error){


console.log(
"DELETE TOKEN ERROR:",
error
);



res.status(500)
.json({

success:false

});


}



});







// ======================================
// API Token Middleware
// ======================================


async function verifyApiToken(req,res,next){


try{


const token =
req.headers["x-api-key"];

if(req.query.token){

return res.status(400).json({

success:false,

message:"Use X-API-Key header only"

});

}





if(!token){


return res.status(401)
.json({

success:false,

message:
"API Token required"

});


}






let apiToken =
null;





if(useFirestore){


const snap =
await tokensCollection
.where(
"token",
"==",
token
)
.limit(1)
.get();



if(!snap.empty){


apiToken =
snap.docs[0]
.data();


}


}else{


apiToken =
readTokensFile()
.find(

t=>

t.token===token

);


}





if(!apiToken || !apiToken.active){


return res.status(403)
.json({

success:false,

message:
"Invalid Token"

});


}

// ================================
// IP Binding Protection
// ================================

const clientIp =
req.headers["x-forwarded-for"] ||
req.socket.remoteAddress;


// أول استعمال: ربط التوكن بالـ IP

if(!apiToken.lastIp){

apiToken.lastIp =
clientIp;

}else{


if(apiToken.lastIp !== clientIp){

return res.status(403)
.json({

success:false,

message:
"Token used from another IP"

});

}

}




const today =

new Date()
.toISOString()
.split("T")[0];





if(
apiToken.lastRequestDate
!==

today

){


apiToken.requests=0;

apiToken.lastRequestDate=today;


}






if(
apiToken.requests >=
apiToken.limit

){


return res.status(429)
.json({

success:false,

message:
"Daily limit reached"

});


}





apiToken.requests++;
apiToken.lastIp =
req.ip;

apiToken.lastUsed =
new Date()
.toISOString();





if(useFirestore){


await tokensCollection
.doc(
String(apiToken.id)
)
.update({

requests:
apiToken.requests,

lastRequestDate:
apiToken.lastRequestDate,

lastUsed:
apiToken.lastUsed,
lastIp:
apiToken.lastIp,
});


}else{


let tokens =
readTokensFile();



const index =
tokens.findIndex(

t=>

t.token===token

);



if(index!==-1){


tokens[index]=apiToken;


saveTokensFile(
tokens
);


}


}





req.apiToken =
apiToken;



next();





}catch(error){


console.log(
"TOKEN VERIFY ERROR:",
error
);



res.status(500)
.json({

success:false

});


}



}

// ======================================
// Developer Protected Wallpapers API
// ======================================


app.get(
"/api/v1/wallpapers",
verifyApiToken,
(req,res)=>{


try{


const wallpapers =
readWallpapers();



res.json({

success:true,


developer:
req.apiToken.appName,


count:
wallpapers.length,


data:
wallpapers


});



}catch(error){


console.log(
"WALLPAPER API ERROR:",
error
);



res.status(500).json({

success:false,

error:error.message

});


}



});

// ======================================
// Download Wallpaper
// ======================================


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


return res.status(404)
.json({

success:false

});


}



wall.downloads =
(wall.downloads || 0)+1;



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


res.status(500)
.json({

success:false

});


}



});







// ======================================
// Like Wallpaper
// ======================================


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


return res.status(404)
.json({

success:false

});


}



wall.likes =
(wall.likes || 0)+1;



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


res.status(500)
.json({

success:false

});


}



});







// ======================================
// View Wallpaper
// ======================================


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


return res.status(404)
.json({

success:false

});


}



wall.views =
(wall.views || 0)+1;



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


res.status(500)
.json({

success:false

});


}



});








// ======================================
// Rating
// ======================================


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


return res.status(404)
.json({

success:false

});


}



const rating =
Number(req.body.rating);





if(
rating < 1 ||
rating > 5
){


return res.status(400)
.json({

success:false,

message:
"Rating must be 1-5"

});


}





wall.ratingCount =
(wall.ratingCount || 0)+1;



wall.ratingSum =
(wall.ratingSum || 0)+rating;



wall.rating =

Number(

(
wall.ratingSum /
wall.ratingCount

)
.toFixed(1)

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


res.status(500)
.json({

success:false

});


}



});

// ======================================
// Gemini Chat
// ======================================


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



let parts=[];



parts.push({

text:

`
أنت WallpaperHub AI.

جاوب المستخدم بنفس لغته.

إذا كان من المغرب استعمل الدارجة المغربية.

اللغة:
${locale}

المنطقة:
${timezone}

الرسالة:
${message}

`

});





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





const response =
await fetch(

`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,

{

method:"POST",

headers:{

"Content-Type":
"application/json"

},

body:JSON.stringify({

contents:[

{

parts

}

]

})

}

);



const data =
await response.json();





if(
!data.candidates ||
!data.candidates[0]
){


return res.json({

reply:
"لم يرجع Gemini جواب"

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
"Gemini Error",
error
);



res.json({

reply:
"حدث خطأ"

});


}



});







// ======================================
// Analyze Wallpaper
// ======================================


app.post(
"/api/wallpapers/:id/analyze",
async(req,res)=>{


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

return res.status(404)
.json({

success:false

});

}





if(wall.aiDescription){


return res.json({

success:true,

description:
wall.aiDescription

});


}





const image =
await fetch(
wall.image
);



const buffer =
await image.arrayBuffer();



const base64 =
Buffer.from(buffer)
.toString("base64");





const response =
await fetch(

`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,

{

method:"POST",

headers:{

"Content-Type":
"application/json"

},

body:JSON.stringify({

contents:[{

parts:[

{

text:

`
حلل هذه الخلفية.

اكتب وصف احترافي بين 100 و200 حرف.

اذكر الألوان والعناصر والأسلوب.

`

},

{

inlineData:{

mimeType:
"image/jpeg",

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





if(
!data.candidates ||
!data.candidates[0]
){

return res.status(500)
.json({

success:false

});

}





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


res.status(500)
.json({

success:false

});


}



});








// ======================================
// Wallhaven Import
// ======================================


app.post(
"/api/wallhaven/import",
async(req,res)=>{


try{


const response =
await fetch(

"https://wallhaven.cc/api/v1/search?sorting=toplist&purity=100&categories=111"

);



const data =
await response.json();



let wallpapers =
readWallpapers();





for(const item of data.data){


const exists =
wallpapers.find(

w=>

w.image===item.path

);



if(exists)
continue;




wallpapers.push({

id:
Date.now()+Math.floor(Math.random()*9999),


title:
"Wallhaven",


image:
item.path,


thumbnail:
item.thumbs.large,


category:
"wallhaven",


downloads:0,

likes:0,

views:0,


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

count:
data.data.length

});





}catch(error){


console.log(
"Wallhaven Error",
error
);



res.status(500)
.json({

success:false

});


}



});

// ==========================================
// ARTGURU AI ENHANCE - CLEAN VERSION
// مع تتبع الأخطاء وتحسين الأمان
// ==========================================

const ARTGURU_API_KEY = "ak-d7f53e8ef5e72154746d88bf24f5b523";
const ARTGURU_API_URL = "https://api.artguru.ai/v1/enhance";

// ==========================================
// نقطة النهاية الرئيسية للتحسين
// ==========================================

app.post("/api/artguru/enhance", async (req, res) => {
    const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    console.log(`[${requestId}] 🚀 بدء طلب التحسين`);

    try {
        // ======================================
        // 1. التحقق من صحة المدخلات (Input Validation)
        // ======================================

        const { image } = req.body;

        // التحقق من وجود الصورة
        if (!image) {
            console.log(`[${requestId}] ❌ الصورة مفقودة`);
            return res.status(400).json({
                success: false,
                code: "MISSING_IMAGE",
                message: "الصورة مطلوبة. يرجى اختيار صورة أولاً."
            });
        }

        // التحقق من حجم الصورة (حد أقصى 10MB)
        const imageSizeInBytes = Buffer.from(image, 'base64').length;
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB

        if (imageSizeInBytes > MAX_SIZE) {
            console.log(`[${requestId}] ❌ حجم الصورة كبير جداً: ${(imageSizeInBytes / 1024 / 1024).toFixed(2)}MB`);
            return res.status(413).json({
                success: false,
                code: "IMAGE_TOO_LARGE",
                message: "حجم الصورة يتجاوز 10 ميجابايت. يرجى اختيار صورة أصغر."
            });
        }

        // التحقق من صيغة الصورة (base64)
        if (!image.startsWith('data:image/')) {
            console.log(`[${requestId}] ❌ صيغة صورة غير صالحة`);
            return res.status(400).json({
                success: false,
                code: "INVALID_IMAGE_FORMAT",
                message: "صيغة الصورة غير مدعومة. يرجى استخدام JPG أو PNG."
            });
        }

        console.log(`[${requestId}] ✅ تم التحقق من الصورة: ${(imageSizeInBytes / 1024).toFixed(2)}KB`);

        // ======================================
        // 2. التحقق من مفتاح API
        // ======================================

        if (!ARTGURU_API_KEY) {
            console.error(`[${requestId}] ❌ مفتاح API مفقود`);
            return res.status(500).json({
                success: false,
                code: "API_KEY_MISSING",
                message: "مفتاح Artguru API غير موجود. يرجى التواصل مع الدعم الفني."
            });
        }

        // ======================================
        // 3. تحضير الطلب لـ Artguru API
        // ======================================

        const requestBody = {
            image: image,
            scale: 4,
            denoise: true,
            face_enhance: false
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // مهلة 30 ثانية

        console.log(`[${requestId}] 📡 إرسال طلب إلى Artguru API...`);

        // ======================================
        // 4. إرسال الطلب مع معالجة الأخطاء
        // ======================================

        const response = await fetch(ARTGURU_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${ARTGURU_API_KEY}`,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log(`[${requestId}] 📡 استجابة API: ${response.status} ${response.statusText}`);

        // ======================================
        // 5. معالجة استجابة API
        // ======================================

        // قراءة النص الخام أولاً للتعامل مع الأخطاء بشكل أفضل
        const rawResponse = await response.text();
        let data;

        try {
            data = JSON.parse(rawResponse);
        } catch (parseError) {
            console.error(`[${requestId}] ❌ خطأ في تحليل JSON:`, parseError.message);
            return res.status(500).json({
                success: false,
                code: "INVALID_API_RESPONSE",
                message: "استجابة غير صالحة من Artguru API",
                details: rawResponse.substring(0, 200)
            });
        }

        // التحقق من حالة الاستجابة
        if (!response.ok) {
            console.error(`[${requestId}] ❌ خطأ من Artguru API:`, data);

            // معالجة أخطاء محددة
            const errorCode = data.code || data.error || "API_ERROR";
            const errorMessage = data.message || data.error_message || data.error || "فشل في تحسين الصورة";

            // أخطاء شائعة
            if (response.status === 401 || response.status === 403) {
                return res.status(401).json({
                    success: false,
                    code: "INVALID_API_KEY",
                    message: "مفتاح API غير صالح. يرجى التحقق من المفتاح."
                });
            }

            if (response.status === 429) {
                return res.status(429).json({
                    success: false,
                    code: "RATE_LIMITED",
                    message: "تم تجاوز الحد اليومي للاستخدام. يرجى المحاولة غداً."
                });
            }

            if (response.status === 413) {
                return res.status(413).json({
                    success: false,
                    code: "IMAGE_TOO_LARGE",
                    message: "الصورة كبيرة جداً بالنسبة لـ Artguru API."
                });
            }

            return res.status(response.status).json({
                success: false,
                code: errorCode,
                message: errorMessage
            });
        }

        // ======================================
        // 6. استخراج الصورة المحسنة
        // ======================================

        console.log(`[${requestId}] ✅ استجابة ناجحة، استخراج الصورة...`);

        let enhancedImage = null;

        // محاولة استخراج الرابط من عدة أماكن محتملة
        const possibleKeys = [
            'enhanced_image',
            'image',
            'url',
            'result',
            'output',
            'data.url',
            'data.image'
        ];

        for (const key of possibleKeys) {
            const value = key.includes('.')
                ? key.split('.').reduce((obj, k) => obj?.[k], data)
                : data[key];

            if (value && typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:image'))) {
                enhancedImage = value;
                break;
            }
        }

        // إذا لم يتم العثور، حاول البحث العميق
        if (!enhancedImage) {
            enhancedImage = findImageUrl(data);
        }

        if (!enhancedImage) {
            console.error(`[${requestId}] ❌ لم يتم العثور على الصورة المحسنة`);
            return res.status(500).json({
                success: false,
                code: "ENHANCED_IMAGE_NOT_FOUND",
                message: "لم يتم العثور على الصورة المحسنة في استجابة API",
                debug: {
                    responseKeys: Object.keys(data)
                }
            });
        }

        console.log(`[${requestId}] ✅ تم استخراج الصورة المحسنة بنجاح`);

        // ======================================
        // 7. إعادة النتيجة
        // ======================================

        res.json({
            success: true,
            data: {
                image: enhancedImage,
                originalSize: imageSizeInBytes,
                enhancedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        // ======================================
        // 8. معالجة الأخطاء العامة
        // ======================================

        console.error(`[${requestId}] ❌ خطأ عام:`, error);

        // معالجة أخطاء المهلة
        if (error.name === 'AbortError') {
            return res.status(504).json({
                success: false,
                code: "TIMEOUT",
                message: "انتهت مهلة الطلب. يرجى المحاولة مرة أخرى."
            });
        }

        // معالجة أخطاء الشبكة
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            return res.status(503).json({
                success: false,
                code: "NETWORK_ERROR",
                message: "تعذر الاتصال بـ Artguru API. يرجى التحقق من الاتصال بالإنترنت."
            });
        }

        // معالجة أخطاء JSON
        if (error instanceof SyntaxError) {
            return res.status(500).json({
                success: false,
                code: "INVALID_JSON",
                message: "خطأ في صيغة البيانات المرسلة."
            });
        }

        // أي خطأ آخر
        return res.status(500).json({
            success: false,
            code: "INTERNAL_ERROR",
            message: error.message || "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى."
        });
    }
});

// ==========================================
// دالة مساعدة: البحث عن رابط الصورة
// ==========================================

function findImageUrl(data) {
    if (!data) return null;

    // إذا كانت سلسلة نصية
    if (typeof data === 'string') {
        if (data.startsWith('http') || data.startsWith('data:image')) {
            return data;
        }
        return null;
    }

    // إذا كانت مصفوفة
    if (Array.isArray(data)) {
        for (const item of data) {
            const result = findImageUrl(item);
            if (result) return result;
        }
        return null;
    }

    // إذا كان كائن
    if (typeof data === 'object') {
        // المفاتيح ذات الأولوية
        const priorityKeys = [
            'enhanced_image', 'image', 'url', 'image_url',
            'result_url', 'output', 'download_url',
            'result', 'photo', 'picture', 'src', 'source'
        ];

        for (const key of priorityKeys) {
            if (data[key]) {
                const result = findImageUrl(data[key]);
                if (result) return result;
            }
        }

        // البحث في جميع المفاتيح الأخرى
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const result = findImageUrl(data[key]);
                if (result) return result;
            }
        }
    }

    return null;
}

// ==========================================
// نقطة نهاية للتحقق من حالة API
// ==========================================

app.get("/api/artguru/status", (req, res) => {
    const status = {
        success: true,
        apiKey: {
            exists: !!ARTGURU_API_KEY,
            prefix: ARTGURU_API_KEY ? ARTGURU_API_KEY.substring(0, 8) + "..." : null,
            isValid: ARTGURU_API_KEY ? ARTGURU_API_KEY.startsWith('ak-') : false
        },
        apiUrl: ARTGURU_API_URL,
        serverTime: new Date().toISOString(),
        status: ARTGURU_API_KEY ? "ready" : "missing"
    };

    // التحقق من صحة المفتاح (اختبار سريع)
    if (ARTGURU_API_KEY && ARTGURU_API_KEY.startsWith('ak-')) {
        status.status = "configured";
    }

    res.json(status);
});

// ==========================================
// نقطة نهاية لاختبار التحسين (Mock)
// ==========================================

app.post("/api/artguru/test", async (req, res) => {
    // نقطة اختبار للتحقق من الاتصال بـ Artguru
    try {
        const testImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

        const response = await fetch(ARTGURU_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${ARTGURU_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                image: testImage,
                scale: 1,
                denoise: false,
                face_enhance: false
            })
        });

        const data = await response.json();

        res.json({
            success: response.ok,
            status: response.status,
            message: response.ok ? "API يعمل بشكل طبيعي" : "API يعمل ولكن حدث خطأ",
            details: data
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "فشل اختبار API",
            error: error.message
        });
    }
});

// ==========================================
// ملخص النظام
// ==========================================

console.log("=".repeat(50));
console.log("🔐 ARTGURU AI ENHANCE - SYSTEM READY");
console.log("=".repeat(50));
console.log(`✅ API Key: ${ARTGURU_API_KEY ? 'موجود ✓' : 'مفقود ✗'}`);
console.log(`🔑 Key Type: ${ARTGURU_API_KEY?.startsWith('ak-') ? 'Artguru Key ✓' : 'غير معروف'}`);
console.log(`🌐 API URL: ${ARTGURU_API_URL}`);
console.log("=".repeat(50));

// ======================================
// Start Server
// ======================================


app.listen(
PORT,
()=>{


console.log(
"WallpaperHub Server Started"
);


console.log(
"PORT:",
PORT
);


});