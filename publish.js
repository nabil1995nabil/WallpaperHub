import { supabase } from "./supabase.js";

/*
 * WallpaperHub Publish Studio
 * UI queue is implemented per file. Real cloud upload requires the project's upload endpoint.
 */
const $ = (id) => document.getElementById(id);
const form = $("publishForm");
const filesInput = $("wallFiles");
const dropzone = $("dropzone");
const previewGrid = $("previewGrid");
const validationList = $("validationList");
const toast = $("toast");
let selectedFiles = [];
let dragStartX = null;
let panoOffset = 50;
let gyroHandler = null;
let duplicateFingerprints = new Set();
let uploadJobs = new Map();
let uploadTicker = null;
const MAX_FILES = 50;
const MAX_FILE_SIZE = 150 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg","image/png","image/webp","image/avif"]);

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove("show"), 3400);
}
function bytes(n) {
  if (!Number.isFinite(n)) return "";
  const units = ["B","KB","MB","GB"]; let i=0,size=n;
  while(size>=1024&&i<units.length-1){size/=1024;i++;}
  return `${size.toFixed(i?2:0)} ${units[i]}`;
}
function fileType(file) {
  return ALLOWED.has(file.type) ? "image" : "unknown";
}
function fingerprint(file){return `${file.name.toLowerCase()}|${file.size}|${file.lastModified}|${file.type}`;}
function validate(file){
  const errors=[];
  if(!ALLOWED.has(file.type))errors.push("صيغة غير مدعومة؛ GIF غير مسموح");
  if(file.size>MAX_FILE_SIZE)errors.push("أكبر من 150 MB");
  if(!file.size)errors.push("ملف فارغ");
  return errors;
}
async function metadata(file){
  const info={size:bytes(file.size),resolution:"غير متاحة"};
  if(file.type.startsWith("image/")){
    try{
      const url=URL.createObjectURL(file);
      const dims=await new Promise((resolve,reject)=>{
        const img=new Image();img.onload=()=>resolve(`${img.naturalWidth}×${img.naturalHeight}`);
        img.onerror=reject;img.src=url;
      });
      URL.revokeObjectURL(url);info.resolution=dims;
    }catch{}
  }
  return info;
}
async function addFiles(fileList){
  const incoming=Array.from(fileList||[]);
  const imageFiles=incoming.filter(f=>ALLOWED.has(f.type));
  const rejected=incoming.length-imageFiles.length;
  if(rejected)notify(`تم تجاهل ${rejected} ملف. الصيغ المسموحة: JPG وPNG وWEBP وAVIF فقط؛ GIF غير مسموح.`);
  if(selectedFiles.length+imageFiles.length>MAX_FILES){
    notify(`الحد الأقصى هو ${MAX_FILES} صورة في الدفعة الواحدة.`);return;
  }
  for(const file of imageFiles){
    const fp=fingerprint(file);
    if(selectedFiles.some(item=>fingerprint(item)===fp)){duplicateFingerprints.add(fp);continue;}
    selectedFiles.push(file);
  }
  filesInput.value="";
  await renderFiles();
}
function removeFile(index){
  const file=selectedFiles[index];
  if(file){
    const job=uploadJobs.get(fingerprint(file));
    if(job&&job.status==="running")job.status="cancelled";
    uploadJobs.delete(fingerprint(file));
  }
  selectedFiles.splice(index,1);renderFiles();renderUploadJobs();
}
async function renderFiles(){
  previewGrid.innerHTML="";
  $("fileCount").textContent=selectedFiles.length?`${selectedFiles.length} / ${MAX_FILES} صورة`:"ما تختار حتى صورة";
  $("queueTotal").textContent=selectedFiles.length;
  $("queueDuplicates").textContent=duplicateFingerprints.size;
  if(!selectedFiles.length){
    previewGrid.innerHTML='<div class="empty-preview"><span>▧</span><p>المعاينة غادي تظهر هنا</p></div>';
    validationList.innerHTML='<p class="muted">اختار صور باش نتحقق منها.</p>';
    $("queueValid").textContent="0";$("wallResolution").value="";$("wallSize").value="";
    $("panoramaPreview").style.backgroundImage="";return;
  }
  validationList.innerHTML="";let validCount=0;
  const fragment=document.createDocumentFragment();
  for(let i=0;i<selectedFiles.length;i++){
    const file=selectedFiles[i],errors=validate(file),url=URL.createObjectURL(file);
    const card=document.createElement("div");card.className="preview-card";
    const img=document.createElement("img");img.src=url;img.alt=file.name;img.loading="lazy";card.appendChild(img);
    if(i===0){
      $("panoramaPreview").style.backgroundImage=`linear-gradient(#11182733,#11182733),url("${url}")`;
      $("panoramaPreview").style.backgroundPosition=`${panoOffset}% center`;
      $("panoramaPreview").querySelector("small").textContent=file.name;
    }
    const label=document.createElement("span");label.className="file-label";label.textContent=file.name;
    const remove=document.createElement("button");remove.type="button";remove.className="remove-file";remove.textContent="×";
    remove.setAttribute("aria-label",`حذف ${file.name}`);remove.addEventListener("click",()=>removeFile(i));
    card.append(label,remove);fragment.appendChild(card);

    const row=document.createElement("div");row.className="validation-row";
    const name=document.createElement("span");name.textContent=file.name;
    const status=document.createElement("span");status.className=`status ${errors.length?"bad":"ok"}`;status.textContent=errors.length?errors.join("، "):"صالحة";
    row.append(name,status);
    if(duplicateFingerprints.has(fingerprint(file))){const dup=document.createElement("span");dup.className="status warn";dup.textContent="مكررة داخل الدفعة";row.appendChild(dup);}
    validationList.appendChild(row);if(!errors.length)validCount++;
  }
  previewGrid.appendChild(fragment);$("queueValid").textContent=validCount;
  const info=await metadata(selectedFiles[0]);$("wallResolution").value=info.resolution;$("wallSize").value=info.size;
}
filesInput.addEventListener("change",()=>addFiles(filesInput.files));
["dragenter","dragover"].forEach(n=>dropzone.addEventListener(n,e=>{e.preventDefault();dropzone.classList.add("dragover");}));
["dragleave","drop"].forEach(n=>dropzone.addEventListener(n,e=>{e.preventDefault();dropzone.classList.remove("dragover");}));
dropzone.addEventListener("drop",e=>addFiles(e.dataTransfer.files));
$("clearFilesBtn").addEventListener("click",()=>{
  selectedFiles=[];duplicateFingerprints.clear();uploadJobs.clear();renderFiles();renderUploadJobs();
});
$("wallType").value="auto";
$("wallType").addEventListener("change",()=>{$("wallType").value="image";});
$("titleCount").textContent="0 / 120";
$("wallTitle").addEventListener("input",e=>$("titleCount").textContent=`${e.target.value.length} / 120`);
$("phonePreviewBtn").addEventListener("click",e=>{const on=previewGrid.classList.toggle("phone-mode");e.currentTarget.setAttribute("aria-pressed",String(on));});
$("cropBtn").addEventListener("click",e=>{const on=previewGrid.classList.toggle("crop-mode");e.currentTarget.setAttribute("aria-pressed",String(on));});
$("is360").addEventListener("change",e=>{ $("panoramaPreview").querySelector("span").textContent=e.target.checked?"360° • ON":"360°";notify(e.target.checked?"تم تفعيل معاينة 360°. تأكد أن الصورة بانورامية فعلاً.":"تم إيقاف وضع 360°.");});
$("panoramaPreview").addEventListener("pointerdown",e=>{dragStartX=e.clientX;e.currentTarget.setPointerCapture?.(e.pointerId);});
$("panoramaPreview").addEventListener("pointermove",e=>{if(dragStartX===null)return;const dx=e.clientX-dragStartX;panoOffset=Math.max(0,Math.min(100,panoOffset-dx*.25));$("panoramaPreview").style.backgroundPosition=`${panoOffset}% center`;dragStartX=e.clientX;});
["pointerup","pointercancel","pointerleave"].forEach(n=>$("panoramaPreview").addEventListener(n,()=>dragStartX=null));
$("gyroBtn").addEventListener("click",async()=>{
  try{
    if(!("DeviceOrientationEvent"in window))throw new Error("unsupported");
    if(typeof DeviceOrientationEvent.requestPermission==="function"){
      const permission=await DeviceOrientationEvent.requestPermission();if(permission!=="granted")throw new Error("denied");
    }
    if(gyroHandler){window.removeEventListener("deviceorientation",gyroHandler);gyroHandler=null;$("gyroStatus").textContent="الجيروسكوب متوقف";$("gyroBtn").textContent="◎ تفعيل الجيروسكوب";return;}
    gyroHandler=e=>{if(typeof e.gamma!=="number")return;panoOffset=Math.max(0,Math.min(100,50+e.gamma*.8));$("panoramaPreview").style.backgroundPosition=`${panoOffset}% center`;};
    window.addEventListener("deviceorientation",gyroHandler);$("gyroStatus").textContent="الجيروسكوب مفعّل — حرّك هاتفك";$("gyroBtn").textContent="إيقاف الجيروسكوب";
  }catch{$("gyroStatus").textContent="غير متاح في هذا الجهاز أو يحتاج إذناً";notify("الجيروسكوب يحتاج جهازاً ومتصفحاً يدعمان المستشعر واتصال HTTPS.");}
});
function proposeTags(){
  const category=$("wallCategory").value,title=$("wallTitle").value||selectedFiles[0]?.name.replace(/\.[^.]+$/,"")||"";
  const common={nature:["nature","landscape","scenery","outdoors"],cars:["cars","automotive","vehicle"],games:["gaming","game","digital art"],space:["space","galaxy","stars","cosmos"],ai:["ai","digital art","generative art"],amoled:["amoled","dark","black wallpaper"],animals:["animals","wildlife"],anime:["anime","illustration"],city:["city","urban","architecture"],sports:["sports","athlete"],"4k":["4k","high resolution"],minimal:["minimal","clean design"],rain:["rain","weather","moody"],sunset:["sunset","sky","golden hour"],architecture:["architecture","building"]};
  const fromTitle=title.toLowerCase().split(/[\s_-]+/).filter(x=>x.length>2);
  $("wallTags").value=[...new Set([...(common[category]||[]),...fromTitle])].slice(0,15).join(", ");
}
$("suggestTagsBtn").addEventListener("click",()=>{proposeTags();notify("تم اقتراح وسوم أولية. راجعها قبل الإرسال.");});
$("aiBtn").addEventListener("click",()=>{
  proposeTags();const name=selectedFiles[0]?.name||$("wallTitle").value;
  if(!$("wallTitle").value&&name)$("wallTitle").value=name.replace(/\.[^.]+$/,"").replace(/[_-]+/g," ");
  $("aiStatus").textContent="اقتراحات أولية من اسم الملف والقسم؛ الذكاء الاصطناعي الحقيقي يحتاج خدمة مرتبطة بالسيرفر.";
  $("titleCount").textContent=`${$("wallTitle").value.length} / 120`;notify("اقتراحات أولية جاهزة للمراجعة.");
});
function draftPayload(){
  const selectedType = "image";
  return {title:$("wallTitle").value.trim(),category:$("wallCategory").value,type:selectedType,tags:$("wallTags").value.split(",").map(x=>x.trim()).filter(Boolean),colors:$("wallColors").value.trim(),device:$("wallDevice").value,resolution:$("wallResolution").value,size:$("wallSize").value,is360:$("is360").checked,scheduledAt:$("scheduleAt").value,fileNames:selectedFiles.map(f=>({name:f.name,size:f.size,type:f.type,lastModified:f.lastModified}))};
}
$("saveDraftBtn").addEventListener("click",()=>{
  const data=draftPayload();if(!data.title&&!selectedFiles.length){notify("أدخل عنواناً أو اختر صورة قبل حفظ المسودة.");return;}
  try{localStorage.setItem("wallpaperhub-publish-draft",JSON.stringify({...data,savedAt:new Date().toISOString()}));notify("تم حفظ بيانات المسودة محلياً؛ الملفات نفسها لم تُرفع.");}catch{notify("تعذر حفظ المسودة في المتصفح.");}
});
$("resetBtn").addEventListener("click",()=>{
  if(!confirm("واش متأكد بغيتي تمسح البيانات والصور المختارة؟"))return;
  form.reset();selectedFiles=[];duplicateFingerprints.clear();uploadJobs.clear();$("titleCount").textContent="0 / 120";renderFiles();renderUploadJobs();
});
function renderUploadJobs(){
  const manager=$("uploadManager"),container=$("uploadItems");
  const jobs=Array.from(uploadJobs.values());
  manager.hidden=jobs.length===0;container.innerHTML="";
  const done=jobs.filter(j=>j.status==="done"||j.status==="uploaded").length;
  $("uploadOverall").textContent=`${done} / ${jobs.length} مكتملة`;
  if(!jobs.length)return;
  jobs.forEach(job=>{
    const item=document.createElement("article");item.className="upload-item";
    const thumb=document.createElement("div");thumb.className="upload-thumb";
    const img=document.createElement("img");img.src=job.url;img.alt="";thumb.appendChild(img);
    const main=document.createElement("div");main.className="upload-main";
    const head=document.createElement("div");head.className="upload-file-head";
    const name=document.createElement("div");name.className="upload-file-name";name.textContent=job.file.name;name.title=job.file.name;
    const status=document.createElement("span");status.className=`upload-file-status ${job.status}`;status.textContent=({queued:"في الانتظار",running:"جارٍ الرفع",paused:"متوقف مؤقتاً",uploaded:"تم الرفع",done:"تم الإرسال",cancelled:"ملغى",error:"خطأ"}[job.status]||job.status);
    head.append(name,status);
    const meta=document.createElement("div");meta.className="upload-meta";meta.innerHTML=`<span>الحجم: ${bytes(job.file.size)}</span><span>المرفوع: ${bytes(Math.round(job.file.size*job.progress/100))}</span>`;
    const track=document.createElement("div");track.className="upload-progress-track";const fill=document.createElement("span");fill.style.width=`${job.progress}%`;track.appendChild(fill);
    const progressRow=document.createElement("div");progressRow.className="upload-progress-row";
    const percent=document.createElement("span");percent.textContent=`${Math.round(job.progress)}%`;
    const detail=document.createElement("span");detail.textContent=job.status==="done"?"تم الإرسال":job.status==="uploaded"?"تم رفع الملف":job.status==="running"?"جارٍ الرفع الفعلي":"تقدم الملف";
    progressRow.append(percent,detail);
    const controls=document.createElement("div");controls.className="upload-controls";
    const pause=document.createElement("button");pause.type="button";pause.className="upload-action";pause.textContent=job.status==="paused"?"▶ متابعة":"⏸ إيقاف";
    pause.disabled=["done","uploaded","cancelled","error"].includes(job.status);
    pause.addEventListener("click",()=>{
      if(job.status==="running"&&job.xhr){job.status="paused";job.xhr.abort();job.error="توقف الرفع؛ إعادة المتابعة تبدأ الملف من جديد";renderUploadJobs();}
      else if(job.status==="paused"){job.progress=0;job.uploaded=0;job.status="queued";uploadImageToCloudinary(job.file,job).then(data=>{job.status="uploaded";job.result=data;renderUploadJobs();}).catch(()=>{if(job.status!=="cancelled"){job.status="error";renderUploadJobs();}});renderUploadJobs();}
    });
    const retry=document.createElement("button");retry.type="button";retry.textContent="↻ إعادة";retry.disabled=!["error","cancelled","paused"].includes(job.status);
    retry.addEventListener("click",()=>{
      job.progress=0;job.uploaded=0;job.status="running";
      uploadImageToCloudinary(job.file,job).then(data=>{job.status="uploaded";job.result=data;renderUploadJobs();}).catch(()=>{if(job.status!=="cancelled"){job.status="error";renderUploadJobs();}});
      renderUploadJobs();
    });
    const cancel=document.createElement("button");cancel.type="button";cancel.className="upload-cancel";cancel.textContent="إلغاء";
    cancel.disabled=["done","uploaded","cancelled"].includes(job.status);
    cancel.addEventListener("click",()=>{job.status="cancelled";if(job.xhr)job.xhr.abort();renderUploadJobs();});
    controls.append(pause,retry,cancel);main.append(head,meta,track,progressRow,controls);item.append(thumb,main);container.appendChild(item);
  });
}
function startTicker(){
  if(uploadTicker)return;
  uploadTicker=setInterval(()=>{
    let active=false;
    for(const job of uploadJobs.values()){
      if(job.status!=="running")continue;
      active=true;job.progress=Math.min(100,job.progress+Math.max(1,Math.random()*5));
      if(job.progress>=100){job.progress=100;job.status="done";}
    }
    renderUploadJobs();
    if(!active){clearInterval(uploadTicker);uploadTicker=null;}
  },350);
}
function beginDemoTransfers(){
  uploadJobs.clear();
  selectedFiles.forEach(file=>uploadJobs.set(fingerprint(file),{file,url:URL.createObjectURL(file),progress:0,status:"running"}));
  renderUploadJobs();startTicker();
}
const CLOUDINARY_CLOUD_NAME = "ls9wdurp";
const CLOUDINARY_UPLOAD_PRESET = "wallpaperhub_upload";
let publisherSession = null;
async function getAccessToken(){
  const { data, error } = await supabase.auth.getSession();
  if(error) throw error;
  return data?.session?.access_token || "";
}
async function startGoogleLogin(){
  const { error } = await supabase.auth.signInWithOAuth({
    provider:"google",
    options:{ redirectTo: window.location.origin + "/publish.html" }
  });
  if(error) throw error;
}

