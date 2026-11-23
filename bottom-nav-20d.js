// WallpaperHub — one shared, route-aware bottom navigation
(() => {
  "use strict";
  function pageName(value){
    const path=String(value||"").split(/[?#]/)[0];
    const parts=path.split("/").filter(Boolean);
    return (parts.pop()||"home.html").toLowerCase();
  }
  function initializeBottomNavigation(root=document){
    const nav=root.matches?.(".bottom-nav")?root:root.querySelector?.(".bottom-nav")||document.querySelector(".bottom-nav");
    if(!nav)return false;
    document.body?.classList.add("has-bottom-nav");
    const current=pageName(window.location.pathname);
    nav.querySelectorAll(".nav-item").forEach(item=>{
      const routes=[item.dataset.page||item.getAttribute("href")||"",...(item.dataset.pages||"").split(",")].map(pageName).filter(Boolean);
      const active=routes.includes(current)||(current==="index.html"&&routes.includes("home.html"));
      item.classList.toggle("active",active);
      if(active)item.setAttribute("aria-current","page");else item.removeAttribute("aria-current");
      const label=item.querySelector("p,small")?.textContent?.trim();
      if(label&&!item.hasAttribute("aria-label"))item.setAttribute("aria-label",label);
    });
    nav.dataset.initialized="true";
    return true;
  }
  window.initBottomNavigation=initializeBottomNavigation;
  const slot=document.getElementById("bottomNav");
  if(slot)document.body?.classList.add("has-bottom-nav");
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>initializeBottomNavigation(),{once:true});
  else initializeBottomNavigation();
  if(!document.querySelector(".bottom-nav")&&document.body){
    const observer=new MutationObserver(()=>{if(initializeBottomNavigation())observer.disconnect()});
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener("pagehide",()=>observer.disconnect(),{once:true});
  }
})();
