// ======================================
// WallpaperHub Server v3.2
// Express + Firebase Firestore Edition
// ======================================

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

// ================================
// Firebase Admin (Firestore)
// ================================

let db = null;
let tokensCollection = null;
let useFirestore = false;

try {
    const admin = require("firebase-admin");

    if (!admin.apps.length) {
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

        if (serviceAccountJson) {
            try {
                const serviceAccount = JSON.parse(serviceAccountJson);
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
                console.log("✅ Firebase Admin initialized with service account");
            } catch (parseError) {
                console.log("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:", parseError.message);
                console.log("📝 Trying default initialization...");
                try {
                    admin.initializeApp();
                    console.log("✅ Firebase Admin initialized with default credentials");
                } catch (defaultError) {
                    console.log("❌ Default initialization failed:", defaultError.message);
                }
            }
        } else {
            console.log("⚠️ FIREBASE_SERVICE_ACCOUNT not set, trying default init...");
            try {
                admin.initializeApp();
                console.log("✅ Firebase Admin initialized with default credentials");
            } catch (e) {
                console.log("❌ Default initialization failed:", e.message);
            }
        }
    }

    if (admin.apps.length) {
        db = admin.firestore();
        tokensCollection = db.collection("tokens");
        useFirestore = true;
        console.log("✅ Firestore ready");
    } else {
        console.log("⚠️ Firestore not available, using file fallback");
    }
} catch (error) {
    console.log("❌ Firebase Admin not available:", error.message);
    console.log("⚠️ Using file-based token storage");
}

const app = express();
const PORT = 3000;



// ================================
// Middlewares
// ================================

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ================================
// Static Files
// ================================

app.use(express.static(__dirname));

// ================================
// Admin Panel
// ================================

app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "admin", "admin.html"));
});

// ================================
// Home
// ================================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// ================================
// Database Path
// ================================

const DATA_FILE = path.join(__dirname, "data", "wallpapers.json");
console.log("DATA PATH:", DATA_FILE);

const NOTIFICATIONS_FILE = path.join(__dirname, "data", "notifications.json");

function readNotifications() {
    try {
        return JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, "utf8"));
    } catch {
        return [];
    }
}

function saveNotifications(list) {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(list, null, 2), "utf8");
}

// ================================
// API Tokens Database (File Fallback)
// ================================

const TOKENS_FILE = path.join(__dirname, "data", "tokens.json");

function readTokensFile() {
    try {
        return JSON.parse(fs.readFileSync(TOKENS_FILE, "utf8"));
    } catch {
        return [];
    }
}

function saveTokensFile(tokens) {
    const folder = path.dirname(TOKENS_FILE);
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), "utf8");
}

// ================================
// Firestore Helpers
// ================================

async function readTokensFirestore() {
    if (!tokensCollection) return [];
    try {
        const snapshot = await tokensCollection.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.log("Firestore read error:", error.message);
        return [];
    }
}

async function saveTokenFirestore(tokenData) {
    if (!tokensCollection) return null;
    try {
        const doc = await tokensCollection.add(tokenData);
        return { id: doc.id, ...tokenData };
    } catch (error) {
        console.log("Firestore save error:", error.message);
        return null;
    }
}

async function updateTokenFirestore(id, data) {
    if (!tokensCollection) return false;
    try {
        await tokensCollection.doc(id).update(data);
        return true;
    } catch (error) {
        console.log("Firestore update error:", error.message);
        return false;
    }
}

async function deleteTokenFirestore(id) {
    if (!tokensCollection) return false;
    try {
        await tokensCollection.doc(id).delete();
        return true;
    } catch (error) {
        console.log("Firestore delete error:", error.message);
        return false;
    }
}

async function getTokensByUserFirestore(userId) {
    if (!tokensCollection) return [];
    try {
        const snapshot = await tokensCollection.where("userId", "==", String(userId)).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.log("Firestore query error:", error.message);
        return [];
    }
}

// ================================
// Read Data
// ================================

function readWallpapers() {
    try {
        const data = fs.readFileSync(DATA_FILE, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.log(error);
        return [];
    }
}

// ================================
// Save Data
// ================================

function saveWallpapers(list) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf8");
}
// ================================
// Notifications System
// ================================

function createNotification(wallpaper) {
    const notifications = readNotifications();
    notifications.unshift({
        id: Date.now(),
        title: "🆕 خلفية جديدة",
        message: `${wallpaper.title} تمت إضافتها`,
        wallpaperId: wallpaper.id,
        date: wallpaper.date
    });
    saveNotifications(notifications);
}

