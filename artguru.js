// =========================================================
// WallpaperHub AI Studio
// Preserves the existing /api/artguru/enhance endpoint.
// =========================================================

const imageInput = document.getElementById("imageInput");
const uploadZone = document.getElementById("uploadZone");
const uploadEmpty = document.getElementById("uploadEmpty");
const sourcePreview = document.getElementById("sourcePreview");
const previewImage = document.getElementById("previewImage");
const fileName = document.getElementById("fileName");

const enhanceBtn = document.getElementById("enhanceBtn");
const btnLabel = enhanceBtn?.querySelector(".btn-label");

const resultSection = document.getElementById("resultSection");
const originalResultImage = document.getElementById("originalResultImage");
const resultImage = document.getElementById("resultImage");
const compareRange = document.getElementById("compareRange");
const afterLayer = document.getElementById("afterLayer");
const compareDivider = document.getElementById("compareDivider");

const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");
const newImageBtn = document.getElementById("newImageBtn");
const browseBtn = document.getElementById("browseBtn");
const changeBtn = document.getElementById("changeBtn");
const toast = document.getElementById("toast");
const statusPill = document.getElementById("statusPill");
const statusText = document.getElementById("statusText");
const imageStats = document.getElementById("imageStats");
const resultResolution = document.getElementById("resultResolution");
const resultStatus = document.getElementById("resultStatus");

let selectedImageBase64 = "";
let selectedFile = null;
let sourceDimensions = { width:0, height:0 };
let resultUrl = "";
let progressTimer = null;
let toastTimer = null;
let apiReady = false;
let isEnhancing = false;
let enhancementController = null;
let enhancementRunId = 0;
let selectionRunId = 0;

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function setProgress(value, text) {
    const safe = Math.max(0, Math.min(100, value));
    enhanceBtn?.style.setProperty("--progress", `${safe}%`);
    if (btnLabel) btnLabel.textContent = text;
}

function resetProgress() {
    enhanceBtn?.style.setProperty("--progress", "0%");
}

function updateEnhanceButton() {
    if (!enhanceBtn) return;
    enhanceBtn.disabled = !selectedImageBase64 || !apiReady || isEnhancing;
}

function cancelEnhancement() {
    enhancementRunId += 1;
    if (enhancementController) {
        enhancementController.abort();
        enhancementController = null;
    }
    isEnhancing = false;
    clearInterval(progressTimer);
    progressTimer = null;
}

function formatFileName(name) {
    if (!name) return "image";
    return name.length > 30 ? `${name.slice(0, 27)}...` : name;
}

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, index);
    return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
}

function isImageFile(file) {
    return file && file.type && file.type.startsWith("image/");
}

// ---------------------------------------------------------
// Image selection
// ---------------------------------------------------------

