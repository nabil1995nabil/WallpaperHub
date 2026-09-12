// ======================================
// WallpaperHub Server v4
// Clean Stable Version
// ======================================

const exifParser = require("exif-parser");
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
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
// Express
// ======================================

const app = express();

const PORT = process.env.PORT || 3000;



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

            if(profile){
                return res.json({
                    success:true,
                    uid:targetUID,
                    user:{
                        id:String(profile.id),
                        full_name:profile.full_name || "",
                        username:profile.username || "",
                        avatar_url:profile.avatar_url || ""
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
                            avatar_url:meta.avatar_url || meta.picture || ""
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
// Wallpapers API
// ======================================


app.get(
    "/api/wallpapers",
    async (req,res)=>{
        try{
            const wallpapers = await getWallpapersFromSupabase();
            res.json(wallpapers);
        }catch(error){
            console.log("GET WALLPAPERS ERROR:", error);
            res.status(500).json([]);
        }
    }
);

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
// Update Wallpaper
// ======================================


app.put(
    "/api/wallpapers/:id",
    async(req,res)=>{
        try{
            const id = Number(req.params.id);
            const updates = {};
            const body = req.body || {};

            const map = {
                title:"title", category:"category", thumbnail:"thumbnail", image:"image",
                resolution:"resolution", size:"size", downloads:"downloads", likes:"likes",
                views:"views", rating:"rating", ratingCount:"rating_count", ratingSum:"rating_sum",
                author:"author", date:"date", colors:"colors", tags:"tags", featured:"featured",
                todayWallpaper:"today_wallpaper", popular:"popular", type:"type", animated:"animated"
            };

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
                return res.status(400).json({ success:false, message:"No valid fields" });
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
// Create API Token - Supabase
// ======================================

app.post(
    "/api/tokens/create",
    async (req, res) => {

        try {

            const {
                userId,
                appName,
                domain
            } = req.body;

            if (!userId) {

                return res.status(400).json({
                    success: false,
                    message: "User ID required"
                });

            }

            const tokenData = {

                id:
                    Date.now(),

                user_id:
                    String(userId),

                app_name:
                    appName ||
                    "My App",

                domain:
                    domain ||
                    "",

                token:
                    createTokenValue(),

                daily_limit:
                    200,

                requests:
                    0,

                last_request_date:
                    null,

                last_used:
                    null,

                last_ip:
                    null,

                active:
                    true,

                created_at:
                    new Date().toISOString()

            };


            // ======================================
            // حفظ Token في Supabase
            // ======================================

            const {
                data,
                error
            } =
                await supabase
                    .from("api_tokens")
                    .insert([tokenData])
                    .select()
                    .single();


            if (error) {

                throw error;

            }


            // ======================================
            // الشكل الذي تحتاجه developers.js
            // ======================================

            res.json({

                success:
                    true,

                token: {

                    id:
                        data.id,

                    userId:
                        data.user_id,

                    appName:
                        data.app_name,

                    domain:
                        data.domain,

                    token:
                        data.token,

                    limit:
                        data.daily_limit,

                    requests:
                        data.requests || 0,

                    lastRequestDate:
                        data.last_request_date,

                    lastUsed:
                        data.last_used,

                    lastIp:
                        data.last_ip,

                    active:
                        data.active,

                    created:
                        data.created_at

                }

            });


        } catch (error) {

            console.log(
                "CREATE TOKEN ERROR:",
                error
            );


            res.status(500).json({

                success:
                    false,

                message:
                    error.message ||
                    "Failed to create token"

            });

        }

    }
);
// ======================================
// Get User Tokens - Supabase
// ======================================

app.get(
    "/api/tokens/:userId",
    async (req, res) => {

        try {

            const userId =
                String(
                    req.params.userId
                );


            const {
                data,
                error
            } =
                await supabase
                    .from("api_tokens")
                    .select("*")
                    .eq(
                        "user_id",
                        userId
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );


            if (error) {

                throw error;

            }


            const tokens =
                (data || []).map(
                    token => ({

                        id:
                            token.id,

                        userId:
                            token.user_id,

                        appName:
                            token.app_name,

                        domain:
                            token.domain,

                        token:
                            token.token,

                        limit:
                            token.daily_limit,

                        requests:
                            token.requests || 0,

                        lastRequestDate:
                            token.last_request_date,

                        lastUsed:
                            token.last_used,

                        lastIp:
                            token.last_ip,

                        active:
                            token.active,

                        created:
                            token.created_at

                    })
                );


            res.json(
                tokens
            );


        } catch (error) {

            console.log(
                "GET TOKEN ERROR:",
                error
            );


            res.status(500).json([]);

        }

    }
);
// ======================================
// Delete Token - Supabase
// ======================================

app.delete(
    "/api/tokens/:id",
    async (req, res) => {

        try {

            const id =
                Number(
                    req.params.id
                );


            if (!id) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Invalid Token ID"

                });

            }


            const {
                error
            } =
                await supabase
                    .from("api_tokens")
                    .delete()
                    .eq(
                        "id",
                        id
                    );


            if (error) {

                throw error;

            }


            res.json({

                success:
                    true

            });


        } catch (error) {

            console.log(
                "DELETE TOKEN ERROR:",
                error
            );


            res.status(500).json({

                success:
                    false,

                message:
                    error.message ||
                    "Failed to delete token"

            });

        }

    }
);
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
        // حماية Token من IP مختلف
        // ======================================

        if(!apiToken.last_ip){

            apiToken.last_ip =
                clientIp;

        }

        else if(
            apiToken.last_ip !==
            clientIp
        ){

            return res.status(403).json({

                success:
                    false,

                message:
                    "Token used from another IP"

            });

        }


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


app.post(
    "/api/wallhaven/import",
    async(req,res)=>{
        try{
            const response = await fetch(
                "https://wallhaven.cc/api/v1/search?sorting=toplist&purity=100&categories=111"
            );
            const data = await response.json();
            const items = data.data || [];

            const { data: existing, error: existingError } = await supabase
                .from("wallpapers")
                .select("image");
            if(existingError) throw existingError;

            const existingImages = new Set((existing || []).map(x => x.image));
            const rows = [];

            for(const item of items){
                if(existingImages.has(item.path)) continue;
                rows.push({
                    id: Date.now() + Math.floor(Math.random()*9999),
                    title:"Wallhaven",
                    image:item.path,
                    thumbnail:item.thumbs?.large || item.path,
                    category:"wallhaven",
                    resolution:"",
                    size:"",
                    downloads:0,
                    likes:0,
                    views:0,
                    rating:0,
                    rating_count:0,
                    rating_sum:0,
                    author:"Wallhaven",
                    date:new Date().toLocaleString("ar-MA"),
                    colors:[],
                    tags:[],
                    featured:false,
                    today_wallpaper:false,
                    popular:false,
                    type:"image",
                    animated:false
                });
            }

            if(rows.length){
                const { error } = await supabase
                    .from("wallpapers")
                    .insert(rows);
                if(error) throw error;
            }

            res.json({ success:true, count:rows.length });
        }catch(error){
            console.log("WALLHAVEN ERROR:", error);
            res.status(500).json({ success:false, message:error.message });
        }
    }
);

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

            const index = wallpapersCache.findIndex(
                w => Number(w.id) === wallpaperId
            );

            if (index !== -1) {
                wallpapersCache[index].colors = colors;
            }

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