// ================================
// Notifications API
// ================================

app.get("/api/notifications", (req, res) => {
    const notifications = readNotifications();
    res.json(notifications);
});

app.delete("/api/notifications", (req, res) => {
    try {
        saveNotifications([]);
        res.json({ success: true, message: "Notifications cleared" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
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

app.get("/api/wallpapers", (req, res) => {
    const wallpapers = readWallpapers();
    res.json(wallpapers);
});
// ================================
// Developer API - Protected Wallpapers
// ================================

app.get("/api/v1/wallpapers", async (req, res) => {
    try {
        const token = req.query.token;
        if (!token) {
            return res.status(401).json({ success: false, message: "API Token required" });
        }

        let tokens = useFirestore ? await readTokensFirestore() : readTokensFile();
        const apiToken = tokens.find(t => t.token === token);

        if (!apiToken) {
            return res.status(401).json({ success: false, message: "Invalid API Token" });
        }

        if (!apiToken.active) {
            return res.status(403).json({ success: false, message: "Token disabled" });
        }

        const today = new Date().toISOString().split("T")[0];
        if (apiToken.lastRequestDate !== today) {
            apiToken.requests = 0;
            apiToken.lastRequestDate = today;
        }

        const dailyLimit = 200;
        if (!apiToken.requests) apiToken.requests = 0;
        if (apiToken.requests >= dailyLimit) {
            return res.status(429).json({ success: false, message: "Daily request limit reached", limit: dailyLimit });
        }

        apiToken.requests++;
        apiToken.lastUsed = new Date().toISOString();

        if (useFirestore && apiToken.id) {
            await updateTokenFirestore(apiToken.id, {
                requests: apiToken.requests,
                lastRequestDate: apiToken.lastRequestDate,
                lastUsed: apiToken.lastUsed
            });
        } else {
            const allTokens = readTokensFile();
            const idx = allTokens.findIndex(t => t.token === token);
            if (idx !== -1) {
                allTokens[idx] = apiToken;
                saveTokensFile(allTokens);
            }
        }

        const wallpapers = readWallpapers();
        res.json({
            success: true,
            developer: apiToken.appName,
            count: wallpapers.length,
            data: wallpapers
        });
    } catch (error) {
        console.log("Developer API Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});
// ================================
// Reset Daily Requests
// ================================

const today = new Date()
.toISOString()
.split("T")[0];


if(apiToken.lastRequestDate !== today){


apiToken.requests = 0;


apiToken.lastRequestDate = today;


}


// ================================
// Daily Limit Check
// ================================


const dailyLimit = 200;


// إذا لم يوجد عداد
if(!apiToken.requests){

apiToken.requests = 0;

}


// منع تجاوز الحد اليومي

if(apiToken.requests >= dailyLimit){


return res.status(429).json({

success:false,

message:
"Daily request limit reached",

limit:
dailyLimit

});


}



// زيادة عدد الطلبات

apiToken.requests++;


apiToken.lastUsed =
new Date()
.toISOString();


await updateTokenFirestore(apiToken.id, {
            requests: apiToken.requests,
            lastRequestDate: apiToken.lastRequestDate,
            lastUsed: apiToken.lastUsed
        });






const wallpapers =
readWallpapers();





res.json({

success:true,


developer:

apiToken.appName,


count:
wallpapers.length,


data:
wallpapers


});






}catch(error){


console.log(
"Developer API Error:",
error
);



res.status(500).json({

success:false,

message:
"Server Error"

});


}



});


// ================================
// Add Wallpaper
// ================================

app.post("/api/wallpapers", (req, res) => {
    try {
        const wallpapers = readWallpapers();
        const newWallpaper = {
            id: Date.now(),
            title: req.body.title || "Untitled",
            description: req.body.description || "",
            aiDescription: req.body.aiDescription || "",
            category: req.body.category || "other",
            type: req.body.type || "image",
            animated: req.body.type === "video" || req.body.type === "gif",
            thumbnail: req.body.thumbnail || req.body.image || "",
            image: req.body.image || req.body.thumbnail || "",
            resolution: req.body.resolution || "",
            size: req.body.size || "",
            downloads: 0,
            likes: 0,
            views: 0,
            rating: 0,
            ratingCount: 0,
            ratingSum: 0,
            author: req.body.author || "WallpaperHub",
            date: new Date().toLocaleString("ar-MA"),
            colors: req.body.colors || [],
            tags: req.body.tags || [],
            featured: req.body.featured || false,
            todayWallpaper: req.body.todayWallpaper || false,
            popular: req.body.popular || false
        };

        if (newWallpaper.todayWallpaper) {
            wallpapers.forEach(w => { w.todayWallpaper = false; });
        }

        wallpapers.push(newWallpaper);
        saveWallpapers(wallpapers);
        createNotification(newWallpaper);
        res.json({ success: true, wallpaper: newWallpaper });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});
// ================================
// Update Wallpaper
// ================================

app.put("/api/wallpapers/:id", (req, res) => {
    try {
        const wallpapers = readWallpapers();
        const id = Number(req.params.id);
        const index = wallpapers.findIndex(w => w.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false });
        }
        wallpapers[index] = { ...wallpapers[index], ...req.body, id };
        saveWallpapers(wallpapers);
        res.json({ success: true, wallpaper: wallpapers[index] });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});
// ================================
// Delete Wallpaper
// ================================

app.delete("/api/wallpapers/:id", (req, res) => {
    try {
        let wallpapers = readWallpapers();
        const id = Number(req.params.id);
        const index = wallpapers.findIndex(w => w.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false });
        }
        wallpapers.splice(index, 1);
        saveWallpapers(wallpapers);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// ================================
// Download Count
// ================================

app.post("/api/wallpapers/:id/download", (req, res) => {
    try {
        const wallpapers = readWallpapers();
        const id = Number(req.params.id);
        const wall = wallpapers.find(w => w.id === id);
        if (!wall) {
            return res.status(404).json({ success: false });
        }
        wall.downloads = (wall.downloads || 0) + 1;
        saveWallpapers(wallpapers);
        res.json({ success: true, downloads: wall.downloads });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false });
    }
});

// ================================
// Like Wallpaper
// ================================

app.post("/api/wallpapers/:id/like", (req, res) => {
    try {
        const wallpapers = readWallpapers();
        const id = Number(req.params.id);
        const wall = wallpapers.find(w => w.id === id);
        if (!wall) {
            return res.status(404).json({ success: false });
        }
        wall.likes = (wall.likes || 0) + 1;
        saveWallpapers(wallpapers);
        res.json({ success: true, likes: wall.likes });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false });
    }
});

// ================================
// View Wallpaper
// ================================

app.post("/api/wallpapers/:id/view", (req, res) => {
    try {
        const wallpapers = readWallpapers();
        const id = Number(req.params.id);
        const wall = wallpapers.find(w => w.id === id);
        if (!wall) {
            return res.status(404).json({ success: false });
        }
        wall.views = (wall.views || 0) + 1;
        saveWallpapers(wallpapers);
        res.json({ success: true, views: wall.views });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false });
    }
});

// ================================
// Rating
// ================================

app.post("/api/wallpapers/:id/rate", (req, res) => {
    try {
        const wallpapers = readWallpapers();
        const id = Number(req.params.id);
        const wall = wallpapers.find(w => w.id === id);
        if (!wall) {
            return res.status(404).json({ success: false });
        }
        const rating = Number(req.body.rating);
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: "Rating must be 1-5" });
        }
        wall.ratingCount = (wall.ratingCount || 0) + 1;
        wall.ratingSum = (wall.ratingSum || 0) + rating;
        wall.rating = Number((wall.ratingSum / wall.ratingCount).toFixed(1));
        saveWallpapers(wallpapers);
        res.json({ success: true, rating: wall.rating, ratingCount: wall.ratingCount });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false });
    }
});

