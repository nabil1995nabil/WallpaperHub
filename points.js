import { supabase } from "./supabase.js";

const totalEl = document.getElementById("pointsTotal");
const statusEl = document.getElementById("pointsStatus");
const ledgerEl = document.getElementById("pointsLedger");
const filterButtons = [...document.querySelectorAll("[data-filter]")];
let allEntries = [];
let activeFilter = "all";

document.getElementById("pointsBackBtn")?.addEventListener("click", (event) => {
  if (window.history.length > 1) {
    event.preventDefault();
    window.history.back();
  }
});

function formatPoints(value) {
  const number = Number(value || 0);
  return number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ar-MA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
function labelForReason(reason) {
  const value = String(reason || "").toLowerCase();
  if (value.includes("wallpaper_like")) return "إعجاب جديد بخلفية";
  if (value.includes("wallpaper_comment")) return "تعليق على خلفية";
  if (value.includes("active_time")) return "نشاط فعلي لمدة 10 دقائق";
  if (value.includes("daily")) return "المكافأة اليومية";
  if (value.includes("goal")) return "مكافأة إكمال الهدف";
  if (value.includes("upload") || value.includes("wallpaper") || value.includes("publish")) return "نشر خلفية جديدة";
  if (value.includes("download")) return "تحميل";
  if (value.includes("redeem") || value.includes("redemption")) return "استبدال النقاط";
  if (value.includes("release")) return "إرجاع نقاط محجوزة";
  return String(reason || "إضافة نقاط").replaceAll("_", " ");
}
function filterForEntry(entry) {
  const reason = String(entry.reason || "").toLowerCase();
  if (reason.includes("wallpaper_like") || reason.includes("wallpaper_comment") || reason.includes("active_time") || reason.includes("daily") || reason.includes("goal") || reason.includes("reward") || reason.includes("redeem")) return "reward";
  if (reason.includes("upload") || reason.includes("wallpaper") || reason.includes("publish")) return "publish";
  if (reason.includes("download")) return "download";
  return "other";
}
function renderStats(total, entries) {
  document.getElementById("statTotal").textContent = formatPoints(total);
  document.getElementById("statOperations").textContent = String(entries.length);
  document.getElementById("statWallpapers").textContent = String(entries.filter(e => filterForEntry(e) === "publish").length);
  const best = entries.reduce((max, e) => Math.max(max, Number(e.points || 0)), 0);
  document.getElementById("statBest").textContent = formatPoints(best);
}
function renderEntries() {
  ledgerEl.replaceChildren();
  const entries = activeFilter === "all" ? allEntries : allEntries.filter(entry => filterForEntry(entry) === activeFilter);
  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = allEntries.length ? "ما كايناش عمليات فهاد القسم دابا." : "مازال ما عندك حتى عملية مسجلة فالسجل.";
    ledgerEl.append(empty);
    statusEl.textContent = allEntries.length ? "اختار قسماً آخر لعرض العمليات." : "سجل النقاط فارغ حالياً.";
    return;
  }
  statusEl.textContent = "آخر العمليات المسجلة";
  entries.forEach(entry => {
    const row = document.createElement("article");
    row.className = "ledger-row";
    const icon = document.createElement("span");
    icon.className = "material-icons ledger-icon";
    const category = filterForEntry(entry);
    icon.textContent = category === "publish" ? "cloud_upload" : category === "download" ? "download" : category === "reward" ? "emoji_events" : "stars";
    icon.setAttribute("aria-hidden", "true");
    const copy = document.createElement("div");
    copy.className = "ledger-copy";
    const title = document.createElement("div");
    title.className = "ledger-title";
    title.textContent = labelForReason(entry.reason);
    const date = document.createElement("div");
    date.className = "ledger-date";
    date.textContent = formatDate(entry.created_at);
    copy.append(title, date);
    const points = document.createElement("strong");
    points.className = "ledger-points";
    const amount = Number(entry.points || 0);
    points.textContent = `${amount > 0 ? "+" : ""}${formatPoints(amount)}`;
    if (amount < 0) points.classList.add("negative");
    row.append(icon, copy, points);
    ledgerEl.append(row);
  });
}
filterButtons.forEach(button => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter || "all";
  filterButtons.forEach(item => {
    const selected = item === button;
    item.classList.toggle("active", selected);
    item.setAttribute("aria-pressed", String(selected));
  });
  renderEntries();
}));


