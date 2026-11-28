(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const LOCAL_KEY = "wallpaperhub_islamic_state_v1";
  const QURAN_API = "https://api.alquran.cloud/v1";
  const HADITH_API = "https://hadeethenc.com/api/v1";
  const PRAYER_API = "https://api.aladhan.com/v1";

  const DEFAULT_STATE = {
    city: "Marrakech",
    country: "Morocco",
    method: 21,
    school: 0,
    reciter: "ar.alafasy",
    bookmark: { surah: 1, ayah: 1, page: 1 },
    reading: { fontSize: 30 },
    tasbih: { phrase: "سُبْحَانَ اللَّهِ", count: 0, target: 33, day: new Date().toISOString().slice(0, 10) }
  };

  let state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  let supabaseConfig = null;
  let accessToken = "";
  let accountId = "";
  let saveTimer = null;
  let currentSurah = null;
  let currentAyahIndex = 0;
  let surahList = [];
  let surahVerses = [];
  let audioVerses = [];
  let prayerData = null;
  let prayerTimezone = "Africa/Casablanca";
  let prayerRefreshTimer = null;
  let hadithCategories = [];
  let activeHadithCategory = null;
  let hadithPage = 1;
  let hadithHasMore = false;
  let hadithItems = [];
  let hadithLoadMoreButton = null;
  let toastTimer = null;

  function safeParse(value, fallback) {
    try {
      const result = JSON.parse(value);
      return result && typeof result === "object" ? result : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function arabicDigits(value) {
    return String(value).replace(/[0-9]/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
  }

  function showToast(message) {
    const node = $("islamicToast");
    if (!node) return;
    node.textContent = String(message || "");
    node.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => node.classList.remove("show"), 2600);
  }

  function setSyncStatus(stateName, label) {
    const node = $("syncStatus");
    if (!node) return;
    node.dataset.state = stateName;
    node.innerHTML = "<i></i>" + escapeHtml(label);
  }

  function getStoredSession() {
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index) || "";
        if (!key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
        const data = safeParse(localStorage.getItem(key) || "", null);
        const token = String(data && (data.access_token || (data.currentSession && data.currentSession.access_token)) || "").trim();
        if (token) return token;
      }
    } catch (error) {
      console.warn("ISLAMIC SESSION READ ERROR", error);
    }
    return "";
  }

  function readJwtSubject(token) {
    try {
      const part = String(token).split(".")[1];
      if (!part) return "";
      const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(decodeURIComponent(escape(window.atob(normalized))));
      return String(payload.sub || "");
    } catch (_) {
      return "";
    }
  }

  function readLocalState() {
    const saved = safeParse(localStorage.getItem(LOCAL_KEY) || "", null);
    if (!saved) return;
    state = {
      ...state,
      ...saved,
      bookmark: { ...state.bookmark, ...(saved.bookmark || {}) },
      reading: { ...state.reading, ...(saved.reading || {}) },
      tasbih: { ...state.tasbih, ...(saved.tasbih || {}) }
    };
  }

  function saveLocalState() {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("ISLAMIC LOCAL SAVE ERROR", error);
    }
  }

  function updateStateFromRemote(row) {
    if (!row) return;
    state.city = row.city || state.city;
    state.country = row.country || state.country;
    state.method = Number.isFinite(Number(row.prayer_method)) ? Number(row.prayer_method) : state.method;
    state.school = Number.isFinite(Number(row.asr_school)) ? Number(row.asr_school) : state.school;
    state.reciter = row.quran_reciter || state.reciter;
    if (row.quran_bookmark && typeof row.quran_bookmark === "object") state.bookmark = { ...state.bookmark, ...row.quran_bookmark };
    if (row.reading_settings && typeof row.reading_settings === "object") state.reading = { ...state.reading, ...row.reading_settings };
    if (row.tasbih_state && typeof row.tasbih_state === "object") state.tasbih = { ...state.tasbih, ...row.tasbih_state };
  }

  async function initializeAccountSync() {
    accessToken = getStoredSession();
    accountId = accessToken ? readJwtSubject(accessToken) : "";
    if (!accessToken || !accountId) {
      setSyncStatus("local", "حفظ على هذا الجهاز");
      return;
    }

    try {
      const configResponse = await fetch("/api/supabase/config", { cache: "no-store" });
      if (!configResponse.ok) throw new Error("تعذر قراءة إعدادات المزامنة");
      const config = await configResponse.json();
      if (!config || !config.success || !config.url || !config.anonKey) throw new Error("إعدادات المزامنة غير مكتملة");
      supabaseConfig = config;

      const query = supabaseConfig.url.replace(/\/+$/, "") +
        "/rest/v1/user_islamic_preferences?select=*&user_id=eq." +
        encodeURIComponent(accountId) + "&limit=1";
      const response = await fetch(query, {
        headers: {
          apikey: supabaseConfig.anonKey,
          Authorization: "Bearer " + accessToken
        },
        cache: "no-store"
      });
      if (!response.ok) throw new Error("تعذر تحميل تفضيلات الحساب (" + response.status + ")");
      const rows = await response.json();
      if (Array.isArray(rows) && rows[0]) updateStateFromRemote(rows[0]);
      saveLocalState();
      setSyncStatus("saved", "المزامنة مع الحساب مفعّلة");
    } catch (error) {
      console.warn("ISLAMIC REMOTE LOAD ERROR", error);
      setSyncStatus("error", "حفظ محلي · تعذرت المزامنة");
    }
  }

  function persistPreferences(showConfirmation) {
    saveLocalState();
    if (saveTimer) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(async () => {
      if (!supabaseConfig || !accessToken || !accountId) {
        setSyncStatus("local", "حفظ على هذا الجهاز");
        return;
      }
      try {
        const endpoint = supabaseConfig.url.replace(/\/+$/, "") +
          "/rest/v1/user_islamic_preferences?on_conflict=user_id";
        const payload = {
          user_id: accountId,
          city: String(state.city || "Marrakech").slice(0, 120),
          country: String(state.country || "Morocco").slice(0, 120),
          prayer_method: Number(state.method || 21),
          asr_school: Number(state.school || 0),
          quran_reciter: String(state.reciter || "ar.alafasy"),
          quran_bookmark: state.bookmark,
          reading_settings: state.reading,
          tasbih_state: state.tasbih,
          updated_at: new Date().toISOString()
        };
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            apikey: supabaseConfig.anonKey,
            Authorization: "Bearer " + accessToken,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal"
          },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error("Supabase " + response.status + ": " + message.slice(0, 180));
        }
        setSyncStatus("saved", "تم حفظ اختياراتك في حسابك");
        if (showConfirmation) showToast("تم حفظ اختياراتك في حسابك");
      } catch (error) {
        console.warn("ISLAMIC REMOTE SAVE ERROR", error);
        setSyncStatus("error", "حُفظت محلياً · تعذرت المزامنة");
        if (showConfirmation) showToast("حُفظت اختياراتك على هذا الجهاز، وتعذرت المزامنة حالياً");
      }
    }, 500);
  }

  function setInitialFormValues() {
    if ($("countryInput")) $("countryInput").value = state.country;
    if ($("cityInput")) $("cityInput").value = state.city;
    if ($("prayerMethod")) $("prayerMethod").value = String(state.method);
    if ($("asrSchool")) $("asrSchool").value = String(state.school);
    if ($("reciterSelect")) $("reciterSelect").value = state.reciter;
    if ($("fontSizeLabel")) $("fontSizeLabel").textContent = String(state.reading.fontSize || 30);
    if ($("mushafPageNumber")) $("mushafPageNumber").textContent = "مصحف · " + (state.bookmark.page || "—");
    if ($("dhikrPhrase")) $("dhikrPhrase").value = state.tasbih.phrase || "سُبْحَانَ اللَّهِ";
    if ($("tasbihCount")) $("tasbihCount").textContent = arabicDigits(state.tasbih.count || 0);
    renderTasbih();
  }

  function openPanel(name) {
    const validNames = ["quran", "hadith", "adhkar", "prayer"];
    if (!validNames.includes(name)) return;
    document.querySelectorAll(".islamic-tab").forEach((tab) => {
      const active = tab.dataset.panel === name;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.querySelectorAll(".content-panel").forEach((panel) => {
      const active = panel.id === "panel-" + name;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
    if (name === "prayer" && !prayerData) loadPrayerTimes();
    if (name === "hadith" && !hadithCategories.length) loadHadithCategories();
    if (window.matchMedia("(max-width: 760px)").matches) {
      const panel = $("panel-" + name);
      if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function normalizeArabic(value) {
    return String(value || "")
      .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
      .replace(/[إأآ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  async function fetchJson(url, label) {
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) throw new Error((label || "الطلب") + " (" + response.status + ")");
    const payload = await response.json();
    if (payload && typeof payload.code === "number" && payload.code >= 400) throw new Error(payload.status || "تعذر جلب المحتوى");
    return payload;
  }

  async function loadSurahCatalog() {
    try {
      const response = await fetchJson(QURAN_API + "/surah", "قائمة السور");
      surahList = Array.isArray(response.data) ? response.data : [];
      if (!surahList.length) throw new Error("قائمة السور فارغة");
      $("surahSelect").innerHTML = surahList.map((surah) =>
        '<option value="' + Number(surah.number) + '">' +
        arabicDigits(surah.number) + " · " + escapeHtml(surah.name) +
        " — " + escapeHtml(surah.englishName || "") + "</option>"
      ).join("");
      const preferred = Math.max(1, Math.min(114, Number(state.bookmark.surah || 1)));
      $("surahSelect").value = String(preferred);
      await loadSurah(preferred, Number(state.bookmark.ayah || 1));
    } catch (error) {
      console.error("QURAN CATALOG ERROR", error);
      $("quranVerses").innerHTML = '<p class="reader-loading">تعذر تحميل المصحف الآن. تحقق من الاتصال ثم أعد المحاولة.</p>';
      showToast("تعذر تحميل قائمة السور حالياً");
    }
  }

  async function loadSurah(number, startAyah) {
    const selected = Math.max(1, Math.min(114, Number(number || 1)));
    currentSurah = selected;
    currentAyahIndex = Math.max(0, Number(startAyah || 1) - 1);
    $("quranVerses").innerHTML = '<p class="reader-loading">يتم تحميل السورة…</p>';
    $("audioSurahName").textContent = "جارٍ تجهيز التلاوة…";
    $("audioAyahInfo").textContent = "لحظات من فضلك";
    const reciter = encodeURIComponent(state.reciter || "ar.alafasy");
    const requests = await Promise.allSettled([
      fetchJson(QURAN_API + "/surah/" + selected + "/quran-uthmani", "نص السورة"),
      fetchJson(QURAN_API + "/surah/" + selected + "/" + reciter, "تلاوة السورة")
    ]);
    if (requests[0].status !== "fulfilled") {
      throwReaderError(requests[0].reason);
      return;
    }
    const textData = requests[0].value.data || {};
    surahVerses = Array.isArray(textData.ayahs) ? textData.ayahs : [];
    audioVerses = requests[1].status === "fulfilled" && Array.isArray(requests[1].value.data && requests[1].value.data.ayahs)
      ? requests[1].value.data.ayahs : [];
    const surahInfo = surahList.find((item) => Number(item.number) === selected) || textData;
    $("surahTitle").textContent = surahInfo.name || textData.name || "سورة";
    $("surahSubTitle").textContent =
      (surahInfo.revelationType === "Meccan" ? "مكية" : surahInfo.revelationType === "Medinan" ? "مدنية" : "") +
      " · " + arabicDigits(surahVerses.length) + " آيات";
    $("surahProgressLabel").textContent = "السورة " + arabicDigits(selected) + " من 114";
    $("bismillah").hidden = selected === 1 || selected === 9;
    $("audioSurahName").textContent = "سورة " + (surahInfo.name || "");
    $("surahSelect").value = String(selected);
    renderQuranVerses();
    selectCurrentAyah(Math.min(currentAyahIndex, Math.max(0, surahVerses.length - 1)));
    if (requests[1].status !== "fulfilled" || !audioVerses.length) {
      $("audioAyahInfo").textContent = "النص جاهز · تعذر تحميل التلاوة الآن";
      $("audioPlay").disabled = true;
    } else {
      $("audioPlay").disabled = false;
      $("audioAyahInfo").textContent = "تلاوة " + (surahInfo.name || "السورة") + " · اضغط تشغيل";
    }
    updateReaderProgress();
  }

  function throwReaderError(error) {
    console.warn("QURAN SURAH ERROR", error);
    $("quranVerses").innerHTML = '<p class="reader-loading">تعذر تحميل السورة. حاول تحديث الصفحة أو اختيار سورة أخرى.</p>';
    $("audioAyahInfo").textContent = "التلاوة غير متاحة حالياً";
    showToast("تعذر تحميل السورة حالياً");
  }

  function renderQuranVerses() {
    const query = normalizeArabic($("quranSearch").value);
    const filtered = query ? surahVerses.filter((verse) => normalizeArabic(verse.text).includes(query)) : surahVerses;
    if (!filtered.length) {
      $("quranVerses").innerHTML = '<p class="reader-loading">لا توجد آيات مطابقة في هذه السورة.</p>';
      return;
    }
    $("quranVerses").innerHTML = filtered.map((verse) => {
      const number = Number(verse.numberInSurah);
      return '<span class="ayah-block" data-ayah="' + number + '" tabindex="0" role="button" aria-label="الآية ' + arabicDigits(number) + '">' +
        escapeHtml(verse.text) + ' <span class="ayah-marker">۞' + arabicDigits(number) + '</span></span>';
    }).join(" ");
    $("quranVerses").querySelectorAll(".ayah-block").forEach((node) => {
      const activate = () => {
        const index = surahVerses.findIndex((verse) => Number(verse.numberInSurah) === Number(node.dataset.ayah));
        if (index >= 0) {
          selectCurrentAyah(index);
          if (audioVerses.length) playAyah(index);
        }
      };
      node.addEventListener("click", activate);
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      });
    });
    highlightCurrentAyah();
  }

  function highlightCurrentAyah() {
    const number = currentAyahIndex + 1;
    $("quranVerses").querySelectorAll(".ayah-block").forEach((node) => {
      node.classList.toggle("active", Number(node.dataset.ayah) === number);
    });
  }

  function selectCurrentAyah(index) {
    if (!surahVerses.length) return;
    currentAyahIndex = Math.max(0, Math.min(index, surahVerses.length - 1));
    const ayah = surahVerses[currentAyahIndex];
    $("ayahProgressLabel").textContent = "الآية " + arabicDigits(ayah.numberInSurah);
    $("audioAyahInfo").textContent = "الآية " + arabicDigits(ayah.numberInSurah) + " من " + arabicDigits(surahVerses.length);
    $("mushafPageNumber").textContent = "صفحة " + arabicDigits(ayah.page || "—");
    $("audioSurahName").textContent = "سورة " + ($("surahTitle").textContent || "");
    highlightCurrentAyah();
    updateReaderProgress();
  }

  function updateReaderProgress() {
    const total = Math.max(1, surahVerses.length);
    const percent = surahVerses.length ? ((currentAyahIndex + 1) / total) * 100 : 0;
    $("readerProgressBar").style.width = percent + "%";
  }

  async function playAyah(index) {
    if (!audioVerses.length) return;
    const safeIndex = Math.max(0, Math.min(index, audioVerses.length - 1));
    const audioData = audioVerses[safeIndex] || {};
    const source = audioData.audio || (Array.isArray(audioData.audioSecondary) ? audioData.audioSecondary[0] : "");
    if (!source) {
      showToast("التلاوة الصوتية لهذه الآية غير متاحة");
      return;
    }
    currentAyahIndex = safeIndex;
    selectCurrentAyah(safeIndex);
    const audio = $("quranAudio");
    if (audio.src !== source) audio.src = source;
    try {
      await audio.play();
      $("audioPlay").innerHTML = '<span class="material-icons-round">pause</span>';
      $("audioPlay").setAttribute("aria-label", "إيقاف مؤقت");
    } catch (error) {
      console.warn("QURAN AUDIO PLAY ERROR", error);
      showToast("تعذر تشغيل الصوت. اضغط تشغيل مرة أخرى.");
    }
  }

  function updateAudioProgress() {
    const audio = $("quranAudio");
    const percent = audio.duration && Number.isFinite(audio.duration) ? (audio.currentTime / audio.duration) * 100 : 0;
    $("audioProgress").style.width = percent + "%";
  }

  function saveBookmark() {
    const verse = surahVerses[currentAyahIndex];
    if (!verse) {
      showToast("اختر سورة وآية أولاً");
      return;
    }
    state.bookmark = {
      surah: currentSurah,
      ayah: Number(verse.numberInSurah),
      page: Number(verse.page || 1)
    };
    persistPreferences(true);
    $("mushafPageNumber").textContent = "صفحة " + arabicDigits(state.bookmark.page);
  }

  function updateFontSize(delta) {
    const next = Math.max(22, Math.min(44, Number(state.reading.fontSize || 30) + delta));
    state.reading.fontSize = next;
    $("mushafPage").style.setProperty("--quran-font-size", next + "px");
    $("fontSizeLabel").textContent = arabicDigits(next);
    persistPreferences(false);
  }

  function setupReaderEvents() {
    $("surahSelect").addEventListener("change", () => {
      const audio = $("quranAudio");
      audio.pause();
      audio.removeAttribute("src");
      $("audioPlay").innerHTML = '<span class="material-icons-round">play_arrow</span>';
      loadSurah(Number($("surahSelect").value), 1);
    });
    $("reciterSelect").addEventListener("change", async () => {
      state.reciter = $("reciterSelect").value;
      persistPreferences(false);
      if (currentSurah) {
        const audio = $("quranAudio");
        audio.pause();
        audio.removeAttribute("src");
        const response = await Promise.allSettled([
          fetchJson(QURAN_API + "/surah/" + currentSurah + "/" + encodeURIComponent(state.reciter), "التلاوة")
        ]);
        audioVerses = response[0].status === "fulfilled" && Array.isArray(response[0].value.data && response[0].value.data.ayahs)
          ? response[0].value.data.ayahs : [];
        $("audioPlay").disabled = !audioVerses.length;
        $("audioPlay").innerHTML = '<span class="material-icons-round">play_arrow</span>';
        showToast(audioVerses.length ? "تم تغيير القارئ" : "تعذر تحميل تلاوة هذا القارئ");
      }
    });
    $("fontDown").addEventListener("click", () => updateFontSize(-2));
    $("fontUp").addEventListener("click", () => updateFontSize(2));
    $("saveBookmark").addEventListener("click", saveBookmark);
    $("quranSearch").addEventListener("input", renderQuranVerses);
    $("audioPlay").addEventListener("click", () => {
      const audio = $("quranAudio");
      if (!audio.paused) {
        audio.pause();
        $("audioPlay").innerHTML = '<span class="material-icons-round">play_arrow</span>';
        $("audioPlay").setAttribute("aria-label", "تشغيل");
      } else if (audio.src) {
        audio.play().then(() => {
          $("audioPlay").innerHTML = '<span class="material-icons-round">pause</span>';
        }).catch(() => showToast("تعذر تشغيل التلاوة"));
      } else {
        playAyah(currentAyahIndex);
      }
    });
    $("audioPrev").addEventListener("click", () => playAyah(currentAyahIndex - 1));
    $("audioNext").addEventListener("click", () => playAyah(currentAyahIndex + 1));
    $("quranAudio").addEventListener("ended", () => {
      if (currentAyahIndex < audioVerses.length - 1) playAyah(currentAyahIndex + 1);
      else {
        $("audioPlay").innerHTML = '<span class="material-icons-round">play_arrow</span>';
        $("audioAyahInfo").textContent = "اكتملت تلاوة السورة";
      }
    });
    $("quranAudio").addEventListener("timeupdate", updateAudioProgress);
    $("quranAudio").addEventListener("pause", () => {
      if ($("audioPlay")) $("audioPlay").innerHTML = '<span class="material-icons-round">play_arrow</span>';
    });
  }

  function normalizePlace(value, kind) {
    const raw = String(value || "").trim();
    const arabicMap = {
      country: {
        "المغرب": "Morocco", "السعودية": "Saudi Arabia", "مصر": "Egypt", "الامارات": "United Arab Emirates",
        "الإمارات": "United Arab Emirates", "قطر": "Qatar", "الكويت": "Kuwait", "البحرين": "Bahrain",
        "عمان": "Oman", "سلطنة عمان": "Oman", "الجزائر": "Algeria", "تونس": "Tunisia", "ليبيا": "Libya",
        "فرنسا": "France", "بريطانيا": "United Kingdom", "المملكة المتحدة": "United Kingdom",
        "امريكا": "United States", "أمريكا": "United States", "الولايات المتحدة": "United States",
        "تركيا": "Turkey", "الهند": "India", "باكستان": "Pakistan", "اندونيسيا": "Indonesia", "إندونيسيا": "Indonesia",
        "ماليزيا": "Malaysia", "المانيا": "Germany", "ألمانيا": "Germany", "كندا": "Canada"
      },
      city: {
        "مراكش": "Marrakech", "الدار البيضاء": "Casablanca", "كازابلانكا": "Casablanca", "الرباط": "Rabat",
        "فاس": "Fez", "طنجة": "Tangier", "مكناس": "Meknes", "أكادير": "Agadir", "اكادير": "Agadir",
        "وجدة": "Oujda", "تطوان": "Tetouan", "القنيطرة": "Kenitra", "بني ملال": "Beni Mellal",
        "مكة": "Makkah", "مكة المكرمة": "Makkah", "المدينة": "Madinah", "المدينة المنورة": "Madinah",
        "الرياض": "Riyadh", "جدة": "Jeddah", "الدمام": "Dammam", "القاهرة": "Cairo", "الاسكندرية": "Alexandria",
        "الإسكندرية": "Alexandria", "دبي": "Dubai", "أبوظبي": "Abu Dhabi", "ابوظبي": "Abu Dhabi",
        "الدوحة": "Doha", "الكويت": "Kuwait City", "اسطنبول": "Istanbul", "إسطنبول": "Istanbul",
        "أنقرة": "Ankara", "تونس": "Tunis", "الجزائر": "Algiers", "باريس": "Paris", "لندن": "London",
        "نيويورك": "New York", "كوالالمبور": "Kuala Lumpur", "جاكرتا": "Jakarta"
      }
    };
    const map = arabicMap[kind] || {};
    return map[raw] || raw;
  }

  function formatApiDate() {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return day + "-" + month + "-" + year;
  }

  const prayerDefinitions = [
    { key: "Fajr", label: "الفجر", className: "fajr" },
    { key: "Sunrise", label: "الشروق", className: "sunrise" },
    { key: "Dhuhr", label: "الظهر", className: "dhuhr" },
    { key: "Asr", label: "العصر", className: "asr" },
    { key: "Maghrib", label: "المغرب", className: "maghrib" },
    { key: "Isha", label: "العشاء", className: "isha" }
  ];
  const prayerOrder = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

  function cleanTime(value) {
    return String(value || "").trim().split(" ")[0].slice(0, 5);
  }

  function timeToMinutes(value) {
    const parts = cleanTime(value).split(":");
    if (parts.length !== 2) return null;
    const hour = Number(parts[0]);
    const minute = Number(parts[1]);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return hour * 60 + minute;
  }

  function getZonedTimeParts(timeZone) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date());
    const result = {};
    parts.forEach((part) => { if (part.type !== "literal") result[part.type] = Number(part.value); });
    return result;
  }

  function getNextPrayer() {
    if (!prayerData || !prayerData.timings) return null;
    const now = getZonedTimeParts(prayerTimezone);
    const currentMinutes = (now.hour || 0) * 60 + (now.minute || 0);
    let selected = null;
    let minDifference = Infinity;
    prayerOrder.forEach((key) => {
      const minutes = timeToMinutes(prayerData.timings[key]);
      if (minutes === null) return;
      let difference = minutes - currentMinutes;
      if (difference < 0) difference += 1440;
      if (difference < minDifference) {
        minDifference = difference;
        selected = { key: key, difference: difference, time: cleanTime(prayerData.timings[key]) };
      }
    });
    return selected;
  }

  function updatePrayerClock() {
    if (!prayerData) return;
    try {
      const now = new Date();
      const clock = new Intl.DateTimeFormat("ar-MA", {
        timeZone: prayerTimezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
      }).format(now);
      const date = new Intl.DateTimeFormat("ar-MA", {
        timeZone: prayerTimezone, weekday: "long", day: "numeric", month: "long"
      }).format(now);
      $("cityClock").textContent = clock;
      $("prayerWorldClock").textContent = clock;
      $("prayerWorldDate").textContent = date;
      const next = getNextPrayer();
      if (!next) return;
      const label = prayerDefinitions.find((item) => item.key === next.key);
      $("nextPrayerName").textContent = label ? label.label : next.key;
      $("nextPrayerTime").textContent = "اليوم · " + arabicDigits(next.time);
      let seconds = Math.max(0, next.difference * 60 - (getZonedTimeParts(prayerTimezone).second || 0));
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainder = seconds % 60;
      $("prayerCountdown").textContent =
        String(hours).padStart(2, "0") + ":" +
        String(minutes).padStart(2, "0") + ":" +
        String(remainder).padStart(2, "0");
      document.querySelectorAll(".prayer-time-chip").forEach((chip) => {
        chip.classList.toggle("active", chip.dataset.prayer === next.key);
      });
      document.querySelectorAll(".prayer-full-item").forEach((item) => {
        item.classList.toggle("active", item.dataset.prayer === next.key);
      });
    } catch (error) {
      console.warn("PRAYER CLOCK ERROR", error);
    }
  }

  function renderPrayerTimes(data) {
    const timings = data.timings || {};
    $("prayerTimesList").innerHTML = prayerDefinitions.map((item) =>
      '<div class="prayer-time-chip" data-prayer="' + item.key + '"><span>' + item.label +
      '</span><b>' + arabicDigits(cleanTime(timings[item.key] || "—")) + "</b></div>"
    ).join("");
    $("prayerFullList").innerHTML = prayerDefinitions.map((item) =>
      '<div class="prayer-full-item" data-prayer="' + item.key + '"><span><i></i>' + item.label +
      '</span><b>' + arabicDigits(cleanTime(timings[item.key] || "—")) + "</b></div>"
    ).join("");
  }

  async function loadQibla(data) {
    const latitude = Number(data && data.meta && data.meta.latitude);
    const longitude = Number(data && data.meta && data.meta.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      $("qiblaDirection").textContent = "غير متاح";
      return;
    }
    try {
      const result = await fetchJson(PRAYER_API + "/qibla/" + latitude + "/" + longitude, "اتجاه القبلة");
      const direction = Number(result.data && result.data.direction);
      $("qiblaDirection").textContent = Number.isFinite(direction) ? arabicDigits(direction.toFixed(1)) + "°" : "غير متاح";
    } catch (_) {
      $("qiblaDirection").textContent = "غير متاح";
    }
  }

  async function loadPrayerTimes() {
    const cityValue = String($("cityInput") && $("cityInput").value || state.city || "Marrakech").trim();
    const countryValue = String($("countryInput") && $("countryInput").value || state.country || "Morocco").trim();
    const method = Number($("prayerMethod") && $("prayerMethod").value || state.method || 21);
    const school = Number($("asrSchool") && $("asrSchool").value || state.school || 0);
    if (cityValue.length < 2 || countryValue.length < 2) {
      showToast("اكتب اسم المدينة والدولة");
      return;
    }
    const button = $("prayerSearchButton");
    if (button) {
      button.disabled = true;
      button.innerHTML = '<span class="material-icons-round">hourglass_top</span> جارٍ البحث…';
    }
    $("prayerMetaLine").textContent = "جارٍ حساب المواقيت…";
    try {
      const city = normalizePlace(cityValue, "city");
      const country = normalizePlace(countryValue, "country");
      const params = new URLSearchParams({
        city: city,
        country: country,
        method: String(method),
        school: String(school)
      });
      const result = await fetchJson(PRAYER_API + "/timingsByCity/" + formatApiDate() + "?" + params.toString(), "مواقيت الصلاة");
      const data = result.data || {};
      if (!data.timings) throw new Error("لم تصل بيانات المواقيت");
      prayerData = data;
      prayerTimezone = data.meta && data.meta.timezone ? data.meta.timezone : "Africa/Casablanca";
      state.city = cityValue;
      state.country = countryValue;
      state.method = method;
      state.school = school;
      $("heroLocation").textContent = cityValue + "، " + countryValue;
      $("prayerLocationTitle").textContent = cityValue + "، " + countryValue;
      $("prayerTimezoneText").textContent = "المنطقة الزمنية: " + prayerTimezone;
      $("prayerMetaLine").textContent = "مواقيت " + cityValue + " · " + prayerTimezone;
      const hijri = data.date && data.date.hijri;
      if (hijri) {
        const hijriMonth = hijri.month && (hijri.month.ar || hijri.month.en) || "";
        $("hijriDate").textContent = [hijri.day, hijriMonth, hijri.year].filter(Boolean).join(" ");
      }
      renderPrayerTimes(data);
      updatePrayerClock();
      loadQibla(data);
      persistPreferences(false);
    } catch (error) {
      console.warn("PRAYER TIMES ERROR", error);
      $("prayerMetaLine").textContent = "تعذر تحميل المواقيت. تحقق من كتابة المدينة والدولة.";
      $("prayerFullList").innerHTML = '<div class="reader-loading">لم نتمكن من العثور على هذه المدينة. جرّب كتابة اسم المدينة والدولة بالإنجليزية.</div>';
      showToast("تعذر تحميل المواقيت. راجع اسم المدينة والدولة.");
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = '<span class="material-icons-round">search</span> عرض المواقيت';
      }
    }
  }

  function setupPrayerEvents() {
    $("prayerSearchForm").addEventListener("submit", (event) => {
      event.preventDefault();
      loadPrayerTimes();
    });
    $("prayerMethod").addEventListener("change", () => {
      state.method = Number($("prayerMethod").value);
      persistPreferences(false);
    });
    $("asrSchool").addEventListener("change", () => {
      state.school = Number($("asrSchool").value);
      persistPreferences(false);
    });
  }

  function currentLocalDay() {
    const now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  }

  function renderTasbih() {
    const count = Math.max(0, Number(state.tasbih.count || 0));
    const target = Math.max(1, Number(state.tasbih.target || 33));
    const progress = Math.min(1, count / target);
    $("tasbihCount").textContent = arabicDigits(count);
    $("tasbihTargetLabel").textContent = arabicDigits(target);
    $("tasbihRing").style.background =
      "conic-gradient(#a9874e 0deg," + "#d5c29d " + (progress * 360) + "deg,#e4e9e1 " + (progress * 360) + "deg 360deg)";
    $("tasbihProgressText").textContent = count >= target ? "أتممت الهدف · تقبّل الله منك" : "باقي " + arabicDigits(Math.max(0, target - count)) + " للوصول إلى الهدف";
    $("tasbihToday").textContent = "عداد اليوم · " + arabicDigits(count);
    document.querySelectorAll(".tasbih-targets button").forEach((button) => {
      button.classList.toggle("active", Number(button.dataset.target) === target);
    });
  }

  function selectedDhikrPhrase() {
    const choice = $("dhikrPhrase").value;
    if (choice === "custom") return String($("customDhikr").value || "").trim();
    return choice;
  }

  function setupTasbihEvents() {
    const choice = $("dhikrPhrase");
    choice.addEventListener("change", () => {
      const custom = choice.value === "custom";
      $("customDhikr").hidden = !custom;
      state.tasbih.phrase = custom ? String($("customDhikr").value || "") : choice.value;
      persistPreferences(false);
    });
    $("customDhikr").addEventListener("input", () => {
      state.tasbih.phrase = String($("customDhikr").value || "").trim();
      persistPreferences(false);
    });
    document.querySelectorAll(".tasbih-targets button").forEach((button) => {
      button.addEventListener("click", () => {
        state.tasbih.target = Number(button.dataset.target);
        renderTasbih();
        persistPreferences(false);
      });
    });
    $("tasbihTap").addEventListener("click", () => {
      state.tasbih.count = Math.max(0, Number(state.tasbih.count || 0)) + 1;
      state.tasbih.day = currentLocalDay();
      renderTasbih();
      persistPreferences(false);
      if (state.tasbih.count === Number(state.tasbih.target)) {
        showToast("أتممت الهدف، تقبّل الله منك");
        if (navigator.vibrate) navigator.vibrate([35, 50, 35]);
      }
    });
    $("tasbihReset").addEventListener("click", () => {
      state.tasbih.count = 0;
      state.tasbih.day = currentLocalDay();
      renderTasbih();
      persistPreferences(false);
      showToast("تم تصفير العداد");
    });
  }

  function unpackArray(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    if (payload && payload.data && Array.isArray(payload.data.data)) return payload.data.data;
    return [];
  }

  async function loadHadithCategories() {
    $("hadithCategories").innerHTML = '<span class="muted-status">جارٍ تحميل أبواب الأحاديث…</span>';
    try {
      let payload;
      try {
        payload = await fetchJson(HADITH_API + "/categories/roots/?language=ar", "أبواب الأحاديث");
      } catch (_) {
        payload = await fetchJson(HADITH_API + "/categories/list/?language=ar", "أبواب الأحاديث");
      }
      hadithCategories = unpackArray(payload);
      if (!hadithCategories.length) throw new Error("لا توجد أبواب متاحة");
      renderHadithCategories();
      const first = hadithCategories[0];
      await loadHadithCategory(first.id || first.category_id);
    } catch (error) {
      console.warn("HADITH CATEGORIES ERROR", error);
      $("hadithCategories").innerHTML =
        '<span class="muted-status">تعذر تحميل أبواب الأحاديث من المصدر حالياً.</span>' +
        '<a class="source-link" href="https://hadeethenc.com/ar" target="_blank" rel="noopener noreferrer">فتح الموسوعة</a>';
      $("hadithList").innerHTML = '<div class="reader-loading">يمكنك الرجوع إلى موسوعة الأحاديث مباشرة حتى يعود الاتصال.</div>';
    }
  }

  function renderHadithCategories() {
    $("hadithCategories").innerHTML = hadithCategories.map((category, index) => {
      const id = category.id || category.category_id;
      const name = category.title || category.name || category.category || "باب";
      return '<button type="button" class="hadith-category' + (index === 0 ? " active" : "") +
        '" data-category-id="' + escapeHtml(id) + '">' + escapeHtml(name) + "</button>";
    }).join("");
    $("hadithCategories").querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => loadHadithCategory(button.dataset.categoryId));
    });
  }

  async function loadHadithCategory(categoryId, append) {
    if (!categoryId) return;
    activeHadithCategory = String(categoryId);
    hadithPage = append ? hadithPage + 1 : 1;
    if (!append) {
      hadithItems = [];
      $("hadithList").innerHTML = '<div class="reader-loading">جارٍ تحميل الأحاديث…</div>';
      $("hadithDetail").innerHTML =
        '<div class="hadith-detail-empty"><span class="material-icons-round">menu_book</span><b>اختر حديثاً لقراءة تفاصيله</b><p>ستظهر هنا درجته وشرحه ومراجع تخريجه متى توفرت في المصدر.</p></div>';
    }
    document.querySelectorAll(".hadith-category").forEach((button) => {
      button.classList.toggle("active", button.dataset.categoryId === activeHadithCategory);
    });
    try {
      const url = HADITH_API + "/hadeeths/list/?language=ar&category_id=" +
        encodeURIComponent(activeHadithCategory) + "&page=" + hadithPage + "&per_page=12";
      const payload = await fetchJson(url, "قائمة الأحاديث");
      const items = unpackArray(payload);
      hadithItems = append ? hadithItems.concat(items) : items;
      const meta = payload && (payload.meta || (payload.data && payload.data.meta)) || {};
      hadithHasMore = Number(meta.current_page || hadithPage) < Number(meta.last_page || hadithPage + (items.length === 12 ? 1 : 0));
      renderHadithList();
      if (!append && hadithItems.length) loadHadithDetail(hadithItems[0].id);
    } catch (error) {
      console.warn("HADITH LIST ERROR", error);
      if (!append) $("hadithList").innerHTML = '<div class="reader-loading">تعذر تحميل هذا الباب حالياً.</div>';
    }
  }

  function renderHadithList() {
    const query = normalizeArabic($("hadithSearch").value);
    const visible = hadithItems.filter((item) => !query || normalizeArabic(item.title || item.hadeeth || "").includes(query));
    $("hadithList").innerHTML = visible.map((item) =>
      '<button type="button" class="hadith-item" data-hadith-id="' + escapeHtml(item.id) + '">' +
      "<b>" + escapeHtml(item.title || "حديث نبوي") + "</b>" +
      "<small>" + escapeHtml(item.category || "من موسوعة الأحاديث") + "</small></button>"
    ).join("") || '<div class="reader-loading">لا توجد نتائج مطابقة لهذا البحث.</div>';
    $("hadithList").querySelectorAll(".hadith-item").forEach((button) => {
      button.addEventListener("click", () => loadHadithDetail(button.dataset.hadithId));
    });
    if (!hadithLoadMoreButton) {
      hadithLoadMoreButton = document.createElement("button");
      hadithLoadMoreButton.type = "button";
      hadithLoadMoreButton.className = "load-hadith-more";
      hadithLoadMoreButton.textContent = "تحميل المزيد";
      $("hadithList").insertAdjacentElement("afterend", hadithLoadMoreButton);
      hadithLoadMoreButton.addEventListener("click", () => {
        if (activeHadithCategory && hadithHasMore) loadHadithCategory(activeHadithCategory, true);
      });
    }
    hadithLoadMoreButton.hidden = !hadithHasMore || Boolean(query);
  }

  async function loadHadithDetail(id) {
    if (!id) return;
    $("hadithDetail").innerHTML = '<div class="reader-loading">جارٍ تحميل الحديث وشرحه…</div>';
    document.querySelectorAll(".hadith-item").forEach((button) => {
      button.classList.toggle("active", button.dataset.hadithId === String(id));
    });
    try {
      const payload = await fetchJson(HADITH_API + "/hadeeths/one/?language=ar&id=" + encodeURIComponent(id), "تفاصيل الحديث");
      const detail = payload.data && !Array.isArray(payload.data) ? payload.data : payload;
      const title = detail.title || "حديث نبوي";
      const text = detail.hadeeth || detail.hadith || detail.text || "";
      const grade = detail.grade || detail.status || "لم تُذكر الدرجة في البيانات";
      const attribution = detail.attribution || detail.reference || detail.source || "";
      const explanation = detail.explanation || "";
      const hints = Array.isArray(detail.hints) ? detail.hints.join("\n") : String(detail.hints || "");
      $("hadithDetail").innerHTML =
        '<h3>' + escapeHtml(title) + "</h3>" +
        '<div class="hadith-meta"><span class="hadith-grade">' + escapeHtml(grade) + "</span>" +
        (attribution ? '<span class="hadith-source-chip">' + escapeHtml(attribution) + "</span>" : "") + "</div>" +
        (text ? '<p class="hadith-text">' + escapeHtml(text) + "</p>" : '<p class="hadith-text">لم يرسل المصدر نص الحديث لهذه الصفحة.</p>') +
        (explanation || hints ? '<div class="hadith-explanation"><h4>الشرح والفوائد</h4><p>' + escapeHtml([explanation, hints].filter(Boolean).join("\n\n")) + "</p></div>" : "") +
        '<div class="hadith-reference"><span>المصدر: HadeethEnc</span><span>رقم الحديث: ' + escapeHtml(id) + "</span></div>";
    } catch (error) {
      console.warn("HADITH DETAIL ERROR", error);
      $("hadithDetail").innerHTML = '<div class="reader-loading">تعذر تحميل تفاصيل هذا الحديث حالياً.</div>';
    }
  }

  function setupHadithEvents() {
    $("hadithSearch").addEventListener("input", renderHadithList);
  }

  function setupTabs() {
    document.querySelectorAll(".islamic-tab").forEach((tab) => {
      tab.addEventListener("click", () => openPanel(tab.dataset.panel));
    });
    document.querySelectorAll("[data-open-panel]").forEach((button) => {
      button.addEventListener("click", () => openPanel(button.dataset.openPanel));
    });
  }

  async function initialize() {
    readLocalState();
    if (state.tasbih.day && state.tasbih.day !== currentLocalDay()) {
      state.tasbih.count = 0;
      state.tasbih.day = currentLocalDay();
    }
    await initializeAccountSync();
    setInitialFormValues();
    $("mushafPage").style.setProperty("--quran-font-size", Number(state.reading.fontSize || 30) + "px");
    setupTabs();
    setupReaderEvents();
    setupPrayerEvents();
    setupTasbihEvents();
    setupHadithEvents();

    loadSurahCatalog().catch(throwReaderError);
    loadPrayerTimes();
    loadHadithCategories();

    if (prayerRefreshTimer) window.clearInterval(prayerRefreshTimer);
    prayerRefreshTimer = window.setInterval(updatePrayerClock, 1000);

    window.addEventListener("pagehide", saveLocalState, { once: true });
  }

  initialize().catch((error) => {
    console.error("ISLAMIC PAGE INITIALIZATION ERROR", error);
    showToast("تعذر تجهيز الصفحة بالكامل، لكن يمكنك إعادة تحميلها");
  });
})();