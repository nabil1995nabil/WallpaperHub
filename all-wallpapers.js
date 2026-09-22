// =========================================================
// WallpaperHub — All Wallpapers / Premium UI
// =========================================================

const API_URL = "/api/wallpapers";

function getImageUrl(imagePath){
    if(!imagePath) return "/assets/logo/no-image.png";

    const value = String(imagePath).trim();

    if(/^https?:\/\//i.test(value)) return value;
    if(value.startsWith("/")) return value;
    if(value.startsWith("assets/")) return "/" + value;

    return "/assets/wallpapers/" + value.replace(/^\/+/, "");
}

const wallpapersGrid = document.getElementById("wallpapersGrid");
const pageTitle = document.getElementById("pageTitle");
const wallpaperCount = document.getElementById("wallpaperCount");
const loading = document.getElementById("loading");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const searchBox = document.getElementById("searchBox");
const backBtn = document.getElementById("backBtn");
const scrollTopBtn = document.getElementById("scrollTop");
const advancedFilterBtn = document.getElementById("advancedFilterBtn");
const sortSelect = document.getElementById("sortSelect");
const gridViewBtn = document.getElementById("gridViewBtn");
const compactViewBtn = document.getElementById("compactViewBtn");
const filterButtons = document.querySelectorAll(".filter-btn:not(.categories-trigger)");
const allCategoriesBtn = document.getElementById("allCategoriesBtn");
const categoriesPanel = document.getElementById("categoriesPanel");
const categoriesContent = document.getElementById("categoriesContent");
const closeCategoriesBtn = document.getElementById("closeCategoriesBtn");

const allUnsplashGrid = document.getElementById("allUnsplashGrid");
const allUnsplashState = document.getElementById("allUnsplashState");
const allUnsplashSection = document.getElementById("unsplashSection");


const params = new URLSearchParams(location.search);
const type = params.get("type");
const category = params.get("category");

let allWallpapers = [];
let pageWallpapers = [];
let visibleWallpapers = [];
let currentFilter = "all";
let currentView = "grid";

const categoryNames = {
    all:"جميع الخلفيات",
    nature:"🌿 خلفيات الطبيعة",
    cars:"🚗 خلفيات السيارات",
    games:"🎮 خلفيات الألعاب",
    space:"🌌 خلفيات الفضاء",
    ai:"🤖 خلفيات الذكاء الاصطناعي",
    amoled:"📱 خلفيات AMOLED",
    animals:"🐾 خلفيات الحيوانات",
    anime:"🌀 خلفيات الأنمي",
    city:"🏙️ خلفيات المدن",
    architecture:"🏛️ خلفيات العمارة",
    dark:"🖤 الخلفيات الداكنة",
    "4k":"💎 خلفيات 4K",
    sports:"⚽ خلفيات الرياضة",
    minimal:"✨ خلفيات Minimal",
    bikes:"🏍️ خلفيات الدراجات",
    ocean:"🌊 خلفيات البحر والمحيطات",
    mountains:"🏔️ خلفيات الجبال",
    sunset:"🌅 الغروب والشروق",
    flowers:"🌸 الزهور",
    technology:"💻 التقنية",
    abstract:"🎨 Abstract",
    colors:"🌈 الألوان",
    "3d":"🧊 3D",
    neon:"💠 Neon",
    sports_cars:"🏎️ السيارات الرياضية",
    gaming:"👾 Gaming",
    pc:"🖥️ خلفيات PC",
    mobile:"📱 خلفيات الهاتف",
    tablet:"📲 خلفيات Tablet",
    featured:"🔥 خلفيات مميزة"
};

const typeNames = {
    popular:"🔥 الأكثر شعبية",
    latest:"🆕 أحدث الخلفيات",
    downloaded:"🔥 الأكثر تحميلاً",
    liked:"❤️ الأكثر إعجاباً",
    recommended:"⭐ المقترحة لك"
};

function normalizeText(value){
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[أإآ]/g,"ا")
        .replace(/ة/g,"ه")
        .replace(/ى/g,"ي");
}

function getCategory(wallpaper){
    return normalizeText(wallpaper?.category);
}

