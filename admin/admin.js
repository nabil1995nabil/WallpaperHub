// ==========================================
// WallpaperHub Admin JS
// Part 1/5
// ==========================================

// Supabase Auth: هوية ناشر الخلفية تأتي من الحساب المسجل فقط.
import { supabase } from "../supabase.js";

let currentUser = null;
let currentSession = null;



async function ensureAdminSession(){
    try{
        const {data,error}=await supabase.auth.getSession();
        if(error || !data?.session){
            location.href="/profile.html";
            return null;
        }
        const response=await fetch("/api/admin/me",{
            headers:{Authorization:`Bearer ${data.session.access_token}`},
            cache:"no-store"
        });
        const result=await response.json().catch(()=>({}));
        if(!response.ok || !result.isAdmin){
            location.href="/profile.html";
            return null;
        }
        currentSession=data.session;
        currentUser=data.session.user;
        return data.session;
    }catch(error){
        console.error("ADMIN SESSION ERROR:",error);
        location.href="/profile.html";
        return null;
    }
}

// ============================
// العناصر
// ============================


const wallpapersCount =
document.getElementById("wallpapersCount");


const downloadsCount =
document.getElementById("downloadsCount");


const favoritesCount =
document.getElementById("favoritesCount");


const wallpaperContainer =
document.getElementById("wallpaperContainer");


const logoutBtn =
document.getElementById("logoutBtn");


const form =
document.getElementById("wallpaperForm");


const imageInput =
document.getElementById("wallImage");


const typeInput =
document.getElementById("wallType");


const videoThumbnailInput =
document.getElementById("videoThumbnail");


const imagesPreview =
document.getElementById("imagesPreview");


const selectedImagesCount =
document.getElementById("selectedImagesCount");


const uploadProgressBox =
document.getElementById("uploadProgressBox");


const uploadProgressText =
document.getElementById("uploadProgressText");


const uploadProgressBar =
document.getElementById("uploadProgressBar");


const saveWallpaper =
document.getElementById("saveWallpaper");

const pauseUploadBtn =
document.getElementById("pauseUploadBtn");

const resumeUploadBtn =
document.getElementById("resumeUploadBtn");

const uploadNetworkStatus =
document.getElementById("uploadNetworkStatus");

const uploadCurrentFile =
document.getElementById("uploadCurrentFile");

const uploadRetryInfo =
document.getElementById("uploadRetryInfo");

const uploadOfflineNotice =
document.getElementById("uploadOfflineNotice");

const is360Input =
document.getElementById("is360");

const is360Option =
document.getElementById("is360Option");




// ============================
// المتغيرات
// ============================


let wallpapers = [];


let editingId = null;



let selectedFiles = [];

function formatBytes(bytes){
    if(!Number.isFinite(bytes) || bytes < 0) return "";
    if(bytes === 0) return "0 B";
    const units=["B","KB","MB","GB"];
    const i=Math.min(Math.floor(Math.log(bytes)/Math.log(1024)),units.length-1);
    return `${(bytes/Math.pow(1024,i)).toFixed(i===0?0:2)} ${units[i]}`;
}
async function updateAutoFileMetadata(files){
    const output=document.getElementById("wallAutoMetadata");
    if(!output) return;
    const list=Array.from(files||[]);
    if(!list.length){ output.textContent="ستظهر الدقة والحجم تلقائيًا بعد اختيار ملف واحد."; return; }
    const total=list.reduce((sum,file)=>sum+Number(file.size||0),0);
    const first=list[0];
    let dimensions="";
    if(first.type.startsWith("image/")){
        dimensions=await new Promise(resolve=>{
            const url=URL.createObjectURL(first), img=new Image();
            img.onload=()=>{resolve(`${img.naturalWidth}×${img.naturalHeight}`);URL.revokeObjectURL(url);};
            img.onerror=()=>{resolve("تعذر قراءة الأبعاد");URL.revokeObjectURL(url);};
            img.src=url;
        });
    }else if(first.type.startsWith("video/")){
        dimensions=await new Promise(resolve=>{
            const url=URL.createObjectURL(first), video=document.createElement("video");
            video.preload="metadata";
            video.onloadedmetadata=()=>{resolve(`${video.videoWidth}×${video.videoHeight}`);URL.revokeObjectURL(url);};
            video.onerror=()=>{resolve("تعذر قراءة الأبعاد");URL.revokeObjectURL(url);};
            video.src=url;
        });
    }else dimensions="غير متاح";
    output.textContent=`الدقة: ${dimensions} · حجم ${list.length>1?"الملفات المختارة":"الملف"}: ${formatBytes(total)}`;
}




