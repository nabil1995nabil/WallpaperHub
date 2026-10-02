const toast = document.getElementById("toast");

function showToast(message){
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(()=>toast.classList.remove("show"), 2200);
}

document.getElementById("backBtn").addEventListener("click",()=>history.length > 1 ? history.back() : showToast("العودة إلى الصفحة السابقة"));
document.getElementById("moreBtn").addEventListener("click",()=>showToast("خيارات المستخدم المميز"));
document.getElementById("profileBtn").addEventListener("click",()=>showToast("سيتم فتح الملف الشخصي"));
document.getElementById("shareBtn").addEventListener("click",async()=>{
  const data={title:"المستخدم المميز",text:"Nabil Rahali - مستخدم مميز في WallpaperHub"};
  try{
    if(navigator.share) await navigator.share(data);
    else { await navigator.clipboard.writeText(location.href); showToast("تم نسخ رابط الصفحة"); }
  }catch(e){}
});
document.getElementById("badgesBtn").addEventListener("click",()=>showToast("تم عرض الأوسمة والإنجازات"));
document.getElementById("galleryBtn").addEventListener("click",()=>showToast("سيتم فتح جميع الخلفيات"));

document.querySelectorAll(".bottom-nav button").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.remove("selected"));
    btn.classList.add("selected");
    showToast(btn.textContent.trim());
  });
});

document.querySelectorAll(".benefit-card").forEach(card=>{
  card.addEventListener("click",()=>{
    document.querySelectorAll(".benefit-card").forEach(c=>c.classList.remove("active"));
    card.classList.add("active");
  });
});