function loadImage(file) {
    const mimeType = String(file?.type || "").toLowerCase();
    if (!file || !ALLOWED_IMAGE_TYPES.has(mimeType)) {
        showToast("الصيغ المدعومة هي JPG وPNG وWEBP فقط.");
        return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
        showToast("حجم الصورة يتجاوز الحد الأقصى (12MB).");
        return;
    }

    cancelEnhancement();
    const selectionId = ++selectionRunId;

    selectedImageBase64 = "";
    selectedFile = file;
    resultUrl = "";
    sourceDimensions = { width:0, height:0 };

    uploadEmpty?.removeAttribute("hidden");
    sourcePreview?.setAttribute("hidden", "");
    resultSection?.setAttribute("hidden", "");
    resultImage?.removeAttribute("src");
    originalResultImage?.removeAttribute("src");
    if (imageStats) imageStats.textContent = "—";
    if (resultResolution) resultResolution.textContent = "—";
    updateEnhanceButton();

    const reader = new FileReader();

    reader.onload = (event) => {
        if (selectionId !== selectionRunId) return;
        const imageData = typeof event.target?.result === "string" ? event.target.result : "";
        if (!imageData) {
            showToast("تعذر قراءة الصورة.");
            return;
        }

        const tempImage = new Image();
        tempImage.onload = () => {
            if (selectionId !== selectionRunId) return;

            selectedImageBase64 = imageData;
            sourceDimensions = {
                width: tempImage.naturalWidth,
                height: tempImage.naturalHeight
            };

            if (previewImage) previewImage.src = imageData;
            if (originalResultImage) originalResultImage.src = imageData;
            if (fileName) fileName.textContent = formatFileName(file.name);
            if (imageStats) {
                imageStats.textContent =
                    `${tempImage.naturalWidth}×${tempImage.naturalHeight} · ${formatBytes(file.size)}`;
            }

            uploadEmpty?.setAttribute("hidden", "");
            sourcePreview?.removeAttribute("hidden");

            if (compareRange) compareRange.value = "50";
            setComparePosition(50);
            updateEnhanceButton();
            showToast(apiReady
                ? "تم اختيار الصورة. جاهز للتحسين ✦"
                : "تم اختيار الصورة، لكن خدمة التحسين غير متاحة حالياً.");
        };

        tempImage.onerror = () => {
            if (selectionId !== selectionRunId) return;
            selectedImageBase64 = "";
            selectedFile = null;
            updateEnhanceButton();
            showToast("تعذر فتح الصورة. جرّب ملف JPG أو PNG أو WEBP صالحاً.");
        };

        tempImage.src = imageData;
    };

    reader.onerror = () => {
        if (selectionId !== selectionRunId) return;
        selectedImageBase64 = "";
        selectedFile = null;
        updateEnhanceButton();
        showToast("تعذر قراءة الصورة.");
    };

    reader.readAsDataURL(file);
}

imageInput?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) loadImage(file);
    // Allows selecting the same file again after a failed attempt or reset.
    event.target.value = "";
});

// Upload zone opens file picker, except when clicking inner buttons.
uploadZone?.addEventListener("click", (event) => {
    if (
        event.target === browseBtn ||
        event.target === changeBtn ||
        event.target.closest("button")
    ) return;

    imageInput?.click();
});

browseBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    imageInput?.click();
});

changeBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    imageInput?.click();
});

uploadZone?.addEventListener("keydown", (event) => {
    // Only handle keyboard activation on the upload surface itself, not its child buttons.
    if (event.target !== uploadZone) return;
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        imageInput?.click();
    }
});

// Drag & drop
["dragenter", "dragover"].forEach((eventName) => {
    uploadZone?.addEventListener(eventName, (event) => {
        event.preventDefault();
        uploadZone.classList.add("drag-active");
    });
});

["dragleave", "drop"].forEach((eventName) => {
    uploadZone?.addEventListener(eventName, (event) => {
        event.preventDefault();
        uploadZone.classList.remove("drag-active");
    });
});

uploadZone?.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file) loadImage(file);
});

// ---------------------------------------------------------
// API response parsing
// ---------------------------------------------------------

function findImageUrl(data) {
    if (!data) return null;

    if (typeof data === "string") {
        if (data.startsWith("http") || data.startsWith("data:image")) {
            return data;
        }
        return null;
    }

    if (Array.isArray(data)) {
        for (const item of data) {
            const found = findImageUrl(item);
            if (found) return found;
        }
        return null;
    }

    if (typeof data === "object") {
        const priorityKeys = [
            "url",
            "image",
            "image_url",
            "result_url",
            "output",
            "download_url"
        ];

        for (const key of priorityKeys) {
            if (data[key]) {
                const found = findImageUrl(data[key]);
                if (found) return found;
            }
        }

        for (const key in data) {
            const found = findImageUrl(data[key]);
            if (found) return found;
        }
    }

    return null;
}

// ---------------------------------------------------------
// AI enhancement
// ---------------------------------------------------------