let wallpaperType = "image";


let videoThumbnail = "";

let selectedWallpapers = new Set();

/* ImageKit upload state.
 * ImageKit browser uploads here use one request per file, not resumable chunks.
 */
const UPLOAD_CHUNK_SIZE = 6 * 1024 * 1024;
const UPLOAD_RETRY_LIMIT = 8;
let activeUploadXHR = null;
let uploadPausedByUser = false;
let uploadWaitingForNetwork = false;
let uploadCurrentState = null;
let uploadAbortReason = "";

function setUploadNetworkStatus(text, state="is-online"){
    if(!uploadNetworkStatus) return;
    uploadNetworkStatus.textContent = text;
    uploadNetworkStatus.className = `upload-network-status ${state}`;
}

function setUploadControls(){
    const active = Boolean(uploadCurrentState);
    const canPause = active && !uploadPausedByUser && !uploadWaitingForNetwork;
    const canResume = active && (uploadPausedByUser || uploadWaitingForNetwork) && navigator.onLine !== false;

    if(pauseUploadBtn) pauseUploadBtn.disabled = !canPause;
    if(resumeUploadBtn) resumeUploadBtn.disabled = !canResume;
}

function setUploadCurrentFile(text="لا يوجد رفع حالي"){
    if(uploadCurrentFile) uploadCurrentFile.textContent = text;
}

function setUploadRetryInfo(text=""){
    if(uploadRetryInfo) uploadRetryInfo.textContent = text;
}

function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}

