import { supabase } from "./supabase.js";

// Count only server-confirmed foreground activity. The server awards 0.25 points
// for each completed 10-minute active session; no client-supplied duration is trusted.
(function startWallpaperHubActiveRewards(){
    if(window.__wallpaperHubActiveRewardTrackerStarted) return;
    window.__wallpaperHubActiveRewardTrackerStarted = true;

    let timer = null;
    let requestInProgress = false;
    const HEARTBEAT_MS = 60 * 1000;

    function isActivelyViewing(){
        return document.visibilityState === "visible" && document.hasFocus();
    }

    async function heartbeat(){
        if(requestInProgress || !isActivelyViewing()) return;
        requestInProgress = true;
        try{
            const {data,error} = await supabase.auth.getSession();
            const token = data?.session?.access_token;
            if(error || !token) return;

            const response = await fetch("/api/rewards/activity-heartbeat",{
                method:"POST",
                headers:{
                    Authorization:"Bearer " + token,
                    "Content-Type":"application/json"
                },
                body:"{}",
                cache:"no-store"
            });
            const result = await response.json().catch(()=>({}));
            if(!response.ok || !result.success) return;

            if(Number(result.awarded) > 0){
                const points = Number(result.points || 0);
                window.dispatchEvent(new CustomEvent("wallpaperHubPointsChanged",{
                    detail:{source:"active_time",points}
                }));
                if(typeof window.showToast === "function"){
                    window.showToast("مبروك! حصلت على " + points.toFixed(2) + " نقطة مقابل نشاطك.");
                }
            }
        }catch(error){
            console.warn("ACTIVE TIME HEARTBEAT ERROR:",error?.message || error);
        }finally{
            requestInProgress = false;
        }
    }

    function start(){
        if(timer) clearInterval(timer);
        if(isActivelyViewing()) heartbeat();
        timer = setInterval(heartbeat,HEARTBEAT_MS);
    }

    document.addEventListener("visibilitychange",()=>{
        if(document.visibilityState === "visible") heartbeat();
    });
    window.addEventListener("focus",heartbeat);
    window.addEventListener("pageshow",start);
    window.addEventListener("pagehide",()=>{
        if(timer){clearInterval(timer);timer=null;}
    });

    start();
})();