enhanceBtn?.addEventListener("click", async () => {
    if (!selectedImageBase64) {
        showToast("اختر صورة أولاً.");
        return;
    }
    if (!apiReady) {
        showToast("خدمة تحسين الصور غير متاحة حالياً.");
        return;
    }
    if (isEnhancing) return;

    const runId = ++enhancementRunId;
    const sourceImage = selectedImageBase64;
    const controller = new AbortController();
    enhancementController = controller;
    isEnhancing = true;
    updateEnhanceButton();

    clearInterval(progressTimer);
    let progress = 0;
    setProgress(0, "جاري تجهيز الصورة...");

    progressTimer = setInterval(() => {
        if (runId !== enhancementRunId) return;
        if (progress < 88) {
            progress += progress < 50 ? 5 : 2;
            setProgress(progress, `جاري التحسين... ${progress}%`);
        }
    }, 300);

    try {
        const response = await fetch("/api/artguru/enhance", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ image: sourceImage }),
            signal: controller.signal
        });

        const result = await response.json().catch(() => ({}));
        if (runId !== enhancementRunId) return;

        if (!response.ok || result.success === false) {
            throw new Error(result.message || "تعذر تحسين الصورة.");
        }

        const imageUrl = findImageUrl(result);
        if (!imageUrl) {
            throw new Error("تمت المعالجة لكن لم يتم العثور على الصورة الناتجة.");
        }

        resultUrl = imageUrl;
        if (resultImage) {
            resultImage.onload = () => {
                if (runId !== enhancementRunId) return;
                if (resultResolution) {
                    resultResolution.textContent =
                        `${resultImage.naturalWidth}×${resultImage.naturalHeight}`;
                }
            };
            resultImage.onerror = () => {
                if (runId !== enhancementRunId) return;
                showToast("اكتمل التحسين، لكن تعذر تحميل الصورة الناتجة.");
            };
            resultImage.src = imageUrl;
        }

        if (originalResultImage) originalResultImage.src = sourceImage;
        if (resultStatus) resultStatus.textContent = "تم التحسين بنجاح";
        resultSection?.removeAttribute("hidden");
        setComparePosition(50);

        progress = 100;
        setProgress(100, "اكتمل التحسين ✓");

        setTimeout(() => {
            if (runId !== enhancementRunId) return;
            resultSection?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }, 250);

        showToast("تم تحسين الصورة بنجاح ✦");
    } catch (error) {
        if (error?.name === "AbortError" || runId !== enhancementRunId) return;
        console.error("Artguru error:", error);
        showToast(error.message || "حدث خطأ أثناء التحسين.");
        setProgress(0, "حاول مرة أخرى");
    } finally {
        if (runId !== enhancementRunId) return;

        clearInterval(progressTimer);
        progressTimer = null;
        enhancementController = null;
        isEnhancing = false;
        updateEnhanceButton();

        setTimeout(() => {
            if (runId !== enhancementRunId) return;
            setProgress(0, apiReady
                ? "ابدأ التحسين بالذكاء الاصطناعي"
                : "الخدمة غير متاحة");
        }, 1000);
    }
});

// ---------------------------------------------------------
// Before / after comparison
// ---------------------------------------------------------

function setComparePosition(value) {
    const position = Math.max(5, Math.min(95, Number(value) || 50));

    if (afterLayer) {
        // Clip the full-size enhanced image; never resize it with the slider.
        afterLayer.style.clipPath = `inset(0 ${100 - position}% 0 0)`;
    }

    if (compareDivider) {
        compareDivider.style.left = `${position}%`;
    }
}

compareRange?.addEventListener("input", (event) => {
    setComparePosition(event.target.value);
});

// ---------------------------------------------------------
// Download
// ---------------------------------------------------------

