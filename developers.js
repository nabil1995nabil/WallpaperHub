// =================================
// WallpaperHub API Developer
// Supabase Auth — بدون Firebase
// =================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const form = document.getElementById("createTokenForm");
const tokensList = document.getElementById("tokensList");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const developerPage = document.getElementById("developerPage");
const loginPopup = document.getElementById("loginPopup");

let supabase = null;
let currentUser = null;
let configPromise = null;

// ================================
// Supabase Browser Client
// ================================
async function getSupabaseClient(){
    if(supabase) return supabase;
    if(!configPromise){
        configPromise = fetch("/api/supabase/config", {cache:"no-store"})
            .then(async response => {
                const data = await response.json().catch(() => ({}));
                if(!response.ok || !data.success || !data.url || !data.anonKey){
                    throw new Error(data.message || "Supabase public configuration is unavailable");
                }
                return data;
            });
    }

    const config = await configPromise;
    supabase = createClient(config.url, config.anonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });
    return supabase;
}

async function getAccessToken(){
    const client = await getSupabaseClient();
    const { data, error } = await client.auth.getSession();
    if(error) throw error;
    return data?.session?.access_token || "";
}

async function apiFetch(url, options = {}){
    const accessToken = await getAccessToken();
    if(!accessToken) throw new Error("انتهت جلسة تسجيل الدخول");

    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${accessToken}`);
    if(options.body && !headers.has("Content-Type")){
        headers.set("Content-Type", "application/json");
    }

    return fetch(url, {...options, headers});
}

function showLoggedIn(user){
    currentUser = user || null;
    if(currentUser){
        developerPage.style.display = "block";
        loginPopup.style.display = "none";
        loadTokens();
    }else{
        developerPage.style.display = "none";
        loginPopup.style.display = "flex";
    }
}

// ================================
// مراقبة جلسة Supabase
// ================================
async function initAuth(){
    try{
        const client = await getSupabaseClient();

        const { data } = await client.auth.getSession();
        showLoggedIn(data?.session?.user || null);

        client.auth.onAuthStateChange((_event, session) => {
            showLoggedIn(session?.user || null);
        });
    }catch(error){
        console.error("Supabase Auth Init Error:", error);
        developerPage.style.display = "none";
        loginPopup.style.display = "flex";
        const message = loginPopup.querySelector("p");
        if(message){
            message.textContent = "تعذر الاتصال بـ Supabase. تأكد من إعداد SUPABASE_ANON_KEY في Vercel.";
        }
    }
}

// ================================
// تحميل Tokens الخاصة بالمستخدم فقط
// ================================
async function loadTokens(){
    try{
        if(!currentUser) return;

        const response = await apiFetch("/api/tokens/" + encodeURIComponent(currentUser.id), {
            method: "GET",
            cache: "no-store"
        });

        const tokens = await response.json().catch(() => []);
        if(!response.ok){
            throw new Error(tokens?.message || "Server returned " + response.status);
        }

        renderTokens(Array.isArray(tokens) ? tokens : []);
    }catch(error){
        console.error("Load Tokens Error:", error);
        tokensList.innerHTML = `<p style="color:red;">⚠️ ${escapeHtml(error.message || "خطأ في تحميل التوكنات")}</p>`;
    }
}

// ================================
// إنشاء Token
// ================================
if(form){
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if(!currentUser){
            alert("سجل الدخول أولاً");
            return;
        }

        const appName = document.getElementById("appName").value.trim();
        const appDomain = document.getElementById("appDomain").value.trim();
        const submitButton = form.querySelector("button[type='submit']");

        if(!appName){
            alert("أدخل اسم التطبيق");
            return;
        }

        if(submitButton) submitButton.disabled = true;

        try{
            const response = await apiFetch("/api/tokens/create", {
                method: "POST",
                body: JSON.stringify({
                    appName,
                    domain: appDomain
                })
            });

            const data = await response.json().catch(() => ({}));
            if(!response.ok || !data.success){
                throw new Error(data.message || "فشل إنشاء Token");
            }

            form.reset();
            await loadTokens();

            // المفتاح الكامل يظهر مرة واحدة فقط بعد الإنشاء.
            const secret = data.token?.token || "";
            if(secret){
                showNewToken(secret);
            }else{
                alert("تم إنشاء Token بنجاح");
            }
        }catch(error){
            console.error("Create Token Error:", error);
            alert("⚠️ " + (error.message || "فشل إنشاء Token"));
        }finally{
            if(submitButton) submitButton.disabled = false;
        }
    });
}

// ================================
// عرض Tokens بدون كشف المفتاح
// ================================
function renderTokens(tokens){
    tokensList.innerHTML = "";

    if(!tokens || tokens.length === 0){
        tokensList.innerHTML = `<p>لا يوجد Token حاليا</p>`;
        return;
    }

    tokens.forEach(token => {
        const item = document.createElement("div");
        item.className = "token-item";
        item.innerHTML = `
            <div class="token-meta">
                <div>
                    <div class="token-name">${escapeHtml(token.appName || "My App")}</div>
                    <div class="token-domain">${escapeHtml(token.domain || "بدون نطاق")} • ${Number(token.limit || 0)} طلب / يوم</div>
                </div>
                <span class="badge ${token.active ? "badge-active" : "badge-inactive"}">${token.active ? "نشط" : "متوقف"}</span>
            </div>
            <div class="token-stats">
                <p>📊 الطلبات اليوم: ${Number(token.requests || 0)} / ${Number(token.limit || 0)}</p>
                <p>🕒 آخر استعمال: ${escapeHtml(token.lastUsed || "لا يوجد")}</p>
            </div>
            <div class="token-value-box">
                <code>wall_live_••••••••••••••••</code>
                <button class="btn-action btn-delete delete" type="button">حذف</button>
            </div>
        `;

        item.querySelector(".delete").onclick = async () => {
            if(!confirm("حذف هذا Token نهائيًا؟")) return;

            try{
                const response = await apiFetch("/api/tokens/" + encodeURIComponent(token.id), {
                    method: "DELETE"
                });
                const data = await response.json().catch(() => ({}));
                if(!response.ok || !data.success){
                    throw new Error(data.message || "فشل حذف Token");
                }
                loadTokens();
            }catch(error){
                console.error("Delete Token Error:", error);
                alert("⚠️ " + (error.message || "فشل حذف التوكن"));
            }
        };

        tokensList.appendChild(item);
    });
}

// ================================
// تسجيل الدخول بواسطة Google عبر Supabase
// ================================
if(googleLoginBtn){
    googleLoginBtn.addEventListener("click", async () => {
        googleLoginBtn.disabled = true;
        try{
            const client = await getSupabaseClient();
            const redirectTo = new URL("developers.html", window.location.origin).href;
            const { error } = await client.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo }
            });
            if(error) throw error;
        }catch(error){
            console.error("Supabase Google Login Error:", error);
            alert("فشل تسجيل الدخول: " + (error.message || "خطأ غير معروف"));
            googleLoginBtn.disabled = false;
        }
    });
}

// ================================
// عرض المفتاح الجديد مرة واحدة
// ================================
function showNewToken(secret){
    const box = document.createElement("div");
    box.className = "token-one-time-box";
    box.innerHTML = `
        <div class="one-time-inner">
            <h3>🔐 تم إنشاء Token</h3>
            <p>احفظ هذا المفتاح الآن. لن يتم عرضه كاملًا مرة أخرى.</p>
            <div class="one-time-token"><code>${escapeHtml(secret)}</code></div>
            <div class="one-time-actions">
                <button type="button" class="btn-action copy-new-token">نسخ المفتاح</button>
                <button type="button" class="btn-action close-new-token">تم الحفظ</button>
            </div>
        </div>
    `;

    document.body.appendChild(box);

    box.querySelector(".copy-new-token").onclick = async () => {
        try{
            await navigator.clipboard.writeText(secret);
            alert("تم نسخ Token");
        }catch(error){
            console.error("Copy Token Error:", error);
            alert("تعذر النسخ تلقائيًا");
        }
    };

    box.querySelector(".close-new-token").onclick = () => box.remove();
}

function escapeHtml(value){
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

initAuth();