function createUploadId(){
    if(globalThis.crypto?.randomUUID) return crypto.randomUUID();
    return `wh-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function abortActiveUpload(reason=""){
    uploadAbortReason = reason;
    if(activeUploadXHR){
        try{ activeUploadXHR.abort(); }catch{}
        activeUploadXHR = null;
    }
}

function pauseCurrentUpload(){
    if(!uploadCurrentState) return;
    uploadPausedByUser = true;
    uploadWaitingForNetwork = false;
    abortActiveUpload("user");
    setUploadNetworkStatus("تم إلغاء طلب الرفع", "is-paused");
    setUploadRetryInfo("ImageKit يرفع الملف في طلب واحد؛ لا يمكن استكماله من منتصف الملف. أعد اختيار الملف لرفعه من البداية.");
    setUploadControls();
}

function resumeCurrentUpload(){
    if(!uploadCurrentState || navigator.onLine === false) return;
    setUploadRetryInfo("لا يدعم هذا الرفع الاستكمال من منتصف الملف. أعد المحاولة لرفع الملف من البداية.");
    setUploadNetworkStatus("جاهز لإعادة المحاولة", "is-paused");
}

function handleOffline(){
    if(!uploadCurrentState) return;
    uploadWaitingForNetwork = true;
    uploadPausedByUser = false;
    abortActiveUpload("offline");
    setUploadNetworkStatus("● لا يوجد اتصال", "is-offline");
    if(uploadOfflineNotice) uploadOfflineNotice.hidden = false;
    setUploadRetryInfo("بانتظار عودة الإنترنت...");
    setUploadControls();
}

function handleOnline(){
    if(uploadOfflineNotice) uploadOfflineNotice.hidden = true;
    if(!uploadCurrentState) {
        setUploadNetworkStatus("● متصل — الرفع جاهز", "is-online");
        return;
    }
    uploadWaitingForNetwork = false;
    uploadPausedByUser = false;
    setUploadNetworkStatus("● عاد الاتصال — استئناف الرفع", "is-online");
    setUploadRetryInfo("");
    setUploadControls();
}

window.addEventListener("offline", handleOffline);
window.addEventListener("online", handleOnline);

// ImageKit upload API used here is a single request; hide controls that imply chunk-resume.
if(pauseUploadBtn) pauseUploadBtn.hidden = true;
if(resumeUploadBtn) resumeUploadBtn.hidden = true;

// ==========================================
// AI Auto Tags
// ==========================================

const wallTagsStatus =
document.getElementById("wallTagsStatus");

function setTagsStatus(message, state=""){
    if(!wallTagsStatus) return;
    wallTagsStatus.textContent = message;
    wallTagsStatus.dataset.state = state;
}

function fallbackTags(file){
    const category = document.getElementById("wallCategory")?.value || "";
    const title = document.getElementById("wallTitle")?.value || "";
    const name = (file?.name || "").replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ");
    const map = {
        nature:["nature","landscape","scenery","outdoors"], cars:["car","automotive","vehicle","road"],
        games:["gaming","game","video game"], space:["space","galaxy","cosmos","stars"],
        amoled:["amoled","dark","black"], animals:["animals","wildlife"], anime:["anime","illustration"],
        city:["city","urban","architecture"], sports:["sports","athlete"], "4k":["4k","high resolution"],
        minimal:["minimal","clean"], rain:["rain","weather"], sunset:["sunset","sky"],
        snow:["snow","winter","ice","snowfall","frost"], aurora:["aurora","northern lights","night sky","polar lights"],
        cyberpunk:["cyberpunk","neon","futuristic","sci-fi","night city"], gradients:["gradient","abstract","minimal","colorful"],
        architecture:["architecture","building"], "deep-space":["deep space","galaxy","universe"]
    };
    const tags=[...(map[category]||[]),...name.toLowerCase().split(/\s+/).filter(x=>x.length>2),...title.toLowerCase().split(/\s+/).filter(x=>x.length>2)];
    return [...new Set(tags)].slice(0,12);
}

function fileToAIImage(file){
    return new Promise((resolve,reject)=>{
        if(!file || !file.type.startsWith("image/")){ resolve(null); return; }
        const reader=new FileReader();
        reader.onload=()=>{
            const img=new Image();
            img.onload=()=>{
                const maxSize=1280;
                const scale=Math.min(1,maxSize/Math.max(img.width,img.height));
                const canvas=document.createElement("canvas");
                canvas.width=Math.max(1,Math.round(img.width*scale));
                canvas.height=Math.max(1,Math.round(img.height*scale));
                const ctx=canvas.getContext("2d",{alpha:false});
                ctx.drawImage(img,0,0,canvas.width,canvas.height);
                const dataUrl=canvas.toDataURL("image/jpeg",0.72);
                resolve({data:dataUrl.split(",")[1],mimeType:"image/jpeg"});
            };
            img.onerror=()=>reject(new Error("تعذر قراءة الصورة"));
            img.src=reader.result;
        };
        reader.onerror=()=>reject(new Error("تعذر قراءة الملف"));
        reader.readAsDataURL(file);
    });
}

async function generateAITags(file){
    if(!file) return [];
    if(file.type.startsWith("video/")){
        setTagsStatus("🎞 الفيديو: تم استخدام وسوم القسم تلقائيًا","fallback");
        return fallbackTags(file);
    }
    try{
        setTagsStatus("🤖 جاري تحليل الصورة وتوليد الوسوم...","loading");
        const image=await fileToAIImage(file);
        const category=document.getElementById("wallCategory")?.value || "";
        const title=document.getElementById("wallTitle")?.value || "";
        const prompt=`أنت نظام تصنيف بصري لموقع WallpaperHub. حلل الصورة المرفقة وأنشئ وسوماً إنجليزية قصيرة ومناسبة للبحث والتوصيات الذكية. أرجع JSON فقط بدون Markdown أو شرح: {"tags":["tag1","tag2","tag3"]}. الشروط: من 10 إلى 15 وسمًا، lowercase، كلمات بحث شائعة، صف الموضوع الرئيسي والأشياء والمشهد والبيئة والأسلوب والإضاءة والألوان الظاهرة والمكان إذا كان واضحًا، اجعل الوسوم مفيدة للعثور على صور مشابهة بصريًا ومضمونيًا، لا تكرر الوسوم، لا تخترع أشياء غير واضحة. القسم: ${category||"unknown"}. العنوان: ${title||"unknown"}.`;
        const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:prompt,imageData:image.data,mimeType:image.mimeType,locale:"en"})});
        if(!response.ok) throw new Error("AI API ERROR");
        const result=await response.json();
        let text=String(result.reply||"").trim().replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/\s*```$/i,"").trim();
        let parsed=null;
        try{parsed=JSON.parse(text);}catch{const match=text.match(/\{[\s\S]*\}/);if(match){try{parsed=JSON.parse(match[0]);}catch{}}}
        const tags=Array.isArray(parsed?.tags)?parsed.tags.map(tag=>String(tag).trim().toLowerCase()).filter(Boolean):[];
        if(!tags.length) throw new Error("No tags");
        setTagsStatus(`✅ تم توليد ${tags.length} وسمًا تلقائيًا`,"success");
        return [...new Set(tags)].slice(0,15);
    }catch(error){
        console.warn("AI TAGS ERROR:",error);
        setTagsStatus("⚠️ تعذر تحليل الصورة، تم استخدام وسوم تلقائية للقسم","fallback");
        return fallbackTags(file);
    }
}

