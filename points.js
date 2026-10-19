import { supabase } from "./supabase.js";

const totalEl = document.getElementById("pointsTotal");
const statusEl = document.getElementById("pointsStatus");
const ledgerEl = document.getElementById("pointsLedger");
document.getElementById("pointsBackBtn")?.addEventListener("click",()=>{
  if (window.history.length > 1) window.history.back();
  else window.location.href = "profile.html";
});

function formatPoints(value){
  const number = Number(value || 0);
  return number.toLocaleString("ar-MA", {maximumFractionDigits:1});
}
function formatDate(value){
  if(!value) return "";
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ar-MA",{dateStyle:"medium",timeStyle:"short"}).format(date);
}
function labelForReason(reason){
  const value = String(reason || "").toLowerCase();
  if(value.includes("daily")) return "المكافأة اليومية";
  if(value.includes("goal")) return "مكافأة إكمال هدف";
  if(value.includes("upload") || value.includes("wallpaper") || value.includes("publish")) return "نشر خلفية";
  if(value.includes("redeem")) return "استبدال نقاط";
  return String(reason || "إضافة نقاط").replaceAll("_"," ");
}
function renderEntries(entries){
  ledgerEl.replaceChildren();
  if(!Array.isArray(entries) || !entries.length){
    statusEl.textContent = "مازال ما عندك حتى عملية مسجلة فالسجل.";
    return;
  }
  statusEl.textContent = "آخر العمليات المسجلة";
  entries.forEach(entry=>{
    const row=document.createElement("article"); row.className="ledger-row";
    const icon=document.createElement("span"); icon.className="material-icons ledger-icon"; icon.textContent="stars";
    const copy=document.createElement("div"); copy.className="ledger-copy";
    const title=document.createElement("div"); title.className="ledger-title"; title.textContent=labelForReason(entry.reason);
    const date=document.createElement("div"); date.className="ledger-date"; date.textContent=formatDate(entry.created_at);
    copy.append(title,date);
    const points=document.createElement("strong"); points.className="ledger-points";
    const amount=Number(entry.points || 0); points.textContent=`${amount>0?"+":""}${formatPoints(amount)}`;
    if(amount<0) points.style.color="#d94b5b";
    row.append(icon,copy,points); ledgerEl.append(row);
  });
}
async function loadPoints(){
  try{
    const {data,error}=await supabase.auth.getSession();
    if(error) throw error;
    const token=data?.session?.access_token;
    if(!token){
      statusEl.textContent="سجّل الدخول باش تشوف نقاطك.";
      totalEl.textContent="—";
      const row=document.createElement("div"); row.className="ledger-row";
      const link=document.createElement("a"); link.href="profile.html"; link.textContent="الرجوع إلى حسابي وتسجيل الدخول"; link.style.color="inherit";
      row.append(link); ledgerEl.replaceChildren(row); return;
    }
    const response=await fetch("/api/points/me",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok || payload?.success!==true) throw new Error(payload?.message || "تعذر تحميل النقاط");
    totalEl.textContent=formatPoints(payload.total);
    renderEntries(payload.entries);
  }catch(error){
    console.error("POINTS PAGE LOAD:",error);
    totalEl.textContent="—";
    statusEl.textContent=error.message || "تعذر تحميل النقاط حالياً.";
  }
}
loadPoints();
