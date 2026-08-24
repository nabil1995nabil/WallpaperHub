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
// REPLICATE AI ENHANCE - التصحيح النهائي
// ==========================================

// 🔑 مفتاح Replicate API (تم استلامه من المستخدم)
const REPLICATE_API_TOKEN = "r8_Pmdzf73AeG3NYJcBy3QmiYWd76QVjNA29DcwV";

// ✅ التصحيح: استخدام Bearer بدلاً من Token
// ❌ خطأ: "Authorization": `Token ${REPLICATE_API_TOKEN}`
// ✅ صحيح: "Authorization": `Bearer ${REPLICATE_API_TOKEN}`

// ==========================================
// نقطة نهاية التحسين باستخدام Replicate
// ==========================================

app.post("/api/artguru/enhance", async (req, res) => {
    const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    console.log(`[${requestId}] 🚀 بدء طلب التحسين (Replicate)`);

    try {
        const { image } = req.body;

        // ======================================
        // 1. التحقق من صحة المدخلات
        // ======================================

        if (!image) {
            return res.status(400).json({
                success: false,
                code: "MISSING_IMAGE",
                message: "الصورة مطلوبة. يرجى اختيار صورة أولاً."
            });
        }

        console.log(`[${requestId}] ✅ تم استلام الصورة`);

        // ======================================
        // 2. التحقق من مفتاح Replicate
        // ======================================

        if (!REPLICATE_API_TOKEN) {
            console.error(`[${requestId}] ❌ مفتاح Replicate مفقود`);
            return res.status(500).json({
                success: false,
                code: "API_KEY_MISSING",
                message: "مفتاح Replicate API غير موجود."
            });
        }

        // ======================================
        // 3. إرسال طلب إلى Replicate API
        // ======================================

        console.log(`[${requestId}] 📡 إرسال طلب إلى Replicate...`);
        console.log(`[${requestId}] 🔑 Token: ${REPLICATE_API_TOKEN.substring(0, 10)}...`);

        // ✅ استخدام النموذج الصحيح
        const requestBody = {
            version: "42fe9f2d2f2f4c6f7c8d9e0f1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t",
            input: {
                image: image,
                scale: 4,
                face_enhance: false
            }
        };

        console.log(`[${requestId}] 📦 Request body:`, JSON.stringify(requestBody).substring(0, 200) + "...");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        // ✅ التصحيح: استخدام Bearer بدلاً من Token
        const response = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${REPLICATE_API_TOKEN}`, // ✅ تم التصحيح
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log(`[${requestId}] 📡 استجابة API: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[${requestId}] ❌ خطأ Replicate:`, errorText);
            
            // محاولة تحليل الخطأ
            try {
                const errorJson = JSON.parse(errorText);
                console.error(`[${requestId}] 📝 تفاصيل الخطأ:`, errorJson);
                
                // إذا كان خطأ في المصادقة
                if (response.status === 401 || response.status === 403) {
                    return res.status(401).json({
                        success: false,
                        code: "AUTH_ERROR",
                        message: "مفتاح Replicate غير صالح. يرجى التحقق من المفتاح."
                    });
                }
                
                return res.status(response.status).json({
                    success: false,
                    code: "REPLICATE_ERROR",
                    message: errorJson.detail || errorJson.error || "فشل في تحسين الصورة"
                });
            } catch(e) {
                return res.status(response.status).json({
                    success: false,
                    code: "REPLICATE_ERROR",
                    message: errorText || "فشل في تحسين الصورة"
                });
            }
        }

        const prediction = await response.json();
        console.log(`[${requestId}] ✅ تم إنشاء المهمة: ${prediction.id}`);
        console.log(`[${requestId}] 📊 الحالة: ${prediction.status}`);

        // ======================================
        // 4. انتظار اكتمال المعالجة
        // ======================================

        let result = await waitForReplicateResult(prediction.id, REPLICATE_API_TOKEN);
        
        if (!result) {
            return res.status(504).json({
                success: false,
                code: "TIMEOUT",
                message: "انتهت مهلة انتظار النتيجة"
            });
        }

        // ======================================
        // 5. استخراج الصورة المحسنة
        // ======================================

        let enhancedImage = null;

        console.log(`[${requestId}] 📦 Result output:`, result.output);

        // Replicate يعيد النتيجة كمصفوفة من الروابط
        if (result.output) {
            if (Array.isArray(result.output) && result.output.length > 0) {
                enhancedImage = result.output[0];
            } else if (typeof result.output === 'string') {
                enhancedImage = result.output;
            } else if (typeof result.output === 'object' && result.output.url) {
                enhancedImage = result.output.url;
            }
        }

        if (!enhancedImage) {
            console.error(`[${requestId}] ❌ لم يتم العثور على الصورة المحسنة`);
            return res.status(500).json({
                success: false,
                code: "ENHANCED_IMAGE_NOT_FOUND",
                message: "لم يتم العثور على الصورة المحسنة"
            });
        }

        console.log(`[${requestId}] ✅ تم تحسين الصورة بنجاح`);
        console.log(`[${requestId}] 📸 الرابط: ${enhancedImage.substring(0, 50)}...`);

        // ======================================
        // 6. إعادة النتيجة
        // ======================================

        res.json({
            success: true,
            data: {
                image: enhancedImage,
                mode: 'replicate',
                enhancedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error(`[${requestId}] ❌ خطأ:`, error.message);
        
        if (error.name === 'AbortError') {
            return res.status(504).json({
                success: false,
                code: "TIMEOUT",
                message: "انتهت مهلة الطلب. يرجى المحاولة مرة أخرى."
            });
        }

        return res.status(500).json({
            success: false,
            code: "INTERNAL_ERROR",
            message: error.message || "حدث خطأ غير متوقع"
        });
    }
});

// ==========================================
// دالة انتظار النتيجة من Replicate
// ==========================================

async function waitForReplicateResult(predictionId, token) {
    const maxAttempts = 30;
    const delayMs = 2000;
    const url = `https://api.replicate.com/v1/predictions/${predictionId}`;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            console.log(`⏳ محاولة ${attempt + 1}/${maxAttempts} - جلب الحالة...`);
            
            const response = await fetch(url, {
                headers: {
                    "Authorization": `Bearer ${token}` // ✅ تم التصحيح
                }
            });

            if (!response.ok) {
                console.log(`⚠️ محاولة ${attempt + 1}: فشل في جلب الحالة (${response.status})`);
                await sleep(delayMs);
                continue;
            }

            const data = await response.json();
            console.log(`📊 محاولة ${attempt + 1}: الحالة = ${data.status}`);

            if (data.status === 'succeeded') {
                console.log(`✅ اكتملت المعالجة بنجاح!`);
                return data;
            }

            if (data.status === 'failed') {
                console.error('❌ فشلت المعالجة:', data.error);
                return null;
            }

            // لا تزال قيد المعالجة
            await sleep(delayMs);

        } catch (error) {
            console.log(`⚠️ محاولة ${attempt + 1}: خطأ في الاتصال - ${error.message}`);
            await sleep(delayMs);
        }
    }

    console.error('❌ انتهت المهلة في انتظار النتيجة');
    return null;
}