// ImageKit endpoint؛ المفتاح السري محفوظ في Vercel فقط.
const IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/2xcgjj3oe";





// ============================
// Supabase Auth
// ============================

async function getCurrentUser(){
    try{
        const { data, error } = await supabase.auth.getSession();
        if(error) throw error;
        currentSession = data?.session || null;
        currentUser = currentSession?.user || null;
        return currentUser;
    }catch(error){
        console.error("ADMIN AUTH ERROR:", error);
        currentSession = null;
        currentUser = null;
        return null;
    }
}

function getPublisherName(user){
    const metadata = user?.user_metadata || {};
    return String(
        metadata.full_name ||
        metadata.name ||
        metadata.user_name ||
        user?.email?.split("@")[0] ||
        "مستخدم"
    ).trim();
}

supabase.auth.onAuthStateChange((_event, session)=>{
    currentSession = session || null;
    currentUser = session?.user || null;
});

// ============================
// تحميل لوحة التحكم
// ============================


async function loadDashboard(){


try{


const response =
await fetch("/api/wallpapers");



if(!response.ok){

throw new Error(
"API ERROR"
);

}



wallpapers =
await response.json();



if(!Array.isArray(wallpapers)){

wallpapers = [];

}



renderWallpapers();


refreshStats();



}catch(error){


console.error(
"Dashboard Load Error:",
error
);



if(wallpaperContainer){

wallpaperContainer.innerHTML =
"<p>فشل تحميل الخلفيات</p>";

}



}



}




// ============================
// الإحصائيات
// ============================


function refreshStats(){


if(wallpapersCount)

wallpapersCount.textContent =
wallpapers.length;



const downloads =

wallpapers.reduce(
(sum,wall)=>
sum + Number(wall.downloads || 0),
0
);



if(downloadsCount)

downloadsCount.textContent =
downloads;



const likes =

wallpapers.reduce(
(sum,wall)=>
sum + Number(wall.likes || 0),
0
);



if(favoritesCount)

favoritesCount.textContent =
likes;



}

// ==========================================
// عرض الخلفيات في لوحة التحكم
// ==========================================


