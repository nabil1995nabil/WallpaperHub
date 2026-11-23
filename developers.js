import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const $ = (selector) => document.querySelector(selector);
const form = $("#createTokenForm");
const tokensList = $("#tokensList");
const developerPage = $("#developerPage");
const loginPopup = $("#loginPopup");
const googleLoginBtn = $("#googleLoginBtn");
const createTokenButton = $("#createTokenButton");
const toastNode = $("#apiToast");

let supabase = null;
let configPromise = null;
let currentUser = null;
let authSubscription = null;
let toastTimer = null;
let activeLoad = 0;

function showToast(message, isError = false) {
    if (!toastNode) return;
    toastNode.textContent = String(message || "");
    toastNode.classList.toggle("is-error", Boolean(isError));
    toastNode.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastNode.classList.remove("is-visible"), 2800);
}

async function getSupabaseClient() {
    if (supabase) return supabase;
    if (!configPromise) {
        configPromise = (async () => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 9000);
            try {
                const response = await fetch("/api/supabase/config", {
                    cache: "no-store",
                    credentials: "same-origin",
                    signal: controller.signal
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success || !data.url || !data.anonKey) {
                    throw new Error(data.message || "إعداد الاتصال غير متاح حالياً.");
                }
                return data;
            } finally {
                clearTimeout(timeout);
            }
        })().catch(error => {
            configPromise = null;
            throw error;
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

async function getAccessToken() {
    const client = await getSupabaseClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    const token = data?.session?.access_token || "";
    if (!token) throw new Error("انتهت جلسة الدخول. سجّل الدخول مجدداً.");
    return token;
}

async function apiFetch(url, options = {}) {
    const accessToken = await getAccessToken();
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", "Bearer " + accessToken);
    headers.set("Accept", "application/json");
    if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
        return await fetch(url, {
            ...options,
            headers,
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeout);
    }
}

async function readResponse(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
        const error = new Error(data.message || "تعذر إكمال الطلب.");
        error.status = response.status;
        error.code = data.code || "";
        throw error;
    }
    return data;
}

function formatDate(value) {
    if (!value) return "لم يستخدم بعد";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "غير متاح";
    return new Intl.DateTimeFormat("ar-MA", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(date);
}

function currentUtcDate() {
    return new Date().toISOString().slice(0, 10);
}

function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
}

function setSummary(tokens) {
    const active = tokens.filter(token => token.active);
    const today = currentUtcDate();
    const used = active.reduce((sum, token) => {
        return sum + (token.lastRequestDate === today ? Number(token.requests || 0) : 0);
    }, 0);
    const limit = active.reduce((sum, token) => sum + Number(token.dailyLimit || 0), 0);
    $("#tokensCount").textContent = String(active.length);
    $("#usageToday").textContent = String(used);
    $("#usageLimit").textContent = String(limit);
}

function makeTokenCard(token) {
    const card = element("article", "token-item");
    const top = element("div", "token-top");
    const title = element("div", "token-title");
    title.append(
        element("strong", "", token.appName || "تطبيق بدون اسم"),
        element("small", "", token.domain || "لا يوجد نطاق")
    );
    const state = element("span", "token-state" + (token.active ? "" : " is-paused"), token.active ? "نشط" : "متوقف");
    top.append(title, state);

    const usage = element("div", "token-usage");
    const dailyLimit = Math.max(1, Number(token.dailyLimit || 200));
    const used = token.lastRequestDate === currentUtcDate() ? Math.max(0, Number(token.requests || 0)) : 0;
    const usageHead = element("div", "token-usage-head");
    usageHead.append(
        element("span", "", "استهلاك اليوم"),
        element("strong", "", used.toLocaleString("ar-MA") + " / " + dailyLimit.toLocaleString("ar-MA"))
    );
    const track = element("div", "quota-track");
    const bar = element("span");
    bar.style.width = Math.min(100, (used / dailyLimit) * 100) + "%";
    track.append(bar);
    usage.append(usageHead, track);

    const foot = element("div", "token-foot");
    foot.append(
        element("span", "", "آخر استخدام: " + formatDate(token.lastUsed)),
        element("span", "", "أنشئ: " + formatDate(token.created))
    );

    const actions = element("div", "token-actions");
    const toggle = element("button", "token-action", token.active ? "إيقاف مؤقت" : "تفعيل");
    toggle.type = "button";
    toggle.addEventListener("click", () => updateTokenStatus(token, !token.active, toggle));
    const remove = element("button", "token-action is-danger", "حذف المفتاح");
    remove.type = "button";
    remove.addEventListener("click", () => deleteToken(token, remove));
    actions.append(toggle, remove);
    card.append(top, usage, foot, actions);
    return card;
}

function renderTokens(tokens) {
    tokensList.replaceChildren();
    if (!tokens.length) {
        const empty = element("div", "empty-note");
        empty.append(
            element("span", "", "✎"),
            element("strong", "", "دفترك ما زال فارغاً"),
            element("small", "", "أنشئ أول مفتاح لتبدأ ربط تطبيقك بمكتبة الخلفيات.")
        );
        tokensList.append(empty);
        setSummary([]);
        return;
    }
    tokens.forEach(token => tokensList.append(makeTokenCard(token)));
    setSummary(tokens);
}

async function loadTokens() {
    if (!currentUser) return;
    const loadId = ++activeLoad;
    tokensList.replaceChildren(element("div", "empty-note", "جاري تحديث القائمة..."));
    try {
        const response = await apiFetch("/api/tokens/" + encodeURIComponent(currentUser.id), {
            method: "GET"
        });
        const data = await readResponse(response);
        if (loadId !== activeLoad) return;
        renderTokens(Array.isArray(data) ? data : []);
    } catch (error) {
        if (loadId !== activeLoad) return;
        console.error("API TOKEN LIST:", error);
        tokensList.replaceChildren(element("div", "empty-note", error.message || "تعذر تحميل المفاتيح."));
        showToast(error.message || "تعذر تحميل المفاتيح.", true);
    }
}

async function updateTokenStatus(token, active, button) {
    button.disabled = true;
    try {
        const response = await apiFetch("/api/tokens/" + encodeURIComponent(token.id) + "/status", {
            method: "PATCH",
            body: JSON.stringify({ active })
        });
        await readResponse(response);
        showToast(active ? "تم تفعيل المفتاح." : "تم إيقاف المفتاح مؤقتاً.");
        await loadTokens();
    } catch (error) {
        console.error("API TOKEN STATUS:", error);
        showToast(error.message || "تعذر تحديث المفتاح.", true);
        button.disabled = false;
    }
}

async function deleteToken(token, button) {
    const accepted = window.confirm("سيتم حذف مفتاح " + (token.appName || "هذا التطبيق") + " نهائياً. هل تريد المتابعة؟");
    if (!accepted) return;
    button.disabled = true;
    try {
        const response = await apiFetch("/api/tokens/" + encodeURIComponent(token.id), {
            method: "DELETE"
        });
        await readResponse(response);
        showToast("تم حذف المفتاح.");
        await loadTokens();
    } catch (error) {
        console.error("API TOKEN DELETE:", error);
        showToast(error.message || "تعذر حذف المفتاح.", true);
        button.disabled = false;
    }
}

function normalizeDomain(value) {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
        throw new Error("أدخل نطاقاً صحيحاً يبدأ بـ https://");
    }
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
        throw new Error("استخدم https:// للنطاقات العامة.");
    }
    return url.origin;
}

