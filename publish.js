/*
 * WallpaperHub Publish Studio
 * Front-end scaffold. Backend authorization and final publishing integration
 * must be connected to the existing project's server routes before production use.
 */
const $ = (id) => document.getElementById(id);
const form = $("publishForm");
const filesInput = $("wallFiles");
const dropzone = $("dropzone");
const previewGrid = $("previewGrid");
const validationList = $("validationList");
const toast = $("toast");
let selectedFiles = [];
let paused = false;
let dragStartX = null;
let panoOffset = 50;
let gyroHandler = null;
let duplicateFingerprints = new Set();
const MAX_FILES = 100;
const MAX_FILE_SIZE = 150 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg","image/png","image/webp","image/avif","image/gif","video/mp4","video/webm","video/quicktime"]);

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove("show"), 3400);
}
function bytes(n) {
  if (!Number.isFinite(n)) return "";
  const units = ["B","KB","MB","GB"];
  let i = 0, size = n;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(i ? 2 : 0)} ${units[i]}`;
}
function fileType(file) {
  if (file.type === "image/gif" || /\.gif$/i.test(file.name)) return "gif";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  return "unknown";
}
function safeName(name) {
  return String(name).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function fingerprint(file) {
  return `${file.name.toLowerCase()}|${file.size}|${file.lastModified}|${file.type}`;
}
function validate(file) {
  const errors = [];
  if (!ALLOWED.has(file.type) && !/\.gif$/i.test(file.name)) errors.push("نوع ملف غير مدعوم");
  if (file.size > MAX_FILE_SIZE) errors.push("الملف أكبر من 150 MB");
  if (!file.size) errors.push("الملف فارغ");
  return errors;
}
async function metadata(file) {
  const info = {size:bytes(file.size),resolution:"غير متاحة"};
  if (file.type.startsWith("image/")) {
    try {
      const url = URL.createObjectURL(file);
      const dims = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(`${img.naturalWidth}×${img.naturalHeight}`);
        img.onerror = reject;
        img.src = url;
      });
      URL.revokeObjectURL(url);
      info.resolution = dims;
    } catch {}
  } else if (file.type.startsWith("video/")) {
    try {
      const url = URL.createObjectURL(file);
      const dims = await new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => resolve(`${video.videoWidth}×${video.videoHeight}`);
        video.onerror = reject;
        video.src = url;
      });
      URL.revokeObjectURL(url);
      info.resolution = dims;
    } catch {}
  }
  return info;
}
async function addFiles(fileList) {
  const incoming = Array.from(fileList || []);
  if (selectedFiles.length + incoming.length > MAX_FILES) {
    notify(`الحد الأقصى هو ${MAX_FILES} ملفاً في الدفعة الواحدة.`);
    return;
  }
  for (const file of incoming) {
    const fp = fingerprint(file);
    if (selectedFiles.some(item => fingerprint(item) === fp)) {
      duplicateFingerprints.add(fp);
      continue;
    }
    selectedFiles.push(file);
  }
  filesInput.value = "";
  await renderFiles();
}
function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderFiles();
}
async function renderFiles() {
  previewGrid.innerHTML = "";
  $("fileCount").textContent = selectedFiles.length ? `${selectedFiles.length} ملف مختار` : "ما تختار حتى ملف";
  $("queueTotal").textContent = selectedFiles.length;
  $("queueDuplicates").textContent = duplicateFingerprints.size;
  if (!selectedFiles.length) {
    previewGrid.innerHTML = '<div class="empty-preview"><span>▧</span><p>المعاينة غادي تظهر هنا</p></div>';
    validationList.innerHTML = '<p class="muted">اختار ملفات باش نتحقق منها.</p>';
    $("queueValid").textContent = "0";
    $("wallResolution").value = "";
    $("wallSize").value = "";
    $("panoramaPreview").style.backgroundImage = "";
    return;
  }
  validationList.innerHTML = "";
  let validCount = 0;
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];
    const errors = validate(file);
    const card = document.createElement("div");
    card.className = "preview-card";
    card.dataset.index = i;
    const url = URL.createObjectURL(file);
    if (fileType(file) === "video") {
      const video = document.createElement("video");
      video.src = url; video.muted = true; video.loop = true; video.playsInline = true; video.preload = "metadata";
      card.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = url; img.alt = file.name; img.loading = "lazy";
      card.appendChild(img);
      if (i === 0 && file.type.startsWith("image/")) {
        $("panoramaPreview").style.backgroundImage = `linear-gradient(#11182733,#11182733),url("${url}")`;
        $("panoramaPreview").style.backgroundPosition = `${panoOffset}% center`;
        $("panoramaPreview").querySelector("small").textContent = file.name;
      }
    }
    const label = document.createElement("span");
    label.className = "file-label";
    label.textContent = `${fileType(file).toUpperCase()} · ${file.name}`;
    const remove = document.createElement("button");
    remove.type = "button"; remove.className = "remove-file"; remove.textContent = "×";
    remove.setAttribute("aria-label", `حذف ${file.name}`);
    remove.addEventListener("click", () => removeFile(i));
    card.append(label, remove);
    fragment.appendChild(card);

    const row = document.createElement("div");
    row.className = "validation-row";
    const name = document.createElement("span");
    name.textContent = file.name;
    const status = document.createElement("span");
    status.className = `status ${errors.length ? "bad" : "ok"}`;
    status.textContent = errors.length ? errors.join("، ") : "صالح";
    row.append(name, status);
    if (duplicateFingerprints.has(fingerprint(file))) {
      const dup = document.createElement("span");
      dup.className = "status warn";
      dup.textContent = "احتمال تكرار";
      row.appendChild(dup);
    }
    validationList.appendChild(row);
    if (!errors.length) validCount++;
  }
  previewGrid.appendChild(fragment);
  $("queueValid").textContent = validCount;
  const info = await metadata(selectedFiles[0]);
  $("wallResolution").value = info.resolution;
  $("wallSize").value = info.size;
  if ($("wallType").value === "auto") $("wallType").value = fileType(selectedFiles[0]) === "unknown" ? "image" : fileType(selectedFiles[0]);
}
filesInput.addEventListener("change", () => addFiles(filesInput.files));
["dragenter","dragover"].forEach(eventName => dropzone.addEventListener(eventName, e => {
  e.preventDefault(); dropzone.classList.add("dragover");
}));
["dragleave","drop"].forEach(eventName => dropzone.addEventListener(eventName, e => {
  e.preventDefault(); dropzone.classList.remove("dragover");
}));
dropzone.addEventListener("drop", e => addFiles(e.dataTransfer.files));
$("clearFilesBtn").addEventListener("click", () => { selectedFiles=[]; duplicateFingerprints.clear(); renderFiles(); });
$("titleCount").textContent = "0 / 120";
$("wallTitle").addEventListener("input", e => $("titleCount").textContent = `${e.target.value.length} / 120`);
$("phonePreviewBtn").addEventListener("click", e => {
  const on = previewGrid.classList.toggle("phone-mode");
  e.currentTarget.setAttribute("aria-pressed", String(on));
});
$("cropBtn").addEventListener("click", e => {
  const on = previewGrid.classList.toggle("crop-mode");
  e.currentTarget.setAttribute("aria-pressed", String(on));
});
$("is360").addEventListener("change", e => {
  $("panoramaPreview").querySelector("span").textContent = e.target.checked ? "360° • ON" : "360°";
  notify(e.target.checked ? "تم تفعيل معاينة 360°. تأكد أن الصورة بانورامية فعلاً." : "تم إيقاف وضع 360°.");
});
$("panoramaPreview").addEventListener("pointerdown", e => { dragStartX = e.clientX; e.currentTarget.setPointerCapture?.(e.pointerId); });
$("panoramaPreview").addEventListener("pointermove", e => {
  if (dragStartX === null) return;
  const dx = e.clientX - dragStartX;
  panoOffset = Math.max(0, Math.min(100, panoOffset - dx * .25));
  $("panoramaPreview").style.backgroundPosition = `${panoOffset}% center`;
  dragStartX = e.clientX;
});
["pointerup","pointercancel","pointerleave"].forEach(name => $("panoramaPreview").addEventListener(name, () => dragStartX = null));
$("gyroBtn").addEventListener("click", async () => {
  try {
    if (!("DeviceOrientationEvent" in window)) throw new Error("unsupported");
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== "granted") throw new Error("denied");
    }
    if (gyroHandler) {
      window.removeEventListener("deviceorientation", gyroHandler);
      gyroHandler = null;
      $("gyroStatus").textContent = "الجيروسكوب متوقف";
      $("gyroBtn").textContent = "◎ تفعيل الجيروسكوب";
      return;
    }
    gyroHandler = e => {
      if (typeof e.gamma !== "number") return;
      panoOffset = Math.max(0, Math.min(100, 50 + e.gamma * .8));
      $("panoramaPreview").style.backgroundPosition = `${panoOffset}% center`;
    };
    window.addEventListener("deviceorientation", gyroHandler);
    $("gyroStatus").textContent = "الجيروسكوب مفعّل — حرّك هاتفك";
    $("gyroBtn").textContent = "إيقاف الجيروسكوب";
  } catch (err) {
    $("gyroStatus").textContent = "غير متاح في هذا الجهاز أو يحتاج إذناً";
    notify("الجيروسكوب غير متاح. جرّب هاتفاً ومتصفحاً يدعمان مستشعر الحركة عبر HTTPS.");
  }
});
function proposeTags() {
  const category = $("wallCategory").value;
  const title = $("wallTitle").value || selectedFiles[0]?.name.replace(/\.[^.]+$/,"") || "";
  const common = {
    nature:["nature","landscape","scenery","outdoors"],cars:["cars","automotive","vehicle"],
    games:["gaming","game","digital art"],space:["space","galaxy","stars","cosmos"],
    ai:["ai","digital art","generative art"],amoled:["amoled","dark","black wallpaper"],
    animals:["animals","wildlife"],anime:["anime","illustration"],city:["city","urban","architecture"],
    sports:["sports","athlete"],"4k":["4k","high resolution"],minimal:["minimal","clean design"],
    rain:["rain","weather","moody"],sunset:["sunset","sky","golden hour"],architecture:["architecture","building"]
  };
  const fromTitle = title.toLowerCase().split(/[\s_-]+/).filter(x=>x.length>2);
  $("wallTags").value = [...new Set([...(common[category]||[]),...fromTitle])].slice(0,15).join(", ");
}
$("suggestTagsBtn").addEventListener("click", () => { proposeTags(); notify("تم اقتراح وسوم أولية. راجعها قبل الإرسال."); });
$("aiBtn").addEventListener("click", () => {
  proposeTags();
  const name = selectedFiles[0]?.name || $("wallTitle").value;
  if (!$("wallTitle").value && name) $("wallTitle").value = name.replace(/\.[^.]+$/,"").replace(/[_-]+/g," ");
  $("aiStatus").textContent = "تم اقتراح عنوان ووسوم أولية من اسم الملف والقسم. توليد AI حقيقي يحتاج توصيل خدمة AI في السيرفر.";
  $("titleCount").textContent = `${$("wallTitle").value.length} / 120`;
  notify("اقتراحات أولية جاهزة للمراجعة.");
});
function draftPayload() {
  return {
    title:$("wallTitle").value.trim(), description:$("wallDescription").value.trim(),
    category:$("wallCategory").value, type:$("wallType").value, tags:$("wallTags").value.split(",").map(x=>x.trim()).filter(Boolean),
    colors:$("wallColors").value.trim(), device:$("wallDevice").value, resolution:$("wallResolution").value,
    size:$("wallSize").value, is360:$("is360").checked, scheduledAt:$("scheduleAt").value,
    fileNames:selectedFiles.map(f=>({name:f.name,size:f.size,type:f.type,lastModified:f.lastModified}))
  };
}
$("saveDraftBtn").addEventListener("click", () => {
  const data = draftPayload();
  if (!data.title && !selectedFiles.length) { notify("أدخل عنواناً أو اختر ملفاً قبل حفظ المسودة."); return; }
  // Store metadata only. Browser storage cannot preserve actual file blobs reliably for all browsers.
  try { localStorage.setItem("wallpaperhub-publish-draft", JSON.stringify({...data,savedAt:new Date().toISOString()})); notify("تم حفظ بيانات المسودة على هذا المتصفح. الملفات نفسها لم تُرفع."); }
  catch { notify("تعذر حفظ المسودة في المتصفح."); }
});
$("resetBtn").addEventListener("click", () => {
  if (!confirm("واش متأكد بغيتي تمسح البيانات والملفات المختارة؟")) return;
  form.reset(); selectedFiles=[]; duplicateFingerprints.clear(); $("titleCount").textContent="0 / 120";
  $("uploadProgressBox").hidden=true; $("gyroStatus").textContent="الجيروسكوب غير مفعّل"; renderFiles();
});
$("pauseBtn").addEventListener("click", () => { paused=true; $("pauseBtn").disabled=true; $("resumeBtn").disabled=false; $("uploadStatus").textContent="متوقف مؤقتاً (محاكاة واجهة)"; });
$("resumeBtn").addEventListener("click", () => { paused=false; $("pauseBtn").disabled=false; $("resumeBtn").disabled=true; $("uploadStatus").textContent="جاهز للربط بالرفع الفعلي"; });
form.addEventListener("submit", e => {
  e.preventDefault();
  if (!$("wallTitle").value.trim()) { notify("كتب عنوان الخلفية أولاً."); $("wallTitle").focus(); return; }
  if (!selectedFiles.length) { notify("اختار ملفاً واحداً على الأقل."); return; }
  const bad = selectedFiles.filter(file => validate(file).length);
  if (bad.length) { notify(`كاينين ${bad.length} ملفات غير صالحة. راجع قائمة التحقق.`); return; }
  $("uploadProgressBox").hidden=false;
  $("progressLabel").textContent="الواجهة جاهزة، لكن النشر الفعلي يحتاج ربط API";
  $("progressText").textContent="0%";
  $("progressBar").style.width="0%";
  $("uploadStatus").textContent="لم يتم رفع أي ملف";
  notify("الواجهة كتتحقق من الملفات فقط. مازال خاص ربط Supabase وCloudinary وAPI قبل النشر الحقيقي.");
});
renderFiles();
