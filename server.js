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

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_KEY
);

// ===============================
// Gemini API KEY
// ===============================

const GEMINI_API_KEY =
"AQ.Ab8RN6I5IHaQ9oMjF0L3gjReTeATad9owoYsP3iYoeh9Aqb6Mg";

const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_IMAGE_MODEL = "gemini-3.5-flash-exp";
// ======================================
// Firebase Admin
// ======================================

let db = null;
let tokensCollection = null;
let useFirestore = false;


try {

    const admin = require("firebase-admin");


    if (!admin.apps.length) {

        const serviceAccount =
            process.env.FIREBASE_SERVICE_ACCOUNT;


        if (serviceAccount) {

            admin.initializeApp({

                credential:
                    admin.credential.cert(
                        JSON.parse(serviceAccount)
                    )

            });

        } else {

            admin.initializeApp();

        }

    }


    db = admin.firestore();

    tokensCollection =
        db.collection("tokens");


    useFirestore = true;


    console.log(
        "Firestore Ready"
    );


} catch(error) {

    console.log(
        "Firestore Disabled:",
        error.message
    );

}



// ======================================
// Express
// ======================================

const app = express();

const PORT = 3000;



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
// منع كاش API
// ======================================

app.use(
    "/api",
    (req,res,next)=>{

        res.set(
            "Cache-Control",
            "no-store, no-cache, must-revalidate"
        );

        next();

    }
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

    }
);



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

    }
);



// ======================================
// Database Files
// ======================================


const DATA_FILE =
path.join(
    __dirname,
    "data",
    "wallpapers.json"
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



const NOTIFICATIONS_FILE =
path.join(
    __dirname,
    "data",
    "notifications.json"
);

const WALLPAPER_OWNER_UID =
"SmlHXIuh5tM50ttFsZqujvFhm5s1";


// ======================================
// Create Data Folder
// ======================================


const DATA_DIR =
path.join(
    __dirname,
    "data"
);



if(!fs.existsSync(DATA_DIR)){

    fs.mkdirSync(
        DATA_DIR,
        {
            recursive:true
        }
    );

}




function createFileIfMissing(file){

    if(!fs.existsSync(file)){

        fs.writeFileSync(
            file,
            "[]",
            "utf8"
        );

    }

}



createFileIfMissing(DATA_FILE);

createFileIfMissing(TOKENS_FILE);

createFileIfMissing(COMMENTS_FILE);

createFileIfMissing(NOTIFICATIONS_FILE);




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


    }catch(error){

        console.log(
            "READ WALLPAPERS ERROR",
            error.message
        );

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
// Comments Storage
// ======================================


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
            error.message
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
            error.message
        );

    }

}




// ======================================
// Token File Storage
// ======================================


