/* עזרים משותפים: כניסה עם גוגל + פרופיל פרמיום (Supabase) */
(function () {
  const C = window.TM_CONFIG || {};
  const ready = !!(C.supabaseUrl && C.supabaseAnonKey && !/^YOUR_/.test(C.supabaseUrl) && window.supabase);
  const sb = ready ? window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }) : null;

  if (sb) sb.auth.onAuthStateChange((ev) => {
    if (ev !== "PASSWORD_RECOVERY") return;
    setTimeout(async () => {
      const pw = prompt("בחרו סיסמה חדשה (לפחות 6 תווים):");
      if (pw && pw.length >= 6) { const r = await sb.auth.updateUser({ password: pw }); alert(r.error ? r.error.message : "הסיסמה עודכנה."); }
    }, 300);
  });

  window.TM = {
    ready, sb, discordUrl: C.discordUrl || "#",
    esc: (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
    async session() {
      const { data } = await sb.auth.getSession();
      return data.session;
    },
    login() {
      return sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: location.origin + location.pathname },
      });
    },
    async logout() { await sb.auth.signOut(); location.reload(); },
    async profile(uid) {
      // הפרופיל נוצר ע"י טריגר בהרשמה; אם עוד לא קיים – מנסים שוב קצר
      for (let i = 0; i < 4; i++) {
        const { data, error } = await sb.from("profiles").select("*").eq("id", uid).maybeSingle();
        if (error) throw error;
        if (data) return data;
        await new Promise((r) => setTimeout(r, 600));
      }
      return null;
    },
    isPremium(p) {
      if (!p || !p.premium) return false;
      return !p.premium_until || new Date(p.premium_until) > new Date();
    },
  };

  // ---- טופס כניסה משותף: גוגל + אימייל וסיסמה ----
  const GSVG = '<svg viewBox="0 0 48 48" width="20" height="20"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';
  const CSS = `.tmf{text-align:right}.tmf .g{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:12px;border-radius:99px;border:0;background:#fff;color:#222;font:700 16px Heebo,sans-serif;cursor:pointer}
  .tmf .or{display:flex;align-items:center;gap:10px;color:#9a9aab;font-size:13px;margin:14px 0}.tmf .or:before,.tmf .or:after{content:"";flex:1;height:1px;background:#2c2c3a}
  .tmf input{width:100%;margin-bottom:10px;background:#0a0a0f;color:#f5f5f8;border:1px solid #2c2c3a;border-radius:12px;padding:11px 14px;font:inherit;direction:ltr;text-align:left}
  .tmf input:focus{outline:0;border-color:#ff6a00}
  .tmf .s{width:100%;padding:12px;border:0;border-radius:99px;background:linear-gradient(135deg,#ff6a00,#ffa53d);color:#1b0e00;font:800 16px Assistant,Heebo,sans-serif;cursor:pointer}
  .tmf .s:disabled{opacity:.5}.tmf .l{background:none;border:0;color:#9a9aab;font:inherit;font-size:13px;cursor:pointer;text-decoration:underline;margin-top:12px;display:block;width:100%;text-align:center}
  .tmf .m{font-size:13px;margin-top:10px;text-align:center}.tmf .m.e{color:#ff8a8a}.tmf .m.k{color:#4ee08a}`;
  window.TM.renderLogin = function (el) {
    if (!document.getElementById("tmf-css")) { const st = document.createElement("style"); st.id = "tmf-css"; st.textContent = CSS; document.head.appendChild(st); }
    let mode = "in";
    const draw = (msg, ok) => {
      el.innerHTML = `<div class="tmf"><button class="g" id="tmG">${GSVG} כניסה עם גוגל</button><div class="or">או</div>
        <form id="tmForm"><input type="email" id="tmE" placeholder="אימייל" autocomplete="email" required>
        <input type="password" id="tmP" placeholder="סיסמה (לפחות 6 תווים)" autocomplete="${mode === "in" ? "current-password" : "new-password"}" minlength="6" required>
        <button class="s" type="submit">${mode === "in" ? "כניסה" : "הרשמה"}</button></form>
        ${msg ? `<div class="m ${ok ? "k" : "e"}">${TM.esc(msg)}</div>` : ""}
        <button class="l" id="tmT">${mode === "in" ? "אין לך חשבון? הרשמה" : "יש לך חשבון? כניסה"}</button>
        ${mode === "in" ? '<button class="l" id="tmR" style="margin-top:4px">שכחתי סיסמה</button>' : ""}</div>`;
      el.querySelector("#tmG").onclick = () => TM.login();
      el.querySelector("#tmT").onclick = () => { mode = mode === "in" ? "up" : "in"; draw(); };
      const r = el.querySelector("#tmR");
      if (r) r.onclick = async () => {
        const email = el.querySelector("#tmE").value.trim();
        if (!email) return draw("כתבו קודם את האימייל בשדה.", false);
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
        draw(error ? error.message : "שלחנו קישור לאיפוס סיסמה למייל.", !error);
      };
      el.querySelector("#tmForm").onsubmit = async (e) => {
        e.preventDefault();
        const email = el.querySelector("#tmE").value.trim(), password = el.querySelector("#tmP").value;
        const btn = el.querySelector(".s"); btn.disabled = true;
        if (mode === "in") {
          const { error } = await sb.auth.signInWithPassword({ email, password });
          if (error) return draw(/confirm/i.test(error.message) ? "צריך לאשר את המייל – בדקו את תיבת הדואר." : "אימייל או סיסמה שגויים.", false);
          location.reload();
        } else {
          const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
          if (error) return draw(error.message, false);
          if (data.session) return location.reload();
          mode = "in"; draw("נרשמתם! שלחנו מייל אישור – לחצו על הקישור ואז היכנסו.", true);
        }
      };
    };
    draw();
  };
})();
