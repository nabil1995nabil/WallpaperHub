// =================================
// WallpaperHub API Developer
// =================================

import { auth } from "./firebase.js";

import {
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

const form = document.getElementById("createTokenForm");
const tokensList = document.getElementById("tokensList");
const googleLoginBtn = document.getElementById("googleLoginBtn");

let currentUser = null;

// ================================
// مراقبة تسجيل الدخول
// ================================

onAuthStateChanged(auth, (user) => {
    console.log("Developer Auth:", user);
    currentUser = user;

    if (user) {
        document.getElementById("developerPage").style.display = "block";
        document.getElementById("loginPopup").style.display = "none";
        loadTokens();
    } else {
        document.getElementById("developerPage").style.display = "none";
        document.getElementById("loginPopup").style.display = "flex";
    }
});


// ================================
// تحميل Tokens
// ================================

async function loadTokens() {
    try {
        if (!currentUser) {
            console.log("No user logged in, skipping token load");
            return;
        }

        const response = await fetch("/api/tokens/" + currentUser.uid);

        if (!response.ok) {
            throw new Error("Server returned " + response.status);
        }

        const tokens = await response.json();
        renderTokens(tokens);

    } catch (error) {
        console.error("Load Tokens Error:", error);
        tokensList.innerHTML = `<p style="color:red;">⚠️ خطأ في تحميل التوكنات</p>`;
    }
}
// ================================
// إنشاء Token
// ================================

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!currentUser) {
            alert("سجل الدخول أولاً");
            return;
        }

        const appName = document.getElementById("appName").value.trim();
        const appDomain = document.getElementById("appDomain").value.trim();

        console.log("CURRENT USER UID:", currentUser.uid);

        try {
            const response = await fetch("/api/tokens/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: currentUser.uid,
                    appName,
                    domain: appDomain
                })
            });

            const data = await response.json();

            if (data.success) {
                form.reset();
                loadTokens();
                alert("تم إنشاء Token بنجاح");
            } else {
                alert("خطأ: " + (data.message || "فشل إنشاء التوكن"));
            }
        } catch (error) {
            console.error("Create Token Error:", error);
            alert("⚠️ خطأ في الاتصال بالخادم");
        }
    });
}
// ================================
// عرض Tokens
// ================================

function renderTokens(tokens) {
    tokensList.innerHTML = "";

    if (!tokens || tokens.length === 0) {
        tokensList.innerHTML = `<p>لا يوجد Token حاليا</p>`;
        return;
    }

    tokens.forEach(token => {
        const item = document.createElement("div");
        item.className = "token-item";
        item.innerHTML = `
            <div class="token-meta">
                <div>
                    <div class="token-name">${token.appName}</div>
                    <div class="token-domain">${token.domain} • ${token.limit} طلب / يوم</div>
                </div>
                <span class="badge badge-active">نشط</span>
            </div>
            <div class="token-stats">
                <p>📊 الطلبات اليوم: ${token.requests || 0} / 200</p>
                <p>🕒 آخر استعمال: ${token.lastUsed || "لا يوجد"}</p>
            </div>
            <div class="token-value-box">
                <code>${token.token}</code>
                <button class="btn-action copy">نسخ</button>
                <button class="btn-action btn-delete delete">حذف</button>
            </div>
        `;

        item.querySelector(".copy").onclick = () => {
            navigator.clipboard.writeText(token.token);
            alert("تم نسخ Token");
        };

        item.querySelector(".delete").onclick = async () => {
            if (!confirm("حذف Token؟")) return;

            try {
                await fetch("/api/tokens/" + token.id, {
                    method: "DELETE"
                });
                loadTokens();
            } catch (error) {
                console.error("Delete Token Error:", error);
                alert("⚠️ فشل حذف التوكن");
            }
        };

        tokensList.appendChild(item);
    });
}


// ================================
// تسجيل الدخول بـ Google
// ================================

if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            console.log("Login Success:", result.user);
            // localStorage يتم التعامل معه تلقائياً من Firebase
        } catch (error) {
            console.error("Login Error:", error);
            alert("فشل تسجيل الدخول: " + error.message);
        }
    });
}