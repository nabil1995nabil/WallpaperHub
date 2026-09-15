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
    if (!isImageFile(file)) {
        showToast("اختر ملف صورة صالحاً.");
        return;
    }

    selectedFile = file;

    const reader = new FileReader();

    reader.onload = (event) => {
        selectedImageBase64 = event.target.result;

        if (previewImage) {
            previewImage.src = selectedImageBase64;
        }

        if (originalResultImage) {
            originalResultImage.src = selectedImageBase64;
        }

        if (fileName) {
            fileName.textContent = formatFileName(file.name);
        }

        const tempImage = new Image();
        tempImage.onload = () => {
            sourceDimensions = { width: tempImage.naturalWidth, height: tempImage.naturalHeight };
            if (imageStats) {
                imageStats.textContent = `${tempImage.naturalWidth}×${tempImage.naturalHeight} · ${formatBytes(file.size)}`;
            }
        };
        tempImage.src = selectedImageBase64;

        uploadEmpty?.setAttribute("hidden", "");
        sourcePreview?.removeAttribute("hidden");

        if (enhanceBtn) enhanceBtn.disabled = false;

        // A new source means the previous result is no longer relevant.
        resultUrl = "";
        resultSection?.setAttribute("hidden", "");

        showToast("تم اختيار الصورة. جاهز للتحسين ✦");
    };

    reader.onerror = () => showToast("تعذر قراءة الصورة.");
    reader.readAsDataURL(file);
}

imageInput?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) loadImage(file);
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

    enhanceBtn.disabled = true;
    clearInterval(progressTimer);

    let progress = 0;
    setProgress(0, "جاري تجهيز الصورة...");

    progressTimer = setInterval(() => {
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
            body: JSON.stringify({
                image: selectedImageBase64
            })
        });

        const result = await response.json().catch(() => ({}));

        console.log("Artguru response:", result);

        if (!response.ok) {
            throw new Error(result.message || "تعذر تحسين الصورة.");
        }

        const imageUrl = findImageUrl(result);

        if (!imageUrl) {
            throw new Error("تمت المعالجة لكن لم يتم العثور على الصورة الناتجة.");
        }

        resultUrl = imageUrl;

        if (resultImage) {
            resultImage.src = imageUrl;
            resultImage.onload = () => {
                if (resultResolution) {
                    resultResolution.textContent = `${resultImage.naturalWidth}×${resultImage.naturalHeight}`;
                }
            };
        }
        if (originalResultImage) originalResultImage.src = selectedImageBase64;
        if (resultStatus) resultStatus.textContent = "تم التحسين بنجاح";

        resultSection?.removeAttribute("hidden");

        setComparePosition(50);

        progress = 100;
        setProgress(100, "اكتمل التحسين ✓");

        setTimeout(() => {
            resultSection?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }, 250);

        showToast("تم تحسين الصورة بنجاح ✦");

    } catch (error) {
        console.error("Artguru error:", error);
        showToast(error.message || "حدث خطأ أثناء التحسين.");
        setProgress(0, "حاول مرة أخرى");

    } finally {
        clearInterval(progressTimer);

        setTimeout(() => {
            enhanceBtn.disabled = !selectedImageBase64;
            if (selectedImageBase64) {
                setProgress(0, "ابدأ التحسين بالذكاء الاصطناعي");
            } else {
                resetProgress();
            }
        }, 1000);
    }
});

// ---------------------------------------------------------
// Before / after comparison
// ---------------------------------------------------------

function setComparePosition(value) {
    const position = Number(value) || 50;

    if (afterLayer) {
        afterLayer.style.width = `${position}%`;
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
        const response = await fetch(resultUrl);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = "wallpaperhub-ai-enhanced.jpg";
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        showToast("بدأ تحميل الصورة ✓");

    } catch (error) {
        // Fallback for servers that block cross-origin downloads.
        const link = document.createElement("a");
        link.href = resultUrl;
        link.target = "_blank";
        link.rel = "noopener";
        link.download = "wallpaperhub-ai-enhanced.jpg";
        document.body.appendChild(link);
        link.click();
        link.remove();

        showToast("تم فتح الصورة للتحميل.");
    }
});

// ---------------------------------------------------------
// Reset / new image
// ---------------------------------------------------------

function resetStudio() {
    clearInterval(progressTimer);

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
        setProgress(0, "ابدأ التحسين بالذكاء الاصطناعي");
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
        const state = String(data.status || "unknown");

        if (statusPill) {
            statusPill.classList.remove("status-ready", "status-error", "status-loading");
            statusPill.classList.add(state === "ready" ? "status-ready" : (state === "not_configured" || state === "invalid_key" ? "status-error" : "status-loading"));
        }

        if (statusText) {
            statusText.textContent = state === "ready" ? "AI متصل" :
                state === "not_configured" ? "AI غير مهيأ" :
                state === "invalid_key" ? "مفتاح AI غير صالح" : "جاري التحقق";
        }

        if (state === "not_configured" || state === "invalid_key") {
            if (enhanceBtn && !selectedImageBase64) {
                enhanceBtn.disabled = true;
                setProgress(0, "الخدمة غير متاحة");
            }
            showToast("خدمة Artguru تحتاج إعداد المفتاح على الخادم.");
        }
    } catch (error) {
        console.warn("Artguru status check failed:", error);
        if (statusText) statusText.textContent = "تعذر التحقق";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    setComparePosition(50);
    checkApiStatus();
});