downloadBtn?.addEventListener("click", async () => {
    if (!resultUrl) {
        showToast("لا توجد صورة محسنة بعد.");
        return;
    }

    try {
        const response = await fetch(resultUrl, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`تعذر تنزيل الصورة (HTTP ${response.status}).`);
        }

        const blob = await response.blob();
        if (!blob.size) throw new Error("الصورة الناتجة فارغة.");

        const extensionByMime = {
            "image/jpeg":"jpg",
            "image/png":"png",
            "image/webp":"webp",
            "image/avif":"avif"
        };
        const extension = extensionByMime[String(blob.type || "").toLowerCase()] || "jpg";
        const objectUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = `wallpaperhub-ai-enhanced.${extension}`;
        document.body.appendChild(link);
        link.click();
        link.remove();

        // Keep the Blob URL alive long enough for mobile browsers to start the download.
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
        showToast("بدأ تحميل الصورة ✓");
    } catch (error) {
        console.warn("Image download failed:", error);
        // A cross-origin result may disallow fetch() through CORS; open its source instead.
        const link = document.createElement("a");
        link.href = resultUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = "wallpaperhub-ai-enhanced";
        document.body.appendChild(link);
        link.click();
        link.remove();
        showToast("تعذر التنزيل المباشر؛ تم فتح الصورة في تبويب جديد.");
    }
});

// ---------------------------------------------------------
// Reset / new image
// ---------------------------------------------------------

function resetStudio() {
    cancelEnhancement();
    selectionRunId += 1;

    selectedImageBase64 = "";
    selectedFile = null;
    resultUrl = "";

    if (imageInput) imageInput.value = "";
    if (previewImage) previewImage.removeAttribute("src");
    if (imageStats) imageStats.textContent = "—";
    if (resultResolution) resultResolution.textContent = "—";
    sourceDimensions = { width:0, height:0 };
    if (resultImage) resultImage.removeAttribute("src");
    if (originalResultImage) originalResultImage.removeAttribute("src");

    sourcePreview?.setAttribute("hidden", "");
    uploadEmpty?.removeAttribute("hidden");
    resultSection?.setAttribute("hidden", "");

    if (enhanceBtn) {
        enhanceBtn.disabled = true;
        setProgress(0, apiReady
            ? "ابدأ التحسين بالذكاء الاصطناعي"
            : "الخدمة غير متاحة");
    }

    if (compareRange) compareRange.value = "50";
    setComparePosition(50);
}

clearBtn?.addEventListener("click", () => {
    resetStudio();
    showToast("تم بدء مشروع جديد.");
});

newImageBtn?.addEventListener("click", () => {
    resetStudio();
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => imageInput?.click(), 350);
});

// ---------------------------------------------------------
// API status
// ---------------------------------------------------------

async function checkApiStatus() {
    try {
        const response = await fetch("/api/artguru/status", { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        const state = String(data.status || (response.ok ? "unknown" : "unreachable"));

        apiReady = response.ok && state === "ready";

        if (statusPill) {
            statusPill.classList.remove("status-ready", "status-error", "status-loading");
            statusPill.classList.add(apiReady ? "status-ready" : "status-error");
        }

        const statusMessages = {
            ready: "AI متصل",
            not_configured: "AI غير مهيأ",
            invalid_key: "مفتاح AI غير صالح",
            rate_limited: "ضغط على خدمة AI",
            unreachable: "خدمة AI غير متاحة"
        };
        if (statusText) {
            statusText.textContent = statusMessages[state] || "تعذر الاتصال";
        }

        updateEnhanceButton();
        if (apiReady) {
            if (!isEnhancing) setProgress(0, "ابدأ التحسين بالذكاء الاصطناعي");
        } else {
            setProgress(0, state === "not_configured" || state === "invalid_key"
                ? "الخدمة غير متاحة"
                : "تعذر الاتصال بالخدمة");
            if (state === "not_configured" || state === "invalid_key") {
                showToast("خدمة Artguru تحتاج إعداد المفتاح أو صلاحياته على الخادم.");
            }
        }
    } catch (error) {
        console.warn("Artguru status check failed:", error);
        apiReady = false;
        if (statusPill) {
            statusPill.classList.remove("status-ready", "status-loading");
            statusPill.classList.add("status-error");
        }
        if (statusText) statusText.textContent = "تعذر الاتصال";
        updateEnhanceButton();
        setProgress(0, "تعذر الاتصال بالخدمة");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    setComparePosition(50);
    checkApiStatus();
});
