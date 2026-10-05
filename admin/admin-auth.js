/* WallpaperHub Admin Auth + Navigation */
import { supabase } from "../supabase.js";

const ADMIN_RETURN_KEY = "wallpaperhub_admin_return";

function userDisplay(user){
  const m = user?.user_metadata || {};
  return String(m.full_name || m.name || m.user_name || m.preferred_username || user?.email?.split("@")[0] || "المستخدم").trim();
}
function userAvatar(user){
  const m = user?.user_metadata || {};
  return m.avatar_url || m.picture || m.avatar || "";
}

async function getSession(){
  const { data, error } = await supabase.auth.getSession();
  if(error) throw error;
  return data?.session || null;
}

function shellHTML(){
  return `
  <aside class="admin-sidebar" id="adminSidebar">
    <div class="admin-sidebar-brand">
      <div class="admin-logo-mark">W</div>
      <div><strong>WallpaperHub</strong><span>ADMIN CENTER</span></div>
    </div>
    <div class="admin-user-card">
      <img id="adminUserAvatar" class="admin-user-avatar" alt="">
      <div class="admin-user-meta">
        <strong id="adminUserName">المستخدم</strong>
        <span id="adminUserEmail">—</span>
      </div>
      <span class="admin-online-dot" title="متصل"></span>
    </div>
    <nav class="admin-nav">
      <a href="admin.html" data-page="dashboard"><span>⌂</span> لوحة التحكم</a>
      <a href="wallpapers.html" data-page="wallpapers"><span>▧</span> الخلفيات</a>
      <a href="notice-create.html" data-page="notices"><span>◈</span> الإعلانات</a>
      <a href="organizer.html" data-page="organizer"><span>⌘</span> منظم الخلفيات</a>
      <a href="ai-control.html" data-page="ai"><span>✦</span> الذكاء الاصطناعي</a>
      <a href="ai-generator.html" data-page="ai-generator"><span>✧</span> خلفيات Gemini</a>
    </nav>
    <div class="admin-sidebar-footer">
      <a href="../profile.html"><span>◉</span> الحساب الشخصي</a>
      <button id="adminLogoutBtn" type="button"><span>↪</span> تسجيل الخروج</button>
    </div>
  </aside>
  <button class="admin-mobile-menu" id="adminMobileMenu" aria-label="القائمة">☰</button>
  <div class="admin-backdrop" id="adminBackdrop"></div>`;
}

function loginGateHTML(){
  return `<div class="admin-login-gate" id="adminLoginGate">
    <div class="admin-login-card">
      <div class="admin-login-icon">🔐</div>
      <span class="admin-login-kicker">WALLPAPERHUB ADMIN</span>
      <h1>تسجيل الدخول مطلوب</h1>
      <p>يجب تسجيل الدخول بحسابك أولًا للوصول إلى لوحة الإدارة ونشر الإعلانات والخلفيات.</p>
      <button id="adminGoogleLogin" type="button">الدخول بواسطة Google</button>
      <a href="../profile.html">فتح صفحة الحساب</a>
      <small id="adminAuthError"></small>
    </div>
  </div>`;
}

function applyUser(user){
  const name = userDisplay(user);
  const email = user?.email || "حساب مسجل";
  const avatar = userAvatar(user);
  const nameEl = document.getElementById("adminUserName");
  const emailEl = document.getElementById("adminUserEmail");
  const avatarEl = document.getElementById("adminUserAvatar");
  if(nameEl) nameEl.textContent = name;
  if(emailEl) emailEl.textContent = email;
  if(avatarEl){
    avatarEl.src = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff&bold=true`;
    avatarEl.alt = name;
  }
  document.body.classList.add("admin-authenticated");
}

function markActive(){
  const path = location.pathname.toLowerCase();
  let page = "dashboard";
  if(path.includes("wallpapers")) page = "wallpapers";
  else if(path.includes("notice-create")) page = "notices";
  else if(path.includes("organizer")) page = "organizer";
  else if(path.includes("ai-control")) page = "ai";
  else if(path.includes("ai-generator")) page = "ai-generator";
  document.querySelectorAll(".admin-nav a").forEach(a => a.classList.toggle("active", a.dataset.page === page));
}

async function signIn(){
  const err = document.getElementById("adminAuthError");
  if(err) err.textContent = "";
  const returnTo = location.href;
  sessionStorage.setItem(ADMIN_RETURN_KEY, returnTo);
  const { error } = await supabase.auth.signInWithOAuth({
    provider:"google",
    options:{ redirectTo:returnTo }
  });
  if(error && err) err.textContent = error.message || "تعذر بدء تسجيل الدخول";
}

async function signOut(){
  const { error } = await supabase.auth.signOut({ scope:"local" });
  if(error) console.error("ADMIN SIGNOUT", error);
  location.reload();
}

async function initAdminAuth(){
  document.body.insertAdjacentHTML("afterbegin", shellHTML());
  document.body.insertAdjacentHTML("beforeend", loginGateHTML());
  markActive();

  document.getElementById("adminGoogleLogin")?.addEventListener("click", signIn);
  document.getElementById("adminLogoutBtn")?.addEventListener("click", signOut);
  document.getElementById("adminMobileMenu")?.addEventListener("click", () => {
    document.body.classList.toggle("admin-menu-open");
  });
  document.getElementById("adminBackdrop")?.addEventListener("click", () => {
    document.body.classList.remove("admin-menu-open");
  });

  try{
    const session = await getSession();
    if(session?.user){
      applyUser(session.user);
      document.getElementById("adminLoginGate")?.remove();
    }else{
      document.body.classList.add("admin-locked");
    }
  }catch(error){
    console.error("ADMIN AUTH INIT", error);
    document.body.classList.add("admin-locked");
    const e = document.getElementById("adminAuthError");
    if(e) e.textContent = "تعذر التحقق من جلسة الدخول.";
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    if(session?.user){
      applyUser(session.user);
      document.getElementById("adminLoginGate")?.remove();
      document.body.classList.remove("admin-locked");
    }else{
      document.body.classList.add("admin-locked");
      if(!document.getElementById("adminLoginGate")){
        document.body.insertAdjacentHTML("beforeend", loginGateHTML());
        document.getElementById("adminGoogleLogin")?.addEventListener("click", signIn);
      }
    }
  });
}

window.adminAuth = {
  getSession,
  async getHeaders(){
    const session = await getSession();
    return session?.access_token ? { Authorization:`Bearer ${session.access_token}` } : {};
  },
  userDisplay,
  userAvatar,
  signOut,
  initAdminAuth
};

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", initAdminAuth, {once:true});
}else{
  initAdminAuth();
}