const RANKS = [
  { key:"beginner", name:"مبتدئ", threshold:0, icon:"star", color:"beginner" },
  { key:"bronze", name:"برونزي", threshold:30, icon:"workspace_premium", color:"bronze" },
  { key:"silver", name:"فضي", threshold:75, icon:"military_tech", color:"silver" },
  { key:"gold", name:"ذهبي", threshold:150, icon:"emoji_events", color:"gold" },
  { key:"expert", name:"خبير", threshold:300, icon:"diamond", color:"expert" },
  { key:"master", name:"ماستر", threshold:500, icon:"stars", color:"master" }
];

function getRankDates(entries) {
  const ordered = [...entries].filter(e => Number(e.points || 0) > 0 && e.created_at)
    .sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
  const dates = { beginner: null };
  let cumulative = 0;
  for (const entry of ordered) {
    const before = cumulative;
    cumulative += Number(entry.points || 0);
    for (const rank of RANKS) {
      if (rank.threshold > 0 && before < rank.threshold && cumulative >= rank.threshold && !dates[rank.key]) dates[rank.key] = entry.created_at;
    }
  }
  return dates;
}

function renderRankPath(total, entries) {
  const container = document.getElementById("rankPathList");
  if (!container) return;
  container.replaceChildren();
  const dates = getRankDates(entries);
  let currentIndex = 0;
  RANKS.forEach((rank, index) => { if (total >= rank.threshold) currentIndex = index; });
  const nextRank = RANKS[currentIndex + 1] || null;

  RANKS.forEach((rank, index) => {
    const next = RANKS[index + 1] || null;
    const row = document.createElement("article");
    row.className = "rank-step" + (index === currentIndex ? " is-current" : "") + (total >= rank.threshold ? " is-earned" : " is-locked");
    row.dataset.rank = rank.color;

    const pointsSide = document.createElement("div");
    pointsSide.className = "rank-points-side";
    const pointValue = document.createElement("strong");
    pointValue.textContent = `${formatPoints(total)} / ${formatPoints(next ? next.threshold : rank.threshold)}`;
    const pointCaption = document.createElement("small");
    pointCaption.textContent = index === currentIndex && next ? "نقاطك / الهدف التالي" : "نقاط المستوى";
    pointsSide.append(pointValue, pointCaption);

    const progressSide = document.createElement("div");
    progressSide.className = "rank-progress-side";
    const date = document.createElement("div");
    date.className = "rank-date";
    const dateIcon = document.createElement("span");
    dateIcon.className = "material-icons";
    dateIcon.textContent = "event_available";
    const dateText = document.createElement("span");
    if (total >= rank.threshold) dateText.textContent = rank.threshold === 0 ? "بداية المسار" : (dates[rank.key] ? `تاريخ بلوغ المستوى: ${formatDate(dates[rank.key])}` : "تم بلوغ المستوى");
    else dateText.textContent = `باقي ${formatPoints(Math.max(0, rank.threshold-total))} نقطة لفتح الشارة`;
    date.append(dateIcon, dateText);

    const track = document.createElement("div");
    track.className = "rank-track";
    const fill = document.createElement("span");
    let progress = 0;
    if (total >= rank.threshold) progress = !next ? 100 : Math.max(0, Math.min(100, ((total-rank.threshold)/(next.threshold-rank.threshold))*100));
    fill.style.width = `${progress}%`;
    track.append(fill);
    progressSide.append(date, track);

    const badgeSide = document.createElement("div");
    badgeSide.className = "rank-badge-side";
    const medal = document.createElement("span");
    medal.className = "rank-medal material-icons";
    medal.textContent = rank.icon;
    const badgeCopy = document.createElement("div");
    badgeCopy.className = "rank-badge-copy";
    const name = document.createElement("strong"); name.textContent = rank.name;
    const threshold = document.createElement("small");
    threshold.textContent = rank.threshold === 0 ? "من البداية" : `${formatPoints(rank.threshold)} نقطة`;
    badgeCopy.append(name, threshold);
    if (index === currentIndex) {
      const tag = document.createElement("span"); tag.className = "rank-current-tag"; tag.textContent = "مستواك الحالي"; badgeCopy.append(tag);
    }
    badgeSide.append(medal, badgeCopy);
    row.append(pointsSide, progressSide, badgeSide);
    container.append(row);
  });

  const current = RANKS[currentIndex];
  const goal = nextRank ? nextRank.threshold : current.threshold;
  const currentLabel = document.querySelector(".level-name strong");
  if (currentLabel) {
    const label = document.createElement("span"); label.className = "material-icons"; label.textContent = "chevron_right";
    currentLabel.replaceChildren(document.createTextNode(current.name + " "), label);
  }
  const medal = document.querySelector(".level-medal .material-icons");
  if (medal) medal.textContent = current.icon;
  const labelText = `${formatPoints(total)} / ${formatPoints(goal)}`;
  document.getElementById("levelProgressText").textContent = labelText;
  document.getElementById("goalCurrent").textContent = labelText;
  const percent = nextRank ? Math.max(0, Math.min(100, total / goal * 100)) : 100;
  document.getElementById("levelProgress").style.width = `${percent}%`;
  document.getElementById("goalProgress").style.width = `${percent}%`;
  const goalStrong = document.querySelector(".goal-label strong");
  if (goalStrong) goalStrong.textContent = formatPoints(goal);
}



