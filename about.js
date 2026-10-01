// =======================================
// WallpaperHub - About Pro
// =======================================

const API = "/api/wallpapers";
const VERSION_API = "/api/version";

const wallCount = document.getElementById("wallCount");
const downloadCount = document.getElementById("downloadCount");
const likeCount = document.getElementById("likeCount");
const ratingCount = document.getElementById("ratingCount");

const appVersion = document.getElementById("appVersion");
const releaseVersion = document.getElementById("releaseVersion");
const releaseDate = document.getElementById("releaseDate");
const updateStatus = document.getElementById("updateStatus");
const checkUpdate = document.getElementById("checkUpdate");

function formatNumber(number){
    number = Number(number || 0);

    if(number >= 1000000){
        return (number / 1000000).toFixed(1) + "M";
    }

    if(number >= 1000){
        return (number / 1000).toFixed(1) + "K";
    }

    return String(number);
}

function formatDate(value){
    if(!value) return "آخر تحديث متاح";

    const date = new Date(value);

    if(Number.isNaN(date.getTime())){
        return "آخر تحديث متاح";
    }

    return new Intl.DateTimeFormat("ar-MA", {
        year:"numeric",
        month:"long",
        day:"numeric"
    }).format(date);
}

function setVersionState(state){
    if(!updateStatus) return;

    updateStatus.classList.remove("checking","error");

    if(state === "checking"){
        updateStatus.classList.add("checking");
    }else if(state === "error"){
        updateStatus.classList.add("error");
    }
}

async function loadVersion(){
    setVersionState("checking");

    try{
        const response = await fetch(VERSION_API, {
            cache:"no-store"
        });

        if(!response.ok){
            throw new Error("VERSION_HTTP_" + response.status);
        }

        const data = await response.json();

        const version = data.version || "v1.0.0";
        const deployedAt = data.deployedAt || data.updatedAt;

        if(appVersion){
            appVersion.textContent = "الإصدار " + version;
        }

        if(releaseVersion){
            releaseVersion.textContent = "الإصدار " + version;
        }

        if(releaseDate){
            releaseDate.textContent = "آخر تحديث: " + formatDate(deployedAt);
        }

        setVersionState("ok");

        return data;

    }catch(error){
        console.error("Version Error:", error);

        // Fallback زمني حتى لا تبقى الصفحة بدون رقم إصدار.
        const now = new Date();
        const fallback =
            "v" +
            now.getFullYear() +
            "." +
            String(now.getMonth() + 1).padStart(2,"0") +
            "." +
            String(now.getDate()).padStart(2,"0");

        if(appVersion){
            appVersion.textContent = "الإصدار " + fallback;
        }

        if(releaseVersion){
            releaseVersion.textContent = fallback;
        }

        if(releaseDate){
            releaseDate.textContent = "تعذر جلب تاريخ النشر";
        }

        setVersionState("error");
        return null;
    }
}

async function loadAboutStats(){
    try{
        const response = await fetch(API, {
            cache:"no-store"
        });

        if(!response.ok){
            throw new Error("API_HTTP_" + response.status);
        }

        const payload = await response.json();

        // يدعم كلا الشكلين: Array أو {wallpapers: Array}
        const wallpapers = Array.isArray(payload)
            ? payload
            : (Array.isArray(payload.wallpapers) ? payload.wallpapers : []);

        let totalDownloads = 0;
        let totalLikes = 0;
        let ratingSum = 0;
        let ratingUsers = 0;

        wallpapers.forEach(wall => {
            totalDownloads += Number(wall.downloads || 0);
            totalLikes += Number(wall.likes || 0);
            ratingSum += Number(wall.ratingSum || 0);
            ratingUsers += Number(wall.ratingCount || 0);
        });

        if(wallCount){
            wallCount.textContent = formatNumber(wallpapers.length);
        }

        if(downloadCount){
            downloadCount.textContent = formatNumber(totalDownloads);
        }

        if(likeCount){
            likeCount.textContent = formatNumber(totalLikes);
        }

        if(ratingCount){
            const avg = ratingUsers > 0
                ? ratingSum / ratingUsers
                : 0;

            ratingCount.textContent = avg.toFixed(1);
        }

    }catch(error){
        console.error("About Stats Error:", error);

        if(wallCount) wallCount.textContent = "—";
        if(downloadCount) downloadCount.textContent = "—";
        if(likeCount) likeCount.textContent = "—";
        if(ratingCount) ratingCount.textContent = "—";
    }
}

async function refreshAbout(){
    if(checkUpdate){
        checkUpdate.disabled = true;
        checkUpdate.innerHTML =
            '<span class="material-icons">sync</span> جارٍ الفحص...';
    }

    await Promise.all([
        loadVersion(),
        loadAboutStats()
    ]);

    if(checkUpdate){
        checkUpdate.disabled = false;
        checkUpdate.innerHTML =
            '<span class="material-icons">refresh</span> فحص الإصدار';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    refreshAbout();

    if(checkUpdate){
        checkUpdate.addEventListener("click", refreshAbout);
    }
});
