/* ====== הגדרות – כאן משנים הכל ====== */
const CONFIG = {
  // קישור לערוץ (הרשמה נפתחת עם חלון אישור של יוטיוב)
  channelUrl: "https://www.youtube.com/@TigerManPlus",
  // קישור ללייק – מתעדכן אוטומטית לסרטון האחרון (latest.json), וזה הגיבוי
  likeVideoUrl: "https://www.youtube.com/@TigerManPlus/videos",
  // כמה שניות לחכות אחרי שלחצו על שני הכפתורים
  waitSeconds: 8,
  discordUrl: "https://discord.gg/JZJ8cC3AZj",
};

/* ====== מדריכים – נפתחים ביוטיוב ======
   videoId = החלק אחרי youtu.be/ . להוספת מדריך – עוד שורה. */
const SOUNDS = [
  { videoId: "wrM-V9A2OF0", name: "Sem Pensar Phonk" },
  { videoId: "msYNX5zw1s8", name: "TIGARO PHONK (SPEED UP)" },
];

const GUIDES = [
  { videoId: "cXMfOl3x12Y", name: "אדיטים בפילמורה למתחילים: פרק 1 | טקסט אפקטס" },
];

/* ====== הקליפים ======
   url = קישור ההורדה (Google Drive / Mega / GitHub Releases וכו').
   כדי להוסיף קליפים חדשים – פשוט מוסיפים עוד שורה לרשימה. */
const CLIPS = [
  {
    id: "ramzi",
    name: "קליפים של ראמזי – קופה ראשית",
    emoji: "🎬",
    // img: "assets/ramzi.jpg",  // תמונת הקליפ – להוסיף אחרי שהקובץ בריפו
    badges: ["4K", "120FPS", "CC"],
    url: "#REPLACE_WITH_RAMZI_DOWNLOAD_LINK",
  },
  {
    id: "franco",
    name: "קליפים של פרנקו – קופה ראשית",
    emoji: "🎬",
    badges: ["4K", "120FPS", "CC"],
    url: "https://drive.google.com/file/d/1t5-FVKVF5xp3PY1MOsSB6nN48aoqUhto/view?usp=drive_link",
  },
  {
    id: "zahavi",
    name: "קליפים של ערן זהבי",
    emoji: "🎬",
    badges: ["4K", "60FPS"],
    url: "https://drive.google.com/file/d/1kYudo0TE2Ue5uTFJUmbZyVvkBwziYHhr/view?usp=drive_link",
  },
];

/* ====== קוד ====== */
const $ = (id) => document.getElementById(id);
const subUrl = CONFIG.channelUrl + "?sub_confirmation=1";
$("navSub").href = subUrl;
$("heroYt").href = CONFIG.channelUrl;
["navDiscord","heroDiscord","aboutDiscord"].forEach((id) => ($(id).href = CONFIG.discordUrl));
$("year").textContent = new Date().getFullYear();

$("grid").innerHTML = CLIPS.map(
  (c) => `<article class="card">
    <div class="thumb">${c.img ? `<img src="${c.img}" alt="${c.name}" loading="lazy">` : c.emoji}</div>
    <h3>${c.name}</h3>
    <div class="badges">${c.badges.map((b) => `<span class="badge">${b}</span>`).join("")}</div>
    <button class="btn" data-id="${c.id}">הורדה ⬇</button>
  </article>`
).join("");

fetch("latest.json", { cache: "no-store" })
  .then((r) => r.json())
  .then((d) => { if (d.id) CONFIG.likeVideoUrl = "https://www.youtube.com/watch?v=" + d.id; })
  .catch(() => {});

const videoCards = (list, label, btn) => list.map(
  (g) => `<a class="card" href="https://youtu.be/${g.videoId}" target="_blank" rel="noopener">
    <div class="thumb"><img src="https://img.youtube.com/vi/${g.videoId}/hqdefault.jpg" alt="${g.name}" loading="lazy"><span class="play">${label}</span></div>
    <h3>${g.name}</h3>
    <span class="btn">${btn}</span>
  </a>`
).join("");
$("guidesGrid").innerHTML = videoCards(GUIDES, "▶ ביוטיוב", "לצפייה במדריך");
$("soundsGrid").innerHTML = videoCards(SOUNDS, "🎵 ביוטיוב", "להאזנה");

const store = {
  get: () => { try { return localStorage.getItem("tmp_unlocked") === "1"; } catch { return false; } },
  set: () => { try { localStorage.setItem("tmp_unlocked", "1"); } catch {} },
};

let current = null, clicked = { sub: false, like: false }, timer = null;

function startDownload(clip) {
  if (clip.url.startsWith("#")) { alert("קישור ההורדה עדיין לא הוגדר."); return; }
  window.open(clip.url, "_blank", "noopener");
}

function refresh() {
  $("step1").classList.toggle("done", clicked.sub);
  $("step2").classList.toggle("done", clicked.like);
  if (clicked.sub && clicked.like && !timer) {
    let s = CONFIG.waitSeconds;
    const tick = () => {
      if (s > 0) { $("hint").textContent = `בודקים... עוד ${s} שניות`; s--; timer = setTimeout(tick, 1000); }
      else { $("chk").disabled = false; $("hint").textContent = "סמנו את התיבה כדי להמשיך."; }
    };
    tick();
  }
}

function openGate(clip) {
  current = clip;
  if (store.get()) return startDownload(clip);
  clicked = { sub: false, like: false };
  clearTimeout(timer); timer = null;
  $("mName").textContent = clip.name;
  $("subBtn").href = subUrl;
  $("likeBtn").href = CONFIG.likeVideoUrl;
  $("chk").checked = false; $("chk").disabled = true; $("dl").disabled = true;
  $("hint").textContent = "לחצו על שני הכפתורים כדי להמשיך.";
  refresh();
  $("overlay").hidden = false;
}

$("grid").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-id]");
  if (b) openGate(CLIPS.find((c) => c.id === b.dataset.id));
});
$("subBtn").addEventListener("click", () => { clicked.sub = true; refresh(); });
$("likeBtn").addEventListener("click", () => { clicked.like = true; refresh(); });
$("chk").addEventListener("change", () => { $("dl").disabled = !$("chk").checked; });
$("dl").addEventListener("click", () => {
  store.set(); $("overlay").hidden = true; startDownload(current);
});
$("close").addEventListener("click", () => ($("overlay").hidden = true));
$("overlay").addEventListener("click", (e) => { if (e.target.id === "overlay") $("overlay").hidden = true; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("overlay").hidden = true; });
