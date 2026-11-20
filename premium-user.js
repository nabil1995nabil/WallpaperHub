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
  ["#profileBtn","#openProfileIcon","#bottomProfileBtn","#backBtn","#premiumGateBack"].forEach(selector => {
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

function showPremiumGate(title,message,progress=""){
  $("#premiumMain").hidden=true;
  $("#premiumLockedState").hidden=false;
  $("#premiumGateTitle").textContent=title;
  $("#premiumGateMessage").textContent=message;
  $("#premiumGateProgress").textContent=progress;
  $("#shareBtn").hidden=true;
}

async function loadPremiumProfile(){
  try{
    activeProfileUID = await resolveProfileUID();
    setProfileLinks(activeProfileUID);

    if(!activeProfileUID){
      showPremiumGate(
        "سجّل الدخول أولاً",
        "صفحة المستخدم المميز مرتبطة بحسابك، ويجب تسجيل الدخول للتحقق من الشارات."
      );
      return;
    }

    // The server is the source of truth. A manually typed URL cannot bypass
    // the medal requirement because the page content stays hidden until allowed.
    const accessResponse = await fetch(
      `/api/users/${encodeURIComponent(activeProfileUID)}/premium-access`,
      {method:"GET",headers:{Accept:"application/json"},cache:"no-store"}
    );
    const access = await accessResponse.json().catch(()=>({}));
    if(!accessResponse.ok || access.success!==true){
      throw new Error(access.message || "تعذر التحقق من صلاحية صفحة Premium");
    }

    if(access.allowed!==true){
      showPremiumGate(
        "صفحة المستخدم المميز مقفولة",
        "خاصك تحصل على جميع الشارات التي يمنحها مالك الموقع قبل فتح هذه الصفحة.",
        `الشارات المكتسبة: ${Number(access.earned||0)} من ${Number(access.total||0)}`
      );
      return;
    }

    $("#premiumLockedState").hidden=true;
    $("#premiumMain").hidden=false;
    $("#shareBtn").hidden=false;

    const response = await fetch(`/api/users/${encodeURIComponent(activeProfileUID)}/profile`,{
      method:"GET",headers:{Accept:"application/json"},cache:"no-store"
    });
    const payload = await response.json().catch(() => ({}));
    if(!response.ok || payload?.success !== true || !payload?.user){
      throw new Error(payload?.message || "تعذر تحميل بيانات الملف الشخصي");
    }
    setMemberIdentity(payload.user);
    $("#previewStatus").textContent = access.isOwner
      ? "مرحباً بمالك WallpaperHub — لديك وصول دائم."
      : "تم فتح الصفحة بعد اكتمال جميع الشارات.";
  }catch(error){
    console.warn("PREMIUM USER ACCESS:",error);
    showPremiumGate(
      "تعذر التحقق من الوصول",
      error.message || "تعذر التحقق من الشارات. ارجع إلى البروفايل وحاول مجدداً."
    );
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
