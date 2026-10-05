import "./admin-auth.js";

// =================================
// WallpaperHub Admin Notice Creator
// Modern dashboard + live preview
// =================================

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("create-ad-form");
    const adsContainer = document.getElementById("ads-container");
    const adsEmpty = document.getElementById("ads-empty");
    const statTotal = document.getElementById("stat-total");
    const statViews = document.getElementById("stat-views");
    const statInteractions = document.getElementById("stat-interactions");
    const statActive = document.getElementById("stat-active");

    const fileInput = document.getElementById("ad-file");
    const fileNamePreview = document.getElementById("file-preview-name");
    const uploadZone = document.getElementById("upload-zone");

    const titleInput = document.getElementById("ad-title");
    const categoryInput = document.getElementById("ad-category");
    const imageInput = document.getElementById("ad-image");
    const contentInput = document.getElementById("ad-content");
    const linkInput = document.getElementById("ad-link");
    const pinnedInput = document.getElementById("ad-pinned");
    const draftInput = document.getElementById("ad-draft");
    const scheduledInput = document.getElementById("ad-scheduled");
    const startInput = document.getElementById("ad-start");
    const endInput = document.getElementById("ad-end");

    const previewImage = document.getElementById("preview-image");
    const previewPlaceholder = document.getElementById("preview-image-placeholder");
    const previewCategory = document.getElementById("preview-category");
    const previewTitle = document.getElementById("preview-title");
    const previewContent = document.getElementById("preview-content-text");
    const previewLink = document.getElementById("preview-link");

    const titleCount = document.getElementById("title-count");
    const contentCount = document.getElementById("content-count");
    const editorState = document.getElementById("editor-state");
    const publishBtn = document.getElementById("publish-btn");
    const saveDraftBtn = document.getElementById("save-draft-btn");
    const searchInput = document.getElementById("ads-search");
    const filterInput = document.getElementById("ads-filter");

    let uploadedImageBase64 = "";
    let editingAnnouncementId = null;
    let announcements = [];

    const categoryLabels = {
        admin: "📢 إعلان عام",
        update: "🚀 تحديث جديد",
        event: "🎉 فعالية",
        warning: "⚠️ تنبيه مهم",
        maintenance: "🛠️ صيانة"
    };

    function escapeHTML(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function imageSourceFromAd(ad) {
        return ad?.image || "https://picsum.photos/600/300";
    }

    function updateCounters() {
        const total = announcements.length;
        const views = announcements.reduce((sum, ad) => sum + Number(ad.views || ad.view_count || 0), 0);
        const interactions = announcements.reduce(
            (sum, ad) => sum + Number(ad.interactions || ad.likes || ad.like_count || 0),
            0
        );
        const active = announcements.filter(ad => ad.active !== false && ad.status !== "hidden").length;

        if (statTotal) statTotal.textContent = total;
        if (statViews) statViews.textContent = views >= 1000 ? `${(views / 1000).toFixed(1).replace(".0", "")}K` : views;
        if (statInteractions) statInteractions.textContent = interactions >= 1000 ? `${(interactions / 1000).toFixed(1).replace(".0", "")}K` : interactions;
        if (statActive) statActive.textContent = active;
    }

    function updateCounts() {
        if (titleCount) titleCount.textContent = `${titleInput.value.length}/90`;
        if (contentCount) contentCount.textContent = `${contentInput.value.length}/500`;
    }

    function updatePreview() {
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        const category = categoryInput.value;
        const urlImage = imageInput.value.trim();
        const source = uploadedImageBase64 || urlImage;

        previewTitle.textContent = title || "عنوان الإعلان سيظهر هنا";
        previewContent.textContent = content || "اكتب محتوى الإعلان لترى المعاينة مباشرة.";
        previewCategory.textContent = categoryLabels[category] || "📢 إعلان عام";

        if (source) {
            previewImage.src = source;
            previewImage.style.display = "block";
            previewPlaceholder.style.display = "none";
        } else {
            previewImage.removeAttribute("src");
            previewImage.style.display = "none";
            previewPlaceholder.style.display = "flex";
        }

        const validLink = /^https?:\/\//i.test(linkInput.value.trim());
        if (validLink) {
            previewLink.hidden = false;
            previewLink.href = linkInput.value.trim();
        } else {
            previewLink.hidden = true;
            previewLink.removeAttribute("href");
        }

        editorState.textContent = editingAnnouncementId ? "تعديل إعلان" : (draftInput.checked ? "مسودة" : "جديد");
        updateCounts();
    }

    function setScheduleState() {
        const enabled = scheduledInput.checked;
        startInput.disabled = !enabled;
        endInput.disabled = !enabled;
    }

    function resetEditor() {
        editingAnnouncementId = null;
        form.reset();
        draftInput.checked = false;
        uploadedImageBase64 = "";
        fileNamePreview.textContent = "";
        editorState.textContent = "جديد";
        publishBtn.innerHTML = '<span class="material-icons">rocket_launch</span> نشر الإعلان';
        setScheduleState();
        updatePreview();
    }

    function saveLocalDraft() {
        const draft = {
            title: titleInput.value,
            category: categoryInput.value,
            image: imageInput.value,
            content: contentInput.value,
            link: linkInput.value,
            pinned: pinnedInput.checked,
            scheduled: scheduledInput.checked,
            start: startInput.value,
            end: endInput.value,
            imageBase64: uploadedImageBase64
        };

        localStorage.setItem("wallpaperhub_notice_draft", JSON.stringify(draft));
        draftInput.checked = true;
        updatePreview();
        alert("تم حفظ المسودة على هذا الجهاز.");
    }

    function loadLocalDraft() {
        try {
            const raw = localStorage.getItem("wallpaperhub_notice_draft");
            if (!raw) return;
            const draft = JSON.parse(raw);
            if (!draft || typeof draft !== "object") return;

            titleInput.value = draft.title || "";
            categoryInput.value = draft.category || "admin";
            imageInput.value = draft.image || "";
            contentInput.value = draft.content || "";
            linkInput.value = draft.link || "";
            pinnedInput.checked = Boolean(draft.pinned);
            scheduledInput.checked = Boolean(draft.scheduled);
            startInput.value = draft.start || "";
            endInput.value = draft.end || "";
            uploadedImageBase64 = draft.imageBase64 || "";
            // استرجاع المسودة يملأ الحقول فقط؛ لا يمنع زر النشر.
            draftInput.checked = false;

            if (uploadedImageBase64) {
                fileNamePreview.textContent = "تم استرجاع صورة المسودة";
            }
            setScheduleState();
            updatePreview();
        } catch (error) {
            console.warn("LOAD LOCAL DRAFT ERROR:", error);
        }
    }

    async function loadAds() {
        try {
            const headers = window.adminAuth ? await window.adminAuth.getHeaders() : {};
            const res = await fetch("/api/admin/announcements", { headers });
            if (!res.ok) throw new Error("LOAD ADS HTTP ERROR");
            const data = await res.json();
            announcements = Array.isArray(data) ? data : [];
            renderAds();
            updateCounters();
        } catch (error) {
            console.error("LOAD ADS ERROR:", error);
            announcements = [];
            renderAds();
            updateCounters();
        }
    }

    function renderAds() {
        if (!adsContainer) return;

        const query = (searchInput?.value || "").trim().toLowerCase();
        const filter = filterInput?.value || "all";

        const filtered = announcements.filter(ad => {
            const haystack = `${ad.title || ""} ${ad.content || ""} ${ad.type || ad.category || ""}`.toLowerCase();
            if (query && !haystack.includes(query)) return false;

            if (filter === "active") {
                return ad.active !== false && ad.status !== "hidden";
            }
            if (filter === "hidden") {
                return ad.active === false || ad.status === "hidden";
            }
            return true;
        });

        adsContainer.innerHTML = "";

        if (!filtered.length) {
            adsEmpty.hidden = false;
            return;
        }

        adsEmpty.hidden = true;
        filtered.forEach(ad => createAdCard(ad));
    }

    function createAdCard(ad) {
        const adItem = document.createElement("article");
        adItem.className = "ad-item";

        const type = ad.type || ad.category || "admin";
        const active = ad.active !== false && ad.status !== "hidden";

        adItem.innerHTML = `
            <img src="${escapeHTML(imageSourceFromAd(ad))}" class="ad-thumb" alt="">
            <div class="ad-details">
                <div class="ad-title-row">
                    <h4>${escapeHTML(ad.title || "بدون عنوان")}</h4>
                    <span class="ad-type">${escapeHTML(categoryLabels[type] || type)}</span>
                    <span class="ad-status">${active ? "نشط" : "مخفي"}</span>
                </div>
                <p>${escapeHTML(ad.content || "")}</p>
                <div class="ad-meta">
                    <span class="ad-date">${escapeHTML(ad.date || ad.created_at || "الآن")}</span>
                    <span class="ad-date">👁 ${Number(ad.views || ad.view_count || 0)}</span>
                    <span class="ad-date">❤️ ${Number(ad.interactions || ad.likes || ad.like_count || 0)}</span>
                </div>
            </div>
            <div class="ad-actions">
                <button class="action-btn edit" type="button" aria-label="تعديل الإعلان" title="تعديل">✏️</button>
                <button class="action-btn delete" type="button" aria-label="حذف الإعلان" title="حذف">🗑️</button>
            </div>
        `;

        adItem.querySelector(".edit").onclick = () => editAdvertisement(ad);
        adItem.querySelector(".delete").onclick = () => deleteAdvertisement(ad.id);

        adsContainer.appendChild(adItem);

        const thumb = adItem.querySelector(".ad-thumb");
        thumb.addEventListener("error", () => {
            thumb.src = "https://picsum.photos/600/300";
        }, { once: true });
    }

    function deleteAdvertisement(id) {
        if (!confirm("هل تريد حذف الإعلان؟")) return;

        fetch(`/api/admin/announcements/${id}`, { method: "DELETE", headers: window.adminAuth ? await window.adminAuth.getHeaders() : {} })
            .then(res => res.json())
            .then(data => {
                if (!data.success) throw new Error("DELETE FAILED");
                announcements = announcements.filter(ad => String(ad.id) !== String(id));
                renderAds();
                updateCounters();
            })
            .catch(error => {
                console.error("DELETE ERROR:", error);
                alert("فشل حذف الإعلان");
            });
    }

    function editAdvertisement(ad) {
        titleInput.value = ad.title || "";
        categoryInput.value = ad.type || ad.category || "admin";
        contentInput.value = ad.content || "";
        imageInput.value = ad.image || "";
        linkInput.value = ad.link || "";
        pinnedInput.checked = Boolean(ad.pinned);
        draftInput.checked = false;
        scheduledInput.checked = false;
        uploadedImageBase64 = "";

        editingAnnouncementId = ad.id;
        editorState.textContent = "تعديل إعلان";
        publishBtn.innerHTML = '<span class="material-icons">save</span> حفظ التعديل';

        setScheduleState();
        updatePreview();
        document.querySelector(".editor-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (fileInput) {
        fileInput.addEventListener("change", event => {
            const file = event.target.files?.[0];

            if (!file) {
                uploadedImageBase64 = "";
                fileNamePreview.textContent = "";
                updatePreview();
                return;
            }

            if (!file.type.startsWith("image/")) {
                alert("يرجى اختيار ملف صورة.");
                fileInput.value = "";
                return;
            }

            fileNamePreview.textContent = `تم اختيار: ${file.name}`;

            const reader = new FileReader();
            reader.onload = event => {
                uploadedImageBase64 = event.target.result;
                updatePreview();
            };
            reader.readAsDataURL(file);
        });
    }

    if (uploadZone) {
        ["dragenter", "dragover"].forEach(type => {
            uploadZone.addEventListener(type, event => {
                event.preventDefault();
                uploadZone.classList.add("dragging");
            });
        });

        ["dragleave", "drop"].forEach(type => {
            uploadZone.addEventListener(type, event => {
                event.preventDefault();
                uploadZone.classList.remove("dragging");
            });
        });

        uploadZone.addEventListener("drop", event => {
            const file = event.dataTransfer.files?.[0];
            if (!file || !file.type.startsWith("image/")) return;

            const transfer = new DataTransfer();
            transfer.items.add(file);
            fileInput.files = transfer.files;
            fileInput.dispatchEvent(new Event("change", { bubbles: true }));
        });
    }

    [titleInput, categoryInput, imageInput, contentInput, linkInput, draftInput].forEach(element => {
        element?.addEventListener("input", updatePreview);
        element?.addEventListener("change", updatePreview);
    });

    scheduledInput?.addEventListener("change", () => {
        setScheduleState();
    });

    searchInput?.addEventListener("input", renderAds);
    filterInput?.addEventListener("change", renderAds);

    saveDraftBtn?.addEventListener("click", saveLocalDraft);

    form?.addEventListener("submit", async event => {
        event.preventDefault();

        const title = titleInput.value.trim();
        const category = categoryInput.value;
        const content = contentInput.value.trim();
        const urlImage = imageInput.value.trim();
        const image = uploadedImageBase64 || urlImage || "https://picsum.photos/600/300";

        if (!title || !content) {
            alert("أدخل عنوان الإعلان ومحتواه أولًا.");
            return;
        }

        // النشر الفعلي لا يعتمد على مفتاح المسودة.
        // مفتاح "مسودة" مخصص للحفظ المحلي فقط عبر زر "حفظ مسودة".
        const url = editingAnnouncementId
            ? `/api/admin/notifications/${editingAnnouncementId}`
            : "/api/admin/announcements";

        const method = editingAnnouncementId ? "PUT" : "POST";

        const body = {
            title,
            category,
            content,
            image
        };

        // السيرفر الحالي يدعم هذه الحقول الأساسية فقط.
        // الرابط يبقى للمعاينة في الواجهة إلى أن نضيف له عمودًا/دعمًا في السيرفر.
        fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                ...(window.adminAuth ? await window.adminAuth.getHeaders() : {})
            },
            body: JSON.stringify(body)
        })
            .then(async res => {
                const raw = await res.text();
                let data = null;

                try {
                    data = raw ? JSON.parse(raw) : null;
                } catch {
                    data = null;
                }

                if (!res.ok) {
                    throw new Error(
                        data?.error ||
                        data?.message ||
                        `HTTP ${res.status}`
                    );
                }

                if (!data?.success) {
                    throw new Error(
                        data?.error ||
                        data?.message ||
                        "SAVE FAILED"
                    );
                }

                return data;
            })
            .then(() => {
                alert(editingAnnouncementId ? "تم تعديل الإعلان" : "تم نشر الإعلان");

                localStorage.removeItem("wallpaperhub_notice_draft");
                resetEditor();
                loadAds();
            })
            .catch(error => {
                console.error("SAVE ANNOUNCEMENT ERROR:", error);
                alert(`تعذر حفظ الإعلان: ${error.message || "خطأ غير معروف"}`);
            });
    });

    loadLocalDraft();
    loadAds();
    updatePreview();
});
