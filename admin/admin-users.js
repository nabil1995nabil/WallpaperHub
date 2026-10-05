const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
let users=[], selected=null, activeFilter="all";

const fallbackUsers=[
 {id:"demo-001",name:"مستخدم تجريبي",username:"demo",email:"demo@example.com",avatar_url:"",role:"user",status:"active",is_verified:false,email_confirmed:true,last_sign_in_at:null,last_activity_at:null,created_at:new Date().toISOString(),stats:{wallpapers:0,views:0,downloads:0,likes:0,favorites:0}}
];

function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function fmt(v){if(!v)return"—";try{return new Intl.DateTimeFormat("ar",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v))}catch{return String(v)}}
function isNew(u){return u.created_at && Date.now()-new Date(u.created_at).getTime()<7*864e5}
function isBanned(u){return ["banned","blocked"].includes(String(u.status||"").toLowerCase())}
function isActive(u){return !isBanned(u)&&String(u.status||"active").toLowerCase()==="active"}
function showToast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove("show"),2200)}
function avatar(u){return u.avatar_url||u.avatar||"https://ui-avatars.com/api/?name="+encodeURIComponent(u.name||u.username||"U")+"&background=eaf3ff&color=168bf0"}

function renderStats(){
 const today=new Date().toDateString();
 $("#statTotal").textContent=users.length;
 $("#statNew").textContent=users.filter(u=>u.created_at&&new Date(u.created_at).toDateString()===today).length;
 $("#statVerified").textContent=users.filter(u=>u.is_verified).length;
 $("#statBanned").textContent=users.filter(isBanned).length;
 $("#statActive").textContent=users.filter(isActive).length;
}
function matches(u){
 const q=$("#userSearch").value.trim().toLowerCase();
 if(q&&!`${u.name||""} ${u.username||""} ${u.id||""} ${u.email||""}`.toLowerCase().includes(q))return false;
 if(activeFilter==="active"&&!isActive(u))return false;
 if(activeFilter==="verified"&&!u.is_verified)return false;
 if(activeFilter==="unverified"&&u.is_verified)return false;
 if(activeFilter==="banned"&&!isBanned(u))return false;
 if(activeFilter==="admin"&&u.role!=="admin")return false;
 if(activeFilter==="new"&&!isNew(u))return false;
 return true;
}
function renderUsers(){
 const list=$("#usersList"), rows=users.filter(matches);
 $("#resultCount").textContent=`${rows.length} مستخدم`;
 list.innerHTML=rows.map(u=>`<article class="user-row" data-id="${esc(u.id)}">
 <img class="user-avatar" src="${esc(avatar(u))}" alt="">
 <div class="user-main"><strong>${esc(u.name||u.username||"مستخدم")}</strong><small>@${esc(u.username||"—")} · ${esc(u.id)}</small></div>
 <div class="row-status">${u.is_verified?'<span class="badge verified">موثق</span>':""}${u.role==="admin"?'<span class="badge admin">Admin</span>':""}${isBanned(u)?'<span class="badge banned">محظور</span>':""}</div>
 <span class="row-last">${fmt(u.last_activity_at||u.last_sign_in_at)}</span></article>`).join("");
 $("#emptyState").hidden=rows.length>0;
 $$(".user-row").forEach(r=>r.addEventListener("click",()=>openDrawer(r.dataset.id)));
}
function fillDetail(u){
 selected=u;
 $("#detailAvatar").src=avatar(u);$("#detailName").textContent=u.name||u.username||"مستخدم";$("#detailUsername").textContent=u.username?`@${u.username}`:"—";
 $("#detailStatus").textContent=isBanned(u)?"محظور":isActive(u)?"نشط":"معطل";$("#detailRole").textContent=(u.role||"user").toUpperCase();
 $("#detailActivity").textContent=fmt(u.last_activity_at);$("#detailLogin").textContent=fmt(u.last_sign_in_at);$("#detailEmail").textContent=u.email||"—";
 $("#detailEmailVerified").textContent=u.email_confirmed?"مؤكد":"غير مؤكد";$("#detailUid").textContent=u.id||"—";$("#detailAvatarStatus").textContent=u.avatar_url?"لديه صورة":"بدون صورة";
 $("#roleSelect").value=["user","moderator","admin"].includes(u.role)?u.role:"user";
 $("#verifyState").textContent=u.is_verified?"موثق ✓":"غير موثق";$("#verifyMeta").textContent=u.verified_at?`تم التوثيق: ${fmt(u.verified_at)}${u.verified_by?` · بواسطة ${u.verified_by}`:""}`:"لم يتم التوثيق بعد.";
 $("#toggleVerify").textContent=u.is_verified?"إلغاء التوثيق":"توثيق الحساب";
 const s=u.stats||{};$("#metricWallpapers").textContent=s.wallpapers??0;$("#metricViews").textContent=s.views??0;$("#metricDownloads").textContent=s.downloads??0;$("#metricLikes").textContent=s.likes??0;$("#metricFavorites").textContent=s.favorites??0;
 $("#detailProfileLink").href=u.profile_url||`/profile.html?uid=${encodeURIComponent(u.id||"")}`;$("#adminNotes").value=u.admin_notes||"";
}
function openDrawer(id){const u=users.find(x=>String(x.id)===String(id));if(!u)return;fillDetail(u);$("#userDrawer").classList.add("open");$("#drawerBackdrop").classList.add("open");$("#userDrawer").setAttribute("aria-hidden","false")}
function closeDrawer(){$("#userDrawer").classList.remove("open");$("#drawerBackdrop").classList.remove("open");$("#userDrawer").setAttribute("aria-hidden","true");selected=null}
async function getToken(){try{const mod=await import("/js/supabase.js");const {data}=await mod.supabase.auth.getSession();return data?.session?.access_token||""}catch{return""}}
async function api(url,options={}){
 const token=await getToken();const headers={"Content-Type":"application/json",...(options.headers||{})};if(token)headers.Authorization=`Bearer ${token}`;
 const r=await fetch(url,{...options,headers});let data={};try{data=await r.json()}catch{}if(!r.ok)throw new Error(data.message||`HTTP ${r.status}`);return data;
}
async function loadUsers(){
 $("#loadState").textContent="جاري التحميل…";
 try{
   const data=await api("/api/admin/users");
   users=Array.isArray(data.users)?data.users:[];
   $("#loadState").textContent="متصل بـ Supabase";
 }catch(e){
   users=fallbackUsers;
   $("#loadState").textContent="وضع المعاينة";
   console.warn("ADMIN USERS:",e);
 }
 renderStats();renderUsers();
}
async function action(endpoint,body,msg){
 try{await api(endpoint,{method:"POST",body:JSON.stringify(body)});showToast(msg);await loadUsers();if(selected){const u=users.find(x=>String(x.id)===String(selected.id));if(u)fillDetail(u)}}catch(e){showToast(e.message||"تعذر تنفيذ الإجراء")}
}

