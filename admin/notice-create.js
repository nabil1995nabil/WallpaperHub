import { supabase } from "../supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
    const form=document.getElementById("create-ad-form");
    const adsContainer=document.getElementById("ads-container");
    const statTotal=document.getElementById("stat-total");
    const statViews=document.getElementById("stat-views");
    const statInteractions=document.getElementById("stat-interactions");
    const fileInput=document.getElementById("ad-file");
    const fileNamePreview=document.getElementById("file-preview-name");
    const publishBtn=document.getElementById("publish-btn");

    let uploadedImageBase64="";
    let editingAnnouncementId=null;
    let announcements=[];

    function esc(v){
        return String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
    }

    async function getSession(){
        const {data,error}=await supabase.auth.getSession();
        if(error || !data?.session){
            sessionStorage.setItem("wallpaperhub_admin_return",location.pathname);
            location.href="/profile.html";
            return null;
        }
        const s=data.session;
        const r=await fetch("/api/admin/me",{headers:{Authorization:`Bearer ${s.access_token}`},cache:"no-store"});
        const d=await r.json().catch(()=>({}));
        if(!r.ok || !d.isAdmin){
            alert("هذا الحساب لا يملك صلاحية الأدمن.");
            location.href="/profile.html";
            return null;
        }
        return s;
    }

    function ensureBar(session){
        const bar=document.createElement("div");
        bar.className="admin-page-bar";
        bar.innerHTML=`
          <a class="admin-page-home" href="admin.html">🏠 لوحة التحكم</a>
          <div class="admin-page-account">
            <span class="admin-page-online">● متصل</span>
            <div class="admin-page-avatar" id="adminPageAvatar"></div>
            <div class="admin-page-user"><strong id="adminPageName"></strong><small id="adminPageEmail"></small></div>
            <button id="adminPageLogout" type="button">🚪 خروج</button>
          </div>`;
        document.body.prepend(bar);
        const u=session.user,m=u.user_metadata||{},name=m.full_name||m.name||m.user_name||u.email?.split("@")[0]||"المدير";
        const avatar=m.avatar_url||m.picture||m.avatar||"";
        document.getElementById("adminPageName").textContent=name;
        document.getElementById("adminPageEmail").textContent=u.email||"";
        document.getElementById("adminPageAvatar").innerHTML=avatar?`<img src="${esc(avatar)}" alt="">`:`<span>${esc(name[0]||"W")}</span>`;
        document.getElementById("adminPageLogout").onclick=async()=>{await supabase.auth.signOut({scope:"local"});location.href="/profile.html";};
    }

    function updateCounter(){
        statTotal.textContent=announcements.length;
        statViews.textContent=announcements.reduce((s,a)=>s+Number(a.views||0),0);
        statInteractions.textContent=announcements.reduce((s,a)=>s+Number(a.likes||0),0);
    }

    function renderAds(){
        adsContainer.innerHTML="";
        if(!announcements.length){
            adsContainer.innerHTML='<div class="empty-ads">لا توجد إعلانات منشورة حاليا.</div>';
            updateCounter(); return;
        }
        const fragment=document.createDocumentFragment();
        announcements.forEach(ad=>{
            const item=document.createElement("article");
            item.className="ad-item";
            item.innerHTML=`
              <img class="ad-thumb" loading="lazy" src="${esc(ad.image||"https://picsum.photos/120/120")}" alt="">
              <div class="ad-details">
                <h4>${esc(ad.title||"بدون عنوان")}</h4>
                <p>${esc(ad.content||"")}</p>
                <span class="ad-date">${esc(ad.date||"الآن")}</span>
              </div>
              <div class="ad-actions">
                <button class="action-btn edit" type="button">✏️</button>
                <button class="action-btn delete" type="button">🗑️</button>
              </div>`;
            item.querySelector(".edit").onclick=()=>editAdvertisement(ad);
            item.querySelector(".delete").onclick=()=>deleteAdvertisement(ad.id,item);
            fragment.appendChild(item);
        });
        adsContainer.appendChild(fragment);
        updateCounter();
    }

    async function loadAds(session){
        try{
            const r=await fetch("/api/admin/announcements",{headers:{Authorization:`Bearer ${session.access_token}`},cache:"no-store"});
            const raw=await r.text(); const data=raw?JSON.parse(raw):[];
            if(!r.ok) throw new Error(data?.message||data?.error||`HTTP ${r.status}`);
            announcements=Array.isArray(data)?data:[];
            renderAds();
        }catch(e){
            console.error(e);
            adsContainer.innerHTML='<div class="empty-ads">تعذر تحميل الإعلانات. حاول تحديث الصفحة.</div>';
        }
    }

    async function deleteAdvertisement(id,item){
        if(!confirm("هل تريد حذف هذا الإعلان؟")) return;
        try{
            const r=await fetch(`/api/admin/announcements/${encodeURIComponent(id)}`,{
                method:"DELETE",headers:{Authorization:`Bearer ${window._adminSession.access_token}`}
            });
            const d=await r.json().catch(()=>({}));
            if(!r.ok||!d.success) throw new Error(d.message||d.error||"فشل الحذف");
            announcements=announcements.filter(a=>String(a.id)!==String(id));
            renderAds();
        }catch(e){alert(e.message||"فشل حذف الإعلان");}
    }

    function editAdvertisement(ad){
        document.getElementById("ad-title").value=ad.title||"";
        document.getElementById("ad-category").value=ad.type||ad.category||"admin";
        document.getElementById("ad-content").value=ad.content||"";
        document.getElementById("ad-image").value=ad.image&&/^https?:\/\//i.test(ad.image)?ad.image:"";
        uploadedImageBase64="";
        editingAnnouncementId=ad.id;
        publishBtn.textContent="💾 حفظ التعديل";
        form.scrollIntoView({behavior:"smooth",block:"start"});
    }

    if(fileInput){
        fileInput.addEventListener("change",e=>{
            const file=e.target.files?.[0];
            if(!file){uploadedImageBase64="";fileNamePreview.textContent="";return;}
            if(!file.type.startsWith("image/")){alert("يرجى اختيار صورة.");fileInput.value="";return;}
            fileNamePreview.textContent="تم اختيار: "+file.name;
            const reader=new FileReader();
            reader.onload=ev=>uploadedImageBase64=ev.target.result;
            reader.readAsDataURL(file);
        });
    }

    const session=await getSession();
    if(!session) return;
    window._adminSession=session;
    ensureBar(session);
    await loadAds(session);

    form?.addEventListener("submit",async e=>{
        e.preventDefault();
        const title=document.getElementById("ad-title").value.trim();
        const category=document.getElementById("ad-category").value;
        const content=document.getElementById("ad-content").value.trim();
        const urlImage=document.getElementById("ad-image").value.trim();
        const image=uploadedImageBase64||urlImage||"https://picsum.photos/600/300";
        if(!title||!content){alert("أدخل عنوان الإعلان ومحتواه أولًا.");return;}
        publishBtn.disabled=true;
        publishBtn.textContent=editingAnnouncementId?"جاري حفظ التعديل...":"جاري النشر...";
        try{
            const url=editingAnnouncementId?`/api/admin/notifications/${encodeURIComponent(editingAnnouncementId)}`:"/api/admin/announcements";
            const method=editingAnnouncementId?"PUT":"POST";
            const r=await fetch(url,{method,headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({title,category,content,image})});
            const raw=await r.text(); const d=raw?JSON.parse(raw):{};
            if(!r.ok||!d.success) throw new Error(d.message||d.error||`HTTP ${r.status}`);
            alert(editingAnnouncementId?"تم تعديل الإعلان":"تم نشر الإعلان");
            form.reset(); uploadedImageBase64=""; fileNamePreview.textContent=""; editingAnnouncementId=null;
            publishBtn.textContent="🚀 نشر الإعلان";
            await loadAds(session);
        }catch(e){console.error(e);alert("تعذر حفظ الإعلان: "+(e.message||"خطأ غير معروف"));publishBtn.textContent=editingAnnouncementId?"💾 حفظ التعديل":"🚀 نشر الإعلان";}
        finally{publishBtn.disabled=false;}
    });
});