function showNewToken(secret, tokenName) {
    const layer = element("div", "one-time-layer");
    const dialog = element("section", "one-time-paper");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "oneTimeTitle");
    const title = element("h2", "", "تم إنشاء مفتاح API");
    title.id = "oneTimeTitle";
    const note = element("p", "", "المفتاح الخاص بتطبيق " + tokenName + " سيظهر هنا مرة واحدة فقط. انسخه واحفظه في إعدادات الخادم.");
    const key = element("code", "one-time-secret", secret);
    const actions = element("div", "one-time-actions");
    const copy = element("button", "", "نسخ المفتاح");
    copy.type = "button";
    copy.addEventListener("click", async () => {
        await copyText(secret, "تم نسخ المفتاح.");
    });
    const close = element("button", "save-secret", "حفظت المفتاح");
    close.type = "button";
    close.addEventListener("click", () => layer.remove());
    actions.append(copy, close);
    dialog.append(title, note, key, actions);
    layer.append(dialog);
    layer.addEventListener("click", event => {
        if (event.target === layer) layer.remove();
    });
    document.body.append(layer);
    close.focus();
}

async function copyText(value, successMessage) {
    try {
        await navigator.clipboard.writeText(String(value));
        showToast(successMessage || "تم النسخ.");
    } catch (_error) {
        const temporary = element("textarea");
        temporary.value = String(value);
        temporary.style.position = "fixed";
        temporary.style.opacity = "0";
        document.body.append(temporary);
        temporary.select();
        const copied = document.execCommand("copy");
        temporary.remove();
        showToast(copied ? (successMessage || "تم النسخ.") : "تعذر النسخ؛ حدّد النص وانسخه يدوياً.", !copied);
    }
}

