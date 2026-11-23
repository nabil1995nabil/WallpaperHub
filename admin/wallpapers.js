import { supabase } from "../supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
  const $ = id => document.getElementById(id);
  const PAGE_SIZE = 24;
  const API = "/api/wallpapers";
  const CATEGORIES = [
    ["nature","الطبيعة"],["amoled","AMOLED"],["games","الألعاب"],["cars","السيارات"],
    ["animals","الحيوانات"],["anime","الأنمي"],["space","الفضاء"],["ai","الذكاء الاصطناعي"],
    ["city","المدن"],["dark","داكن"],["4k","4K"],["sports","الرياضة"],["minimal","Minimal"],
    ["rain","المطر"],["sunset","الغروب"],["architecture","العمارة"],["deep-space","الفضاء العميق"],
    ["wallhaven","Wallhaven"],["unsplash","Unsplash"],["religious","الخلفيات الدينية"],["snow","الثلج والشتاء"],
    ["aurora","الشفق القطبي"],["cyberpunk","سايبربانك"],["gradients","التدرجات"],["other","أخرى"]
  ];
  const CATEGORY_MAP = Object.fromEntries(CATEGORIES);
  const state = { search:"", category:"all", type:"all", sort:"newest" };
  let session = null;
  let wallpapers = [];
  let filtered = [];
  let selected = new Set();
  let pageOffset = 0;
  let hasMore = true;
  let loadingMore = false;
  let movingIds = [];
  let moveMode = "single";

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
    }[ch]));
  }

  function category(value) {
    const key = String(value || "other").trim().toLowerCase();
    return { key, label:CATEGORY_MAP[key] || key || "أخرى" };
  }

  function validMediaUrl(value) {
    const url = String(value || "").trim();
    return /^https?:\/\//i.test(url) ? url : "";
  }

  function toast(text, error = false) {
    const box = $("libraryToast");
    box.textContent = text || "";
    box.classList.toggle("error", Boolean(error));
  }

  async function requireAdmin() {
    const result = await supabase.auth.getSession();
    if (result.error || !result.data?.session) throw new Error("AUTH_REQUIRED");
    const current = result.data.session;
    const response = await fetch("/api/admin/me", {
      headers: { Authorization:"Bearer " + current.access_token },
      cache:"no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.isAdmin) throw new Error("ADMIN_FORBIDDEN");
    session = current;
  }

  async function adminHeaders() {
    if (!session?.access_token) throw new Error("انتهت جلسة الإدارة.");
    return {
      "Content-Type":"application/json",
      Authorization:"Bearer " + session.access_token
    };
  }

  async function fetchLibraryPage(offset) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    try {
      const response = await fetch(API + "?limit=" + PAGE_SIZE + "&offset=" + offset, {
        cache:"no-store",
        signal:controller.signal
      });
      if (!response.ok) throw new Error("تعذر تحميل المكتبة (" + response.status + ")");
      const data = await response.json();
      return {
        rows:Array.isArray(data) ? data : [],
        hasMore:response.headers.get("X-Has-More") === "1",
        nextOffset:Number(response.headers.get("X-Next-Offset") || (offset + (Array.isArray(data) ? data.length : 0)))
      };
    } finally {
      clearTimeout(timer);
    }
  }

  function fillCategoryOptions() {
    const options = CATEGORIES.map(([value,label]) => '<option value="' + esc(value) + '">' + esc(label) + '</option>').join("");
    $("bulkCategory").innerHTML = '<option value="">نقل إلى قسم…</option>' + options;
    $("singleCategory").innerHTML = '<option value="">اختر القسم الجديد</option>' + options;
    $("categoryFilter").innerHTML = '<option value="all">كل الأقسام</option>' + options;
  }

  function visibleRows() {
    const query = state.search.trim().toLowerCase();
    let rows = wallpapers.filter(wall => {
      const cat = category(wall.category).key;
      const type = String(wall.type || (wall.animated ? "video" : "image")).toLowerCase();
      const haystack = [wall.id, wall.title, wall.category, ...(Array.isArray(wall.tags) ? wall.tags : [])].join(" ").toLowerCase();
      return (!query || haystack.includes(query)) &&
        (state.category === "all" || cat === state.category) &&
        (state.type === "all" || type === state.type || (state.type === "video" && wall.animated === true));
    });
    rows.sort((a,b) => {
      if (state.sort === "title") return String(a.title || "").localeCompare(String(b.title || ""), "ar");
      if (state.sort === "downloads") return Number(b.downloads || 0) - Number(a.downloads || 0);
      if (state.sort === "likes") return Number(b.likes || 0) - Number(a.likes || 0);
      if (state.sort === "views") return Number(b.views || 0) - Number(a.views || 0);
      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      return state.sort === "oldest" ? idA - idB : idB - idA;
    });
    return rows;
  }

  function renderQuickCategories() {
    const counts = new Map();
    wallpapers.forEach(wall => {
      const key = category(wall.category).key;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const row = $("quickCategoryRow");
    const categories = [["all","الكل"], ...CATEGORIES.filter(([key]) => counts.has(key))];
    row.innerHTML = categories.map(([key,label]) => {
      const count = key === "all" ? wallpapers.length : (counts.get(key) || 0);
      return '<button type="button" data-category="' + esc(key) + '" class="' + (state.category === key ? "active" : "") + '">' + esc(label) + ' <b>' + count.toLocaleString("ar") + '</b></button>';
    }).join("");
  }

  function renderStats() {
    $("statTotal").textContent = wallpapers.length.toLocaleString("ar");
    $("statCategoryCount").textContent = new Set(wallpapers.map(w => category(w.category).key)).size.toLocaleString("ar");
    $("statSelected").textContent = selected.size.toLocaleString("ar");
    $("libraryProgress").textContent = hasMore ? "…" : "100%";
    $("resultCount").textContent = filtered.length.toLocaleString("ar") + " نتيجة";
    $("bulkCount").textContent = selected.size.toLocaleString("ar");
    $("bulkBar").hidden = selected.size === 0;
    $("bulkMoveBtn").disabled = selected.size === 0 || !$("bulkCategory").value;
  }

  function render() {
    filtered = visibleRows();
    const grid = $("wallpaperGrid");
    grid.replaceChildren();
    $("emptyState").hidden = filtered.length > 0;
    if (filtered.length) {
      const fragment = document.createDocumentFragment();
      filtered.forEach(wall => fragment.appendChild(makeCard(wall)));
      grid.appendChild(fragment);
    }
    renderQuickCategories();
    renderStats();
    $("loadMoreBtn").hidden = !hasMore;
    $("loadMoreState").textContent = hasMore ? ("تم تحميل " + wallpapers.length.toLocaleString("ar") + " خلفية، ويمكن جلب المزيد.") : "تم الوصول إلى نهاية المكتبة.";
    $("libraryHint").textContent = "تُحمّل المكتبة على دفعات من " + PAGE_SIZE + " خلفية.";
  }

  function makeCard(wall) {
    const id = String(wall.id);
    const type = String(wall.type || (wall.animated ? "video" : "image")).toLowerCase();
    const isVideo = type === "video" || wall.animated === true;
    const url = validMediaUrl(wall.thumbnail || wall.image);
    const selectedClass = selected.has(id) ? " is-selected" : "";
    const media = url
      ? (isVideo
        ? '<video src="' + esc(url) + '" muted loop playsinline preload="metadata"></video>'
        : '<img src="' + esc(url) + '" alt="' + esc(wall.title || "خلفية") + '" loading="lazy" decoding="async">')
      : '<div class="wall-media-placeholder">WH</div>';
    const card = document.createElement("article");
    card.className = "wall-card" + selectedClass;
    card.innerHTML =
      '<div class="wall-media">' + media +
      '<label class="wall-select-wrap" title="تحديد الخلفية"><input type="checkbox" class="wall-select" data-id="' + esc(id) + '" ' + (selected.has(id) ? "checked" : "") + '></label>' +
      '<span class="media-badge">' + (type === "gif" ? "GIF" : isVideo ? "فيديو" : "صورة") + '</span>' +
      '<span class="wall-id">#' + esc(id) + '</span></div>' +
      '<div class="wall-body"><h3 class="wall-title" title="' + esc(wall.title || "بدون عنوان") + '">' + esc(wall.title || "بدون عنوان") + '</h3>' +
      '<div class="wall-meta"><span class="category-pill">' + esc(category(wall.category).label) + '</span><span class="wall-id-text">#' + esc(id) + '</span></div>' +
      '<div class="wall-metrics"><span>↓ ' + Number(wall.downloads || 0).toLocaleString("ar") + '</span><span>♥ ' + Number(wall.likes || 0).toLocaleString("ar") + '</span><span>◉ ' + Number(wall.views || 0).toLocaleString("ar") + '</span></div>' +
      '<div class="wall-actions"><button type="button" data-action="move" data-id="' + esc(id) + '">تغيير القسم</button><button type="button" class="wall-delete" data-action="delete" data-id="' + esc(id) + '">حذف</button></div></div>';
    return card;
  }

  async function loadFirstPage() {
    const refresh = $("refreshBtn");
    refresh.disabled = true;
    $("syncStatus").textContent = "جارٍ تحديث المكتبة…";
    $("wallpaperGrid").innerHTML = '<div class="loading-state"><span class="loader"></span><b>جارٍ تحميل الخلفيات…</b></div>';
    $("emptyState").hidden = true;
    wallpapers = [];
    selected.clear();
    pageOffset = 0;
    hasMore = true;
    try {
      const page = await fetchLibraryPage(0);
      wallpapers = page.rows;
      pageOffset = page.nextOffset;
      hasMore = page.hasMore;
      $("syncStatus").textContent = "تم الاتصال — " + wallpapers.length.toLocaleString("ar") + " خلفية";
      render();
    } catch (error) {
      console.error("LIBRARY LOAD ERROR:", error);
      $("wallpaperGrid").innerHTML = '<div class="loading-state"><b>' + esc(error.message || "تعذر تحميل المكتبة") + '</b><small>تحقق من الاتصال ثم حاول مرة أخرى.</small></div>';
      toast(error.message || "تعذر تحميل المكتبة", true);
      $("syncStatus").textContent = "تعذر الاتصال";
    } finally {
      refresh.disabled = false;
    }
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    loadingMore = true;
    $("loadMoreBtn").disabled = true;
    $("loadMoreBtn").textContent = "جارٍ تحميل الدفعة التالية…";
    try {
      const page = await fetchLibraryPage(pageOffset);
      const known = new Set(wallpapers.map(w => String(w.id)));
      page.rows.forEach(wall => { if (!known.has(String(wall.id))) wallpapers.push(wall); });
      pageOffset = page.nextOffset;
      hasMore = page.hasMore;
      $("syncStatus").textContent = "تم تحميل " + wallpapers.length.toLocaleString("ar") + " خلفية";
      render();
    } catch (error) {
      console.error("LIBRARY MORE ERROR:", error);
      toast(error.message || "تعذر تحميل المزيد", true);
    } finally {
      loadingMore = false;
      $("loadMoreBtn").disabled = false;
      $("loadMoreBtn").textContent = "تحميل المزيد";
    }
  }

  function openMove(ids, mode) {
    movingIds = ids.map(String);
    moveMode = mode;
    const one = mode === "single";
    const wall = wallpapers.find(item => String(item.id) === movingIds[0]);
    $("moveModalTitle").textContent = one ? "تغيير قسم الخلفية" : "نقل الخلفيات المحددة";
    $("modalDescription").textContent = one
      ? ("الخلفية: " + (wall?.title || ("#" + movingIds[0])) + " — حدد القسم الجديد.")
      : ("سيتم تحديث تصنيف " + movingIds.length.toLocaleString("ar") + " خلفية.");
    $("singleCategory").value = one ? category(wall?.category).key : "";
    $("moveModal").hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    $("moveModal").hidden = true;
    document.body.classList.remove("modal-open");
    movingIds = [];
  }

  async function moveSelected() {
    const target = $("singleCategory").value;
    if (!movingIds.length || !target) {
      toast("اختر التصنيف الجديد أولاً.", true);
      return;
    }
    const ids = movingIds.slice();
    if (moveMode === "bulk" && !window.confirm("نقل " + ids.length + " خلفية إلى قسم " + category(target).label + "؟")) return;
    const button = $("confirmMove");
    button.disabled = true;
    button.textContent = "جارٍ الحفظ…";
    let success = 0;
    let failed = 0;
    try {
      const headers = await adminHeaders();
      for (const id of ids) {
        try {
          const response = await fetch("/api/admin/wallpapers/" + encodeURIComponent(id) + "/category", {
            method:"PATCH",
            headers,
            body:JSON.stringify({ category:target })
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.success) throw new Error(data.message || "فشل تحديث التصنيف");
          const item = wallpapers.find(w => String(w.id) === id);
          if (item) item.category = target;
          selected.delete(id);
          success++;
        } catch (error) {
          console.error("MOVE WALLPAPER ERROR:", id, error);
          failed++;
        }
      }
      closeModal();
      render();
      if (failed) toast("تم نقل " + success + " وفشل " + failed + ". راجع الاتصال أو الصلاحيات.", true);
      else toast("تم نقل " + success + " خلفية إلى " + category(target).label + ".");
    } catch (error) {
      toast(error.message || "تعذر تنفيذ النقل.", true);
    } finally {
      button.disabled = false;
      button.textContent = "حفظ التصنيف";
    }
  }

  async function deleteOne(id, button) {
    const wall = wallpapers.find(item => String(item.id) === String(id));
    if (!window.confirm("حذف الخلفية " + (wall?.title || ("#" + id)) + " نهائياً؟")) return;
    button.disabled = true;
    const previous = button.textContent;
    button.textContent = "جارٍ الحذف…";
    try {
      const response = await fetch(API + "/" + encodeURIComponent(id), {
        method:"DELETE",
        headers:await adminHeaders()
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || "فشل الحذف");
      wallpapers = wallpapers.filter(item => String(item.id) !== String(id));
      selected.delete(String(id));
      render();
      toast("تم حذف الخلفية بنجاح.");
    } catch (error) {
      toast(error.message || "تعذر حذف الخلفية.", true);
      button.disabled = false;
      button.textContent = previous;
    }
  }

  async function deleteSelected() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!window.confirm("سيتم حذف " + ids.length + " خلفية نهائياً. هل تريد المتابعة؟")) return;
    const button = $("bulkDeleteBtn");
    button.disabled = true;
    button.textContent = "جارٍ الحذف…";
    let success = 0;
    let failed = 0;
    try {
      const headers = await adminHeaders();
      for (const id of ids) {
        try {
          const response = await fetch(API + "/" + encodeURIComponent(id), { method:"DELETE", headers });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.success) throw new Error(data.message || "فشل الحذف");
          wallpapers = wallpapers.filter(item => String(item.id) !== id);
          selected.delete(id);
          success++;
        } catch (error) {
          console.error("BULK DELETE ERROR:", id, error);
          failed++;
        }
      }
      render();
      if (failed) toast("تم حذف " + success + " وفشل " + failed + ".", true);
      else toast("تم حذف " + success + " خلفية.");
    } catch (error) {
      toast(error.message || "تعذر تنفيذ الحذف.", true);
    } finally {
      button.disabled = false;
      button.textContent = "حذف المحدد";
    }
  }

  function selectVisible() {
    filtered.forEach(wall => selected.add(String(wall.id)));
    render();
  }

  function clearSelection() {
    selected.clear();
    render();
  }

  function bindEvents() {
    $("wallSearch").addEventListener("input", event => { state.search = event.target.value; render(); });
    $("categoryFilter").addEventListener("change", event => { state.category = event.target.value; render(); });
    $("typeFilter").addEventListener("change", event => { state.type = event.target.value; render(); });
    $("sortFilter").addEventListener("change", event => { state.sort = event.target.value; render(); });
    $("quickCategoryRow").addEventListener("click", event => {
      const button = event.target.closest("[data-category]");
      if (!button) return;
      state.category = button.dataset.category;
      $("categoryFilter").value = state.category;
      render();
    });
    $("wallpaperGrid").addEventListener("change", event => {
      const input = event.target.closest(".wall-select");
      if (!input) return;
      const id = String(input.dataset.id);
      if (input.checked) selected.add(id); else selected.delete(id);
      render();
    });
    $("wallpaperGrid").addEventListener("click", event => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const id = String(button.dataset.id);
      if (button.dataset.action === "move") openMove([id], "single");
      if (button.dataset.action === "delete") deleteOne(id, button);
    });
    $("bulkCategory").addEventListener("change", renderStats);
    $("bulkMoveBtn").addEventListener("click", () => {
      const target = $("bulkCategory").value;
      if (!target) { toast("اختر القسم الجديد أولاً.", true); return; }
      $("singleCategory").value = target;
      openMove(Array.from(selected), "bulk");
      $("singleCategory").value = target;
    });
    $("bulkDeleteBtn").addEventListener("click", deleteSelected);
    $("selectAllBtn").addEventListener("click", selectVisible);
    $("clearSelectionBtn").addEventListener("click", clearSelection);
    $("refreshBtn").addEventListener("click", loadFirstPage);
    $("loadMoreBtn").addEventListener("click", loadMore);
    $("closeModal").addEventListener("click", closeModal);
    $("cancelModal").addEventListener("click", closeModal);
    $("confirmMove").addEventListener("click", moveSelected);
    $("moveModal").addEventListener("click", event => { if (event.target.hasAttribute("data-close-modal")) closeModal(); });
    document.addEventListener("keydown", event => { if (event.key === "Escape" && !$("moveModal").hidden) closeModal(); });
  }

  fillCategoryOptions();
  bindEvents();
  try {
    await requireAdmin();
    await loadFirstPage();
  } catch (error) {
    console.error("WALLPAPER LIBRARY AUTH:", error);
    $("syncStatus").textContent = "تعذر التحقق من الصلاحية";
    $("wallpaperGrid").innerHTML = '<div class="loading-state"><b>' + esc(error.message === "ADMIN_FORBIDDEN" ? "هذا الحساب لا يملك صلاحية الأدمن." : "يجب تسجيل الدخول كأدمن.") + '</b></div>';
  }
});