function renderWallpapers(){

if(!wallpaperContainer) return;

wallpaperContainer.innerHTML = "";

if(wallpapers.length === 0){
    wallpaperContainer.innerHTML = "<p>لا توجد خلفيات حاليا</p>";
    return;
}

const fragment=document.createDocumentFragment();

wallpapers.forEach(wall=>{
    const card=document.createElement("div");
    card.className="admin-wall";

    let media="";
    if(wall.type==="video"){
        media=`
        <video src="${String(wall.image||"").replace(/"/g,"&quot;")}"
            muted loop playsinline preload="metadata"></video>
        <span class="file-type-badge">🎞 فيديو</span>`;
    }else if(wall.type==="gif"){
        media=`
        <img src="${String(wall.image||"").replace(/"/g,"&quot;")}" loading="lazy" alt="">
        <span class="file-type-badge">🌀 GIF</span>`;
    }else{
        media=`
        <img src="${String(wall.thumbnail||wall.image||"").replace(/"/g,"&quot;")}" loading="lazy" alt="">
        <span class="file-type-badge">🖼 صورة</span>
        ${wall.is360 ? '<span class="panorama-admin-badge">🌐 360°</span>' : ""}`;
    }

    card.innerHTML=`
    <input type="checkbox" class="wall-select" data-id="${String(wall.id).replace(/"/g,"&quot;")}"
        onclick="toggleWallpaperSelect('${String(wall.id).replace(/'/g,"\\'")}',this)">
    ${media}
    <div class="admin-info">
      <h3>${String(wall.title||"بدون اسم").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}</h3>
      <p>${String(wall.category||"عام").replace(/[&<>"]/g,"")}</p>
      <p>⬇️ ${Number(wall.downloads||0)} &nbsp; ❤️ ${Number(wall.likes||0)}</p>
      <div class="admin-actions">
        <button class="edit-btn" onclick="editWallpaper('${String(wall.id).replace(/'/g,"\\'")}')">تعديل</button>
        <button class="delete-btn" onclick="deleteWallpaper('${String(wall.id).replace(/'/g,"\\'")}')">حذف</button>
      </div>
    </div>`;
    fragment.appendChild(card);
});

wallpaperContainer.appendChild(fragment);
}


// ==========================================
// اختيار نوع الخلفية
// ==========================================


function sync360Option(){
    const isImage = typeInput?.value === "image";
    if(is360Option) is360Option.style.display = isImage ? "flex" : "none";
    if(!isImage && is360Input) is360Input.checked = false;
}

if(typeInput){


typeInput.addEventListener(
"change",
()=>{


wallpaperType =
typeInput.value;

sync360Option();


});

sync360Option();



}







// ==========================================
// صورة مصغرة للفيديو
// ==========================================


if(videoThumbnailInput){


videoThumbnailInput.addEventListener(
"change",
()=>{


const file =
videoThumbnailInput.files[0];



if(!file)
return;



const reader =
new FileReader();



reader.onload = ()=>{


videoThumbnail =
reader.result;


};



reader.readAsDataURL(file);



});



}







// ==========================================
// اختيار الملفات
// ==========================================


if(imageInput){
imageInput.addEventListener("change",()=>updateAutoFileMetadata(imageInput.files).catch(()=>{}));


imageInput.addEventListener(
"change",
()=>{


const files =
Array.from(
imageInput.files
);



if(files.length > 100){


alert(
"الحد الأقصى 100 ملف"
);


imageInput.value = "";


selectedFiles = [];


renderSelectedFiles();


return;


}



selectedFiles =

files.filter(file=>{


return (

file.type.startsWith("image/")

||

file.type.startsWith("video/")

);


});



renderSelectedFiles();



});



}

// ==========================================
// عرض معاينة الملفات
// ==========================================


function renderSelectedFiles(){


if(!imagesPreview)
return;



imagesPreview.innerHTML = "";



if(selectedImagesCount){


selectedImagesCount.textContent =

`تم اختيار ${selectedFiles.length} ملف`;



}



if(selectedFiles.length === 0){


imagesPreview.innerHTML = `

<p class="preview-empty">

اختر ملفات

</p>

`;

return;


}






selectedFiles.forEach(
(file,index)=>{


const item =
document.createElement("div");



item.className =
"preview-item";



const url =
URL.createObjectURL(file);



let media = "";



if(file.type.startsWith("video/")){


media = `

<video

src="${url}"

autoplay

muted

loop

playsinline>

</video>

`;



}else{


media = `

<img

src="${url}"

>

`;



}




item.innerHTML = `

${media}


<span class="preview-number">

${index + 1}

</span>




<button

type="button"

class="remove-preview"

data-index="${index}"

>

×

</button>


`;



imagesPreview.appendChild(item);



});






document
.querySelectorAll(".remove-preview")
.forEach(button=>{


button.onclick = ()=>{


const index =
Number(
button.dataset.index
);



selectedFiles.splice(
index,
1
);



renderSelectedFiles();



};



});



}





// ==========================================
// رفع ملف واحد إلى ImageKit (ليس رفعًا مجزأً قابلًا للاستكمال)
// ==========================================

