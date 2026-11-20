import { supabase } from "./supabase.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const page = {
  total: $("#pointsTotal"),
  status: $("#pointsStatus"),
  ledger: $("#pointsLedger"),
  filters: $$("[data-filter]")
};

const state = {
  entries: [],
  filter: "all",
  activityRange: "7d",
  loadRequest: 0
};

const RANKS = [
  {key:"beginner",name:"مبتدئ",threshold:0,icon:"star",color:"beginner"},
  {key:"bronze",name:"برونزي",threshold:30,icon:"workspace_premium",color:"bronze"},
  {key:"silver",name:"فضي",threshold:75,icon:"military_tech",color:"silver"},
  {key:"gold",name:"ذهبي",threshold:150,icon:"emoji_events",color:"gold"},
  {key:"expert",name:"خبير",threshold:300,icon:"diamond",color:"expert"},
  {key:"master",name:"ماستر",threshold:500,icon:"stars",color:"master"}
];

const ACTIVITY_DECAY_MS = 7 * 24 * 60 * 60 * 1000;
const ACTIVITY_RANGES = {
  "24h":24 * 60 * 60 * 1000,
  "7d":7 * 24 * 60 * 60 * 1000,
  "30d":30 * 24 * 60 * 60 * 1000
};

function formatPoints(value) {
  const number = Number(value || 0);
  return number.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ar-MA",{dateStyle:"medium",timeStyle:"short"}).format(date);
}

function labelForReason(reason) {
  const value = String(reason || "").toLowerCase();
  if (value.includes("wallpaper_like")) return "إعجاب جديد بخلفية";
  if (value.includes("wallpaper_comment")) return "تعليق على خلفية";
  if (value.includes("active_time")) return "نشاط فعلي لمدة 10 دقائق";
  if (value.includes("daily")) return "المكافأة اليومية";
  if (value.includes("goal")) return "مكافأة إكمال الهدف";
  if (value.includes("download")) return "تحميل خلفية";
  if (value.includes("redeem") || value.includes("redemption")) return "استبدال النقاط";
  if (value.includes("release")) return "إرجاع نقاط محجوزة";
  if (value.includes("upload") || value.includes("wallpaper") || value.includes("publish")) return "نشر خلفية جديدة";
  return String(reason || "إضافة نقاط").replaceAll("_"," ");
}

function categoryFor(entry) {
  const reason = String(entry.reason || "").toLowerCase();
  if (reason.includes("wallpaper_like") || reason.includes("wallpaper_comment") ||
      reason.includes("active_time") || reason.includes("daily") ||
      reason.includes("goal") || reason.includes("reward") || reason.includes("redeem")) return "reward";
  if (reason.includes("download")) return "download";
  if (reason.includes("upload") || reason.includes("wallpaper") || reason.includes("publish")) return "publish";
  return "other";
}

function renderStats(total, entries) {
  $("#statTotal").textContent = formatPoints(total);
  $("#statOperations").textContent = String(entries.length);
  $("#statWallpapers").textContent = String(entries.filter(entry => categoryFor(entry) === "publish").length);
  $("#statBest").textContent = formatPoints(entries.reduce((best,entry) => Math.max(best,Number(entry.points || 0)),0));
}

function renderLedger() {
  page.ledger.replaceChildren();
  const entries = state.filter === "all"
    ? state.entries
    : state.entries.filter(entry => categoryFor(entry) === state.filter);

  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = state.entries.length
      ? "ما كايناش عمليات في هاد القسم حالياً."
      : "مازال ما عندك حتى عملية مسجلة في السجل.";
    page.ledger.append(empty);
    page.status.textContent = state.entries.length ? "اختار تصنيفاً آخر لعرض العمليات." : "سجل النقاط فارغ حالياً.";
    return;
  }

  page.status.textContent = "آخر العمليات المسجلة";
  const fragment = document.createDocumentFragment();
  for (const entry of entries) {
    const category = categoryFor(entry);
    const row = document.createElement("article");
    row.className = "ledger-row";

    const icon = document.createElement("span");
    icon.className = "material-icons ledger-icon";
    icon.textContent = category === "publish" ? "cloud_upload" :
      category === "download" ? "download" :
      category === "reward" ? "redeem" : "stars";
    icon.setAttribute("aria-hidden","true");

    const details = document.createElement("div");
    details.className = "ledger-copy";
    const title = document.createElement("strong");
    title.className = "ledger-title";
    title.textContent = labelForReason(entry.reason);
    const date = document.createElement("time");
    date.className = "ledger-date";
    date.dateTime = entry.created_at || "";
    date.textContent = formatDate(entry.created_at);
    details.append(title,date);

    const amount = document.createElement("strong");
    amount.className = "ledger-points";
    const points = Number(entry.points || 0);
    amount.textContent = `${points > 0 ? "+" : ""}${formatPoints(points)}`;
    if (points < 0) amount.classList.add("negative");

    row.append(icon,details,amount);
    fragment.append(row);
  }
  page.ledger.append(fragment);
}

