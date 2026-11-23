import { supabase } from "../supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
  const $ = id => document.getElementById(id);
  const form = $("create-ad-form");
  const adsContainer = $("ads-container");
  const publishBtn = $("publish-btn");
  const fileInput = $("ad-file");
  const fileNamePreview = $("file-preview-name");
  const titleInput = $("ad-title");
  const contentInput = $("ad-content");
  const categoryInput = $("ad-category");
  const imageInput = $("ad-image");
  const sendPushInput = $("ad-send-push");

  let session = null;
  let announcements = [];
  let uploadedImage = "";
  let editingAnnouncementId = null;
  let activeSearch = "";
  let activeCategory = "all";
  let activeSort = "newest";

  const categoryLabels = {
    admin: "إعلان عام",
    update: "تحديث جديد",
    event: "فعالية"
  };

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[ch]));
  }

  function safeImage(value) {
    const url = String(value || "").trim();
    if (/^https?:\/\//i.test(url)) return url;
    if (/^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(url)) return url;
    return "";
  }

  function message(text, isError = false) {
    const toast = $("ad-toast");
    if (!toast) return;
    toast.textContent = text || "";
    toast.classList.toggle("error", Boolean(isError));
  }

  function formatDate(value) {
    if (!value) return "التاريخ غير متاح";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("ar-MA", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  async function requireAdminSession() {
    const result = await supabase.auth.getSession();
    if (result.error || !result.data?.session) {
      location.href = "/profile.html";
      return null;
    }
    const current = result.data.session;
    const response = await fetch("/api/admin/me", {
      headers: { Authorization: "Bearer " + current.access_token },
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.isAdmin) {
      location.href = "/profile.html";
      return null;
    }
    return current;
  }

  async function api(url, options = {}) {
    if (!session?.access_token) throw new Error("انتهت جلسة الإدارة. أعد تسجيل الدخول.");
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", "Bearer " + session.access_token);
    if (options.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const response = await fetch(url, { ...options, headers, cache: "no-store" });
    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw }; }
    if (!response.ok) throw new Error(data.message || data.error || ("HTTP " + response.status));
    return data;
  }

  function updateStats() {
    $("stat-total").textContent = announcements.length.toLocaleString("ar");
    $("stat-views").textContent = announcements.reduce((sum, ad) => sum + Number(ad.views || 0), 0).toLocaleString("ar");
    $("stat-interactions").textContent = announcements.reduce((sum, ad) => sum + Number(ad.likes || 0), 0).toLocaleString("ar");
  }

  function filteredAnnouncements() {
    const query = activeSearch.trim().toLowerCase();
    const rows = announcements.filter(ad => {
      const type = String(ad.type || ad.category || "admin");
      if (activeCategory !== "all" && type !== activeCategory) return false;
      if (!query) return true;
      return [ad.title, ad.content, type, ad.id].join(" ").toLowerCase().includes(query);
    });
    rows.sort((a, b) => {
      if (activeSort === "views") return Number(b.views || 0) - Number(a.views || 0);
      if (activeSort === "likes") return Number(b.likes || 0) - Number(a.likes || 0);
      const aDate = new Date(a.created_at || a.date || 0).getTime() || 0;
      const bDate = new Date(b.created_at || b.date || 0).getTime() || 0;
      return activeSort === "oldest" ? aDate - bDate : bDate - aDate;
    });
    return rows;
  }

  function makeAdCard(ad) {
    const item = document.createElement("article");
    item.className = "ad-item";
    item.dataset.id = String(ad.id);
    const image = safeImage(ad.image);
    if (image) {
      const img = document.createElement("img");
      img.className = "ad-thumb";
      img.loading = "lazy";
      img.alt = "";
      img.src = image;
      img.onerror = () => { img.replaceWith(makeThumbPlaceholder()); };
      item.appendChild(img);
    } else {
      item.appendChild(makeThumbPlaceholder());
    }

    const details = document.createElement("div");
    details.className = "ad-details";
    const meta = document.createElement("div");
    meta.className = "ad-meta";
    const badge = document.createElement("span");
    badge.className = "ad-badge";
    badge.textContent = categoryLabels[ad.type] || categoryLabels[ad.category] || "إعلان";
    const date = document.createElement("time");
    date.className = "ad-date";
    date.textContent = formatDate(ad.created_at || ad.date);
    meta.append(badge, date);
    const title = document.createElement("h3");
    title.textContent = ad.title || "بدون عنوان";
    const body = document.createElement("p");
    body.textContent = ad.content || "";
    const metrics = document.createElement("div");
    metrics.className = "ad-metrics";
    metrics.textContent = "◉ " + Number(ad.views || 0).toLocaleString("ar") + " مشاهدة   ·   ♥ " + Number(ad.likes || 0).toLocaleString("ar") + " تفاعل";
    details.append(meta, title, body, metrics);
    item.appendChild(details);

    const actions = document.createElement("div");
    actions.className = "ad-actions";
    const edit = document.createElement("button");
    edit.className = "action-btn edit";
    edit.type = "button";
    edit.textContent = "✎ تعديل";
    edit.addEventListener("click", () => editAdvertisement(ad));
    const remove = document.createElement("button");
    remove.className = "action-btn delete";
    remove.type = "button";
    remove.textContent = "⌫ حذف الإعلان";
    remove.addEventListener("click", () => deleteAdvertisement(ad.id, ad.title, remove));
    actions.append(edit, remove);
    item.appendChild(actions);
    return item;
  }

  function makeThumbPlaceholder() {
    const box = document.createElement("div");
    box.className = "ad-thumb-empty";
    box.textContent = "WH";
    return box;
  }

  function renderAds() {
    const rows = filteredAnnouncements();
    $("ads-result-count").textContent = rows.length.toLocaleString("ar") + " إعلان";
    adsContainer.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "archive-empty";
      empty.textContent = announcements.length ? "لا توجد إعلانات مطابقة للبحث أو التصنيف." : "لا توجد إعلانات منشورة حالياً.";
      adsContainer.appendChild(empty);
    } else {
      const fragment = document.createDocumentFragment();
      rows.forEach(ad => fragment.appendChild(makeAdCard(ad)));
      adsContainer.appendChild(fragment);
    }
    updateStats();
  }

  async function loadAds() {
    const refresh = $("ad-refresh-list");
    if (refresh) {
      refresh.disabled = true;
      refresh.textContent = "جارٍ التحديث…";
    }
    adsContainer.innerHTML = '<div class="archive-loading">جارٍ تحديث أرشيف الإعلانات...</div>';
    try {
      const data = await api("/api/admin/announcements", { method: "GET" });
      announcements = Array.isArray(data) ? data : [];
      renderAds();
    } catch (error) {
      console.error("ANNOUNCEMENT LOAD ERROR:", error);
      adsContainer.innerHTML = '<div class="archive-error">' + esc(error.message || "تعذر تحميل الإعلانات") + '</div>';
      message(error.message || "تعذر تحميل الأرشيف", true);
    } finally {
      if (refresh) {
        refresh.disabled = false;
        refresh.textContent = "↻ تحديث الأرشيف";
      }
    }
  }

  function updateCounts() {
    $("title-count").textContent = titleInput.value.length.toLocaleString("ar") + " / 140";
    $("content-count").textContent = contentInput.value.length.toLocaleString("ar") + " / 6000";
  }

  function renderPreview() {
    $("preview-title").textContent = titleInput.value.trim() || "عنوان الإعلان سيظهر هنا";
    $("preview-category").textContent = categoryLabels[categoryInput.value] || "إعلان عام";
    $("preview-content").textContent = contentInput.value.trim() || "اكتب نص الإعلان ليظهر هنا داخل معاينة الجريدة. يمكنك مراجعة العنوان والصورة والنص قبل النشر.";
    $("preview-date").textContent = "الآن";
    const image = safeImage(uploadedImage || imageInput.value);
    const imageWrap = $("preview-image-wrap");
    const empty = $("preview-no-image");
    if (image) {
      $("preview-image").src = image;
      imageWrap.hidden = false;
      empty.hidden = true;
    } else {
      $("preview-image").removeAttribute("src");
      imageWrap.hidden = true;
      empty.hidden = false;
    }
    updateCounts();
  }

  function resetEditor() {
    form.reset();
    editingAnnouncementId = null;
    uploadedImage = "";
    fileInput.value = "";
    fileNamePreview.textContent = "لم يتم اختيار صورة";
    publishBtn.disabled = false;
    publishBtn.innerHTML = 'نشر الإعلان <span>↗</span>';
    $("ad-cancel-edit").hidden = true;
    $("ad-editor-state").innerHTML = '<span class="editor-state-dot"></span> إعلان جديد — جاهز للتحرير';
    sendPushInput.checked = true;
    renderPreview();
    message("");
  }

  function editAdvertisement(ad) {
    editingAnnouncementId = ad.id;
    titleInput.value = ad.title || "";
    categoryInput.value = ad.type || ad.category || "admin";
    contentInput.value = ad.content || "";
    imageInput.value = safeImage(ad.image).startsWith("http") ? safeImage(ad.image) : "";
    uploadedImage = safeImage(ad.image).startsWith("data:image/") ? safeImage(ad.image) : "";
    fileInput.value = "";
    fileNamePreview.textContent = uploadedImage ? "الصورة الحالية محفوظة مع الإعلان" : (imageInput.value ? "سيُستخدم رابط الصورة الحالي" : "لا توجد صورة مرفقة");
    sendPushInput.checked = false;
    publishBtn.innerHTML = 'حفظ التعديل <span>✓</span>';
    $("ad-cancel-edit").hidden = false;
    $("ad-editor-state").innerHTML = '<span class="editor-state-dot"></span> وضع التعديل — الإعلان رقم ' + esc(ad.id);
    renderPreview();
    $("create-ad-form").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function deleteAdvertisement(id, title, button) {
    const label = title ? ' "' + title + '"' : "";
    if (!window.confirm("حذف الإعلان" + label + " نهائياً؟ لن يتم حذف أي خلفية أو إشعار آخر.")) return;
    button.disabled = true;
    const original = button.textContent;
    button.textContent = "جارٍ الحذف…";
    try {
      await api("/api/admin/announcements/" + encodeURIComponent(id), { method: "DELETE" });
      announcements = announcements.filter(ad => String(ad.id) !== String(id));
      if (String(editingAnnouncementId) === String(id)) resetEditor();
      renderAds();
      message("تم حذف الإعلان من قاعدة البيانات.");
    } catch (error) {
      console.error("ANNOUNCEMENT DELETE ERROR:", error);
      message(error.message || "تعذر حذف الإعلان", true);
      button.disabled = false;
      button.textContent = original;
    }
  }

  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    uploadedImage = "";
    if (!file) {
      fileNamePreview.textContent = "لم يتم اختيار صورة";
      renderPreview();
      return;
    }
    if (!file.type.startsWith("image/")) {
      fileInput.value = "";
      fileNamePreview.textContent = "الملف المختار ليس صورة صالحة";
      message("اختر ملف صورة فقط.", true);
      renderPreview();
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      fileInput.value = "";
      fileNamePreview.textContent = "الصورة تتجاوز الحد المسموح (5 MB)";
      message("حجم الصورة يجب ألا يتجاوز 5 ميغابايت.", true);
      renderPreview();
      return;
    }
    fileNamePreview.textContent = "جارٍ قراءة: " + file.name;
    const reader = new FileReader();
    reader.onload = event => {
      uploadedImage = String(event.target?.result || "");
      fileNamePreview.textContent = "تم اختيار: " + file.name;
      renderPreview();
    };
    reader.onerror = () => message("تعذرت قراءة الصورة المختارة.", true);
    reader.readAsDataURL(file);
  });

  [titleInput, contentInput, categoryInput, imageInput].forEach(input => {
    input.addEventListener("input", renderPreview);
    input.addEventListener("change", renderPreview);
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const title = titleInput.value.trim();
    const category = categoryInput.value;
    const content = contentInput.value.trim();
    const image = uploadedImage || imageInput.value.trim();
    if (!title || !content) {
      message("أدخل العنوان والمحتوى أولاً.", true);
      return;
    }
    if (image && !safeImage(image)) {
      message("رابط الصورة يجب أن يبدأ بـ https:// أو http://.", true);
      return;
    }

    const editing = editingAnnouncementId !== null;
    publishBtn.disabled = true;
    publishBtn.textContent = editing ? "جارٍ حفظ التعديلات…" : "جارٍ نشر الإعلان…";
    try {
      const url = editing
        ? "/api/admin/notifications/" + encodeURIComponent(editingAnnouncementId)
        : "/api/admin/announcements";
      await api(url, {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({
          title,
          category,
          content,
          image,
          sendPush: Boolean(sendPushInput.checked)
        })
      });
      message(editing ? "تم حفظ تعديلات الإعلان." : "تم نشر الإعلان وحفظه.");
      resetEditor();
      await loadAds();
    } catch (error) {
      console.error("ANNOUNCEMENT SAVE ERROR:", error);
      message(error.message || "تعذر حفظ الإعلان", true);
      publishBtn.disabled = false;
      publishBtn.innerHTML = editing ? 'حفظ التعديل <span>✓</span>' : 'نشر الإعلان <span>↗</span>';
    }
  });

  $("ad-cancel-edit").addEventListener("click", resetEditor);
  $("ad-preview-jump").addEventListener("click", () => $("ad-preview").scrollIntoView({ behavior: "smooth", block: "start" }));
  $("ad-refresh-list").addEventListener("click", loadAds);
  $("ad-search").addEventListener("input", event => { activeSearch = event.target.value; renderAds(); });
  $("ads-category-filter").addEventListener("change", event => { activeCategory = event.target.value; renderAds(); });
  $("ads-sort").addEventListener("change", event => { activeSort = event.target.value; renderAds(); });

  session = await requireAdminSession();
  if (!session) return;
  resetEditor();
  await loadAds();
});