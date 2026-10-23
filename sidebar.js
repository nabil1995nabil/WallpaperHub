// ======================
// Load Sidebar HTML
// ======================

fetch("sidebar.html")
.then(response => response.text())
.then(data => {

    const container =
    document.getElementById("sidebar-container");


    if(container){

        container.innerHTML = data;

    }


    initSidebar();

})
.catch(error => {

    console.error(
        "Sidebar loading error:",
        error
    );

});





// ======================
// Side Drawer
// ======================


function initSidebar(){


const menuBtn =
document.getElementById("menuBtn");


const sideDrawer =
document.getElementById("sideDrawer");


const drawerOverlay =
document.getElementById("drawerOverlay");


const drawerClose =
document.getElementById("drawerClose");


const aiFab =
document.getElementById("aiFab");




function openDrawer(){


    if(menuBtn){

        menuBtn.classList.add("active");

    }


    if(sideDrawer){

        sideDrawer.classList.add("show");

    }


    if(drawerOverlay){

        drawerOverlay.classList.add("show");

    }


    document.body.classList.add(
        "drawer-open"
    );



    if(aiFab){

        aiFab.classList.add(
            "drawer-open"
        );

    }


}





function closeDrawer(){


    if(sideDrawer){

        sideDrawer.classList.remove(
            "show"
        );

    }



    if(drawerOverlay){

        drawerOverlay.classList.remove(
            "show"
        );

    }



    document.body.classList.remove(
        "drawer-open"
    );



    if(menuBtn){

        menuBtn.classList.remove(
            "active"
        );

    }



    if(aiFab){

        aiFab.classList.remove(
            "drawer-open"
        );

    }


}






// ======================
// Button Open
// ======================


if(menuBtn){


    menuBtn.onclick = () => {


        openDrawer();


    };


}





// ======================
// Close Button
// ======================


if(drawerClose){


    drawerClose.onclick =
    closeDrawer;


}





// ======================
// Overlay Close
// ======================


if(drawerOverlay){


    drawerOverlay.onclick =
    closeDrawer;


}







// ======================
// Swipe Control
// ======================


let touchStartX = 0;


document.addEventListener(
"touchstart",
function(e){


    touchStartX =
    e.touches[0].clientX;


},
{passive:true});





document.addEventListener(
"touchend",
function(e){


    let touchEndX =
    e.changedTouches[0].clientX;


    let distance =
    touchEndX - touchStartX;



    // فتح من اليمين

    if(

        sideDrawer && !sideDrawer.classList.contains("show")

        &&

        touchStartX >
        window.innerWidth - 50

        &&

        distance < -70

    ){

        openDrawer();

    }





    // إغلاق بالسحب لليمين


    if(

        sideDrawer && sideDrawer.classList.contains("show")

        &&

        distance > 80

    ){

        closeDrawer();

    }



},
{passive:true});



}