function categoryMatches(wallpaper, target){
    const value = getCategory(wallpaper);
    const wanted = normalizeText(target);

    if(value === wanted) return true;

    const aliases = {
        space:["spaces","galaxy","astronomy","فضاء","الفضاء"],
        nature:["nature","natural","طبيعه","طبيعة","الطبيعة"],
        cars:["car","cars","vehicle","vehicles","سيارات","السيارات"],
        games:["game","games","gaming","لعبة","العاب","ألعاب","gaming"],
        anime:["anime","انمي","أنمي"],
        ai:["ai","artificial intelligence","artificial-intelligence","ذكاء اصطناعي","الذكاء الاصطناعي"],
        amoled:["amoled","black oled","oled"],
        animals:["animal","animals","حيوانات","الحيوانات","pets","حيوان"],
        dark:["dark","داكن","داكنه","داكنة","الخلفيات الداكنة"],
        city:["city","cities","مدن","مدينه","مدينة","المدن"],
        architecture:["architecture","building","buildings","عمارة","هندسة معمارية","مباني"],
        sports:["sport","sports","رياضه","رياضة","الرياضة"],
        minimal:["minimal","بسيط","بسيطة","مينيمال"],
        bikes:["bike","bikes","motorcycle","motorcycles","دراجات","دراجة"],
        ocean:["ocean","sea","marine","بحر","محيط","المحيطات","البحر"],
        mountains:["mountain","mountains","جبال","جبل"],
        sunset:["sunset","sunrise","dawn","غروب","شروق","غروب وشروق"],
        flowers:["flower","flowers","زهور","زهرة"],
        technology:["technology","tech","تقنية","تكنولوجيا"],
        abstract:["abstract","تجريدي","مجرد"],
        colors:["color","colors","ألوان","الوان"],
        "3d":["3d","three dimensional","ثلاثي الأبعاد","ثلاثي الابعاد"],
        neon:["neon","نيون"],
        sports_cars:["sports car","sports cars","سيارات رياضية","سيارة رياضية"],
        gaming:["gaming","gamer","gamers","ألعاب","العاب","قيمنق"],
        pc:["pc","desktop","computer","حاسوب","كمبيوتر"],
        mobile:["mobile","phone","smartphone","هاتف","هاتف ذكي"],
        tablet:["tablet","تابلت","لوحي"],
        featured:["featured","مميز","مميزة","مميزّة","خلفيات مميزة"]
    };

    return (aliases[wanted] || []).some(alias => value === normalizeText(alias));
}

function getQuality(resolution){
    if(!resolution) return "HD";

    const numbers = String(resolution).match(/\d+/g);
    if(!numbers || numbers.length < 2) return "HD";

    const width = Number(numbers[0]);
    const height = Number(numbers[1]);
    const maxSide = Math.max(width,height);
    const minSide = Math.min(width,height);

    if(maxSide >= 3840 || minSide >= 2160) return "4K";
    if(maxSide >= 2560 || minSide >= 1440) return "2K";
    if(maxSide >= 1920 || minSide >= 1080) return "FHD";
    return "HD";
}

