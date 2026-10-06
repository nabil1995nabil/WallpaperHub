
/* ==========================================
   Admin identity — reuse the existing Supabase session
   ========================================== */
import { supabase } from "../supabase.js";

async function loadAdminIdentity(){
  const nameEl = document.getElementById("adminPageUserName");
  const emailEl = document.getElementById("adminPageUserEmail");
  const avatarEl = document.getElementById("adminPageUserAvatar");

  try{
    const { data, error } = await supabase.auth.getSession();
    if(error || !data?.session){
      window.location.href = "/admin.html";
      return;
    }

    const session = data.session;
    const user = session.user;

    // Confirm this is still an admin using the same server-side check
    // already used by the main admin panel.
    const response = await fetch("/api/admin/me", {
      method:"GET",
      headers:{
        Authorization:`Bearer ${session.access_token}`
      },
      cache:"no-store"
    });

    const result = await response.json().catch(() => ({}));
    if(!response.ok || !result.isAdmin){
      window.location.href = "/admin.html";
      return;
    }

    const metadata = user?.user_metadata || {};
    let profile = null;

    try{
      const { data:profileRow } = await supabase
        .from("user_profile_sync")
        .select("full_name,username,avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      profile = profileRow || null;
    }catch(profileError){
      console.warn("ADMIN PROFILE LOAD:", profileError);
    }

    const displayName =
      profile?.full_name ||
      metadata.full_name ||
      metadata.name ||
      metadata.user_name ||
      profile?.username ||
      metadata.username ||
      user?.email?.split("@")[0] ||
      "المدير";

    const email = user?.email || "—";

    if(nameEl) nameEl.textContent = displayName;
    if(emailEl) emailEl.textContent = email;

    const avatarUrl =
      profile?.avatar_url ||
      metadata.avatar_url ||
      metadata.picture ||
      metadata.avatar ||
      "";

    if(avatarEl){
      if(avatarUrl){
        avatarEl.innerHTML = "";
        const img = document.createElement("img");
        img.src = avatarUrl;
        img.alt = displayName;
        img.referrerPolicy = "no-referrer";
        img.onerror = () => {
          avatarEl.innerHTML = '<span class="material-icons-round">person</span>';
        };
        avatarEl.appendChild(img);
      }else{
        avatarEl.innerHTML = '<span class="material-icons-round">person</span>';
      }
    }
  }catch(error){
    console.error("ADMIN IDENTITY ERROR:", error);
    if(emailEl) emailEl.textContent = "تعذر تحميل بيانات الحساب";
  }
}

document.addEventListener("DOMContentLoaded", loadAdminIdentity);

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let users = [];
let selected = null;
let selectedDetail = null;
let activeFilter = "all";

function esc(v){
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function fmt(v){
  if(!v) return "—";
  try{
    return new Intl.DateTimeFormat("ar", {
      dateStyle:"medium",
      timeStyle:"short"
    }).format(new Date(v));
  }catch{
    return String(v);
  }
}

function avatar(u){
  return u.avatar_url || u.avatar ||
    "https://ui-avatars.com/api/?name=" +
    encodeURIComponent(u.name || u.username || "U") +
    "&background=eaf3ff&color=168bf0";
}

function isNew(u){
  return u.created_at &&
    Date.now() - new Date(u.created_at).getTime() < 7 * 864e5;
}

function isBanned(u){
  return ["banned","blocked"].includes(
    String(u.status || "").toLowerCase()
  );
}

function isActive(u){
  return !isBanned(u) &&
    String(u.status || "active").toLowerCase() === "active";
}

function showToast(msg){
  const t = $("#toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => t.classList.remove("show"), 2600);
}

async function getToken(){
  try{
    const { data, error } = await supabase.auth.getSession();

    if(error){
      console.warn("تعذر قراءة جلسة Supabase:", error);
      return "";
    }

    return data?.session?.access_token || "";
  }catch(error){
    console.warn("تعذر قراءة جلسة Supabase:", error);
    return "";
  }
}

async function api(url, options = {}){
  const token = await getToken();

  if(!token){
    const error = new Error("انتهت جلسة الإدارة. أعد فتح لوحة التحكم.");
    error.code = "AUTH_REQUIRED";
    throw error;
  }

  const headers = {
    "Content-Type":"application/json",
    ...(options.headers || {}),
    Authorization:`Bearer ${token}`
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  let data = {};
  try{ data = await response.json(); }catch{}

  if(response.status === 401 || response.status === 403){
    const error = new Error(data.message || "انتهت صلاحية جلسة الإدارة.");
    error.code = "AUTH_REQUIRED";
    throw error;
  }

  if(!response.ok){
    throw new Error(data.message || `HTTP ${response.status}`);
  }

  return data;
}

function renderStats(stats){
  const fallback = {
    total_users:users.length,
    new_today:users.filter(u => {
      if(!u.created_at) return false;
      return new Date(u.created_at).toDateString() === new Date().toDateString();
    }).length,
    verified:users.filter(u => u.is_verified).length,
    banned:users.filter(isBanned).length,
    active_now:users.filter(u => {
      if(!u.last_sign_in_at) return false;
      return Date.now() - new Date(u.last_sign_in_at).getTime() <= 15 * 60 * 1000;
    }).length
  };

  const s = stats || fallback;
  $("#statTotal").textContent = s.total_users ?? fallback.total_users;
  $("#statNew").textContent = s.new_today ?? fallback.new_today;
  $("#statVerified").textContent = s.verified ?? fallback.verified;
  $("#statBanned").textContent = s.banned ?? fallback.banned;
  $("#statActive").textContent = s.active_now ?? fallback.active_now;
}

function matches(u){
  const q = $("#userSearch").value.trim().toLowerCase();

  if(q && !`${u.name || ""} ${u.username || ""} ${u.uid || u.id || ""} ${u.email || ""}`
    .toLowerCase().includes(q)){
    return false;
  }

  if(activeFilter === "active" && !isActive(u)) return false;
  if(activeFilter === "verified" && !u.is_verified) return false;
  if(activeFilter === "unverified" && u.is_verified) return false;
  if(activeFilter === "banned" && !isBanned(u)) return false;
  if(activeFilter === "admin" && String(u.role || u.control_role || "").toLowerCase() !== "admin") return false;
  if(activeFilter === "new" && !isNew(u)) return false;

  return true;
}

function renderUsers(){
  const list = $("#usersList");
  const rows = users.filter(matches);

  $("#resultCount").textContent = `${rows.length} مستخدم`;

  list.innerHTML = rows.map(u => `
    <article class="user-row" data-id="${esc(u.id)}">
      <img class="user-avatar" src="${esc(avatar(u))}" alt="">
      <div class="user-main">
        <strong>${esc(u.name || u.username || "مستخدم")}</strong>
        <small>@${esc(u.username || "—")} · ${esc(u.uid || u.id)}</small>
      </div>
      <div class="row-status">
        ${u.is_verified ? '<span class="badge verified">موثق</span>' : ""}
        ${u.role === "admin" ? '<span class="badge admin">Admin</span>' : ""}
        ${u.role === "moderator" ? '<span class="badge">Moderator</span>' : ""}
        ${isBanned(u) ? '<span class="badge banned">محظور</span>' : ""}
      </div>
      <span class="row-last">${fmt(u.last_activity_at || u.last_sign_in_at)}</span>
    </article>
  `).join("");

  $("#emptyState").hidden = rows.length > 0;

  $$(".user-row").forEach(row => {
    row.addEventListener("click", () => openDrawer(row.dataset.id));
  });
}

function renderMedals(detail){
  const list = $("#medalsList");
  const catalog = Array.isArray(detail.medals) ? detail.medals : [];
  const owned = Array.isArray(detail.owned_medals) ? detail.owned_medals : [];
  const ownedKeys = new Set(owned.map(m => String(m.medal_key)));

  if(!catalog.length){
    list.innerHTML = '<div class="placeholder">لا توجد ميداليات معرفة حاليًا.</div>';
    return;
  }

  list.innerHTML = catalog.map(medal => {
    const key = String(medal.key || medal.medal_key || "");
    const has = ownedKeys.has(key);
    const ownedRow = owned.find(m => String(m.medal_key) === key);

    return `
      <div class="medal-admin-row" style="display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #edf0f4;border-radius:12px;background:#fafbfc">
        <div style="font-size:22px;min-width:28px">${esc(medal.icon || "🏅")}</div>
        <div style="flex:1;min-width:0">
          <strong>${esc(medal.title || key)}</strong>
          <small style="display:block;color:#8791a2">${esc(medal.description || "")}</small>
          ${has ? `<small style="display:block;color:#168bf0">مكتسبة: ${esc(fmt(ownedRow?.awarded_at))}</small>` : '<small style="display:block;color:#9aa3b2">غير مكتسبة</small>'}
        </div>
        ${has
          ? `<button class="small-btn medal-remove" data-medal="${esc(key)}">إزالة</button>`
          : `<button class="small-btn medal-add" data-medal="${esc(key)}">إضافة</button>`
        }
      </div>
    `;
  }).join("");

  $$(".medal-add").forEach(btn => btn.addEventListener("click", async () => {
    if(!selected) return;
    await medalAction("POST", `/api/admin/users/${encodeURIComponent(selected.id)}/medals`, {medal_key:btn.dataset.medal});
  }));

  $$(".medal-remove").forEach(btn => btn.addEventListener("click", async () => {
    if(!selected) return;
    if(!confirm("هل تريد إزالة هذه الميدالية من المستخدم؟")) return;
    await medalAction("DELETE", `/api/admin/users/${encodeURIComponent(selected.id)}/medals/${encodeURIComponent(btn.dataset.medal)}`);
  }));
}

function renderAudit(logs){
  const box = $("#auditLog");
  if(!Array.isArray(logs) || !logs.length){
    box.innerHTML = '<div class="placeholder">لا توجد إجراءات مسجلة حاليًا.</div>';
    return;
  }

  box.innerHTML = logs.map(log => `
    <div style="padding:10px 0;border-bottom:1px solid #edf0f4">
      <strong style="display:block">${esc(log.action || "إجراء إداري")}</strong>
      <small style="display:block;color:#7f899b">${esc(fmt(log.created_at))}</small>
      <small style="display:block;color:#8a94a6;word-break:break-word">${esc(JSON.stringify(log.details || {}))}</small>
    </div>
  `).join("");
}

function fillDetail(detail){
  const u = detail.user || detail;
  const control = detail.control || {};
  const stats = detail.stats || {};

  selectedDetail = detail;
  selected = u;

  $("#detailAvatar").src = avatar(u);
  $("#detailName").textContent = u.name || u.username || "مستخدم";
  $("#detailUsername").textContent = u.username ? `@${u.username}` : "—";

  $("#detailBadges").innerHTML = `
    ${u.is_verified ? '<span class="badge verified">موثق ✓</span>' : '<span class="badge">غير موثق</span>'}
    <span class="badge">${esc(String(control.role || u.role || "user").toUpperCase())}</span>
    <span class="badge ${isBanned(u) ? "banned" : ""}">${esc(u.status === "disabled" ? "معطل" : isBanned(u) ? "محظور" : "نشط")}</span>
  `;

  $("#detailStatus").textContent =
    u.status === "disabled" ? "معطل" :
    isBanned(u) ? "محظور" : "نشط";

  $("#detailRole").textContent =
    String(control.role || u.role || "user").toUpperCase();

  $("#detailActivity").textContent = fmt(u.last_activity_at);
  $("#detailLogin").textContent = fmt(u.last_sign_in_at);
  $("#detailEmail").textContent = u.email || "—";
  $("#detailEmailVerified").textContent = u.email_confirmed ? "مؤكد" : "غير مؤكد";
  $("#detailUid").textContent = u.uid || u.id || "—";
  $("#detailAvatarStatus").textContent = u.has_avatar || u.avatar_url ? "لديه صورة" : "بدون صورة";

  $("#roleSelect").value =
    ["user","moderator","admin"].includes(control.role || u.role)
      ? (control.role || u.role)
      : "user";

  $("#verifyState").textContent = u.is_verified ? "موثق ✓" : "غير موثق";
  $("#verifyMeta").textContent = u.verified_at
    ? `تم التوثيق: ${fmt(u.verified_at)}${u.verified_by ? ` · بواسطة ${u.verified_by}` : ""}`
    : "لم يتم التوثيق بعد.";

  $("#toggleVerify").textContent =
    u.is_verified ? "إلغاء التوثيق" : "توثيق الحساب";

  $("#metricWallpapers").textContent = stats.wallpapers_published ?? 0;
  $("#metricViews").textContent = stats.total_views ?? 0;
  $("#metricDownloads").textContent = stats.total_downloads ?? 0;
  $("#metricLikes").textContent = stats.total_likes ?? 0;
  $("#metricFavorites").textContent = stats.favorites ?? 0;

  const top = Array.isArray(stats.most_viewed) ? stats.most_viewed[0] : null;
  $("#metricTop").textContent = top
    ? `${top.title || "خلفية"} · ${top.views ?? 0}`
    : "—";

  $("#detailProfileLink").href =
    u.profile_url || `/profile.html?uid=${encodeURIComponent(u.id || "")}`;

  $("#adminNotes").value =
    control.admin_notes ?? u.admin_notes ?? "";

  $("#actionReason").value =
    control.ban_reason || u.ban_reason || "";

  $("#banDuration").value =
    control.ban_until || u.ban_until || "";

  renderMedals(detail);
  renderAudit(detail.audit_logs || []);
  renderWarningHistory(detail.warnings || []);
}

async function loadUserDetail(id){
  const data = await api(`/api/admin/users/${encodeURIComponent(id)}`);
  selectedDetail = data;
  fillDetail(data);
  return data;
}

async function openDrawer(id){
  const u = users.find(x => String(x.id) === String(id));
  if(!u) return;

  $("#userDrawer").classList.add("open");
  $("#drawerBackdrop").classList.add("open");
  $("#userDrawer").setAttribute("aria-hidden","false");

  try{
    $("#loadState").textContent = "جاري تحميل التفاصيل…";
    await loadUserDetail(id);
    $("#loadState").textContent = "متصل بـ Supabase";
  }catch(error){
    console.error("ADMIN USER DETAIL:", error);
    fillDetail({user:u,control:u,stats:u.stats || {},medals:[],owned_medals:[],audit_logs:[]});
    showToast(error.message || "تعذر تحميل تفاصيل المستخدم");
  }
}

function closeDrawer(){
  $("#userDrawer").classList.remove("open");
  $("#drawerBackdrop").classList.remove("open");
  $("#userDrawer").setAttribute("aria-hidden","true");
  selected = null;
  selectedDetail = null;
}

async function loadUsers(){
  $("#loadState").textContent = "جاري التحميل…";

  try{
    const data = await api("/api/admin/users");
    users = Array.isArray(data.users) ? data.users : [];
    renderStats(data.stats);
    renderUsers();
    $("#loadState").textContent = "متصل بـ Supabase";
  }catch(error){
    if(error?.code === "AUTH_REQUIRED"){
      showToast("انتهت جلسة الإدارة، سيتم الرجوع إلى لوحة التحكم");
      setTimeout(() => { window.location.href = "/admin.html"; }, 900);
      return;
    }

    users = [];
    renderStats({
      total_users:0,new_today:0,verified:0,banned:0,active_now:0
    });
    renderUsers();
    $("#loadState").textContent = "تعذر الاتصال";
    showToast(error.message || "تعذر تحميل المستخدمين");
    console.error("ADMIN USERS:", error);
  }
}

async function action(endpoint, body, msg, method = "PATCH"){
  try{
    await api(endpoint, {
      method,
      body: JSON.stringify(body || {})
    });

    showToast(msg);
    await 
document.querySelectorAll("[data-drawer-jump]").forEach(button => {
  button.addEventListener("click", () => {
    const targetMap = {
      account:"#detailAccountSection",
      security:"#detailSecuritySection",
      medals:"#detailMedalsSection",
      audit:"#detailAuditSection"
    };
    const target = document.querySelector(targetMap[button.dataset.drawerJump]);
    target?.scrollIntoView({behavior:"smooth", block:"start"});
  });
});

loadUsers();

    if(selected){
      const refreshed = await loadUserDetail(selected.id);
      fillDetail(refreshed);
    }
  }catch(error){
    showToast(error.message || "تعذر تنفيذ الإجراء");
    console.error("ADMIN ACTION:", error);
  }
}

async function medalAction(method, endpoint, body = null){
  try{
    await api(endpoint, {
      method,
      body: body ? JSON.stringify(body) : undefined
    });

    showToast(method === "POST" ? "تمت إضافة الميدالية" : "تمت إزالة الميدالية");

    if(selected){
      const refreshed = await loadUserDetail(selected.id);
      fillDetail(refreshed);
    }
  }catch(error){
    showToast(error.message || "تعذر تحديث الميدالية");
  }
}

$("#refreshUsers").onclick = loadUsers;
$("#closeDrawer").onclick = closeDrawer;
$("#drawerBackdrop").onclick = closeDrawer;

$("#userSearch").oninput = renderUsers;

$("#filters").addEventListener("click", e => {
  const button = e.target.closest(".filter");
  if(!button) return;

  activeFilter = button.dataset.filter;
  $$(".filter").forEach(x => x.classList.remove("active"));
  button.classList.add("active");
  renderUsers();
});

$("#copyUid").onclick = async () => {
  if(!selected) return;
  try{
    await navigator.clipboard.writeText(selected.uid || selected.id);
    showToast("تم نسخ UID");
  }catch{
    showToast("تعذر نسخ UID");
  }
};

$("#toggleVerify").onclick = async () => {
  if(!selected) return;

  const next = !selected.is_verified;
  const label = next ? "توثيق الحساب" : "إلغاء التوثيق";

  if(!confirm(`هل تريد ${label}؟`)) return;

  await action(
    `/api/admin/users/${encodeURIComponent(selected.id)}/verification`,
    {verified:next},
    next ? "تم توثيق الحساب" : "تم إلغاء التوثيق"
  );
};

$("#saveRole").onclick = async () => {
  if(!selected) return;

  const role = $("#roleSelect").value;
  if(!confirm(`تغيير دور المستخدم إلى ${role.toUpperCase()}؟`)) return;

  await action(
    `/api/admin/users/${encodeURIComponent(selected.id)}/control`,
    {role},
    "تم تحديث الدور"
  );
};

$("#saveNotes").onclick = async () => {
  if(!selected) return;

  await action(
    `/api/admin/users/${encodeURIComponent(selected.id)}/control`,
    {admin_notes:$("#adminNotes").value},
    "تم حفظ الملاحظات"
  );
};

$("#temporaryBan").onclick = async () => {
  if(!selected) return;

  const untilRaw = $("#banDuration").value.trim();
  const reason = $("#actionReason").value.trim();

  if(!untilRaw){
    showToast("حدد تاريخ ووقت انتهاء الحظر");
    return;
  }

  const parsed = new Date(untilRaw);
  if(Number.isNaN(parsed.getTime())){
    showToast("صيغة تاريخ الحظر غير صالحة");
    return;
  }

  if(!confirm("هل تريد تنفيذ الحظر المؤقت؟")) return;

  await action(
    `/api/admin/users/${encodeURIComponent(selected.id)}/control`,
    {
      status:"banned",
      ban_type:"temporary",
      ban_reason:reason,
      ban_until:parsed.toISOString()
    },
    "تم تنفيذ الحظر المؤقت"
  );
};

$("#permanentBan").onclick = async () => {
  if(!selected) return;

  const reason = $("#actionReason").value.trim();
  if(!confirm("تحذير: هل تريد تنفيذ الحظر الدائم؟")) return;

  await action(
    `/api/admin/users/${encodeURIComponent(selected.id)}/control`,
    {
      status:"banned",
      ban_type:"permanent",
      ban_reason:reason,
      ban_until:null
    },
    "تم تنفيذ الحظر الدائم"
  );
};

$("#unbanUser").onclick = async () => {
  if(!selected) return;
  if(!confirm("هل تريد إلغاء حظر المستخدم؟")) return;

  await action(
    `/api/admin/users/${encodeURIComponent(selected.id)}/control`,
    {
      status:"active",
      ban_type:null,
      ban_reason:null,
      ban_until:null
    },
    "تم إلغاء الحظر"
  );
};


function warningLevelLabel(level){
  return `التحذير ${Number(level) || 0}`;
}

function renderWarningHistory(warnings){
  const existing = document.querySelector("#warningHistoryAdmin");
  if(existing) existing.remove();

  const anchor = document.querySelector("#auditLog");
  if(!anchor) return;

  const box = document.createElement("section");
  box.id = "warningHistoryAdmin";
  box.style.cssText = [
    "margin-top:16px",
    "padding:14px",
    "border:1px solid #edf0f4",
    "border-radius:14px",
    "background:#fff"
  ].join(";");

  const rows = Array.isArray(warnings) ? warnings : [];
  box.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px">
      <strong>⚠️ سجل التحذيرات</strong>
      <span style="font-size:12px;color:#8791a2">${rows.length} تحذير</span>
    </div>
    ${
      rows.length
      ? rows.map(w => `
        <div style="padding:10px 0;border-bottom:1px solid #f0f2f5">
          <div style="display:flex;justify-content:space-between;gap:8px">
            <strong>${esc(warningLevelLabel(w.level))}</strong>
            <small style="color:#8791a2">${esc(fmt(w.created_at))}</small>
          </div>
          <div style="margin-top:5px;color:#5f6878;font-size:13px">${esc(w.reason || "بدون سبب")}</div>
          <div style="margin-top:5px;white-space:pre-wrap;color:#7c8595;font-size:13px">${esc(w.message || "")}</div>
          <small style="display:block;margin-top:6px;color:${w.acknowledged ? "#168bf0" : "#a06a00"}">
            ${w.acknowledged ? "تمت القراءة" : "بانتظار قراءة المستخدم"}
          </small>
        </div>
      `).join("")
      : '<div style="color:#8791a2;font-size:13px">لا توجد تحذيرات لهذا المستخدم.</div>'
    }
  `;

  anchor.parentNode.insertBefore(box, anchor);
}

function closeWarningModal(){
  const modal = document.querySelector("#adminWarningModal");
  if(modal) modal.remove();
}

function openWarningModal(user){
  closeWarningModal();

  const current = Number(user.warning_level || 0);
  const next = current + 1;

  if(next > 3){
    showToast("المستخدم وصل بالفعل إلى التحذير الثالث");
    return;
  }

  const modal = document.createElement("div");
  modal.id = "adminWarningModal";
  modal.dir = "rtl";
  modal.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:99999",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "padding:18px",
    "background:rgba(8,15,28,.58)",
    "backdrop-filter:blur(5px)"
  ].join(";");

  modal.innerHTML = `
    <div style="
      width:min(560px,100%);
      max-height:90vh;
      overflow:auto;
      background:#fff;
      border-radius:22px;
      padding:22px;
      box-shadow:0 24px 70px rgba(0,0,0,.22)
    ">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px">
        <div>
          <div style="font-size:22px;font-weight:800">⚠️ إرسال تحذير</div>
          <div style="margin-top:5px;color:#7d8797;font-size:13px">
            ${esc(user.name || user.username || "المستخدم")}
          </div>
        </div>
        <button type="button" id="closeWarningModal"
          style="border:0;background:#f2f4f7;width:38px;height:38px;border-radius:50%;font-size:20px;cursor:pointer">×</button>
      </div>

      <div style="margin-top:18px;padding:12px 14px;border-radius:14px;background:#fff7e8;color:#8b5d00;font-size:13px">
        سيتم تسجيل <strong>التحذير رقم ${next}</strong> في سجل الإدارة وإرسال رسالة للمستخدم داخل إشعارات الموقع.
      </div>

      <label style="display:block;margin-top:16px;font-weight:700;font-size:13px">سبب التحذير</label>
      <textarea id="warningReasonInput" rows="3"
        placeholder="اكتب سبب التحذير بوضوح..."
        style="width:100%;box-sizing:border-box;margin-top:7px;border:1px solid #dfe4eb;border-radius:13px;padding:12px;resize:vertical;font:inherit"></textarea>

      <label style="display:block;margin-top:14px;font-weight:700;font-size:13px">الرسالة التي ستصل للمستخدم</label>
      <textarea id="warningMessageInput" rows="5"
        placeholder="اكتب الرسالة التي تريد أن يراها المستخدم..."
        style="width:100%;box-sizing:border-box;margin-top:7px;border:1px solid #dfe4eb;border-radius:13px;padding:12px;resize:vertical;font:inherit"></textarea>

      <div style="display:flex;gap:10px;justify-content:flex-start;margin-top:18px">
        <button type="button" id="cancelWarningModal"
          style="border:0;background:#eef1f5;padding:11px 18px;border-radius:12px;cursor:pointer">إلغاء</button>
        <button type="button" id="sendWarningModal"
          style="border:0;background:#d97706;color:#fff;padding:11px 20px;border-radius:12px;cursor:pointer;font-weight:700">
          إرسال التحذير
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => closeWarningModal();
  $("#closeWarningModal").onclick = close;
  $("#cancelWarningModal").onclick = close;

  $("#sendWarningModal").onclick = async () => {
    const reason = $("#warningReasonInput").value.trim();
    const message = $("#warningMessageInput").value.trim();

    if(!reason){
      showToast("اكتب سبب التحذير");
      return;
    }

    if(!message){
      showToast("اكتب الرسالة التي ستصل للمستخدم");
      return;
    }

    const button = $("#sendWarningModal");
    button.disabled = true;
    button.textContent = "جاري الإرسال…";

    try{
      const data = await api(
        `/api/admin/users/${encodeURIComponent(user.id)}/warning`,
        {
          method:"POST",
          body:JSON.stringify({
            level:next,
            reason,
            message
          })
        }
      );

      closeWarningModal();
      showToast(`تم إرسال التحذير ${next} للمستخدم`);

      await loadUsers();

      if(selected){
        const detail = await loadUserDetail(selected.id);
        fillDetail(detail);
      }
    }catch(error){
      button.disabled = false;
      button.textContent = "إرسال التحذير";
      showToast(error.message || "تعذر إرسال التحذير");
    }
  };
}


const banDurationEl = $("#banDuration");
const customBanDateWrap = $("#customBanDateWrap");

banDurationEl?.addEventListener("change", () => {
  if(customBanDateWrap){
    customBanDateWrap.hidden = banDurationEl.value !== "custom";
  }
});

$("#warnUser").onclick = async () => {
  if(!selected) return;
  openWarningModal(selected);
};

$("#addMedal").onclick = () => {
  if(!selected || !selectedDetail) return;

  const catalog = Array.isArray(selectedDetail.medals) ? selectedDetail.medals : [];
  const owned = Array.isArray(selectedDetail.owned_medals) ? selectedDetail.owned_medals : [];
  const ownedKeys = new Set(owned.map(m => String(m.medal_key)));

  const available = catalog.filter(m => {
    const key = String(m.key || m.medal_key || "");
    return key && !ownedKeys.has(key);
  });

  if(!available.length){
    showToast("المستخدم يمتلك جميع الميداليات المتاحة");
    return;
  }

  const old = document.querySelector("#adminMedalPicker");
  old?.remove();

  const modal = document.createElement("div");
  modal.id = "adminMedalPicker";
  modal.className = "admin-overlay";
  modal.innerHTML = `
    <div class="admin-dialog">
      <div class="admin-dialog-head">
        <div>
          <span class="eyebrow">REWARDS</span>
          <h3>إضافة ميدالية</h3>
        </div>
        <button type="button" class="dialog-close" id="closeMedalPicker">×</button>
      </div>
      <div class="medal-picker-list">
        ${available.map(m => {
          const key = String(m.key || m.medal_key || "");
          return `
            <button type="button" class="medal-picker-item" data-medal-key="${esc(key)}">
              <span class="medal-picker-icon">${esc(m.icon || "🏅")}</span>
              <span>
                <strong>${esc(m.title || key)}</strong>
                <small>${esc(m.description || "")}</small>
              </span>
              <span class="material-icons-round">add</span>
            </button>`;
        }).join("")}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  $("#closeMedalPicker").onclick = close;
  modal.addEventListener("click", e => {
    if(e.target === modal) close();
  });

  modal.querySelectorAll("[data-medal-key]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const key = btn.dataset.medalKey;
      btn.disabled = true;

      try{
        await medalAction(
          "POST",
          `/api/admin/users/${encodeURIComponent(selected.id)}/medals`,
          {medal_key:key}
        );
        close();
      }catch(error){
        btn.disabled = false;
      }
    });
  });
};

$("#resetMedals").onclick = async () => {
  if(!selected) return;

  const owned = Array.isArray(selectedDetail?.owned_medals)
    ? selectedDetail.owned_medals
    : [];

  if(!owned.length){
    showToast("لا توجد ميداليات لإزالتها");
    return;
  }

  if(!confirm(`سيتم إزالة ${owned.length} ميدالية من المستخدم. هل تريد المتابعة؟`)) return;

  try{
    for(const medal of owned){
      await api(
        `/api/admin/users/${encodeURIComponent(selected.id)}/medals/${encodeURIComponent(medal.medal_key)}`,
        {method:"DELETE"}
      );
    }

    showToast("تمت إعادة ضبط الميداليات");

    const detail = await loadUserDetail(selected.id);
    fillDetail(detail);
  }catch(error){
    showToast(error.message || "تعذر إعادة ضبط الميداليات");
  }
};

loadUsers();
