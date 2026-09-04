// دالة مساعدة لتلوين الإشارات باللون الأزرق
function formatMentionText(text) {
    if (!text) return "";
    return text.replace(/(@[\w\u0600-\u06FF]+)/g, '<span class="mention-tag">$1</span>');
}

// ابحث عن قسم الإشارة (wallpaper_mention) واستبدله كالتالي:
else if (notif.type === "wallpaper_mention") {

    card.dataset.category = "mention";
    card.classList.add("mention-card"); // تمييز بطاقة الإشارة

    card.innerHTML = `
    <div class="card-side-indicator mention-indicator"></div>

    <div class="avatar-container">
        <img
            src="${notif.avatar || 'assets/images/user.png'}"
            class="avatar"
        >
        <span class="type-badge mention-badge">
            @
        </span>
    </div>

    <div class="notif-body">
        <p class="notif-text">
            ${formatMentionText(notif.content)}
        </p>

        <div class="comment-quote mention-comment">
            💬 ${formatMentionText(notif.commentText || "تمت الإشارة إليك في تعليق")}
        </div>

        <div class="comment-quote">
            📱 ${notif.wallpaperTitle || "خلفيتك"}
        </div>

        <div class="notif-meta">
            ${notif.date || "الآن"}
        </div>
    </div>
    `;
}
