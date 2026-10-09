import { supabase } from "./supabase.js";
(() => {
  const sectionForPath = () => {
    const file = (location.pathname.split("/").pop() || "").toLowerCase();
    if (file === "community.html") return "community";
    if (file === "community-appeal.html" || file === "contact.html") return "contact";
    return "";
  };
  async function getSession(){
    const {data,error}=await supabase.auth.getSession();
    if(error) throw error;
    return data?.session || null;
  }
  function setDot(el, visible){
    if(!el) return;
    el.classList.toggle("has-unread",Boolean(visible));
  }
  function addDot(link){
    if(link && !link.querySelector(".section-unread-dot")){
      const dot=document.createElement("span");
      dot.className="section-unread-dot";
      dot.setAttribute("aria-hidden","true");
      link.appendChild(dot);
    }
  }
  function updateBadges(counts){
    const states={
      notice:Number(counts?.notice||0)>0,
      community:Number(counts?.community||0)>0,
      contact:Number(counts?.contact||0)>0
    };
    setDot(document.getElementById("menuBtn"),states.notice||states.community||states.contact);
    document.querySelectorAll('[data-badge-section]').forEach(link=>{
      const key=link.dataset.badgeSection;
      addDot(link);
      setDot(link,Boolean(states[key]));
    });
  }
  async function loadBadges(){
    try{
      const session=await getSession();
      if(!session?.access_token){updateBadges({});return;}
      const response=await fetch("/api/section-badges",{
        cache:"no-store",headers:{Authorization:`Bearer ${session.access_token}`}
      });
      if(!response.ok) throw new Error(`BADGE_API_${response.status}`);
      const data=await response.json();
      updateBadges(data?.counts||{});
    }catch(error){console.warn("SECTION BADGES:",error?.message||error);}
  }
  async function markSectionVisited(section){
    if(!section)return;
    try{
      const session=await getSession();
      if(!session?.access_token)return;
      const response=await fetch(`/api/section-badges/${encodeURIComponent(section)}/read`,{
        method:"PATCH",cache:"no-store",headers:{Authorization:`Bearer ${session.access_token}`}
      });
      if(!response.ok)throw new Error(`MARK_SECTION_${response.status}`);
    }catch(error){console.warn("MARK SECTION VISITED:",error?.message||error);}
    finally{setTimeout(loadBadges,250);}
  }
  function boot(){
    const section=sectionForPath();
    if(section)markSectionVisited(section);
    loadBadges();
    window.addEventListener("focus",loadBadges);
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)loadBadges();});
    window.addEventListener("wallpaperhub:notifications-updated",loadBadges);
    window.setInterval(loadBadges,30000);
    const observer=new MutationObserver(()=>loadBadges());
    observer.observe(document.documentElement,{childList:true,subtree:true});
    window.setTimeout(()=>observer.disconnect(),12000);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