const ACTIVITY_DECAY_MS = 7 * 24 * 60 * 60 * 1000;
const ACTIVITY_RANGES = { "24h": 24 * 60 * 60 * 1000, "7d": 7 * 24 * 60 * 60 * 1000, "30d": 30 * 24 * 60 * 60 * 1000 };
let activityRange = "7d";
let activityEventsCache = [];

function isQualifyingActivity(entry) {
  const reason = String(entry.reason || "").toLowerCase();
  const type = String(entry.reward_type || "").toLowerCase();
  if (["like", "comment"].includes(type)) return true;
  if (/(like|comment)/.test(reason)) return true;
  if (/(download|redeem|redemption|delete|refund)/.test(reason)) return false;
  if (/(publish|published|upload|submission)/.test(reason)) return true;
  // Legacy publish rewards are tied to wallpaper_id even if their reason label is older.
  return Boolean(entry.wallpaper_id) && Number(entry.points || 0) > 0;
}

function getActivityEvents(entries) {
  return (entries || [])
    .filter(isQualifyingActivity)
    .map(entry => new Date(entry.created_at).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
}

function activityScoreAt(timestamp, events) {
  let lastAction = 0;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i] <= timestamp) { lastAction = events[i]; break; }
  }
  if (!lastAction) return 0;
  return Math.max(0, Math.min(100, 100 * (1 - (timestamp - lastAction) / ACTIVITY_DECAY_MS)));
}