// Publishing shortcut: show a subtle red X when the signed-in user is banned.
(function(){
  const STATUS_API = "/api/publish/moderation/me";
  let requestId = 0;
  let lastToken = "";
  let refreshBusy = false;

  function getSessionToken(){
    // Supabase sessions are normally in localStorage; also check sessionStorage
    // for projects configured to keep sessions only for the current tab.
    for (const storageName of ["localStorage", "sessionStorage"]) {
      try {
        const storage = window[storageName];
        for(let i=0;i<storage.length;i++){
          const key=storage.key(i)||"";
          if(!key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
          const raw=storage.getItem(key);
          if(!raw) continue;
          const session=JSON.parse(raw);
          const token=String(session?.access_token || session?.currentSession?.access_token || "").trim();
          if(token) return token;
        }
      } catch(error) {
        console.warn("PUBLISH BAN SESSION ERROR:",error);
      }
    }
    return "";
  }

  function setPublishVisibility(link, signedIn){
    if(!link) return;
    // Inline display prevents sidebar CSS from accidentally overriding the hidden state.
    link.style.display = signedIn ? "" : "none";
    link.setAttribute("aria-hidden", signedIn ? "false" : "true");
    link.tabIndex = signedIn ? 0 : -1;
    if(!signedIn){
      link.dataset.publishBanChecked = "false";
      link.dataset.publishBanned = "false";
      link.classList.remove("is-publish-banned");
      const bubble=link.querySelector(".publish-ban-bubble");
      if(bubble){
        bubble.classList.remove("is-visible");
        bubble.textContent="";
      }
    }
  }

  function formatUntil(value){
    const date = new Date(value);
    if(!Number.isFinite(date.getTime())) return "";
    try{
      return new Intl.DateTimeFormat("ar-MA",{
        year:"numeric",month:"2-digit",day:"2-digit",
        hour:"2-digit",minute:"2-digit",second:"2-digit",
        hour12:false
      }).format(date);
    }catch(_){ return date.toLocaleString(); }
  }

  function getBubble(link){
    let bubble = link.querySelector(".publish-ban-bubble");
    if(!bubble){
      bubble = document.createElement("span");
      bubble.className = "publish-ban-bubble";
      bubble.setAttribute("role","status");
      bubble.setAttribute("aria-live","polite");
      link.appendChild(bubble);
    }
    return bubble;
  }

  function render(link, state){
    if(!link) return;
    const banned = Boolean(state?.banned);
    link.classList.toggle("is-publish-banned", banned);
    link.dataset.publishBanned = banned ? "true" : "false";
    const svg = link.querySelector("svg");
    if(svg){
      if(banned){
        svg.innerHTML = '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>';
        svg.setAttribute("viewBox","0 0 24 24");
      }else{
        svg.innerHTML = '<path d="M12 3v12"></path><path d="m7 8 5-5 5 5"></path><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"></path>';
        svg.setAttribute("viewBox","0 0 24 24");
      }
    }
    link.setAttribute("aria-label", banned ? "أنت محظور من نشر الخلفيات؛ اضغط لمعرفة السبب" : "الانتقال إلى نشر الخلفيات");
    link.title = banned ? "تم منعك من نشر الخلفيات" : "نشر الخلفيات";

    const bubble = getBubble(link);
    if(!banned){
      bubble.classList.remove("is-visible");
      bubble.textContent = "";
      return;
    }
    let message = "تم حظرك من نشر الخلفيات";
    if(state.permanent){
      message += " — الحظر دائم";
    }else if(state.until){
      message += " حتى " + formatUntil(state.until);
    }
    if(state.reason) message += " · السبب: " + String(state.reason);
    bubble.textContent = message;
  }

  async function refresh(){
    if(refreshBusy) return;
    const link = document.querySelector(".drawer-publish-link");
    if(!link) return;
    const token = getSessionToken();
    if(!token){
      requestId++;
      lastToken = "";
      setPublishVisibility(link,false);
      render(link,{banned:false});
      return;
    }

    // A signed-in visitor can see the shortcut; server status decides whether
    // it behaves as a normal publish link or a red-X ban notice.
    setPublishVisibility(link,true);
    if(token === lastToken && link.dataset.publishBanChecked === "true") return;
    lastToken = token;
    const currentRequest = ++requestId;
    refreshBusy = true;
    try{
      const response = await fetch(STATUS_API,{
        headers:{Authorization:"Bearer "+token},
        cache:"no-store"
      });
      if(currentRequest !== requestId) return;
      if(response.status === 401){
        setPublishVisibility(link,false);
        render(link,{banned:false});
        link.dataset.publishBanChecked = "false";
        lastToken = "";
        return;
      }
      if(!response.ok) throw new Error("PUBLISH_BAN_STATUS_"+response.status);
      const data = await response.json();
      if(currentRequest !== requestId) return;
      render(link,data);
      link.dataset.publishBanChecked = "true";
    }catch(error){
      // Do not falsely mark the user as banned if the status service is temporarily unavailable.
      console.warn("PUBLISH BAN STATUS ERROR:",error);
    }finally{
      refreshBusy = false;
    }
  }

  document.addEventListener("click",event=>{
    const link = event.target.closest(".drawer-publish-link");
    if(link && link.dataset.publishBanned === "true"){
      event.preventDefault();
      event.stopPropagation();
      const bubble = getBubble(link);
      bubble.classList.toggle("is-visible");
      return;
    }
    document.querySelectorAll(".publish-ban-bubble.is-visible").forEach(bubble=>{
      if(!bubble.closest(".drawer-publish-link")?.contains(event.target)){
        bubble.classList.remove("is-visible");
      }
    });
  });

  function startPublishBanRefresh(){ refresh(); }
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded",startPublishBanRefresh,{once:true});
  }else{
    startPublishBanRefresh();
  }
  // Refresh modestly; auth/storage/focus events handle immediate changes.
  window.setInterval(refresh,15000);
  window.addEventListener("focus",refresh);
  window.addEventListener("storage",event=>{
    if(!event.key || event.key.startsWith("sb-")) {
      lastToken = "";
      refresh();
    }
  });
  const publishLinkObserver = new MutationObserver(()=>{
    const link = document.querySelector(".drawer-publish-link");
    if(link){
      publishLinkObserver.disconnect();
      refresh();
    }
  });
  if(!document.querySelector(".drawer-publish-link")){
    publishLinkObserver.observe(document.documentElement,{childList:true,subtree:true});
  }
  window.refreshPublishBanShortcut = ()=>{ lastToken=""; return refresh(); };
})();