function bindDocumentation() {
    const endpoint = new URL("/api/v1/wallpapers", window.location.origin).href;
    $("#endpointPath").textContent = endpoint;
    $("#copyEndpoint").addEventListener("click", () => copyText(endpoint, "تم نسخ رابط API."));
    $("#copyExample").addEventListener("click", () => copyText($("#sampleCode").textContent, "تم نسخ المثال."));
}

async function handleCreateToken(event) {
    event.preventDefault();
    if (!currentUser) {
        showToast("سجّل الدخول أولاً.", true);
        return;
    }
    const appName = $("#appName").value.trim();
    let domain;
    try {
        domain = normalizeDomain($("#appDomain").value);
    } catch (error) {
        showToast(error.message, true);
        $("#appDomain").focus();
        return;
    }
    const dailyLimit = Number($("#rateLimit").value);
    if (appName.length < 2 || appName.length > 60) {
        showToast("اسم التطبيق يجب أن يكون بين حرفين و60 حرفاً.", true);
        $("#appName").focus();
        return;
    }
    if (![20, 50, 100, 200].includes(dailyLimit)) {
        showToast("اختر حصة يومية صحيحة.", true);
        return;
    }

    createTokenButton.disabled = true;
    createTokenButton.querySelector("span:nth-child(2)").textContent = "جارٍ الإنشاء...";
    try {
        const response = await apiFetch("/api/tokens/create", {
            method: "POST",
            body: JSON.stringify({ appName, domain, dailyLimit })
        });
        const data = await readResponse(response);
        if (!data.token?.token) throw new Error("تم إنشاء المفتاح لكن لم نستلم قيمته. راجع قائمة المفاتيح.");
        form.reset();
        $("#rateLimit").value = "100";
        showNewToken(data.token.token, data.token.appName || appName);
        await loadTokens();
    } catch (error) {
        console.error("API TOKEN CREATE:", error);
        showToast(error.message || "تعذر إنشاء المفتاح.", true);
    } finally {
        createTokenButton.disabled = false;
        createTokenButton.querySelector("span:nth-child(2)").textContent = "إنشاء المفتاح";
    }
}

function updateAuthView(user) {
    const oldId = currentUser?.id || "";
    currentUser = user || null;
    const signedIn = Boolean(currentUser);
    developerPage.hidden = !signedIn;
    loginPopup.hidden = signedIn;
    if (signedIn) {
        const label = currentUser.email || currentUser.user_metadata?.full_name || "حساب WallpaperHub";
        $("#currentAccountLabel").textContent = label;
        if (oldId !== currentUser.id) loadTokens();
    } else {
        activeLoad++;
    }
}

async function initAuth() {
    try {
        const client = await getSupabaseClient();
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        updateAuthView(data?.session?.user || null);
        const subscriptionData = client.auth.onAuthStateChange((_event, session) => {
            updateAuthView(session?.user || null);
        });
        authSubscription = subscriptionData?.data?.subscription || null;
    } catch (error) {
        console.error("DEVELOPER AUTH INIT:", error);
        developerPage.hidden = true;
        loginPopup.hidden = false;
        $("#authMessage").textContent = error.name === "AbortError"
            ? "انتهت مهلة الاتصال بخدمة الدخول. أعد المحاولة."
            : (error.message || "تعذر الاتصال بخدمة الدخول. حاول تحديث الصفحة.");
    }
}

form?.addEventListener("submit", handleCreateToken);
googleLoginBtn?.addEventListener("click", async () => {
    googleLoginBtn.disabled = true;
    try {
        const client = await getSupabaseClient();
        const redirectTo = new URL("/developers.html", window.location.origin).href;
        const { error } = await client.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo }
        });
        if (error) throw error;
    } catch (error) {
        console.error("DEVELOPER GOOGLE LOGIN:", error);
        showToast(error.message || "تعذر بدء تسجيل الدخول.", true);
        googleLoginBtn.disabled = false;
    }
});

bindDocumentation();
$("#todayStamp").textContent = "API JOURNAL · " + new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
}).format(new Date()).toUpperCase();

window.addEventListener("beforeunload", () => {
    try { authSubscription?.unsubscribe?.(); } catch (_error) {}
});

initAuth();
