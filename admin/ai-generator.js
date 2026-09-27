import { supabase } from "../supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  const imagesGrid = document.getElementById("imagesGrid");
  const filters = document.querySelectorAll(".filter");
  const modal = document.getElementById("previewModal");
  const modalImage = document.getElementById("modalImage");
  const modalTitle = document.getElementById("modalTitle");
  const modalDate = document.getElementById("modalDate");
  const closeModal = document.getElementById("closeModal");
  const generateBtn = document.getElementById("generateBtn");

  async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const token = data?.session?.access_token;
    if (!token) throw new Error("يجب تسجيل الدخول كأدمن.");
    return token;
  }

  async function apiFetch(url, options = {}) {
    const token = await getAccessToken();
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Content-Type", "application/json");

    return fetch(url, { ...options, headers });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderImages(wallpapers) {
    if (!imagesGrid) return;

    if (!Array.isArray(wallpapers) || wallpapers.length === 0) {
      imagesGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:50px;color:#9298a8">
          لا توجد صور مولدة من الذكاء الاصطناعي حاليًا.
        </div>`;
      return;
    }

    imagesGrid.innerHTML = wallpapers.map(wallpaper => `
      <article
        class="image-card"
        data-status="pending"
        data-id="${escapeHtml(wallpaper.id)}"
      >
        <div class="image-wrapper">
          <img
            src="${escapeHtml(wallpaper.thumbnail || wallpaper.image)}"
            alt="${escapeHtml(wallpaper.title || "AI Wallpaper")}"
            loading="lazy"
          >
          <span class="image-status pending">قسم AI</span>
          <button class="preview-btn" title="عرض الصورة">⛶</button>
        </div>

        <div class="image-content">
          <h3>${escapeHtml(wallpaper.title || "AI Wallpaper")}</h3>

          <div class="image-meta">
            <span>🤖 Gemini</span>
            <span>${escapeHtml(wallpaper.date || "")}</span>
          </div>

          <div class="image-actions">
            <button class="action-btn review-btn">مراجعة</button>
            <button class="action-btn move-btn">نقل للقسم</button>
            <button class="action-btn delete-btn">حذف</button>
          </div>
        </div>
      </article>
    `).join("");
  }

  async function loadGeneratedImages() {
    try {
      const response = await apiFetch("/api/admin/ai/generated?limit=100");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "تعذر تحميل الصور");
      }

      renderImages(data.wallpapers || []);
    } catch (error) {
      console.error("AI LOAD ERROR:", error);
      if (imagesGrid) {
        imagesGrid.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:50px;color:#ef4444">
            ${escapeHtml(error.message || "تعذر تحميل الصور")}
          </div>`;
      }
    }
  }

  async function generateImages() {
    const value = window.prompt(
      "كم صورة تريد توليدها؟ (1 إلى 20)",
      "1"
    );

    if (value === null) return;

    const count = Math.min(
      Math.max(Number.parseInt(value, 10) || 1, 1),
      20
    );

    const originalText = generateBtn?.innerHTML || "✨ توليد الصور";

    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.innerHTML = `⏳ جاري توليد ${count} صورة...`;
    }

    try {
      const response = await apiFetch("/api/admin/ai/generate", {
        method: "POST",
        body: JSON.stringify({
          count,
          aspectRatio: "9:16",
          imageSize: "1K"
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || `فشل التوليد (${response.status})`);
      }

      await loadGeneratedImages();

      alert(
        `تم توليد ${data.generated} من أصل ${data.requested} صورة وإضافتها إلى Supabase.`
      );
    } catch (error) {
      console.error("AI GENERATION ERROR:", error);
      alert(error.message || "حدث خطأ أثناء توليد الصور.");
    } finally {
      if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalText;
      }
    }
  }

  function openPreview(card) {
    const image = card.querySelector("img");
    const title = card.querySelector("h3");
    const date = card.querySelector(".image-meta span:last-child");

    if (!image || !modal) return;

    modalImage.src = image.src;
    modalTitle.textContent = title?.textContent || "AI Wallpaper";
    modalDate.textContent = date?.textContent || "";
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function closePreview() {
    modal?.classList.remove("show");
    document.body.style.overflow = "";
    if (modalImage) modalImage.src = "";
  }

  async function moveWallpaper(card) {
    const id = card.dataset.id;

    const destination = window.prompt(
      "اكتب القسم الذي تريد نقل الصورة إليه:\nمثال: nature / cars / anime / space / games / ai",
      "ai"
    );

    if (!destination) return;

    const category = destination.trim().toLowerCase();

    try {
      const response = await apiFetch(
        `/api/admin/wallpapers/${encodeURIComponent(id)}/category`,
        {
          method: "PATCH",
          body: JSON.stringify({ category })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "تعذر نقل الصورة");
      }

      await loadGeneratedImages();
      alert(`تم نقل الصورة إلى قسم: ${category}`);
    } catch (error) {
      console.error("MOVE AI WALLPAPER ERROR:", error);
      alert(error.message || "تعذر نقل الصورة.");
    }
  }

  async function deleteWallpaper(card) {
    const id = card.dataset.id;

    if (!window.confirm("هل تريد حذف هذه الخلفية نهائيًا؟")) return;

    try {
      const response = await apiFetch(
        `/api/wallpapers/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "تعذر حذف الصورة");
      }

      card.remove();
    } catch (error) {
      console.error("DELETE AI WALLPAPER ERROR:", error);
      alert(error.message || "تعذر حذف الصورة.");
    }
  }

  filters.forEach(filter => {
    filter.addEventListener("click", () => {
      filters.forEach(btn => btn.classList.remove("active"));
      filter.classList.add("active");

      const selected = filter.dataset.filter;

      imagesGrid.querySelectorAll(".image-card").forEach(card => {
        card.style.display =
          selected === "all" || card.dataset.status === selected
            ? ""
            : "none";
      });
    });
  });

  imagesGrid?.addEventListener("click", event => {
    const card = event.target.closest(".image-card");
    if (!card) return;

    if (
      event.target.closest(".preview-btn") ||
      event.target.closest(".review-btn")
    ) {
      openPreview(card);
      return;
    }

    if (event.target.closest(".move-btn")) {
      moveWallpaper(card);
      return;
    }

    if (event.target.closest(".delete-btn")) {
      deleteWallpaper(card);
    }
  });

  closeModal?.addEventListener("click", closePreview);
  document.querySelector(".modal-overlay")?.addEventListener(
    "click",
    closePreview
  );

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closePreview();
  });

  generateBtn?.addEventListener("click", generateImages);

  loadGeneratedImages();
});
