// ======================================
// WallpaperHub Server v4
// Clean Stable Version
// ======================================

const exifParser = require("exif-parser");
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const fetch = require("node-fetch");

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_SERVER_KEY =
process.env.SUPABASE_SERVICE_ROLE_KEY ||
process.env.SUPABASE_KEY;

const supabase = createClient(
process.env.SUPABASE_URL,
SUPABASE_SERVER_KEY
);

// ======================================
// Authenticated publisher identity
// لا نثق في userId القادم من المتصفح؛ UID يؤخذ من جلسة Supabase نفسها.
// ======================================
async function getAuthenticatedUser(req){
    const header = String(req.headers.authorization || "").trim();
    if(!header.toLowerCase().startsWith("bearer ")) return null;

    const token = header.slice(7).trim();
    if(!token) return null;

    const { data, error } = await supabase.auth.getUser(token);
    if(error || !data?.user) return null;

    return data.user;
}

// ======================================
// Admin authorization
// تصنيف الخلفيات لا يتغير إلا بواسطة الأدمن.
// ضع UID الأدمن في متغير البيئة ADMIN_UIDS (يمكن فصل أكثر من UID بفاصلة).
// ويمكن أيضًا استخدام app_metadata.role = "admin" لأنه محفوظ من جهة الخادم.
// لا نستخدم user_metadata.role لأنه قابل للتعديل من المستخدم.
// ======================================
function isAdminUser(user){
    if(!user) return false;

    const adminUIDs = String(process.env.ADMIN_UIDS || "")
        .split(",")
        .map(v => v.trim())
        .filter(Boolean);

    const uid = String(user.id || "").trim();
    if(uid && adminUIDs.includes(uid)) return true;

    return String(user.app_metadata?.role || "").trim().toLowerCase() === "admin";
}

async function requireAdmin(req, res){
    const user = await getAuthenticatedUser(req);
    if(!user){
        res.status(401).json({
            success:false,
            message:"يجب تسجيل الدخول"
        });
        return null;
    }

    if(!isAdminUser(user)){
        res.status(403).json({
            success:false,
            message:"غير مصرح: هذه العملية للأدمن فقط"
        });
        return null;
    }

    return user;
}

async function getPublisherProfile(user){
    const metadata = user?.user_metadata || {};
    let fullName = String(
        metadata.full_name ||
        metadata.name ||
        metadata.user_name ||
        user?.email?.split("@")[0] ||
        "مستخدم"
    ).trim();

    try{
        const { data, error } = await supabase
            .from("profiles")
            .select("full_name,username,avatar_url")
            .eq("id", user.id)
            .maybeSingle();

        if(!error && data){
            fullName = String(data.full_name || data.username || fullName).trim();
        }
    }catch(_error){}

    return {
        fullName,
        avatar: String(metadata.avatar_url || metadata.picture || "").trim()
    };
}

// ===============================
// Gemini API KEY
// ===============================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_IMAGE_MODEL = "gemini-3.5-flash-exp";

// ======================================
// Artguru Open API
// API key stays server-side only.
// ======================================
const ARTGURU_API_KEY = String(process.env.ARTGURU_API_KEY || "").trim();
const ARTGURU_API_BASE = String(process.env.ARTGURU_API_BASE || "https://api.artguru.ai").replace(/\/$/, "");
const ARTGURU_BUCKET = String(process.env.ARTGURU_BUCKET || "artguru-temp").trim();
const ARTGURU_TASK_TIMEOUT_MS = Math.max(30000, Number(process.env.ARTGURU_TASK_TIMEOUT_MS || 180000));
const ARTGURU_POLL_MS = Math.max(1500, Number(process.env.ARTGURU_POLL_MS || 2500));

function parseDataImage(value){
    const raw = String(value || "");
    const match = raw.match(/^data:(image\/(?:jpeg|png|webp|gif|avif|bmp));base64,(.+)$/i);
    if(!match) return null;
    const mimeType = match[1].toLowerCase();
    const buffer = Buffer.from(match[2], "base64");
    if(!buffer.length) return null;
    return { mimeType, buffer };
}

async function ensureArtguruBucket(){
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if(listError) throw listError;
    if((buckets || []).some(bucket => bucket.name === ARTGURU_BUCKET)) return;

    const { error: createError } = await supabase.storage.createBucket(ARTGURU_BUCKET, {
        public: false,
        fileSizeLimit: "15MB"
    });

    // Another request may have created it at the same time.
    if(createError && !/already exists|duplicate/i.test(String(createError.message || ""))){
        throw createError;
    }
}

