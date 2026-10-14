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

        !sideDrawer.classList.contains("show")

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

        sideDrawer.classList.contains("show")

        &&

        distance > 80

    ){

        closeDrawer();

    }



},
{passive:true});



}

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

  document.addEventListener("DOMContentLoaded",()=>{
    ensureBadgeNodes();
    refreshSectionBadges();
    markCurrentSectionRead();
    if(refreshTimer) clearInterval(refreshTimer);
    refreshTimer=setInterval(refreshSectionBadges,30000);
  });
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
  // Sidebar HTML is injected asynchronously, so recreate badges after injection.
  new MutationObserver(()=>{ensureBadgeNodes();}).observe(document.documentElement,{childList:true,subtree:true});
  window.refreshWallpaperHubSectionBadges=refreshSectionBadges;
})(); 