// Shared section badges: sidebar links + hamburger indicator.
(function(){
  const SECTION_API = "/api/section-badges";
  let refreshTimer = null;
  let busy = false;

  function getAccessToken(){
    try{
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i)||"";
        if(!key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
        const raw=localStorage.getItem(key);
        if(!raw) continue;
        const session=JSON.parse(raw);
        const token=String(session?.access_token || session?.currentSession?.access_token || "").trim();
        if(token) return token;
      }
    }catch(error){ console.warn("SECTION BADGE SESSION ERROR:",error); }
    return "";
  }

  function injectBadgeStyles(){
    if(document.getElementById("wh-section-badge-styles")) return;
    const style=document.createElement("style");
    style.id="wh-section-badge-styles";
    style.textContent=`
      .drawer-menu a[data-badge-section]{position:relative}
      .section-unread-dot{display:none!important;width:8px;height:8px;min-width:8px;border-radius:50%;background:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.12);margin-inline-start:auto;flex:0 0 8px}
      .section-unread-dot.is-visible{display:inline-block!important}
      #menuBtn{position:relative}
      #menuBtn .menu-unread-dot{position:absolute;top:3px;right:3px;width:9px;height:9px;border-radius:50%;background:#ef4444;border:2px solid var(--bg,#fff);box-shadow:0 0 0 2px rgba(239,68,68,.10);display:none;pointer-events:none}
      #menuBtn .menu-unread-dot.is-visible{display:block}
    `;
    document.head.appendChild(style);
  }

  function ensureBadgeNodes(){
    injectBadgeStyles();
    document.querySelectorAll('.drawer-menu a[data-badge-section]').forEach(link=>{
      if(!link.querySelector('.section-unread-dot')){
        const dot=document.createElement('span');
        dot.className='section-unread-dot';
        dot.setAttribute('aria-hidden','true');
        link.appendChild(dot);
      }
    });
    const menuBtn=document.getElementById("menuBtn");
    if(menuBtn && !menuBtn.querySelector(".menu-unread-dot")){
      const dot=document.createElement("span");
      dot.className="menu-unread-dot";
      dot.setAttribute("aria-hidden","true");
      menuBtn.appendChild(dot);
    }
  }

  function setDot(section, visible){
    document.querySelectorAll(`.drawer-menu a[data-badge-section="${section}"] .section-unread-dot`)
      .forEach(dot=>dot.classList.toggle("is-visible",!!visible));
  }

  function applyCounts(counts){
    const notice=Number(counts?.notice||0)>0;
    const community=Number(counts?.community||0)>0;
    const contact=Number(counts?.contact||0)>0;
    setDot("notice",notice);
    setDot("community",community);
    setDot("contact",contact);
    const menuDot=document.querySelector("#menuBtn .menu-unread-dot");
    if(menuDot) menuDot.classList.toggle("is-visible",notice||community||contact);
  }

  async function refreshSectionBadges(){
    if(busy) return;
    const token=getAccessToken();
    if(!token){ applyCounts({}); return; }
    busy=true;
    try{
      const response=await fetch(SECTION_API,{headers:{Authorization:"Bearer "+token},cache:"no-store"});
      if(response.status===401){ applyCounts({}); return; }
      if(!response.ok) throw new Error("SECTION_BADGES_"+response.status);
      const data=await response.json();
      applyCounts(data?.counts||{});
    }catch(error){
      console.warn("SECTION BADGES LOAD ERROR:",error);
    }finally{busy=false;}
  }

  async function markSectionRead(section){
    const token=getAccessToken();
    if(!token) return;
    try{
      const response=await fetch(`${SECTION_API}/${encodeURIComponent(section)}/read`,{
        method:"PATCH",
        headers:{Authorization:"Bearer "+token}
      });
      if(response.ok){
        if(section==="community") setDot("community",false);
        if(section==="contact") setDot("contact",false);
        await refreshSectionBadges();
      }
    }catch(error){ console.warn("SECTION READ STATE ERROR:",error); }
  }

  function markCurrentSectionRead(){
    const page=(location.pathname.split("/").pop()||"").toLowerCase();
    if(page==="community.html") markSectionRead("community");
    if(page==="community-appeal.html") markSectionRead("contact");
  }

  function initializeSectionBadges(){
    ensureBadgeNodes();
    refreshSectionBadges();
    markCurrentSectionRead();
    if(refreshTimer) clearInterval(refreshTimer);
    refreshTimer=setInterval(refreshSectionBadges,30000);
  }
  let sectionBadgesInitialized = false;
  function initializeSectionBadgesOnce(){
    if(sectionBadgesInitialized) return;
    if(!document.querySelector(".drawer-menu")) return;
    sectionBadgesInitialized = true;
    initializeSectionBadges();
    sectionBadgeObserver.disconnect();
  }
  const sectionBadgeObserver = new MutationObserver(initializeSectionBadgesOnce);
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded",initializeSectionBadgesOnce,{once:true});
  }else{
    initializeSectionBadgesOnce();
  }
  if(!sectionBadgesInitialized){
    sectionBadgeObserver.observe(document.documentElement,{childList:true,subtree:true});
  }
  document.addEventListener("click",async event=>{
    const link=event.target.closest('.drawer-menu a[data-badge-section]');
    if(!link) return;
    const section=String(link.dataset.badgeSection||"");
    if(section!=="community" && section!=="contact") return;
    event.preventDefault();
    setDot(section,false);
    const href=link.getAttribute("href");
    await markSectionRead(section);
    if(href && href!=="#") window.location.href=href;
  });

  window.addEventListener("focus",refreshSectionBadges);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible") refreshSectionBadges();});
  window.addEventListener("storage",e=>{if(e.key && e.key.startsWith("sb-")) refreshSectionBadges();});
  window.refreshWallpaperHubSectionBadges=refreshSectionBadges;
})(); 
