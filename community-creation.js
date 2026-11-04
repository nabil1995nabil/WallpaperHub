(()=>{
  "use strict";
  const $=selector=>document.querySelector(selector);
  const palettes={
    violet:{name:"بنفسجي",colors:["#17113f","#5d35b6","#d86bb0","#cbb4ff","#fff2ff"]},
    ocean:{name:"محيطي",colors:["#052c43","#126a9f","#77d4dc","#a6f4fa","#e9ffff"]},
    sunset:{name:"غروب",colors:["#4b1e56","#bb477c","#ffb66f","#ffe0a7","#fff4df"]},
    forest:{name:"غابة",colors:["#082d35","#1d806d","#b6d989","#c6f6d7","#f0ffe8"]},
    mono:{name:"هادئ",colors:["#1d2442","#56658c","#b7c0dc","#e1e8ff","#f5f7ff"]},
    rose:{name:"وردي",colors:["#50132f","#c13e78","#ffc0b8","#ffe0e7","#fff2f6"]},
    amber:{name:"ذهبي",colors:["#482509","#bd6f18","#ffd98a","#fff0bd","#fff8e7"]},
    ice:{name:"ثلجي",colors:["#132f55","#5798c9","#d8f1ff","#e1f8ff","#f1fbff"]},
    emerald:{name:"زمردي",colors:["#06372f","#118c75","#b9e8a8","#d2ffe0","#effff4"]}
  };
  const modes={lock:"شاشة القفل",home:"الشاشة الرئيسية",wallpaper:"الخلفية فقط"};
  const presets={aurora:"الشفق",mountain:"الجبال",waves:"الموج",minimal:"بسيط",geometry:"هندسي",dots:"نقاط",stripes:"خطوط"};
  let item=null,themeUrl="";
  function toast(message){const node=$("#creationToast");node.textContent=message;node.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove("show"),2800)}
  function safeUrl(value){try{const u=new URL(String(value||""));return u.protocol==="https:"?u.href:""}catch(_error){return ""}}
  function text(id,value){$(id).textContent=value||"—"}
  function categoryInfo(data){
    const c=data.config||{},mode=String(c.screenMode||"").toLowerCase();
    if(modes[mode])return modes[mode];
    const tool=String(c.tool||data.category||"").toLowerCase();
    if(tool==="lock")return modes.lock;
    if(["icons","theme","widget"].includes(tool))return modes.home;
    return modes.wallpaper;
  }
  function render(data){
    item=data;
    const c=data.config||{},palette=palettes[c.palette]||palettes.violet;
    const imageUrl=safeUrl(data.image_url);
    if(!imageUrl)throw new Error("صورة التصميم غير متاحة");
    $("#creationPreviewImage").src=imageUrl;
    $("#creationPreviewImage").alt=data.title||"إبداع من المجتمع";
    text("#creationTitle",data.title||"إبداع من المجتمع");
    text("#creationDescription",c.subtitle||"تصميم شاركه أحد أعضاء مجتمع WallpaperHub.");
    text("#creationKind",categoryInfo(data));
    text("#creationDate",data.created_at?new Date(data.created_at).toLocaleDateString("ar-MA",{year:"numeric",month:"long",day:"numeric"}):"—");
    text("#creationPreset",presets[c.preset]||"تصميم مخصص");
    text("#creationPaletteName",palette.name);
    $("#creationBadges").replaceChildren();
    [categoryInfo(data),palette.name,c.preset?presets[c.preset]||"نمط مخصص":"نمط مخصص"].filter(Boolean).forEach(label=>{const b=document.createElement("span");b.className="creation-badge";b.textContent=label;$("#creationBadges").appendChild(b)});
    $("#creationColors").replaceChildren();
    palette.colors.forEach(color=>{const swatch=document.createElement("span");swatch.className="creation-color-swatch";swatch.style.background=color;swatch.title=color;swatch.setAttribute("aria-label",color);$("#creationColors").appendChild(swatch)});
    themeUrl=safeUrl(c.themeUrl);
    const themeButton=$("#downloadCreationTheme");
    themeButton.disabled=!themeUrl;
    $("#creationThemeNote").textContent=themeUrl?"حزمة ZIP جاهزة: الخلفية وتسع أيقونات PNG وملف معلومات.":"هذا التصميم نُشر قبل إضافة ملفات الثيم، لذلك لا يتوفر له ملف ZIP بعد.";
    $("#creationLoading").classList.add("hidden");
    $("#creationNotFound").classList.add("hidden");
    $("#creationDetail").classList.remove("hidden");
    document.title=(data.title||"إبداع من المجتمع")+" | WallpaperHub";
  }
  async function load(){
    const id=new URLSearchParams(location.search).get("id");
    if(!id||id.length>100){showNotFound();return}
    try{
      const configResponse=await fetch("/api/supabase/config",{cache:"no-store"});
      if(!configResponse.ok)throw new Error("تعذر الاتصال بقاعدة البيانات");
      const cfg=await configResponse.json(),base=String(cfg.url||"").replace(/\/+$/,""),key=String(cfg.anonKey||"");
      if(!base||!key)throw new Error("إعدادات قاعدة البيانات غير مكتملة");
      const query=new URLSearchParams({select:"id,title,category,config,image_url,created_at",id:"eq."+id,visibility:"eq.published",limit:"1"});
      const response=await fetch(base+"/rest/v1/studio_designs?"+query.toString(),{headers:{apikey:key,Authorization:"Bearer "+key,Accept:"application/json"},cache:"no-store"});
      if(!response.ok)throw new Error("تعذر تحميل التصميم");
      const rows=await response.json();
      if(!Array.isArray(rows)||!rows.length){showNotFound();return}
      render(rows[0]);
    }catch(error){console.error("COMMUNITY CREATION DETAIL:",error);showNotFound(error.message||"تعذر تحميل التصميم")}
  }
  function showNotFound(message){$("#creationLoading").classList.add("hidden");$("#creationDetail").classList.add("hidden");$("#creationNotFound").classList.remove("hidden");if(message)$("#creationNotFound p").textContent=message}
  async function downloadUrl(url,fileName,button){
    if(!url)return;
    const original=button.innerHTML;button.disabled=true;button.innerHTML='<span class="material-icons-round">sync</span><span>جاري تجهيز الملف...</span>';
    try{
      const response=await fetch(url,{mode:"cors",cache:"no-store"});
      if(!response.ok)throw new Error("download");
      const blob=await response.blob(),objectUrl=URL.createObjectURL(blob),link=document.createElement("a");
      link.href=objectUrl;link.download=fileName;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),3000);toast("بدأ تنزيل الملف");
    }catch(_error){
      const link=document.createElement("a");link.href=url;link.target="_blank";link.rel="noopener noreferrer";link.download=fileName;document.body.appendChild(link);link.click();link.remove();toast("فتح رابط الملف؛ سيبدأ التنزيل حسب المتصفح");
    }finally{button.disabled=false;button.innerHTML=original}
  }
  $("#downloadCreationImage").addEventListener("click",()=>{if(item)downloadUrl(safeUrl(item.image_url),"wallpaperhub-creation.png",$("#downloadCreationImage"))});
  $("#downloadCreationTheme").addEventListener("click",()=>downloadUrl(themeUrl,"wallpaperhub-theme.zip",$("#downloadCreationTheme")));
  $("#copyCreationLink").addEventListener("click",async()=>{
    const value=location.href;
    try{await navigator.clipboard.writeText(value);toast("تم نسخ رابط الإبداع")}
    catch(_error){const input=document.createElement("textarea");input.value=value;document.body.appendChild(input);input.select();document.execCommand("copy");input.remove();toast("تم نسخ الرابط")}
  });
  load();
})();