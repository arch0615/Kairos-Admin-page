import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createClient } from "@supabase/supabase-js";

/*
 * Herramienta INTERNA/LOCAL. La SERVICE KEY se usa SOLO aquí (lado servidor de
 * Vite, Node). Las variables NO llevan prefijo VITE_, así que jamás entran al
 * bundle del navegador. El API /api/* solo existe en `npm run dev`.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ""); // carga todas las vars (incl. las no-VITE)
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_KEY;
  const supabase = url && key
    ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

  const json = (res, code, body) => {
    res.statusCode = code;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
  };

  const apiPlugin = {
    name: "kairos-usuarios-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/")) return next();
        if (!supabase) return json(res, 500, { error: "Faltan SUPABASE_URL / SUPABASE_SERVICE_KEY en .env.local" });
        try {
          const u = new URL(req.url, "http://localhost");
          if (u.pathname === "/api/users") {
            return json(res, 200, await getAllUsers(supabase));
          }
          if (u.pathname === "/api/doc-url") {
            const path = u.searchParams.get("path");
            if (!path) return json(res, 400, { error: "falta path" });
            const { data, error } = await supabase.storage.from("documentos").createSignedUrl(path, 300);
            if (error) throw error;
            return json(res, 200, { url: data.signedUrl });
          }
          return json(res, 404, { error: "no encontrado" });
        } catch (e) {
          return json(res, 500, { error: String(e?.message || e) });
        }
      });
    },
  };

  return {
    plugins: [react(), apiPlugin],
    server: { port: 5176, host: true },
  };
});

// Reúne: usuarios de Auth + su perfil/rol + sus solicitudes + documentos.
async function getAllUsers(supabase) {
  const { data: authData, error: aErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (aErr) throw aErr;
  const authUsers = authData?.users || [];

  const [{ data: profiles }, { data: solicitudes }, { data: documentos }] = await Promise.all([
    supabase.from("profiles").select("id, email, nombre, role, created_at"),
    supabase.from("solicitudes").select("*").order("created_at", { ascending: false }),
    supabase.from("documentos").select("*").order("created_at", { ascending: true }),
  ]);

  const profById = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
  const docsBySol = {};
  for (const d of documentos || []) (docsBySol[d.solicitud_id] ||= []).push(d);
  const solByUser = {};
  for (const s of solicitudes || []) {
    (solByUser[s.user_id] ||= []).push({ ...s, documentos: docsBySol[s.id] || [] });
  }

  const users = authUsers.map((usr) => ({
    id: usr.id,
    email: usr.email,
    created_at: usr.created_at,
    last_sign_in_at: usr.last_sign_in_at,
    email_confirmed_at: usr.email_confirmed_at,
    phone: usr.phone || null,
    role: profById[usr.id]?.role || "—",
    nombre: profById[usr.id]?.nombre || null,
    solicitudes: solByUser[usr.id] || [],
  }));

  // Resumen
  const summary = {
    total: users.length,
    porRol: users.reduce((acc, u) => ((acc[u.role] = (acc[u.role] || 0) + 1), acc), {}),
    totalSolicitudes: (solicitudes || []).length,
  };
  return { summary, users };
}
