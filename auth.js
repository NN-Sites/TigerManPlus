/* עזרים משותפים: כניסה עם גוגל + פרופיל פרמיום (Supabase) */
(function () {
  const C = window.TM_CONFIG || {};
  const ready = !!(C.supabaseUrl && C.supabaseAnonKey && !/^YOUR_/.test(C.supabaseUrl) && window.supabase);
  const sb = ready ? window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }) : null;

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
})();