function updateGoalProgress(total, currentRank, nextRank) {
  const goal = nextRank ? nextRank.threshold : currentRank.threshold;
  const start = currentRank.threshold;
  const span = goal - start;
  const progress = nextRank ? Math.max(0,Math.min(100,((total-start)/span)*100)) : 100;
  const label = `${formatPoints(total)} / ${formatPoints(goal)}`;

  $("#goalCurrent").textContent = label;
  $("#levelProgressText").textContent = label;
  $("#goalProgress").style.width = `${progress}%`;
  $("#levelProgress").style.width = `${progress}%`;
  $(".goal-label strong").textContent = formatPoints(goal);
  $(".goal-progress .progress-track").setAttribute("aria-valuenow",String(Math.round(progress)));
  $(".level-progress-track").setAttribute("aria-valuenow",String(Math.round(progress)));
}

function getRankDates(entries) {
  const ordered = [...entries]
    .filter(entry => Number(entry.points || 0) > 0 && entry.created_at)
    .sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
  const dates = {};
  let cumulative = 0;
  for (const entry of ordered) {
    const before = cumulative;
    cumulative += Number(entry.points || 0);
    for (const rank of RANKS) {
      if (rank.threshold > 0 && before < rank.threshold && cumulative >= rank.threshold && !dates[rank.key]) {
        dates[rank.key] = entry.created_at;
      }
    }
  }
  return dates;
}

function renderRanks(total, entries) {
  const container = $("#rankPathList");
  container.replaceChildren();

  let currentIndex = 0;
  RANKS.forEach((rank,index) => {
    if (total >= rank.threshold) currentIndex = index;
  });

  const dates = getRankDates(entries);
  RANKS.forEach((rank,index) => {
    const next = RANKS[index+1] || null;
    const earned = total >= rank.threshold;
    const current = index === currentIndex;
    const row = document.createElement("article");
    row.className = `rank-step${current ? " is-current" : ""}${earned ? " is-earned" : " is-locked"}`;
    row.dataset.rank = rank.color;

    const badge = document.createElement("div");
    badge.className = "rank-badge-side";
    const icon = document.createElement("span");
    icon.className = "rank-medal material-icons";
    icon.textContent = rank.icon;
    const badgeText = document.createElement("div");
    badgeText.className = "rank-badge-copy";
    const name = document.createElement("strong");
    name.textContent = rank.name;
    const threshold = document.createElement("small");
    threshold.textContent = rank.threshold === 0 ? "من البداية" : `${formatPoints(rank.threshold)} نقطة`;
    badgeText.append(name,threshold);
    if (current) {
      const tag = document.createElement("span");
      tag.className = "rank-current-tag";
      tag.textContent = "مستواك الحالي";
      badgeText.append(tag);
    }
    badge.append(icon,badgeText);

    const progress = document.createElement("div");
    progress.className = "rank-progress-side";
    const date = document.createElement("div");
    date.className = "rank-date";
    const dateIcon = document.createElement("span");
    dateIcon.className = "material-icons";
    dateIcon.textContent = earned ? "event_available" : "lock";
    const dateText = document.createElement("span");
    dateText.textContent = earned
      ? (rank.threshold === 0 ? "بداية المسار" : dates[rank.key] ? `تم بلوغ المستوى · ${formatDate(dates[rank.key])}` : "تم فتح المستوى")
      : `باقي ${formatPoints(Math.max(0,rank.threshold-total))} نقطة`;
    date.append(dateIcon,dateText);
    const track = document.createElement("div");
    track.className = "rank-track";
    const fill = document.createElement("span");
    const start = rank.threshold;
    const end = next ? next.threshold : rank.threshold;
    const width = total < start ? 0 : next ? Math.max(0,Math.min(100,((total-start)/(end-start))*100)) : 100;
    fill.style.width = `${width}%`;
    track.append(fill);
    progress.append(date,track);

    const pointSide = document.createElement("div");
    pointSide.className = "rank-points-side";
    const amount = document.createElement("strong");
    amount.textContent = current && next
      ? `${formatPoints(total)} / ${formatPoints(next.threshold)}`
      : `${formatPoints(rank.threshold)} نقطة`;
    pointSide.append(amount);

    row.append(badge,progress,pointSide);
    container.append(row);
  });

  const currentRank = RANKS[currentIndex];
  const nextRank = RANKS[currentIndex+1] || null;
  const title = $(".level-name strong");
  title.replaceChildren(document.createTextNode(currentRank.name));
  const arrow = document.createElement("span");
  arrow.className = "material-icons";
  arrow.textContent = "chevron_left";
  title.append(arrow);
  $(".level-medal .material-icons").textContent = currentRank.icon;
  updateGoalProgress(total,currentRank,nextRank);
}

