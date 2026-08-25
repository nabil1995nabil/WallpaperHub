// =======================================
 WallpaperHub — Aurora Categories Engine
// =======================================

// 🎨ية لونية لكل قسم (تدرج الشفقconst CATEGORY_AURAS = {
    "all":     ["#5060ff", "#a855f7"],
    "nature":  ["#10b981", "#84cc16"],
    "cars":    ["#ef4444", "#f316"],
    "games":   ["#8b5cf", "#ec4899"],
    "space":   ["3b82f6", "#8b5cf6"],
 "ai":      ["#06b6d4", "#382f6"],
    "amoled":  ["#334", "#0ea5e9"],
    "animals": ["f59e0b", "#ef4444"],
    "":   ["#ec4899", "#a855f7"],
    "city":    ["#0ea5e9", "#6366f1"],
    "dark":    ["#1293b", "#64748b"],
    "k":      ["#06b6d4", "#10981"],
    "sports":  ["#22c55e "#eab308"],
    "minimal": ["#94ab8", "#e2e8f0"]
};

function initCategories(){

    const categories = document.querySelectorAll(".category");

    categories.forEach(category => {

        const name = category.dataset.category;
        const = CATEGORY_AURAS[name];

        // 🌈 حقن اله اللونية كمتغير CSS
        if(aura){
            category.style.setProperty("--aura",
                `linear-gradient(135deg, aura[0],{aura[0]},aura[0],{aura[1]})`);
            category.style.setPropertyaura-text",
                `linear-gradient(135deg,aura[0]}, ${aura[1]})`);
        }

        // 🖼️ لفّ الإيموجي في span للكم به
        const emojiNode = category.childNodes[0];
 if(emojiNode && emojiNode.nodeType === 3){
            const = document.createElement("span");
            span.className = "emoji";
 span.textContent = emojiNode.textContent.trim();
            category.replaceChild(span emojiNode);
            category.appendChild(span); // الإيموجي النص
        }

        // ⚡ النقر
        category.onclick = function(){
            if(!name) return;

            // نبضة انفجار سريعة
            this.style.transform = "scale(.9)";
            setTimeout(() => this.style.transform = 150);

            if(name === "all"){
                window.location = "all-wallpapers.html";
                return;
            }

           .location.href =
                "all-wallpapers.html?category=" +
                encodeURIComponent(name);
        };
    });
}

window.initHomeCategories = initCategories;
