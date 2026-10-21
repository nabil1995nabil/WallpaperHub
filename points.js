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
  return number.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ar-MA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
function labelForReason(reason) {
  const value = String(reason || "").toLowerCase();
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
  if (reason.includes("upload") || reason.includes("wallpaper") || reason.includes("publish")) return "publish";
  if (reason.includes("download")) return "download";
  if (reason.includes("daily") || reason.includes("goal") || reason.includes("reward") || reason.includes("redeem")) return "reward";
  return "other";
}
function setProgress(total) {
  const progress = Math.max(0, Math.min(100, total / 1 * 100));
  const label = `${formatPoints(total)} / 1.0`;
  document.getElementById("goalCurrent").textContent = label;
  document.getElementById("levelProgressText").textContent = label;
  document.getElementById("goalProgress").style.width = `${progress}%`;
  document.getElementById("levelProgress").style.width = `${progress}%`;
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
    setProgress(total);
    renderStats(total, allEntries);
    renderRankPath(total, allEntries);
    renderEntries();
  } catch (error) {
    console.error("POINTS PAGE LOAD:", error);
    totalEl.textContent = "—";
    statusEl.className = "points-status error";
    statusEl.textContent = error.message || "تعذر تحميل النقاط حالياً.";
  }
}
loadPoints();