function uploadToImageKit(file, onProgress){
    return new Promise(async (resolve,reject)=>{
        try{
            await getCurrentUser();
            if(!currentSession?.access_token) throw new Error("سجّل الدخول أولاً.");
            const allowed=["image/jpeg","image/png","image/webp","image/avif","video/mp4","video/webm","video/quicktime"];
            if(!allowed.includes(String(file.type||"").toLowerCase())) throw new Error("صيغة الصورة غير مدعومة لرفع الخلفيات.");
            const authResponse=await fetch("/api/publish/media-signature",{
                method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${currentSession.access_token}`},
                body:JSON.stringify({mimeType:file.type})
            });
            const auth=await authResponse.json().catch(()=>({}));
            if(!authResponse.ok||!auth.success) throw new Error(auth.message||"تعذر تجهيز الرفع من السيرفر.");
            const total=file.size;
            uploadCurrentState={file,uploadId:auth.token,resourceType:"imagekit",offset:0,total,url:"",done:false};
            uploadPausedByUser=false;uploadWaitingForNetwork=navigator.onLine===false;
            if(uploadOfflineNotice) uploadOfflineNotice.hidden=!uploadWaitingForNetwork;
            setUploadNetworkStatus("● جارٍ رفع الملف إلى ImageKit","is-online");setUploadControls();
            const formData=new FormData();
            formData.append("file",file,file.name);formData.append("fileName",file.name);
            formData.append("publicKey",auth.publicKey);formData.append("signature",auth.signature);
            formData.append("expire",String(auth.expire));formData.append("token",auth.token);formData.append("useUniqueFileName","true");
            const xhr=new XMLHttpRequest();activeUploadXHR=xhr;
            xhr.open("POST","https://upload.imagekit.io/api/v1/files/upload",true);
            xhr.upload.onprogress=event=>{if(event.lengthComputable){uploadCurrentState.offset=event.loaded;if(onProgress)onProgress(Math.min(100,Math.round(event.loaded/total*100)),event.loaded,total);}};
            xhr.onload=()=>{activeUploadXHR=null;let data={};try{data=JSON.parse(xhr.responseText||"{}");}catch{}
                uploadCurrentState=null;setUploadControls();
                if(xhr.status>=200&&xhr.status<300&&data.url){if(onProgress)onProgress(100,total,total);setUploadRetryInfo("");if(uploadOfflineNotice)uploadOfflineNotice.hidden=true;setUploadNetworkStatus("● اكتمل رفع الملف إلى ImageKit","is-online");resolve(data.url);}
                else reject(new Error(data?.message||data?.help||`ImageKit HTTP ${xhr.status}`));
            };
            xhr.onerror=()=>{activeUploadXHR=null;uploadCurrentState=null;setUploadControls();reject(new Error("فشل الاتصال أثناء رفع الملف إلى ImageKit. تحقق من الإنترنت ثم أعد المحاولة."));};
            xhr.onabort=()=>{activeUploadXHR=null;uploadCurrentState=null;setUploadControls();reject(new Error("تم إلغاء طلب الرفع. ImageKit لا يستكمل هذا الطلب من منتصف الملف؛ أعد المحاولة من البداية."));};
            xhr.send(formData);
        }catch(error){uploadCurrentState=null;activeUploadXHR=null;setUploadControls();reject(error);}
    });
}
// ==========================================
// معلومات الملف
// ==========================================


async function getFileInfo(file){


return new Promise(
(resolve)=>{



if(
file.type.startsWith("video/")
){


const video =
document.createElement("video");



video.preload =
"metadata";



video.onloadedmetadata =
()=>{


resolve({

resolution:

video.videoWidth +
"×" +
video.videoHeight,


size:

(
file.size /
1024 /
1024
)
.toFixed(2)
+
" MB"


});



};



video.src =
URL.createObjectURL(file);



}

else{


const img =
new Image();



img.onload =
()=>{


resolve({

resolution:

img.width +
"×" +
img.height,


size:

(
file.size /
1024 /
1024
)
.toFixed(2)
+
" MB"


});



};



img.src =
URL.createObjectURL(file);



}



});


}

// ==========================================
// إنشاء بيانات الخلفية
// ==========================================


function createWallpaperData(
file,
url,
info,
index,
autoTags=[],
publisher=null
){



const title =

document
.getElementById("wallTitle")
.value
.trim();



let category =

document
.getElementById("wallCategory")
.value
.trim()
.toLowerCase();





const manualTags =
        document.getElementById("wallTags").value
        .split(",")
        .map(tag=>tag.trim().toLowerCase())
        .filter(Boolean);

    const tags = [...new Set([...manualTags,...autoTags])].slice(0,20);



if(!category){

console.warn(
"Category empty, using other"
);

category = "other";

}


return {


title:

title

?

`${title} ${index+1}`

:

file.name.replace(
(/\.[^/.]+$/),
""
),



category,



type:

file.type.startsWith("video/")

?

"video"

:

"image",


is360:
file.type.startsWith("image/") &&
Boolean(document.getElementById("is360")?.checked),



image:

url,



thumbnail:

url,



resolution:

info.resolution,



size:

info.size,



tags,



downloads:

0,


likes:

0,


views:

0,


rating:

0,



popular:

document
.getElementById("popular")
.checked,



todayWallpaper:

document
.getElementById("todayWallpaper")
.checked
&&
index===0,



author:

getPublisherName(publisher),

userId:

String(publisher?.id || "").trim(),



date:

new Date().toISOString()


};



}






// ==========================================
// نشر الخلفيات
// ==========================================


if(form){


form.addEventListener(
"submit",
async(e)=>{


e.preventDefault();

        const publisher = await getCurrentUser();
        if(!publisher){
            alert("يجب تسجيل الدخول قبل نشر الخلفيات");
            return;
        }


if(selectedFiles.length === 0){


alert(
"اختر ملف واحد على الأقل"
);


return;


}




saveWallpaper.disabled = true;


saveWallpaper.textContent =
"جاري الرفع...";





let success = 0;


let failed = 0;



const total =
selectedFiles.length;





// تصفير الشريط

if(uploadProgressBar){

uploadProgressBar.style.width =
"0%";

}



if(uploadProgressText){
    uploadProgressText.textContent =
        `جاهز لرفع ${total} ملفات`;
}

if(uploadOfflineNotice) uploadOfflineNotice.hidden = true;
setUploadNetworkStatus(
    navigator.onLine === false ? "● لا يوجد اتصال" : "● متصل — الرفع جاهز",
    navigator.onLine === false ? "is-offline" : "is-online"
);
setUploadCurrentFile("يتم تجهيز الملفات...");
setUploadRetryInfo("");
setUploadControls();







for(
let i = 0;
i < total;
i++
){



const file =
selectedFiles[i];



try{


// معلومات الملف

const info =
await getFileInfo(file);




// رفع ImageKit

setUploadCurrentFile(
    `الملف ${i+1} من ${total}: ${file.name}`
);

const url = await uploadToImageKit(
    file,
    (percent, loaded, bytesTotal)=>{
        if(uploadProgressBar){
            uploadProgressBar.style.width = percent + "%";
        }

        if(uploadProgressText){
            const loadedMB = (loaded / 1024 / 1024).toFixed(1);
            const totalMB = (bytesTotal / 1024 / 1024).toFixed(1);
            uploadProgressText.textContent =
                `رفع الملف ${i+1}/${total} : ${percent}% · ${loadedMB}/${totalMB} MB`;
        }
    }
);





// إنشاء الوسوم تلقائيًا ثم بناء بيانات الخلفية
            const autoTags = await generateAITags(file);

            const data = createWallpaperData(
                file, url, info, i, autoTags, publisher
            );





// إرسال للسيرفر

const response =

await fetch(

"/api/wallpapers",

{

method:"POST",

headers:{

"Content-Type":

"application/json",

"Authorization":

`Bearer ${currentSession?.access_token || ""}`

},

body:

JSON.stringify(data)

}

);





if(!response.ok){

throw new Error(
"API ERROR"
);

}




success++;




}catch(error){



console.error(
error
);



failed++;


}






// تحديث بعد انتهاء ملف

const totalPercent =

Math.round(

((i+1) / total) * 100

);





if(uploadProgressBar){

uploadProgressBar.style.width =
totalPercent + "%";

}




if(uploadProgressText){

uploadProgressText.textContent =

`اكتمل ${i+1}/${total} (${totalPercent}%)`;

}



}

// ==========================================
// إنهاء النشر
// ==========================================


saveWallpaper.disabled = false;

uploadCurrentState = null;
uploadPausedByUser = false;
uploadWaitingForNetwork = false;
abortActiveUpload("complete");
setUploadControls();
setUploadCurrentFile("لا يوجد رفع حالي");
setUploadRetryInfo("");
if(uploadOfflineNotice) uploadOfflineNotice.hidden = true;

saveWallpaper.textContent =
"🚀 نشر الخلفيات";





alert(

`تم نشر ${success} خلفية، فشل ${failed}`

);





form.reset();

if(is360Input) is360Input.checked = false;
sync360Option();


selectedFiles = [];


renderSelectedFiles();



await loadDashboard();



});


}






// ==========================================
// تعديل الخلفية
// ==========================================


async function editWallpaper(id){


const wall =

wallpapers.find(

w=>String(w.id) === String(id)

);



if(!wall)

return;




document.getElementById(
"wallTitle"
).value =

wall.title || "";




document.getElementById(
"wallCategory"
).value =

wall.category || "";




document.getElementById(
"wallTags"
).value =

(wall.tags || []).join(",");

if(is360Input){
    is360Input.checked = Boolean(wall.is360);
}
sync360Option();





alert(
"تم تحميل بيانات الخلفية للتعديل"
);



}







// ==========================================
// حذف الخلفية
// ==========================================


async function deleteWallpaper(id){


if(
!confirm(
"هل تريد حذف الخلفية؟"
)

)

return;




try{


await fetch(

"/api/wallpapers/"+id,

{

method:"DELETE",

headers:{
"Authorization":`Bearer ${currentSession?.access_token || ""}`
}

}

);



await loadDashboard();



}

catch(error){


console.error(
error
);


alert(
"فشل الحذف"
);



}



}







window.editWallpaper =
editWallpaper;



window.deleteWallpaper =
deleteWallpaper;

// ===============================
// تحديد خلفية
// ===============================

function toggleWallpaperSelect(id,checkbox){

if(checkbox.checked){

selectedWallpapers.add(String(id));

}else{

selectedWallpapers.delete(String(id));

}

}



// ===============================
// حذف متعدد
// ===============================

async function deleteSelectedWallpapers(){


if(selectedWallpapers.size===0){

alert("اختر خلفيات أولا");
return;

}



if(!confirm(
`حذف ${selectedWallpapers.size} خلفية؟`
))

return;



try{


for(const id of selectedWallpapers){


await fetch(

"/api/wallpapers/"+id,

{

method:"DELETE",

headers:{
"Authorization":`Bearer ${currentSession?.access_token || ""}`
}

}

);


}



selectedWallpapers.clear();


await loadDashboard();



alert("تم حذف الخلفيات المحددة");



}catch(error){


console.error(error);

alert("فشل الحذف المتعدد");


}



}



window.toggleWallpaperSelect =
toggleWallpaperSelect;


window.deleteSelectedWallpapers =
deleteSelectedWallpapers;




// ==========================================
// فتح صفحة الخلفيات
// ==========================================


function openWallpapers(){


location.href =
"wallpapers.html";


}



window.openWallpapers =
openWallpapers;

// ==========================================
// فتح صفحة إدارة المستخدمين
// ==========================================

function openUserManagement(){
    location.href = "admin-users.html";
}

window.openUserManagement = openUserManagement;

// ==========================================
// فتح صفحة الإبلاغات
// ==========================================

function openCommunityReports(){
    location.href = "community-reports.html";
}

window.openCommunityReports = openCommunityReports;

// ==========================================
// فتح صفحة نشر الإعلانات
// ==========================================

function openNoticeCreator(){

    location.href =
    "notice-create.html";

}


window.openNoticeCreator =
openNoticeCreator;

// ==========================================
// فتح صفحة الذكاء الاصطناعي
// ==========================================

function openAIControl(){

    location.href =
    "ai-control.html";

}

window.openAIControl =
openAIControl;



// ==========================================
// تشغيل
// ==========================================


loadDashboard();

// ==========================================
// فتح منظم الخلفيات
// ==========================================

function openWallpaperOrganizer(){
    location.href = "organizer.html";
}

window.openWallpaperOrganizer = openWallpaperOrganizer;