function setProfileGate(message,loggedIn=false){
  const notice=$("roleNotice");
  notice.hidden=false;
  $("roleTitle").textContent=loggedIn?"تم التحقق من حسابك":"تسجيل الدخول مطلوب";
  $("roleDescription").textContent=message;
  if(!loggedIn){
    $("publishForm").hidden=true;
    let login=$("publishLoginGate");
    if(!login){
      login=document.createElement("div");login.id="publishLoginGate";login.className="panel";
      login.innerHTML='<div class="panel-heading"><div><span class="step">!</span><h2>سجّل الدخول للمتابعة</h2></div></div><p class="muted">استعمل نفس حسابك في WallpaperHub. بعد تسجيل الدخول سنرجعك تلقائياً إلى لوحة النشر.</p><div class="publish-auth-actions"><button type="button" class="primary-btn" id="publishGoogleLogin">المتابعة باستخدام Google</button><a class="outline-btn" href="/profile.html">فتح البروفايل</a></div>';
      $("publishForm").before(login);
      login.querySelector("#publishGoogleLogin")?.addEventListener("click",async()=>{
        const btn=login.querySelector("#publishGoogleLogin");
        btn.disabled=true;btn.textContent="جارٍ تحويلك لتسجيل الدخول...";
        try{await startGoogleLogin();}
        catch(error){notify(error.message||"تعذر بدء تسجيل الدخول");btn.disabled=false;btn.textContent="المتابعة باستخدام Google";}
      });
    }
    login.hidden=false;
  }
}
async function loadPublisherSession(){
  try{
    const token=await getAccessToken();
    if(!token){setProfileGate("ما كايناش جلسة دخول نشطة. سجّل الدخول بنفس حساب البروفايل.");return false;}
    const response=await fetch("/api/publish/session",{headers:{Authorization:`Bearer ${token}`}});
    const data=await response.json();
    if(!response.ok||!data.success)throw new Error(data.message||"تعذر التحقق من الحساب");
    publisherSession=data;
    $("publishForm").hidden=false;
    const oldGate=$("publishLoginGate");if(oldGate)oldGate.hidden=true;
    $("roleTitle").textContent=data.permissions.canPublishDirectly?"النشر المباشر متاح لحسابك":"إرسال الخلفيات للمراجعة";
    $("roleDescription").textContent=data.permissions.canPublishDirectly
      ?"مرحباً بك، يمكنك نشر الخلفيات مباشرة بصلاحيات حسابك."
      :"ستُرسل الخلفيات إلى قائمة المراجعة، ولن تظهر في الموقع حتى يوافق عليها المشرف.";
    renderPublisherCard(data.user);
    await loadPublisherPoints();
    return true;
  }catch(error){setProfileGate(error.message||"انتهت جلسة الدخول. سجّل الدخول مجدداً.");return false;}
}
function renderPublisherCard(user){
  let card=$("publisherProfileCard");
  if(!card){
    card=document.createElement("section");card.id="publisherProfileCard";card.className="panel publisher-profile-card";
    card.innerHTML='<div class="publisher-avatar-wrap"><img id="publisherAvatar" alt="صورة الحساب"><span class="publisher-online-dot"></span></div><div class="publisher-profile-data"><strong id="publisherName"></strong><span id="publisherUsername"></span><span id="publisherEmail"></span><a href="/profile.html" class="publisher-profile-link">تعديل بيانات البروفايل</a></div><span class="publisher-role" id="publisherRole"></span><div class="publisher-points" id="publisherPointsCard"><div><small>رصيد النقاط</small><strong id="publisherPointsValue">—</strong></div><span><b id="publisherPublishedCount">—</b> خلفية احتُسبت</span><small class="publisher-points-note">كل خلفية منشورة ومقبولة = 0.1 نقطة</small></div>';
    const slot = $("publisherAccountSlot");
    if (slot) slot.appendChild(card);
    else $("roleNotice").after(card);
  }
  const img=$("publisherAvatar");
  img.src=user.avatar_url||"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='32' fill='%23edf2ff'/%3E%3Ccircle cx='32' cy='23' r='12' fill='%2397a9e8'/%3E%3Cpath d='M10 60c2-15 10-22 22-22s20 7 22 22' fill='%2397a9e8'/%3E%3C/svg%3E";
  const fallbackName = String(user.email || "").split("@")[0] || "مستخدم";
  const displayName = String(user.full_name || user.name || user.username || fallbackName).trim();
  $("publisherName").textContent = displayName || "مستخدم";
  $("publisherUsername").textContent = user.username
    ? `@${user.username}`
    : (user.full_name || user.name || displayName || "أكمل اسم المستخدم من البروفايل");
  $("publisherEmail").textContent=user.email||"";
  $("publisherRole").textContent=publisherSession.permissions.canPublishDirectly?"نشر مباشر":"إرسال للمراجعة";
}
async function loadPublisherPoints(){
  const value=$("publisherPointsValue"), count=$("publisherPublishedCount");
  if(!value||!count)return;
  try{
    const token=await getAccessToken();
    if(!token)throw new Error("missing_session");
    const response=await fetch("/api/publish/points",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
    const result=await response.json();
    if(!response.ok||!result.success)throw new Error(result.message||"تعذر تحميل النقاط");
    value.textContent=Number(result.points?.points||0).toFixed(1);
    count.textContent=String(Number(result.points?.wallpapers_count||0));
  }catch(error){
    value.textContent="—";count.textContent="—";
    console.warn("PUBLISH POINTS UI:",error.message||error);
  }
}

async function uploadImageToCloudinary(file,job){
  const formData=new FormData();
  formData.append("file",file);formData.append("upload_preset",CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder","wallpaperhub");
  return await new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();
    job.xhr=xhr;
    xhr.open("POST",`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);
    xhr.upload.onprogress=e=>{
      if(e.lengthComputable){job.progress=e.total?e.loaded/e.total*100:0;job.uploaded=e.loaded;renderUploadJobs();}
    };
    xhr.onload=()=>{
      let data={};try{data=JSON.parse(xhr.responseText||"{}")}catch{}
      if(xhr.status>=200&&xhr.status<300&&data.secure_url){
        job.progress=100;job.status="uploaded";job.uploaded=file.size;job.result=data;renderUploadJobs();resolve(data);
      }else reject(new Error(data.error?.message||`فشل رفع ${file.name}`));
    };
    xhr.onerror=()=>reject(new Error("تعذر الاتصال بخدمة رفع الصور"));
    xhr.onabort=()=>reject(new Error("تم إلغاء الرفع"));
    xhr.send(formData);
  });
}
function uploadOne(file){
  const job={file,url:URL.createObjectURL(file),progress:0,uploaded:0,status:"running",xhr:null};
  uploadJobs.set(fingerprint(file),job);renderUploadJobs();
  return uploadImageToCloudinary(file,job).catch(error=>{
    if(job.status!=="paused"&&job.status!=="cancelled"){job.status="error";job.error=error.message;renderUploadJobs();}
    throw error;
  });
}
form.addEventListener("submit",async e=>{
  e.preventDefault();
  if(!publisherSession){notify("يجب تسجيل الدخول أولاً.");return;}
  if(!$("wallTitle").value.trim()){notify("كتب عنوان الخلفية أولاً.");$("wallTitle").focus();return;}
  if(!selectedFiles.length){notify("اختار صورة واحدة على الأقل.");return;}
  const bad=selectedFiles.filter(file=>validate(file).length);
  if(bad.length){notify(`كاينين ${bad.length} صور غير صالحة. راجع قائمة التحقق.`);return;}
  const submit=$("submitBtn");submit.disabled=true;
  const originalText=submit.textContent;
  try{
    for(const file of selectedFiles){
      const job=uploadJobs.get(fingerprint(file));
      if(job?.status==="uploaded"&&job.result?.secure_url)continue;
      await uploadOne(file);
    }
    const tags=$("wallTags").value.split(",").map(x=>x.trim()).filter(Boolean);
    const colors=$("wallColors").value.split(/[,\s]+/).map(x=>x.trim()).filter(Boolean);
    const token=await getAccessToken();
    if(!token) throw new Error("انتهت جلسة الدخول. سجّل الدخول من جديد.");
    for(const file of selectedFiles){
      const job=uploadJobs.get(fingerprint(file));
      if(!job?.result?.secure_url)throw new Error(`لم يكتمل رفع ${file.name}`);
      const metadataInfo=await metadata(file);
      const payload={
        title:selectedFiles.length>1?`${$("wallTitle").value.trim()} - ${file.name.replace(/\.[^.]+$/,"")}`:$("wallTitle").value.trim(),
        category:$("wallCategory").value,
        type:"image",
        image:job.result.secure_url,
        thumbnail:job.result.secure_url,
        resolution:metadataInfo.resolution,
        size:metadataInfo.size,
        tags,colors,
        device:$("wallDevice").value,
        is360:$("is360").checked,
        scheduledAt:$("scheduleAt").value||null
      };
      const endpoint=publisherSession.permissions.canPublishDirectly?"/api/wallpapers":"/api/publish/submissions";
      const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(payload)});
      const result=await response.json();
      if(!response.ok||!result.success)throw new Error(result.message||`تعذر إرسال ${file.name}`);
      job.status="done";job.progress=100;job.uploaded=file.size;renderUploadJobs();
    }
    notify(publisherSession.permissions.canPublishDirectly?"تم نشر الخلفيات واحتساب النقاط.":"تم إرسال الخلفيات للمراجعة. ستُحتسب 0.1 نقطة عن كل خلفية بعد قبولها ونشرها.");
    await loadPublisherPoints();
  }catch(error){
    notify(error.message||"وقع خطأ أثناء الرفع أو الإرسال.");
  }finally{
    submit.disabled=false;submit.innerHTML=publisherSession?.permissions.canPublishDirectly?"نشر الخلفيات مباشرة <span>↗</span>":"إرسال الخلفيات للمراجعة <span>↗</span>";
  }
});
$("submitBtn").textContent="التحقق من الحساب...";
loadPublisherSession();
supabase.auth.onAuthStateChange((event, session)=>{
  if(event==="SIGNED_IN" || event==="TOKEN_REFRESHED"){
    setTimeout(()=>loadPublisherSession(),0);
  }else if(event==="SIGNED_OUT"){
    publisherSession=null;
    setProfileGate("تم تسجيل الخروج. سجّل الدخول مجدداً للمتابعة.");
  }
});

renderFiles();
