import { supabase } from "../supabase.js";

const RETURN_KEY = "wallpaperhub_admin_return";

function adminReturnUrl(){
    return window.location.pathname + window.location.search + window.location.hash;
}

function userName(user){
    const m = user?.user_metadata || {};
    return String(
        m.full_name || m.name || m.user_name || m.preferred_username ||
        user?.email?.split("@")[0] || "المدير"
    ).trim();
}

function userAvatar(user){
    const m = user?.user_metadata || {};
    return String(m.avatar_url || m.picture || m.avatar || "").trim();
}

function initials(name){
    return String(name || "W").trim().slice(0,1).toUpperCase();
}

function ensurePageBar(){
    if(document.getElementById("adminPageBar")) return;
    const bar = document.createElement("div");
    bar.id = "adminPageBar";
    bar.className = "admin-page-bar";
    bar.innerHTML = `
      <a class="admin-page-home" href="admin.html">🏠 لوحة التحكم</a>
      <div class="admin-page-account">
        <span class="admin-page-online">● متصل</span>
        <div class="admin-page-avatar" id="adminPageAvatar"></div>
        <div class="admin-page-user">
          <strong id="adminPageName">المدير</strong>
          <small id="adminPageEmail"></small>
        </div>
        <button id="adminPageLogout" type="button">🚪 خروج</button>
      </div>`;
    document.body.prepend(bar);
}

function paintAccount(user){
    const name = userName(user);
    const avatar = userAvatar(user);

    const nameEls = [
        document.getElementById("adminUserName"),
        document.getElementById("adminPageName")
    ];
    const emailEls = [
        document.getElementById("adminUserEmail"),
        document.getElementById("adminPageEmail")
    ];
    nameEls.forEach(el => { if(el) el.textContent = name; });
    emailEls.forEach(el => { if(el) el.textContent = user?.email || ""; });

    const avatars = [
        document.getElementById("adminUserAvatar"),
        document.getElementById("adminPageAvatar")
    ];
    avatars.forEach(el => {
        if(!el) return;
        el.innerHTML = avatar
            ? `<img src="${avatar.replace(/"/g,"&quot;")}" alt="">`
            : `<span>${initials(name)}</span>`;
    });
}

async function requireAdminPage(){
    const { data, error } = await supabase.auth.getSession();
    if(error || !data?.session?.user){
        sessionStorage.setItem(RETURN_KEY, adminReturnUrl());
        location.href = "/profile.html";
        return null;
    }

    const session = data.session;
    const response = await fetch("/api/admin/me", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store"
    });
    const result = await response.json().catch(() => ({}));

    if(!response.ok || !result.isAdmin){
        alert("هذا الحساب لا يملك صلاحية الأدمن.");
        location.href = "/profile.html";
        return null;
    }

    paintAccount(session.user);
    return session;
}

function setupLogout(){
    const btns = [
        document.getElementById("logoutBtn"),
        document.getElementById("adminPageLogout")
    ].filter(Boolean);

    btns.forEach(btn => {
        btn.addEventListener("click", async () => {
            btn.disabled = true;
            await supabase.auth.signOut({ scope:"local" });
            location.href = "/profile.html";
        });
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    if(!document.body.classList.contains("admin-main-page")){
        ensurePageBar();
    }
    const session = await requireAdminPage();
    if(!session) return;
    setupLogout();
    window.wallpaperHubAdminSession = session;
});