async function uploadArtguruSource(dataImage){
    const parsed = parseDataImage(dataImage);
    if(!parsed) throw new Error("صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WEBP.");
    if(parsed.buffer.length > 12 * 1024 * 1024){
        throw new Error("حجم الصورة كبير جدًا. الحد الأقصى 12MB.");
    }

    await ensureArtguruBucket();

    const ext = parsed.mimeType.split("/")[1] === "jpeg" ? "jpg" : parsed.mimeType.split("/")[1];
    const objectPath = `enhance/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from(ARTGURU_BUCKET)
        .upload(objectPath, parsed.buffer, {
            contentType: parsed.mimeType,
            upsert: false
        });

    if(uploadError) throw uploadError;

    const { data: signed, error: signedError } = await supabase.storage
        .from(ARTGURU_BUCKET)
        .createSignedUrl(objectPath, 900);

    if(signedError || !signed?.signedUrl){
        await supabase.storage.from(ARTGURU_BUCKET).remove([objectPath]).catch(()=>{});
        throw signedError || new Error("تعذر إنشاء رابط مؤقت للصورة.");
    }

    return { objectPath, signedUrl: signed.signedUrl };
}

async function deleteArtguruSource(objectPath){
    if(!objectPath) return;
    try{
        await supabase.storage.from(ARTGURU_BUCKET).remove([objectPath]);
    }catch(error){
        console.log("ARTGURU SOURCE CLEANUP ERROR:", error.message);
    }
}

async function artguruRequest(url, options = {}){
    if(!ARTGURU_API_KEY) throw new Error("ARTGURU_API_KEY غير مضبوط على الخادم.");

    const response = await fetch(url, {
        ...options,
        headers:{
            ...(options.headers || {}),
            "x-api-key": ARTGURU_API_KEY,
            "Accept":"application/json"
        }
    });

    const text = await response.text();
    let data = {};
    try{ data = text ? JSON.parse(text) : {}; }catch(_error){ data = { raw:text }; }

    if(!response.ok){
        const message = data?.message || data?.msg || `Artguru API error (${response.status})`;
        const error = new Error(message);
        error.status = response.status;
        error.payload = data;
        throw error;
    }

    return data;
}

async function createArtguruEnhanceTask(imageUrl){
    const data = await artguruRequest(`${ARTGURU_API_BASE}/api/v1/enhance/generate`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ image:imageUrl })
    });

    if(Number(data?.code) !== 0){
        throw new Error(data?.message || data?.msg || "تعذر إنشاء مهمة التحسين.");
    }

    const taskId = data?.data?.tasks?.[0]?.taskId;
    if(!taskId) throw new Error("Artguru لم يرجع رقم المهمة.");
    return { taskId, queueStatus:data?.data?.queueStatus || "PENDING" };
}

async function waitForArtguruTask(taskId){
    const startedAt = Date.now();

    while(Date.now() - startedAt < ARTGURU_TASK_TIMEOUT_MS){
        const data = await artguruRequest(`${ARTGURU_API_BASE}/api/v1/tasks/ENHANCE/${encodeURIComponent(taskId)}`);
        const status = String(data?.data?.status || "").toUpperCase();
        const image = data?.data?.generateImage || data?.data?.image || data?.data?.url || "";

        if(status === "SUCCESS" && image) return { image, status };
        if(["FAILED","FAIL","ERROR","CANCELED","CANCELLED"].includes(status)){
            throw new Error(data?.message || data?.data?.message || "فشلت معالجة Artguru للصورة.");
        }

        await new Promise(resolve => setTimeout(resolve, ARTGURU_POLL_MS));
    }

    throw new Error("انتهت مهلة انتظار Artguru. حاول مرة أخرى.");
}
// ======================================
// Express
// ======================================

const app = express();

const PORT = process.env.PORT || 3000;

app.get("/api/admin/me", async (req, res) => {
    try{
        const user = await getAuthenticatedUser(req);
        if(!user){
            return res.status(401).json({ success:false, isAdmin:false });
        }
        return res.json({
            success:true,
            isAdmin:isAdminUser(user),
            userId:String(user.id)
        });
    }catch(error){
        console.log("ADMIN ME ERROR:", error);
        return res.status(500).json({ success:false, isAdmin:false });
    }
});




// ======================================
// Public Supabase browser configuration
// لا نعرض Service Role Key هنا.
// ======================================
app.get("/api/supabase/config", (req, res) => {
    const url = String(process.env.SUPABASE_URL || "").trim();
    const anonKey = getPublicSupabaseKey();
    if(!url || !anonKey){
        return res.status(503).json({success:false,message:"Supabase public configuration is not configured"});
    }
    return res.json({success:true,url,anonKey});
});


// ======================================
// Middleware
// ======================================


app.use(
    cors()
);



app.use(
    express.json({
        limit:"20mb"
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

// Static frontend files — local + Vercel compatible
const STATIC_ROOT = process.cwd();
const STATIC_DIR = __dirname;

app.use(express.static(STATIC_ROOT, {
    index: false,
    fallthrough: true
}));

if (STATIC_DIR !== STATIC_ROOT) {
    app.use(express.static(STATIC_DIR, {
        index: false,
        fallthrough: true
    }));
}

// Vercel build tracing with the existing project configuration can include
// server.js without copying every frontend asset. When a static asset is not
// present in the serverless bundle, fetch the exact file from the project's
// GitHub main branch. This keeps the fix entirely inside server.js.
const GITHUB_STATIC_BASE =
    "https://raw.githubusercontent.com/nabil1995nabil/WallpaperHub/main/";

const STATIC_EXTENSIONS = new Set([
    ".css", ".js", ".mjs", ".json", ".map",
    ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico",
    ".avif", ".bmp", ".webm", ".mp4", ".mov", ".m4v",
    ".woff", ".woff2", ".ttf", ".otf", ".eot"
]);

app.get(/^\/(.+)$/, async (req, res, next) => {
    const requested = req.params[0] || "";
    if (!requested || requested.startsWith("api/")) return next();

    const ext = path.extname(requested).toLowerCase();
    if (!STATIC_EXTENSIONS.has(ext)) return next();

    try {
        const cleanPath = requested
            .split("?")[0]
            .split("#")[0]
            .replace(/^\/+/, "")
            .split("/")
            .filter(part => part && part !== "." && part !== "..")
            .map(part => encodeURIComponent(part))
            .join("/");

        const remote = await fetch(GITHUB_STATIC_BASE + cleanPath);

        if (!remote.ok) return next();

        const contentType = remote.headers.get("content-type");
        if (contentType) res.set("Content-Type", contentType);
        res.set("Cache-Control", "public, max-age=300");

        const body = await remote.buffer();
        return res.send(body);
    } catch (error) {
        console.error("Static asset proxy error:", error.message);
        return next();
    }
});

// Fallback for frontend files when running as a Vercel serverless function.
app.get(/^\/(.+)$/, (req, res, next) => {
    const requested = req.params[0];
    if (!requested || requested.startsWith('api/')) return next();

    const safePath = path.normalize(requested).replace(/^([.][.][\\/])+/, '');
    const candidates = [
        path.join(STATIC_ROOT, safePath),
        path.join(STATIC_DIR, safePath)
    ];

    for (const filePath of candidates) {
        try {
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                return res.sendFile(filePath);
            }
        } catch (_) {}
    }

    next();
});



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
    "/community",
    (req,res)=>{
        res.sendFile(path.join(__dirname, "community", "community.html"));
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
// Supabase Database Storage
// Vercel-safe: no local JSON data files.
// Images stay on Cloudinary.
// ======================================

function wallpaperFromDb(row){
    return {
        id: Number(row.id),
        title: row.title ?? "",
        category: row.category ?? "other",
        thumbnail: row.thumbnail ?? "",
        image: row.image ?? "",
        resolution: row.resolution ?? "",
        size: row.size ?? "",
        downloads: Number(row.downloads ?? 0),
        likes: Number(row.likes ?? 0),
        views: Number(row.views ?? 0),
        rating: Number(row.rating ?? 0),
        ratingCount: Number(row.rating_count ?? 0),
        ratingSum: Number(row.rating_sum ?? 0),
        author: row.author ?? "WallpaperHub",
        date: row.date ?? "",
        colors: Array.isArray(row.colors) ? row.colors : [],
        tags: Array.isArray(row.tags) ? row.tags : [],
        featured: Boolean(row.featured),
        todayWallpaper: Boolean(row.today_wallpaper),
        popular: Boolean(row.popular),
        type: row.type ?? "image",
        animated: Boolean(row.animated),
        source: row.source ?? "",
        // صاحب الخلفية الحقيقي محفوظ في wallpapers.user_id
        // ونستخدم ownerUID كاسم توافق مع الكود القديم.
        ownerUID: row.user_id ?? "",
        userId: row.user_id ?? ""
    };
}

function wallpaperToDb(w){
    return {
        id: Number(w.id),
        title: w.title ?? null,
        category: w.category ?? null,
        thumbnail: w.thumbnail ?? null,
        image: w.image ?? null,
        resolution: w.resolution ?? null,
        size: w.size ?? null,
        downloads: Number(w.downloads ?? 0),
        likes: Number(w.likes ?? 0),
        views: Number(w.views ?? 0),
        rating: Number(w.rating ?? 0),
        rating_count: Number(w.ratingCount ?? 0),
        rating_sum: Number(w.ratingSum ?? 0),
        author: w.author ?? null,
        date: w.date ?? null,
        colors: Array.isArray(w.colors) ? w.colors : [],
        tags: Array.isArray(w.tags) ? w.tags : [],
        featured: Boolean(w.featured),
        today_wallpaper: Boolean(w.todayWallpaper),
        popular: Boolean(w.popular),
        type: w.type ?? "image",
        animated: Boolean(w.animated),
        source: w.source ?? null,
        user_id: w.userId ?? w.user_id ?? null
    };
}

async function getWallpapersFromSupabase(){
    const { data, error } = await supabase
        .from("wallpapers")
        .select("*")
        .order("id", { ascending: true });

    if(error) throw error;
    return (data || []).map(wallpaperFromDb);
}

async function getWallpaperFromSupabase(id){
    const { data, error } = await supabase
        .from("wallpapers")
        .select("*")
        .eq("id", Number(id))
        .maybeSingle();

    if(error) throw error;
    return data ? wallpaperFromDb(data) : null;
}

function commentFromDb(row, mention = null){
    return {
        id: Number(row.id),
        created_at: row.created_at ?? null,
        user: row.user ?? "مستخدم",
        email: row.email ?? "",
        avatar: row.avatar ?? "",
        text: row.text ?? "",
        wallpaperId: row.wallpaperId ?? "",
        likes: Number(row.likes ?? 0),
        likedBy: Array.isArray(row.likedBy) ? row.likedBy : [],
        date: row.date ?? "",
        time: row.time ?? "",
        userId: row.userId ?? "",
        mentionedUserId: mention?.mentioned_user_id ?? row.mentionedUserId ?? "",
        mentionedName: mention?.mentioned_name ?? row.mentionedName ?? ""
    };
}

function notificationTitle(type){
    if(type === "wallpaper_like") return "إعجاب بخلفيتك ❤️";
    if(type === "wallpaper_comment") return "تعليق جديد على خلفيتك 💬";
    if(type === "wallpaper_mention") return "أشار إليك في تعليق 💙";
    if(type === "comment_like") return "إعجاب بتعليقك ❤️";
    return "إشعار جديد";
}

function notificationFromDb(row, extra = {}){
    return {
        id: Number(row.id),
        created_at: row.created_at ?? null,
        type: row.type ?? "",
        category: row.type ?? "",
        title: notificationTitle(row.type),
        content: row.message ?? "",
        message: row.message ?? "",

        // روابط حقيقية بالخلفية والتعليق حتى تستطيع صفحة الإشعارات
        // فتح wallpaper.html?id=... مباشرة.
        wallpaperId: row.wallpaper_id ?? extra.wallpaperId ?? "",
        wallpaperTitle: row.wallpaper_title ?? extra.wallpaperTitle ?? "",
        commentId: row.comment_id ?? extra.commentId ?? "",
        commentText: row.comment_text ?? extra.commentText ?? "",

        // هوية مرسل الإشعار. يتم إثراؤها من profiles/comments بدلاً من
        // الاعتماد على اسم يرسله المتصفح.
        userId: row.from_user ?? "",
        userName: row.user_name ?? extra.userName ?? "",
        avatar: row.avatar ?? extra.avatar ?? "",

        recipientUID: row.user_id ?? "",
        date: row.created_at
            ? new Date(row.created_at).toLocaleString("ar-MA")
            : "",
        read: Boolean(row.is_read),
        is_read: Boolean(row.is_read)
    };
}

// إثراء الإشعار ببيانات الخلفية/التعليق الموجودة أصلاً في Supabase.
async function enrichNotifications(rows){
    const notifications = Array.isArray(rows) ? rows : [];

    const wallpaperIds = [
        ...new Set(
            notifications
                .map(n => n.wallpaper_id)
                .filter(id => id !== null && id !== undefined && String(id) !== "")
                .map(id => Number(id))
                .filter(Number.isFinite)
        )
    ];

    const commentIds = [
        ...new Set(
            notifications
                .map(n => n.comment_id)
                .filter(id => id !== null && id !== undefined && String(id) !== "")
                .map(id => Number(id))
                .filter(Number.isFinite)
        )
    ];

    const wallpaperMap = new Map();
    const commentMap = new Map();
    const profileMap = new Map();

    if(wallpaperIds.length){
        const { data, error } = await supabase
            .from("wallpapers")
            .select("id,title")
            .in("id", wallpaperIds);

        if(error) throw error;

        (data || []).forEach(w => {
            wallpaperMap.set(Number(w.id), w);
        });
    }

    if(commentIds.length){
        const { data, error } = await supabase
            .from("comments")
            .select("id,text,avatar,user,userId")
            .in("id", commentIds);

        if(error) throw error;

        (data || []).forEach(c => {
            commentMap.set(Number(c.id), c);
        });
    }

    const senderIds = [
        ...new Set(
            notifications
                .map(n => String(n.from_user || "").trim())
                .filter(Boolean)
        )
    ];

    if(senderIds.length){
        const { data, error } = await supabase
            .from("profiles")
            .select("id,full_name,username,avatar_url")
            .in("id", senderIds);

        if(error) {
            console.log("NOTIFICATION SENDER PROFILE ERROR:", error.message);
        } else {
            (data || []).forEach(profile => {
                profileMap.set(String(profile.id), profile);
            });
        }
    }

    return notifications.map(row => {
        const wallpaper = wallpaperMap.get(Number(row.wallpaper_id));
        const comment = commentMap.get(Number(row.comment_id));
        const profile = profileMap.get(String(row.from_user || ""));

        return notificationFromDb(row, {
            wallpaperTitle: wallpaper?.title || "",
            commentText: comment?.text || "",
            avatar: row.avatar || comment?.avatar || profile?.avatar_url || "",
            userName:
                row.user_name ||
                comment?.user ||
                profile?.full_name ||
                profile?.username ||
                "مستخدم"
        });
    });
}

async function createNotification({
    recipientUID,
    fromUser,
    type,
    wallpaperId = null,
    commentId = null,
    message = ""
}){
    if(!recipientUID) return null;

    const payload = {
        id: Date.now(),
        user_id: String(recipientUID),
        from_user: String(fromUser || ""),
        type: String(type || ""),
        wallpaper_id: wallpaperId == null ? null : String(wallpaperId),
        comment_id: commentId == null ? null : String(commentId),
        message: String(message || ""),
        is_read: false
    };

    const { data, error } = await supabase
        .from("notifications")
        .insert([payload])
        .select("*")
        .single();

    if(error) throw error;
    return notificationFromDb(data);
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

// ======================================
// Mark Notification As Read
// ======================================

app.patch(
    "/api/notifications/:id/read",
    async (req, res) => {
        try {
            const notificationId = Number(req.params.id);
            const authenticatedUser = await getAuthenticatedUser(req);
            const recipientUID = String(authenticatedUser?.id || "").trim();

            if (!Number.isFinite(notificationId) || notificationId <= 0 || !recipientUID) {
                return res.status(400).json({
                    success: false,
                    message: "Notification ID and recipient UID are required"
                });
            }

            const { data, error } = await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("id", notificationId)
                .eq("user_id", recipientUID)
                .select("*")
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: "Notification not found"
                });
            }

            res.json({
                success: true,
                notification: notificationFromDb(data)
            });
        } catch (error) {
            console.log("MARK NOTIFICATION READ ERROR:", error);
            res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }
);

// ======================================
// Mark All User Notifications As Read
// ======================================

app.patch(
    "/api/notifications/read-all",
    async (req, res) => {
        try {
            const authenticatedUser = await getAuthenticatedUser(req);
            const recipientUID = String(authenticatedUser?.id || "").trim();

            if (!recipientUID) {
                return res.status(400).json({
                    success: false,
                    message: "Recipient UID is required"
                });
            }

            const { data, error } = await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("user_id", recipientUID)
                .eq("is_read", false)
                .select("id");

            if (error) throw error;

            res.json({
                success: true,
                updated: Array.isArray(data) ? data.length : 0
            });
        } catch (error) {
            console.log("MARK ALL NOTIFICATIONS READ ERROR:", error);
            res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }
);

app.get(
    "/api/notifications",
    async (req, res) => {
        try {
            const authenticatedUser = await getAuthenticatedUser(req);
            const recipientUID = String(authenticatedUser?.id || "").trim();
            if(!recipientUID) return res.status(401).json({success:false,message:"يجب تسجيل الدخول"});

            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", recipientUID)
                .order("created_at", { ascending: false });

            if(error) throw error;

            const enriched = await enrichNotifications(data || []);
            res.json(enriched);
        } catch(error) {
            console.log("GET NOTIFICATIONS ERROR:", error);
            res.status(500).json([]);
        }
    }
);
// ======================================
// Public User Profile API
// UID -> profiles / Auth metadata
// لا يعتمد على جلسة الزائر ولا على RLS من المتصفح.
// ======================================
app.get(
    "/api/users/:uid/profile",
    async (req, res) => {
        try {
            const targetUID = String(req.params.uid || "").trim();

            if(!targetUID){
                return res.status(400).json({
                    success:false,
                    user:null,
                    message:"User UID is required"
                });
            }

            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("id, full_name, username, avatar_url")
                .eq("id", targetUID)
                .maybeSingle();

            if(profileError){
                console.log("PUBLIC PROFILE QUERY ERROR:", profileError.message);
            }

            // الغلاف العام: نقرأه من user_profile_sync عبر السيرفر،
            // حتى يستطيع أي زائر رؤية غلاف صاحب البروفايل.
            let syncProfile = null;
            try{
                const { data: syncData, error: syncError } = await supabase
                    .from("user_profile_sync")
                    .select("cover_url,bio,join_date")
                    .eq("user_id", targetUID)
                    .maybeSingle();

                if(syncError){
                    console.log("PUBLIC PROFILE SYNC QUERY ERROR:", syncError.message);
                }else{
                    syncProfile = syncData || null;
                }
            }catch(syncError){
                console.log("PUBLIC PROFILE SYNC ERROR:", syncError.message);
            }

            if(profile){
                return res.json({
                    success:true,
                    uid:targetUID,
                    user:{
                        id:String(profile.id),
                        full_name:profile.full_name || "",
                        username:profile.username || "",
                        avatar_url:profile.avatar_url || "",
                        cover_url:syncProfile?.cover_url || "",
                        bio:syncProfile?.bio || "",
                        join_date:syncProfile?.join_date || ""
                    }
                });
            }

            try{
                const { data: authData, error: authError } =
                    await supabase.auth.admin.getUserById(targetUID);

                if(!authError && authData?.user){
                    const authUser = authData.user;
                    const meta = authUser.user_metadata || {};

                    return res.json({
                        success:true,
                        uid:targetUID,
                        user:{
                            id:String(authUser.id),
                            full_name:meta.full_name || meta.name || meta.user_name || "",
                            username:meta.username || meta.user_name || "",
                            avatar_url:meta.avatar_url || meta.picture || "",
                            cover_url:syncProfile?.cover_url || "",
                            bio:syncProfile?.bio || "",
                            join_date:syncProfile?.join_date || ""
                        }
                    });
                }
            }catch(authError){
                console.log("PUBLIC PROFILE AUTH FALLBACK ERROR:", authError.message);
            }

            return res.status(404).json({
                success:false,
                user:null,
                message:"User profile not found"
            });
        }catch(error){
            console.log("GET PUBLIC PROFILE ERROR:", error);
            return res.status(500).json({
                success:false,
                user:null,
                message:error.message
            });
        }
    }
);

// ======================================
// Real Wallpaper Publisher Profile
// UID -> profiles -> profile.html?uid=...
// ======================================
app.get(
    "/api/wallpapers/:id/publisher",
    async (req, res) => {
        try {
            const wallpaperId = Number(req.params.id);
            const requestedUID = String(req.query.uid || "").trim();
            if (!Number.isFinite(wallpaperId)) {
                return res.status(400).json({ success:false, message:"Invalid wallpaper ID" });
            }

            const wallpaper = await getWallpaperFromSupabase(wallpaperId);
            const ownerUID = String(wallpaper?.ownerUID || wallpaper?.userId || "").trim();
            if (!ownerUID) {
                return res.json({ success:false, user:null, message:"Wallpaper has no owner UID" });
            }

            if (requestedUID && requestedUID !== ownerUID) {
                return res.status(403).json({ success:false, message:"Publisher UID does not match wallpaper owner" });
            }

            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("id, full_name, username, avatar_url")
                .eq("id", ownerUID)
                .maybeSingle();

            if (profileError) console.log("PUBLISHER PROFILE QUERY ERROR:", profileError.message);

            if (profile) {
                return res.json({
                    success:true,
                    uid:ownerUID,
                    user:{
                        id:String(profile.id),
                        full_name:profile.full_name || "",
                        username:profile.username || "",
                        avatar_url:profile.avatar_url || ""
                    }
                });
            }

            // احتياطي حقيقي من Supabase Auth إذا لم يوجد صف في profiles.
            try {
                const { data: authData, error: authError } = await supabase.auth.admin.getUserById(ownerUID);
                if (!authError && authData?.user) {
                    const authUser = authData.user;
                    const meta = authUser.user_metadata || {};
                    return res.json({
                        success:true,
                        uid:ownerUID,
                        user:{
                            id:String(authUser.id),
                            full_name:meta.full_name || meta.name || "",
                            username:meta.username || "",
                            avatar_url:meta.avatar_url || meta.picture || ""
                        }
                    });
                }
            } catch (authError) {
                console.log("PUBLISHER AUTH FALLBACK ERROR:", authError.message);
            }

            return res.json({
                success:true,
                uid:ownerUID,
                user:{ id:ownerUID, full_name:wallpaper?.author || "مستخدم", username:"", avatar_url:"" }
            });
        } catch (error) {
            console.log("GET PUBLISHER ERROR:", error);
            res.status(500).json({ success:false, user:null, message:error.message });
        }
    }
);


// ======================================
// Unsplash API Proxy
// Vercel Environment Variable:
// UNSPLASH_ACCESS_KEY
// ======================================

app.get("/api/unsplash", async (req, res) => {
    const accessKey = String(process.env.UNSPLASH_ACCESS_KEY || "").trim();

    if (!accessKey) {
        return res.status(500).json({
            error: "UNSPLASH_ACCESS_KEY is not configured"
        });
    }

    const query = String(req.query.query || "wallpaper")
        .trim()
        .slice(0, 80);

    const page = Math.max(
        1,
        Math.min(Number(req.query.page) || 1, 100)
    );

    const perPage = Math.max(
        1,
        Math.min(Number(req.query.per_page) || 12, 30)
    );

    const orderBy =
        req.query.order_by === "relevant"
            ? "relevant"
            : "latest";

    const params = new URLSearchParams({
        query: query || "wallpaper",
        page: String(page),
        per_page: String(perPage),
        order_by: orderBy,
        orientation: "portrait",
        content_filter: "high"
    });

    try {
        const response = await fetch(
            "https://api.unsplash.com/search/photos?" + params.toString(),
            {
                headers: {
                    "Authorization": "Client-ID " + accessKey,
                    "Accept-Version": "v1",
                    "Accept": "application/json"
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Unsplash API ERROR:", response.status, data);

            return res.status(response.status).json({
                error: "Unsplash request failed",
                details: data?.errors || undefined
            });
        }

        const results = (data.results || []).map(photo => ({
            id: photo.id,
            width: photo.width,
            height: photo.height,
            alt_description: photo.alt_description,
            description: photo.description,
            urls: {
                small: photo.urls?.small,
                regular: photo.urls?.regular,
                full: photo.urls?.full
            },
            links: {
                html: photo.links?.html,
                download_location: photo.links?.download_location
            },
            user: {
                name: photo.user?.name,
                username: photo.user?.username,
                profile_url: photo.user?.links?.html
            }
        }));

        res.set(
            "Cache-Control",
            "s-maxage=300, stale-while-revalidate=600"
        );

        return res.status(200).json({
            total: data.total || 0,
            total_pages: data.total_pages || 0,
            page,
            results
        });

    } catch (error) {
        console.error("Unsplash proxy error:", error);

        return res.status(502).json({
            error: "Unable to reach Unsplash"
        });
    }
});


// ======================================
// Wallpapers API
// ======================================


app.get(
    "/api/wallpapers",
    async (req,res)=>{
        try{
            // الوضع القديم يبقى كما هو لباقي الموقع عندما لا يرسل العميل
            // limit/offset. أما منظم الخلفيات فيستخدم pagination لتجنب
            // تحميل آلاف السجلات دفعة واحدة.
            const hasPagination =
                Object.prototype.hasOwnProperty.call(req.query, "limit") ||
                Object.prototype.hasOwnProperty.call(req.query, "offset");

            if(!hasPagination){
                const wallpapers = await getWallpapersFromSupabase();
                return res.json(wallpapers);
            }

            let limit = Number.parseInt(req.query.limit, 10);
            let offset = Number.parseInt(req.query.offset, 10);

            if(!Number.isFinite(limit)) limit = 24;
            if(!Number.isFinite(offset)) offset = 0;

            // حماية API من طلبات ضخمة أو offsets غير صحيحة.
            limit = Math.min(Math.max(limit, 1), 100);
            offset = Math.max(offset, 0);

            const { data, error } = await supabase
                .from("wallpapers")
                .select("*")
                .order("id", { ascending: true })
                // نطلب عنصرًا إضافيًا لمعرفة هل توجد صفحة أخرى.
                .range(offset, offset + limit);

            if(error) throw error;

            const rows = Array.isArray(data) ? data : [];
            const hasMore = rows.length > limit;
            const pageRows = hasMore ? rows.slice(0, limit) : rows;
            const wallpapers = pageRows.map(wallpaperFromDb);

            res.set("X-Has-More", hasMore ? "1" : "0");
            res.set("X-Next-Offset", String(offset + pageRows.length));
            res.set("X-Page-Size", String(pageRows.length));

            return res.json(wallpapers);
        }catch(error){
            console.log("GET WALLPAPERS ERROR:", error);
            res.status(500).json([]);
        }
    }
);

// ======================================
// Public Categories API
// يرجع عدد الخلفيات الحقيقي لكل قسم من Supabase.
// لا نرسل Service Role Key إلى المتصفح.
// ======================================

const HOME_CATEGORY_KEYS = [
    "nature",
    "anime",
    "cars",
    "space",
    "minimal",
    "games",
    "ai",
    "city",
    "amoled",
    "animals",
    "dark",
    "4k",
    "sports"
];

app.get("/api/categories", async (req, res) => {
    try {
        // نستخدم count=exact مع limit=1 لكل قسم حتى نحصل على العدد
        // الحقيقي بدون تحميل جميع الخلفيات إلى المتصفح.
        const categoryResults = await Promise.all(
            HOME_CATEGORY_KEYS.map(async (category) => {
                const { data, count, error } = await supabase
                    .from("wallpapers")
                    .select("id,thumbnail,image", { count: "exact" })
                    .eq("category", category)
                    .order("id", { ascending: false })
                    .limit(1);

                if (error) throw error;

                const preview = Array.isArray(data) && data[0]
                    ? {
                        id: Number(data[0].id),
                        thumbnail: data[0].thumbnail || "",
                        image: data[0].image || ""
                    }
                    : null;

                return {
                    key: category,
                    count: Number(count || 0),
                    preview
                };
            })
        );

        const allResult = await supabase
            .from("wallpapers")
            .select("id,thumbnail,image", { count: "exact" })
            .order("id", { ascending: false })
            .limit(1);

        if (allResult.error) throw allResult.error;

        const allCategory = {
            key: "all",
            count: Number(allResult.count || 0),
            preview: Array.isArray(allResult.data) && allResult.data[0]
                ? {
                    id: Number(allResult.data[0].id),
                    thumbnail: allResult.data[0].thumbnail || "",
                    image: allResult.data[0].image || ""
                }
                : null
        };

        return res.json({
            success: true,
            categories: [allCategory, ...categoryResults]
        });
    } catch (error) {
        console.log("GET CATEGORIES ERROR:", error);
        return res.status(500).json({
            success: false,
            categories: [],
            message: error.message || "Failed to load categories"
        });
    }
});

// ======================================
// Wallpaper Downloads
// ======================================
// يسجل التحميل للخلفية ويضيفه إلى حساب المستخدم بدون لمس نظام المحفوظات أو الإعجابات.
app.post("/api/wallpapers/:id/download", async (req, res) => {
    try {
        const wallpaperId = Number(req.params.id);
        if(!Number.isFinite(wallpaperId) || wallpaperId <= 0){
            return res.status(400).json({ success:false, message:"Invalid wallpaper ID" });
        }

        const authenticatedUser = await getAuthenticatedUser(req);
        if(!authenticatedUser){
            return res.status(401).json({ success:false, message:"يجب تسجيل الدخول" });
        }

        const userId = String(authenticatedUser.id).trim();
        const wall = await getWallpaperFromSupabase(wallpaperId);
        if(!wall){
            return res.status(404).json({ success:false, message:"Wallpaper not found" });
        }

        const nextDownloads = Number(wall.downloads || 0) + 1;
        const { data: updatedWallpaper, error: wallpaperError } = await supabase
            .from("wallpapers")
            .update({ downloads: nextDownloads })
            .eq("id", wallpaperId)
            .select("id,downloads")
            .single();

        if(wallpaperError) throw wallpaperError;

        const { data: syncRow, error: syncReadError } = await supabase
            .from("user_profile_sync")
            .select("user_id,full_name,username,avatar_url,cover_url,bio,join_date,favorite_ids,download_ids,view_ids")
            .eq("user_id", userId)
            .maybeSingle();

        if(syncReadError) throw syncReadError;

        const downloadIds = [...new Set([
            ...(Array.isArray(syncRow?.download_ids) ? syncRow.download_ids : []),
            String(wallpaperId)
        ])];

        const syncPayload = {
            user_id: userId,
            full_name: syncRow?.full_name || "",
            username: syncRow?.username || "",
            avatar_url: syncRow?.avatar_url || "",
            cover_url: syncRow?.cover_url || "",
            bio: syncRow?.bio || "",
            join_date: syncRow?.join_date || "",
            favorite_ids: Array.isArray(syncRow?.favorite_ids) ? syncRow.favorite_ids : [],
            download_ids: downloadIds,
            view_ids: Array.isArray(syncRow?.view_ids) ? syncRow.view_ids : []
        };

        const { error: syncError } = await supabase
            .from("user_profile_sync")
            .upsert(syncPayload, { onConflict:"user_id" });

        if(syncError) throw syncError;

        return res.json({
            success:true,
            wallpaperId,
            downloads:Number(updatedWallpaper?.downloads ?? nextDownloads)
        });
    }catch(error){
        console.log("DOWNLOAD ERROR:", error);
        return res.status(500).json({ success:false, message:error.message });
    }
});

// ======================================
// Wallpaper Likes (Supabase)
// =====================================// إضافة إعجاب//

app.post(
    "/api/wallpapers/:id/like",
    async(req,res)=>{
        try{
            const wallpaperId = Number(req.params.id);
            const authenticatedUser = await getAuthenticatedUser(req);
            if(!authenticatedUser){
                return res.status(401).json({success:false,message:"يجب تسجيل الدخول"});
            }
            const userId = String(authenticatedUser.id).trim();
            const userProfile = await getPublisherProfile(authenticatedUser);
            const userName = userProfile.fullName || "مستخدم";

            const { data, error } = await supabase
                .from("likes")
                .insert([{ wallpaper_id: wallpaperId, user_id: userId }])
                .select()
                .single();

            if(error){
                if(error.code === "23505"){
                    return res.json({ success:true, liked:true, message:"Already liked" });
                }
                throw error;
            }

            const wall = await getWallpaperFromSupabase(wallpaperId);

            // تحديث عداد إعجابات الخلفية نفسه. جدول likes هو مصدر حقيقة من ضغط إعجاب،
            // بينما wallpapers.likes مجرد عداد عرض متزامن.
            if(wall){
                const nextLikes = Number(wall.likes || 0) + 1;
                const { error: likesCountError } = await supabase
                    .from("wallpapers")
                    .update({ likes: nextLikes })
                    .eq("id", wallpaperId);
                if(likesCountError) throw likesCountError;
            }

            const wallpaperOwnerUID = String(wall?.ownerUID || wall?.userId || "").trim();

            if(userId !== wallpaperOwnerUID && wallpaperOwnerUID){
                await createNotification({
                    recipientUID: wallpaperOwnerUID,
                    fromUser: userId,
                    type: "wallpaper_like",
                    wallpaperId,
                    message: `${userName} أعجب بخلفيتك`
                });
            }

            res.json({ success:true, liked:true, data });
        }catch(error){
            console.log("LIKE SUPABASE ERROR:", error);
            res.status(500).json({ success:false, error:error.message });
        }
    }
);

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
            const publisher = await getAuthenticatedUser(req);

            if(!publisher){
                return res.status(401).json({
                    success:false,
                    message:"يجب تسجيل الدخول قبل نشر الخلفية"
                });
            }

            const publisherProfile = await getPublisherProfile(publisher);
            const metadata = await getImageMetadata(req.body.image);
            const source = await detectImageSource(req.body.image);

            const wallpaper = {
                id: Date.now(),
                title: req.body.title || "Untitled",
                category: String(req.body.category || "other").trim().toLowerCase(),
                image: req.body.image || "",
                thumbnail: req.body.thumbnail || req.body.image || "",
                resolution: req.body.resolution || "",
                size: req.body.size || "",
                downloads: Number(req.body.downloads || 0),
                likes: Number(req.body.likes || 0),
                views: Number(req.body.views || 0),
                rating: Number(req.body.rating || 0),
                ratingCount: Number(req.body.ratingCount || 0),
                ratingSum: Number(req.body.ratingSum || 0),
                author: publisherProfile.fullName,
                // UID صاحب الخلفية يأتي من Supabase Auth وليس من body.
                userId: String(publisher.id).trim(),
                date: req.body.date || new Date().toLocaleString("ar-MA"),
                colors: Array.isArray(req.body.colors) ? req.body.colors : [],
                tags: Array.isArray(req.body.tags) ? req.body.tags : [],
                featured: Boolean(req.body.featured),
                todayWallpaper: Boolean(req.body.todayWallpaper),
                popular: Boolean(req.body.popular),
                type: req.body.type || "image",
                animated: Boolean(req.body.animated || ["video","gif"].includes(String(req.body.type || "").toLowerCase())),
                // These metadata values are calculated for compatibility, but the current
                // wallpapers table has no columns for them.
                location: metadata.location || "غير معروف",
                captureDate: metadata.captureDate || null,
                camera: metadata.camera || null,
                source
            };

            const { data, error } = await supabase
                .from("wallpapers")
                .insert([wallpaperToDb(wallpaper)])
                .select("*")
                .single();

            if(error) throw error;

            res.json({ success:true, wallpaper: wallpaperFromDb(data) });
        }catch(error){
            console.log("ADD WALLPAPER ERROR:", error);
            res.status(500).json({ success:false, message:error.message });
        }
    }
);

// ======================================
// Admin-only Category Update
// تغيير القسم عملية مستقلة ومحميّة.
// لا تغيّر ID أو الصورة أو اللايكات أو التحميلات أو المشاهدات.
// ======================================
app.patch(
    "/api/admin/wallpapers/:id/category",
    async(req,res)=>{
        try{
            const admin = await requireAdmin(req, res);
            if(!admin) return;

            const id = Number(req.params.id);
            const category = String(req.body?.category || "")
                .trim()
                .toLowerCase();

            if(!Number.isFinite(id) || id <= 0){
                return res.status(400).json({ success:false, message:"Invalid wallpaper ID" });
            }

            if(!category){
                return res.status(400).json({ success:false, message:"Category required" });
            }

            const { data, error } = await supabase
                .from("wallpapers")
                .update({ category })
                .eq("id", id)
                .select("*")
                .maybeSingle();

            if(error) throw error;
            if(!data){
                return res.status(404).json({ success:false, message:"Wallpaper not found" });
            }

            return res.json({
                success:true,
                wallpaper:wallpaperFromDb(data)
            });
        }catch(error){
            console.log("ADMIN CATEGORY UPDATE ERROR:", error);
            return res.status(500).json({ success:false, message:error.message });
        }
    }
);

// ======================================
// Update Wallpaper - Safe compatibility route
// مهم: العملاء العاديون لا يستطيعون تغيير category/likes/downloads/views
// عبر هذا المسار حتى لو أرسلوا كائن الخلفية كاملًا.
// الأدمن فقط يمكنه استخدام هذه الحقول.
// ======================================
app.put(
    "/api/wallpapers/:id",
    async(req,res)=>{
        try{
            const id = Number(req.params.id);
            if(!Number.isFinite(id) || id <= 0){
                return res.status(400).json({ success:false, message:"Invalid wallpaper ID" });
            }

            const body = req.body || {};
            const authenticatedUser = await getAuthenticatedUser(req);
            const admin = isAdminUser(authenticatedUser);

            const map = {
                title:"title", thumbnail:"thumbnail", image:"image",
                resolution:"resolution", size:"size",
                rating:"rating", ratingCount:"rating_count", ratingSum:"rating_sum",
                author:"author", date:"date", colors:"colors", tags:"tags", featured:"featured",
                todayWallpaper:"today_wallpaper", popular:"popular", type:"type", animated:"animated"
            };

            // هذه الحقول لا تُقبل من PUT العام للعملاء العاديين.
            // category لها endpoint أدمن مستقل، والإحصائيات لها endpoints مستقلة.
            if(admin){
                map.category = "category";
                map.downloads = "downloads";
                map.likes = "likes";
                map.views = "views";
            }

            const updates = {};
            for(const [input,column] of Object.entries(map)){
                if(Object.prototype.hasOwnProperty.call(body,input)){
                    updates[column] = body[input];
                }
            }

            if(updates.category != null){
                updates.category = String(updates.category).trim().toLowerCase();
            }
            if(updates.colors !== undefined && !Array.isArray(updates.colors)) delete updates.colors;
            if(updates.tags !== undefined && !Array.isArray(updates.tags)) delete updates.tags;

            if(Object.keys(updates).length === 0){
                return res.status(400).json({
                    success:false,
                    message: admin
                        ? "No valid fields"
                        : "No editable fields. Category and statistics use dedicated endpoints."
                });
            }

            const { data, error } = await supabase
                .from("wallpapers")
                .update(updates)
                .eq("id", id)
                .select("*")
                .maybeSingle();

            if(error) throw error;
            if(!data) return res.status(404).json({ success:false });

            res.json({ success:true, wallpaper:wallpaperFromDb(data) });
        }catch(error){
            console.log("UPDATE WALLPAPER ERROR:", error);
            res.status(500).json({ success:false, message:error.message });
        }
    }
);

// ======================================
// Admin-only Wallpaper Delete
// حذف الخلفية محمي للأدمن فقط.
// ======================================
app.delete(
    "/api/wallpapers/:id",
    async (req, res) => {
        try {
            const admin = await requireAdmin(req, res);
            if (!admin) return;

            const id = Number(req.params.id);
            if (!Number.isFinite(id) || id <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid wallpaper ID"
                });
            }

            const { data, error } = await supabase
                .from("wallpapers")
                .delete()
                .eq("id", id)
                .select("id")
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: "Wallpaper not found"
                });
            }

            return res.json({ success: true, id });
        } catch (error) {
            console.log("ADMIN DELETE WALLPAPER ERROR:", error);
            return res.status(500).json({
                success: false,
                message: error.message || "Failed to delete wallpaper"
            });
        }
    }
);

// ======================================
// TOKEN SYSTEM
// ======================================


function createTokenValue(){
    return "wall_live_" + crypto.randomBytes(32).toString("hex");
}

function getPublicSupabaseKey(){
    const explicit = String(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "").trim();
    if(explicit) return explicit;

    const legacy = String(process.env.SUPABASE_KEY || "").trim();
    if(!legacy || legacy.startsWith("sb_secret_")) return "";
    try{
        const parts = legacy.split(".");
        if(parts.length === 3){
            const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
            if(String(payload.role || "").toLowerCase() === "service_role") return "";
            return legacy;
        }
    }catch(_error){}
    return "";
}

function normalizeAllowedOrigin(value){
    const raw = String(value || "").trim();
    if(!raw) return "";
    try{
        const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
        if(!["http:","https:"].includes(url.protocol)) return "";
        return url.origin.toLowerCase();
    }catch(_error){
        return "";
    }
}

function requestOrigin(req){
    const origin = String(req.headers.origin || "").trim();
    if(origin) return normalizeAllowedOrigin(origin);
    const referer = String(req.headers.referer || "").trim();
    if(referer){
        try{ return new URL(referer).origin.toLowerCase(); }catch(_error){}
    }
    return "";
}


// ======================================
// Developer API Tokens - Supabase Auth
// ======================================

function tokenResponse(token, includeSecret = false){
    const result = {
        id: token.id,
        userId: token.user_id,
        appName: token.app_name,
        domain: token.domain,
        limit: token.daily_limit,
        requests: token.requests || 0,
        lastRequestDate: token.last_request_date,
        lastUsed: token.last_used,
        lastIp: token.last_ip,
        active: Boolean(token.active),
        created: token.created_at
    };
    if(includeSecret) result.token = token.token;
    return result;
}

app.post("/api/tokens/create", async (req, res) => {
    try {
        const authenticatedUser = await getAuthenticatedUser(req);
        if(!authenticatedUser) return res.status(401).json({success:false,message:"يجب تسجيل الدخول"});

        const appName = String(req.body?.appName || "My App").trim().slice(0, 100);
        const domainInput = String(req.body?.domain || "").trim();
        const domain = normalizeAllowedOrigin(domainInput);
        if(!appName) return res.status(400).json({success:false,message:"اسم التطبيق مطلوب"});
        if(domainInput && !domain) return res.status(400).json({success:false,message:"النطاق غير صالح"});

        const tokenData = {
            id: Date.now(),
            user_id: String(authenticatedUser.id),
            app_name: appName,
            domain,
            token: createTokenValue(),
            daily_limit: 200,
            requests: 0,
            last_request_date: null,
            last_used: null,
            last_ip: null,
            active: true,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase.from("api_tokens").insert([tokenData]).select("*").single();
        if(error) throw error;

        return res.json({success:true,token:tokenResponse(data,true),warning:"احفظ هذا المفتاح الآن. لن يتم عرضه كاملًا مرة أخرى."});
    } catch(error) {
        console.log("CREATE TOKEN ERROR:", error);
        return res.status(500).json({success:false,message:error.message || "Failed to create token"});
    }
});

app.get("/api/tokens/:userId", async (req, res) => {
    try {
        const authenticatedUser = await getAuthenticatedUser(req);
        if(!authenticatedUser) return res.status(401).json({success:false,message:"يجب تسجيل الدخول"});

        const { data, error } = await supabase
            .from("api_tokens")
            .select("id,user_id,app_name,domain,daily_limit,requests,last_request_date,last_used,last_ip,active,created_at")
            .eq("user_id", String(authenticatedUser.id))
            .order("created_at", {ascending:false});
        if(error) throw error;
        return res.json((data || []).map(token => tokenResponse(token,false)));
    } catch(error) {
        console.log("GET TOKEN ERROR:", error);
        return res.status(500).json([]);
    }
});

app.delete("/api/tokens/:id", async (req, res) => {
    try {
        const authenticatedUser = await getAuthenticatedUser(req);
        if(!authenticatedUser) return res.status(401).json({success:false,message:"يجب تسجيل الدخول"});

        const id = Number(req.params.id);
        if(!Number.isFinite(id) || id <= 0) return res.status(400).json({success:false,message:"Invalid Token ID"});

        const { data, error } = await supabase
            .from("api_tokens")
            .delete()
            .eq("id", id)
            .eq("user_id", String(authenticatedUser.id))
            .select("id")
            .maybeSingle();
        if(error) throw error;
        if(!data) return res.status(404).json({success:false,message:"Token not found"});
        return res.json({success:true,id});
    } catch(error) {
        console.log("DELETE TOKEN ERROR:", error);
        return res.status(500).json({success:false,message:error.message || "Failed to delete token"});
    }
});

// ======================================
// API Token Middleware - Supabase
// ======================================

async function verifyApiToken(
    req,
    res,
    next
){

    try {

        const token =
            req.headers["x-api-key"];


        // ======================================
        // منع Token داخل الرابط
        // ======================================

        if(req.query.token){

            return res.status(400).json({

                success:
                    false,

                message:
                    "Use X-API-Key header only"

            });

        }


        // ======================================
        // Token غير موجود
        // ======================================

        if(!token){

            return res.status(401).json({

                success:
                    false,

                message:
                    "API Token required"

            });

        }


        // ======================================
        // البحث في Supabase
        // ======================================

        const {
            data: apiToken,
            error
        } =
            await supabase
                .from("api_tokens")
                .select("*")
                .eq(
                    "token",
                    token
                )
                .maybeSingle();


        if(error){

            throw error;

        }


        // ======================================
        // Token غير صحيح
        // ======================================

        if(
            !apiToken ||
            !apiToken.active
        ){

            return res.status(401).json({

                success:
                    false,

                message:
                    "Invalid Token"

            });

        }


        // ======================================
        // Domain restriction
        // ======================================
        const allowedOrigin = normalizeAllowedOrigin(apiToken.domain || "");
        if(allowedOrigin){
            const incomingOrigin = requestOrigin(req);
            if(!incomingOrigin || incomingOrigin !== allowedOrigin){
                return res.status(403).json({success:false,message:"Token is not allowed from this domain"});
            }
        }

        // ======================================
        // معرفة IP
        // ======================================

        const forwarded =
            req.headers["x-forwarded-for"];


        const clientIp =

            (
                typeof forwarded === "string"

                ?

                forwarded
                    .split(",")[0]
                    .trim()

                :

                forwarded

            )

            ||

            req.socket.remoteAddress

            ||

            "unknown";


        // ======================================
        // لا نقفل API Key على IP واحد.
        // يمكن لنفس التطبيق استخدام المفتاح من عدة مستخدمين/خوادم.
        // يبقى last_ip متاحًا للإحصائيات فقط.
        // ======================================


        // ======================================
        // تاريخ اليوم
        // ======================================

        const today =
            new Date()
                .toISOString()
                .split("T")[0];


        // ======================================
        // إعادة العداد يومياً
        // ======================================

        if(
            apiToken.last_request_date !==
            today
        ){

            apiToken.requests =
                0;

            apiToken.last_request_date =
                today;

        }


        // ======================================
        // فحص الحد اليومي
        // ======================================

        if(
            apiToken.requests >=
            apiToken.daily_limit
        ){

            return res.status(429).json({

                success:
                    false,

                message:
                    "Daily limit reached"

            });

        }


        // ======================================
        // تسجيل الطلب
        // ======================================

        apiToken.requests++;

        apiToken.last_used =
            new Date()
                .toISOString();


        // ======================================
        // حفظ الإحصائيات في Supabase
        // ======================================

        const {
            error: updateError
        } =
            await supabase
                .from("api_tokens")
                .update({

                    requests:
                        apiToken.requests,

                    last_request_date:
                        apiToken.last_request_date,

                    last_used:
                        apiToken.last_used,

                    last_ip:
                        apiToken.last_ip

                })
                .eq(
                    "id",
                    apiToken.id
                );


        if(updateError){

            throw updateError;

        }


        // ======================================
        // تمرير بيانات Token إلى API
        // ======================================

        req.apiToken =
            apiToken;


        next();


    } catch(error){

        console.log(
            "TOKEN VERIFY ERROR:",
            error
        );


        res.status(500).json({

            success:
                false,

            message:
                error.message ||
                "Token verification failed"

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
            const id = Number(req.params.id);
            const wall = await getWallpaperFromSupabase(id);

            if(!wall) return res.status(404).json({ success:false });

            const image = await fetch(wall.image);
            if(!image.ok) return res.status(400).json({ success:false });

            const buffer = await image.arrayBuffer();
            const base64 = Buffer.from(buffer).toString("base64");

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method:"POST",
                    headers:{ "Content-Type":"application/json" },
                    body:JSON.stringify({
                        contents:[{
                            parts:[
                                { text:`حلل هذه الخلفية.\n\nاكتب وصف احترافي بين 100 و200 حرف.\n\nاذكر:\nالألوان،\nالعناصر،\nالأسلوب.` },
                                { inlineData:{ mimeType:"image/jpeg", data:base64 } }
                            ]
                        }]
                    })
                }
            );

            const data = await response.json();
            const description = data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if(!description){
                return res.status(500).json({ success:false, message:"No AI response" });
            }

            // wallpapers has no aiDescription column, so we return the analysis
            // without writing an unsupported column to Supabase.
            res.json({ success:true, description });
        }catch(error){
            console.log("ANALYZE ERROR:", error);
            res.status(500).json({ success:false });
        }
    }
);

// ======================================
// Developer Protected Wall API
// ======================================

app.get(
"/api/v1/wallpapers",
verifyApiToken,
async (req,res)=>{


try{


const wallpapers = await getWallpapersFromSupabase();

    res.json({
        success:true,
        developer:req.apiToken.appName,
        count:wallpapers.length,
        data:wallpapers
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
// Wallhaven Import
// يجلب 10 خلفيات جديدة من Wallhaven ويحفظها في Supabase.
// بعد الحفظ تصبح الخلفيات عادية داخل WallpaperHub:
// wallpaper.html?id=<local-id>
// ======================================

app.post(
    "/api/wallhaven/import",
    async(req,res)=>{
        try{
            const response = await fetch(
                "https://wallhaven.cc/api/v1/search?sorting=toplist&purity=100&categories=111&per_page=24"
            );

            const data = await response.json();

            if(!response.ok){
                return res.status(response.status).json({
                    success:false,
                    message:"Wallhaven API request failed",
                    details:data
                });
            }

            const items = Array.isArray(data.data) ? data.data : [];

            const { data: existing, error: existingError } = await supabase
                .from("wallpapers")
                .select("image");

            if(existingError) throw existingError;

            const existingImages = new Set(
                (existing || [])
                    .map(row => String(row.image || "").trim())
                    .filter(Boolean)
            );

            const freshItems = items
                .filter(item => {
                    const image = String(item?.path || "").trim();
                    return image && !existingImages.has(image);
                })
                .slice(0, 10);

            const importBase = Date.now() * 100;

            const rows = freshItems.map((item, index) => ({
                id: importBase + index,

                title: "Wallhaven",
                image: String(item.path),
                thumbnail:
                    item?.thumbs?.large ||
                    item?.thumbs?.original ||
                    String(item.path),

                category: "wallhaven",
                source: "wallhaven",

                resolution:
                    item?.dimension ||
                    item?.resolution ||
                    "",

                size: "",
                downloads: 0,
                likes: 0,
                views: 0,
                rating: 0,
                rating_count: 0,
                rating_sum: 0,

                author: "Wallhaven",
                date: new Date().toLocaleString("ar-MA"),

                colors: [],
                tags: Array.isArray(item?.tags)
                    ? item.tags.map(tag => tag?.name).filter(Boolean)
                    : [],

                featured: false,
                today_wallpaper: false,
                popular: false,

                type: "image",
                animated: false,
                user_id: null
            }));

            if(rows.length){
                const { error } = await supabase
                    .from("wallpapers")
                    .insert(rows);

                if(error) throw error;
            }

            return res.json({
                success:true,
                count:rows.length,
                requested:10,
                wallpapers:rows.map(wallpaperFromDb)
            });

        }catch(error){
            console.log("WALLHAVEN IMPORT ERROR:", error);

            return res.status(500).json({
                success:false,
                message:error.message || "Failed to import Wallhaven wallpapers"
            });
        }
    }
);


// ==========================================
// Artguru Enhance — real Open API integration
// ==========================================
app.post("/api/artguru/enhance", async (req, res) => {
    let source = null;

    try{
        if(!ARTGURU_API_KEY){
            return res.status(503).json({
                success:false,
                code:"ARTGURU_NOT_CONFIGURED",
                message:"خدمة تحسين الصور غير مهيأة بعد على الخادم."
            });
        }

        const image = String(req.body?.image || "").trim();
        if(!image){
            return res.status(400).json({ success:false, message:"Image required" });
        }

        source = await uploadArtguruSource(image);
        const task = await createArtguruEnhanceTask(source.signedUrl);
        const result = await waitForArtguruTask(task.taskId);

        return res.json({
            success:true,
            provider:"artguru",
            data:{
                image:result.image,
                imageUrl:result.image,
                taskId:task.taskId,
                status:result.status,
                mode:"photo-enhance",
                message:"تم تحسين الصورة بنجاح",
                enhancedAt:new Date().toISOString()
            }
        });
    }catch(error){
        console.log("ARTGURU ERROR:", error?.message || error);
        const status = Number(error?.status) === 401 ? 502 : (Number(error?.status) === 429 ? 429 : 500);
        return res.status(status).json({
            success:false,
            code:Number(error?.status) === 429 ? "ARTGURU_RATE_LIMIT" : "ARTGURU_ERROR",
            message:error?.message || "حدث خطأ أثناء تحسين الصورة."
        });
    }finally{
        await deleteArtguruSource(source?.objectPath);
    }
});

// ==========================================
// Artguru Status
// Never expose the API key to the browser.
// ==========================================
app.get("/api/artguru/status", async (req, res) => {
    const configured = Boolean(ARTGURU_API_KEY);

    if(!configured){
        return res.json({
            success:true,
            provider:"artguru",
            configured:false,
            status:"not_configured",
            serverTime:new Date().toISOString()
        });
    }

    try{
        // A lightweight authenticated request validates the key without starting a paid task.
        const response = await fetch(`${ARTGURU_API_BASE}/api/v1/tasks/ENHANCE/__status_check__`, {
            method:"GET",
            headers:{"x-api-key":ARTGURU_API_KEY,"Accept":"application/json"}
        });

        // 404 is expected for a fake task id and still proves the endpoint/key path is reachable.
        if(response.status === 401){
            return res.status(502).json({success:false,provider:"artguru",configured:true,status:"invalid_key"});
        }

        return res.json({
            success:true,
            provider:"artguru",
            configured:true,
            status:"ready",
            serverTime:new Date().toISOString()
        });
    }catch(error){
        return res.json({
            success:true,
            provider:"artguru",
            configured:true,
            status:"unreachable",
            serverTime:new Date().toISOString()
        });
    }
});

// Backward-compatible status endpoint for older artguru.js versions.
app.get("/api/status", async (req, res) => {
    const configured = Boolean(ARTGURU_API_KEY);
    return res.json({
        success:true,
        artguruKey:configured,
        provider:"artguru",
        status:configured ? "ready" : "not_configured"
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



const comments = data || [];

// جلب Mentions المرتبطة بهذه التعليقات، مع التركيز على الإشارة
// إلى صاحب الخلفية فقط. هذا يجعل mentionedUserId متاحاً عند إعادة تحميل التعليقات.
let mentionMap = new Map();
const commentIds = comments.map(c => Number(c.id)).filter(Number.isFinite);

if(commentIds.length){
    const { data: mentionRows, error: mentionError } = await supabase
        .from("mentions")
        .select("comment_id, wallpaper_id, mentioned_user_id, mentioned_name")
        .in("comment_id", commentIds)
        .eq("wallpaper_id", wallpaperId);

    if(mentionError){
        console.log("GET COMMENT MENTIONS ERROR:", mentionError.message);
    }else{
        (mentionRows || []).forEach(m => {
            mentionMap.set(Number(m.comment_id), m);
        });
    }
}

res.json(comments.map(comment => {
    const result = commentFromDb(comment);
    const mention = mentionMap.get(Number(comment.id));

    if(mention){
        result.mentionedUserId = String(mention.mentioned_user_id || "").trim();
        result.mentionedName = mention.mentioned_name || "";
    }else{
        result.mentionedUserId = "";
        result.mentionedName = "";
    }

    return result;
}));



}catch(error){


console.log(
"GET COMMENTS ERROR:",
error
);



res.status(500).json([]);


}


});





// ======================================
// إضافة تعليق على خلفية
// ======================================

app.post(
    "/api/wallpapers/:id/comments",
    async (req, res) => {

        try {

            const wallpaperId =
                Number(req.params.id);

            const text =
                String(req.body.text || "")
                    .trim();

            if (!text) {

                return res.status(400).json({
                    success: false,
                    message: "Empty comment"
                });

            }

            // ======================================
            // هوية صاحب التعليق الحقيقية
            // لا نثق في UID/الاسم المرسل من المتصفح.
            // ======================================

            const authenticatedUser = await getAuthenticatedUser(req);
            if(!authenticatedUser){
                return res.status(401).json({
                    success:false,
                    message:"يجب تسجيل الدخول قبل التعليق"
                });
            }

            const commenterUID = String(authenticatedUser.id).trim();
            const commenterProfile = await getPublisherProfile(authenticatedUser);
            const commenterName = commenterProfile.fullName || "مستخدم";
            const commenterEmail = String(authenticatedUser.email || "").trim();
            const commenterAvatar = commenterProfile.avatar || "";

            let mentionedUserId =
                req.body.mentionedUserId || "";

            const mentionedName =
                req.body.mentionedName || "";

            // ======================================
            // معرفة صاحب الخلفية
            // ======================================

            const wallpaper =
                await getWallpaperFromSupabase(wallpaperId);

            let wallpaperOwnerUID =
                String(
                    wallpaper?.ownerUID ||
                    wallpaper?.userId ||
                    ""
                ).trim();

            // ======================================
            // توافق مع الخلفيات القديمة
            // إذا لم يكن user_id محفوظاً، وكانت هذه الخلفية
            // منشورة من نفس الحساب الذي يرسل التعليق، نستخدم UID
            // صاحب التعليق كمالك احتياطي.
            // ======================================
            if(
                !wallpaperOwnerUID &&
                commenterUID &&
                wallpaper?.author &&
                commenterName &&
                String(wallpaper.author).trim() === String(commenterName).trim()
            ){
                wallpaperOwnerUID = String(commenterUID).trim();
            }

            // ======================================
            // لا نحول أي @ عادي إلى Mention تلقائياً.
            // الإشارة الحقيقية يجب أن تأتي من نتيجة زر @
            // وتصل مع UID محدد.
            // ======================================

            mentionedUserId = String(mentionedUserId || "").trim();

            // لا نسمح بالإشارة إلا إلى صاحب الخلفية الحقيقي.
            if(
                mentionedUserId &&
                mentionedUserId !== wallpaperOwnerUID
            ){
                mentionedUserId = "";
            }

            // ======================================
            // إنشاء التعليق
            // ======================================

            const newComment = {
                wallpaperId: String(wallpaperId),
                user: commenterName,
                email: commenterEmail,
                avatar: commenterAvatar,
                userId: commenterUID,
                text,
                likes: 0,
                likedBy: [],
                date: new Date().toLocaleDateString("ar-MA"),
                time: new Date().toLocaleTimeString("ar-MA", {
                    hour: "2-digit",
                    minute: "2-digit"
                })
            };

            // ======================================
            // حفظ التعليق في Supabase
            // ======================================

            const { data, error } =
                await supabase
                    .from("comments")
                    .insert([newComment])
                    .select()
                    .single();

            if (error) {
                throw error;
            }

            const isValidMention =
                mentionedUserId &&
                mentionedUserId === wallpaperOwnerUID;

            // ======================================
            // إذا توجد إشارة صحيحة
            // ======================================

            if (
                isValidMention &&
                commenterUID &&
                wallpaperOwnerUID
            ) {

                // ======================================
                // حفظ الإشارة في جدول mentions
                // ======================================

                const { data: mentionData, error: mentionError } =
                    await supabase
                        .from("mentions")
                        .insert([{

                            comment_id:
                                data.id,

                            wallpaper_id:
                                wallpaperId,

                            mentioned_user_id:
                                wallpaperOwnerUID,

                            mentioned_name:
                                mentionedName ||
                                wallpaper?.author ||
                                "صاحب الخلفية",

                            mentioned_by:
                                commenterUID,

                            mentioned_by_name:
                                commenterName

                        }])
                        .select()
                        .single();


                if (mentionError) {

                    console.log(
                        "SAVE MENTION ERROR:",
                        mentionError
                    );

                }


                // ======================================
                // إنشاء إشعار الإشارة
                // صاحب الخلفية يمكنه حفظ الإشارة لنفسه،
                // لكن لا نرسل إشعاراً لنفس الحساب.
                // ======================================
                if(commenterUID !== wallpaperOwnerUID){
                    await createNotification({
                        recipientUID: wallpaperOwnerUID,
                        fromUser: commenterUID,
                        type: "wallpaper_mention",
                        wallpaperId,
                        commentId: data.id,
                        message: `${commenterName} أشار إليك في تعليق`
                    });
                }

            }

            // ======================================
            // تعليق عادي بدون إشارة
            // ======================================

            else if (
                commenterUID &&
                wallpaperOwnerUID &&
                commenterUID !== wallpaperOwnerUID
            ) {

                await createNotification({
                        recipientUID: wallpaperOwnerUID,
                        fromUser: commenterUID,
                        type: "wallpaper_comment",
                        wallpaperId,
                        commentId: data.id,
                        message: `${commenterName} علق على خلفيتك`
                    });

            }

            return res.json({
                success: true,
                comment: commentFromDb(data)
            });

        } catch (error) {

            console.log(
                "POST COMMENT ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });

        }

    }
);


// =========================
// Like Comment API
// =========================

app.post(
    "/api/comments/:id/like",
    async(req,res)=>{
        try{
            const commentId = Number(req.params.id);
            const authenticatedUser = await getAuthenticatedUser(req);
            if(!authenticatedUser){
                return res.status(401).json({success:false,message:"يجب تسجيل الدخول"});
            }
            const userId = String(authenticatedUser.id).trim();
            const userProfile = await getPublisherProfile(authenticatedUser);

            const { data: comment, error } = await supabase
                .from("comments")
                .select("*")
                .eq("id", commentId)
                .maybeSingle();

            if(error) throw error;
            if(!comment) return res.status(404).json({ success:false, message:"Comment not found" });

            let likedBy = Array.isArray(comment.likedBy) ? [...comment.likedBy] : [];
            let isNewLike = false;

            if(likedBy.includes(userId)){
                likedBy = likedBy.filter(id => id !== userId);
            }else{
                likedBy.push(userId);
                isNewLike = true;
            }

            const newLikes = likedBy.length;
            const { data: updated, error:updateError } = await supabase
                .from("comments")
                .update({ likes:newLikes, likedBy:likedBy })
                .eq("id", commentId)
                .select("*")
                .single();

            if(updateError) throw updateError;

            if(isNewLike && comment.userId && comment.userId !== userId){
                await createNotification({
                    recipientUID: comment.userId,
                    fromUser: userId,
                    type: "comment_like",
                    wallpaperId: comment.wallpaperId || null,
                    commentId: comment.id,
                    message: `${userProfile.fullName || "مستخدم"} أعجب بتعليقك`
                });
            }

            res.json({ success:true, likes:newLikes, comment:commentFromDb(updated) });
        }catch(error){
            console.log("LIKE COMMENT ERROR:", error);
            res.status(500).json({ success:false, message:error.message });
        }
    }
);

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
    async(req,res)=>{
        try{
            const id = Number(req.params.id);
            const updates = {};
            if(req.body.title !== undefined) updates.title = req.body.title;
            if(req.body.content !== undefined) updates.content = req.body.content;
            if(req.body.image !== undefined) updates.image = req.body.image;
            if(req.body.category !== undefined) updates.type = req.body.category;

            if(Object.keys(updates).length === 0){
                return res.status(400).json({ success:false, message:"No valid fields" });
            }

            const { data, error } = await supabase
                .from("announcements")
                .update(updates)
                .eq("id", id)
                .select("*")
                .maybeSingle();

            if(error) throw error;
            if(!data) return res.status(404).json({ success:false, message:"Announcement not found" });

            res.json({ success:true, notification:data, announcement:data });
        }catch(error){
            console.log("UPDATE ANNOUNCEMENT ERROR:", error);
            res.status(500).json({ success:false, message:error.message });
        }
    }
);

// ======================================
// حفظ ألوان الخلفية
// ======================================

app.patch(
    "/api/wallpapers/:id/colors",
    async (req, res) => {
        try {
            const wallpaperId = Number(req.params.id);
            const colors = Array.isArray(req.body.colors)
                ? req.body.colors
                    .filter(color => typeof color === "string")
                    .slice(0, 12)
                : [];

            if (!wallpaperId || colors.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid wallpaper or colors"
                });
            }

            const { data, error } = await supabase
                .from("wallpapers")
                .update({ colors })
                .eq("id", wallpaperId)
                .select("*")
                .single();

            if (error) throw error;

            // لا يوجد wallpapersCache في نسخة Supabase الحالية،
            // لذلك لا نحاول تحديث كاش غير موجود. قاعدة Supabase هي المصدر الوحيد.

            res.json({
                success: true,
                colors: data.colors || colors
            });

        } catch (error) {
            console.log("SAVE WALLPAPER COLORS ERROR:", error);

            res.status(500).json({
                success: false,
                message: "Failed to save colors"
            });
        }
    }
);


// ======================================
// Community API
// الرسائل العامة - هوية المستخدم تؤخذ من Supabase Auth
// ======================================

// ======================================
// Community chat media
// صور المجتمع تُضغط في المتصفح ثم تُرفع هنا.
// ======================================
const COMMUNITY_MEDIA_BUCKET = "community-media";
const COMMUNITY_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

function parseCommunityImage(value){
    const raw = String(value || "");
    const match = raw.match(/^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,(.+)$/i);
    if(!match) return null;

    const mimeType = match[1].toLowerCase().replace("image/jpg","image/jpeg");
    const buffer = Buffer.from(match[2], "base64");

    if(!buffer.length) return null;
    if(buffer.length > COMMUNITY_IMAGE_MAX_BYTES){
        throw new Error("حجم الصورة كبير جدًا. الحد الأقصى 8MB.");
    }

    return {mimeType,buffer};
}

async function ensureCommunityMediaBucket(){
    const {data:buckets,error:listError} = await supabase.storage.listBuckets();
    if(listError) throw listError;

    if((buckets || []).some(bucket => bucket.name === COMMUNITY_MEDIA_BUCKET)){
        return;
    }

    const {error:createError} = await supabase.storage.createBucket(
        COMMUNITY_MEDIA_BUCKET,
        {
            public:true,
            fileSizeLimit:`${COMMUNITY_IMAGE_MAX_BYTES}B`,
            allowedMimeTypes:[
                "image/jpeg",
                "image/png",
                "image/webp",
                "image/gif"
            ]
        }
    );

    if(createError && !/already exists|duplicate/i.test(String(createError.message || ""))){
        throw createError;
    }
}

async function uploadCommunityImage(imageData,userId,messageId){
    const parsed = parseCommunityImage(imageData);
    if(!parsed) throw new Error("صيغة الصورة غير مدعومة.");

    await ensureCommunityMediaBucket();

    const ext =
        parsed.mimeType === "image/jpeg" ? "jpg" :
        parsed.mimeType === "image/png" ? "png" :
        parsed.mimeType === "image/gif" ? "gif" : "webp";

    const objectPath =
        `messages/${String(userId)}/${String(messageId)}.${ext}`;

    const {error:uploadError} = await supabase.storage
        .from(COMMUNITY_MEDIA_BUCKET)
        .upload(objectPath,parsed.buffer,{
            contentType:parsed.mimeType,
            cacheControl:"31536000",
            upsert:false
        });

    if(uploadError) throw uploadError;

    const {data} = supabase.storage
        .from(COMMUNITY_MEDIA_BUCKET)
        .getPublicUrl(objectPath);

    if(!data?.publicUrl){
        await supabase.storage.from(COMMUNITY_MEDIA_BUCKET).remove([objectPath]).catch(()=>{});
        throw new Error("تعذر إنشاء رابط الصورة.");
    }

    return {
        imageUrl:String(data.publicUrl),
        imagePath:objectPath
    };
}

async function deleteCommunityImage(imagePath){
    if(!imagePath) return;
    try{
        await supabase.storage
            .from(COMMUNITY_MEDIA_BUCKET)
            .remove([String(imagePath)]);
    }catch(error){
        console.log("COMMUNITY IMAGE CLEANUP ERROR:",error?.message || error);
    }
}

// ======================================
// Community API
// ======================================

function communityMessageResponse(row, profile) {
    return {
        id: String(row.id),
        userId: String(row.user_id),
        text: String(row.content || ""),
        imageUrl: String(row.image_url || ""),
        imagePath: String(row.image_path || ""),
        fileUrl: String(row.file_url || ""),
        filePath: String(row.file_path || ""),
        fileName: String(row.file_name || ""),
        fileType: String(row.file_type || ""),
        fileSize: Number(row.file_size || 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at || null,
        deleted: Boolean(row.deleted_at),
        user: {
            id: String(row.user_id),
            name: String(
                profile?.full_name ||
                profile?.username ||
                "عضو"
            ),
            username: String(profile?.username || ""),
            avatarUrl: String(profile?.avatar_url || "")
        }
    };
}


// ======================================
// Community generic file attachments
// ======================================
const COMMUNITY_FILES_BUCKET = "community-files";
const COMMUNITY_FILE_MAX_BYTES = 10 * 1024 * 1024;

function parseCommunityFile(value){
    const raw = String(value || "");
    const match = raw.match(/^data:([^;,]+);base64,(.+)$/i);
    if(!match) return null;

    const mimeType = String(match[1] || "application/octet-stream").toLowerCase().slice(0,160);
    const buffer = Buffer.from(match[2], "base64");
    if(!buffer.length) return null;
    if(buffer.length > COMMUNITY_FILE_MAX_BYTES){
        throw new Error("حجم الملف كبير جدًا. الحد الأقصى 10MB.");
    }
    return {mimeType,buffer};
}

async function ensureCommunityFilesBucket(){
    const {data:buckets,error:listError} = await supabase.storage.listBuckets();
    if(listError) throw listError;
    if((buckets || []).some(bucket => bucket.name === COMMUNITY_FILES_BUCKET)) return;

    const {error:createError} = await supabase.storage.createBucket(
        COMMUNITY_FILES_BUCKET,
        {public:true,fileSizeLimit:`${COMMUNITY_FILE_MAX_BYTES}B`}
    );
    if(createError && !/already exists|duplicate/i.test(String(createError.message || ""))){
        throw createError;
    }
}

function safeFileExtension(name,mime){
    const clean=String(name||"").toLowerCase();
    const match=clean.match(/\.([a-z0-9]{1,10})$/i);
    if(match) return match[1];
    const map={
        "application/pdf":"pdf","text/plain":"txt","application/zip":"zip",
        "application/json":"json","application/msword":"doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document":"docx",
        "application/vnd.ms-excel":"xls",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"xlsx",
        "application/vnd.ms-powerpoint":"ppt",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation":"pptx"
    };
    return map[String(mime||"").toLowerCase()] || "bin";
}

async function uploadCommunityFile(fileData,userId,messageId){
    const parsed=parseCommunityFile(fileData?.dataUrl || fileData);
    if(!parsed) throw new Error("صيغة الملف غير مدعومة.");

    const originalName=String(fileData?.name || "ملف").trim().slice(0,180) || "ملف";
    const blocked=/\.(exe|apk|bat|cmd|com|msi|scr|sh|ps1|dll)$/i.test(originalName);
    if(blocked) throw new Error("هذا النوع من الملفات غير مسموح به لأسباب أمنية.");

    await ensureCommunityFilesBucket();
    const ext=safeFileExtension(originalName,parsed.mimeType);
    const objectPath=`files/${String(userId)}/${String(messageId)}.${ext}`;

    const {error:uploadError}=await supabase.storage
        .from(COMMUNITY_FILES_BUCKET)
        .upload(objectPath,parsed.buffer,{
            contentType:parsed.mimeType,
            cacheControl:"31536000",
            upsert:false
        });
    if(uploadError) throw uploadError;

    const {data}=supabase.storage.from(COMMUNITY_FILES_BUCKET).getPublicUrl(objectPath);
    if(!data?.publicUrl){
        await supabase.storage.from(COMMUNITY_FILES_BUCKET).remove([objectPath]).catch(()=>{});
        throw new Error("تعذر إنشاء رابط الملف.");
    }
    return {fileUrl:String(data.publicUrl),filePath:objectPath,fileName:originalName,fileType:parsed.mimeType,fileSize:parsed.buffer.length};
}

async function deleteCommunityFile(filePath){
    if(!filePath) return;
    try{ await supabase.storage.from(COMMUNITY_FILES_BUCKET).remove([filePath]); }
    catch(error){ console.log("COMMUNITY FILE CLEANUP ERROR:",error?.message || error); }
}

async function getCommunityProfiles(userIds) {
    const ids = [...new Set(
        (userIds || [])
            .map(v => String(v).trim())
            .filter(Boolean)
    )];

    if (!ids.length) return new Map();

    const profiles = new Map();

    // First use the normal public profile table.
    try {
        const { data, error } = await supabase
            .from("profiles")
            .select("id,full_name,username,avatar_url")
            .in("id", ids);

        if (!error) {
            (data || []).forEach(profile => {
                profiles.set(String(profile.id), profile);
            });
        } else {
            console.log(
                "COMMUNITY PROFILES TABLE ERROR:",
                error?.message || error
            );
        }
    } catch (error) {
        console.log(
            "COMMUNITY PROFILES TABLE ERROR:",
            error?.message || error
        );
    }

    // Important: some accounts may not have a row in profiles yet.
    // In that case use Supabase Auth metadata so other users still see
    // the real name and avatar instead of the generic "عضو".
    const missingIds = ids.filter(id => !profiles.has(id));

    if (missingIds.length) {
        const fallbackResults = await Promise.all(
            missingIds.map(async id => {
                try {
                    const { data, error } =
                        await supabase.auth.admin.getUserById(id);

                    if (error || !data?.user) return null;

                    const user = data.user;
                    const fallback = communityFallbackProfile(user);

                    return [
                        id,
                        {
                            id,
                            full_name: fallback.full_name,
                            username: fallback.username,
                            avatar_url: fallback.avatar_url
                        }
                    ];
                } catch (error) {
                    console.log(
                        "COMMUNITY AUTH PROFILE FALLBACK ERROR:",
                        error?.message || error
                    );
                    return null;
                }
            })
        );

        fallbackResults.forEach(result => {
            if (result) profiles.set(result[0], result[1]);
        });
    }

    return profiles;
}

async function getCommunityProfileSafe(userId) {
    try {
        const profiles = await getCommunityProfiles([userId]);
        return profiles.get(String(userId)) || null;
    } catch (error) {
        console.log(
            "COMMUNITY PROFILE ERROR:",
            error?.message || error
        );
        return null;
    }
}

function communityFallbackProfile(user) {
    const metadata = user?.user_metadata || {};

    return {
        full_name:
            metadata.full_name ||
            metadata.name ||
            metadata.user_name ||
            user?.email?.split("@")[0] ||
            "عضو",
        username:
            metadata.username ||
            metadata.user_name ||
            "",
        avatar_url:
            metadata.avatar_url ||
            metadata.picture ||
            ""
    };
}


// ======================================
// Private one-to-one Community Chat API
// ======================================

function privateUserResponse(profile, fallbackId){
    return {
        id: String(profile?.id || fallbackId || ""),
        name: String(profile?.full_name || profile?.username || "عضو"),
        username: String(profile?.username || ""),
        avatarUrl: String(profile?.avatar_url || "")
    };
}

async function getPrivateProfiles(userIds){
    // Use the same robust profile resolver as the public community chat.
    return getCommunityProfiles(userIds);
}

function privateFallbackUser(user){
    const metadata = user?.user_metadata || {};
    return {
        id: String(user?.id || ""),
        name: String(
            metadata.full_name || metadata.name || metadata.user_name ||
            user?.email?.split("@")[0] || "عضو"
        ),
        username: String(metadata.username || metadata.user_name || ""),
        avatarUrl: String(metadata.avatar_url || metadata.picture || "")
    };
}

async function getPrivateConversation(conversationId){
    const { data, error } = await supabase
        .from("private_conversations")
        .select("id,user_one_id,user_two_id,created_at,updated_at")
        .eq("id", conversationId)
        .maybeSingle();

    if(error) throw error;
    return data || null;
}

async function requirePrivateConversationMember(conversationId, userId){
    const data = await getPrivateConversation(conversationId);
    if(!data) return null;

    const uid = String(userId);
    if(
        String(data.user_one_id) !== uid &&
        String(data.user_two_id) !== uid
    ) return false;

    return data;
}

function privateMessageResponse(row, sender){
    return {
        id: String(row.id),
        conversationId: String(row.conversation_id),
        senderId: String(row.sender_id),
        text: String(row.content || ""),
        imageUrl: String(row.image_url || ""),
        imagePath: String(row.image_path || ""),
        fileUrl: String(row.file_url || ""),
        filePath: String(row.file_path || ""),
        fileName: String(row.file_name || ""),
        fileType: String(row.file_type || ""),
        fileSize: Number(row.file_size || 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at || null,
        deleted: Boolean(row.deleted_at),
        sender: sender || {
            id: String(row.sender_id),
            name: "عضو",
            username: "",
            avatarUrl: ""
        }
    };
}

app.get("/api/community/private/conversations", async (req,res) => {
    try{
        const user = await getAuthenticatedUser(req);
        if(!user) return res.status(401).json({success:false,message:"يجب تسجيل الدخول"});

        const limit = Math.min(
            Math.max(Number.parseInt(req.query.limit,10) || 50,1),100
        );
        const uid = String(user.id);

        const { data, error } = await supabase
            .from("private_conversations")
            .select("id,user_one_id,user_two_id,created_at,updated_at")
            .or(`user_one_id.eq.${uid},user_two_id.eq.${uid}`)
            .order("updated_at",{ascending:false})
            .limit(limit);

        if(error) throw error;

        const rows = data || [];
        const otherIds = rows.map(row =>
            String(row.user_one_id) === uid ? row.user_two_id : row.user_one_id
        );

        let profiles = new Map();
        try{
            profiles = await getPrivateProfiles(otherIds);
        }catch(profileError){
            console.log("PRIVATE CONVERSATION PROFILE ERROR:",profileError?.message || profileError);
        }

        const conversations = [];
        for(const row of rows){
            const otherId =
                String(row.user_one_id) === uid
                    ? String(row.user_two_id)
                    : String(row.user_one_id);

            let lastMessage = null;
            try{
                const { data:lastRows, error:lastError } = await supabase
                    .from("private_messages")
                    .select("id,sender_id,content,image_url,file_url,file_name,file_type,file_size,created_at,deleted_at")
                    .eq("conversation_id",row.id)
                    .order("created_at",{ascending:false})
                    .limit(1);
                if(lastError) throw lastError;

                const last = lastRows?.[0];
                if(last){
                    lastMessage = {
                        id:String(last.id),
                        text:last.deleted_at ? "تم حذف الرسالة" : String(last.content || ""),
                        imageUrl:last.deleted_at ? "" : String(last.image_url || ""),
                        fileUrl:last.deleted_at ? "" : String(last.file_url || ""),
                        fileName:last.deleted_at ? "" : String(last.file_name || ""),
                        fileType:last.deleted_at ? "" : String(last.file_type || ""),
                        fileSize:last.deleted_at ? 0 : Number(last.file_size || 0),
                        createdAt:last.created_at
                    };
                }
            }catch(lastError){
                console.log("PRIVATE LAST MESSAGE ERROR:",lastError?.message || lastError);
            }

            conversations.push({
                id:String(row.id),
                createdAt:row.created_at,
                updatedAt:row.updated_at,
                otherUser:
                    profiles.get(otherId)
                        ? privateUserResponse(profiles.get(otherId),otherId)
                        : {id:otherId,name:"عضو",username:"",avatarUrl:""},
                lastMessage
            });
        }

        return res.json({success:true,conversations});
    }catch(error){
        console.log("GET PRIVATE CONVERSATIONS ERROR:",error?.message || error);
        return res.status(500).json({success:false,message:"تعذر تحميل المحادثات الخاصة"});
    }
});

app.post("/api/community/private/conversations", async (req,res) => {
    try{
        const user = await getAuthenticatedUser(req);
        if(!user) return res.status(401).json({success:false,message:"يجب تسجيل الدخول"});

        const targetId = String(req.body?.userId || "").trim();
        const currentId = String(user.id);

        if(!targetId) return res.status(400).json({success:false,message:"معرّف العضو غير صالح"});
        if(targetId === currentId) return res.status(400).json({success:false,message:"لا يمكنك بدء محادثة مع نفسك"});

        const firstId = currentId < targetId ? currentId : targetId;
        const secondId = currentId < targetId ? targetId : currentId;

        const { data:existing, error:existingError } = await supabase
            .from("private_conversations")
            .select("id,user_one_id,user_two_id,created_at,updated_at")
            .eq("user_one_id",firstId)
            .eq("user_two_id",secondId)
            .maybeSingle();

        if(existingError) throw existingError;

        if(existing){
            return res.json({
                success:true,
                conversation:{id:String(existing.id),createdAt:existing.created_at,updatedAt:existing.updated_at}
            });
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        const { error:insertError } = await supabase
            .from("private_conversations")
            .insert({
                id,user_one_id:firstId,user_two_id:secondId,
                created_at:now,updated_at:now
            });

        if(insertError) throw insertError;

        return res.status(201).json({
            success:true,
            conversation:{id,createdAt:now,updatedAt:now}
        });
    }catch(error){
        console.log("POST PRIVATE CONVERSATION ERROR:",error?.message || error);
        return res.status(500).json({success:false,message:"تعذر إنشاء المحادثة الخاصة"});
    }
});

app.get("/api/community/private/messages/:conversationId", async (req,res) => {
    try{
        const user = await getAuthenticatedUser(req);
        if(!user) return res.status(401).json({success:false,message:"يجب تسجيل الدخول"});

        const conversationId = String(req.params.conversationId || "").trim();
        if(!conversationId) return res.status(400).json({success:false,message:"معرّف المحادثة غير صالح"});

        const membership = await requirePrivateConversationMember(conversationId,user.id);
        if(membership === null) return res.status(404).json({success:false,message:"المحادثة غير موجودة"});
        if(membership === false) return res.status(403).json({success:false,message:"هذه المحادثة ليست متاحة لك"});

        const limit = Math.min(
            Math.max(Number.parseInt(req.query.limit,10) || 100,1),100
        );

        const { data,error } = await supabase
            .from("private_messages")
            .select("id,conversation_id,sender_id,content,image_url,image_path,file_url,file_path,file_name,file_type,file_size,created_at,updated_at,deleted_at")
            .eq("conversation_id",conversationId)
            .order("created_at",{ascending:true})
            .limit(limit);

        if(error) throw error;

        let profiles = new Map();
        try{
            profiles = await getPrivateProfiles((data || []).map(row => row.sender_id));
        }catch(profileError){
            console.log("PRIVATE MESSAGE PROFILE ERROR:",profileError?.message || profileError);
        }

        return res.json({
            success:true,
            messages:(data || []).map(row =>
                privateMessageResponse(
                    row,
                    profiles.get(String(row.sender_id)) ||
                    (String(row.sender_id) === String(user.id) ? privateFallbackUser(user) : null)
                )
            )
        });
    }catch(error){
        console.log("GET PRIVATE MESSAGES ERROR:",error?.message || error);
        return res.status(500).json({success:false,message:"تعذر تحميل المحادثة الخاصة"});
    }
});

app.post("/api/community/private/messages/:conversationId", async (req,res) => {
    try{
        const user = await getAuthenticatedUser(req);
        if(!user) return res.status(401).json({success:false,message:"يجب تسجيل الدخول"});

        const conversationId = String(req.params.conversationId || "").trim();
        const content = String(req.body?.content || "").trim();
        const imageData = String(req.body?.imageData || "").trim();
        const fileData = req.body?.fileData || null;

        if(!conversationId) return res.status(400).json({success:false,message:"معرّف المحادثة غير صالح"});
        if(!content && !imageData && !fileData) return res.status(400).json({success:false,message:"اكتب رسالة أو اختر مرفقًا أولاً"});
        if(content.length > 2000) return res.status(400).json({success:false,message:"الرسالة طويلة جدًا"});

        const membership = await requirePrivateConversationMember(conversationId,user.id);
        if(membership === null) return res.status(404).json({success:false,message:"المحادثة غير موجودة"});
        if(membership === false) return res.status(403).json({success:false,message:"لا يمكنك إرسال رسالة في هذه المحادثة"});

        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        let media = null;
        let fileMedia = null;

        try{
            if(imageData){ media = await uploadCommunityImage(imageData,user.id,id); }
            if(fileData){ fileMedia = await uploadCommunityFile(fileData,user.id,id); }

            const { error:insertError } = await supabase
                .from("private_messages")
                .insert({
                    id,
                    conversation_id:conversationId,
                    sender_id:user.id,
                    content,
                    image_url:media?.imageUrl || null,
                    image_path:media?.imagePath || null,
                    file_url:fileMedia?.fileUrl || null,
                    file_path:fileMedia?.filePath || null,
                    file_name:fileMedia?.fileName || null,
                    file_type:fileMedia?.fileType || null,
                    file_size:fileMedia?.fileSize || null,
                    created_at:createdAt
                });

            if(insertError){
                if(media?.imagePath) await deleteCommunityImage(media.imagePath);
                if(fileMedia?.filePath) await deleteCommunityFile(fileMedia.filePath);
                throw insertError;
            }
        }catch(error){
            if(media?.imagePath) await deleteCommunityImage(media.imagePath);
            if(fileMedia?.filePath) await deleteCommunityFile(fileMedia.filePath);
            throw error;
        }

        const { error:updateError } = await supabase
            .from("private_conversations")
            .update({updated_at:createdAt})
            .eq("id",conversationId);

        if(updateError){
            console.log("PRIVATE CONVERSATION UPDATE ERROR:",updateError?.message || updateError);
        }

        const profile = await getPrivateProfiles([user.id])
            .then(map => map.get(String(user.id)) || null)
            .catch(() => null);

        return res.status(201).json({
            success:true,
            message:privateMessageResponse(
                {
                    id,conversation_id:conversationId,sender_id:user.id,content,
                    image_url:media?.imageUrl || null,
                    image_path:media?.imagePath || null,
                    file_url:fileMedia?.fileUrl || null,
                    file_path:fileMedia?.filePath || null,
                    file_name:fileMedia?.fileName || null,
                    file_type:fileMedia?.fileType || null,
                    file_size:fileMedia?.fileSize || null,
                    created_at:createdAt,updated_at:null,deleted_at:null
                },
                profile || privateFallbackUser(user)
            )
        });
    }catch(error){
        console.log("POST PRIVATE MESSAGE ERROR:",error?.message || error);
        return res.status(500).json({success:false,message:"تعذر إرسال الرسالة الخاصة"});
    }
});

app.get("/api/community/private/messages/by-id/:id", async (req,res) => {
    try{
        const user = await getAuthenticatedUser(req);
        if(!user) return res.status(401).json({success:false,message:"يجب تسجيل الدخول"});

        const id = String(req.params.id || "").trim();
        if(!id) return res.status(400).json({success:false,message:"معرّف الرسالة غير صالح"});

        const { data,error } = await supabase
            .from("private_messages")
            .select("id,conversation_id,sender_id,content,image_url,image_path,file_url,file_path,file_name,file_type,file_size,created_at,updated_at,deleted_at")
            .eq("id",id)
            .maybeSingle();

        if(error) throw error;
        if(!data) return res.status(404).json({success:false,message:"الرسالة غير موجودة"});

        const membership = await requirePrivateConversationMember(data.conversation_id,user.id);
        if(membership === null) return res.status(404).json({success:false,message:"المحادثة غير موجودة"});
        if(membership === false) return res.status(403).json({success:false,message:"غير مصرح"});

        const profile = await getPrivateProfiles([data.sender_id])
            .then(map => map.get(String(data.sender_id)) || null)
            .catch(() => null);

        return res.json({
            success:true,
            message:privateMessageResponse(data,profile)
        });
    }catch(error){
        console.log("GET PRIVATE MESSAGE BY ID ERROR:",error?.message || error);
        return res.status(500).json({success:false,message:"تعذر تحميل الرسالة الخاصة"});
    }
});

app.delete("/api/community/private/messages/:id", async (req,res) => {
    try{
        const user = await getAuthenticatedUser(req);
        if(!user) return res.status(401).json({success:false,message:"يجب تسجيل الدخول"});

        const id = String(req.params.id || "").trim();
        if(!id) return res.status(400).json({success:false,message:"معرّف الرسالة غير صالح"});

        const { data:existing,error:readError } = await supabase
            .from("private_messages")
            .select("id,conversation_id,sender_id,image_path,file_path")
            .eq("id",id)
            .maybeSingle();

        if(readError) throw readError;
        if(!existing) return res.status(404).json({success:false,message:"الرسالة غير موجودة"});

        if(String(existing.sender_id) !== String(user.id)){
            return res.status(403).json({success:false,message:"لا يمكنك حذف رسالة ليست لك"});
        }

        const membership = await requirePrivateConversationMember(existing.conversation_id,user.id);
        if(membership === null) return res.status(404).json({success:false,message:"المحادثة غير موجودة"});
        if(membership === false) return res.status(403).json({success:false,message:"غير مصرح"});

        const { error:deleteError } = await supabase
            .from("private_messages")
            .delete()
            .eq("id",id)
            .eq("sender_id",user.id);

        if(deleteError) throw deleteError;

        if(existing.image_path){ await deleteCommunityImage(existing.image_path); }
        if(existing.file_path){ await deleteCommunityFile(existing.file_path); }

        return res.json({success:true,id});
    }catch(error){
        console.log("DELETE PRIVATE MESSAGE ERROR:",error?.message || error);
        return res.status(500).json({success:false,message:"تعذر حذف الرسالة الخاصة"});
    }
});


app.get("/api/community/messages", async (req, res) => {
    try {
        const limit = Math.min(
            Math.max(
                Number.parseInt(req.query.limit, 10) || 50,
                1
            ),
            100
        );

        const { data, error } = await supabase
            .from("community_messages")
            .select(
                "id,user_id,content,image_url,image_path,file_url,file_path,file_name,file_type,file_size,created_at,updated_at,deleted_at"
            )
            .order("created_at", { ascending: true })
            .limit(limit);

        if (error) throw error;

        // Profile enrichment is optional. A profile/RLS problem
        // must never prevent existing messages from being shown.
        let profiles = new Map();

        try {
            profiles = await getCommunityProfiles(
                (data || []).map(row => row.user_id)
            );
        } catch (profileError) {
            console.log(
                "COMMUNITY LIST PROFILE ERROR:",
                profileError?.message || profileError
            );
        }

        const messages = (data || []).map(row =>
            communityMessageResponse(
                row,
                profiles.get(String(row.user_id))
            )
        );

        return res.json({
            success: true,
            messages
        });
    } catch (error) {
        console.log(
            "GET COMMUNITY MESSAGES ERROR:",
            error?.message || error
        );

        return res.status(500).json({
            success: false,
            message: "تعذر تحميل رسائل المجتمع"
        });
    }
});

app.post("/api/community/messages", async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "يجب تسجيل الدخول للمشاركة"
            });
        }

        const content = String(
            req.body?.content || ""
        ).trim();

        const imageData = String(req.body?.imageData || "").trim();

        const fileData = req.body?.fileData || null;

        if (!content && !imageData && !fileData) {
            return res.status(400).json({
                success: false,
                message: "اكتب رسالة أو اختر مرفقًا أولاً"
            });
        }

        if (content.length > 2000) {
            return res.status(400).json({
                success: false,
                message: "الرسالة طويلة جدًا"
            });
        }

        const messageId = crypto.randomUUID();
        const createdAt = new Date().toISOString();

        let media = null;
        let fileMedia = null;

        try{
            if(imageData){
                media = await uploadCommunityImage(imageData,user.id,messageId);
            }
            if(fileData){
                fileMedia = await uploadCommunityFile(fileData,user.id,messageId);
            }

            const { error } = await supabase
                .from("community_messages")
                .insert({
                    id: messageId,
                    user_id: user.id,
                    content,
                    image_url: media?.imageUrl || null,
                    image_path: media?.imagePath || null,
                    file_url: fileMedia?.fileUrl || null,
                    file_path: fileMedia?.filePath || null,
                    file_name: fileMedia?.fileName || null,
                    file_type: fileMedia?.fileType || null,
                    file_size: fileMedia?.fileSize || null,
                    created_at: createdAt
                });

            if (error) {
                console.log(
                    "COMMUNITY MESSAGE INSERT ERROR:",
                    error?.message || error,
                    error?.code || ""
                );
                if(media?.imagePath) await deleteCommunityImage(media.imagePath);
                if(fileMedia?.filePath) await deleteCommunityFile(fileMedia.filePath);
                return res.status(500).json({
                    success: false,
                    message: "تعذر حفظ الرسالة في قاعدة البيانات"
                });
            }
        }catch(error){
            if(media?.imagePath) await deleteCommunityImage(media.imagePath);
            if(fileMedia?.filePath) await deleteCommunityFile(fileMedia.filePath);
            throw error;
        }

        const profile =
            await getCommunityProfileSafe(user.id) ||
            communityFallbackProfile(user);

        const message = communityMessageResponse(
            {
                id: messageId,
                user_id: user.id,
                content,
                image_url: media?.imageUrl || null,
                image_path: media?.imagePath || null,
                file_url: fileMedia?.fileUrl || null,
                file_path: fileMedia?.filePath || null,
                file_name: fileMedia?.fileName || null,
                file_type: fileMedia?.fileType || null,
                file_size: fileMedia?.fileSize || null,
                created_at: createdAt,
                updated_at: null,
                deleted_at: null
            },
            profile
        );

        return res.status(201).json({
            success: true,
            message
        });
    } catch (error) {
        console.log(
            "POST COMMUNITY MESSAGE ERROR:",
            error?.message || error
        );

        return res.status(500).json({
            success: false,
            message: "تعذر إرسال الرسالة"
        });
    }
});

app.get("/api/community/messages/:id", async (req, res) => {
    try {
        const id = String(
            req.params.id || ""
        ).trim();

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "معرّف الرسالة غير صالح"
            });
        }

        const { data, error } = await supabase
            .from("community_messages")
            .select(
                "id,user_id,content,image_url,image_path,file_url,file_path,file_name,file_type,file_size,created_at,updated_at,deleted_at"
            )
            .eq("id", id)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "الرسالة غير موجودة"
            });
        }

        const profiles = await getCommunityProfiles([data.user_id]);
        const profile = profiles.get(String(data.user_id)) || null;

        return res.json({
            success: true,
            message: communityMessageResponse(data, profile)
        });
    } catch (error) {
        console.log(
            "GET COMMUNITY MESSAGE ERROR:",
            error?.message || error
        );

        return res.status(500).json({
            success: false,
            message: "تعذر تحميل الرسالة"
        });
    }
});

app.get("/api/community/members", async (req, res) => {
    try {
        const limit = Math.min(
            Math.max(
                Number.parseInt(req.query.limit, 10) || 50,
                1
            ),
            100
        );

        // profiles is the preferred source for names/usernames/avatars.
        // However, some authenticated users may not have a profiles row yet.
        // Build the member list from both profiles and Supabase Auth so that
        // every registered account can appear in the Community members list.
        const memberMap = new Map();

        try {
            const { data: profileRows, error: profileError } = await supabase
                .from("profiles")
                .select("id,full_name,username,avatar_url")
                .limit(1000);

            if (profileError) {
                console.log(
                    "COMMUNITY MEMBERS PROFILE TABLE ERROR:",
                    profileError?.message || profileError
                );
            } else {
                (profileRows || []).forEach(profile => {
                    const id = String(profile?.id || "").trim();
                    if (!id) return;

                    memberMap.set(id, {
                        id,
                        name: String(
                            profile.full_name ||
                            profile.username ||
                            "عضو"
                        ),
                        username: String(profile.username || ""),
                        avatarUrl: String(profile.avatar_url || "")
                    });
                });
            }
        } catch (profileError) {
            console.log(
                "COMMUNITY MEMBERS PROFILE TABLE ERROR:",
                profileError?.message || profileError
            );
        }

        // Fill missing members directly from Supabase Auth.
        // This is important for accounts created before a profiles row existed.
        try {
            const { data: authData, error: authError } =
                await supabase.auth.admin.listUsers({
                    page: 1,
                    perPage: 1000
                });

            if (authError) {
                console.log(
                    "COMMUNITY MEMBERS AUTH LIST ERROR:",
                    authError?.message || authError
                );
            } else {
                (authData?.users || []).forEach(user => {
                    const id = String(user?.id || "").trim();
                    if (!id || memberMap.has(id)) return;

                    const fallback = communityFallbackProfile(user);

                    memberMap.set(id, {
                        id,
                        name: String(fallback.full_name || "عضو"),
                        username: String(fallback.username || ""),
                        avatarUrl: String(fallback.avatar_url || "")
                    });
                });
            }
        } catch (authError) {
            console.log(
                "COMMUNITY MEMBERS AUTH LIST ERROR:",
                authError?.message || authError
            );
        }

        const members = [...memberMap.values()].slice(0, limit);

        return res.json({
            success: true,
            members
        });
    } catch (error) {
        console.log(
            "GET COMMUNITY MEMBERS ERROR:",
            error?.message || error
        );

        return res.status(500).json({
            success: false,
            message: "تعذر تحميل أعضاء المجتمع",
            members: []
        });
    }
});

app.delete("/api/community/messages/:id", async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "يجب تسجيل الدخول"
            });
        }

        const id = String(
            req.params.id || ""
        ).trim();

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "معرّف الرسالة غير صالح"
            });
        }

        // Check ownership without relying on DELETE ... SELECT.
        const { data: existing, error: readError } =
            await supabase
                .from("community_messages")
                .select("id,user_id,image_path,file_path")
                .eq("id", id)
                .maybeSingle();

        if (readError) throw readError;

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "الرسالة غير موجودة"
            });
        }

        if (String(existing.user_id) !== String(user.id)) {
            return res.status(403).json({
                success: false,
                message: "لا يمكنك حذف رسالة ليست لك"
            });
        }

        const { error: deleteError } = await supabase
            .from("community_messages")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

        if (deleteError) throw deleteError;

        if(existing.image_path){ await deleteCommunityImage(existing.image_path); }
        if(existing.file_path){ await deleteCommunityFile(existing.file_path); }

        return res.json({
            success: true,
            id
        });
    } catch (error) {
        console.log(
            "DELETE COMMUNITY MESSAGE ERROR:",
            error?.message || error
        );

        return res.status(500).json({
            success: false,
            message: "تعذر حذف الرسالة"
        });
    }
});


// ======================================
// Start / Export Server
// ======================================
// Vercel imports the Express app directly.
// Local/Render execution still works with `node server.js`.

if (require.main === module) {
    app.listen(
        PORT,
        () => {
            console.log("WallpaperHub Server Started");
            console.log("PORT:", PORT);
        }
    );
}

module.exports = app;