function isQualifyingActivity(entry) {
  const reason = String(entry.reason || "").toLowerCase();
  const type = String(entry.reward_type || "").toLowerCase();
  if (type === "like" || type === "comment") return true;
  if (/(like|comment)/.test(reason)) return true;
  if (/(download|redeem|redemption|delete|refund)/.test(reason)) return false;
  if (/(publish|published|upload|submission)/.test(reason)) return true;
  return Boolean(entry.wallpaper_id) && Number(entry.points || 0) > 0;
}

function activityEvents(entries) {
  return entries.filter(isQualifyingActivity)
    .map(entry => new Date(entry.created_at).getTime())
    .filter(Number.isFinite).sort((a,b) => a-b);
}

function activityScoreAt(timestamp,events) {
  let last = 0;
  for (let i=events.length-1;i>=0;i--) {
    if (events[i] <= timestamp) { last=events[i]; break; }
  }
  return last ? Math.max(0,Math.min(100,100*(1-(timestamp-last)/ACTIVITY_DECAY_MS))) : 0;
}

function relativeTime(timestamp) {
  if (!timestamp) return "لا يوجد نشاط مؤهل بعد";
  const minutes = Math.floor(Math.max(0,Date.now()-timestamp)/60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes/60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.floor(hours/24)} يوم`;
}

function drawActivityChart(events,range,score) {
  const svg = $("#activityChart");
  const area = $("#activityChartArea");
  const line = $("#activityChartLine");
  const point = $("#activityChartPoint");
  if (!svg || !area || !line || !point) return;

  const now = Date.now();
  const duration = ACTIVITY_RANGES[range] || ACTIVITY_RANGES["7d"];
  const start = now-duration;
  const times = new Set();
  for (let i=0;i<=80;i++) times.add(start+duration*i/80);
  events.forEach(eventTime => {
    if (eventTime > start && eventTime <= now) {
      times.add(Math.max(start,eventTime-1));
      times.add(eventTime);
    }
  });

  const points = [...times].sort((a,b)=>a-b).map(time => ({
    x:((time-start)/duration)*320,
    y:130-activityScoreAt(time,events)*1.2
  }));
  const path = points.map((item,index)=>`${index ? "L":"M"}${item.x.toFixed(2)} ${item.y.toFixed(2)}`).join(" ");
  const first = points[0] || {x:0,y:130};
  const last = points[points.length-1] || {x:320,y:130};
  const safePath = path || "M0 130 L320 130";

  line.setAttribute("d",safePath);
  area.setAttribute("d",`${safePath} L${last.x.toFixed(2)} 130 L${first.x.toFixed(2)} 130 Z`);
  point.setAttribute("cx",last.x.toFixed(2));
  point.setAttribute("cy",last.y.toFixed(2));
  svg.classList.toggle("is-down",score<50);
  $("#activityRangeStart").textContent = range === "24h" ? "قبل 24 ساعة" : range === "30d" ? "قبل 30 يوماً" : "قبل 7 أيام";
}

function renderActivity(entries) {
  const events = activityEvents(entries);
  const now = Date.now();
  const score = activityScoreAt(now,events);
  const previous = activityScoreAt(now-60*60*1000,events);
  const trend = score-previous;
  const lastAction = events[events.length-1] || 0;

  $("#activityIndexValue").textContent = String(Math.round(score));
  $("#activityIndexStatus").textContent = `${Math.round(score)} من 100`;
  $("#activityLastAction").textContent = relativeTime(lastAction);

  const chip = $("#activityTrendChip");
  const rising = trend > .5;
  const falling = trend < -.5;
  chip.classList.toggle("trend-up",rising);
  chip.classList.toggle("trend-down",falling || (!rising && score===0));
  chip.classList.toggle("trend-flat",!rising && !falling && score>0);
  $(".material-icons",chip).textContent = rising ? "trending_up" : falling ? "trending_down" : "trending_flat";
  $("#activityTrendText").textContent = rising ? "ارتفاع حديث" : falling ? "انخفاض تدريجي" : score>0 ? "مستقر حالياً" : "بانتظار النشاط";

  drawActivityChart(events,state.activityRange,score);
}

function bindControls() {
  $("#pointsBackBtn")?.addEventListener("click",event => {
    if (window.history.length > 1) {
      event.preventDefault();
      window.history.back();
    }
  });

  page.filters.forEach(button => button.addEventListener("click",() => {
    state.filter = button.dataset.filter || "all";
    page.filters.forEach(item => {
      const selected = item === button;
      item.classList.toggle("active",selected);
      item.setAttribute("aria-pressed",String(selected));
    });
    renderLedger();
  }));

  $$("[data-activity-range]").forEach(button => button.addEventListener("click",() => {
    state.activityRange = button.dataset.activityRange || "7d";
    $$("[data-activity-range]").forEach(item => {
      const selected = item === button;
      item.classList.toggle("is-selected",selected);
      item.setAttribute("aria-pressed",String(selected));
    });
    renderActivity(state.entries);
  }));
}

async function loadPoints() {
  const request = ++state.loadRequest;
  try {
    const {data,error} = await supabase.auth.getSession();
    if (error) throw error;
    const token = data?.session?.access_token;
    if (!token) {
      page.total.textContent = "—";
      page.status.textContent = "سجّل الدخول باش تشوف نقاطك.";
      page.ledger.replaceChildren();
      const link = document.createElement("a");
      link.href = "profile.html";
      link.className = "empty-state";
      link.textContent = "العودة إلى الحساب وتسجيل الدخول";
      page.ledger.append(link);
      return;
    }

    const response = await fetch("/api/points/me",{
      headers:{Authorization:`Bearer ${token}`,Accept:"application/json"},
      cache:"no-store"
    });
    const payload = await response.json().catch(()=>({}));
    if (!response.ok || payload?.success !== true) throw new Error(payload?.message || "تعذر تحميل النقاط");
    if (request !== state.loadRequest) return;

    const total = Number(payload.total);
    if (!Number.isFinite(total) || total<0) throw new Error("الرصيد المستلم غير صالح");
    state.entries = Array.isArray(payload.entries) ? payload.entries : [];

    page.total.textContent = formatPoints(total);
    renderActivity(state.entries);
    renderStats(total,state.entries);
    renderRanks(total,state.entries);
    renderLedger();

    if (payload.engagementHistoryWarning) {
      page.status.className = "points-status warning";
      page.status.textContent = payload.engagementHistoryWarning;
    } else {
      page.status.className = "points-status";
    }
  } catch (error) {
    if (request !== state.loadRequest) return;
    console.error("POINTS PAGE LOAD:",error);
    page.total.textContent = "—";
    page.status.className = "points-status error";
    page.status.textContent = error.message || "تعذر تحميل النقاط حالياً.";
  }
}

bindControls();
loadPoints();
window.addEventListener("wallpaperHubPointsChanged",loadPoints);
setInterval(() => renderActivity(state.entries),60*1000);
