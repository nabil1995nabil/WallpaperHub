import { supabase } from "../supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
  const $ = id => document.getElementById(id);
  const form = $("roadmapForm");
  const archive = $("roadmapArchiveList");
  const saveButton = $("roadmapSave");
  const imageInput = $("roadmapImage");
  const imagePreview = $("roadmapImagePreview");
  const imageStatus = $("roadmapImageStatus");
  const removeImageButton = $("roadmapRemoveImage");
  const progress = $("roadmapUploadProgress");
  const progressBar = $("roadmapUploadProgressBar");

  const labels = {
    wallpapers:"عالم الخلفيات الذكي", rewards:"النقاط والمكافآت",
    studio:"استوديو الإبداع", community:"المجتمع",
    identity:"هوية العضو والامتيازات", ai:"الذكاء الاصطناعي",
    performance:"الأداء والأمان", general:"فكرة عامة"
  };
  const statusLabels = {
    planned:"قيد التخطيط", in_progress:"قيد التطوير", released:"تم الإطلاق"
  };

  let session = null;
  let items = [];
  let editingId = null;
  let currentImageUrl = "";
  let currentImageKey = "";
  let pendingFile = null;
  let uploadedMedia = null;
  let objectUrl = "";
  let removeImage = false;
  let searchTerm = "";
  let categoryFilter = "all";
  let statusFilter = "all";

  function toast(message,isError=false){
    const node=$("roadmapToast");
    node.textContent=message||"";
    node.classList.toggle("error",Boolean(isError));
  }

  async function requireAdmin(){
    const result=await supabase.auth.getSession();
    if(result.error || !result.data?.session?.user){
      location.href="/profile.html";
      return null;
    }
    const current=result.data.session;
    const response=await fetch("/api/admin/me",{
      headers:{Authorization:"Bearer "+current.access_token},
      cache:"no-store"
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok || !data.isAdmin){
      alert("هذا الحساب لا يملك صلاحية إدارة خارطة الطريق.");
      location.href="/profile.html";
      return null;
    }
    return current;
  }

  async function api(url,options={}){
    const auth=await supabase.auth.getSession();
    const token=auth.data?.session?.access_token||session?.access_token||"";
    if(!token) throw new Error("انتهت جلسة الإدارة. سجّل الدخول مرة أخرى.");
    const headers=new Headers(options.headers||{});
    headers.set("Authorization","Bearer "+token);
    if(options.body!==undefined && !(options.body instanceof FormData) && !headers.has("Content-Type")){
      headers.set("Content-Type","application/json");
    }
    const response=await fetch(url,{...options,headers,cache:"no-store"});
    const data=await response.json().catch(()=>({}));
    if(!response.ok || data.success===false) throw new Error(data.message||"تعذر تنفيذ الطلب.");
    return data;
  }

  function formatDate(value){
    if(!value) return "تاريخ غير متاح";
    const date=new Date(value);
    if(!Number.isFinite(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("ar-MA",{dateStyle:"medium"}).format(date);
  }

  function makeImage(url,alt,className){
    const img=document.createElement("img");
    img.src=url;
    img.alt=alt||"";
    img.loading="lazy";
    img.decoding="async";
    if(className) img.className=className;
    return img;
  }

  function clearObjectUrl(){
    if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl="";}
  }

  function showImage(url,label){
    imagePreview.replaceChildren();
    if(url){
      imagePreview.hidden=false;
      imagePreview.appendChild(makeImage(url,label||"صورة الفكرة"));
      removeImageButton.hidden=false;
    }else{
      imagePreview.hidden=true;
      removeImageButton.hidden=true;
    }
  }

  function livePreview(){
    $("previewCategory").textContent=labels[$("roadmapCategory").value]||"فكرة عامة";
    $("previewStatus").textContent=statusLabels[$("roadmapStatus").value]||"قيد التخطيط";
    $("previewRoadmapTitle").textContent=$("roadmapTitleInput").value.trim()||"عنوان الفكرة سيظهر هنا";
    $("previewRoadmapSummary").textContent=$("roadmapSummary").value.trim()||"اكتب مقدمة قصيرة ليظهر شكل الفكرة في الدفتر.";
    $("previewRoadmapContent").textContent=$("roadmapContent").value.trim()||"ستظهر تفاصيل المشروع هنا بعد كتابتها.";
    const bullets=$("roadmapBullets").value.split(/\r?\n/).map(value=>value.trim()).filter(Boolean).slice(0,12);
    const list=$("previewRoadmapBullets");
    list.replaceChildren();
    if(!bullets.length){
      const li=document.createElement("li");li.textContent="ستظهر النقاط والمميزات هنا";list.appendChild(li);
    }else{
      bullets.forEach(value=>{const li=document.createElement("li");li.textContent=value;list.appendChild(li);});
    }
    const image=objectUrl||(uploadedMedia?.publicUrl)||(!removeImage?currentImageUrl:"");
    $("previewImageEmpty").hidden=Boolean(image);
    $("previewMemoryImage").hidden=!image;
    if(image) $("previewMemoryImage").src=image;
    $("roadmapTitleCount").textContent=$("roadmapTitleInput").value.length+" / 180";
    $("roadmapSummaryCount").textContent=$("roadmapSummary").value.length+" / 500";
    $("roadmapContentCount").textContent=$("roadmapContent").value.length+" / 6000";
  }

  function resetEditor(){
    form.reset();
    editingId=null;
    currentImageUrl="";
    currentImageKey="";
    pendingFile=null;
    uploadedMedia=null;
    removeImage=false;
    clearObjectUrl();
    imageInput.value="";
    $("roadmapItemId").value="";
    $("roadmapCategory").value="wallpapers";
    $("roadmapStatus").value="planned";
    $("roadmapSortOrder").value="100";
    $("roadmapIsPublished").checked=true;
    $("roadmapFormTitle").textContent="اكتب فكرة جديدة";
    $("roadmapSave").innerHTML='حفظ ونشر الفكرة <span>↗</span>';
    $("roadmapCancelEdit").hidden=true;
    $("roadmapEditorState").textContent="فكرة جديدة · جاهزة للتحرير";
    imageStatus.textContent="الصورة ستُرفع إلى مساحة ملفات WallpaperHub عند حفظ الفكرة.";
    progress.hidden=true;progressBar.style.width="0%";
    showImage("");
    livePreview();
    toast("");
  }

  function fillEditor(item){
    editingId=String(item.id);
    currentImageUrl=item.image_url||"";
    currentImageKey=item.image_key||"";
    pendingFile=null;uploadedMedia=null;removeImage=false;clearObjectUrl();
    imageInput.value="";
    $("roadmapItemId").value=editingId;
    $("roadmapTitleInput").value=item.title||"";
    $("roadmapCategory").value=item.category||"general";
    $("roadmapStatus").value=item.status||"planned";
    $("roadmapSummary").value=item.summary||"";
    $("roadmapContent").value=item.content||"";
    $("roadmapBullets").value=Array.isArray(item.bullets)?item.bullets.join("\n"):"";
    $("roadmapSortOrder").value=String(item.sort_order??100);
    $("roadmapIsPublished").checked=item.is_published!==false;
    $("roadmapFormTitle").textContent="تعديل الفكرة";
    $("roadmapSave").innerHTML='حفظ التعديلات <span>✓</span>';
    $("roadmapCancelEdit").hidden=false;
    $("roadmapEditorState").textContent="تحرير الفكرة رقم "+editingId;
    imageStatus.textContent=currentImageUrl?"الصورة الحالية محفوظة. اختر صورة جديدة لاستبدالها أو أزلها.":"لم تُرفق صورة بهذه الفكرة بعد.";
    showImage(currentImageUrl,item.title);
    livePreview();
    toast("تم فتح الفكرة للتحرير.");
    form.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function updateStats(){
    $("roadmapStatTotal").textContent=items.length.toLocaleString("ar");
    $("roadmapStatPublished").textContent=items.filter(item=>item.is_published).length.toLocaleString("ar");
    $("roadmapStatProgress").textContent=items.filter(item=>item.status==="in_progress").length.toLocaleString("ar");
    $("roadmapStatDrafts").textContent=items.filter(item=>!item.is_published).length.toLocaleString("ar");
  }

  function filteredItems(){
    const query=searchTerm.toLowerCase();
    return items.filter(item=>{
      if(categoryFilter!=="all" && item.category!==categoryFilter) return false;
      if(statusFilter==="draft" && item.is_published) return false;
      if(statusFilter!=="all" && statusFilter!=="draft" && item.status!==statusFilter) return false;
      if(!query) return true;
      return [item.title,item.summary,item.content,(item.bullets||[]).join(" "),labels[item.category]].join(" ").toLowerCase().includes(query);
    });
  }

  function makeArchiveCard(item){
    const card=document.createElement("article");
    card.className="roadmap-archive-card";
    const thumb=document.createElement("div");
    thumb.className="archive-card-thumb";
    if(item.image_url) thumb.appendChild(makeImage(item.image_url,item.title));
    else{const empty=document.createElement("div");empty.className="archive-card-thumb-empty";empty.textContent="✦";thumb.appendChild(empty);}
    const body=document.createElement("div");
    body.className="archive-card-body";
    const meta=document.createElement("div");meta.className="archive-card-meta";
    const category=document.createElement("span");category.textContent=labels[item.category]||"فكرة عامة";
    const status=document.createElement("span");status.className="archive-status "+(item.status||"planned");status.textContent=statusLabels[item.status]||"قيد التخطيط";
    const published=document.createElement("span");published.textContent=item.is_published?"منشورة":"مسودة مخفية";
    meta.append(category,status,published);
    const title=document.createElement("h3");title.textContent=item.title||"بدون عنوان";
    const desc=document.createElement("p");desc.textContent=item.summary||item.content||"لا يوجد وصف إضافي.";
    body.append(meta,title,desc);
    const actions=document.createElement("div");actions.className="archive-card-actions";
    const edit=document.createElement("button");edit.type="button";edit.className="edit";edit.textContent="تعديل";
    edit.addEventListener("click",()=>fillEditor(item));
    const toggle=document.createElement("button");toggle.type="button";toggle.textContent=item.is_published?"إخفاء":"نشر";
    toggle.addEventListener("click",()=>togglePublish(item,toggle));
    const remove=document.createElement("button");remove.type="button";remove.className="delete";remove.textContent="حذف";
    remove.addEventListener("click",()=>deleteItem(item,remove));
    actions.append(edit,toggle,remove);
    body.appendChild(actions);
    card.append(thumb,body);
    return card;
  }

  function renderArchive(){
    const rows=filteredItems();
    $("roadmapResultCount").textContent=rows.length.toLocaleString("ar")+" فكرة";
    archive.replaceChildren();
    if(!rows.length){
      const empty=document.createElement("div");empty.className="archive-empty";
      empty.textContent=items.length?"لا توجد أفكار تطابق البحث أو الفلاتر.":"لا توجد أفكار بعد.";
      archive.appendChild(empty);
      return;
    }
    const fragment=document.createDocumentFragment();
    rows.forEach(item=>fragment.appendChild(makeArchiveCard(item)));
    archive.appendChild(fragment);
  }

  async function loadItems(){
    archive.innerHTML='<div class="archive-loading">جارٍ تحميل الأفكار...</div>';
    try{
      const data=await api("/api/admin/roadmap");
      items=Array.isArray(data.items)?data.items:[];
      updateStats();
      renderArchive();
    }catch(error){
      archive.innerHTML="";
      const node=document.createElement("div");node.className="archive-error";node.textContent=error.message||"تعذر تحميل الأرشيف.";
      archive.appendChild(node);
      toast(error.message||"تعذر تحميل الأرشيف.",true);
    }
  }

  function uploadToDbbyte(file,signature){
    return new Promise((resolve,reject)=>{
      const xhr=new XMLHttpRequest();
      xhr.open("PUT",signature.uploadUrl,true);
      xhr.setRequestHeader("Content-Type",file.type);
      xhr.upload.onprogress=event=>{
        if(!event.lengthComputable) return;
        const percent=Math.round((event.loaded/event.total)*100);
        progress.hidden=false;progressBar.style.width=percent+"%";
        imageStatus.textContent="جارٍ رفع الصورة إلى DBByte: "+percent+"٪";
      };
      xhr.onload=()=>{
        if(xhr.status>=200&&xhr.status<300){
          progressBar.style.width="100%";
          resolve({image_url:signature.publicUrl,image_key:signature.key});
        }else reject(new Error("فشل رفع الصورة إلى DBByte ("+xhr.status+")."));
      };
      xhr.onerror=()=>reject(new Error("تعذر الاتصال بمساحة الصور. تحقق من الاتصال وحاول مجدداً."));
      xhr.ontimeout=()=>reject(new Error("انتهت مهلة رفع الصورة."));
      xhr.timeout=120000;
      xhr.send(file);
    });
  }

  async function ensureUploadedMedia(){
    if(uploadedMedia) return uploadedMedia;
    if(!pendingFile) return null;
    const signed=await api("/api/admin/roadmap/media-url",{
      method:"POST",
      body:JSON.stringify({mimeType:pendingFile.type,size:pendingFile.size})
    });
    uploadedMedia=await uploadToDbbyte(pendingFile,signed);
    imageStatus.textContent="تم رفع الصورة بنجاح. جارٍ حفظ الفكرة...";
    return uploadedMedia;
  }

  async function saveItem(event){
    event.preventDefault();
    const title=$("roadmapTitleInput").value.trim();
    if(!title){toast("اكتب عنوان الفكرة أولاً.",true);$("roadmapTitleInput").focus();return;}
    const order=Number($("roadmapSortOrder").value);
    if(!Number.isInteger(order)||order<0||order>10000){toast("تحقق من رقم ترتيب الظهور.",true);return;}
    saveButton.disabled=true;
    saveButton.textContent=pendingFile?"جارٍ رفع الصورة وحفظ الفكرة...":"جارٍ حفظ الفكرة...";
    try{
      let imageUrl=removeImage?"":currentImageUrl;
      let imageKey=removeImage?"":currentImageKey;
      if(pendingFile){
        const media=await ensureUploadedMedia();
        imageUrl=media.image_url;
        imageKey=media.image_key;
      }
      const payload={
        title,
        category:$("roadmapCategory").value,
        status:$("roadmapStatus").value,
        summary:$("roadmapSummary").value.trim(),
        content:$("roadmapContent").value.trim(),
        bullets:$("roadmapBullets").value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean).slice(0,12),
        sort_order:order,
        is_published:$("roadmapIsPublished").checked,
        image_url:imageUrl,
        image_key:imageKey
      };
      const editing=editingId!==null;
      await api(editing?"/api/admin/roadmap/"+encodeURIComponent(editingId):"/api/admin/roadmap",{
        method:editing?"PUT":"POST",
        body:JSON.stringify(payload)
      });
      toast(editing?"تم حفظ تعديلات الفكرة.":"تمت إضافة الفكرة إلى خارطة الطريق.");
      resetEditor();
      await loadItems();
    }catch(error){
      console.error("ROADMAP SAVE ERROR:",error);
      toast(error.message||"تعذر حفظ الفكرة.",true);
    }finally{
      saveButton.disabled=false;
      saveButton.innerHTML=editingId!==null?'حفظ التعديلات <span>✓</span>':'حفظ ونشر الفكرة <span>↗</span>';
    }
  }

  async function togglePublish(item,button){
    const original=button.textContent;
    button.disabled=true;button.textContent="جارٍ الحفظ...";
    try{
      await api("/api/admin/roadmap/"+encodeURIComponent(item.id),{
        method:"PUT",body:JSON.stringify({is_published:!item.is_published})
      });
      await loadItems();
      toast(item.is_published?"تم إخفاء الفكرة وحفظها كمسودة.":"تم نشر الفكرة.");
    }catch(error){toast(error.message||"تعذر تغيير حالة النشر.",true);button.disabled=false;button.textContent=original;}
  }

  async function deleteItem(item,button){
    if(!confirm("هل تريد حذف فكرة «"+item.title+"» نهائياً؟")) return;
    button.disabled=true;button.textContent="جارٍ الحذف...";
    try{
      await api("/api/admin/roadmap/"+encodeURIComponent(item.id),{method:"DELETE"});
      if(String(editingId)===String(item.id)) resetEditor();
      await loadItems();
      toast("تم حذف الفكرة. وإذا كانت لها صورة خاصة فسيتم تنظيف ملفها عند عدم استخدامه.");
    }catch(error){toast(error.message||"تعذر حذف الفكرة.",true);button.disabled=false;button.textContent="حذف";}
  }

  imageInput.addEventListener("change",()=>{
    const file=imageInput.files?.[0]||null;
    pendingFile=null;uploadedMedia=null;removeImage=false;clearObjectUrl();
    if(!file){
      imageStatus.textContent=currentImageUrl?"الصورة الحالية محفوظة.":"لم يتم اختيار صورة.";
      showImage(currentImageUrl);
      livePreview();
      return;
    }
    const allowed=["image/jpeg","image/png","image/webp","image/avif","image/gif"];
    if(!allowed.includes(file.type)){
      imageInput.value="";toast("صيغة الصورة غير مدعومة.",true);return;
    }
    if(file.size>10*1024*1024){
      imageInput.value="";toast("حجم الصورة يتجاوز 10 ميغابايت.",true);return;
    }
    pendingFile=file;
    objectUrl=URL.createObjectURL(file);
    imageStatus.textContent="صورة جديدة جاهزة للرفع عند الحفظ: "+file.name;
    showImage(objectUrl,file.name);
    livePreview();
  });

  removeImageButton.addEventListener("click",()=>{
    pendingFile=null;uploadedMedia=null;removeImage=true;currentImageUrl="";currentImageKey="";
    clearObjectUrl();imageInput.value="";showImage("");
    imageStatus.textContent="ستُزال الصورة الحالية عند حفظ التعديلات.";
    livePreview();
  });

  ["roadmapTitleInput","roadmapCategory","roadmapStatus","roadmapSummary","roadmapContent","roadmapBullets"].forEach(id=>{
    $(id).addEventListener("input",livePreview);
    $(id).addEventListener("change",livePreview);
  });

  form.addEventListener("submit",saveItem);
  $("roadmapCancelEdit").addEventListener("click",resetEditor);
  $("roadmapRefresh").addEventListener("click",loadItems);
  $("roadmapSearch").addEventListener("input",event=>{searchTerm=event.target.value;renderArchive();});
  $("roadmapFilterCategory").addEventListener("change",event=>{categoryFilter=event.target.value;renderArchive();});
  $("roadmapFilterStatus").addEventListener("change",event=>{statusFilter=event.target.value;renderArchive();});
  $("logoutBtn")?.addEventListener("click",async()=>{await supabase.auth.signOut({scope:"local"});location.href="/profile.html";});

  session=await requireAdmin();
  if(!session) return;
  resetEditor();
  await loadItems();
});
