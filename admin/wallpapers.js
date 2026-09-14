import { supabase } from "../supabase.js";

// ==========================================
// WallpaperHub — Admin Wallpapers Manager
// ==========================================

const wallpaperContainer = document.getElementById("wallpaperContainer");

let wallpapers = [];
let selectedWallpapers = new Set();

const CATEGORIES = [
  ["nature", "🌿 الطبيعة"],
  ["amoled", "🖤 AMOLED"],
  ["games", "🎮 ألعاب"],
  ["cars", "🚗 سيارات"],
  ["animals", "🐾 حيوانات"],
  ["anime", "🎌 أنمي"],
  ["space", "🌌 فضاء"],
  ["ai", "🤖 ذكاء اصطناعي"],
  ["city", "🏙️ مدن"],
  ["dark", "🌑 داكن"],
  ["4k", "💎 4K"],
  ["sports", "⚽ رياضة"],
  ["minimal", "✨ مينيمال"],
  ["rain", "🌧️ مطر"],
  ["sunset", "🌅 غروب"],
  ["architecture", "🏛️ عمارة"],
  ["deep-space", "🌠 فضاء عميق"],
  ["wallhaven", "🧱 Wallhaven"],
  ["other", "📦 أخرى"]
];

const categoryLabel = Object.fromEntries(CATEGORIES);

const state = {
  search: "",
  category: "all",
  type: "all",
  sort: "newest"
};

// ===============================
// مصادقة الأدمن مع الخادم
// ===============================
async function getAdminHeaders() {
  const { data, error } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  if (error || !token) {
    throw new Error("يجب تسجيل الدخول أولاً");
  }

  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
}


function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getCategory(wall) {
  return String(wall?.category || "other").trim().toLowerCase();
}

