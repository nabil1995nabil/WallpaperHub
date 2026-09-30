// WallpaperHub - Reference Liquid Bottom Navigation
(function(){
    const bottomNav = document.querySelector(".bottom-nav");
    if(!bottomNav) return;

    const items = Array.from(bottomNav.querySelectorAll(".nav-item"));

    function setActive(index){
        items.forEach((item,i)=>{
            const active = i === index;
            item.classList.toggle("active", active);
            item.setAttribute("aria-current", active ? "page" : "false");
        });

        bottomNav.style.setProperty("--index", index);
    }

    function getCurrentIndex(){
        const current = location.pathname.split("/").pop() || "home.html";
        const index = items.findIndex(item => item.dataset.page === current);
        return index >= 0 ? index : 0;
    }

    items.forEach((item,index)=>{
        item.addEventListener("click",()=>{
            setActive(index);

            const page = item.dataset.page;
            if(page && !location.pathname.endsWith(page)){
                window.location.href = page;
            }
        });
    });

    setActive(getCurrentIndex());
})();
