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
const ALLOWED = new Set(["image/jpeg","image/png","image/webp","image/avif","image/gif"]);

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
  if(file.type==="image/gif"||/\.gif$/i.test(file.name))return "gif";
  if(file.type.startsWith("image/"))return "image";
  return "unknown";
}
function fingerprint(file){return `${file.name.toLowerCase()}|${file.size}|${file.lastModified}|${file.type}`;}
function validate(file){
  const errors=[];
  if(!ALLOWED.has(file.type)&&!/\.gif$/i.test(file.name))errors.push("صيغة صورة غير مدعومة");
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
  const imageFiles=incoming.filter(f=>f.type.startsWith("image/")||/\.gif$/i.test(f.name));
  const rejected=incoming.length-imageFiles.length;
  if(rejected)notify(`تم تجاهل ${rejected} ملف غير صوري.`);
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
  return {title:$("wallTitle").value.trim(),description:$("wallDescription").value.trim(),category:$("wallCategory").value,type:$("wallType").value,tags:$("wallTags").value.split(",").map(x=>x.trim()).filter(Boolean),colors:$("wallColors").value.trim(),device:$("wallDevice").value,resolution:$("wallResolution").value,size:$("wallSize").value,is360:$("is360").checked,scheduledAt:$("scheduleAt").value,fileNames:selectedFiles.map(f=>({name:f.name,size:f.size,type:f.type,lastModified:f.lastModified}))};
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
  const done=jobs.filter(j=>j.status==="done").length;
  $("uploadOverall").textContent=`${done} / ${jobs.length} مكتملة`;
  if(!jobs.length)return;
  jobs.forEach(job=>{
    const item=document.createElement("article");item.className="upload-item";
    const thumb=document.createElement("div");thumb.className="upload-thumb";
    const img=document.createElement("img");img.src=job.url;img.alt="";thumb.appendChild(img);
    const main=document.createElement("div");main.className="upload-main";
    const head=document.createElement("div");head.className="upload-file-head";
    const name=document.createElement("div");name.className="upload-file-name";name.textContent=job.file.name;name.title=job.file.name;
    const status=document.createElement("span");status.className=`upload-file-status ${job.status}`;status.textContent=({queued:"في الانتظار",running:"جارٍ الرفع التجريبي",paused:"متوقف مؤقتاً",done:"اكتمل تجريبياً",cancelled:"ملغى",error:"خطأ"}[job.status]||job.status);
    head.append(name,status);
    const meta=document.createElement("div");meta.className="upload-meta";meta.innerHTML=`<span>الحجم: ${bytes(job.file.size)}</span><span>المرفوع: ${bytes(Math.round(job.file.size*job.progress/100))}</span>`;
    const track=document.createElement("div");track.className="upload-progress-track";const fill=document.createElement("span");fill.style.width=`${job.progress}%`;track.appendChild(fill);
    const progressRow=document.createElement("div");progressRow.className="upload-progress-row";
    const percent=document.createElement("span");percent.textContent=`${Math.round(job.progress)}%`;
    const detail=document.createElement("span");detail.textContent=job.status==="done"?"اكتمل النقل التجريبي":job.status==="running"?"جارٍ النقل التجريبي":"تقدم الملف";
    progressRow.append(percent,detail);
    const controls=document.createElement("div");controls.className="upload-controls";
    const pause=document.createElement("button");pause.type="button";pause.className="upload-action";pause.textContent=job.status==="paused"?"▶ متابعة":"⏸ إيقاف";
    pause.disabled=["done","cancelled","error"].includes(job.status);
    pause.addEventListener("click",()=>{job.status=job.status==="paused"?"running":"paused";renderUploadJobs();});
    const retry=document.createElement("button");retry.type="button";retry.textContent="↻ إعادة";retry.disabled=!["error","cancelled"].includes(job.status);
    retry.addEventListener("click",()=>{job.progress=0;job.status="running";startTicker();renderUploadJobs();});
    const cancel=document.createElement("button");cancel.type="button";cancel.className="upload-cancel";cancel.textContent="إلغاء";
    cancel.disabled=["done","cancelled"].includes(job.status);
    cancel.addEventListener("click",()=>{job.status="cancelled";renderUploadJobs();});
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
form.addEventListener("submit",e=>{
  e.preventDefault();
  if(!$("wallTitle").value.trim()){notify("كتب عنوان الخلفية أولاً.");$("wallTitle").focus();return;}
  if(!selectedFiles.length){notify("اختار صورة واحدة على الأقل.");return;}
  const bad=selectedFiles.filter(file=>validate(file).length);
  if(bad.length){notify(`كاينين ${bad.length} صور غير صالحة. راجع قائمة التحقق.`);return;}
  if(!confirm("تنبيه: واجهة الرفع الفعلي غير مربوطة بعد بالسيرفر. تشغيل الأزرار الآن سيعرض محاكاة محلية للتقدم فقط. هل تريد معاينة نظام الرفع؟"))return;
  beginDemoTransfers();
  notify("بدأت معاينة نظام التقدم لكل صورة. هذا ليس رفعاً إلى Cloudinary.");
});
renderFiles();
