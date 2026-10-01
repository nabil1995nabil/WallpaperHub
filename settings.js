// WallpaperHub Settings — Pro
const DEFAULT_SETTINGS = {
    darkMode:false,
    animations:true,
    videos:true,
    highQuality:true,
    fullscreen:true,
    autoUpdate:true,
    wifiOnly:false,
    notifications:true,
    ratingsNotify:true,
    updatesNotify:true,
    notificationSound:true,
    browserNotifications:false,
    localActivity:true,
    systemUpdate:true
};

const STORAGE_KEY = "wallpaperSettings";
const CARD_STYLE_KEY = "cardStyle";

function loadSettings(){
    try{
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        return {...DEFAULT_SETTINGS, ...saved};
    }catch{
        return {...DEFAULT_SETTINGS};
    }
}

let settings = loadSettings();

const $ = id => document.getElementById(id);

function saveSettings(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    showSaved();
}

function showSaved(){
    const el = $("saveIndicator");
    if(!el) return;
    el.innerHTML = `<span class="material-icons">cloud_done</span> محفوظ`;
    el.classList.add("saved");
    clearTimeout(showSaved.timer);
    showSaved.timer = setTimeout(() => {
        el.innerHTML = `<span class="material-icons">check</span> تم الحفظ`;
    }, 900);
}

function applySetting(key){
    if(key === "darkMode"){
        document.body.classList.toggle("dark", !!settings.darkMode);
        localStorage.setItem("darkMode", String(!!settings.darkMode));
    }
    if(key === "animations"){
        document.body.classList.toggle("no-animation", !settings.animations);
    }
}

function bindSettings(){
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
        const input = $(key);
        if(!input) return;

        input.checked = !!settings[key];

        input.addEventListener("change", async () => {
            settings[key] = input.checked;
            applySetting(key);
            saveSettings();

            if(key === "browserNotifications" && input.checked){
                if(!("Notification" in window)){
                    input.checked = false;
                    settings.browserNotifications = false;
                    saveSettings();
                    alert("هذا المتصفح لا يدعم إشعارات النظام.");
                    return;
                }
                const permission = await Notification.requestPermission();
                if(permission !== "granted"){
                    input.checked = false;
                    settings.browserNotifications = false;
                    saveSettings();
                    alert("لم يتم السماح بإشعارات المتصفح.");
                }
            }
        });
    });

    Object.keys(settings).forEach(applySetting);
}

function setupCardStyles(){
    const btn = $("cardStyleBtn");
    const menu = $("cardStyleMenu");
    const value = $("cardStyleValue");
    if(!btn || !menu) return;

    let current = localStorage.getItem(CARD_STYLE_KEY) || "classic";
    const names = {classic:"كلاسيكي",glass:"زجاجي",premium:"مميز"};

    function render(){
        value.textContent = names[current] || names.classic;
        document.querySelectorAll(".style-option").forEach(option => {
            option.classList.toggle("active", option.dataset.style === current);
        });
    }

    btn.onclick = () => menu.classList.toggle("show");

    document.querySelectorAll(".style-option").forEach(option => {
        option.onclick = () => {
            current = option.dataset.style;
            localStorage.setItem(CARD_STYLE_KEY, current);
            render();
            menu.classList.remove("show");
            showSaved();
        };
    });

    render();
}

function setupSearch(){
    const input = $("settingsSearch");
    const clear = $("clearSettingsSearch");
    const empty = $("settingsEmpty");
    const sections = [...document.querySelectorAll(".settings-section")];

    function filter(){
        const q = input.value.trim().toLowerCase();
        let visible = 0;

        sections.forEach(section => {
            const match = !q || section.dataset.sectionName.toLowerCase().includes(q) || section.textContent.toLowerCase().includes(q);
            section.style.display = match ? "" : "none";
            if(match) visible++;
        });

        clear.style.display = q ? "flex" : "none";
        empty.hidden = visible !== 0;
    }

    input.addEventListener("input", filter);
    clear.onclick = () => { input.value = ""; filter(); input.focus(); };
}

function setupTabs(){
    document.querySelectorAll(".settings-tab").forEach(tab => {
        tab.onclick = () => {
            const target = $(tab.dataset.target);
            if(!target) return;

            document.querySelectorAll(".settings-tab").forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            target.scrollIntoView({behavior:"smooth", block:"start"});
        };
    });

    const sections = document.querySelectorAll(".settings-section");
    const tabs = document.querySelectorAll(".settings-tab");

    const observer = new IntersectionObserver(entries => {
        const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
        if(!visible) return;
        tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.target === visible.target.id));
    }, {rootMargin:"-120px 0px -60% 0px", threshold:[0,.2,.5]});

    sections.forEach(section => observer.observe(section));
}

function downloadJSON(filename, data){
    const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
}

function setupDataTools(){
    $("exportSettings").onclick = () => {
        downloadJSON("wallpaperhub-settings.json", {
            exported_at:new Date().toISOString(),
            settings,
            cardStyle:localStorage.getItem(CARD_STYLE_KEY) || "classic"
        });
        showSaved();
    };

    $("exportActivity").onclick = () => {
        const read = key => {
            try{return JSON.parse(localStorage.getItem(key) || "[]");}
            catch{return [];}
        };
        downloadJSON("wallpaperhub-activity-backup.json", {
            exported_at:new Date().toISOString(),
            favorites:read("favorites"),
            downloads:read("downloads"),
            views:read("views"),
            likes:read("likes")
        });
    };

    $("clearSearch").onclick = () => {
        if(!confirm("هل تريد مسح سجل البحث من هذا الجهاز؟")) return;
        localStorage.removeItem("searchHistory");
        alert("تم مسح سجل البحث.");
    };

    $("clearFavorites").onclick = () => {
        if(!confirm("سيتم حذف المفضلة المحلية من هذا المتصفح. هل تريد المتابعة؟")) return;
        localStorage.removeItem("favorites");
        alert("تم مسح المفضلة المحلية.");
    };

    $("resetSettings").onclick = () => {
        if(!confirm("سيتم إرجاع إعدادات WallpaperHub الافتراضية. هل تريد المتابعة؟")) return;
        settings = {...DEFAULT_SETTINGS};
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        localStorage.setItem(CARD_STYLE_KEY, "classic");
        location.reload();
    };
}

bindSettings();
setupCardStyles();
setupSearch();
setupTabs();
setupDataTools();
