import { supabase } from "./supabase.js";
const toggle=document.getElementById("browserNotifications");
const SETTINGS_KEY="wallpaperSettings";
function readSettings(){try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}")}catch{return {}}}
function saveToggle(value){const s=readSettings();s.browserNotifications=!!value;localStorage.setItem(SETTINGS_KEY,JSON.stringify(s));if(toggle)toggle.checked=!!value}
function urlBase64ToUint8Array(value){const padding="=".repeat((4-value.length%4)%4);const base64=(value+padding).replace(/-/g,"+").replace(/_/g,"/");return Uint8Array.from([...atob(base64)].map(c=>c.charCodeAt(0)))}
async function currentSession(){const {data,error}=await supabase.auth.getSession();if(error)throw error;return data?.session||null}
async function enablePush(){
 if(!("serviceWorker"in navigator)||!("PushManager"in window)||!("Notification"in window))throw new Error("هذا المتصفح لا يدعم إشعارات الهاتف. جرّب Chrome على Android.");
 if(!window.isSecureContext)throw new Error("إشعارات الهاتف تحتاج HTTPS.");
 const session=await currentSession();if(!session?.access_token)throw new Error("سجّل الدخول إلى WallpaperHub أولًا.");
 const permission=await Notification.requestPermission();if(permission!=="granted")throw new Error("لم تسمح بإشعارات النظام من إعدادات المتصفح.");
 const kr=await fetch("/api/push/public-key",{cache:"no-store"});const kd=await kr.json().catch(()=>({}));if(!kr.ok||!kd.publicKey)throw new Error(kd.message||"خادم إشعارات الهاتف غير مهيأ بعد.");
 const registration=await navigator.serviceWorker.register("/service-worker.js",{scope:"/"});await navigator.serviceWorker.ready;
 let subscription=await registration.pushManager.getSubscription();
 if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(kd.publicKey)});
 const response=await fetch("/api/push/subscribe",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({subscription:subscription.toJSON()})});
 const result=await response.json().catch(()=>({}));if(!response.ok||!result.success)throw new Error(result.message||"تعذر تفعيل إشعارات الهاتف.");
 saveToggle(true);alert("تم تفعيل إشعارات الهاتف على هذا الجهاز.");
}
async function disablePush(){
 try{const registration=await navigator.serviceWorker.getRegistration("/");const subscription=await registration?.pushManager?.getSubscription();if(subscription){const session=await currentSession().catch(()=>null);if(session?.access_token)await fetch("/api/push/unsubscribe",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({endpoint:subscription.endpoint})}).catch(()=>{});await subscription.unsubscribe()}}
 finally{saveToggle(false)}
}
window.addEventListener("wallpaperhub:push-toggle",async event=>{try{if(event.detail?.enabled)await enablePush();else await disablePush()}catch(error){saveToggle(false);alert(error?.message||"تعذر تغيير إعداد إشعارات الهاتف.")}});
