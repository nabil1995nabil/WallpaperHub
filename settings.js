function getSettingsAccessToken(){
    try{
        for(let i=0;i<localStorage.length;i++){
            const key=localStorage.key(i)||"";
            if(!key.startsWith("sb-")||!key.endsWith("-auth-token")) continue;
            const raw=localStorage.getItem(key);if(!raw)continue;
            let session;
            try{session=JSON.parse(raw);}catch(_){
                if(!raw.startsWith("base64-"))continue;
                const bytes=Uint8Array.from(atob(raw.slice(7)),c=>c.charCodeAt(0));
                session=JSON.parse(new TextDecoder().decode(bytes));
            }
            const token=String(session?.access_token||session?.currentSession?.access_token||"").trim();
            if(token)return token;
        }
    }catch(error){console.warn("SETTINGS AUTH TOKEN ERROR:",error);}
    return "";
}

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
    systemUpdate:true,
    homeLayoutMode:"one-row",
    homeCardSize:100
};

const STORAGE_KEY = "wallpaperSettings";
const CARD_STYLE_KEY = "cardStyle";

function loadSettings(){
    try{
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        const cardStyle = localStorage.getItem(CARD_STYLE_KEY) || saved.cardStyle || "classic";
        return {...DEFAULT_SETTINGS, ...saved, cardStyle};
    }catch{
        return {...DEFAULT_SETTINGS, cardStyle:"classic"};
    }
}

let settings = loadSettings();

const $ = id => document.getElementById(id);

function saveSettings(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    localStorage.setItem(CARD_STYLE_KEY, settings.cardStyle || "classic");
    window.dispatchEvent(new CustomEvent("wallpaperhub:settings-updated",{
        detail:{settings:{...settings},source:"local-change"}
    }));
    showSaved();
}

function showSaved(){
    const el = $("saveIndicator");
    if(!el) return;
    el.innerHTML = `<span class="material-icons">check</span> محفوظ على الجهاز`;
    el.classList.add("saved");
    clearTimeout(showSaved.timer);
    showSaved.timer = setTimeout(() => {
        el.innerHTML = `<span class="material-icons">check</span> تم الحفظ`;
    }, 900);
}

function applySetting(key){
    if(key === "darkMode"){
        if(typeof window.setWallpaperHubTheme === "function"){
            window.setWallpaperHubTheme(!!settings.darkMode);
        }else{
            document.documentElement.classList.toggle("dark", !!settings.darkMode);
            document.body.classList.toggle("dark", !!settings.darkMode);
            localStorage.setItem("darkMode", String(!!settings.darkMode));
        }
        window.dispatchEvent(new CustomEvent("wallpaperhub:settings-updated", {
            detail:{key:"darkMode", value:!!settings.darkMode}
        }));
    }
    if(key === "animations"){
        document.body.classList.toggle("no-animation", !settings.animations);
    }
}

function bindSettings(){
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
        const input = $(key === "notifications" ? "notificationsEnabled" : key);
        if(!input || input.type !== "checkbox") return;

        input.checked = !!settings[key];

        input.addEventListener("change", async () => {
            settings[key] = input.checked;
            applySetting(key);
            saveSettings();

            if(key === "browserNotifications"){
                window.dispatchEvent(new CustomEvent("wallpaperhub:push-toggle",{detail:{enabled:input.checked}}));
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
            settings.cardStyle = current;
            saveSettings();
            render();
            menu.classList.remove("show");
        };
    });

    render();
}

function renderHomeLayoutControls(){
    const sizeRange=$("homeCardSize");
    const sizeControl=$("homeCardSizeControl");
    if(!sizeRange || !sizeControl) return;

    const mode=settings.homeLayoutMode==="two-rows"?"two-rows":"one-row";
    const requested=Number(settings.homeCardSize);
    const size=Number.isFinite(requested)?Math.min(130,Math.max(70,Math.round(requested/5)*5)):100;
    settings.homeLayoutMode=mode;
    settings.homeCardSize=size;

    document.querySelectorAll("[data-home-layout-mode]").forEach(button=>{
        const active=button.dataset.homeLayoutMode===mode;
        button.classList.toggle("active",active);
        button.setAttribute("aria-pressed",String(active));
    });

    sizeRange.value=String(size);
    sizeRange.disabled=mode==="two-rows";
    sizeControl.hidden=mode==="two-rows";
    const output=$("homeCardSizeValue");
    if(output) output.textContent=size+"%";
    const hint=$("homeLayoutHint");
    if(hint) hint.textContent=mode==="two-rows"
        ?"تُرتّب الخلفيات في صفّين قابلين للسحب، ويُصغّر حجم البطاقات تلقائيًا."
        :"يمكنك تكبير البطاقات أو تصغيرها باستخدام شريط الحجم أعلاه.";
}

