(() => {
  "use strict";

  const state = {
    contributors: [],
    submissions: [],
    selectedUser: "",
    rejectIds: [],
    busy: false
  };

  const $ = id => document.getElementById(id);

  function getAccessToken() {
    // قراءة جلسة Supabase المحفوظة في المتصفح دون استخدام Service Role.
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.includes("auth-token")) continue;

      try {
        const value = JSON.parse(localStorage.getItem(key) || "{}");
        if (value.access_token) return value.access_token;
      } catch (_) {}
    }

    return "";
  }

  async function api(url, options = {}) {
    const token = getAccessToken();
    if (!token) {
      throw new Error("انتهت الجلسة أو لم يتم تسجيل الدخول. سجّل الدخول ثم افتح الصفحة مجددًا.");
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        ...(options.headers || {})
      },
      cache: "no-store"
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      throw new Error(data.message || "حدث خطأ أثناء الاتصال بالسيرفر");
    }

    return data;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function toast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 3000);
  }

  function dateText(value) {
    if (!value) return "غير محدد";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "غير محدد";
    return date.toLocaleString("ar-MA");
  }

  function filteredSubmissions() {
    const query = $("submissionSearch").value.trim().toLowerCase();
    const category = $("categoryFilter").value;
    const period = $("dateFilter").value;
    const now = Date.now();

    return state.submissions.filter(item => {
      if (state.selectedUser && String(item.user_id) !== state.selectedUser) {
        return false;
      }

      if (category && String(item.category || "") !== category) return false;

      const searchable = [
        item.title, item.description, item.category,
        ...(Array.isArray(item.tags) ? item.tags : [])
      ].join(" ").toLowerCase();

      if (query && !searchable.includes(query)) return false;

      if (period !== "all") {
        const created = new Date(item.created_at).getTime();
        const days = period === "today" ? 1 : period === "week" ? 7 : 30;
        if (!created || now - created > days * 86400000) return false;
      }

      return true;
    });
  }

  function renderContributors() {
    const query = $("userSearch").value.trim().toLowerCase();

    const contributors = state.contributors.filter(user =>
      `${user.name} ${user.username}`.toLowerCase().includes(query)
    );

    $("pendingTotal").textContent = state.submissions.length;

    $("contributors").innerHTML = contributors.length
      ? contributors.map(user => `
        <button class="contributor ${state.selectedUser === user.id ? "active" : ""}"
          data-user="${escapeHtml(user.id)}">
          ${user.avatar_url
            ? `<img class="avatar" src="${escapeHtml(user.avatar_url)}" alt="" loading="lazy">`
            : `<span class="avatar" aria-hidden="true">👤</span>`}
          <span class="contributor-info">
            <strong class="contributor-name">${escapeHtml(user.name)}</strong>
            <span class="contributor-sub">${user.pending_count} طلب معلق</span>
          </span>
        </button>
      `).join("")
      : `<div class="empty-state">لا يوجد مساهمون مطابقون.</div>`;
  }

  function renderSubmissions() {
    const items = filteredSubmissions();

    $("submissionHeading").textContent =
      state.selectedUser ? "طلبات المساهم" : "كل الطلبات المعلقة";

    const user = state.contributors.find(item => item.id === state.selectedUser);
    $("selectedContributor").textContent = user
      ? user.name
      : "اختر مساهمًا من القائمة أو اعرض كل الطلبات";

    $("selectAll").checked = false;

    if (!items.length) {
      $("submissions").innerHTML =
        `<div class="empty-state">لا توجد طلبات مطابقة للفلاتر الحالية.</div>`;
      return;
    }

    $("submissions").innerHTML = items.map(item => {
      const tags = Array.isArray(item.tags) ? item.tags : [];
      const image = item.thumbnail_url || item.image_url;

      return `
        <article class="submission" data-id="${escapeHtml(item.id)}">
          <input type="checkbox" class="submission-check"
            value="${escapeHtml(item.id)}" aria-label="تحديد الخلفية">

          <a href="${escapeHtml(item.image_url)}" target="_blank" rel="noopener noreferrer">
            <img class="wallpaper-preview"
              src="${escapeHtml(image)}"
              alt="${escapeHtml(item.title)}"
              loading="lazy">
          </a>

          <div class="submission-content">
            <h3 class="submission-title">${escapeHtml(item.title)}</h3>
            <div class="meta">
              التصنيف: ${escapeHtml(item.category || "other")}<br>
              الدقة: ${escapeHtml(item.resolution || "غير محددة")}<br>
              الحجم: ${escapeHtml(item.file_size || "غير محدد")}<br>
              تاريخ الإرسال: ${escapeHtml(dateText(item.created_at))}
            </div>

            ${item.description
              ? `<p class="description">${escapeHtml(item.description)}</p>`
              : ""}

            <div class="tags">
              ${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
            </div>

            ${Array.isArray(item.colors) && item.colors.length
              ? `<div class="tags">
                  ${item.colors.map(color =>
                    `<span class="tag">${escapeHtml(color)}</span>`
                  ).join("")}
                </div>`
              : ""}

            <div class="card-actions">
              <button class="button success" data-action="approve"
                data-id="${escapeHtml(item.id)}">قبول</button>
              <button class="button danger" data-action="reject"
                data-id="${escapeHtml(item.id)}">رفض</button>
              <a class="text-link" href="${escapeHtml(item.image_url)}"
                target="_blank" rel="noopener noreferrer">فتح الصورة الأصلية</a>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  function selectedIds() {
    return [...document.querySelectorAll(".submission-check:checked")]
      .map(input => input.value);
  }

  async function review(id, action, reviewNote = "") {
    return api(`/api/admin/review/${encodeURIComponent(id)}`, {
      method: "POST",
      body: JSON.stringify({
        action,
        review_note: reviewNote
      })
    });
  }

  async function reload() {
    if (state.busy) return;

    state.busy = true;
    $("refreshBtn").disabled = true;

    try {
      const data = await api("/api/admin/review/submissions");

      state.contributors = data.contributors || [];
      state.submissions = data.submissions || [];

      if (state.selectedUser &&
          !state.contributors.some(user => user.id === state.selectedUser)) {
        state.selectedUser = "";
      }

      renderContributors();
      renderSubmissions();
    } catch (error) {
      toast(error.message);
      if (error.message.includes("صلاحية")) {
        $("contributors").innerHTML =
          `<div class="empty-state">هذه الصفحة مخصصة للأدمن وصاحب الموقع.</div>`;
      }
    } finally {
      state.busy = false;
      $("refreshBtn").disabled = false;
    }
  }

  async function performBulk(action, ids, note = "") {
    if (!ids.length) {
      toast("حدد خلفية واحدة على الأقل.");
      return;
    }

    if (action === "approve" &&
        !confirm(`هل تريد قبول ${ids.length} خلفية؟`)) return;

    if (action === "reject" &&
        !confirm(`هل تريد رفض ${ids.length} خلفية؟`)) return;

    let successCount = 0;
    const errors = [];

    for (const id of ids) {
      try {
        await review(id, action, note);
        successCount++;
      } catch (error) {
        errors.push(`${id}: ${error.message}`);
      }
    }

    toast(`تمت معالجة ${successCount} من ${ids.length}.` +
      (errors.length ? ` تعذر معالجة ${errors.length}.` : ""));

    if (errors.length) console.warn("Review errors:", errors);

    await reload();
  }

  $("contributors").addEventListener("click", event => {
    const button = event.target.closest("[data-user]");
    if (!button) return;

    state.selectedUser = button.dataset.user;
    renderContributors();
    renderSubmissions();
  });

  $("userSearch").addEventListener("input", renderContributors);

  ["submissionSearch", "categoryFilter", "dateFilter"].forEach(id => {
    $(id).addEventListener("input", renderSubmissions);
    $(id).addEventListener("change", renderSubmissions);
  });

  $("submissions").addEventListener("click", async event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    if (action === "approve") {
      if (!confirm("هل تريد قبول هذه الخلفية ونشرها؟")) return;

      button.disabled = true;

      try {
        const result = await review(id, "approve");
        toast(result.message || "تم قبول الخلفية.");
        await reload();
      } catch (error) {
        toast(error.message);
        button.disabled = false;
      }
    }

    if (action === "reject") {
      state.rejectIds = [id];
      $("rejectReason").value = "";
      $("rejectDialog").showModal();
    }
  });

  $("selectAll").addEventListener("change", event => {
    document.querySelectorAll(".submission-check").forEach(input => {
      input.checked = event.target.checked;
    });
  });

  $("approveSelected").addEventListener("click", () => {
    performBulk("approve", selectedIds());
  });

  $("rejectSelected").addEventListener("click", () => {
    state.rejectIds = selectedIds();

    if (!state.rejectIds.length) {
      toast("حدد الخلفيات التي تريد رفضها.");
      return;
    }

    $("rejectReason").value = "";
    $("rejectDialog").showModal();
  });

  $("cancelReject").addEventListener("click", () => {
    $("rejectDialog").close();
  });

  $("rejectForm").addEventListener("submit", async event => {
    event.preventDefault();

    const note = $("rejectReason").value.trim();
    if (!note) {
      toast("اكتب سبب الرفض.");
      return;
    }

    const ids = [...state.rejectIds];
    $("rejectDialog").close();
    await performBulk("reject", ids, note);
  });

  $("refreshBtn").addEventListener("click", reload);

  // يبدأ بعرض كل الطلبات عند عدم اختيار مساهم.
  state.selectedUser = "";
  reload();
})();