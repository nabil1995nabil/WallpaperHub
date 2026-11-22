/* WallpaperHub settings runtime
 * Applies user preferences site-wide and syncs account preferences securely.
 */
(function(){
 "use strict";
 if(window.__whSettingsRuntimeReady)return;
 window.__whSettingsRuntimeReady=true;
 const KEY="wallpaperSettings",CARD_KEY="cardStyle",VERSION_KEY="wh-seen-deployment";
 const DEFAULTS={
  darkMode:false,animations:true,videos:true,highQuality:true,fullscreen:true,
  autoUpdate:true,wifiOnly:false,notifications:true,notificationsEnabled:true,
  ratingsNotify:true,updatesNotify:true,notificationSound:true,
  browserNotifications:false,localActivity:true,systemUpdate:true,cardStyle:"classic"
 };
 const CLOUD_KEYS=Object.keys(DEFAULTS).filter(key=>key!=="browserNotifications");
 let preferences=readLocal();
 let syncTimer=0,lastRefresh=0,lastVersionCheck=0;
 let refreshInterval=5*60*1000;
 function readLocal(){
  try{
   const parsed=JSON.parse(localStorage.getItem(KEY)||"{}");
   const value=parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed:{};
   const card=localStorage.getItem(CARD_KEY);
   return {...DEFAULTS,...value,cardStyle:["classic","glass","premium"].includes(value.cardStyle)?value.cardStyle:(["classic","glass","premium"].includes(card)?card:"classic")};
  }catch(_){return {...DEFAULTS};}
 }
 function writeLocal(){
  try{
   localStorage.setItem(KEY,JSON.stringify(preferences));
   localStorage.setItem(CARD_KEY,preferences.cardStyle||"classic");
  }catch(error){console.warn("WallpaperHub settings local save error:",error);}
 }
 function tokenFromStorage(){
  try{
   for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i)||"";
    if(!key.startsWith("sb-")||!key.endsWith("-auth-token"))continue;
    const raw=localStorage.getItem(key);if(!raw)continue;
    let parsed;
    try{parsed=JSON.parse(raw);}catch(_){
     if(!raw.startsWith("base64-"))continue;
     const binary=atob(raw.slice(7));
     const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
     parsed=JSON.parse(new TextDecoder().decode(bytes));
    }
    const access=String(parsed?.access_token||parsed?.currentSession?.access_token||"").trim();
    if(access)return access;
   }
  }catch(error){console.warn("WallpaperHub settings auth read error:",error);}
  return "";
 }
 function cloudPreferences(){
  const clean={};
  CLOUD_KEYS.forEach(key=>{if(key in preferences)clean[key]=preferences[key];});
  return clean;
 }
 function updateIndicator(state){
  const el=document.getElementById("saveIndicator");
  if(!el)return;
  if(state==="cloud"){
   el.innerHTML='<span class="material-icons">cloud_done</span> محفوظ في الحساب';
   el.classList.add("saved");
  }else if(state==="local"){
   el.innerHTML='<span class="material-icons">check</span> محفوظ على الجهاز';
   el.classList.add("saved");
  }else if(state==="error"){
   el.innerHTML='<span class="material-icons">cloud_off</span> تعذر الحفظ السحابي';
   el.classList.remove("saved");
  }
 }
 function injectStyle(){
  if(document.getElementById("wh-settings-runtime-style"))return;
  const style=document.createElement("style");style.id="wh-settings-runtime-style";
  style.textContent=
   '.wh-no-animations *, .wh-no-animations *::before, .wh-no-animations *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important;}'+
   'html[data-wh-card-style="glass"] .wall-card,html[data-wh-card-style="glass"] .wallpaper-card,html[data-wh-card-style="glass"] .wallpaper-item,html[data-wh-card-style="glass"] .wallpaper-card-item{background:rgba(255,255,255,.64)!important;border:1px solid rgba(130,150,190,.24)!important;backdrop-filter:blur(14px);box-shadow:0 10px 28px rgba(32,53,91,.10)!important;}'+
   'html.dark[data-wh-card-style="glass"] .wall-card,html.dark[data-wh-card-style="glass"] .wallpaper-card,html.dark[data-wh-card-style="glass"] .wallpaper-item,html.dark[data-wh-card-style="glass"] .wallpaper-card-item{background:rgba(27,34,49,.72)!important;border-color:rgba(148,163,184,.16)!important;}'+
   'html[data-wh-card-style="premium"] .wall-card,html[data-wh-card-style="premium"] .wallpaper-card,html[data-wh-card-style="premium"] .wallpaper-item,html[data-wh-card-style="premium"] .wallpaper-card-item{border:1px solid rgba(196,155,72,.36)!important;box-shadow:0 12px 28px rgba(110,87,35,.12)!important;}';
  document.head.appendChild(style);
 }
 function apply(){
  const root=document.documentElement,body=document.body;
  if(!root)return;
  root.classList.toggle("wh-no-animations",preferences.animations===false);
  if(body)body.classList.toggle("wh-no-animations",preferences.animations===false);
  root.dataset.whCardStyle=preferences.cardStyle||"classic";
  root.dataset.whVideos=preferences.videos===false?"off":"on";
  root.dataset.whHighQuality=preferences.highQuality===false?"standard":"high";
  root.dataset.whAutoUpdate=preferences.autoUpdate===false?"off":"on";
  root.dataset.whNotifications=preferences.notifications===false||preferences.notificationsEnabled===false?"off":"on";
  injectStyle();
  const full=document.getElementById("fullscreenBtn");
  if(full){full.hidden=preferences.fullscreen===false;full.setAttribute("aria-hidden",preferences.fullscreen===false?"true":"false");}
  const toggle=document.getElementById("darkMode");
  if(toggle&&typeof window.getWallpaperHubTheme==="function")toggle.checked=window.getWallpaperHubTheme()==="dark";
 }
 function dispatchLoaded(){
  window.dispatchEvent(new CustomEvent("wallpaperhub:settings-loaded",{detail:{settings:{...preferences}}}));
  window.dispatchEvent(new CustomEvent("wallpaperhub:settings-updated",{detail:{settings:{...preferences},source:"remote-load"}}));
 }
 async function requestSettings(method,body){
  const token=tokenFromStorage();if(!token)return null;
  const response=await fetch("/api/user/settings",{
   method,cache:"no-store",
   headers:{Accept:"application/json",Authorization:"Bearer "+token,...(body?{"Content-Type":"application/json"}:{})},
   ...(body?{body:JSON.stringify(body)}:{})
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.message||"SETTINGS_API_"+response.status);
  return result;
 }
 async function loadAccountSettings(){
  if(!tokenFromStorage())return;
  try{
   const result=await requestSettings("GET");
   if(!result?.success)return;
   const deviceOnly={browserNotifications:preferences.browserNotifications};
   if(result.exists){
    preferences={...DEFAULTS,...result.preferences,...deviceOnly};
    writeLocal();apply();dispatchLoaded();
   }else{
    await syncAccountSettings();
   }
   updateIndicator("cloud");
  }catch(error){console.warn("ACCOUNT SETTINGS LOAD ERROR:",error);updateIndicator("error");}
 }
 async function syncAccountSettings(){
  if(!tokenFromStorage())return false;
  try{
   const result=await requestSettings("PUT",{preferences:cloudPreferences()});
   if(result?.success){
    preferences={...preferences,...result.preferences,browserNotifications:preferences.browserNotifications};
    writeLocal();updateIndicator("cloud");return true;
   }
  }catch(error){console.warn("ACCOUNT SETTINGS SYNC ERROR:",error);updateIndicator("error");}
  return false;
 }
 function save(patch,options){
  const opts=options||{};
  preferences={...preferences,...patch};
  if(!["classic","glass","premium"].includes(preferences.cardStyle))preferences.cardStyle="classic";
  writeLocal();apply();
  if(opts.dispatch!==false){
   window.dispatchEvent(new CustomEvent("wallpaperhub:settings-updated",{detail:{settings:{...preferences},patch:{...patch},source:"local-change"}}));
  }
  if(opts.sync!==false){
   clearTimeout(syncTimer);
   syncTimer=setTimeout(()=>{void syncAccountSettings();},250);
  }
  return {...preferences};
 }
 function get(key){return key?preferences[key]:{...preferences};}
 function parseSize(value){
  if(typeof value==="number"&&Number.isFinite(value))return value;
  const match=String(value||"").trim().toLowerCase().match(/([\d.]+)\s*(kb|mb|gb|ك.ب|م.ب|ج.ب)?/);
  if(!match)return 0;
  const n=Number(match[1]),unit=match[2]||"";
  if(unit==="gb"||unit==="ج.ب")return n*1024*1024*1024;
  if(unit==="mb"||unit==="م.ب")return n*1024*1024;
  if(unit==="kb"||unit==="ك.ب")return n*1024;
  return n;
 }
 function canDownload(size){
  if(preferences.wifiOnly!==true)return true;
  const bytes=parseSize(size);
  const heavy=bytes===0||bytes>=5*1024*1024;
  if(!heavy)return true;
  const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  if(connection&&String(connection.type||"").toLowerCase()==="wifi")return true;
  window.alert("إعداد Wi-Fi فقط مفعّل. لم يتمكن المتصفح من تأكيد اتصال Wi-Fi، لذلك أوقفنا هذا التنزيل الثقيل لحماية بيانات الهاتف.");
  return false;
 }
 function optimizeImageUrl(value){
  const original=String(value||"");
  if(!original||preferences.highQuality!==false)return original;
  try{
   const url=new URL(original,location.origin);
   if(url.hostname!=="ik.imagekit.io"||url.searchParams.has("ik-s")||url.searchParams.has("ik-t")||url.searchParams.has("tr"))return original;
   const parts=url.pathname.split("/").filter(Boolean);
   if(parts.length<2||parts.some(part=>/^tr:/i.test(part)))return original;
   parts.splice(1,0,"tr:q-70");
   url.pathname="/"+parts.join("/");
   return url.href;
  }catch(_){return original;}
 }
 function toast(message){
  let node=document.getElementById("wh-settings-toast");
  if(!node){
   node=document.createElement("div");node.id="wh-settings-toast";
   node.style.cssText="position:fixed;z-index:99999;bottom:calc(18px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);max-width:min(92vw,440px);padding:12px 16px;border-radius:14px;background:#202938;color:#fff;font:600 13px/1.5 system-ui;box-shadow:0 10px 30px #0003";
   document.body.appendChild(node);
  }
  node.textContent=message;node.hidden=false;
  clearTimeout(toast.timer);toast.timer=setTimeout(()=>{node.hidden=true;},5000);
 }
 function setupSearchHistory(){
  let saveTimer=0;
  document.addEventListener("input",event=>{
   const input=event.target;
   if(!(input instanceof HTMLInputElement))return;
   if(!input.matches('input[type="search"],#searchInput,.search-input,.wallpaper-search'))return;
   if(["settingsSearch","notification-search","whLanguageSearch"].includes(input.id))return;
   const query=String(input.value||"").trim();
   if(query.length<2)return;
   clearTimeout(saveTimer);
   saveTimer=setTimeout(()=>{
    try{
     const current=JSON.parse(localStorage.getItem("searchHistory")||"[]");
     const list=Array.isArray(current)?current.map(String):[];
     const next=[query,...list.filter(item=>item.toLowerCase()!==query.toLowerCase())].slice(0,30);
     localStorage.setItem("searchHistory",JSON.stringify(next));
    }catch(error){console.debug("SEARCH HISTORY SAVE SKIPPED:",error);}
   },450);
  },true);
 }
 function checkAutoRefresh(){
  if(preferences.autoUpdate===false||document.hidden)return;
  const now=Date.now();if(now-lastRefresh<refreshInterval)return;
  lastRefresh=now;
  window.dispatchEvent(new CustomEvent("wallpaperhub:refresh-content",{detail:{reason:"foreground"}}));
 }
 async function checkSystemUpdate(){
  if(preferences.systemUpdate===false)return;
  const now=Date.now();if(now-lastVersionCheck<30*60*1000)return;lastVersionCheck=now;
  try{
   const response=await fetch("/api/app-version",{cache:"no-store"});if(!response.ok)return;
   const result=await response.json();const version=String(result.version||"").trim();if(!version)return;
   const seen=sessionStorage.getItem(VERSION_KEY);
   if(!seen){sessionStorage.setItem(VERSION_KEY,version);return;}
   if(seen!==version){
    sessionStorage.setItem(VERSION_KEY,version);
    let banner=document.getElementById("wh-update-available");
    if(!banner){
     banner=document.createElement("div");banner.id="wh-update-available";
     banner.style.cssText="position:fixed;z-index:99998;top:calc(10px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:min(92vw,480px);display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border:1px solid #9db8ec;border-radius:14px;background:var(--card-bg,#fff);color:var(--text-color,#182230);box-shadow:0 8px 28px #0002;font:600 13px/1.4 system-ui";
     const text=document.createElement("span");text.textContent="يتوفر تحديث جديد لـ WallpaperHub.";
     const button=document.createElement("button");button.type="button";button.textContent="تحديث";button.style.cssText="border:0;border-radius:10px;padding:8px 12px;background:#4169d8;color:white;font-weight:700";
     button.addEventListener("click",()=>location.reload());
     banner.append(text,button);document.body.appendChild(banner);
    }
   }
  }catch(error){console.debug("APP UPDATE CHECK:",error?.message||error);}
 }
 window.WallpaperHubSettings={
  get,save,apply,loadAccountSettings,syncAccountSettings,canDownload,optimizeImageUrl,toast,
  videosEnabled:()=>preferences.videos!==false,
  keepLocalActivity:()=>preferences.localActivity!==false,
  notificationsEnabled:()=>preferences.notifications!==false&&preferences.notificationsEnabled!==false,
  soundEnabled:()=>preferences.notificationSound!==false,
  autoUpdateEnabled:()=>preferences.autoUpdate!==false
 };
 window.addEventListener("wallpaperhub:settings-updated",event=>{
  if(event.detail?.source==="remote-load")return;
  preferences=readLocal();apply();
  if(event.detail?.source!=="local-change")return;
  clearTimeout(syncTimer);syncTimer=setTimeout(()=>{void syncAccountSettings();},250);
 });
 window.addEventListener("storage",event=>{
  if(!event.key||event.key===KEY||event.key===CARD_KEY){preferences=readLocal();apply();dispatchLoaded();}
  if(event.key&&event.key.startsWith("sb-")&&event.newValue)void loadAccountSettings();
 });
 window.addEventListener("focus",()=>{checkAutoRefresh();void checkSystemUpdate();});
 window.addEventListener("online",checkAutoRefresh);
 window.addEventListener("pageshow",()=>{checkAutoRefresh();void checkSystemUpdate();});
 document.addEventListener("visibilitychange",()=>{if(!document.hidden){checkAutoRefresh();void checkSystemUpdate();}});
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply,{once:true});else apply();
 setupSearchHistory();
 dispatchLoaded();
 void loadAccountSettings();
 void checkSystemUpdate();
})();