function getDate(wall) {
  const value = wall?.date || wall?.createdAt || 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getFilteredWallpapers() {
  let list = wallpapers.filter(Boolean);

  const search = state.search.trim().toLowerCase();

  if (search) {
    list = list.filter(w => {
      const haystack = [
        w.id,
        w.title,
        w.category,
        ...(Array.isArray(w.tags) ? w.tags : [])
      ].join(" ").toLowerCase();

      return haystack.includes(search);
    });
  }

  if (state.category !== "all") {
    list = list.filter(w => getCategory(w) === state.category);
  }

  if (state.type !== "all") {
    list = list.filter(w =>
      state.type === "video"
        ? w.type === "video" || w.animated === true
        : w.type !== "video" && w.animated !== true
    );
  }

  list.sort((a, b) => {
    if (state.sort === "oldest") return getDate(a) - getDate(b);
    if (state.sort === "downloads") return Number(b.downloads || 0) - Number(a.downloads || 0);
    if (state.sort === "likes") return Number(b.likes || 0) - Number(a.likes || 0);
    if (state.sort === "views") return Number(b.views || 0) - Number(a.views || 0);
    return getDate(b) - getDate(a);
  });

  return list;
}

// ===============================
// تحميل الخلفيات
// ===============================

async function loadWallpapers() {
  setLoading(true);

  try {
    const response = await fetch("/api/wallpapers?_=" + Date.now(), {
      cache: "no-store"
    });

    if (!response.ok) throw new Error("API ERROR");

    const data = await response.json();
    wallpapers = Array.isArray(data) ? data : [];

    // لا نحتفظ بتحديد IDs لم تعد موجودة.
    const existing = new Set(wallpapers.map(w => String(w.id)));
    selectedWallpapers = new Set(
      [...selectedWallpapers].filter(id => existing.has(String(id)))
    );

    renderAll();
  } catch (error) {
    console.error(error);
    wallpaperContainer.innerHTML = `
      <div class="empty-state error-state">
        <div class="empty-icon">⚠️</div>
        <h3>فشل تحميل الخلفيات</h3>
        <p>تأكد من أن الخادم يعمل ثم حاول مرة أخرى.</p>
        <button class="primary-btn" id="retryLoad">إعادة المحاولة</button>
      </div>
    `;
    document.getElementById("retryLoad")?.addEventListener("click", loadWallpapers);
  } finally {
    setLoading(false);
  }
}

function setLoading(isLoading) {
  document.body.classList.toggle("is-loading", isLoading);
}

// ===============================
// الواجهة
// ===============================

function renderAll() {
  renderToolbar();
  renderStats();
  renderBulkBar();
  renderWallpapers();
}

function renderStats() {
  const total = wallpapers.length;
  const selected = selectedWallpapers.size;

  const counts = {};
  wallpapers.forEach(w => {
    const cat = getCategory(w);
    counts[cat] = (counts[cat] || 0) + 1;
  });

  const statTotal = document.getElementById("statTotal");
  const statSelected = document.getElementById("statSelected");
  const statNature = document.getElementById("statNature");
  const statOther = document.getElementById("statOther");

  if (statTotal) statTotal.textContent = total;
  if (statSelected) statSelected.textContent = selected;
  if (statNature) statNature.textContent = counts.nature || 0;
  if (statOther) statOther.textContent = counts.other || 0;

  const resultCount = document.getElementById("resultCount");
  if (resultCount) resultCount.textContent = getFilteredWallpapers().length;
}

function renderToolbar() {
  const search = document.getElementById("wallSearch");
  const category = document.getElementById("categoryFilter");
  const type = document.getElementById("typeFilter");
  const sort = document.getElementById("sortFilter");

  if (!search) return;

  if (search.value !== state.search) search.value = state.search;

  if (category && category.value !== state.category) category.value = state.category;
  if (type && type.value !== state.type) type.value = state.type;
  if (sort && sort.value !== state.sort) sort.value = state.sort;
}

function renderBulkBar() {
  const bar = document.getElementById("bulkBar");
  const count = document.getElementById("bulkCount");
  if (!bar) return;

  const hasSelection = selectedWallpapers.size > 0;
  bar.classList.toggle("hidden", !hasSelection);

  if (count) count.textContent = selectedWallpapers.size;
}

function renderWallpapers() {
  if (!wallpaperContainer) return;

  const list = getFilteredWallpapers();
  wallpaperContainer.innerHTML = "";

  if (!list.length) {
    wallpaperContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🖼️</div>
        <h3>لا توجد خلفيات مطابقة</h3>
        <p>غيّر البحث أو الفلاتر لرؤية المزيد من الخلفيات.</p>
      </div>
    `;
    renderStats();
    renderBulkBar();
    return;
  }

  const fragment = document.createDocumentFragment();

  list.forEach(wall => {
    const card = document.createElement("article");
    card.className = "admin-wall" +
      (selectedWallpapers.has(String(wall.id)) ? " is-selected" : "");

    const isVideo = wall.type === "video" || wall.animated === true;
    const media = isVideo
      ? `<video src="${escapeHTML(wall.image)}" muted loop playsinline preload="metadata"></video>`
      : `<img src="${escapeHTML(wall.thumbnail || wall.image)}" loading="lazy" alt="${escapeHTML(wall.title || "خلفية")}">`;

    const category = getCategory(wall);
    const categoryName = categoryLabel[category] || wall.category || "أخرى";

    card.innerHTML = `
      <label class="select-wrap" title="تحديد الخلفية">
        <input type="checkbox" class="wall-select"
          data-id="${escapeHTML(wall.id)}"
          ${selectedWallpapers.has(String(wall.id)) ? "checked" : ""}>
        <span class="custom-check">✓</span>
      </label>

      <div class="wall-media">
        ${media}
        <span class="media-type">${isVideo ? "🎞️ فيديو" : "🖼️ صورة"}</span>
        <span class="wall-id">#${escapeHTML(wall.id)}</span>
      </div>

      <div class="admin-info">
        <div class="title-row">
          <h3 title="${escapeHTML(wall.title || "بدون اسم")}">
            ${escapeHTML(wall.title || "بدون اسم")}
          </h3>
        </div>

        <div class="category-pill">${escapeHTML(categoryName)}</div>

        <div class="metrics">
          <span>⬇️ ${Number(wall.downloads || 0)}</span>
          <span>❤️ ${Number(wall.likes || 0)}</span>
          <span>👁️ ${Number(wall.views || 0)}</span>
        </div>

        <div class="admin-actions">
          <button class="edit-btn" data-action="edit" data-id="${escapeHTML(wall.id)}">
            ✏️ تعديل
          </button>
          <button class="delete-btn" data-action="delete" data-id="${escapeHTML(wall.id)}">
            🗑️ حذف
          </button>
        </div>
      </div>
    `;

    const checkbox = card.querySelector(".wall-select");
    checkbox.addEventListener("change", () => {
      toggleSelection(wall.id, checkbox.checked);
    });

    card.querySelector('[data-action="edit"]')
      ?.addEventListener("click", () => editWallpaper(wall.id));

    card.querySelector('[data-action="delete"]')
      ?.addEventListener("click", () => deleteWallpaper(wall.id));

    fragment.appendChild(card);
  });

  wallpaperContainer.appendChild(fragment);
  renderStats();
  renderBulkBar();
}

// ===============================
// التحديد
// ===============================

function toggleSelection(id, checked) {
  const key = String(id);

  if (checked) selectedWallpapers.add(key);
  else selectedWallpapers.delete(key);

  renderStats();
  renderBulkBar();

  const card = document.querySelector(`.wall-select[data-id="${CSS.escape(key)}"]`)
    ?.closest(".admin-wall");

  card?.classList.toggle("is-selected", checked);
}

function selectAllVisible() {
  getFilteredWallpapers().forEach(w => selectedWallpapers.add(String(w.id)));
  renderAll();
}

function clearSelection() {
  selectedWallpapers.clear();
  renderAll();
}

function selectCategory(category) {
  state.category = category;
  selectedWallpapers.clear();

  const categoryFilter = document.getElementById("categoryFilter");
  if (categoryFilter) categoryFilter.value = category;

  renderAll();
}

function selectAllOfCurrentCategory() {
  const list = getFilteredWallpapers();
  list.forEach(w => selectedWallpapers.add(String(w.id)));
  renderAll();
}

// ===============================
// نقل متعدد إلى قسم
// ===============================

function openMoveModal() {
  if (!selectedWallpapers.size) {
    alert("حدد الخلفيات أولا.");
    return;
  }

  const modal = document.getElementById("moveModal");
  const count = document.getElementById("moveCount");
  const select = document.getElementById("moveCategory");

  if (!modal || !select) return;

  select.innerHTML = CATEGORIES.map(([value, label]) =>
    `<option value="${escapeHTML(value)}">${escapeHTML(label)}</option>`
  ).join("");

  if (count) count.textContent = selectedWallpapers.size;

  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeMoveModal() {
  document.getElementById("moveModal")?.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

async function moveSelectedWallpapers() {
  const ids = [...selectedWallpapers];
  const select = document.getElementById("moveCategory");
  const targetCategory = select?.value;

  if (!ids.length || !targetCategory) return;

  const targetName = categoryLabel[targetCategory] || targetCategory;

  if (!confirm(`سيتم نقل ${ids.length} خلفية إلى "${targetName}".\n\nسيتم تغيير القسم فقط ولن تتغير الإعجابات أو التحميلات أو المشاهدات.\n\nمتابعة؟`)) {
    return;
  }

  const button = document.getElementById("confirmMoveBtn");
  if (button) {
    button.disabled = true;
    button.dataset.original = button.textContent;
    button.textContent = "جاري النقل...";
  }

  let success = 0;
  let failed = 0;

  try {
    for (const id of ids) {
      try {
        const response = await fetch(`/api/admin/wallpapers/${encodeURIComponent(id)}/category`, {
          method: "PATCH",
          headers: await getAdminHeaders(),
          body: JSON.stringify({ category: targetCategory })
        });

        if (!response.ok) {
          failed++;
          continue;
        }

        const wall = wallpapers.find(w => String(w.id) === String(id));
        if (wall) wall.category = targetCategory;

        success++;
      } catch (error) {
        console.error("Move error:", id, error);
        failed++;
      }
    }

    selectedWallpapers.clear();
    closeMoveModal();

    if (failed) {
      alert(`تم نقل ${success} خلفية، وفشل نقل ${failed}.`);
    } else {
      alert(`تم نقل ${success} خلفية بنجاح إلى ${targetName}.`);
    }

    renderAll();
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = button.dataset.original || "تأكيد النقل";
    }
  }
}

// ===============================
// حذف خلفية واحدة
// ===============================

async function deleteWallpaper(id) {
  if (!confirm("هل تريد حذف هذه الخلفية؟\n\nتأكد قبل الحذف لأن العملية قد تكون غير قابلة للتراجع.")) {
    return;
  }

  try {
    const response = await fetch("/api/wallpapers/" + encodeURIComponent(id), {
      method: "DELETE",
      headers: await getAdminHeaders()
    });

    if (!response.ok) {
      let message = "فشل الحذف";
      try {
        const data = await response.json();
        message = data?.message || message;
      } catch (_) {}
      throw new Error(message);
    }

    selectedWallpapers.delete(String(id));
    wallpapers = wallpapers.filter(w => String(w.id) !== String(id));

    renderAll();
  } catch (error) {
    console.error(error);
    alert(error?.message || "فشل حذف الخلفية.");
  }
}

// ===============================
// حذف متعدد
// ===============================

async function deleteSelectedWallpapers() {
  const ids = [...selectedWallpapers];

  if (!ids.length) {
    alert("حدد الخلفيات أولا.");
    return;
  }

  if (!confirm(`هل تريد حذف ${ids.length} خلفية؟\n\nتحذير: الحذف مختلف عن تغيير القسم وقد يؤثر على البيانات المرتبطة بهذه الخلفيات.\n\nهل أنت متأكد؟`)) {
    return;
  }

  const button = document.getElementById("bulkDeleteBtn");
  if (button) {
    button.disabled = true;
    button.textContent = "جاري الحذف...";
  }

  let success = 0;
  let failed = 0;

  try {
    for (const id of ids) {
      try {
        const response = await fetch("/api/wallpapers/" + encodeURIComponent(id), {
          method: "DELETE",
          headers: await getAdminHeaders()
        });

        if (!response.ok) {
          failed++;
          continue;
        }

        wallpapers = wallpapers.filter(w => String(w.id) !== String(id));
        success++;
      } catch (error) {
        console.error(error);
        failed++;
      }
    }

    selectedWallpapers.clear();
    renderAll();

    alert(
      failed
        ? `تم حذف ${success}، وفشل ${failed}.`
        : `تم حذف ${success} خلفية بنجاح.`
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "🗑️ حذف المحدد";
    }
  }
}

// ===============================
// تعديل — محفوظ كسلوك قديم مؤقتا
// ===============================

function editWallpaper(id) {
  alert("سيتم تعديل الخلفية رقم: " + id);
}

// ===============================
// الأحداث
// ===============================

document.getElementById("wallSearch")?.addEventListener("input", e => {
  state.search = e.target.value;
  renderWallpapers();
  renderStats();
});

document.getElementById("categoryFilter")?.addEventListener("change", e => {
  state.category = e.target.value;
  renderWallpapers();
  renderStats();
});

document.getElementById("typeFilter")?.addEventListener("change", e => {
  state.type = e.target.value;
  renderWallpapers();
  renderStats();
});

document.getElementById("sortFilter")?.addEventListener("change", e => {
  state.sort = e.target.value;
  renderWallpapers();
});

document.getElementById("selectAllBtn")?.addEventListener("click", selectAllVisible);
document.getElementById("clearSelectionBtn")?.addEventListener("click", clearSelection);
document.getElementById("selectCategoryBtn")?.addEventListener("click", selectAllOfCurrentCategory);
document.getElementById("moveSelectedBtn")?.addEventListener("click", openMoveModal);
document.getElementById("bulkDeleteBtn")?.addEventListener("click", deleteSelectedWallpapers);
document.getElementById("refreshBtn")?.addEventListener("click", loadWallpapers);

document.getElementById("closeMoveBtn")?.addEventListener("click", closeMoveModal);
document.getElementById("cancelMoveBtn")?.addEventListener("click", closeMoveModal);
document.getElementById("confirmMoveBtn")?.addEventListener("click", moveSelectedWallpapers);

document.getElementById("moveModal")?.addEventListener("click", e => {
  if (e.target.id === "moveModal") closeMoveModal();
});

document.getElementById("quickCategoryRow")?.addEventListener("click", e => {
  const button = e.target.closest("[data-category]");
  if (!button) return;

  state.category = button.dataset.category;
  const filter = document.getElementById("categoryFilter");
  if (filter) filter.value = state.category;
  renderAll();
});

window.deleteWallpaper = deleteWallpaper;
window.editWallpaper = editWallpaper;
window.openMoveModal = openMoveModal;
window.closeMoveModal = closeMoveModal;
window.selectAllVisible = selectAllVisible;
window.clearSelection = clearSelection;

// تشغيل
(async () => {
  try {
    const headers = await getAdminHeaders();
    const response = await fetch("/api/admin/me", { headers });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.isAdmin) {
      wallpaperContainer.innerHTML = `
        <div class="empty-state error-state">
          <div class="empty-icon">🔐</div>
          <h3>لا تملك صلاحية الأدمن</h3>
          <p>سجّل الدخول بحساب الأدمن ثم أعد فتح الصفحة.</p>
        </div>`;
      return;
    }

    loadWallpapers();
  } catch (error) {
    console.error("ADMIN AUTH ERROR:", error);
    wallpaperContainer.innerHTML = `
      <div class="empty-state error-state">
        <div class="empty-icon">🔐</div>
        <h3>انتهت جلسة تسجيل الدخول</h3>
        <p>سجّل الدخول بحساب الأدمن ثم أعد فتح الصفحة.</p>
      </div>`;
  }
})();