function relativeActivityTime(timestamp) {
  if (!timestamp) return "لا يوجد نشاط مؤهل بعد";
  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

function drawActivityChart(events, rangeKey, scoreNow) {
  const svg = document.getElementById("activityChart");
  const area = document.getElementById("activityChartArea");
  const line = document.getElementById("activityChartLine");
  const point = document.getElementById("activityChartPoint");
  if (!svg || !area || !line || !point) return;

  const now = Date.now();
  const rangeMs = ACTIVITY_RANGES[rangeKey] || ACTIVITY_RANGES["7d"];
  const start = now - rangeMs;
  const sampleTimes = new Set();

  for (let index = 0; index <= 80; index++) {
    sampleTimes.add(start + (rangeMs * index) / 80);
  }
  for (const eventTime of events) {
    if (eventTime > start && eventTime <= now) {
      sampleTimes.add(Math.max(start, eventTime - 1));
      sampleTimes.add(eventTime);
    }
  }

  const coords = [...sampleTimes].sort((a, b) => a - b).map(timestamp => ({
    x: ((timestamp - start) / rangeMs) * 320,
    y: 130 - activityScoreAt(timestamp, events) * 1.2
  }));
  const linePath = coords.map((point, index) =>
    `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`
  ).join(" ");
  const first = coords[0] || {x:0,y:130};
  const last = coords[coords.length - 1] || {x:320,y:130};
  const safePath = linePath || "M0 130 L320 130";

  line.setAttribute("d", safePath);
  area.setAttribute("d", `${safePath} L${last.x.toFixed(2)} 130 L${first.x.toFixed(2)} 130 Z`);
  point.setAttribute("cx", last.x.toFixed(2));
  point.setAttribute("cy", last.y.toFixed(2));
  svg.classList.toggle("wh-ai-down", scoreNow < 50);

  const startLabel = document.getElementById("activityRangeStart");
  if (startLabel) {
    startLabel.textContent = rangeKey === "24h" ? "قبل 24 ساعة" :
      rangeKey === "30d" ? "قبل 30 يوماً" : "قبل 7 أيام";
  }
}

function renderActivityIndicator(entries) {
  activityEventsCache = getActivityEvents(entries);
  const now = Date.now();
  const currentScore = activityScoreAt(now, activityEventsCache);
  const previousScore = activityScoreAt(now - 60 * 60 * 1000, activityEventsCache);
  const trend = currentScore - previousScore;
  const lastAction = activityEventsCache.length ? activityEventsCache[activityEventsCache.length - 1] : 0;

  const valueEl = document.getElementById("activityIndexValue");
  const statusEl = document.getElementById("activityIndexStatus");
  const lastEl = document.getElementById("activityLastAction");
  const chip = document.getElementById("activityTrendChip");
  const chipText = document.getElementById("activityTrendText");
  if (valueEl) valueEl.textContent = String(Math.round(currentScore));
  if (statusEl) statusEl.textContent = `${Math.round(currentScore)} من 100`;
  if (lastEl) lastEl.textContent = relativeActivityTime(lastAction);

  if (chip && chipText) {
    const rising = trend > 0.5;
    const falling = trend < -0.5;
    chip.classList.toggle("wh-ai-trend-up", rising);
    chip.classList.toggle("wh-ai-trend-down", falling || (!rising && currentScore === 0));
    chip.classList.toggle("wh-ai-trend-flat", !rising && !falling && currentScore > 0);
    const icon = chip.querySelector(".material-icons");
    if (icon) icon.textContent = rising ? "trending_up" : falling ? "trending_down" : "trending_flat";
    chipText.textContent = rising ? "ارتفاع حديث" : falling ? "انخفاض تدريجي" : currentScore > 0 ? "مستقر حالياً" : "بانتظار النشاط";
  }

  drawActivityChart(activityEventsCache, activityRange, currentScore);
}

document.querySelectorAll("[data-activity-range]").forEach(button => {
  button.addEventListener("click", () => {
    activityRange = button.dataset.activityRange || "7d";
    document.querySelectorAll("[data-activity-range]").forEach(item => {
      const selected = item === button;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    renderActivityIndicator(allEntries);
  });
});

async function loadPoints() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const token = data?.session?.access_token;
    if (!token) {
      totalEl.textContent = "—";
      statusEl.textContent = "سجّل الدخول باش تشوف نقاطك.";
      ledgerEl.replaceChildren();
      const link = document.createElement("a");
      link.href = "profile.html";
      link.textContent = "الرجوع إلى حسابي وتسجيل الدخول";
      link.className = "empty-state";
      ledgerEl.append(link);
      return;
    }
    const response = await fetch("/api/points/me", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.success !== true) throw new Error(payload?.message || "تعذر تحميل النقاط");
    const total = Number(payload.total);
    if (!Number.isFinite(total) || total < 0) throw new Error("الرصيد المستلم غير صالح");
    allEntries = Array.isArray(payload.entries) ? payload.entries : [];
    totalEl.textContent = formatPoints(total);
    renderActivityIndicator(allEntries);
    setProgress(total);
    renderStats(total, allEntries);
    renderRankPath(total, allEntries);
    renderEntries();
    if (payload.engagementHistoryWarning) {
      statusEl.className = "points-status warning";
      statusEl.textContent = payload.engagementHistoryWarning;
    } else {
      statusEl.className = "points-status";
    }
  } catch (error) {
    console.error("POINTS PAGE LOAD:", error);
    totalEl.textContent = "—";
    statusEl.className = "points-status error";
    statusEl.textContent = error.message || "تعذر تحميل النقاط حالياً.";
  }
}
loadPoints();

window.addEventListener("wallpaperHubPointsChanged",()=>{
  loadPoints();
});

// Keep the inactivity indicator current while the points page stays open.
setInterval(() => renderActivityIndicator(allEntries), 60 * 1000);
