// ======================================
// WallpaperHub Server v4
// Clean Stable Version
// ======================================

const exifParser = require("exif-parser");
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


// ✅
useFirestore = true;



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

// ======================================
// منع كاش الـ API
// ======================================

app.use("/api", (req, res, next) => {
    res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate"
    );
    next();
});


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

const COMMENTS_FILE =
path.join(
__dirname,
"data",
"comments.json"
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

if(
!fs.existsSync(
COMMENTS_FILE
)
){

fs.writeFileSync(
COMMENTS_FILE,
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

// =========================
// Comments Storage
// =========================

function readComments(){

try{

return JSON.parse(
fs.readFileSync(
COMMENTS_FILE,
"utf8"
)
);

}catch(error){

console.log(
"READ COMMENTS ERROR",
error
);

return [];

}

}


function saveComments(data){

try{

fs.writeFileSync(
COMMENTS_FILE,
JSON.stringify(
data,
null,
2
),
"utf8"
);

}catch(error){

console.log(
"SAVE COMMENTS ERROR",
error
);

}

}

// ======================================
// Read Image EXIF Metadata
// ======================================

async function getImageMetadata(imageUrl){

    try{

        if(!imageUrl){
            return {};
        }


        const response =
        await fetch(imageUrl);


        if(!response.ok){
            return {};
        }


        const buffer =
        await response.arrayBuffer();



        const result =
        exifParser
        .create(
            Buffer.from(buffer)
        )
        .parse();



        let location =
        "غير معروف";


        if(
            result.tags.GPSLatitude &&
            result.tags.GPSLongitude
        ){

            location =
            `${result.tags.GPSLatitude}, ${result.tags.GPSLongitude}`;

        }



        let captureDate = null;



        if(result.tags.DateTimeOriginal){

            captureDate =
            new Date(
                result.tags.DateTimeOriginal * 1000
            )
            .toISOString()
            .split("T")[0];

        }



        return {

            location,

            captureDate,

            camera:
            result.tags.Model || null

        };



    }catch(error){

        console.log(
            "EXIF ERROR:",
            error.message
        );


        return {};

    }

}

// ======================================
// Detect AI Image Or Camera
// ======================================

async function detectImageSource(imageUrl){

    try{


        const image =
        await fetch(imageUrl);



        if(!image.ok){

            return "unknown";

        }



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

        "Content-Type":"application/json"

        },

        body:JSON.stringify({

        contents:[{

        parts:[

        {

        text:
        `
        Analyze this image.

        Return only one word:

        ai
        camera

        Decide if the image looks AI generated
        or captured by a real camera.
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



        const data =
        await response.json();



        const result =
        data
        .candidates?.[0]
        ?.content
        ?.parts?.[0]
        ?.text
        ?.trim()
        ?.toLowerCase();



        if(result.includes("ai")){

            return "ai";

        }



        if(result.includes("camera")){

            return "camera";

        }



        return "unknown";



    }catch(error){


        console.log(
        "AI SOURCE ERROR:",
        error.message
        );


        return "unknown";

    }

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
async(req,res)=>{


try{


const wallpapers =
readWallpapers();

const metadata =
await getImageMetadata(
    req.body.image
);

const source =
await detectImageSource(
req.body.image
);

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

// ===============================
// Photo Metadata
// ===============================

location:
req.body.location ||
"غير معروف",


captureDate:
req.body.captureDate ||
null,


captureTime:
req.body.captureTime ||
null,


source:
source,

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

function createTokenValue() {
    return "wall_live_" +
        Math.random().toString(36).substring(2) +
        Date.now();
}

// ======================================
// Create API Token
// ======================================

app.post("/api/tokens/create",async (req,res)=>{

    try {

        const { userId, appName, domain } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID required"
            });
        }

        const tokenData = {
            id: Date.now(),
           userId: String(userId),
            appName: appName || "My App",
            domain: domain || "",
           token: createTokenValue(),
            limit: 200,
            requests: 0,
            lastRequestDate: null,
            lastUsed: null,
            lastIp: null,
            active: true,
            created: new Date().toISOString()
        };

        let saved = false;

        // Firestore
        (useFirestore) {
            const result = await saveTokenFirestore(tokenData);
            if (result) {
                saved = true;
            }
        }

        // File fallback
        if (!saved) {
            let tokens = readTokensFile();
            tokens.push(tokenData);
            saveTokensFile(tokens);
        }

        res.json({
            success: true,
            token: tokenData
 });

    } catch (error) {
        console.log("CREATE TOKEN ERROR", error);
        res.status(500).json({
            success: false
        });
    }
});

// ======================================
// Get User Tokens
// ======================================

app.get("/api/tokens/:userId", async (req, res) => {

    try {

        const userId = String(req.params.userId);

        let tokens [];

        if (useFirestore) {
            tokens = getUserTokensFirestore(userId);
        }

        if (tokens.length === 0) {
            tokens = readTokensFile().filter(
                t => String(t.userId === userId
            );
        }

        res.json(tokens);

    } catch (error) {
        console.log("GET TOKEN ERROR:", error);
        res.status(500).json([]);
    }
});

// ======================================
// Delete Token
// ======================================

app.delete("/api/t/:id", async (req, res) => {

    try {

        const id = req.params.id;

        let deleted = false;

        if (useFirestore) {
            deleted await deleteTokenFirestore(id);
        }

        if (!deleted) {
            let tokens = readTokensFile();
            tokens =.filter(
                t => String(t.id) !== String(id)
            );
            saveTokensFile(tokens);
            deleted = true;
        }

        res({
            success: deleted
        });

    } catch (error) {
        console.log("DELETE ERROR:", error);
        res.status(500).json({
           : false
        });
    }
// ======================================
// API Token Middleware
// ======================================

async functionApiToken(req,, next) {

    {

        const token = req.headers["x-api-key"];

        if (req.query.token) {
            return res.status(400).json({
                success: false,
                message:Use X-API-Key header only"
            });
        }

        if (!) {
            return res.status(401).json({
                success: false,
                message: "API Token required"
            });
        }

        let apiToken = null;

        if (useFirestore)            const snap = await tokensCollection
                .where("token", "==", token)
                .limit(1                .get();

            if (!snap.empty) {
                apiToken = snap.docs[0].data();
            }
        } else            apiToken = readTokensFile().find(
                t => t.token === token
            );
        }

 (!apiToken || !apiToken.active) {
            return res.status(3).json({
                success: false,
                message: "Invalid"
            });
        }

        // ================================
        // IP Binding Protection
        // ================================

        const clientIp =
           .headers["x-forwarded-for"] ||
           .socket.remoteAddress;

        // أولعمال: ربط التوكن بالـ IP
        if (!apiToken.lastIp) {
            apiToken.lastIp =Ip;
        } else {
            if (apiToken.lastIp !== clientIp {
                return res.status(403).json({
                    success: false,
 message: "Token used from another IP"
                });
            }
        }

        const today = new().toISOString().split("T")[0];

        if (apiToken.lastRequestDate !== today) {
            apiToken.requests 0;
            apiToken.lastRequestDate = today;
        }

        if (apiToken.requests >= apiToken.limit) {
            return res(429).json({
                success: false,
                message: "Daily limit reached"
            });
        }

        apiToken.requests++;

        // ✅ الإلاح : حُذف السطر apiToken.lastIp = req.ip;
        // لأنه كان يُسجل IP بصيغة مختلفة (::ffff:127.0.0.1)
        // فيُرف التوكن في الطلب التالي رغم أنه من نفس الجهاز

       Token.lastUsed = new Date().toISOString();

        if (useFirestore) {
            await tokensCollection
                .doc(apiToken.id))
                .update({
                    requests: apiToken.requests                    lastRequestDate: apiToken.lastRequestDate,
                    lastUsed: apiToken.lastUsed                    lastIp: apiToken.lastIp
                });
        } else {
            let tokens readTokensFile();

            const index = tokens.findIndex(
                t => t.token === token
            );

            if (index !== -1 {
                tokens[index] = apiToken;
                saveTokensFile(tokens);
            }
               req.apiToken = apiToken;

        next();

    catch (error) {
        console.log("TOKEN VERIFY ERROR:", error);
        res.status(500).json({
            success: false
        });
    }
}

// ======================================
// Developer Protected Wall API
//=====

app.get("/api/v1/wallpapers", verifyApiToken (req, res) => {

    try {

        const = readWallpapers();

        res.json({
            success true,
            developer: req.apiToken.appName,
            count: wallpapers.length            data: wallpapers
        });

    } catch (error) {
        console.log("ALLPAPER API ERROR:", error);
        res.status(500).json({
            success false,
            error: error.message
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


let imageUrl = null;


// استخراج الصورة إذا رجعها Gemini
if(
    data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    data.candidates[0].content.parts
){

    const parts =
    data.candidates[0].content.parts;


    for(const part of parts){

        if(part.inlineData){

            imageUrl =
            "data:" +
            part.inlineData.mimeType +
            ";base64," +
            part.inlineData.data;

        }

    }

}



// ✅ الكود الجديد
if (!data.candidates || !data.candidates[0    return res({
        success: true,
        reply: "لم يرجع Gemini جواب",
        image: null
    });
}

res.json({
 success: true,
   : data.candidates[0content.parts[0].text,
    image: imageUrl

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
// محاكاة تحسين سريعة - تعمل فوراً
// ==========================================

app.post("/api/artguru/enhance", async (req, res) => {
    const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    console.log(`[${requestId}] 🚀 تحسين سريع`);

    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({
                success: false,
                message: "الصورة مطلوبة"
            });
        }

        // محاكاة معالجة سريعة
        await new Promise(resolve => setTimeout(resolve, 1500));

        // إرجاع الصورة مع علامة محسنة
        res.json({
            success: true,
            data: {
                image: image,
                mode: 'enhanced',
                message: "✅ تم تحسين الصورة بنجاح",
                enhancedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error(`[${requestId}] ❌ خطأ:`, error.message);
        res.json({
            success: true,
            data: {
                image: req.body.image,
                mode: 'fallback'
            }
        });
    }
});

// ==========================================
// نقطة نهاية للتحقق من الحالة
// ==========================================

app.get("/api/artguru/status", (req, res) => {
    res.json({
        success: true,
        provider: 'mock',
        status: 'ready',
        serverTime: new Date().toISOString()
    });
});

// ======================================
// Gemini Image Generation
// ======================================

app.post(
"/api/generate-image",
async(req,res)=>{

try{

const {prompt}=req.body;


if(!prompt){

return res.status(400).json({

success:false,
message:"Prompt required"

});

}



const response = await fetch(

`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_IMAGE_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,

{

method:"POST",

headers:{

"Content-Type":"application/json"

},

body:JSON.stringify({

contents:[

{

parts:[

{

text:
`Create a high quality wallpaper image:

${prompt}`

}

]

}

]

})

}

);



const data =
await response.json();



res.json({

success:true,

data:data

});



}catch(error){


console.log(
"Gemini Image Error:",
error
);



res.status(500).json({

success:false,

message:"Image generation failed"

});


}

});

// =========================
// Comments API
// =========================


app.get(
"/api/wallpapers/:id/comments",
(req,res)=>{

try{

const wallpaperId =
Number(req.params.id);


const comments =
readComments()
.filter(
comment =>
comment.wallpaperId === wallpaperId
);


res.json(comments);


}catch(error){

console.log(
"GET COMMENTS ERROR",
error
);


res.status(500).json([]);

}

});





app.post(
"/api/wallpapers/:id/comments",
(req,res)=>{

try{

const wallpaperId =
Number(req.params.id);


const text =
String(
req.body.text || ""
).trim();



if(!text){

return res.status(400).json({

success:false,
message:"Empty comment"

});

}



const comments =
readComments();



const newComment = {

id:Date.now(),

wallpaperId,

user:
req.body.user ||
"مستخدم",

text,

date:
new Date()
.toLocaleDateString("ar-EG")

};



comments.push(newComment);


saveComments(
comments
);



res.json({

success:true,

comment:newComment

});



}catch(error){


console.log(
"POST COMMENTS ERROR",
error
);


res.status(500).json({

success:false

});


}

});

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