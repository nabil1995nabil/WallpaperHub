import { supabase } from "./supabase.js";

const $ = selector => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const requestedUID = String(params.get("uid") || "").trim();
let activeProfileUID = requestedUID;

function showToast(message){
  const toast = $("#toast");
  if(!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"),2200);
}

function makeProfileUrl(uid){
  return uid ? `profile.html?uid=${encodeURIComponent(uid)}` : "profile.html";
}

function setProfileLinks(uid){
  const url = makeProfileUrl(uid);
  ["#profileBtn","#openProfileIcon","#bottomProfileBtn","#backBtn"].forEach(selector => {
    const link = $(selector);
    if(link) link.href = url;
  });
}

function setMemberIdentity(profile){
  const name = String(profile.full_name || profile.username || "مستخدم WallpaperHub").trim();
  const username = String(profile.username || "").trim();
  const avatar = String(profile.avatar_url || profile.avatar || profile.photoURL || "").trim();
  const cover = String(profile.cover_url || profile.cover || "").trim();
  const bio = String(profile.bio || "").trim();

  $("#memberName").textContent = name;
  $("#memberUsername").textContent = username ? `@${username.replace(/^@/,"")}` : "عضو في WallpaperHub";
  $("#memberBio").textContent = bio || "هذا المستخدم يشارك اهتمامه بالخلفيات والتصميم على WallpaperHub.";
  $("#memberInitial").textContent = Array.from(name)[0] || "W";

  const avatarImage = $("#memberAvatarImage");
  if(avatar){
    avatarImage.src = avatar;
    avatarImage.hidden = false;
    avatarImage.onerror = () => {
      avatarImage.hidden = true;
      avatarImage.removeAttribute("src");
    };
  }else{
    avatarImage.hidden = true;
    avatarImage.removeAttribute("src");
  }

  $("#memberVerified").hidden = profile.is_verified !== true;

  const coverElement = $("#memberCover");
  if(cover){
    coverElement.style.backgroundImage = `linear-gradient(0deg,#0d183e66,transparent),url("${cover.replace(/["\\\\]/g,"")}")`;
    coverElement.classList.add("has-image");
  }
}

async function resolveProfileUID(){
  if(requestedUID) return requestedUID;
  const {data,error} = await supabase.auth.getSession();
  if(error) throw error;
  return String(data?.session?.user?.id || "").trim();
}

async function loadPremiumProfile(){
  try{
    activeProfileUID = await resolveProfileUID();
    setProfileLinks(activeProfileUID);
    if(!activeProfileUID){
      $("#memberName").textContent = "ملف المستخدم";
      $("#memberUsername").textContent = "سجّل الدخول لعرض حسابك";
      $("#memberBio").textContent = "يمكنك العودة إلى صفحة البروفايل أو تسجيل الدخول لمعاينة حسابك.";
      $("#memberInitial").textContent = "W";
      $("#previewStatus").textContent = "لم يتم تحديد مستخدم. افتح هذه الصفحة من بطاقة المستخدم المميز في البروفايل.";
      return;
    }

    const response = await fetch(`/api/users/${encodeURIComponent(activeProfileUID)}/profile`,{
      method:"GET",headers:{Accept:"application/json"},cache:"no-store"
    });
    const payload = await response.json().catch(() => ({}));
    if(!response.ok || payload?.success !== true || !payload?.user){
      throw new Error(payload?.message || "تعذر تحميل بيانات الملف الشخصي");
    }
    setMemberIdentity(payload.user);
    $("#previewStatus").textContent = "تم جلب الاسم والصورة والنبذة وحالة التوثيق من ملف المستخدم.";
  }catch(error){
    console.warn("PREMIUM USER PROFILE:",error);
    $("#memberName").textContent = "تعذر تحميل الحساب";
    $("#memberUsername").textContent = "حاول فتح صفحة البروفايل من جديد";
    $("#memberBio").textContent = "لم نتمكن من جلب بيانات المستخدم حالياً.";
    $("#previewStatus").textContent = error.message || "تعذر تحميل بيانات الحساب.";
  }
}

$("#shareBtn")?.addEventListener("click",async()=>{
  const shareData = {title:"المستخدم المميز | WallpaperHub",text:"شاهد صفحة المستخدم المميز على WallpaperHub.",url:location.href};
  try{
    if(navigator.share) await navigator.share(shareData);
    else if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(location.href);
      showToast("تم نسخ رابط الصفحة");
    }else showToast("تعذر نسخ الرابط من هذا المتصفح");
  }catch(error){
    if(error?.name !== "AbortError") showToast("تعذرت مشاركة الصفحة");
  }
});

loadPremiumProfile();
