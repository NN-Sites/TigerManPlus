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

/* ====== כלים ======
   כל כלי נעול עד שיש מספיק לייקים לסרטון UNLOCK.videoId.
   כשכלי נפתח: משנים status ל-"live" ומוסיפים url. */
const UNLOCK = { likes: 500, videoId: "J62yIY5scko" };
const TOOLS = [
  { name: "שיפור איכות AI", desc: "מעלים וידאו ומקבלים אותו חד, נקי ובאיכות גבוהה יותר – עד 4K.", icon: "✨", status: "live", url: "enhancer.html", premium: true },
  { name: "מחיקת רקע מתמונה", desc: "מוחקים רקע מתמונה בלחיצה אחת ומקבלים PNG שקוף, מוכן לעריכה.", icon: "🖼️", status: "soon" },
  { name: "יוצר CC", desc: "יוצרים צבעים ותיקוני CC מקצועיים לקליפים, בלי להתעסק עם הגדרות.", icon: "🎨", status: "soon" },
];

/* ====== מדריכים וסאונדים – נפתחים ביוטיוב ======
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
    img: "assets/ramzi-8k.webp",
    badges: ["8K", "120FPS", "CC"],
    url: "https://drive.google.com/file/d/1Ts3-MnBbHbHYKQSMR7pbPbN9_uBt9j2A/view?usp=drive_link",
  },
  {
    id: "franco",
    img: "assets/franco.webp",
    name: "קליפים של פרנקו – קופה ראשית",
    emoji: "🎬",
    badges: ["4K", "120FPS", "CC"],
    url: "https://drive.google.com/file/d/1t5-FVKVF5xp3PY1MOsSB6nN48aoqUhto/view?usp=drive_link",
  },
  {
    id: "zahavi",
    img: "assets/zahavi.jpg",
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

const LOCK_SVG = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5" fill="#ffa53d"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="#ffa53d" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="15.7" r="1.6" fill="#1b0e00"/></svg>';
$("toolsGrid").innerHTML = TOOLS.map((t) => {
  const live = t.status === "live" && t.url;
  if (live) return `<article class="card tool">
    <div class="tico">${t.icon}</div><h3>${t.name}</h3>${t.premium ? '<div class="badges"><span class="badge">👑 פרמיום</span></div>' : ""}<p class="tdesc">${t.desc}</p>
    <a class="btn" href="${t.url}">${t.premium ? "כניסה עם גוגל" : "לפתיחת הכלי"}</a></article>`;
  return `<article class="card tool locked">
    <div class="lockbadge">${LOCK_SVG}</div>
    <div class="tico">${t.icon}</div><h3>${t.name}</h3><p class="tdesc">${t.desc}</p>
    <p class="lockmsg">🔒 נפתח רק ב-${UNLOCK.likes} לייקים לסרטון הזה</p>
    <a class="btn btn-lock" href="https://youtu.be/${UNLOCK.videoId}" target="_blank" rel="noopener">לסרטון – תעשו לייק 👍</a>
  </article>`;
}).join("");

const videoCards = (list, label, btn) => list.map(
  (g) => `<a class="card" href="https://youtu.be/${g.videoId}" target="_blank" rel="noopener">
    <div class="thumb"><img src="https://img.youtube.com/vi/${g.videoId}/hqdefault.jpg" alt="${g.name}" loading="lazy"><span class="play">${label}</span></div>
    <h3>${g.name}</h3>
    <span class="btn">${btn}</span>
  </a>`
).join("");
$("guidesGrid").innerHTML = videoCards(GUIDES, "▶ ביוטיוב", "לצפייה במדריך");
$("soundsGrid").innerHTML = videoCards(SOUNDS, "🎵 ביוטיוב", "להאזנה");

function refreshLatest() {
  fetch("latest.json?t=" + Date.now(), { cache: "no-store" })
    .then((r) => r.json())
    .then((d) => { if (d.id) CONFIG.likeVideoUrl = "https://www.youtube.com/watch?v=" + d.id; })
    .catch(() => {});
}
refreshLatest();
setInterval(refreshLatest, 5 * 60 * 1000);

try { localStorage.removeItem("tmp_unlocked"); } catch {}

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
  $("overlay").hidden = true; startDownload(current);
});
$("close").addEventListener("click", () => ($("overlay").hidden = true));
$("overlay").addEventListener("click", (e) => { if (e.target.id === "overlay") $("overlay").hidden = true; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("overlay").hidden = true; });

/* ====== אנימציות ====== */
(function () {
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { threshold: 0.12 });
  document.querySelectorAll(".rv, .card").forEach((el, i) => {
    if (el.classList.contains("card")) { el.classList.add("rv"); el.style.transitionDelay = (i % 3) * 0.1 + "s"; }
    io.observe(el);
  });
  // heading underline reveal
  document.querySelectorAll(".sh").forEach((el) => io.observe(el));
  // card tilt
  if (matchMedia("(hover:hover)").matches) {
    document.querySelectorAll(".card").forEach((c) => {
      c.addEventListener("mousemove", (e) => {
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        c.style.transition = "box-shadow .2s";
        c.style.transform = `perspective(700px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-4px)`;
      });
      c.addEventListener("mouseleave", () => { c.style.transition = ""; c.style.transform = ""; });
    });
  }
})();
