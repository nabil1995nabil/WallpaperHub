(function(){
    "use strict";
    if(document.getElementById("whAiHelpLauncher"))return;
    const path=window.location.pathname.toLowerCase();
    const page=(path.split("/").pop()||"home.html").toLowerCase();
    const excluded=["ai.html","today.html","login.html","register.html","admin.html","admin-login.html"];
    if(excluded.includes(page)||path.startsWith("/admin/"))return;

    const link=document.createElement("a");
    link.id="whAiHelpLauncher";
    link.className="wh-ai-help-launcher";
    link.href="/ai.html?from="+encodeURIComponent(page);
    link.setAttribute("aria-label","اسأل مساعد WallpaperHub عن هذه الصفحة");
    link.title="مساعدة هذه الصفحة";
    const icon=document.createElement("span");
    icon.className="wh-ai-help-icon";
    icon.setAttribute("aria-hidden","true");
    icon.textContent="✦";
    const label=document.createElement("span");
    label.className="wh-ai-help-label";
    label.textContent="مساعدة ذكية";
    link.append(icon,label);
    document.body.appendChild(link);

    function syncPosition(){
        const hasBottomNav=Boolean(document.querySelector("#bottomNav .bottom-nav,.bottom-nav,#nav20D"));
        link.classList.toggle("above-bottom-nav",hasBottomNav);
    }
    syncPosition();
    if(document.readyState==="loading"){
        document.addEventListener("DOMContentLoaded",syncPosition,{once:true});
    }
    const observer=new MutationObserver(syncPosition);
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener("resize",syncPosition,{passive:true});
})();