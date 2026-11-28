(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const STORAGE_HIDDEN_POSTS = "wallpaperhub_social_hidden_posts_v1";
  const STORAGE_HIDDEN_USERS = "wallpaperhub_social_hidden_users_v1";
  const CLOUDINARY_CLOUD = "ls9wdurp";
  const CLOUDINARY_PRESET = "wallpaperhub_upload";

  const S = {
    db: null,
    user: null,
    profile: { name: "عضو WallpaperHub", avatar: "" },
    posts: [],
    sort: "new",
    offset: 0,
    limit: 10,
    more: true,
    loading: false,
    publishing: false,
    file: null,
    previewUrl: "",
    likes: new Set(),
    saves: new Set(),
    commentsOpen: new Set(),
    commentCache: new Map(),
    hiddenPosts: readSet(STORAGE_HIDDEN_POSTS),
    hiddenUsers: readSet(STORAGE_HIDDEN_USERS),
    stories: [],
    storyGroups: [],
    storyGroupIndex: 0,
    storyIndex: 0,
    storyTimer: null,
    storyStart: 0,
    storyDuration: 5000,
    storyPaused: false,
    storyTouchX: 0,
    storyIgnoreClick: false,
    storyClickSuppressTimer: null,
    pendingEditId: null,
    pendingDeleteId: null,
    pendingReportId: null
  };

  const feed = $("#feed");
  const postModal = $("#postModal");
  const postText = $("#postText");
  const postMediaInput = $("#postMediaInput");
  const publishButton = $("#publishPost");

  function readSet(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return new Set(Array.isArray(value) ? value.map(String) : []);
    } catch (_) {
      return new Set();
    }
  }

  function saveSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(Array.from(value))); } catch (error) {
      console.warn("SOCIAL LOCAL PREFERENCE SAVE:", error);
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[character]));
  }

  function safeMediaUrl(value) {
    const url = String(value || "").trim();
    return /^(https?:\/\/|\/)/i.test(url) ? url : "";
  }

  function initials(name) {
    return String(name || "ع").trim().slice(0, 1) || "ع";
  }

  function avatarMarkup(url, name, className) {
    const image = safeMediaUrl(url);
    return '<div class="' + (className || "avatar") + '">' +
      (image ? '<img src="' + escapeHtml(image) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : escapeHtml(initials(name))) +
      "</div>";
  }

  function toast(message) {
    const node = $("#toast");
    if (!node) return;
    node.textContent = String(message || "");
    node.classList.add("show");
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => node.classList.remove("show"), 2800);
  }

  function openDialog(id) {
    const dialog = $("#" + id);
    if (!dialog) return;
    dialog.classList.remove("hidden");
    dialog.setAttribute("aria-hidden", "false");
    document.body.classList.add("dialog-open");
  }

  function closeDialog(id) {
    const dialog = $("#" + id);
    if (!dialog) return;
    dialog.classList.add("hidden");
    dialog.setAttribute("aria-hidden", "true");
    if (!$(".dialog-backdrop:not(.hidden)") && $("#storyViewer").classList.contains("hidden")) {
      document.body.classList.remove("dialog-open");
    }
  }

  function closeAllPostMenus() {
    $$(".post-menu").forEach(menu => menu.classList.add("hidden"));
    $$(".post-more[aria-expanded='true']").forEach(button => button.setAttribute("aria-expanded", "false"));
  }

  function formatAgo(value) {
    const timestamp = new Date(value).getTime();
    const difference = Date.now() - timestamp;
    if (!Number.isFinite(difference) || difference < 60000) return "الآن";
    if (difference < 3600000) return "قبل " + Math.floor(difference / 60000) + " د";
    if (difference < 86400000) return "قبل " + Math.floor(difference / 3600000) + " س";
    return new Date(value).toLocaleDateString("ar-MA", { day: "numeric", month: "short" });
  }

  function updateProfile() {
    const metadata = S.user && S.user.user_metadata ? S.user.user_metadata : {};
    const name = metadata.full_name || metadata.name || metadata.user_name ||
      (S.user && S.user.email ? S.user.email.split("@")[0] : "") || "عضو WallpaperHub";
    const avatar = safeMediaUrl(metadata.avatar_url || metadata.picture || "");
    S.profile = { name: name, avatar: avatar };

    ["myAvatar", "modalAvatar", "storyAvatar"].forEach(id => {
      const node = $("#" + id);
      if (node) node.innerHTML = avatar
        ? '<img src="' + escapeHtml(avatar) + '" alt="">'
        : escapeHtml(initials(name));
    });
    if ($("#modalName")) $("#modalName").textContent = name;
    if ($("#storyAuthorName")) $("#storyAuthorName").textContent = name;

    const create = $("#openComposer");
    if (create) {
      create.disabled = !S.user;
      create.title = S.user ? "إنشاء منشور" : "سجّل الدخول للنشر";
    }
    if ($("#createStoryButton")) {
      const label = $("#createStoryButton b");
      if (label) label.textContent = S.user ? "إضافة قصة" : "سجّل الدخول";
    }
  }

  function showFeedState(title, message, actionText) {
    feed.innerHTML =
      '<div class="feed-state">' +
        '<span class="empty-state-icon"><span class="material-icons-round">dynamic_feed</span></span>' +
        '<b>' + escapeHtml(title) + "</b>" +
        '<p>' + escapeHtml(message) + "</p>" +
        (actionText ? '<button type="button" data-feed-action="create">' + escapeHtml(actionText) + "</button>" : "") +
      "</div>";
  }

  function openCreatePost() {
    if (!S.user) {
      toast("سجّل الدخول أولاً حتى تتمكن من النشر");
      return;
    }
    S.file = null;
    if (S.previewUrl) URL.revokeObjectURL(S.previewUrl);
    S.previewUrl = "";
    postMediaInput.value = "";
    $("#mediaPreview").innerHTML = "";
    $("#mediaPreview").classList.add("hidden");
    postText.value = "";
    $("#uploadStatus").classList.add("hidden");
    updatePublishState();
    updateProfile();
    openDialog("postModal");
    window.setTimeout(() => postText.focus(), 90);
  }

  function closeCreatePost() {
    closeDialog("postModal");
    S.file = null;
    if (S.previewUrl) URL.revokeObjectURL(S.previewUrl);
    S.previewUrl = "";
    postMediaInput.value = "";
    $("#mediaPreview").innerHTML = "";
    $("#mediaPreview").classList.add("hidden");
    postText.value = "";
    updatePublishState();
  }

  function updatePublishState() {
    publishButton.disabled = S.publishing || !S.user || !(postText.value.trim() || S.file);
  }

  function previewPostMedia(file) {
    const box = $("#mediaPreview");
    if (S.previewUrl) URL.revokeObjectURL(S.previewUrl);
    S.previewUrl = URL.createObjectURL(file);
    box.innerHTML = file.type.startsWith("video/")
      ? '<video controls playsinline src="' + S.previewUrl + '"></video>'
      : '<img src="' + S.previewUrl + '" alt="معاينة الصورة">';
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "إزالة الصورة");
    remove.addEventListener("click", () => {
      S.file = null;
      postMediaInput.value = "";
      if (S.previewUrl) URL.revokeObjectURL(S.previewUrl);
      S.previewUrl = "";
      box.replaceChildren();
      box.classList.add("hidden");
      updatePublishState();
    });
    box.append(remove);
    box.classList.remove("hidden");
    updatePublishState();
  }

  async function uploadPostMedia(file) {
    const isVideo = String(file.type || "").startsWith("video/");
    const resource = isVideo ? "video" : "image";
    const body = new FormData();
    body.append("file", file);
    body.append("upload_preset", CLOUDINARY_PRESET);
    const response = await fetch(
      "https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD + "/" + resource + "/upload",
      { method: "POST", body: body }
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.secure_url) {
      throw new Error(result.error && result.error.message ? result.error.message : "تعذر رفع الصورة");
    }
    return result.secure_url;
  }

  async function publishPost() {
    if (!S.user) {
      toast("سجّل الدخول أولاً");
      return;
    }
    const body = postText.value.trim();
    const file = S.file;
    if (!body && !file) return;
    if (body.length > 3000) {
      toast("الحد الأقصى للنص 3000 حرف");
      return;
    }
    if (file && file.size > 80 * 1024 * 1024) {
      toast("الحد الأقصى لحجم الصورة 80MB");
      return;
    }

    S.publishing = true;
    updatePublishState();
    $("#uploadStatus").classList.remove("hidden");
    try {
      let mediaUrl = null;
      let mediaType = null;
      if (file) {
        mediaUrl = await uploadPostMedia(file);
        mediaType = file.type;
      }
      const result = await S.db.from("social_posts").insert({
        user_id: S.user.id,
        author_name: S.profile.name,
        author_avatar: S.profile.avatar || null,
        body: body,
        media_url: mediaUrl,
        media_type: mediaType
      }).select("id,user_id,author_name,author_avatar,body,media_url,media_type,created_at,like_count,comment_count,is_deleted").single();
      if (result.error) throw result.error;
      S.posts.unshift(result.data);
      S.offset = S.posts.length;
      S.likes.delete(String(result.data.id));
      S.saves.delete(String(result.data.id));
      closeCreatePost();
      renderFeed();
      toast("تم نشر منشورك بنجاح");
    } catch (error) {
      console.error("PUBLISH SOCIAL POST:", error);
      toast(error.message || "تعذر نشر المنشور حالياً");
    } finally {
      S.publishing = false;
      $("#uploadStatus").classList.add("hidden");
      updatePublishState();
    }
  }

  function menuButton(label, icon, action, danger) {
    return '<button type="button" role="menuitem" data-menu-action="' + action + '"' +
      (danger ? ' class="danger-menu-action"' : "") + '>' +
      '<span class="material-icons-round">' + icon + "</span><span>" + label + "</span></button>";
  }

  function postMenuMarkup(post, own, hasText) {
    let html = '<div class="post-menu hidden" role="menu">';
    if (own) html += menuButton("تعديل نص المنشور", "edit", "edit", false);
    html += menuButton("نسخ رابط المنشور", "link", "share", false);
    if (hasText) html += menuButton("نسخ نص المنشور", "content_copy", "copy-text", false);
    html += '<div class="post-menu-divider"></div>';
    html += menuButton("إخفاء هذا المنشور", "visibility_off", "hide-post", false);
    if (!own) html += menuButton("إخفاء منشورات هذا العضو", "person_off", "hide-author", false);
    if (!own) html += menuButton("الإبلاغ عن المنشور", "flag", "report", false);
    if (own) {
      html += '<div class="post-menu-divider"></div>';
      html += menuButton("حذف المنشور", "delete_outline", "delete", true);
    }
    return html + "</div>";
  }

  function renderCommentItems(postId) {
    const comments = S.commentCache.get(String(postId));
    if (!Array.isArray(comments) || !comments.length) {
      return '<div class="comment-empty">لا توجد تعليقات بعد. كن أول من يشارك رأيه.</div>';
    }
    return comments.map(comment =>
      '<div class="comment-item">' +
        avatarMarkup(comment.author_avatar, comment.author_name, "avatar") +
        '<div class="comment-bubble"><b>' + escapeHtml(comment.author_name || "عضو") + "</b>" +
        "<p>" + escapeHtml(comment.body || "") + "</p></div>" +
      "</div>"
    ).join("");
  }

  function renderPost(post) {
    const id = String(post.id);
    const own = Boolean(S.user && String(post.user_id) === String(S.user.id));
    const liked = S.likes.has(id);
    const saved = S.saves.has(id);
    const commentsOpen = S.commentsOpen.has(id);
    const text = String(post.body || "");
    const url = safeMediaUrl(post.media_url);
    const isVideo = String(post.media_type || "").toLowerCase().startsWith("video/");
    let media = "";
    if (url && isVideo) {
      media = '<video class="post-media post-media-video" src="' + escapeHtml(url) + '" controls playsinline preload="metadata"></video>';
    } else if (url) {
      media = '<img class="post-media post-media-image" src="' + escapeHtml(url) +
        '" alt="صورة نشرها ' + escapeHtml(post.author_name || "عضو") +
        '" loading="lazy" decoding="async" referrerpolicy="no-referrer">';
    }

    return '<article class="post-card" id="post-' + escapeHtml(id) + '" data-id="' + escapeHtml(id) + '">' +
      '<header class="post-head">' +
        avatarMarkup(post.author_avatar, post.author_name, "avatar") +
        '<div class="post-author"><strong>' + escapeHtml(post.author_name || "عضو WallpaperHub") + "</strong>" +
          '<span class="post-meta"><span>' + escapeHtml(formatAgo(post.created_at)) + '</span><span>·</span><span class="material-icons-round">public</span><span>عام</span></span>' +
        "</div>" +
        '<div class="post-more-wrap">' +
          '<button class="post-more" type="button" data-act="more" aria-label="خيارات المنشور" aria-expanded="false"><span class="material-icons-round">more_horiz</span></button>' +
          postMenuMarkup(post, own, Boolean(text.trim())) +
        "</div>" +
      "</header>" +
      (text.trim() ? '<div class="post-text">' + escapeHtml(text) + "</div>" : "") +
      media +
      '<div class="post-stats"><span><span class="material-icons-round">favorite</span>' +
        escapeHtml(Number(post.like_count || 0)) + " إعجاب</span><span>" +
        escapeHtml(Number(post.comment_count || 0)) + " تعليق</span></div>" +
      '<div class="post-actions">' +
        '<button type="button" class="post-action ' + (liked ? "active" : "") + '" data-act="like" aria-pressed="' + (liked ? "true" : "false") + '">' +
          '<span class="material-icons-round">' + (liked ? "favorite" : "favorite_border") + "</span><span>" + (liked ? "أعجبني" : "إعجاب") + "</span></button>" +
        '<button type="button" class="post-action ' + (commentsOpen ? "active" : "") + '" data-act="comment" aria-expanded="' + (commentsOpen ? "true" : "false") + '">' +
          '<span class="material-icons-round">chat_bubble_outline</span><span>تعليق</span></button>' +
        '<button type="button" class="post-action ' + (saved ? "active" : "") + '" data-act="save" aria-pressed="' + (saved ? "true" : "false") + '">' +
          '<span class="material-icons-round">' + (saved ? "bookmark" : "bookmark_border") + "</span><span>" + (saved ? "محفوظ" : "حفظ") + "</span></button>" +
      "</div>" +
      '<section class="comment-area ' + (commentsOpen ? "" : "hidden") + '">' +
        '<div class="comment-list">' + renderCommentItems(id) + "</div>" +
        '<form class="comment-form"><input name="comment" maxlength="1000" placeholder="' + (S.user ? "اكتب تعليقاً لطيفاً…" : "سجّل الدخول حتى تتمكن من التعليق") + '"' + (S.user ? "" : " disabled") + ' autocomplete="off">' +
        '<button type="submit" aria-label="إرسال التعليق"' + (S.user ? "" : " disabled") + '><span class="material-icons-round">send</span></button></form>' +
      "</section>" +
    "</article>";
  }

  function renderFeed() {
    let posts = S.posts.filter(post =>
      !S.hiddenPosts.has(String(post.id)) &&
      !S.hiddenUsers.has(String(post.user_id))
    );
    if (S.sort === "popular") {
      posts = posts.slice().sort((a, b) =>
        (Number(b.like_count || 0) + Number(b.comment_count || 0)) -
        (Number(a.like_count || 0) + Number(a.comment_count || 0))
      );
    }

    feed.setAttribute("aria-busy", "false");
    if (!posts.length) {
      if (S.posts.length && (S.hiddenPosts.size || S.hiddenUsers.size)) {
        showFeedState("لا توجد منشورات ظاهرة", "أخفيت بعض المنشورات على هذا الجهاز. يمكنك إظهارها من جديد.", "إظهار المنشورات المخفية");
        const action = $('[data-feed-action="create"]', feed);
        if (action) {
          action.dataset.feedAction = "clear-hidden";
          action.textContent = "إظهار المنشورات المخفية";
        }
      } else {
        showFeedState("البداية من هنا", "لا توجد منشورات في الخلاصة حالياً. كن أول من يشارك شيئاً مع المجتمع.", S.user ? "إنشاء أول منشور" : "");
      }
    } else {
      feed.innerHTML = posts.map(renderPost).join("");
    }

    $("#loadMore").classList.toggle("hidden", !S.more);
    const restoreButton = $("#restoreHiddenPosts");
    if (restoreButton) restoreButton.classList.toggle("hidden", !S.hiddenPosts.size && !S.hiddenUsers.size);
  }

  async function loadFeed(reset) {
    if (!S.db || S.loading) return;
    const shouldReset = Boolean(reset);
    if (shouldReset) {
      S.posts = [];
      S.offset = 0;
      S.more = true;
      S.likes.clear();
      S.saves.clear();
      S.commentCache.clear();
      S.commentsOpen.clear();
      feed.innerHTML = '<div class="feed-state loading-state"><span class="loader-dot"></span> يتم تجهيز الخلاصة…</div>';
      feed.setAttribute("aria-busy", "true");
    }
    if (!S.more) return;

    S.loading = true;
    $("#loadMore").classList.add("hidden");
    try {
      const result = await S.db.from("social_posts")
        .select("id,user_id,author_name,author_avatar,body,media_url,media_type,created_at,like_count,comment_count,is_deleted")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .range(S.offset, S.offset + S.limit - 1);
      if (result.error) throw result.error;
      const rows = result.data || [];
      S.posts = shouldReset ? rows : S.posts.concat(rows);
      S.offset += rows.length;
      S.more = rows.length === S.limit;

      if (S.user && rows.length) {
        const ids = rows.map(post => post.id);
        const results = await Promise.all([
          S.db.from("social_post_likes").select("post_id").eq("user_id", S.user.id).in("post_id", ids),
          S.db.from("social_post_saves").select("post_id").eq("user_id", S.user.id).in("post_id", ids)
        ]);
        if (results[0].error) throw results[0].error;
        if (results[1].error) throw results[1].error;
        (results[0].data || []).forEach(item => S.likes.add(String(item.post_id)));
        (results[1].data || []).forEach(item => S.saves.add(String(item.post_id)));
      }

      await loadSharedPostFromUrl();
      renderFeed();
    } catch (error) {
      console.error("LOAD SOCIAL FEED:", error);
      feed.setAttribute("aria-busy", "false");
      feed.innerHTML = '<div class="feed-state"><span class="empty-state-icon"><span class="material-icons-round">cloud_off</span></span><b>تعذر تحميل الخلاصة</b><p>' +
        escapeHtml(error.message || "تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى.") +
        '</p><button type="button" data-feed-action="reload">إعادة المحاولة</button></div>';
    } finally {
      S.loading = false;
      $("#loadMore").classList.toggle("hidden", !S.more);
    }
  }

  let sharedPostLoaded = false;
  async function loadSharedPostFromUrl() {
    if (sharedPostLoaded || !S.db) return;
    const postId = new URLSearchParams(window.location.search).get("post");
    if (!postId) return;
    sharedPostLoaded = true;
    if (S.posts.some(post => String(post.id) === String(postId))) return;
    try {
      const result = await S.db.from("social_posts")
        .select("id,user_id,author_name,author_avatar,body,media_url,media_type,created_at,like_count,comment_count,is_deleted")
        .eq("id", postId).eq("is_deleted", false).maybeSingle();
      if (result.error) throw result.error;
      if (result.data) {
        S.posts.unshift(result.data);
        if (S.user) {
          const [like, save] = await Promise.all([
            S.db.from("social_post_likes").select("post_id").eq("user_id", S.user.id).eq("post_id", postId).maybeSingle(),
            S.db.from("social_post_saves").select("post_id").eq("user_id", S.user.id).eq("post_id", postId).maybeSingle()
          ]);
          if (like.data) S.likes.add(String(postId));
          if (save.data) S.saves.add(String(postId));
        }
        window.setTimeout(() => {
          const card = $("#post-" + CSS.escape(String(postId)));
          if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 180);
      }
    } catch (error) {
      console.warn("SHARED POST LOAD:", error);
    }
  }

  function closePostMenu(card) {
    if (!card) return;
    const menu = $(".post-menu", card);
    const trigger = $(".post-more", card);
    if (menu) menu.classList.add("hidden");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  }

  function togglePostMenu(card) {
    const menu = $(".post-menu", card);
    const trigger = $(".post-more", card);
    if (!menu || !trigger) return;
    const willOpen = menu.classList.contains("hidden");
    closeAllPostMenus();
    if (willOpen) {
      menu.classList.remove("hidden");
      trigger.setAttribute("aria-expanded", "true");
    }
  }

  function findPost(id) {
    return S.posts.find(post => String(post.id) === String(id));
  }

  async function copyText(value, successMessage) {
    const text = String(value || "");
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const field = document.createElement("textarea");
        field.value = text;
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.append(field);
        field.select();
        const ok = document.execCommand("copy");
        field.remove();
        if (!ok) throw new Error("تعذر نسخ النص");
      }
      toast(successMessage || "تم النسخ");
    } catch (error) {
      toast("تعذر النسخ من المتصفح");
    }
  }

  async function sharePost(post) {
    const link = window.location.origin + "/social.html?post=" + encodeURIComponent(post.id) + "#post-" + encodeURIComponent(post.id);
    if (navigator.share) {
      try {
        await navigator.share({ title: "منشور من WallpaperHub", text: post.body || "شاهد هذا المنشور من مجتمع WallpaperHub", url: link });
      } catch (error) {
        if (error && error.name !== "AbortError") await copyText(link, "تم نسخ رابط المنشور");
      }
    } else {
      await copyText(link, "تم نسخ رابط المنشور");
    }
  }

  function openEditPost(post) {
    if (!S.user || String(post.user_id) !== String(S.user.id)) {
      toast("يمكنك تعديل منشوراتك فقط");
      return;
    }
    S.pendingEditId = String(post.id);
    $("#editPostText").value = String(post.body || "");
    closeAllPostMenus();
    openDialog("editPostModal");
    window.setTimeout(() => $("#editPostText").focus(), 80);
  }

  async function savePostEdit(event) {
    event.preventDefault();
    const post = findPost(S.pendingEditId);
    if (!post || !S.user || String(post.user_id) !== String(S.user.id)) {
      toast("تعذر التحقق من ملكية المنشور");
      closeDialog("editPostModal");
      return;
    }
    const body = $("#editPostText").value.trim();
    if (body.length > 3000) {
      toast("الحد الأقصى للنص 3000 حرف");
      return;
    }
    if (!body && !post.media_url) {
      toast("لا يمكن ترك المنشور فارغاً");
      return;
    }

    const button = $("#savePostEdit");
    button.disabled = true;
    button.textContent = "جارٍ الحفظ…";
    try {
      const result = await S.db.from("social_posts").update({ body: body })
        .eq("id", post.id).eq("user_id", S.user.id).eq("is_deleted", false)
        .select("id,body").maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) throw new Error("لم يتم تعديل المنشور. ربما لم يعد متاحاً.");
      post.body = result.data.body;
      closeDialog("editPostModal");
      S.pendingEditId = null;
      renderFeed();
      toast("تم تعديل المنشور بنجاح");
    } catch (error) {
      console.error("EDIT SOCIAL POST:", error);
      toast(error.message || "تعذر تعديل المنشور");
    } finally {
      button.disabled = false;
      button.textContent = "حفظ";
    }
  }

  function askDeletePost(post) {
    if (!S.user || String(post.user_id) !== String(S.user.id)) {
      toast("يمكنك حذف منشوراتك فقط");
      return;
    }
    S.pendingDeleteId = String(post.id);
    closeAllPostMenus();
    openDialog("deletePostModal");
  }

  async function deletePost() {
    const post = findPost(S.pendingDeleteId);
    if (!post || !S.user || String(post.user_id) !== String(S.user.id)) {
      toast("تعذر التحقق من ملكية المنشور");
      closeDialog("deletePostModal");
      return;
    }
    const button = $("#confirmDeletePost");
    button.disabled = true;
    button.textContent = "جارٍ الحذف…";
    try {
      const result = await S.db.from("social_posts").delete()
        .eq("id", post.id).eq("user_id", S.user.id)
        .select("id").maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) throw new Error("لم يتم حذف المنشور. ربما لم يعد متاحاً.");
      S.posts = S.posts.filter(item => String(item.id) !== String(post.id));
      S.likes.delete(String(post.id));
      S.saves.delete(String(post.id));
      S.commentCache.delete(String(post.id));
      S.commentsOpen.delete(String(post.id));
      closeDialog("deletePostModal");
      S.pendingDeleteId = null;
      renderFeed();
      toast("تم حذف المنشور والتفاعلات المرتبطة به");
    } catch (error) {
      console.error("DELETE SOCIAL POST:", error);
      toast(error.message || "تعذر حذف المنشور");
    } finally {
      button.disabled = false;
      button.textContent = "حذف المنشور";
    }
  }

  function openReportPost(post) {
    if (!S.user) {
      toast("سجّل الدخول أولاً حتى تتمكن من الإبلاغ");
      return;
    }
    if (String(post.user_id) === String(S.user.id)) {
      toast("لا يمكنك الإبلاغ عن منشورك");
      return;
    }
    S.pendingReportId = String(post.id);
    closeAllPostMenus();
    $("#reportPostForm").reset();
    openDialog("reportPostModal");
  }

  async function submitPostReport(event) {
    event.preventDefault();
    if (!S.user) {
      toast("سجّل الدخول أولاً حتى تتمكن من الإبلاغ");
      return;
    }
    const post = findPost(S.pendingReportId);
    if (!post || String(post.user_id) === String(S.user.id)) {
      toast("هذا المنشور لم يعد متاحاً للإبلاغ");
      closeDialog("reportPostModal");
      return;
    }
    const reason = $("#reportReason").value;
    const details = $("#reportDetails").value.trim();
    if (!reason) {
      toast("اختر سبب الإبلاغ أولاً");
      return;
    }
    const fullReason = (reason + (details ? " — " + details : "")).slice(0, 500);
    const button = $("#submitPostReport");
    button.disabled = true;
    button.textContent = "جارٍ الإرسال…";
    try {
      const result = await S.db.from("social_post_reports").insert({
        post_id: post.id,
        reporter_id: S.user.id,
        reason: fullReason
      });
      if (result.error) {
        if (result.error.code === "23505") throw new Error("سبق أن أرسلت بلاغاً عن هذا المنشور");
        throw result.error;
      }
      closeDialog("reportPostModal");
      S.pendingReportId = null;
      toast("وصل بلاغك إلى فريق المراجعة، شكراً لتنبيهنا");
    } catch (error) {
      console.error("REPORT SOCIAL POST:", error);
      toast(error.message || "تعذر إرسال البلاغ");
    } finally {
      button.disabled = false;
      button.textContent = "إرسال";
    }
  }

  function handleMenuAction(action, post, card) {
    closePostMenu(card);
    if (!post) return;

    if (action === "edit") return openEditPost(post);
    if (action === "delete") return askDeletePost(post);
    if (action === "report") return openReportPost(post);
    if (action === "share") return sharePost(post);
    if (action === "copy-text") return copyText(post.body || "", "تم نسخ نص المنشور");
    if (action === "hide-post") {
      S.hiddenPosts.add(String(post.id));
      saveSet(STORAGE_HIDDEN_POSTS, S.hiddenPosts);
      renderFeed();
      toast("أخفيت هذا المنشور من خلاصة جهازك");
      return;
    }
    if (action === "hide-author") {
      S.hiddenUsers.add(String(post.user_id));
      saveSet(STORAGE_HIDDEN_USERS, S.hiddenUsers);
      renderFeed();
      toast("لن تظهر منشورات هذا العضو في خلاصتك على هذا الجهاز");
    }
  }

  async function toggleLike(post, card) {
    if (!S.user) {
      toast("سجّل الدخول أولاً حتى تتمكن من الإعجاب");
      return;
    }
    const id = String(post.id);
    const wasLiked = S.likes.has(id);
    try {
      if (wasLiked) {
        const result = await S.db.from("social_post_likes").delete()
          .eq("post_id", post.id).eq("user_id", S.user.id);
        if (result.error) throw result.error;
        S.likes.delete(id);
      } else {
        const result = await S.db.from("social_post_likes").insert({ post_id: post.id, user_id: S.user.id });
        if (result.error && result.error.code !== "23505") throw result.error;
        S.likes.add(id);
      }
      const count = await S.db.from("social_posts").select("like_count").eq("id", post.id).maybeSingle();
      if (!count.error && count.data) post.like_count = Number(count.data.like_count || 0);
      else post.like_count = Math.max(0, Number(post.like_count || 0) + (wasLiked ? -1 : 1));
      renderFeed();
    } catch (error) {
      console.error("TOGGLE SOCIAL LIKE:", error);
      toast(error.message || "تعذر تحديث الإعجاب");
    }
  }

  async function toggleSave(post) {
    if (!S.user) {
      toast("سجّل الدخول أولاً حتى تتمكن من حفظ المنشور");
      return;
    }
    const id = String(post.id);
    const wasSaved = S.saves.has(id);
    try {
      if (wasSaved) {
        const result = await S.db.from("social_post_saves").delete()
          .eq("post_id", post.id).eq("user_id", S.user.id);
        if (result.error) throw result.error;
        S.saves.delete(id);
        toast("أزيل المنشور من المحفوظات");
      } else {
        const result = await S.db.from("social_post_saves").insert({ post_id: post.id, user_id: S.user.id });
        if (result.error && result.error.code !== "23505") throw result.error;
        S.saves.add(id);
        toast("تم حفظ المنشور في محفوظاتك");
      }
      renderFeed();
    } catch (error) {
      console.error("TOGGLE SOCIAL SAVE:", error);
      toast(error.message || "تعذر تحديث المحفوظات");
    }
  }

  async function loadComments(post, card) {
    const id = String(post.id);
    if (S.commentCache.has(id)) {
      const list = $(".comment-list", card);
      if (list) list.innerHTML = renderCommentItems(id);
      return;
    }
    const list = $(".comment-list", card);
    if (list) list.innerHTML = '<div class="comment-empty">جارٍ تحميل التعليقات…</div>';
    try {
      const result = await S.db.from("social_post_comments")
        .select("id,user_id,author_name,author_avatar,body,created_at")
        .eq("post_id", post.id).eq("is_deleted", false)
        .order("created_at", { ascending: true }).limit(40);
      if (result.error) throw result.error;
      S.commentCache.set(id, result.data || []);
      const activeList = $("#post-" + CSS.escape(id) + " .comment-list");
      if (activeList) activeList.innerHTML = renderCommentItems(id);
    } catch (error) {
      console.error("LOAD SOCIAL COMMENTS:", error);
      if (list) list.innerHTML = '<div class="comment-empty">تعذر تحميل التعليقات. حاول مرة أخرى.</div>';
    }
  }

  async function submitComment(event) {
    if (!event.target.matches(".comment-form")) return;
    event.preventDefault();
    if (!S.user) {
      toast("سجّل الدخول أولاً حتى تتمكن من التعليق");
      return;
    }
    const card = event.target.closest("[data-id]");
    const post = card ? findPost(card.dataset.id) : null;
    const input = $('input[name="comment"]', event.target);
    const body = input ? input.value.trim() : "";
    if (!post || !body) return;
    if (body.length > 1000) {
      toast("الحد الأقصى للتعليق 1000 حرف");
      return;
    }
    const button = $("button[type='submit']", event.target);
    if (button) button.disabled = true;
    try {
      const result = await S.db.from("social_post_comments").insert({
        post_id: post.id,
        user_id: S.user.id,
        author_name: S.profile.name,
        author_avatar: S.profile.avatar || null,
        body: body
      }).select("id,user_id,author_name,author_avatar,body,created_at").single();
      if (result.error) throw result.error;
      const id = String(post.id);
      const comments = S.commentCache.get(id) || [];
      comments.push(result.data);
      S.commentCache.set(id, comments);
      post.comment_count = Number(post.comment_count || 0) + 1;
      S.commentsOpen.add(id);
      renderFeed();
      toast("تم نشر تعليقك");
    } catch (error) {
      console.error("ADD SOCIAL COMMENT:", error);
      toast(error.message || "تعذر نشر التعليق");
    } finally {
      if (button) button.disabled = false;
    }
  }

  function handleFeedClick(event) {
    const feedAction = event.target.closest("[data-feed-action]");
    if (feedAction) {
      const action = feedAction.dataset.feedAction;
      if (action === "create") openCreatePost();
      if (action === "reload") loadFeed(true);
      if (action === "clear-hidden") {
        S.hiddenPosts.clear();
        S.hiddenUsers.clear();
        saveSet(STORAGE_HIDDEN_POSTS, S.hiddenPosts);
        saveSet(STORAGE_HIDDEN_USERS, S.hiddenUsers);
        renderFeed();
        toast("أُعيد إظهار المنشورات المخفية");
      }
      return;
    }

    const menuAction = event.target.closest("[data-menu-action]");
    if (menuAction) {
      const card = menuAction.closest("[data-id]");
      const post = card ? findPost(card.dataset.id) : null;
      handleMenuAction(menuAction.dataset.menuAction, post, card);
      return;
    }

    const button = event.target.closest("[data-act]");
    if (!button) {
      if (!event.target.closest(".post-menu")) closeAllPostMenus();
      return;
    }
    const card = button.closest("[data-id]");
    if (!card) return;
    const post = findPost(card.dataset.id);
    if (!post) return;

    const action = button.dataset.act;
    if (action === "more") {
      togglePostMenu(card);
      return;
    }
    if (action === "like") return toggleLike(post, card);
    if (action === "save") return toggleSave(post);
    if (action === "comment") {
      if (!S.user) {
        toast("سجّل الدخول أولاً حتى تتمكن من التعليق");
        return;
      }
      const id = String(post.id);
      if (S.commentsOpen.has(id)) {
        S.commentsOpen.delete(id);
        renderFeed();
      } else {
        S.commentsOpen.add(id);
        renderFeed();
        const activeCard = $("#post-" + CSS.escape(id));
        if (activeCard) loadComments(post, activeCard);
      }
    }
  }

  function buildStoryGroups() {
    const groups = new Map();
    S.stories.forEach(story => {
      const key = String(story.user_id || story.author_name || "unknown");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(story);
    });
    S.storyGroups = Array.from(groups.entries()).map(entry => {
      const items = entry[1].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      return {
        userId: entry[0],
        stories: items,
        latest: Math.max.apply(null, items.map(item => new Date(item.created_at || 0).getTime()))
      };
    }).sort((a, b) => b.latest - a.latest);
  }

  function renderStories() {
    const row = $("#storiesRow");
    if (!row) return;
    const createButton = $(".create-story", row);
    row.replaceChildren();
    if (createButton) row.append(createButton);
    if (createButton) {
      const label = $("b", createButton);
      if (label) label.textContent = S.user ? "إضافة قصة" : "تسجيل الدخول";
    }
    buildStoryGroups();
    if (!S.storyGroups.length) {
      const status = document.createElement("div");
      status.className = "story-status";
      status.textContent = S.user ? "كن أول من يشارك قصة اليوم" : "سجّل الدخول لإضافة قصة";
      row.append(status);
      return;
    }

    S.storyGroups.forEach((group, index) => {
      const story = group.stories[group.stories.length - 1];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "story story-live";
      button.setAttribute("aria-label", "قصص " + (story.author_name || "عضو"));
      const url = safeMediaUrl(story.media_url);
      const media = String(story.media_type || "").startsWith("video/")
        ? '<video muted playsinline preload="none" src="' + escapeHtml(url) + '"></video>'
        : '<img src="' + escapeHtml(url) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">';
      button.innerHTML =
        '<div class="storyphoto">' + media + "</div>" +
        '<span class="story-avatar-ring">' + avatarMarkup(story.author_avatar, story.author_name, "avatar") + "</span>" +
        "<b>" + escapeHtml(story.author_name || "عضو") +
        (group.stories.length > 1 ? " · " + group.stories.length : "") + "</b>";
      button.addEventListener("click", () => openStory(index));
      row.append(button);
    });
  }

  async function loadStories() {
    if (!S.db) return;
    try {
      const result = await S.db.from("social_stories")
        .select("id,user_id,author_name,author_avatar,media_url,media_type,created_at,expires_at")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true }).limit(100);
      if (result.error) throw result.error;
      S.stories = result.data || [];
      renderStories();
    } catch (error) {
      console.error("LOAD SOCIAL STORIES:", error);
      const status = $("#storiesStatus");
      if (status) status.textContent = "تعذر تحميل القصص حالياً";
    }
  }

  function openStoryComposer() {
    if (!S.user) {
      toast("سجّل الدخول أولاً حتى تتمكن من إضافة قصة");
      return;
    }
    S.storyFile = null;
    $("#storyMediaInput").value = "";
    $("#storyMediaPreview").replaceChildren();
    $("#storyMediaPreview").classList.add("hidden");
    $("#publishStory").disabled = true;
    $("#storyUploadStatus").classList.add("hidden");
    updateProfile();
    openDialog("storyComposer");
  }

  function closeStoryComposer() {
    closeDialog("storyComposer");
    S.storyFile = null;
    $("#storyMediaInput").value = "";
    $("#storyMediaPreview").replaceChildren();
    $("#storyMediaPreview").classList.add("hidden");
  }

  async function publishStory() {
    if (!S.user || !S.storyFile) return;
    const file = S.storyFile;
    if (file.size > 80 * 1024 * 1024) {
      toast("الحد الأقصى لحجم القصة 80MB");
      return;
    }
    const button = $("#publishStory");
    button.disabled = true;
    $("#storyUploadStatus").classList.remove("hidden");
    try {
      const extension = (file.name.split(".").pop() || "bin").replace(/[^a-z0-9]/gi, "").slice(0, 8);
      const path = S.user.id + "/stories/" + Date.now() + "-" + crypto.randomUUID() + "." + extension;
      const upload = await S.db.storage.from("social-posts").upload(path, file, {
        contentType: file.type, upsert: false, cacheControl: "3600"
      });
      if (upload.error) throw upload.error;
      const publicUrl = S.db.storage.from("social-posts").getPublicUrl(path).data.publicUrl;
      const result = await S.db.from("social_stories").insert({
        user_id: S.user.id,
        author_name: S.profile.name,
        author_avatar: S.profile.avatar || null,
        media_url: publicUrl,
        media_type: file.type
      });
      if (result.error) throw result.error;
      closeStoryComposer();
      toast("تم نشر القصة، وستختفي بعد 24 ساعة");
      await loadStories();
    } catch (error) {
      console.error("PUBLISH STORY:", error);
      toast(error.message || "تعذر نشر القصة");
    } finally {
      $("#storyUploadStatus").classList.add("hidden");
      button.disabled = !S.storyFile;
    }
  }

  function stopStoryTimer() {
    if (S.storyTimer) window.clearInterval(S.storyTimer);
    S.storyTimer = null;
  }

  function closeStoryViewer() {
    stopStoryTimer();
    const video = $("#storyViewerMedia").querySelector("video");
    if (video) video.pause();
    $("#storyViewer").classList.add("hidden");
    $("#storyViewer").setAttribute("aria-hidden", "true");
    document.body.classList.remove("story-viewing");
    if (!$(".dialog-backdrop:not(.hidden)")) document.body.classList.remove("dialog-open");
  }

  function openStory(groupIndex, storyIndex) {
    if (!S.storyGroups.length) return;
    S.storyGroupIndex = Math.max(0, Math.min(groupIndex, S.storyGroups.length - 1));
    S.storyIndex = Math.max(0, Math.min(storyIndex || 0, S.storyGroups[S.storyGroupIndex].stories.length - 1));
    $("#storyViewer").classList.remove("hidden");
    $("#storyViewer").setAttribute("aria-hidden", "false");
    document.body.classList.add("story-viewing");
    showStory();
  }

  function showStory() {
    stopStoryTimer();
    const group = S.storyGroups[S.storyGroupIndex];
    const story = group && group.stories[S.storyIndex];
    if (!story) {
      closeStoryViewer();
      return;
    }
    $("#viewerAvatar").innerHTML = story.author_avatar
      ? '<img src="' + escapeHtml(safeMediaUrl(story.author_avatar)) + '" alt="">'
      : escapeHtml(initials(story.author_name));
    $("#viewerAuthor").textContent = story.author_name || "عضو WallpaperHub";
    $("#viewerTime").textContent = "القصة " + (S.storyIndex + 1) + " من " + group.stories.length;
    const url = safeMediaUrl(story.media_url);
    const media = $("#storyViewerMedia");
    const isVideo = String(story.media_type || "").startsWith("video/");
    media.innerHTML = isVideo
      ? '<video src="' + escapeHtml(url) + '" autoplay playsinline controls></video>'
      : '<img src="' + escapeHtml(url) + '" alt="قصة ' + escapeHtml(story.author_name || "عضو") + '">';
    const progress = $("#storyViewerProgress");
    progress.innerHTML = group.stories.map((item, index) =>
      '<span class="story-progress-segment"><i style="width:' + (index < S.storyIndex ? "100%" : "0%") + '"></i></span>'
    ).join("");
    const activeProgress = progress.children[S.storyIndex].firstElementChild;
    S.storyDuration = 5000;
    S.storyStart = Date.now();
    S.storyPaused = false;

    const video = media.querySelector("video");
    if (video) {
      video.onloadedmetadata = () => {
        if (Number.isFinite(video.duration) && video.duration > 0) {
          S.storyDuration = Math.max(3000, Math.min(video.duration * 1000, 60000));
          S.storyStart = Date.now();
        }
      };
      video.onended = nextStory;
    }

    S.storyTimer = window.setInterval(() => {
      if (S.storyPaused) return;
      const progressValue = Math.min(100, ((Date.now() - S.storyStart) / S.storyDuration) * 100);
      activeProgress.style.width = progressValue + "%";
      if (progressValue >= 100 && !video) nextStory();
    }, 60);
  }

  function nextStory() {
    const group = S.storyGroups[S.storyGroupIndex];
    if (group && S.storyIndex < group.stories.length - 1) {
      S.storyIndex += 1;
      showStory();
      return;
    }
    if (S.storyGroupIndex < S.storyGroups.length - 1) {
      S.storyGroupIndex += 1;
      S.storyIndex = 0;
      showStory();
      return;
    }
    closeStoryViewer();
  }

  function prevStory() {
    if (S.storyIndex > 0) {
      S.storyIndex -= 1;
      showStory();
      return;
    }
    if (S.storyGroupIndex > 0) {
      S.storyGroupIndex -= 1;
      S.storyIndex = S.storyGroups[S.storyGroupIndex].stories.length - 1;
      showStory();
      return;
    }
    S.storyStart = Date.now();
    S.storyIndex = 0;
    showStory();
  }

  function handleStoryMediaChange() {
    const file = $("#storyMediaInput").files && $("#storyMediaInput").files[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4", "video/webm", "video/quicktime"];
    if (!allowed.includes(file.type)) {
      $("#storyMediaInput").value = "";
      toast("اختر صورة أو فيديو بصيغة مدعومة");
      return;
    }
    if (file.size > 80 * 1024 * 1024) {
      $("#storyMediaInput").value = "";
      toast("الحد الأقصى لحجم القصة 80MB");
      return;
    }
    S.storyFile = file;
    const url = URL.createObjectURL(file);
    const preview = $("#storyMediaPreview");
    preview.innerHTML = file.type.startsWith("video/")
      ? '<video src="' + url + '" controls playsinline></video>'
      : '<img src="' + url + '" alt="معاينة القصة">';
    preview.classList.remove("hidden");
    $("#publishStory").disabled = false;
  }

  function setupEvents() {
    $("#openComposer").addEventListener("click", openCreatePost);
    $("#sidebarCreatePost").addEventListener("click", openCreatePost);
    $("#closeComposer").addEventListener("click", closeCreatePost);
    $("#publishPost").addEventListener("click", publishPost);
    postText.addEventListener("input", updatePublishState);
    $("#chooseImage").addEventListener("click", () => {
      postMediaInput.accept = "image/jpeg,image/png,image/webp,image/avif";
      postMediaInput.click();
    });
    $("#chooseWallpaper").addEventListener("click", () => {
      postMediaInput.accept = "image/jpeg,image/png,image/webp,image/avif";
      postMediaInput.click();
    });
    postMediaInput.addEventListener("change", () => {
      const file = postMediaInput.files && postMediaInput.files[0];
      if (!file) return;
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"];
      if (!allowed.includes(file.type)) {
        postMediaInput.value = "";
        toast("النشر متاح للصور فقط حالياً");
        return;
      }
      if (file.size > 80 * 1024 * 1024) {
        postMediaInput.value = "";
        toast("الحد الأقصى لحجم الصورة 80MB");
        return;
      }
      S.file = file;
      previewPostMedia(file);
    });

    feed.addEventListener("click", handleFeedClick);
    feed.addEventListener("submit", submitComment);
    document.addEventListener("click", event => {
      if (!event.target.closest(".post-more-wrap") && !event.target.closest(".post-menu")) closeAllPostMenus();
    });

    $("#refreshFeed").addEventListener("click", () => loadFeed(true));
    $("#loadMore").addEventListener("click", () => loadFeed(false));
    $("#restoreHiddenPosts").addEventListener("click", () => {
      S.hiddenPosts.clear();
      S.hiddenUsers.clear();
      saveSet(STORAGE_HIDDEN_POSTS, S.hiddenPosts);
      saveSet(STORAGE_HIDDEN_USERS, S.hiddenUsers);
      renderFeed();
      toast("أُعيد إظهار المنشورات المخفية");
    });
    $$(".filter-button").forEach(button => {
      button.addEventListener("click", () => {
        S.sort = button.dataset.sort;
        $$(".filter-button").forEach(item => {
          const active = item === button;
          item.classList.toggle("active", active);
          item.setAttribute("aria-pressed", active ? "true" : "false");
        });
        renderFeed();
      });
    });

    $("#editPostForm").addEventListener("submit", savePostEdit);
    $("#confirmDeletePost").addEventListener("click", deletePost);
    $("#reportPostForm").addEventListener("submit", submitPostReport);

    $$("[data-close-dialog]").forEach(button => {
      button.addEventListener("click", () => closeDialog(button.dataset.closeDialog));
    });
    $$(".dialog-backdrop").forEach(backdrop => {
      backdrop.addEventListener("click", event => {
        if (event.target !== backdrop) return;
        if (backdrop.id === "postModal") closeCreatePost();
        else if (backdrop.id === "storyComposer") closeStoryComposer();
        else closeDialog(backdrop.id);
      });
    });

    $("#createStoryButton").addEventListener("click", openStoryComposer);
    $("#closeStoryComposer").addEventListener("click", closeStoryComposer);
    $("#publishStory").addEventListener("click", publishStory);
    $("#storyMediaInput").addEventListener("change", handleStoryMediaChange);
    $("#closeStoryViewer").addEventListener("click", closeStoryViewer);
    $("#nextStory").addEventListener("click", nextStory);
    $("#prevStory").addEventListener("click", prevStory);

    $("#storyViewer").addEventListener("click", event => {
      if (event.target.closest("button")) return;
      if (S.storyIgnoreClick) {
        S.storyIgnoreClick = false;
        window.clearTimeout(S.storyClickSuppressTimer);
        return;
      }
      const rect = $("#storyViewerMedia").getBoundingClientRect();
      if (event.clientX < rect.left + rect.width * .25) prevStory();
      else if (event.clientX > rect.left + rect.width * .75) nextStory();
      else {
        S.storyPaused = !S.storyPaused;
        const video = $("#storyViewerMedia").querySelector("video");
        if (video) {
          if (S.storyPaused) video.pause();
          else video.play().catch(() => {});
        }
      }
    });
    $("#storyViewer").addEventListener("touchstart", event => {
      S.storyTouchX = event.changedTouches[0].clientX;
    }, { passive: true });
    $("#storyViewer").addEventListener("touchend", event => {
      const difference = event.changedTouches[0].clientX - S.storyTouchX;
      if (Math.abs(difference) > 55) {
        S.storyIgnoreClick = true;
        window.clearTimeout(S.storyClickSuppressTimer);
        S.storyClickSuppressTimer = window.setTimeout(() => { S.storyIgnoreClick = false; }, 650);
        if (difference < 0) nextStory();
        else prevStory();
      }
    }, { passive: true });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeAllPostMenus();
        if (!$("#storyViewer").classList.contains("hidden")) closeStoryViewer();
        else {
          const open = $(".dialog-backdrop:not(.hidden)");
          if (open) {
            if (open.id === "postModal") closeCreatePost();
            else if (open.id === "storyComposer") closeStoryComposer();
            else closeDialog(open.id);
          }
        }
      }
      if (!$("#storyViewer").classList.contains("hidden")) {
        if (event.key === "ArrowLeft") nextStory();
        if (event.key === "ArrowRight") prevStory();
      }
    });

    window.addEventListener("hashchange", () => {
      const id = window.location.hash.replace(/^#post-/, "");
      if (!id) return;
      const card = $("#post-" + CSS.escape(id));
      if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function initialize() {
    try {
      const response = await fetch("/api/supabase/config", { cache: "no-store" });
      if (!response.ok) throw new Error("تعذر الاتصال بإعدادات الحساب");
      const config = await response.json();
      if (!config || !config.url || !config.anonKey) throw new Error("إعدادات قاعدة البيانات غير مكتملة");

      S.db = window.supabase.createClient(config.url, config.anonKey);
      const session = await S.db.auth.getSession();
      S.user = session.data && session.data.session ? session.data.session.user : null;
      updateProfile();
      await Promise.all([loadFeed(true), loadStories()]);

      S.db.auth.onAuthStateChange((_event, newSession) => {
        S.user = newSession ? newSession.user : null;
        S.likes.clear();
        S.saves.clear();
        S.commentCache.clear();
        S.commentsOpen.clear();
        updateProfile();
        loadFeed(true);
        loadStories();
      });
    } catch (error) {
      console.error("SOCIAL PAGE INITIALIZATION:", error);
      feed.setAttribute("aria-busy", "false");
      feed.innerHTML = '<div class="feed-state"><span class="empty-state-icon"><span class="material-icons-round">cloud_off</span></span><b>تعذر الاتصال بالخدمة</b><p>' +
        escapeHtml(error.message || "أعد تحميل الصفحة بعد التحقق من الاتصال.") +
        '</p><button type="button" data-feed-action="reload">إعادة المحاولة</button></div>';
    }
  }

  setupEvents();
  initialize();
})();