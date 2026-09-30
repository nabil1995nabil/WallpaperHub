import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  let currentUser = null;
  let notifications = [];
  let announcements = [];
  let realtimeChannel = null;
  let refreshTimer = null;
  let activeFilter = "all";
  let lastNotificationIds = new Set();
  let initialized = false;
  let audioUnlocked = false;

  const audio = $("#notification-audio");
  const savedSound = localStorage.getItem("notificationSound") !== "off";
  const savedBrowser = localStorage.getItem("notificationBrowser") === "on";
  const savedAuto = localStorage.getItem("notificationAutoRefresh") !== "off";

  const settings = {
    sound: savedSound,
    browser: savedBrowser,
    auto: savedAuto
  };

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }

  function formatMentionText(text) {
    return escapeHTML(text).replace(/(@[\w\u0600-\u06FF]+)/g,'<span class="mention-tag">$1</span>');
  }

  function wallpaperUrl(id) {
    const v = String(id ?? "").trim();
    return v ? `wallpaper.html?id=${encodeURIComponent(v)}` : "";
  }

  function showToast(message) {
    const t = $("#toast");
    t.textContent = message;
    t.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  function setConnection(online, text) {
    $("#live-dot").classList.toggle("offline", !online);
    $("#connection-text").textContent = text;
    $("#last-updated").textContent = online ? "متصل الآن" : "غير متصل";
  }

  function unlockAudio() {
    if (audioUnlocked || !audio) return;
    audio.volume = 0.65;
    audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
      audioUnlocked = true;
    }).catch(() => {});
  }

  ["click","touchstart","keydown"].forEach(evt => document.addEventListener(evt, unlockAudio, {once:true, passive:true}));

  async function playNotificationSound() {
    if (!settings.sound || !audio) return;
    try {
      audio.currentTime = 0;
      await audio.play();
    } catch {
      // Browser autoplay policy can block playback until user interaction.
    }
  }

  async function browserNotify(notif) {
    if (!settings.browser || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const title = notif?.userName ? `${notif.userName} لديك إشعار جديد` : "إشعار جديد من WallpaperHub";
    const body = notif?.content || "وصل إليك إشعار جديد";
    const n = new Notification(title, {body, icon:"assets/images/user.png", tag:`wh-${notif?.id || Date.now()}`});
    n.onclick = () => {
      window.focus();
      if (notif?.wallpaperId) location.href = wallpaperUrl(notif.wallpaperId);
      n.close();
    };
  }

  function isUnread(n) { return !n.is_read && !n.read; }
  function typeCategory(type) {
    if (type === "wallpaper_like" || type === "comment_like") return "like";
    if (type === "wallpaper_comment") return "comment";
    if (type === "wallpaper_mention") return "mention";
    return "other";
  }

  function searchable(n) {
    return `${n.userName||""} ${n.content||""} ${n.commentText||""} ${n.wallpaperTitle||""} ${n.type||""}`.toLowerCase();
  }

  function renderNotificationCard(notif) {
    const type = String(notif.type || "");
    const wallpaperId = escapeHTML(notif.wallpaperId || "");
    const wallpaperTitle = escapeHTML(notif.wallpaperTitle || "الخلفية");
    const avatar = escapeHTML(notif.avatar || "assets/images/user.png");
    const content = escapeHTML(notif.content || "");
    const commentText = escapeHTML(notif.commentText || "");
    const date = escapeHTML(notif.date || "الآن");
    const userName = escapeHTML(notif.userName || "مستخدم");

    let category, badge, indicator, quote = "";
    if (type === "wallpaper_like") { category="like"; badge="❤️"; indicator="like-indicator"; }
    else if (type === "comment_like") { category="like"; badge="❤️"; indicator="like-indicator"; quote=`<div class="comment-quote">"${commentText}"</div>`; }
    else if (type === "wallpaper_comment") { category="comment"; badge="💬"; indicator=""; quote=`<div class="comment-quote">💬 ${commentText || "تعليق جديد"}</div>`; }
    else if (type === "wallpaper_mention") { category="mention"; badge="@"; indicator="mention-indicator"; quote=`<div class="comment-quote mention-comment">💬 ${formatMentionText(notif.commentText || "تمت الإشارة إليك في تعليق")}</div>`; }
    else return null;

    const contentHTML = type === "wallpaper_mention"
      ? formatMentionText(content || "أشار إليك في تعليق")
      : (content || (type==="wallpaper_comment" ? "علق على خلفيتك" : type==="comment_like" ? "أعجب بتعليقك" : "أعجب بخلفيتك"));

    return {
      category,
      html: `
        <div class="card-side-indicator ${indicator}"></div>
        <div class="avatar-container">
          <img src="${avatar}" class="avatar" loading="lazy" onerror="this.src='assets/images/user.png'">
          <span class="type-badge ${category==="like"?"like":category==="comment"?"comment-badge":"mention-badge"}">${badge}</span>
        </div>
        <div class="notif-body">
          <p class="notif-text"><strong>${userName}</strong> ${contentHTML}</p>
          ${quote}
          <button type="button" class="notification-wallpaper-btn" data-wallpaper-id="${wallpaperId}">
            <span class="material-icons" style="vertical-align:middle;font-size:15px">wallpaper</span>
            فتح الخلفية
            <span>${wallpaperTitle}</span>
          </button>
          <div class="notif-meta">${date}</div>
        </div>
        <button class="card-check-read" type="button" title="تحديد كمقروء" aria-label="تحديد كمقروء">
          <span class="material-icons">done</span>
        </button>`
    };
  }

  function render() {
    const feed = $("#userNotificationsFeed");
    const annFeed = $("#announcementsFeed");
    const empty = $("#empty-state");
    const q = ($("#notification-search").value || "").trim().toLowerCase();

    feed.innerHTML = "";
    annFeed.innerHTML = "";

    let shown = 0;
    const filtered = notifications.filter(n => {
      const cat = typeCategory(n.type);
      const okFilter = activeFilter === "all" || (activeFilter === "unread" ? isUnread(n) : cat === activeFilter);
      return okFilter && (!q || searchable(n).includes(q));
    });

    filtered.forEach(n => {
      const rendered = renderNotificationCard(n);
      if (!rendered) return;
      const card = document.createElement("article");
      card.className = `notif-card ${isUnread(n) ? "unread" : ""}`;
      card.dataset.notificationId = String(n.id || "");
      card.dataset.category = rendered.category;
      card.dataset.wallpaperId = String(n.wallpaperId || "");
      card.innerHTML = rendered.html;
      feed.appendChild(card);
      shown++;
    });

    const showAnnouncements = activeFilter === "all" || activeFilter === "admin";
    if (showAnnouncements && !q) {
      announcements.forEach(ad => {
        const card = document.createElement("article");
        card.className = "notif-card admin-post";
        card.dataset.category = "admin";
        card.innerHTML = `
          <div class="card-side-indicator" style="background:#7c3aed"></div>
          <div class="admin-header">
            <div class="avatar-container">
              <div class="avatar gold-border admin-avatar">📢</div>
              <span class="type-badge admin">📢</span>
            </div>
            <div class="admin-info">
              <div class="admin-name">WallpaperHub <span class="verified-badge">✓</span></div>
              <span class="time">${escapeHTML(ad.date || "الآن")}</span>
            </div>
          </div>
          <div class="broadcast-content">
            <h3 class="post-title">${escapeHTML(ad.title || "إعلان")}</h3>
            <p class="post-text">${escapeHTML(ad.content || "")}</p>
            ${ad.image ? `<div class="post-media-container"><img src="${escapeHTML(ad.image)}" class="post-image" loading="lazy"></div>` : ""}
          </div>
          <div class="admin-actions">
            <button type="button" class="copy-announcement"><span class="material-icons">content_copy</span> نسخ النص</button>
          </div>`;
        annFeed.appendChild(card);
        shown++;
      });
    }

    $("#visible-count").textContent = String(shown);
    updateUnread();
    empty.hidden = shown !== 0;

    if (!shown) {
      $("#empty-title").textContent = q ? "لا توجد نتائج" : activeFilter === "unread" ? "أنت على اطلاع كامل" : "لا توجد إشعارات";
      $("#empty-text").textContent = q ? "جرّب كلمة أخرى أو امسح البحث." : "عندما يصلك شيء جديد، سيظهر هنا.";
    }
  }

  function updateUnread() {
    const count = notifications.filter(isUnread).length;
    $("#unread-count").textContent = String(count);
    $("#unread-tab-count").textContent = String(count);
    $("#header-summary").textContent = count ? `لديك ${count} إشعار غير مقروء` : "أنت على اطلاع بكل جديد";
  }

  async function getSession() {
    const {data,error} = await supabase.auth.getSession();
    if (error) throw error;
    return data?.session || null;
  }

  async function loadAnnouncements() {
    try {
      const r = await fetch("/api/announcements", {cache:"no-store"});
      if (!r.ok) throw new Error("ANNOUNCEMENTS_API");
      const data = await r.json();
      announcements = Array.isArray(data) ? data : [];
      setConnection(true, "متصل ومزامن");
      render();
    } catch (e) {
      console.warn("ANNOUNCEMENTS ERROR:", e);
    }
  }

  async function loadUserNotifications({checkNew=true}={}) {
    try {
      const session = await getSession();
      currentUser = session?.user || null;
      if (!currentUser) {
        notifications = [];
        render();
        setConnection(false, "سجل الدخول لرؤية إشعاراتك");
        return;
      }

      const r = await fetch("/api/notifications", {
        cache:"no-store",
        headers:{Authorization:`Bearer ${session.access_token}`}
      });
      if (!r.ok) throw new Error(`NOTIFICATIONS_API_${r.status}`);
      const data = await r.json();
      const next = Array.isArray(data) ? data : [];

      if (checkNew && initialized) {
        const fresh = next.filter(n => n.id && !lastNotificationIds.has(String(n.id)));
        if (fresh.length) {
          await playNotificationSound();
          if (fresh[0]) await browserNotify(fresh[0]);
          showToast(fresh.length === 1 ? "🔔 وصل إشعار جديد" : `🔔 وصل ${fresh.length} إشعارات جديدة`);
        }
      }

      notifications = next;
      lastNotificationIds = new Set(notifications.map(n => String(n.id)));
      initialized = true;
      setConnection(true, "مزامنة مباشرة");
      render();
    } catch (e) {
      console.error("USER NOTIFICATIONS ERROR:", e);
      setConnection(false, "تعذر مزامنة الإشعارات");
      if (!notifications.length) render();
    }
  }

  async function markRead(card) {
    const id = String(card?.dataset?.notificationId || "").trim();
    if (!id || !card.classList.contains("unread")) return;
    try {
      const session = await getSession();
      if (!session?.access_token) return;
      const r = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method:"PATCH", headers:{Authorization:`Bearer ${session.access_token}`}
      });
      if (!r.ok) throw new Error("READ_API");
      const item = notifications.find(n => String(n.id) === id);
      if (item) { item.is_read=true; item.read=true; }
      card.classList.remove("unread");
      updateUnread();
      render();
    } catch(e) { console.warn("MARK READ ERROR:",e); }
  }

  async function markAllRead() {
    if (!currentUser) return;
    const session = await getSession();
    if (!session?.access_token) return;
    const btn = $("#mark-all-btn");
    btn.disabled = true;
    try {
      const r = await fetch("/api/notifications/read-all", {
        method:"PATCH", headers:{Authorization:`Bearer ${session.access_token}`}
      });
      if (!r.ok) throw new Error("READ_ALL_API");
      notifications.forEach(n => {n.is_read=true;n.read=true;});
      render();
      showToast("✓ تم تحديد جميع الإشعارات كمقروءة");
    } catch(e) {
      console.error("MARK ALL READ ERROR:",e);
      showToast("تعذر تحديث الإشعارات");
    } finally { btn.disabled=false; }
  }

  async function requestBrowserNotifications() {
    if (!("Notification" in window)) { showToast("هذا المتصفح لا يدعم تنبيهات الجهاز"); return; }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      settings.browser=true; localStorage.setItem("notificationBrowser","on");
      updateSettingUI(); showToast("✓ تم تفعيل تنبيهات الجهاز");
    } else {
      settings.browser=false; localStorage.setItem("notificationBrowser","off");
      updateSettingUI(); showToast("تم إيقاف تنبيهات الجهاز");
    }
  }

  function updateSettingUI() {
    $("#sound-toggle").checked=settings.sound;
    $("#browser-toggle").checked=settings.browser;
    $("#auto-refresh-toggle").checked=settings.auto;
    $("#sound-btn").classList.toggle("active",settings.sound);
    $("#browser-btn").classList.toggle("active",settings.browser);
  }

  function setupRealtime() {
    if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    clearInterval(refreshTimer);
    if (!currentUser) return;

    realtimeChannel = supabase.channel(`notifications-ui-${currentUser.id}`)
      .on("postgres_changes", {
        event:"INSERT",schema:"public",table:"notifications",
        filter:`user_id=eq.${currentUser.id}`
      }, async payload => {
        await loadUserNotifications({checkNew:true});
      })
      .subscribe(status => {
        if (status === "SUBSCRIBED") setConnection(true,"متصل لحظياً");
      });

    if (settings.auto) {
      refreshTimer=setInterval(() => {
        if (document.visibilityState === "visible") loadUserNotifications({checkNew:true});
      },30000);
    }
  }

  // Filters
  $$(".tab-btn").forEach(tab => tab.addEventListener("click", () => {
    $$(".tab-btn").forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");
    activeFilter=tab.dataset.filter;
    render();
  }));

  $("#notification-search").addEventListener("input", () => {
    $("#clear-search").classList.toggle("visible", !!$("#notification-search").value);
    render();
  });
  $("#clear-search").addEventListener("click",()=>{ $("#notification-search").value=""; $("#clear-search").classList.remove("visible"); render(); });

  $("#mark-all-btn").addEventListener("click",markAllRead);
  $("#refresh-btn").addEventListener("click",async()=>{await loadAnnouncements();await loadUserNotifications({checkNew:false});showToast("تم تحديث الإشعارات");});
  $("#empty-refresh").addEventListener("click",()=>$("#refresh-btn").click());

  document.addEventListener("click", async e => {
    const wallpaperBtn=e.target.closest(".notification-wallpaper-btn");
    if (wallpaperBtn) {
      const card=wallpaperBtn.closest(".notif-card");
      await markRead(card);
      const url=wallpaperUrl(wallpaperBtn.dataset.wallpaperId);
      if(url) location.href=url;
      return;
    }
    const readBtn=e.target.closest(".card-check-read");
    if (readBtn) { e.stopPropagation(); await markRead(readBtn.closest(".notif-card")); return; }
    const card=e.target.closest("#userNotificationsFeed .notif-card");
    if(card && e.target.closest(".notif-body")) await markRead(card);

    const copy=e.target.closest(".copy-announcement");
    if(copy) {
      const card=copy.closest(".admin-post");
      const text=card.querySelector(".post-text")?.textContent || "";
      try { await navigator.clipboard.writeText(text); showToast("تم نسخ نص الإعلان"); } catch {}
    }
  });

  // Settings
  $("#settings-btn").addEventListener("click",()=>$("#settings-panel").hidden=false);
  $("#close-settings").addEventListener("click",()=>$("#settings-panel").hidden=true);
  $("#settings-panel").addEventListener("click",e=>{if(e.target.id==="settings-panel") $("#settings-panel").hidden=true;});

  $("#sound-toggle").addEventListener("change",e=>{
    settings.sound=e.target.checked;
    localStorage.setItem("notificationSound",settings.sound?"on":"off");
    updateSettingUI();
    if(settings.sound) { unlockAudio(); showToast("🔊 تم تفعيل صوت الإشعار"); }
  });
  $("#sound-btn").addEventListener("click",()=>{
    settings.sound=!settings.sound;
    localStorage.setItem("notificationSound",settings.sound?"on":"off");
    updateSettingUI(); unlockAudio();
    showToast(settings.sound?"🔊 الصوت مفعل":"🔇 الصوت متوقف");
  });
  $("#browser-toggle").addEventListener("change",async e=>{
    if(e.target.checked) await requestBrowserNotifications();
    else {settings.browser=false;localStorage.setItem("notificationBrowser","off");updateSettingUI();}
  });
  $("#browser-btn").addEventListener("click",requestBrowserNotifications);
  $("#auto-refresh-toggle").addEventListener("change",e=>{
    settings.auto=e.target.checked;
    localStorage.setItem("notificationAutoRefresh",settings.auto?"on":"off");
    setupRealtime();
    showToast(settings.auto?"تم تفعيل التحديث التلقائي":"تم إيقاف التحديث الاحتياطي");
  });

  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible") loadUserNotifications({checkNew:false});});

  // Auth + initial load
  loadAnnouncements();
  getSession().then(async session=>{
    currentUser=session?.user||null;
    await loadUserNotifications({checkNew:false});
    setupRealtime();
    updateSettingUI();
  }).catch(e=>console.error("NOTICE AUTH ERROR:",e));

  supabase.auth.onAuthStateChange(async (_event,session)=>{
    currentUser=session?.user||null;
    initialized=false;
    if(realtimeChannel) supabase.removeChannel(realtimeChannel);
    clearInterval(refreshTimer);
    await loadUserNotifications({checkNew:false});
    setupRealtime();
  });
});