$("#refreshUsers").onclick=loadUsers;$("#closeDrawer").onclick=closeDrawer;$("#drawerBackdrop").onclick=closeDrawer;
$("#userSearch").oninput=renderUsers;
$("#filters").addEventListener("click",e=>{const b=e.target.closest(".filter");if(!b)return;activeFilter=b.dataset.filter;$$(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderUsers()});
$("#copyUid").onclick=async()=>{if(!selected)return;await navigator.clipboard.writeText(selected.id);showToast("تم نسخ UID")};
$("#toggleVerify").onclick=()=>selected&&action(`/api/admin/users/${encodeURIComponent(selected.id)}/verification`,{verified:!selected.is_verified},"تم تحديث حالة التوثيق");
$("#saveRole").onclick=()=>selected&&action(`/api/admin/users/${encodeURIComponent(selected.id)}/role`,{role:$("#roleSelect").value},"تم تحديث الدور");
$("#saveNotes").onclick=()=>selected&&action(`/api/admin/users/${encodeURIComponent(selected.id)}/notes`,{notes:$("#adminNotes").value},"تم حفظ الملاحظات");
$("#temporaryBan").onclick=()=>selected&&action(`/api/admin/users/${encodeURIComponent(selected.id)}/ban`,{type:"temporary",reason:$("#actionReason").value,duration:$("#banDuration").value},"تم إرسال طلب الحظر المؤقت");
$("#permanentBan").onclick=()=>selected&&action(`/api/admin/users/${encodeURIComponent(selected.id)}/ban`,{type:"permanent",reason:$("#actionReason").value},"تم إرسال طلب الحظر الدائم");
$("#unbanUser").onclick=()=>selected&&action(`/api/admin/users/${encodeURIComponent(selected.id)}/unban`,{},"تم إرسال طلب إلغاء الحظر");
$("#warnUser").onclick=()=>selected&&action(`/api/admin/users/${encodeURIComponent(selected.id)}/warning`,{reason:$("#actionReason").value},"تم تسجيل التحذير");
$("#addMedal").onclick=()=>showToast("واجهة إضافة الميدالية جاهزة للربط بجدول الميداليات");
$("#resetMedals").onclick=()=>showToast("إعادة ضبط الميداليات جاهزة للربط بسجل الميداليات");

loadUsers();