// ================================
// Gemini AI Chat
// ================================

app.post("/api/chat", async (req, res) => {
    try {
        const { message, imageData, mimeType, locale, timezone } = req.body;
        let parts = [];
        parts.push({
            text: `أنت WallpaperHub AI. جاوب المستخدم بنفس لغته ولهجته. إذا كان من المغرب استعمل الدارجة المغربية. حلل الصورة إذا كانت موجودة. لغة المستخدم: ${locale} المنطقة: ${timezone} رسالة المستخدم: ${message}`
        });

        if (imageData) {
            parts.push({ inlineData: { mimeType: mimeType || "image/jpeg", data: imageData } });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: parts }] })
            }
        );

        const data = await response.json();
        console.log("Gemini Status:", response.status);

        if (!response.ok) {
            console.log(data);
            return res.json({ reply: "⚠️ مشكلة في الاتصال بـ Gemini" });
        }

        if (!data.candidates || !data.candidates[0]) {
            return res.json({ reply: "⚠️ Gemini لم يرجع جواب" });
        }

        res.json({ reply: data.candidates[0].content.parts[0].text });
    } catch (error) {
        console.log("Gemini Error:", error);
        res.json({ reply: "⚠️ وقع خطأ مؤقت" });
    }
});

// ================================
// Generate Image
// ================================

