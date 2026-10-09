import { supabase } from "../supabase.js";

let reports = [];
let activeStatus = "all";
let activePriority = "all";
let selectedReport = null;

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

function escapeHtml(value){
  return String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function initials(name){
  const v=String(name||"عضو").trim();
  return v.slice(0,1)||"ع";
}

function timeOf(value){
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-MA",{dateStyle:"medium",timeStyle:"short"});
}

function statusLabel(v){
  return {pending:"قيد الانتظار",reviewing:"قيد المراجعة",resolved:"تمت المعالجة",dismissed:"مرفوض"}[v]||v||"—";
}
function priorityLabel(v){
  return {normal:"عادية",high:"عالية",urgent:"عاجلة"}[v]||v||"—";
}

function showToast(text){
  const el=$("#toast");
  if(!el)return;
  el.textContent=text;
  el.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer=setTimeout(()=>el.classList.remove("show"),3000);
}

async function token(){
  const {data,error}=await supabase.auth.getSession();
  if(error) throw error;
  const t=data?.session?.access_token||"";
  if(!t) throw new Error("انتهت جلسة تسجيل الدخول");
  return t;
}

async function api(url,options={}){
  const t=await token();
  const headers=new Headers(options.headers||{});
  headers.set("Authorization",`Bearer ${t}`);
  if(options.body && !headers.has("Content-Type")) headers.set("Content-Type","application/json");
  const response=await fetch(url,{...options,headers,cache:"no-store"});
  const raw=await response.text();
  let data={};
  try{data=raw?JSON.parse(raw):{}}catch{}
  if(!response.ok || data.success===false){
    const error=new Error(data.message||`HTTP ${response.status}`);
    error.status=response.status;
    throw error;
  }
  return data;
}

function renderStats(stats={}){
  $("#statTotal").textContent=stats.total??0;
  $("#statPending").textContent=stats.pending??0;
  $("#statReviewing").textContent=stats.reviewing??0;
  $("#statResolved").textContent=stats.resolved??0;
  $("#statHigh").textContent=stats.highPriority??0;
}

function filteredReports(){
  const q=$("#searchInput").value.trim().toLowerCase();
  return reports.filter(r=>{
    if(activeStatus!=="all" && r.status!==activeStatus)return false;
    if(activePriority!=="all" && r.priority!==activePriority)return false;
    if(!q)return true;
    return [
      r.reporterName,r.reporterUsername,r.reporterEmail,
      r.targetUserName,r.targetUserEmail,r.messageText,
      r.reasonLabel,r.details
    ].join(" ").toLowerCase().includes(q);
  });
}

function renderReports(){
  const list=$("#reportsList");
  const rows=filteredReports();
  list.innerHTML="";
  if(!rows.length){
    list.innerHTML=`<div class="empty-state"><span class="material-icons-round">flag</span><b>لا توجد بلاغات مطابقة</b><span>جرّب تغيير الفلتر أو البحث.</span></div>`;
    return;
  }

  rows.forEach(report=>{
    const row=document.createElement("article");
    row.className="report-row";

    const avatar=report.reporterAvatarUrl
      ? `<img src="${escapeHtml(report.reporterAvatarUrl)}" alt="">`
      : escapeHtml(initials(report.reporterName));

    const text=report.messageText.trim() ||
      (report.messageImageUrl?"📷 صورة":
       report.messageFileUrl?`📎 ${report.messageFileName||"ملف"}`:"رسالة");

    row.innerHTML=`
      <div class="report-main">
        <div class="report-avatar">${avatar}</div>
        <div class="report-copy">
          <div class="report-top">
            <b>${escapeHtml(report.reporterName)}</b>
            <time>${escapeHtml(timeOf(report.createdAt))}</time>
          </div>
          <div class="report-sub">أبلغ عن رسالة <strong>${escapeHtml(report.targetUserName)}</strong> · ${escapeHtml(report.reasonLabel)}</div>
          <div class="report-message">${escapeHtml(text)}</div>
          <div class="report-meta">
            <span class="badge reason-badge">${escapeHtml(report.reasonLabel)}</span>
            <span class="badge status-badge ${escapeHtml(report.status)}">${escapeHtml(statusLabel(report.status))}</span>
            <span class="badge priority-badge ${escapeHtml(report.priority)}">${escapeHtml(priorityLabel(report.priority))}</span>
            ${report.duplicateCount>1?`<span class="badge priority-badge">${report.duplicateCount} بلاغات على الرسالة</span>`:""}
          </div>
        </div>
      </div>
      <button class="report-open" type="button" data-report-id="${escapeHtml(report.id)}">عرض التفاصيل</button>
    `;
    list.appendChild(row);
  });
}

async function loadReports(){
  $("#loadState").textContent="جاري التحميل...";
  try{
    const data=await api(`/api/admin/community-reports?limit=1000`);
    reports=Array.isArray(data.reports)?data.reports:[];
    renderStats(data.stats||{});
    renderReports();
    $("#loadState").textContent="متصل بـ Supabase";
  }catch(error){
    if(error.status===401 || error.status===403){
      showToast(error.message||"غير مصرح");
      setTimeout(()=>location.href="/admin",700);
      return;
    }
    $("#loadState").textContent="تعذر الاتصال";
    $("#reportsList").innerHTML=`<div class="empty-state"><span class="material-icons-round">error_outline</span><b>${escapeHtml(error.message||"تعذر تحميل البلاغات")}</b></div>`;
  }
}

function setAvatar(el,url,name){
  if(!el)return;
  el.innerHTML="";
  if(url){
    const img=document.createElement("img");
    img.src=url;img.alt="";
    el.appendChild(img);
  }else el.textContent=initials(name);
}

function openDrawer(report){
  selectedReport=report;
  $("#reportDrawer").classList.remove("hidden");
  $("#reportDrawer").setAttribute("aria-hidden","false");

  $("#drawerTitle").textContent=`بلاغ ${report.reasonLabel}`;
  setAvatar($("#reporterAvatar"),report.reporterAvatarUrl,report.reporterName);
  $("#reporterName").textContent=report.reporterName||"عضو";
  $("#reporterUsername").textContent=report.reporterUsername?`@${report.reporterUsername}`:"";
  const email=$("#reporterEmail");
  email.textContent=report.reporterEmail||"لا يوجد بريد";
  email.href=report.reporterEmail?`mailto:${report.reporterEmail}`:"#";
  $("#reportCreatedAt").textContent=timeOf(report.createdAt);
  $("#duplicateCount").textContent=report.duplicateCount||1;
  $("#detailReason").textContent=report.reasonLabel;
  $("#detailPriority").textContent=priorityLabel(report.priority);
  $("#detailPriority").className=`priority-badge ${report.priority}`;
  $("#detailDetails").textContent=report.details||"لا توجد تفاصيل إضافية.";

  setAvatar($("#targetAvatar"),report.targetUserAvatarUrl,report.targetUserName);
  $("#targetName").textContent=report.targetUserName||"عضو";
  $("#targetEmail").textContent=report.targetUserEmail||"";
  $("#messageCreatedAt").textContent=report.messageCreatedAt?`وقت إرسال الرسالة: ${timeOf(report.messageCreatedAt)}`:"";
  $("#messageText").textContent=report.messageText||(
    report.messageImageUrl?"📷 صورة":
    report.messageFileUrl?`📎 ${report.messageFileName||"ملف"}`:"رسالة بدون نص"
  );

  const image=$("#messageImage");
  image.classList.toggle("hidden",!report.messageImageUrl);
  if(report.messageImageUrl)image.src=report.messageImageUrl;else image.removeAttribute("src");

  const file=$("#messageFile");
  file.classList.toggle("hidden",!report.messageFileUrl);
  if(report.messageFileUrl){
    file.href=report.messageFileUrl;
    file.textContent=`📎 ${report.messageFileName||"فتح الملف"}`;
  }else{
    file.removeAttribute("href");
    file.textContent="";
  }

  $("#statusSelect").value=report.status;
  $("#prioritySelect").value=report.priority;
  $("#adminNotes").value=report.adminNotes||"";
  $("#moderationReason").value="";
  loadModerationState(report.targetUserId);
}

function closeDrawer(){
  $("#reportDrawer").classList.add("hidden");
  $("#reportDrawer").setAttribute("aria-hidden","true");
  selectedReport=null;
}

async function saveReport(){
  if(!selectedReport)return;
  const button=$("#saveReport");
  button.disabled=true;
  try{
    await api(`/api/admin/community-reports/${encodeURIComponent(selectedReport.id)}`,{
      method:"PATCH",
      body:JSON.stringify({
        status:$("#statusSelect").value,
        priority:$("#prioritySelect").value,
        adminNotes:$("#adminNotes").value
      })
    });
    showToast("تم حفظ قرار البلاغ");
    await loadReports();
    const refreshed=reports.find(x=>x.id===selectedReport.id);
    if(refreshed)openDrawer(refreshed);else closeDrawer();
  }catch(error){showToast(error.message||"تعذر حفظ البلاغ")}
  finally{button.disabled=false}
}

async function deleteReportedMessage(){
  if(!selectedReport?.messageId)return;
  if(!confirm("حذف الرسالة المبلّغ عنها؟ سيتم حفظ سجل البلاغ للمراجعة."))return;

  const button=$("#deleteReportedMessage");
  button.disabled=true;
  try{
    await api(`/api/admin/community-reports/${encodeURIComponent(selectedReport.id)}/message`,{method:"DELETE"});
    showToast("تم حذف الرسالة وتحديث البلاغات المرتبطة بها");
    closeDrawer();
    await loadReports();
  }catch(error){showToast(error.message||"تعذر حذف الرسالة")}
  finally{button.disabled=false}
}

async function applyCommunityModeration(action, duration="24h"){
  if(!selectedReport?.targetUserId)return;
  const reason=String($("#moderationReason")?.value||"").trim();
  try{
    const result=await api(`/api/admin/community-moderation/${encodeURIComponent(selectedReport.targetUserId)}`,{
      method:"PATCH",body:JSON.stringify({action,duration,reason})
    });
    showToast(result?.message || "تم تطبيق إجراء المجتمع");
    renderModerationState(result?.moderation);
    await loadReports();
  }catch(error){showToast(error.message||"تعذر تطبيق الإجراء");}
}
function formatModerationUntil(value){
  if(!value)return "دائم";
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return "—";
  return d.toLocaleString("ar-MA",{dateStyle:"medium",timeStyle:"short"});
}
function renderModerationState(state){
  const el=$("#moderationCurrentState");
  if(!el)return;
  if(!state){el.textContent="لا توجد بيانات حالية.";return;}
  const items=[];
  if(state.communityBanned) items.push(state.communityBanPermanent?"🚫 استبعاد المجتمع: دائم":`🚫 استبعاد المجتمع حتى ${formatModerationUntil(state.communityBanUntil)}`);
  if(state.chatFrozen) items.push(state.communityChatFreezePermanent
    ? "✍️ تجميد الكتابة: دائم"
    : `✍️ تجميد الكتابة حتى ${formatModerationUntil(state.communityChatFreezeUntil)}`);
  if(state.voiceFrozen) items.push(state.communityVoiceFreezePermanent
    ? "🎙️ تجميد الصوت: دائم"
    : `🎙️ تجميد الصوت حتى ${formatModerationUntil(state.communityVoiceFreezeUntil)}`);
  el.textContent=items.length?items.join(" · "):"لا توجد قيود مجتمع نشطة على هذا المستخدم.";
}
async function loadModerationState(userId){
  const el=$("#moderationCurrentState");
  if(el)el.textContent="جاري تحميل حالة قيود المجتمع...";
  try{
    const data=await api(`/api/community/admin-moderation/${encodeURIComponent(userId)}`);
    renderModerationState(data.moderation);
  }catch(error){
    if(el)el.textContent="تعذر تحميل الحالة الحالية، يمكنك تطبيق إجراء جديد.";
  }
}

$("#applyCommunityBan").addEventListener("click",()=>applyCommunityModeration("community_ban",$("#communityBanDuration").value));
$("#clearCommunityBan").addEventListener("click",()=>applyCommunityModeration("clear_community_ban"));
$("#applyChatFreeze").addEventListener("click",()=>applyCommunityModeration("chat_freeze",$("#chatFreezeDuration").value));
$("#clearChatFreeze").addEventListener("click",()=>applyCommunityModeration("clear_chat_freeze"));
$("#applyVoiceFreeze").addEventListener("click",()=>applyCommunityModeration("voice_freeze",$("#voiceFreezeDuration").value));
$("#clearVoiceFreeze").addEventListener("click",()=>applyCommunityModeration("clear_voice_freeze"));

$("#reportsList").addEventListener("click",event=>{
  const button=event.target.closest("[data-report-id]");
  if(!button)return;
  const report=reports.find(x=>x.id===button.dataset.reportId);
  if(report)openDrawer(report);
});

$("#statusFilters").addEventListener("click",event=>{
  const button=event.target.closest("[data-status]");
  if(!button)return;
  activeStatus=button.dataset.status;
  $$("#statusFilters .filter").forEach(x=>x.classList.toggle("active",x===button));
  renderReports();
});

$("#priorityFilter").addEventListener("change",event=>{
  activePriority=event.target.value;
  renderReports();
});
$("#searchInput").addEventListener("input",renderReports);
$("#refreshReports").addEventListener("click",loadReports);
$("#backAdmin").addEventListener("click",()=>location.href="/admin");
$("#closeDrawer").addEventListener("click",closeDrawer);
$("#drawerBackdrop").addEventListener("click",closeDrawer);
$("#saveReport").addEventListener("click",saveReport);
$("#deleteReportedMessage").addEventListener("click",deleteReportedMessage);
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!$("#reportDrawer").classList.contains("hidden"))closeDrawer()});

(async()=>{
  try{
    const {data}=await supabase.auth.getSession();
    if(!data?.session?.access_token){
      location.href="/admin";
      return;
    }
    await loadReports();
  }catch(error){
    showToast(error.message||"تعذر التحقق من جلسة الإدارة");
  }
})();
