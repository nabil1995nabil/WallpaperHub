import { supabase } from "./supabase.js";

/*
 * WallpaperHub Publish Studio
 * Batch upload progress is aggregated into one shared tracker.
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
let previewObjectUrls = [];
let batchBusy = false;
let pauseRequested = false;
let batchPaused = false;
let resumeBatch = null;
const MAX_FILES = 200;
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg","image/png","image/webp","image/avif"]);

// New wallpaper uploads use DBByte. Existing ImageKit URLs remain valid.


let wallpaperCategoryCatalogPromise = null;
let allowedWallpaperCategoryIds = new Set();

function populateWallpaperCategories(){
  if(wallpaperCategoryCatalogPromise) return wallpaperCategoryCatalogPromise;
  wallpaperCategoryCatalogPromise = (async()=>{
    const select = $("wallCategory");
    try{
      const response = await fetch("/data/categories.json?v=20261128-catalog-2", {cache:"no-store",headers:{Accept:"application/json"}});
      if(!response.ok) throw new Error("HTTP " + response.status);
      const catalog = await response.json();
      if(!Array.isArray(catalog.categories) || !catalog.categories.length) throw new Error("قائمة الأقسام فارغة");
      const groups = new Map((catalog.groups || []).map(group=>[group.id,group.title]));
      allowedWallpaperCategoryIds = new Set(catalog.categories.map(category=>String(category.id)));
      select.replaceChildren(new Option("اختر القسم المناسب",""));
      (catalog.groups || []).forEach(group=>{
        const items = catalog.categories.filter(category=>category.group===group.id);
        if(!items.length) return;
        const optgroup = document.createElement("optgroup");
        optgroup.label = group.title;
        items.forEach(category=>{
          const option = new Option((category.emoji ? category.emoji + " " : "") + category.name, category.id);
          optgroup.appendChild(option);
        });
        select.appendChild(optgroup);
      });
      const ungrouped = catalog.categories.filter(category=>!groups.has(category.group));
      ungrouped.forEach(category=>{
        select.add(new Option((category.emoji ? category.emoji + " " : "") + category.name,category.id));
      });
      select.disabled = false;
      select.dataset.catalogVersion = String(catalog.version || 1);
      return true;
    }catch(error){
      console.error("WALLPAPER CATEGORY CATALOG:",error);
      select.replaceChildren(new Option("تعذر تحميل الأقسام — أعد تحديث الصفحة",""));
      select.disabled = true;
      notify("تعذر تحميل الأقسام. لم نرسل أي خلفية بتصنيف غير معروف.");
      return false;
    }
  })();
  return wallpaperCategoryCatalogPromise;
}

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
function getMimeType(file) {
  const extension = String(file?.name || "").split(".").pop().toLowerCase();
  const byExtension = {
    jpg: "image/jpeg", jpeg: "image/jpeg",
    png: "image/png", webp: "image/webp", avif: "image/avif"
  };
  return ALLOWED.has(file?.type) ? file.type : (byExtension[extension] || "");
}
function isAllowedImage(file) {
  return Boolean(getMimeType(file));
}
function createLocalImageUrl(file) {
  const mimeType=getMimeType(file);
  const previewBlob=file.type===mimeType?file:file.slice(0,file.size,mimeType||"application/octet-stream");
  return URL.createObjectURL(previewBlob);
}
function getUploadBlob(file) {
  const mimeType=getMimeType(file);
  return file.type===mimeType?file:file.slice(0,file.size,mimeType||"application/octet-stream");
}
function fingerprint(file){return `${file.name.toLowerCase()}|${file.size}|${file.lastModified}|${getMimeType(file)}`;}
function clearUploadJobs(){
  for(const job of uploadJobs.values()){
    if(job.xhr && job.xhr.readyState!==4) job.xhr.abort();
    if(job.url) URL.revokeObjectURL(job.url);
  }
  uploadJobs.clear();
}
function clearPreviewUrls(){
  for(const url of previewObjectUrls) URL.revokeObjectURL(url);
  previewObjectUrls=[];
}
function validate(file){
  const errors=[];
  if(!isAllowedImage(file))errors.push("صيغة غير مدعومة؛ GIF غير مسموح");
  if(file.size>MAX_FILE_SIZE)errors.push("أكبر من 100 MB");
  if(!file.size)errors.push("ملف فارغ");
  return errors;
}
async function metadata(file){
  const info={size:bytes(file.size),resolution:"غير متاحة"};
  let url="";
  if(isAllowedImage(file)){
    try{
      url=createLocalImageUrl(file);
      info.resolution=await new Promise((resolve,reject)=>{
        const img=new Image();img.onload=()=>resolve(`${img.naturalWidth}×${img.naturalHeight}`);
        img.onerror=reject;img.src=url;
      });
    }catch{}
    finally{if(url)URL.revokeObjectURL(url);}
  }
  return info;
}
async function addFiles(fileList){
  if(batchBusy)return;
  const incoming=Array.from(fileList||[]);
  const imageFiles=incoming.filter(isAllowedImage);
  const rejected=incoming.length-imageFiles.length;
  let duplicateCount=0;
  let limitReached=false;
  const seen=new Set(selectedFiles.map(fingerprint));
  if(rejected)notify(`تم تجاهل ${rejected} ملف. الصيغ المسموحة: JPG وPNG وWEBP وAVIF فقط؛ GIF غير مسموح.`);
  for(const file of imageFiles){
    const fp=fingerprint(file);
    if(seen.has(fp)){
      duplicateFingerprints.add(fp);
      duplicateCount++;
      continue;
    }
    if(selectedFiles.length>=MAX_FILES){limitReached=true;break;}
    selectedFiles.push(file);
    seen.add(fp);
  }
  filesInput.value="";
  await renderFiles();
  if(limitReached)notify(`وصلت للحد الأقصى: ${MAX_FILES} صورة في الدفعة الواحدة.`);
  else if(duplicateCount)notify(`تم تجاهل ${duplicateCount} صورة مكررة من الاختيار.`);
}
function removeFile(index){
  if(batchBusy)return;
  const file=selectedFiles[index];
  if(file){
    const key=fingerprint(file);
    duplicateFingerprints.delete(key);
    const job=uploadJobs.get(key);
    if(job?.xhr && job.xhr.readyState!==4)job.xhr.abort();
    if(job?.url)URL.revokeObjectURL(job.url);
    uploadJobs.delete(key);
  }
  selectedFiles.splice(index,1);
  renderFiles();
  renderUploadJobs();
}
async function renderFiles(){
  clearPreviewUrls();
  previewGrid.innerHTML="";
  $("fileCount").textContent=selectedFiles.length?`${selectedFiles.length} / ${MAX_FILES} صورة`:"ما تختار حتى صورة";
  $("clearFilesBtn").disabled=selectedFiles.length===0;
  $("queueTotal").textContent=selectedFiles.length;
  $("queueDuplicates").textContent=duplicateFingerprints.size;
  if(!selectedFiles.length){
    previewGrid.innerHTML='<div class="empty-preview"><span>▧</span><p>المعاينة غادي تظهر هنا</p></div>';
    validationList.innerHTML='<p class="muted">اختار صور باش نتحقق منها.</p>';
    $("queueValid").textContent="0";$("wallResolution").value="";$("wallSize").value="";
    $("panoramaPreview").style.backgroundImage="";
    $("panoramaPreview").querySelector("small").textContent="اختار صورة باش تبدا المعاينة";
    $("panoramaPreview").querySelector("span").textContent=$("is360").checked?"360° • ON":"360°";
    return;
  }
  validationList.innerHTML="";let validCount=0;
  const fragment=document.createDocumentFragment();
  for(let i=0;i<selectedFiles.length;i++){
    const file=selectedFiles[i],errors=validate(file),url=createLocalImageUrl(file);
    previewObjectUrls.push(url);
    const card=document.createElement("div");card.className="preview-card";
    const img=document.createElement("img");img.src=url;img.alt=file.name;img.loading="lazy";card.appendChild(img);
    img.onerror=()=>{
      card.classList.add("preview-load-error");
      const warning=document.createElement("span");
      warning.className="preview-image-error";
      warning.textContent="تعذّر عرض الصورة";
      card.appendChild(warning);
    };
    if(i===0){
      $("panoramaPreview").style.backgroundImage=`linear-gradient(#11182733,#11182733),url("${url}")`;
      $("panoramaPreview").style.backgroundPosition=`${panoOffset}% center`;
      $("panoramaPreview").querySelector("small").textContent=file.name;
    }
    const label=document.createElement("span");label.className="file-label";label.textContent=file.name;
    const remove=document.createElement("button");remove.type="button";remove.className="remove-file";remove.textContent="×";
    remove.setAttribute("aria-label",`إزالة ${file.name} من الاختيار`);
    remove.title="إزالة الصورة من قائمة الاختيار";
    remove.addEventListener("click",()=>removeFile(i));
    card.append(label,remove);fragment.appendChild(card);

    const row=document.createElement("div");row.className="validation-row";
    const name=document.createElement("span");name.textContent=file.name;
    const status=document.createElement("span");status.className=`status ${errors.length?"bad":"ok"}`;status.textContent=errors.length?errors.join("، "):"صالحة";
    row.append(name,status);
    if(duplicateFingerprints.has(fingerprint(file))){const dup=document.createElement("span");dup.className="status warn";dup.textContent="مكررة داخل الدفعة";row.appendChild(dup);}
    validationList.appendChild(row);if(!errors.length)validCount++;
  }
  previewGrid.appendChild(fragment);$("queueValid").textContent=validCount;
  const firstFile=selectedFiles[0];
  const info=await metadata(firstFile);
  if(selectedFiles[0]===firstFile){$("wallResolution").value=info.resolution;$("wallSize").value=info.size;}
}
filesInput.addEventListener("change",()=>addFiles(filesInput.files));
["dragenter","dragover"].forEach(n=>dropzone.addEventListener(n,e=>{e.preventDefault();dropzone.classList.add("dragover");}));
["dragleave","drop"].forEach(n=>dropzone.addEventListener(n,e=>{e.preventDefault();dropzone.classList.remove("dragover");}));
dropzone.addEventListener("drop",e=>addFiles(e.dataTransfer.files));
$("clearFilesBtn").addEventListener("click",()=>{
  if(batchBusy)return;
  selectedFiles=[];duplicateFingerprints.clear();clearUploadJobs();renderFiles();renderUploadJobs();
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
  const common={
    religious:["religious","islamic","quran","mosque","faith","spiritual","dua","dhikr"],
    nature:["nature","landscape","scenery","outdoors"],animals:["animals","wildlife","pets"],city:["city","urban","skyline"],
    architecture:["architecture","building","facade"],space:["space","galaxy","stars","cosmos"],"deep-space":["deep space","nebula","galaxy"],
    ocean:["ocean","sea","marine","waves"],mountains:["mountains","landscape","peaks"],flowers:["flowers","botanical","floral"],
    cars:["cars","automotive","vehicle"],sports_cars:["sports cars","supercar","racing"],bikes:["motorcycle","bikes","cycling"],sports:["sports","athlete","stadium"],
    games:["gaming","game","digital art"],anime:["anime","illustration"],ai:["ai","digital art","generative art"],technology:["technology","tech","digital"],
    amoled:["amoled","dark","black wallpaper"],dark:["dark","black","night"],minimal:["minimal","clean design","simple"],
    abstract:["abstract","art","shapes"],colors:["colors","palette","colorful"],"3d":["3d","render","three dimensional"],neon:["neon","glow","lights"],
    cyberpunk:["cyberpunk","neon city","futuristic"],gradients:["gradient","colors","background"],
    snow:["snow","winter","ice"],aurora:["aurora","northern lights","sky"],rain:["rain","weather","moody"],sunset:["sunset","sunrise","golden hour"],
    "4k":["4k","ultra hd","high resolution"],other:["wallpaper","background","creative"]
  };
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
  if(batchBusy)return;
  if(!confirm("واش متأكد بغيتي تمسح البيانات والصور المختارة؟"))return;
  form.reset();selectedFiles=[];duplicateFingerprints.clear();clearUploadJobs();$("titleCount").textContent="0 / 120";renderFiles();renderUploadJobs();
});
function uploadStatusText(status){
  return ({
    queued:"في الانتظار",
    running:"جارٍ الرفع",
    uploaded:"تم الرفع",
    publishing:"جارٍ النشر",
    done:"تم النشر",
    error:"تعذر الإكمال"
  })[status]||status;
}
function updateBatchProgress(){
  const jobs=Array.from(uploadJobs.values());
  if(!jobs.length)return;
  const totalBytes=jobs.reduce((sum,job)=>sum+Math.max(0,job.file.size||0),0);
  let completedWeight=0,uploadedBytes=0;
  for(const job of jobs){
    const size=Math.max(0,job.file.size||0);
    uploadedBytes+=Math.min(size,Math.max(0,job.uploaded||0));
    let ratio=0;
    if(job.status==="done")ratio=1;
    else if(job.result?.url||job.status==="uploaded"||job.status==="publishing")ratio=.9;
    else ratio=Math.max(0,Math.min(1,(job.progress||0)/100))*.9;
    completedWeight+=size*ratio;
  }
  const percent=totalBytes?Math.min(100,completedWeight/totalBytes*100):0;
  const rounded=Math.round(percent);
  const done=jobs.filter(job=>job.status==="done").length;
  const errors=jobs.filter(job=>job.status==="error").length;
  const active=jobs.some(job=>job.status==="running"||job.status==="publishing"||job.status==="queued");
  const allDone=done===jobs.length;
  const allTerminal=jobs.every(job=>["done","error"].includes(job.status));
  $("batchPercent").textContent=`${rounded}%`;
  $("batchProgressFill").style.width=`${percent}%`;
  $("batchProgressTrack").setAttribute("aria-valuenow",String(rounded));
  $("batchFileSummary").textContent=errors
    ? `${done} منشورة · ${errors} فشلت · ${jobs.length} إجمالاً`
    : `${done} من ${jobs.length} خلفية منشورة`;
  $("batchBytes").textContent=`${bytes(uploadedBytes)} / ${bytes(totalBytes)}`;
  $("uploadOverall").textContent=errors
    ? `${done} ناجحة · ${errors} أخطاء`
    : `${done} / ${jobs.length} مكتملة`;
  $("dismissUploadManagerBtn").hidden=!allTerminal;
  if(batchPaused){
    $("uploadManagerTitle").textContent="الرفع متوقف مؤقتاً";
    $("uploadStageText").textContent="توقفت الدفعة بعد اكتمال الملف الجاري. اضغط متابعة لإكمال الصور المتبقية.";
  }else if(pauseRequested){
    $("uploadManagerTitle").textContent="جارٍ إيقاف الرفع بأمان";
    $("uploadStageText").textContent="سيكتمل رفع أو نشر الصورة الحالية، ثم يتوقف قبل الانتقال إلى الصورة التالية.";
  }else if(allDone){
    $("uploadManagerTitle").textContent="اكتمل نشر الدفعة";
    $("uploadStageText").textContent="تم رفع الخلفيات وإرسالها بنجاح.";
  }else if(active&&errors){
    $("uploadManagerTitle").textContent="مستمر رغم تعذر بعض الصور";
    $("uploadStageText").textContent=`تم تجاوز ${errors} صورة فاشلة. الرفع والنشر مستمران للصور المتبقية.`;
  }else if(active){
    $("uploadManagerTitle").textContent="جارٍ تجهيز الخلفيات";
    $("uploadStageText").textContent=jobs.some(job=>job.status==="publishing")?"اكتمل رفع الملفات، جارٍ حفظ الخلفيات في الموقع.":"يتم رفع الصور بالتتابع، ويُحسب التقدم للدفعة كلها.";
  }else if(errors){
    $("uploadManagerTitle").textContent="اكتملت الدفعة مع بعض الأخطاء";
    $("uploadStageText").textContent=`${done} صورة نجحت و${errors} فشلت. يمكنك إزالة الصور الفاشلة من هذه القائمة أو إعادة المحاولة.`;
  }else if(jobs.some(job=>job.status==="uploaded")){
    $("uploadManagerTitle").textContent="تم رفع الصور";
    $("uploadStageText").textContent="جارٍ الانتقال إلى مرحلة النشر في الموقع.";
  }
  updateUploadControls();
  if(batchBusy){
    const button=$("submitBtn");
    button.textContent=batchPaused?"متوقف مؤقتاً":pauseRequested?"جارٍ الإيقاف...":allDone?"اكتمل النشر ✓":`جارٍ العمل ${rounded}%`;
  }
}
function renderUploadJobs(){
  const manager=$("uploadManager"),container=$("uploadItems");
  const jobs=Array.from(uploadJobs.values());
  container.innerHTML="";
  if(!jobs.length){manager.hidden=true;return;}
  manager.hidden=false;
  const fragment=document.createDocumentFragment();
  jobs.forEach(job=>{
    const item=document.createElement("article");item.className=`upload-item ${job.status}`;
    const thumb=document.createElement("div");thumb.className="upload-thumb";
    if(job.url){const img=document.createElement("img");img.src=job.url;img.alt="";thumb.appendChild(img);}
    const main=document.createElement("div");main.className="upload-main";
    const head=document.createElement("div");head.className="upload-file-head";
    const name=document.createElement("div");name.className="upload-file-name";name.textContent=job.file.name;name.title=job.file.name;
    const status=document.createElement("span");status.className=`upload-file-status ${job.status}`;status.textContent=uploadStatusText(job.status);
    head.append(name,status);
    const meta=document.createElement("div");meta.className="upload-meta";meta.textContent=`حجم الصورة: ${bytes(job.file.size)}`;
    main.append(head,meta);
    if(job.error){const error=document.createElement("small");error.className="upload-error";error.textContent=job.error;main.appendChild(error);}
    if(job.status==="error"){
      const removeFailed=document.createElement("button");
      removeFailed.type="button";
      removeFailed.className="upload-remove-failed";
      removeFailed.textContent="حذف من القائمة";
      removeFailed.setAttribute("aria-label",`إزالة ${job.file.name} من قائمة الرفع`);
      removeFailed.addEventListener("click",()=>removeFailedUploadJob(fingerprint(job.file)));
      main.appendChild(removeFailed);
    }
    const state=document.createElement("span");state.className="upload-item-state";state.textContent=job.status==="done"?"✓":job.status==="error"?"!":job.status==="running"||job.status==="publishing"?"…":job.status==="uploaded"?"↑":"·";
    item.append(thumb,main,state);fragment.appendChild(item);
  });
  container.appendChild(fragment);
  updateBatchProgress();
}
$("dismissUploadManagerBtn").addEventListener("click",()=>{$("uploadManager").hidden=true;});

function removeFailedUploadJob(key){
  const job=uploadJobs.get(key);
  if(!job||job.status!=="error")return;
  if(job.xhr&&job.xhr.readyState!==4)return;
  selectedFiles=selectedFiles.filter(file=>fingerprint(file)!==key);
  duplicateFingerprints.delete(key);
  if(job.url)URL.revokeObjectURL(job.url);
  uploadJobs.delete(key);
  renderFiles();
  renderUploadJobs();
  notify("تمت إزالة الصورة الفاشلة من قائمة النشر؛ باقي الصور تواصل المعالجة.");
}

function updateUploadControls(){
  const controls=$("uploadControls");
  const pauseButton=$("pauseUploadBtn");
  const resumeButton=$("resumeUploadBtn");
  const hint=$("uploadControlHint");
  if(!controls||!pauseButton||!resumeButton)return;
  controls.hidden=!batchBusy;
  pauseButton.hidden=!batchBusy||batchPaused;
  resumeButton.hidden=!batchBusy||!batchPaused;
  pauseButton.textContent=pauseRequested?"إلغاء الإيقاف":"⏸ إيقاف مؤقت";
  if(hint){
    hint.textContent=batchPaused
      ?"الرفع متوقف بأمان. اضغط متابعة لإكمال الدفعة."
      :pauseRequested
        ?"سيكتمل الملف الجاري أولاً، ثم يتوقف الرفع."
        :"يتوقف الرفع بعد انتهاء الصورة الحالية للحفاظ على سلامة الملف.";
  }
}
async function pauseAtSafePoint(){
  if(!pauseRequested)return;
  const jobs=Array.from(uploadJobs.values());
  if(jobs.length&&jobs.every(job=>["done","error"].includes(job.status))){
    pauseRequested=false;
    updateUploadControls();
    return;
  }
  pauseRequested=false;
  batchPaused=true;
  updateUploadControls();
  updateBatchProgress();
  await new Promise(resolve=>{resumeBatch=resolve;});
  batchPaused=false;
  updateUploadControls();
  updateBatchProgress();
}
$("pauseUploadBtn").addEventListener("click",()=>{
  if(!batchBusy||batchPaused)return;
  if(pauseRequested){
    pauseRequested=false;
    updateUploadControls();
    updateBatchProgress();
    notify("تم إلغاء طلب الإيقاف المؤقت.");
    return;
  }
  pauseRequested=true;
  updateUploadControls();
  updateBatchProgress();
  notify("سيكتمل الملف الجاري ثم يتوقف الرفع بأمان.");
});
$("resumeUploadBtn").addEventListener("click",()=>{
  if(!batchBusy||!batchPaused||typeof resumeBatch!=="function")return;
  const resume=resumeBatch;
  resumeBatch=null;
  batchPaused=false;
  updateUploadControls();
  updateBatchProgress();
  resume();
});
function setPublishBusy(busy){
  batchBusy=busy;
  if(!busy){
    pauseRequested=false;
    batchPaused=false;
    if(resumeBatch){const resume=resumeBatch;resumeBatch=null;resume();}
  }
  form.setAttribute("aria-busy",String(busy));
  dropzone.classList.toggle("is-busy",busy);
  form.querySelectorAll("input,select,textarea,button").forEach(control=>{
    if(["submitBtn","pauseUploadBtn","resumeUploadBtn"].includes(control.id))return;
    control.disabled=busy;
  });
  updateUploadControls();
  $("submitBtn").disabled=busy;
}
function prepareUploadJobs(files){
  for(const file of files){
    const key=fingerprint(file);
    if(!uploadJobs.has(key)){
      uploadJobs.set(key,{file,url:createLocalImageUrl(file),progress:0,uploaded:0,status:"queued",xhr:null,result:null,error:""});
    }
  }
  renderUploadJobs();
}

let publisherSession = null;
let telegramPublisherAccessToken = "";
let telegramPublisherTokenExpiresAt = 0;
function getTelegramWebApp(){
  const app = window.Telegram?.WebApp;
  return app && typeof app.initData === "string" && app.initData.length ? app : null;
}
async function getAccessToken(){
  const telegramApp = getTelegramWebApp();
  if(telegramApp){
    telegramApp.ready?.();
    telegramApp.expand?.();
    if(telegramPublisherAccessToken && telegramPublisherTokenExpiresAt>Date.now()+60_000){
      return telegramPublisherAccessToken;
    }
    const response = await fetch("/api/telegram/publisher-session",{
      method:"POST",
      headers:{"Content-Type":"application/json","Accept":"application/json"},
      body:JSON.stringify({initData:telegramApp.initData}),
      cache:"no-store"
    });
    const result = await response.json().catch(()=>({success:false,message:"ردّ السيرفر ماشي JSON صالح"}));
    if(!response.ok || !result.success){
      const error = new Error(result.message || "تعذر ربط جلسة Telegram بلوحة النشر.");
      error.code = result.code || "TELEGRAM_SESSION_FAILED";
      throw error;
    }
    telegramPublisherAccessToken = String(result.accessToken || "");
    telegramPublisherTokenExpiresAt = Number(result.expiresAt || 0);
    if(!telegramPublisherAccessToken) throw new Error("السيرفر ما رجعش جلسة نشر صالحة.");
    return telegramPublisherAccessToken;
  }

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
  const inTelegram = Boolean(getTelegramWebApp());
  notice.hidden=false;
  $("roleTitle").textContent=loggedIn?"تم التحقق من حسابك":(inTelegram?"خاصك تربط حساب Telegram":"تسجيل الدخول مطلوب");
  $("roleDescription").textContent=message;
  if(!loggedIn){
    $("publishForm").hidden=true;
    let login=$("publishLoginGate");
    if(!login){
      login=document.createElement("div");login.id="publishLoginGate";login.className="panel";
      login.innerHTML=inTelegram
        ? '<div class="panel-heading"><div><span class="step">!</span><h2>ربط الحساب مطلوب</h2></div></div><p class="muted">خاصك تربط حساب Telegram بحساب WallpaperHub ديالك من البروفايل مرة واحدة، ومن بعد عاود افتح لوحة النشر من البوت.</p><div class="publish-auth-actions"><button type="button" class="primary-btn" id="openProfileToLinkTelegram">فتح البروفايل لربط الحساب</button><a class="outline-btn" href="/">العودة للموقع</a></div>'
        : '<div class="panel-heading"><div><span class="step">!</span><h2>سجّل الدخول للمتابعة</h2></div></div><p class="muted">استعمل نفس حسابك في WallpaperHub. بعد تسجيل الدخول سنرجعك تلقائياً إلى لوحة النشر.</p><div class="publish-auth-actions"><button type="button" class="primary-btn" id="publishGoogleLogin">المتابعة باستخدام Google</button><a class="outline-btn" href="/profile.html">فتح البروفايل</a></div>';
      $("publishForm").before(login);
      login.querySelector("#openProfileToLinkTelegram")?.addEventListener("click",()=>{
        const url = new URL("/profile.html",window.location.origin).toString();
        if(window.Telegram?.WebApp?.openLink) window.Telegram.WebApp.openLink(url);
        else window.open(url,"_blank","noopener,noreferrer");
      });
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
let publisherSessionCheck = null;
async function loadPublisherSession(){
  if(!(await populateWallpaperCategories())) return false;
  // يمنع استدعاءات متزامنة من بدء الصفحة وحدث استعادة الجلسة.
  if(publisherSessionCheck) return publisherSessionCheck;
  publisherSessionCheck = (async()=>{
    try{
      // getSession ينتظر تهيئة عميل Supabase؛ لا نحكم بالخروج قبل استعادة الجلسة.
      let token = await getAccessToken();
      if(!token){
        // محاولة إضافية قصيرة لتجاوز سباق استعادة جلسة OAuth عند فتح الصفحة.
        await new Promise(resolve=>setTimeout(resolve,700));
        token = await getAccessToken();
      }
      if(!token){
        publisherSession=null;
        setProfileGate("ما لقيناش جلسة دخول محفوظة فهاد الصفحة. افتح البروفايل بنفس النطاق وجرب تحديث الصفحة.");
        return false;
      }

      let response, data;
      for(let attempt=0;attempt<2;attempt++){
        response=await fetch("/api/publish/session",{
          headers:{Authorization:`Bearer ${token}`,Accept:"application/json"},
          cache:"no-store"
        });
        data=await response.json().catch(()=>({success:false,message:"ردّ السيرفر ماشي JSON صالح"}));
        if(response.ok && data.success) break;
        // لا نكرر طلباً غير مصرح به؛ إعادة المحاولة فقط لأخطاء السيرفر المؤقتة.
        if(response.status<500 || attempt===1) break;
        await new Promise(resolve=>setTimeout(resolve,500));
      }

      if(!response?.ok || !data?.success){
        const status=response?.status||0;
        if(status===401){
          publisherSession=null;
          setProfileGate("السيرفر ما قبلش جلسة Supabase. حدّث الصفحة، وإذا استمر الخطأ سجّل الخروج والدخول بنفس الحساب.");
        }else{
          // خطأ السيرفر لا يعني أن المستخدم خرج من حسابه؛ لا نعرضه كخطأ تسجيل دخول.
          const notice=$("roleNotice"); notice.hidden=false;
          $("roleTitle").textContent="تعذر التحقق من صلاحيات النشر";
          $("roleDescription").textContent=`الجلسة موجودة، لكن السيرفر رجّع خطأ (${status||"اتصال"}). جرّب بعد قليل؛ إذا تكرر الخطأ يجب فحص سجلات السيرفر لمسار /api/publish/session.`;
          $("publishForm").hidden=true;
          const login=$("publishLoginGate"); if(login) login.hidden=true;
        }
        console.error("PUBLISH SESSION CHECK FAILED",{status:response?.status,message:data?.message});
        return false;
      }

      publisherSession=data;
      $("publishForm").hidden=false;
      const oldGate=$("publishLoginGate");if(oldGate)oldGate.hidden=true;
      $("roleTitle").textContent=data.permissions.canPublishDirectly?"النشر المباشر متاح لحسابك":"إرسال الخلفيات للمراجعة";
      $("roleDescription").textContent=data.permissions.canPublishDirectly
        ?"مرحباً بك، يمكنك نشر الخلفيات مباشرة بصلاحيات حسابك."
        :"ستُرسل الخلفيات إلى قائمة المراجعة، ولن تظهر في الموقع حتى يوافق عليها المشرف.";
      renderPublisherCard(data.user);
      // تعذّر تحميل النقاط لا يجب أن يُحوّل المستخدم إلى شاشة تسجيل الدخول.
      await loadPublisherPoints();
      return true;
    }catch(error){
      console.error("PUBLISH SESSION CHECK ERROR:",error?.message||error);
      const inTelegram = Boolean(getTelegramWebApp());
      if(inTelegram){
        setProfileGate(error?.message || "تعذر التحقق من ربط Telegram. افتح البروفايل واربط حساب Telegram ثم عاود فتح البوت.");
      }else{
        const notice=$("roleNotice"); notice.hidden=false;
        $("roleTitle").textContent="تعذر الاتصال بخدمة التحقق";
        $("roleDescription").textContent=error?.message || "ما قدرناش نوصلو للسيرفر للتحقق من صلاحيات النشر. تحقق من الاتصال وحاول تحديث الصفحة؛ ماشي بالضرورة أن الجلسة سالات.";
        $("publishForm").hidden=true;
        const login=$("publishLoginGate"); if(login) login.hidden=true;
      }
      return false;
    }finally{publisherSessionCheck=null;}
  })();
  return publisherSessionCheck;
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

async function uploadImageToDBByte(file,job){
  const accessToken=await getAccessToken();
  if(!accessToken) throw new Error("انتهت جلسة الدخول؛ سجّل الدخول من جديد.");
  const mimeType=getMimeType(file);
  const uploadBlob=getUploadBlob(file);
  const authResponse=await fetch("/api/publish/dbbyte-upload-url",{
    method:"POST",
    headers:{"Content-Type":"application/json",Authorization:`Bearer ${accessToken}`},
    body:JSON.stringify({fileName:file.name,mimeType,size:file.size})
  });
  const auth=await authResponse.json().catch(()=>({}));
  if(!authResponse.ok||!auth.success||!auth.uploadUrl||!auth.publicUrl){
    throw new Error(auth.message||"تعذر الحصول على رابط الرفع من DBByte.");
  }
  return await new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();job.xhr=xhr;
    xhr.open("PUT",auth.uploadUrl,true);
    xhr.timeout=120000;
    xhr.setRequestHeader("Content-Type",mimeType);
    xhr.upload.onprogress=e=>{
      if(e.lengthComputable){
        job.progress=e.total?e.loaded/e.total*100:0;
        job.uploaded=e.loaded;
        updateBatchProgress();
      }
    };
    xhr.onload=()=>{
      job.xhr=null;
      if(xhr.status>=200&&xhr.status<300){
        job.progress=100;
        job.uploaded=file.size;
        job.result={url:auth.publicUrl,key:auth.key,provider:"dbbyte"};
        resolve(job.result);
      }else{
        let detail="";
        try{
          const body=JSON.parse(xhr.responseText||"{}");
          detail=String(body.message||body.error||"");
        }catch{}
        reject(new Error(detail||`DBByte رفض رفع الصورة (HTTP ${xhr.status}). تحقق من صلاحيات المفتاح وإعداد CORS للـBucket.`));
      }
    };
    xhr.onerror=()=>{job.xhr=null;reject(new Error("تعذر الاتصال برفع DBByte. تحقق من إعداد CORS في Bucket وأن PUT مسموح لنطاق الموقع."));};
    xhr.ontimeout=()=>{job.xhr=null;reject(new Error("انتهت مهلة رفع DBByte بعد دقيقتين. أعد المحاولة لهذه الصورة."));};
    xhr.onabort=()=>{job.xhr=null;reject(new Error("تم إلغاء الرفع"));};
    xhr.send(uploadBlob);
  });
}
async function uploadOne(file){
  const key=fingerprint(file);
  let job=uploadJobs.get(key);
  if(!job){
    job={file,url:createLocalImageUrl(file),progress:0,uploaded:0,status:"queued",xhr:null,result:null,error:""};
    uploadJobs.set(key,job);
  }
  if(["done","uploaded"].includes(job.status)&&job.result?.url)return job;
  job.progress=0;job.uploaded=0;job.status="running";job.error="";job.result=null;
  renderUploadJobs();
  try{
    const result=await uploadImageToDBByte(file,job);
    job.result=result;job.status="uploaded";job.progress=100;job.uploaded=file.size;job.xhr=null;
    renderUploadJobs();
    return job;
  }catch(error){
    job.xhr=null;job.status="error";job.error=error?.message||"تعذر رفع هذه الصورة.";
    renderUploadJobs();
    throw error;
  }
}
function lockPublishForm(locked){
  setPublishBusy(locked);
  if(locked){
    $("uploadManager").hidden=false;
    $("uploadManagerTitle").textContent="يتم تجهيز دفعة الخلفيات";
    $("uploadStageText").textContent="حافظ على الصفحة مفتوحة حتى ينتهي الرفع والنشر.";
  }
}
form.addEventListener("submit",async e=>{
  e.preventDefault();
  if(batchBusy)return;
  if(!publisherSession){notify("يجب تسجيل الدخول أولاً.");return;}
  if(!allowedWallpaperCategoryIds.has(String($("wallCategory").value || ""))){
    notify("اختر قسماً صحيحاً من قائمة الأقسام.");
    $("wallCategory").focus();
    return;
  }

  if(!$("wallTitle").value.trim()){notify("كتب عنوان الخلفية أولاً.");$("wallTitle").focus();return;}
  if(!selectedFiles.length){notify("اختار صورة واحدة على الأقل.");return;}
  const files=selectedFiles.slice();
  const bad=files.filter(file=>validate(file).length);
  if(bad.length){notify(`كاينين ${bad.length} صور غير صالحة. راجع قائمة التحقق.`);return;}
  lockPublishForm(true);
  try{
    prepareUploadJobs(files);
    // Upload every file independently; a failed item must not stop the batch.
    for(const file of files){
      await pauseAtSafePoint();
      const job=uploadJobs.get(fingerprint(file));
      if(!job)continue; // The user may have removed a failed item from the queue.
      if(job.result?.url){
        if(job.status==="error")job.status="uploaded";
        continue;
      }
      try{
        await uploadOne(file);
      }catch(error){
        console.warn("PUBLISH IMAGE UPLOAD FAILED:",file.name,error?.message||error);
        // Keep this item marked as failed and continue to the next image.
      }
      await pauseAtSafePoint();
    }
    await pauseAtSafePoint();
    const tags=$("wallTags").value.split(",").map(x=>x.trim()).filter(Boolean);
    const colors=$("wallColors").value.split(/[ ,]+/).map(x=>x.trim()).filter(Boolean);
    const token=await getAccessToken();
    if(!token)throw new Error("انتهت جلسة الدخول. سجّل الدخول من جديد.");
    // Publish each successfully uploaded image independently.
    for(const file of files){
      await pauseAtSafePoint();
      const job=uploadJobs.get(fingerprint(file));
      if(!job||job.status==="done")continue;
      if(!job.result?.url)continue; // Upload already failed; move on to the next image.
      job.status="publishing";job.error="";renderUploadJobs();
      try{
        const metadataInfo=await metadata(file);
        const payload={
          title:files.length>1?`${$("wallTitle").value.trim()} - ${file.name.replace(/\.[^.]+$/ ,"")}`:$("wallTitle").value.trim(),
          category:$("wallCategory").value,
          type:"image",
          image:job.result.url,
          thumbnail:job.result.url,
          resolution:metadataInfo.resolution,
          size:metadataInfo.size,
          tags,colors,
          device:$("wallDevice").value,
          is360:$("is360").checked,
          scheduledAt:$("scheduleAt").value||null
        };
        const endpoint=publisherSession.permissions.canPublishDirectly?"/api/wallpapers":"/api/publish/submissions";
        const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(payload)});
        const result=await response.json().catch(()=>({success:false,message:"ردّ السيرفر غير صالح."}));
        if(!response.ok||!result.success)throw new Error(result.message||`تعذر إرسال ${file.name}`);
        job.status="done";job.progress=100;job.uploaded=file.size;job.error="";renderUploadJobs();
      }catch(error){
        job.status="error";job.error=error?.message||`تعذر نشر ${file.name}`;
        console.warn("PUBLISH IMAGE SAVE FAILED:",file.name,job.error);
        renderUploadJobs();
      }
      // Keep processing the rest of the queue even when saving this image fails.
      await pauseAtSafePoint();
    }
    const finalJobs=Array.from(uploadJobs.values());
    const successCount=finalJobs.filter(job=>job.status==="done").length;
    const failedCount=finalJobs.filter(job=>job.status==="error").length;
    if(failedCount){
      notify(successCount
        ? `اكتمل نشر ${successCount} صورة؛ ${failedCount} صور فشلت. يمكنك حذف الفاشلة من شريط الرفع.`
        : `تعذر نشر الصور المختارة. ${failedCount} صور فشلت؛ يمكنك حذفها من شريط الرفع أو إعادة المحاولة.`);
    }else if(successCount){
      notify(publisherSession.permissions.canPublishDirectly
        ?"تم نشر الخلفيات واحتساب النقاط."
        :"تم إرسال الخلفيات للمراجعة. ستُحتسب 0.1 نقطة عن كل خلفية بعد قبولها ونشرها.");
    }
    if(successCount)await loadPublisherPoints();
  }catch(error){
    notify(error.message||"وقع خطأ أثناء الرفع أو الإرسال.");
  }finally{
    lockPublishForm(false);
    $("submitBtn").innerHTML=publisherSession?.permissions.canPublishDirectly?"نشر الخلفيات مباشرة <span>↗</span>":"إرسال الخلفيات للمراجعة <span>↗</span>";
  }
});
$("submitBtn").textContent="التحقق من الحساب...";
loadPublisherSession();
supabase.auth.onAuthStateChange((event, session)=>{
  if(event==="INITIAL_SESSION" || event==="SIGNED_IN" || event==="TOKEN_REFRESHED" || event==="USER_UPDATED"){
    // نترك حدث INITIAL_SESSION يكمل استعادة الحالة قبل طلب التحقق من السيرفر.
    queueMicrotask(()=>loadPublisherSession());
  }else if(event==="SIGNED_OUT"){
    publisherSession=null;
    setProfileGate("تم تسجيل الخروج. سجّل الدخول مجدداً للمتابعة.");
  }
});

renderFiles();