app.post("/api/generate-image", async (req, res) => {
    try {
        const { prompt, model } = req.body;

        if (model === "stable") {
            const response = await fetch(
                "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${process.env.HF_TOKEN}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        inputs: `Premium smartphone wallpaper. ${prompt} Requirements: - 4K quality - vertical phone wallpaper - no text - no watermark - ultra detailed`
                    })
                }
            );

            if (!response.ok) {
                const error = await response.text();
                console.log("HuggingFace Error:", error);
                return res.status(500).json({ error: "Stable Diffusion failed" });
            }

            const buffer = await response.arrayBuffer();
            const base64 = Buffer.from(buffer).toString("base64");
            return res.json({ image: `data:image/png;base64,${base64}` });
        }

        if (model === "unsplash") {
            const response = await fetch(
                `https://api.unsplash.com/search/photos?query=${encodeURIComponent(prompt)}&per_page=1`,
                { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_KEY}` } }
            );
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                return res.json({ image: data.results[0].urls.regular });
            }
            return res.json({ error: "لم يتم العثور على خلفية" });
        }

        return res.status(400).json({ error: "Unknown model" });
    } catch (error) {
        console.log("Image API Error:", error);
        res.status(500).json({ error: error.message });
    }
});
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

app.post("/api/wallpapers/:id/analyze", async (req, res) => {
    try {
        const wallpapers = readWallpapers();
        const id = Number(req.params.id);
        const wall = wallpapers.find(w => w.id === id);
        if (!wall) {
            return res.status(404).json({ success: false });
        }

        if (wall.aiDescription) {
            return res.json({ success: true, description: wall.aiDescription });
        }

        const imageResponse = await fetch(wall.image);
        const buffer = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: `حلل هذه الخلفية. اكتب وصف احترافي بين 100 و200 حرف. اذكر العناصر، الألوان، الجو، والأسلوب.` },
                            { inlineData: { mimeType: "image/jpeg", data: base64 } }
                        ]
                    }]
                })
            }
        );

        const data = await response.json();
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
            console.log("GEMINI RESPONSE ERROR:", data);
            return res.status(500).json({ success: false, message: "AI response invalid" });
        }

        const description = data.candidates[0].content.parts[0].text;
        wall.aiDescription = description;
        saveWallpapers(wallpapers);
        res.json({ success: true, description });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false });
    }
});

// =====================================
// Wallhaven Import API
// =====================================

app.get("/api/wallhaven", async (req, res) => {
    try {
        const response = await fetch("https://wallhaven.cc/api/v1/search?sorting=toplist&purity=100&categories=111");
        const data = await response.json();
        const wallpapers = data.data.map(item => ({
            id: item.id,
            image: item.path,
            thumbnail: item.thumbs.large,
            source: "wallhaven"
        }));
        res.json(wallpapers);
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false });
    }
});

// =====================================
// AI Wallhaven Import + Auto Category
// =====================================

app.post("/api/wallhaven/import-ai", async (req, res) => {
    try {
        const response = await fetch("https://wallhaven.cc/api/v1/search?sorting=toplist&purity=100&categories=111");
        const data = await response.json();
        let wallpapers = readWallpapers();

        for (const item of data.data) {
            if (item.resolution) {
                const [w, h] = item.resolution.split("x").map(Number);
                if (w < 3840 || h < 2160) continue;
            }

            const exists = wallpapers.find(w => w.image === item.path);
            if (exists) continue;

            const imageResponse = await fetch(item.path);
            const buffer = await imageResponse.arrayBuffer();
            const base64 = Buffer.from(buffer).toString("base64");

            const aiResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: `حلل هذه الخلفية. مهم: - ارفض صور البشر والوجوه. - ارفض صور البورتريه. - اقبل فقط خلفيات عالية الجودة. - اقبل كل خلفيات دات عمق خماسي الابعاد اختر القسم المناسب فقط: games animals cars amoled space nature other إذا كانت الصورة تحتوي إنسان أرجع: {"category":"reject"} أرجع JSON فقط: {"category":"","description":"","tags":[]}` },
                                { inlineData: { mimeType: "image/jpeg", data: base64 } }
                            ]
                        }]
                    })
                }
            );

            const ai = await aiResponse.json();
            if (!ai.candidates || !ai.candidates[0]) continue;

            const text = ai.candidates[0].content.parts[0].text;
            let result;
            try {
                const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
                result = JSON.parse(clean);
            } catch (error) {
                console.log("AI JSON ERROR", text);
                continue;
            }

            if (result.category === "reject") continue;

            wallpapers.push({
                id: Date.now() + Math.floor(Math.random() * 9999),
                title: "Wallhaven AI",
                description: "",
                aiDescription: result.description || "",
                image: item.path,
                thumbnail: item.thumbs.large,
                category: "wallhaven",
                aiCategory: result.category || "other",
                source: "wallhaven",
                tags: result.tags || [],
                downloads: 0,
                likes: 0,
                views: 0,
                rating: 0,
                ratingCount: 0,
                date: new Date().toLocaleString("ar-MA")
            });
        }

        saveWallpapers(wallpapers);
        res.json({ success: true, message: "AI Import Completed", count: data.data.length });
    } catch (error) {
        console.log("Wallhaven AI Import Error", error);
        res.status(500).json({ success: false, error: error.message });
    }
});
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
- اقبل كل خلفيات دات عمق خماسي الابعاد

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



}catch(error){


console.log(
"AI JSON ERROR",
text
);



continue;


}






// رفض صور البشر

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
"wallhaven",


aiCategory:
result.category || "other",


source:
"wallhaven",


tags:
result.tags || [],


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
data.data.length

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

// ================================
// Create API Token
// ================================

app.post("/api/tokens/create", async (req, res) => {
    try {
        const { userId, appName, domain } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID required" });
        }

        const tokenValue = "wall_live_" + Math.random().toString(36).substring(2) + Date.now();
        const tokenData = {
            userId,
            appName: appName || "My App",
            domain: domain || "",
            token: tokenValue,
            limit: 200,
            requests: 0,
            lastRequestDate: null,
            lastUsed: null,
            active: true,
            created: new Date().toISOString()
        };

        let saved = null;

        if (useFirestore) {
            saved = await saveTokenFirestore(tokenData);
            if (saved) {
                console.log("✅ Token saved to Firestore:", saved.id);
            } else {
                console.log("⚠️ Firestore save failed, trying file fallback");
            }
        }

        if (!saved) {
            const tokens = readTokensFile();
            const newToken = { ...tokenData, id: Date.now() };
            tokens.push(newToken);
            saveTokensFile(tokens);
            saved = newToken;
            console.log("✅ Token saved to file:", saved.id);
        }

        res.json({ success: true, token: saved });
    } catch (error) {
        console.log("Create Token Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ================================
// Get User Tokens
// ================================

app.get("/api/tokens/:userId", async (req, res) => {
    try {
        let tokens = [];
        if (useFirestore) {
            tokens = await getTokensByUserFirestore(req.params.userId);
        }
        if (tokens.length === 0) {
            tokens = readTokensFile().filter(t => String(t.userId) === String(req.params.userId));
        }
        res.json(tokens);
    } catch (error) {
        console.log("Get Tokens Error:", error);
        res.status(500).json([]);
    }
});

// ================================
// Delete Token
// ================================

app.delete("/api/tokens/:id", async (req, res) => {
    try {
        let deleted = false;
        if (useFirestore) {
            deleted = await deleteTokenFirestore(req.params.id);
        }
        if (!deleted) {
            let tokens = readTokensFile();
            tokens = tokens.filter(t => String(t.id) !== String(req.params.id));
            saveTokensFile(tokens);
            deleted = true;
        }
        res.json({ success: deleted });
    } catch (error) {
        console.log("Delete Token Error:", error);
        res.status(500).json({ success: false });
    }
});

//=====تشغيل سيرفر===\

const BASE_URL = process.env.RAILWAY_STATIC_URL || process.env.VERCEL_URL || `http://localhost:${PORT}`;

app.listen(PORT, () => {
    console.log("WallpaperHub Server Started");
    console.log("PORT:", PORT);
    console.log("Storage:", useFirestore ? "Firestore" : "File (fallback)");
});

setTimeout(() => {
    fetch(`${BASE_URL}/api/wallhaven/import-ai`, { method: "POST" })
        .then(res => res.json())
        .then(data => console.log("AI Import:", data))
        .catch(err => console.log("Auto-import error:", err.message));
}, 5000);