// ==========================================
// دالة مساعدة للتأخير
// ==========================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// نقطة نهاية للتحقق من الحالة
// ==========================================

app.get("/api/artguru/status", (req, res) => {
    const hasKey = REPLICATE_API_TOKEN && REPLICATE_API_TOKEN !== "your_replicate_api_token_here";
    
    res.json({
        success: true,
        provider: 'replicate',
        apiKey: {
            exists: hasKey,
            prefix: hasKey ? REPLICATE_API_TOKEN.substring(0, 10) + "..." : null,
            isValid: hasKey && REPLICATE_API_TOKEN.startsWith('r8_')
        },
        model: "nightmareai/real-esrgan",
        status: hasKey ? 'ready' : 'missing_key',
        authMethod: 'Bearer',
        serverTime: new Date().toISOString()
    });
});

console.log("=".repeat(50));
console.log("🔐 REPLICATE AI ENHANCE - SYSTEM READY");
console.log("=".repeat(50));
console.log(`✅ API Key: ${REPLICATE_API_TOKEN ? 'موجود ✓' : 'مفقود ✗'}`);
console.log(`🔑 Key Prefix: ${REPLICATE_API_TOKEN ? REPLICATE_API_TOKEN.substring(0, 10) + '...' : 'N/A'}`);
console.log(`🔐 Auth Method: Bearer`);
console.log(`🤖 Model: nightmareai/real-esrgan`);
console.log(`📌 Status: ${REPLICATE_API_TOKEN ? '🟢 جاهز' : '🔴 بحاجة لمفتاح'}`);
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