function setupHomeLayoutControls(){
    const buttons=[...document.querySelectorAll("[data-home-layout-mode]")];
    const sizeRange=$("homeCardSize");
    if(!buttons.length || !sizeRange) return;

    buttons.forEach(button=>{
        button.addEventListener("click",()=>{
            settings.homeLayoutMode=button.dataset.homeLayoutMode==="two-rows"?"two-rows":"one-row";
            saveSettings();
            renderHomeLayoutControls();
        });
    });

    sizeRange.addEventListener("input",()=>{
        settings.homeCardSize=Number(sizeRange.value);
        saveSettings();
        renderHomeLayoutControls();
    });

    renderHomeLayoutControls();
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

    $("exportActivity").onclick = async () => {
        const read = key => {
            try{return JSON.parse(localStorage.getItem(key) || "[]");}
            catch{return [];}
        };
        const backup = {
            exported_at:new Date().toISOString(),
            source:"local-device",
            favorites:read("favorites"),
            downloads:read("downloads"),
            views:read("views"),
            likes:read("likes")
        };
        const token = getSettingsAccessToken();
        if(token){
            try{
                const response = await fetch("/api/user/activity-backup",{cache:"no-store",headers:{Authorization:"Bearer "+token}});
                const cloud = await response.json().catch(()=>({}));
                if(response.ok && cloud.success){
                    backup.source="local-device+supabase-account";
                    backup.favorites=[...new Set([...backup.favorites,...(cloud.favorites||[])].map(String))];
                    backup.downloads=[...new Set([...backup.downloads,...(cloud.downloads||[])].map(String))];
                    backup.views=[...new Set([...backup.views,...(cloud.views||[])].map(String))];
                }
            }catch(error){console.warn("CLOUD ACTIVITY BACKUP ERROR:",error);}
        }
        downloadJSON("wallpaperhub-activity-backup.json",backup);
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

    $("resetSettings").onclick = async () => {
        if(!confirm("سيتم إرجاع إعدادات WallpaperHub الافتراضية إلى الجهاز والحساب. هل تريد المتابعة؟")) return;
        settings = {...DEFAULT_SETTINGS,cardStyle:"classic",browserNotifications:false};
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        localStorage.setItem(CARD_STYLE_KEY, "classic");
        window.dispatchEvent(new CustomEvent("wallpaperhub:settings-updated",{
            detail:{settings:{...settings},source:"local-change"}
        }));
        if(window.WallpaperHubPush?.disable) await window.WallpaperHubPush.disable();
        else window.dispatchEvent(new CustomEvent("wallpaperhub:push-toggle",{detail:{enabled:false}}));
        await window.WallpaperHubSettings?.syncAccountSettings?.();
        location.reload();
    };
}


window.addEventListener("wallpaperhub:settings-loaded",event=>{
    const remote=event.detail?.settings;
    if(!remote||typeof remote!=="object")return;
    settings={...DEFAULT_SETTINGS,...remote};
    document.querySelectorAll(".settings-section input[type='checkbox']").forEach(input=>{
        const key=input.id==="notificationsEnabled"?"notifications":input.id;
        if(key in settings)input.checked=!!settings[key];
    });
    const style=String(settings.cardStyle||"classic");
    const styleValue=$("cardStyleValue");
    if(styleValue)styleValue.textContent=({classic:"كلاسيكي",glass:"زجاجي",premium:"مميز"})[style]||"كلاسيكي";
    document.querySelectorAll(".style-option").forEach(option=>option.classList.toggle("active",option.dataset.style===style));
    Object.keys(settings).forEach(applySetting);
    renderHomeLayoutControls();
});

bindSettings();
setupCardStyles();
setupHomeLayoutControls();
setupSearch();
setupTabs();
setupDataTools();