function formatNumber(value){
    const number = Number(value || 0);
    if(!Number.isFinite(number)) return "0";
    if(number >= 1000000) return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`;
    if(number >= 1000) return `${(number / 1000).toFixed(number >= 100000 ? 0 : 1)}K`;
    return number.toLocaleString("ar-MA");
}

function escapeHTML(value){
    return String(value ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}


// =========================================================
// Unsplash — قسم مستقل داخل صفحة جميع الخلفيات
// المصدر: /api/unsplash -> server.js -> Supabase/localId
// الضغط على الصورة يبقى داخل WallpaperHub.
// =========================================================
function createAllUnsplashCard(photo){
    const localId = Number(photo?.localId ?? photo?.id);

    const imageUrl =
        photo?.urls?.small ||
        photo?.thumbnail ||
        photo?.urls?.regular ||
        photo?.image;

    if(!imageUrl || !Number.isFinite(localId)) return null;

    const card = document.createElement("article");
    card.className = "wallpaper-card all-unsplash-card";
    card.dataset.id = String(localId);

    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt =
        photo?.alt_description ||
        photo?.description ||
        photo?.title ||
        "Unsplash wallpaper";
    image.loading = "lazy";
    image.decoding = "async";

    image.addEventListener("error",() => {
        card.remove();
    },{once:true});

    const qualityBadge = document.createElement("span");
    qualityBadge.className = "quality-badge";
    qualityBadge.textContent = getQuality(
        photo?.width && photo?.height
            ? `${photo.width}x${photo.height}`
            : ""
    );

    const overlay = document.createElement("div");
    overlay.className = "wallpaper-overlay";

    const title = document.createElement("div");
    title.className = "wallpaper-title";
    title.textContent =
        photo?.alt_description ||
        photo?.description ||
        "Unsplash";

    const meta = document.createElement("div");
    meta.className = "wallpaper-meta";

    const resolution = document.createElement("span");
    resolution.className = "wallpaper-resolution";
    resolution.textContent =
        photo?.width && photo?.height
            ? `${photo.width} × ${photo.height}`
            : "Unsplash";

    const credit = document.createElement("span");
    credit.className = "all-unsplash-credit";
    credit.textContent =
        photo?.user?.name ||
        photo?.author ||
        "Unsplash";

    meta.append(resolution,credit);
    overlay.append(title,meta);

    card.append(image,qualityBadge,overlay);

    card.addEventListener("click",() => {
        localStorage.setItem("selectedWallpaper",String(localId));
        location.href =
            `wallpaper.html?id=${encodeURIComponent(localId)}`;
    });

    return card;
}

async function loadAllUnsplash(){
    if(!allUnsplashGrid || !allUnsplashSection) return;

    allUnsplashGrid.innerHTML = "";
    allUnsplashSection.hidden = false;

    try{
        const response = await fetch(
            `/api/unsplash?query=wallpaper&order_by=latest&_=${Date.now()}`,
            {
                headers:{Accept:"application/json"},
                cache:"no-store"
            }
        );

        let data = {};
        try{
            data = await response.json();
        }catch(_error){}

        if(!response.ok){
            throw new Error(
                data?.error || `Unsplash API error ${response.status}`
            );
        }

        const photos = Array.isArray(data?.results)
            ? data.results.slice(0,10)
            : [];

        if(!photos.length){
            allUnsplashSection.hidden = true;
            return;
        }

        photos.forEach(photo => {
            const card = createAllUnsplashCard(photo);
            if(card) allUnsplashGrid.appendChild(card);
        });

        if(!allUnsplashGrid.children.length){
            allUnsplashSection.hidden = true;
        }
    }catch(error){
        console.error("ALL WALLPAPERS UNSPLASH ERROR:",error);
        allUnsplashSection.hidden = true;

        if(allUnsplashState){
            allUnsplashState.hidden = false;
            allUnsplashState.textContent =
                "تعذر تحميل خلفيات Unsplash حالياً.";
        }
    }
}

async function loadWallpapers(){
    loading.style.display = "flex";
    emptyState.style.display = "none";

    try{
        const response = await fetch(API_URL,{headers:{Accept:"application/json"}});
        if(!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        allWallpapers = Array.isArray(data) ? data : [];

        preparePage();
        applyFilters();
        syncFavoritesOnLogin().catch(()=>{});
    }catch(error){
        console.error("Wallpaper load error:",error);
        loading.style.display = "none";
        wallpapersGrid.innerHTML = "";
        emptyState.style.display = "block";
        emptyState.querySelector("h3").textContent = "تعذر تحميل الخلفيات";
        emptyState.querySelector("p").textContent = "تأكد أن السيرفر يعمل ثم حاول مرة أخرى.";
    }
}

function preparePage(){
    pageWallpapers = [...allWallpapers];

    if(category){
        if(normalizeText(category) !== "all"){
            pageWallpapers = pageWallpapers.filter(wallpaper => categoryMatches(wallpaper,category));
        }
        pageTitle.textContent = categoryNames[category] || "الخلفيات";
        return;
    }

    if(type === "latest"){
        pageTitle.textContent = typeNames.latest;
        pageWallpapers.sort((a,b) => Number(b.id || 0) - Number(a.id || 0));
        return;
    }

    if(type === "popular"){
        pageTitle.textContent = typeNames.popular;
        pageWallpapers = pageWallpapers.filter(wallpaper => wallpaper.popular === true || wallpaper.popular === "true");
        return;
    }

    if(type === "downloaded"){
        pageTitle.textContent = typeNames.downloaded;
        pageWallpapers = pageWallpapers.filter(wallpaper => Number(wallpaper.downloads || 0) > 0);
        pageWallpapers.sort((a,b) => Number(b.downloads || 0) - Number(a.downloads || 0));
        return;
    }

    if(type === "liked"){
        pageTitle.textContent = typeNames.liked;
        pageWallpapers = pageWallpapers.filter(wallpaper => Number(wallpaper.likes || 0) > 0);
        pageWallpapers.sort((a,b) => Number(b.likes || 0) - Number(a.likes || 0));
        return;
    }

    if(type === "recommended"){
        pageTitle.textContent = typeNames.recommended;
        pageWallpapers.sort((a,b) => {
            const scoreA = Number(a.rating || 0) * 10 + Number(a.downloads || 0) + (a.popular ? 50 : 0);
            const scoreB = Number(b.rating || 0) * 10 + Number(b.downloads || 0) + (b.popular ? 50 : 0);
            return scoreB - scoreA;
        });
        return;
    }

    pageTitle.textContent = "جميع الخلفيات";
}

function applySort(list){
    const sort = sortSelect?.value || "default";
    if(sort === "latest") list.sort((a,b) => Number(b.id || 0) - Number(a.id || 0));
    if(sort === "downloads") list.sort((a,b) => Number(b.downloads || 0) - Number(a.downloads || 0));
    if(sort === "rating") list.sort((a,b) => Number(b.rating || 0) - Number(a.rating || 0));
    if(sort === "likes") list.sort((a,b) => Number(b.likes || 0) - Number(a.likes || 0));
}

function applyFilters(){
    visibleWallpapers = [...pageWallpapers];

    const search = normalizeText(searchInput.value);
    if(search){
        visibleWallpapers = visibleWallpapers.filter(wallpaper => {
            const title = normalizeText(wallpaper.title);
            const tags = Array.isArray(wallpaper.tags)
                ? normalizeText(wallpaper.tags.join(" "))
                : normalizeText(wallpaper.tags);
            const wallCategory = normalizeText(wallpaper.category);
            return title.includes(search) || tags.includes(search) || wallCategory.includes(search);
        });
    }

    if(currentFilter === "4k"){
        visibleWallpapers = visibleWallpapers.filter(wallpaper => getQuality(wallpaper.resolution) === "4K");
    }else if(currentFilter === "downloads" || currentFilter === "downloaded"){
        visibleWallpapers = visibleWallpapers.filter(wallpaper => Number(wallpaper.downloads || 0) > 0);
        visibleWallpapers.sort((a,b) => Number(b.downloads || 0) - Number(a.downloads || 0));
    }else if(currentFilter === "rating"){
        visibleWallpapers.sort((a,b) => Number(b.rating || 0) - Number(a.rating || 0));
    }else if(currentFilter === "likes" || currentFilter === "liked"){
        visibleWallpapers = visibleWallpapers.filter(wallpaper => Number(wallpaper.likes || 0) > 0);
        visibleWallpapers.sort((a,b) => Number(b.likes || 0) - Number(a.likes || 0));
    }else if(currentFilter === "latest"){
        visibleWallpapers.sort((a,b) => Number(b.id || 0) - Number(a.id || 0));
    }else if(currentFilter === "popular"){
        visibleWallpapers = visibleWallpapers.filter(wallpaper => wallpaper.popular === true || wallpaper.popular === "true");
        visibleWallpapers.sort((a,b) => Number(b.downloads || 0) - Number(a.downloads || 0));
    }else if(currentFilter === "recommended"){
        visibleWallpapers.sort((a,b) => {
            const scoreA = Number(a.rating || 0) * 10 + Number(a.downloads || 0) + (a.popular ? 50 : 0);
            const scoreB = Number(b.rating || 0) * 10 + Number(b.downloads || 0) + (b.popular ? 50 : 0);
            return scoreB - scoreA;
        });
    }else if(currentFilter !== "all"){
        visibleWallpapers = visibleWallpapers.filter(wallpaper => categoryMatches(wallpaper,currentFilter));
    }

    applySort(visibleWallpapers);
    renderWallpapers();
}

const categoryGroups = [
    {
        title:"🔥 الشعبية",
        icon:"local_fire_department",
        items:[
            ["popular","الأكثر شعبية","local_fire_department"],
            ["latest","الأحدث","new_releases"],
            ["downloads","الأكثر تحميلاً","file_download"],
            ["rating","الأعلى تقييماً","star"],
            ["likes","الأكثر إعجاباً","favorite"],
            ["recommended","المقترحة لك","auto_awesome"]
        ]
    },
    {
        title:"🎨 التصنيفات",
        icon:"category",
        items:[
            ["nature","طبيعة","park"], ["animals","حيوانات","pets"],
            ["cars","سيارات","directions_car"], ["bikes","دراجات","two_wheeler"],
            ["games","ألعاب","sports_esports"], ["anime","أنمي","animation"],
            ["space","فضاء","public"], ["city","مدن","location_city"],
            ["architecture","عمارة","apartment"], ["sports","رياضة","sports_soccer"]
        ]
    },
    {
        title:"✨ الأنماط",
        icon:"auto_awesome",
        items:[
            ["minimal","Minimal","auto_awesome"], ["dark","Dark","dark_mode"],
            ["amoled","AMOLED","contrast"], ["abstract","Abstract","blur_on"],
            ["3d","3D","view_in_ar"], ["neon","Neon","lightbulb"],
            ["colors","ألوان","palette"], ["ai","ذكاء اصطناعي","smart_toy"]
        ]
    },
    {
        title:"🌍 المشاهد",
        icon:"landscape",
        items:[
            ["mountains","جبال","landscape"], ["ocean","بحر ومحيطات","water"],
            ["sunset","غروب وشروق","wb_twilight"], ["flowers","زهور","local_florist"],
            ["technology","تقنية","memory"], ["featured","خلفيات مميزة","verified"]
        ]
    },
    {
        title:"💻 الأجهزة والاستخدام",
        icon:"devices",
        items:[
            ["mobile","خلفيات الهاتف","smartphone"], ["pc","خلفيات PC","desktop_windows"],
            ["tablet","خلفيات Tablet","tablet"], ["sports_cars","سيارات رياضية","sports_motorsports"],
            ["gaming","Gaming","videogame_asset"], ["4k","4K","4k"]
        ]
    }
];

function renderCategoriesPanel(){
    if(!categoriesContent) return;
    categoriesContent.innerHTML = "";

    categoryGroups.forEach(group => {
        const section = document.createElement("section");
        const title = document.createElement("div");
        title.className = "category-group-title";
        title.append(createIcon(group.icon),document.createTextNode(group.title));

        const items = document.createElement("div");
        items.className = "category-items";

        group.items.forEach(([value,label,icon]) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "category-item";
            button.dataset.filter = value;
            button.append(createIcon(icon),document.createTextNode(label));
            button.addEventListener("click",() => selectFilter(value,label));
            items.appendChild(button);
        });

        section.append(title,items);
        categoriesContent.appendChild(section);
    });
}

function selectFilter(value,label){
    currentFilter = value;
    filterButtons.forEach(btn => btn.classList.toggle("active",btn.dataset.filter === value));
    document.querySelectorAll(".category-item").forEach(btn => btn.classList.toggle("active",btn.dataset.filter === value));

    if(value === "all") pageTitle.textContent = "جميع الخلفيات";
    else pageTitle.textContent = categoryNames[value] || label || "الخلفيات";

    closeCategoriesPanel();
    applyFilters();
}

function openCategoriesPanel(){
    if(!categoriesPanel) return;
    renderCategoriesPanel();
    categoriesPanel.classList.add("is-open");
    categoriesPanel.setAttribute("aria-hidden","false");
    document.body.classList.add("categories-open");
}

function closeCategoriesPanel(){
    if(!categoriesPanel) return;
    categoriesPanel.classList.remove("is-open");
    categoriesPanel.setAttribute("aria-hidden","true");
    document.body.classList.remove("categories-open");
}

function createIcon(name,className=""){
    const span = document.createElement("span");
    span.className = `material-icons ${className}`.trim();
    span.textContent = name;
    return span;
}

function renderWallpapers(){
    loading.style.display = "none";
    wallpapersGrid.innerHTML = "";
    wallpaperCount.textContent = `${visibleWallpapers.length.toLocaleString("ar-MA")} خلفية`;

    if(!visibleWallpapers.length){
        emptyState.style.display = "block";
        return;
    }

    emptyState.style.display = "none";

    visibleWallpapers.forEach((wallpaper,index) => {
        const card = document.createElement("article");
        card.className = "wallpaper-card";
        card.style.animationDelay = `${Math.min(index * 18,180)}ms`;
        card.dataset.id = String(wallpaper.id ?? "");

        const quality = getQuality(wallpaper.resolution);
        const image = document.createElement("img");
        image.src = getImageUrl(wallpaper.thumbnail || wallpaper.image || "");
        image.alt = String(wallpaper.title || "Wallpaper");
        image.loading = "lazy";
        image.decoding = "async";
        image.addEventListener("error",() => {
            image.src = "/assets/logo/no-image.png";
            image.classList.add("image-error");
        },{once:true});

        const qualityBadge = document.createElement("span");
        qualityBadge.className = "quality-badge";
        qualityBadge.textContent = quality;

        const favoriteButton = document.createElement("button");
        favoriteButton.type = "button";
        favoriteButton.className = "card-favorite";
        favoriteButton.setAttribute("aria-label",isFavorite(wallpaper.id) ? "إزالة من المفضلة" : "إضافة إلى المفضلة");
        updateFavoriteButton(favoriteButton,wallpaper.id);

        favoriteButton.addEventListener("click",event => {
            event.stopPropagation();
            toggleFavorite(wallpaper.id,favoriteButton);
        });

        const overlay = document.createElement("div");
        overlay.className = "wallpaper-overlay";

        const title = document.createElement("div");
        title.className = "wallpaper-title";
        title.textContent = wallpaper.title || "Wallpaper";

        const meta = document.createElement("div");
        meta.className = "wallpaper-meta";

        const resolution = document.createElement("span");
        resolution.className = "wallpaper-resolution";
        resolution.textContent = wallpaper.resolution || quality;

        const stats = document.createElement("div");
        stats.className = "wallpaper-stats";

        const downloads = document.createElement("span");
        downloads.className = "wallpaper-stat";
        downloads.append(createIcon("file_download"));
        downloads.append(document.createTextNode(formatNumber(wallpaper.downloads)));

        const likes = document.createElement("span");
        likes.className = "wallpaper-stat";
        likes.append(createIcon("favorite"));
        likes.append(document.createTextNode(formatNumber(wallpaper.likes)));

        stats.append(downloads,likes);
        meta.append(resolution,stats);
        overlay.append(title,meta);
        card.append(image,qualityBadge,favoriteButton,overlay);

        card.addEventListener("click",() => {
            localStorage.setItem("selectedWallpaper",String(wallpaper.id ?? ""));
            location.href = `wallpaper.html?id=${encodeURIComponent(wallpaper.id)}`;
        });

        wallpapersGrid.appendChild(card);
    });
}

// ============================
// المفضلة
// ============================

async function getCloudFavorites(){
    try{
        const {supabase} = await import("./supabase.js");
        const {data:sessionData} = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if(!user?.id) return null;

        const local = JSON.parse(localStorage.getItem("favorites") || "[]").map(String);
        const rows = local
            .map(id => ({user_id:user.id,wallpaper_id:Number(id)}))
            .filter(row => Number.isFinite(row.wallpaper_id));

        if(rows.length){
            await supabase.from("favorites").upsert(rows,{onConflict:"user_id,wallpaper_id",ignoreDuplicates:true});
        }

        const {data,error} = await supabase
            .from("favorites")
            .select("wallpaper_id")
            .eq("user_id",user.id);

        if(error) throw error;

        const ids = [...new Set((data || []).map(row => String(row.wallpaper_id)))];
        localStorage.setItem("favorites",JSON.stringify(ids));
        return ids;
    }catch(error){
        console.warn("CLOUD FAVORITES LOAD ERROR:",error);
        return null;
    }
}

async function saveFavoriteToCloud(id){
    const {supabase} = await import("./supabase.js");
    const {data:sessionData} = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if(!user?.id) return false;

    const {error} = await supabase.from("favorites").upsert(
        [{user_id:user.id,wallpaper_id:Number(id)}],
        {onConflict:"user_id,wallpaper_id",ignoreDuplicates:true}
    );
    if(error) throw error;
    return true;
}

async function removeFavoriteFromCloud(id){
    const {supabase} = await import("./supabase.js");
    const {data:sessionData} = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if(!user?.id) return false;

    const {error} = await supabase.from("favorites")
        .delete()
        .eq("user_id",user.id)
        .eq("wallpaper_id",Number(id));
    if(error) throw error;
    return true;
}

async function syncFavoritesOnLogin(){
    const cloud = await getCloudFavorites();
    if(cloud !== null) applyFavoriteIcons();
}

function isFavorite(id){
    try{
        return JSON.parse(localStorage.getItem("favorites") || "[]")
            .map(String)
            .includes(String(id));
    }catch(_error){
        return false;
    }
}

function updateFavoriteButton(button,id){
    const active = isFavorite(id);
    button.innerHTML = "";
    button.append(createIcon(active ? "favorite" : "favorite_border"));
    button.classList.toggle("is-favorite",active);
    button.setAttribute("aria-label",active ? "إزالة من المفضلة" : "إضافة إلى المفضلة");
}

function applyFavoriteIcons(){
    document.querySelectorAll(".card-favorite").forEach(button => {
        const card = button.closest(".wallpaper-card");
        const id = card?.dataset.id;
        if(id) updateFavoriteButton(button,id);
    });
}

async function toggleFavorite(id,button){
    const key = String(id);
    let favorites;

    try{
        favorites = JSON.parse(localStorage.getItem("favorites") || "[]").map(String);
    }catch(_error){
        favorites = [];
    }

    const wasFavorite = favorites.includes(key);

    // تحديث الواجهة فورًا حتى لا يشعر المستخدم بتأخير الشبكة.
    favorites = wasFavorite
        ? favorites.filter(item => item !== key)
        : [...favorites,key];

    localStorage.setItem("favorites",JSON.stringify([...new Set(favorites)]));
    updateFavoriteButton(button,key);

    try{
        const {supabase} = await import("./supabase.js");
        const {data:sessionData} = await supabase.auth.getSession();
        const user = sessionData?.session?.user;

        if(user?.id){
            if(wasFavorite) await removeFavoriteFromCloud(key);
            else await saveFavoriteToCloud(key);
        }
    }catch(error){
        // نعيد الحالة المحلية إذا فشلت المزامنة السحابية.
        const current = JSON.parse(localStorage.getItem("favorites") || "[]").map(String);
        const restored = wasFavorite
            ? [...new Set([...current,key])]
            : current.filter(item => item !== key);
        localStorage.setItem("favorites",JSON.stringify(restored));
        updateFavoriteButton(button,key);
        console.warn("FAVORITE SYNC ERROR:",error);
    }
}

// ============================
// البحث والفلاتر
// ============================

searchInput.addEventListener("input",applyFilters);

searchBtn.addEventListener("click",() => {
    searchInput.focus();
    searchBox.scrollIntoView({behavior:"smooth",block:"center"});
});

advancedFilterBtn?.addEventListener("click",() => {
    document.getElementById("filters")?.scrollIntoView({behavior:"smooth",block:"center"});
});

filterButtons.forEach(button => {
    button.addEventListener("click",() => {
        selectFilter(button.dataset.filter || "all",button.textContent.trim());
    });
});

allCategoriesBtn?.addEventListener("click",openCategoriesPanel);
closeCategoriesBtn?.addEventListener("click",closeCategoriesPanel);
document.querySelector("[data-close-categories]")?.addEventListener("click",closeCategoriesPanel);
document.addEventListener("keydown",event => {
    if(event.key === "Escape") closeCategoriesPanel();
});

sortSelect?.addEventListener("change",applyFilters);

function setView(mode){
    currentView = mode;
    wallpapersGrid.classList.toggle("compact-grid",mode === "compact");
    gridViewBtn?.classList.toggle("active",mode === "grid");
    compactViewBtn?.classList.toggle("active",mode === "compact");
}

gridViewBtn?.addEventListener("click",() => setView("grid"));
compactViewBtn?.addEventListener("click",() => setView("compact"));

backBtn.addEventListener("click",() => history.back());

window.addEventListener("scroll",() => {
    scrollTopBtn.style.display = window.scrollY > 500 ? "flex" : "none";
});

scrollTopBtn.addEventListener("click",() => {
    window.scrollTo({top:0,behavior:"smooth"});
});

// Bottom navigation is intentionally a UI layer for now.
// Routes can be connected later without changing the wallpaper grid.
document.querySelectorAll(".page-bottom-nav button").forEach(button => {
    button.addEventListener("click",() => {
        const target = button.dataset.nav;
        if(target === "explore"){
            searchInput.focus();
            searchBox.scrollIntoView({behavior:"smooth",block:"center"});
        }else if(target === "wallpapers"){
            window.scrollTo({top:0,behavior:"smooth"});
        }
    });
});

setView("grid");
loadWallpapers();
loadAllUnsplash();