function readTokensFile(){

    try{

        return JSON.parse(
            fs.readFileSync(
                TOKENS_FILE,
                "utf8"
            )
        );


    }catch(error){

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


    }catch(error){

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
// Announcements Storage
// ======================================


const ANNOUNCEMENTS_FILE =
path.join(
    __dirname,
    "data",
    "announcements.json"
);




createFileIfMissing(
    ANNOUNCEMENTS_FILE
);




function readAnnouncements(){

    try{


        return JSON.parse(
            fs.readFileSync(
                ANNOUNCEMENTS_FILE,
                "utf8"
            )
        );


    }catch(error){


        console.log(
            "READ ANNOUNCEMENTS ERROR:",
            error.message
        );


        return [];


    }

}





function saveAnnouncements(data){


    fs.writeFileSync(

        ANNOUNCEMENTS_FILE,

        JSON.stringify(
            data,
            null,
            2
        ),

        "utf8"

    );


}

// ======================================
// Read Image EXIF Metadata
// ======================================

async function getImageMetadata(imageUrl){

    try{

        if(!imageUrl)
            return {};


        const response =
        await fetch(imageUrl);


        if(!response.ok)
            return {};


        const buffer =
        await response.arrayBuffer();


        const result =
        exifParser
        .create(
            Buffer.from(buffer)
        )
        .parse();



        return {

            location:
            result.tags.GPSLatitude &&
            result.tags.GPSLongitude
            ?
            `${result.tags.GPSLatitude}, ${result.tags.GPSLongitude}`
            :
            "غير معروف",


            captureDate:
            result.tags.DateTimeOriginal
            ?
            new Date(
                result.tags.DateTimeOriginal * 1000
            )
            .toISOString()
            .split("T")[0]
            :
            null,


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


        if(!GEMINI_API_KEY)
            return "unknown";



        const image =
        await fetch(imageUrl);



        if(!image.ok)
            return "unknown";



        const buffer =
        await image.arrayBuffer();



        const base64 =
        Buffer.from(buffer)
        .toString("base64");



const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" 
    + GEMINI_MODEL 
    + ":generateContent?key=" 
    + GEMINI_API_KEY,
    {
        method: "POST",

        headers:{
            "Content-Type":"application/json"
        },

        body: JSON.stringify({
            contents:[
                {
                    parts:[
                        {
                            text:"Analyze image. Reply only ai or camera."
                        },
                        {
                            inlineData:{
                                mimeType:"image/jpeg",
                                data:base64
                            }
                        }
                    ]
                }
            ]
        })
    }
);



        const data =
        await response.json();



        const result =
        data
        ?.candidates?.[0]
        ?.content?.parts?.[0]
        ?.text
        ?.toLowerCase()
        ||
        "";



        if(result.includes("ai"))
            return "ai";


        if(result.includes("camera"))
            return "camera";


        return "unknown";



    }catch(error){


        console.log(
            "AI DETECT ERROR:",
            error.message
        );


        return "unknown";

    }

}




// ======================================
// Notifications API
// ======================================


app.get(
"/api/notifications",
(req,res)=>{

    const notifications =
        readNotifications();

    const recipientUID =
        req.query.recipientUID;

    // إذا لم يتم تحديد مستخدم
    if(!recipientUID){
        return res.json(notifications);
    }

    // الإشعارات الموجهة لهذا المستخدم
    // والإشعارات القديمة التي لا تحتوي recipientUID
    const filtered =
        notifications.filter(notif =>
            !notif.recipientUID ||
            notif.recipientUID === recipientUID
        );

    res.json(filtered);
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


        res.status(500).json({

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


    res.json(
        readWallpapers()
    );


});

// ======================================
// Wallpaper Likes (Supabase)
// =====================================// إضافة إعجاب//

app.post(
"/api/wallpapers/:id/like",
async(req,res)=>{

try{

const wallpaperId =
Number(req.params.id);

const userId =
req.body.userId || "guest";

const userName =
req.body.userName || "مستخدم";


// ======================================
// إضافة الإعجاب إلى Supabase
// ======================================

const {data,error} =
await supabase

.from("likes")

.insert([
{
wallpaper_id: wallpaperId,
user_id: userId
}
])

.select();


// ======================================
// إذا كان الإعجاب موجوداً مسبقاً
// ======================================

if(error){

if(error.code==="23505"){

return res.json({

success:true,

liked:true,

message:"Already liked"

});

}

throw error;

}


// ======================================
// جلب معلومات الخلفية
// ======================================

const wallpapers =
readWallpapers();

const wall =
wallpapers.find(
w => Number(w.id) === wallpaperId
);


// ======================================
// إنشاء إشعار لصاحب الخلفية
// ======================================

// لا نرسل إشعاراً إذا صاحب الخلفية
// هو نفسه الذي ضغط إعجاب

if(userId !== WALLPAPER_OWNER_UID){

let notifications =
readNotifications();


notifications.unshift({

id:
Date.now(),

type:
"wallpaper_like",

category:
"like_wallpaper",

title:
"إعجاب بخلفيتك ❤️",

content:
`${userName} أعجب بخلفيتك`,

wallpaperId:
wallpaperId,

wallpaperTitle:
wall?.title || "خلفية",

userId:
userId,

userName:
userName,

date:
new Date()
.toLocaleString("ar-MA"),

read:
false,

recipientUID:
WALLPAPER_OWNER_UID

});


saveNotifications(
notifications
);

}


// ======================================
// النتيجة
// ======================================

res.json({

success:true,

liked:true,

data

});


}catch(error){

console.log(
"LIKE SUPABASE ERROR:",
error
);

res.status(500).json({

success:false,

error:error.message

});

}

});


// ======================================
// معرفة حالة الإعجاب
// ======================================

app.get(
"/api/wallpapers/:id/like-status",
async(req,res)=>{

try{

const wallpaperId =
Number(req.params.id);

const userId =
req.query.userId || "guest";


const {data,error} =
await supabase

.from("likes")

.select("id")

.eq(
"wallpaper_id",
wallpaperId
)

.eq(
"user_id",
userId
)

.maybeSingle();


if(error)
throw error;


res.json({

liked:
!!data

});


}catch(error){

console.log(
"LIKE STATUS ERROR:",
error
);

res.status(500).json({

liked:false

});

}

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
        String(
            req.body.category ||
            "other"
        )
        .trim()
        .toLowerCase(),


        type:
        req.body.type ||
        "image",


        location:
        metadata.location ||
        "غير معروف",


        captureDate:
        metadata.captureDate ||
        null,


        camera:
        metadata.camera ||
        null,


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


    console.log(
        "ADD WALLPAPER ERROR:",
        error
    );


    res.status(500).json({

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



    if(index === -1){

        return res.status(404).json({

            success:false

        });

    }



    wallpapers[index] = {

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

// ======================================
// TOKEN SYSTEM
// ======================================


function createTokenValue(){

    return (
        "wall_live_" +
        Math.random()
        .toString(36)
        .substring(2) +
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

    } = req.body;



    if(!userId){

        return res.status(400).json({

            success:false,

            message:"User ID required"

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




    let saved = false;




    if(useFirestore){


        const result =
        await saveTokenFirestore(
            tokenData
        );


        if(result){

            saved = true;

        }

    }





    if(!saved){


        const tokens =
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


    res.status(500).json({

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



    let tokens = [];




    if(useFirestore){


        tokens =
        await getUserTokensFirestore(
            userId
        );

    }




    if(tokens.length === 0){


        tokens =
        readTokensFile()
        .filter(
            t =>
            String(t.userId) === userId
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


    res.status(500).json([]);

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



    let deleted = false;



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

            t =>
            String(t.id)
            !==
            String(id)

        );



        saveTokensFile(
            tokens
        );



        deleted = true;


    }




    res.json({

        success:deleted

    });



}catch(error){


    console.log(
        "DELETE TOKEN ERROR:",
        error
    );


    res.status(500).json({

        success:false

    });


}


});





// ======================================
// API Token Middleware
// ======================================


async function verifyApiToken(
    req,
    res,
    next
){


try{


    const token =
    req.headers["x-api-key"];



    if(req.query.token){


        return res.status(400).json({

            success:false,

            message:
            "Use X-API-Key header only"

        });


    }





    if(!token){


        return res.status(401).json({

            success:false,

            message:
            "API Token required"

        });


    }





    let apiToken = null;




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
            snap.docs[0].data();


        }



    }else{


        apiToken =
        readTokensFile()
        .find(
            t =>
            t.token === token
        );


    }





    if(
        !apiToken ||
        !apiToken.active
    ){


        return res.status(401).json({

            success:false,

            message:"Invalid Token"

        });


    }





    const clientIp =
    req.headers["x-forwarded-for"]
    ||
    req.socket.remoteAddress;





    if(!apiToken.lastIp){


        apiToken.lastIp =
        clientIp;


    }else{


        if(
            apiToken.lastIp !== clientIp
        ){


            return res.status(403).json({

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
        apiToken.lastRequestDate !== today
    ){


        apiToken.requests = 0;

        apiToken.lastRequestDate =
        today;


    }





    if(
        apiToken.requests >=
        apiToken.limit
    ){


        return res.status(429).json({

            success:false,

            message:
            "Daily limit reached"

        });


    }




    apiToken.requests++;

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
            apiToken.lastIp

        });



    }else{


        const tokens =
        readTokensFile();



        const index =
        tokens.findIndex(

            t =>
            t.token === token

        );



        if(index !== -1){


            tokens[index] =
            apiToken;


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


    res.status(500).json({

        success:false

    });


}


}

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

} = req.body;



let parts = [];



parts.push({

text:

`
أنت WallpaperHub AI.

أجب المستخدم بنفس لغته.

اللغة:
${locale || "ar"}

المنطقة:
${timezone || ""}

الرسالة:
${message || ""}

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

`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,

{

method:"POST",

headers:{

"Content-Type":"application/json"

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





let reply =
"لم يرجع Gemini جواب";





if(
data.candidates &&
data.candidates[0] &&
data.candidates[0].content &&
data.candidates[0].content.parts
){


reply =
data.candidates[0]
.content
.parts
.map(
p=>p.text || ""
)
.join("");

}





res.json({

success:true,

reply

});




}catch(error){


console.log(
"GEMINI CHAT ERROR:",
error
);


res.status(500).json({

success:false,

reply:
"حدث خطأ"

});


}



});






// ======================================
// Generate Image
// ======================================


app.post(
"/api/generate-image",
async(req,res)=>{


try{


const prompt =
req.body.prompt;



if(!prompt){


return res.status(400).json({

success:false,

message:
"Prompt required"

});


}





const response =
await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
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
                        `Create wallpaper image:
${prompt}`
                    }
                ]
            }
        ]
    })
});

const data =
await response.json();





res.json({

success:true,

data

});




}catch(error){


console.log(
"GENERATE IMAGE ERROR:",
error
);


res.status(500).json({

success:false

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
w=>w.id === id
);





if(!wall){


return res.status(404).json({

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



if(!image.ok){


return res.status(400).json({

success:false

});


}




const buffer =
await image.arrayBuffer();



const base64 =
Buffer.from(buffer)
.toString("base64");





const response =
await fetch(

`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,

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

`
حلل هذه الخلفية.

اكتب وصف احترافي بين 100 و200 حرف.

اذكر:
الألوان،
العناصر،
الأسلوب.

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

}

]

})

}

);





const data =
await response.json();





const description =
data
?.candidates?.[0]
?.content
?.parts?.[0]
?.text;





if(!description){


return res.status(500).json({

success:false,

message:
"No AI response"

});


}





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


console.log(
"ANALYZE ERROR:",
error
);


res.status(500).json({

success:false

});


}



});

// ======================================
// Developer Protected Wall API
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
"DEVELOPER API ERROR:",
error
);


res.status(500).json({

success:false,

error:
error.message

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




for(const item of data.data || []){


const exists =
wallpapers.find(
w=>w.image === item.path
);



if(exists)
continue;



wallpapers.push({

id:
Date.now() +
Math.floor(
Math.random()*9999
),


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
"WALLHAVEN ERROR:",
error
);


res.status(500).json({

success:false

});


}


});






// ==========================================
// Artguru Enhance
// ==========================================


app.post(
"/api/artguru/enhance",
async(req,res)=>{


try{


const image =
req.body.image;



if(!image){


return res.status(400).json({

success:false,

message:
"Image required"

});


}




await new Promise(
resolve =>
setTimeout(
resolve,
1500
)
);



res.json({

success:true,

data:{

image,

mode:
"enhanced",

message:
"تم تحسين الصورة بنجاح",

enhancedAt:
new Date()
.toISOString()

}

});




}catch(error){


console.log(
"ARTGURU ERROR:",
error
);


res.status(500).json({

success:false

});


}


});





// ==========================================
// Artguru Status
// ==========================================


app.get(
"/api/artguru/status",
(req,res)=>{


res.json({

success:true,

provider:
"mock",

status:
"ready",

serverTime:
new Date()
.toISOString()

});


});






// =========================
// Comments API (Supabase)
// =========================


// جلب التعليقات
app.get(
"/api/wallpapers/:id/comments",
async (req,res)=>{

try{


const wallpaperId =
Number(req.params.id);



const { data, error } =
await supabase
.from("comments")
.select("*")
.eq("wallpaperId", wallpaperId)
.order("id", {
ascending:false
});



if(error){

throw error;

}



res.json(data);



}catch(error){


console.log(
"GET COMMENTS ERROR:",
error
);



res.status(500).json([]);


}


});





// إضافة تعليق
app.post(
"/api/wallpapers/:id/comments",
async (req,res)=>{

try{


const wallpaperId =
Number(req.params.id);



const text =
String(
req.body.text || ""
)
.trim();



if(!text){

return res.status(400).json({

success:false,

message:"Empty comment"

});

}




const newComment = {


// لا نضع id لأن Supabase ينشئه تلقائياً


wallpaperId,


user:
req.body.user ||
"مستخدم",



email:
req.body.email ||
"",



avatar:
req.body.avatar ||
"",



text,



likes:0,



likedBy:[],



date:
new Date()
.toLocaleDateString("ar-MA"),



time:
new Date()
.toLocaleTimeString(
"ar-MA",
{
hour:"2-digit",
minute:"2-digit"
}
)

};





const { data, error } =
await supabase
.from("comments")
.insert([newComment])
.select()
.single();




if(error){

throw error;

}




res.json({

success:true,

comment:data

});



}catch(error){


console.log(
"POST COMMENTS ERROR:",
error
);



res.status(500).json({

success:false

});


}


});

// =========================
// Like Comment API
// =========================

app.post(
"/api/comments/:id/like",
async (req,res)=>{

try{

const commentId = Number(req.params.id);

const userId = req.body.userId || "guest";


// جلب التعليق
const { data: comment, error } =
await supabase
.from("comments")
.select("*")
.eq("id", commentId)
.single();


if(error || !comment){

return res.status(404).json({
success:false,
message:"Comment not found"
});

}


// هل ضغط إعجاب من قبل؟
let likedBy = comment.likedBy || [];


let isNewLike = false;

if(likedBy.includes(userId)){

    // إزالة الإعجاب
    likedBy =
    likedBy.filter(
        id => id !== userId
    );

}else{

    // إضافة الإعجاب
    likedBy.push(userId);

    isNewLike = true;

}


// تحديث الرقم
const newLikes = likedBy.length;



const { error:updateError } =
await supabase
.from("comments")
.update({

likes:newLikes,
likedBy:likedBy

})
.eq("id",commentId);



if(updateError)
throw updateError;

// ===============================
// Notification: Comment Like
// ===============================

if(
    isNewLike &&
    comment.userId &&
    comment.userId !== userId
){

    let notifications =
    readNotifications();

    notifications.unshift({

        id:
        Date.now(),

        type:
        "comment_like",

        category:
        "like_comment",

        title:
        "إعجاب بتعليقك ❤️",

        content:
        `${req.body.user || "مستخدم"} أعجب بتعليقك`,

        commentText:
        comment.text || "",

        commentId:
        comment.id,

        wallpaperId:
        comment.wallpaperId || "",

        user:
        req.body.user || "مستخدم",

        userId:
        userId,

        avatar:
        req.body.avatar || "",

        recipientUID:
        comment.userId,

        date:
        new Date()
        .toLocaleString("ar-MA"),

        read:false

    });

    saveNotifications(
        notifications
    );
}

res.json({

success:true,
likes:newLikes

});


}catch(error){

console.log(
"LIKE COMMENT ERROR:",
error
);


res.status(500).json({
success:false
});


}

});

// ======================================
// Admin Announcements API (Supabase)
// ======================================


// إنشاء إعلان جديد
app.post(
"/api/admin/announcements",
async (req,res)=>{

try{


const newAnnouncement = {

type:
req.body.category ||
"admin",

title:
req.body.title ||
"",


content:
req.body.content ||
"",


image:
req.body.image ||
"",


likes:0,

views:0,


date:
new Date()
.toLocaleString("ar-MA")

};




const { data, error } =
await supabase
.from("announcements")
.insert(newAnnouncement)
.select()
.single();



if(error){
throw error;
}



res.json({

success:true,

announcement:data

});



}catch(error){


console.log(
"CREATE ANNOUNCEMENT ERROR:",
error
);


res.status(500).json({

success:false,
error:error.message

});


}

});







// جلب الإعلانات للأدمن

app.get(
"/api/admin/announcements",
async (req,res)=>{


try{


const { data, error } =
await supabase
.from("announcements")
.select("*")
.order(
"created_at",
{
ascending:false
}
);



if(error){
throw error;
}



res.json(data);



}catch(error){


console.log(
"GET ANNOUNCEMENTS ERROR:",
error
);


res.status(500).json([]);


}


});








// حذف إعلان

app.delete(
"/api/admin/announcements/:id",
async (req,res)=>{


try{


const id =
Number(req.params.id);



const { error } =
await supabase
.from("announcements")
.delete()
.eq(
"id",
id
);



if(error){
throw error;
}



res.json({

success:true

});



}catch(error){


console.log(
"DELETE ANNOUNCEMENT ERROR:",
error
);



res.status(500).json({

success:false

});


}


});

// ======================================
// User Announcements API
// ======================================

app.get(
"/api/announcements",
async (req,res)=>{

try{

const { data, error } =
await supabase
.from("announcements")
.select("*")
.order(
"created_at",
{
ascending:false
}
);


if(error){
throw error;
}


res.json(data);


}catch(error){

console.log(
"USER ANNOUNCEMENTS ERROR:",
error
);


res.status(500).json([]);

}

});

// ======================================
// تعديل إعلان
// ======================================

app.put(
"/api/admin/notifications/:id",
(req,res)=>{

try{

const id = Number(req.params.id);


let notifications = readNotifications();


const index = notifications.findIndex(
n => n.id === id
);



if(index === -1){

return res.status(404).json({
success:false,
message:"Notification not found"
});

}



notifications[index] = {

...notifications[index],

title:
req.body.title || notifications[index].title,


type:
req.body.category || notifications[index].type,


content:
req.body.content || notifications[index].content,


image:
req.body.image || notifications[index].image,


updated:
new Date().toLocaleString("ar-MA")

};



saveNotifications(
notifications
);



res.json({

success:true,

notification:
notifications[index]

});


}catch(error){


console.log(
"UPDATE ERROR:",
error
);


res.status(500).json({

success:false

});


}


});

/// ======================================
// LIKE COMMENT
// ======================================


app.post(
"/api/comments/:id/like",
(req,res)=>{


try{


const commentId =
Number(req.params.id);



let comments =
readComments();



const index =
comments.findIndex(
c=>c.id === commentId
);



if(index === -1){

return res.json({

success:false

});

}



const comment =
comments[index];



const user =
req.body.user ||
"مستخدم";



// حماية التعليقات القديمة

if(!comment.likedBy){

comment.likedBy=[];

}




// منع تكرار الإعجاب

if(
!comment.likedBy.includes(user)
){


comment.likedBy.push(user);


comment.likes =
(comment.likes || 0) + 1;




// إنشاء إشعار لصاحب التعليق

let notifications =
readNotifications();



notifications.unshift({

id:
Date.now(),


type:
"comment_like",


category:
"like_comment",


title:
"إعجاب بتعليقك ❤️",


content:
`${user} أعجب بتعليقك`,


commentText:
comment.text,


commentId:
comment.id,


wallpaperId:
comment.wallpaperId || "",


user:
comment.user,


email:
comment.email || "",


avatar:
req.body.avatar || "",


date:
new Date()
.toLocaleString("ar-MA"),


read:false


});



saveNotifications(
notifications
);



saveComments(
comments
);



}



res.json({

success:true,


likes:
comment.likes || 0


});



}catch(error){


console.log(

"LIKE COMMENT ERROR:",

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