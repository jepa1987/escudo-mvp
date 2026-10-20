// KLU.CHECK: retención de evidencias. PREPARADO PARA PRUEBAS.
// IMPORTANTE: esta versión es DRY RUN por diseño. Nunca borra objetos.
// La eliminación real necesitará una revisión separada y una función privada
// con credenciales de servidor, auditoría, reintentos y programación protegida.
import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "escudo-evidencias";
const RETENTION_DAYS = 30;
const DELETION_ENABLED = false; // BLOQUEO DE SEGURIDAD: mantener false
const LIMIT = 50;
const json = (body: Record<string, unknown>, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const auth = request.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "No autorizado" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const publishable = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !publishable) return json({ error: "Configuración incompleta" }, 503);

  // Cliente con el JWT del usuario, sin service_role ni privilegios elevados.
  const client = createClient(url, publishable, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData, error: userError } = await client.auth.getUser(auth.slice(7));
  if (userError || !userData.user) return json({ error: "Sesión inválida" }, 401);
  const { data: admin, error: adminError } = await client
    .from("admin_users").select("user_id")
    .eq("user_id", userData.user.id).maybeSingle();
  if (adminError || !admin) return json({ error: "No autorizado" }, 403);

  const now = new Date().toISOString();
  const { data, error } = await client.from("evidence_records")
    .select("id,expires_at,status")
    .lte("expires_at", now)
    .in("status", ["pending", "delete_error"])
    .order("expires_at", { ascending: true })
    .limit(LIMIT);
  if (error) return json({ error: "Error al consultar evidencias" }, 500);

  // Guardarraíl adicional: no se consulta, descarga ni modifica objeto alguno.
  if (!DELETION_ENABLED) {
    return json({
      function: "escudo-retention",
      mode: "dry_run",
      bucket: BUCKET,
      retention_days: RETENTION_DAYS,
      expired_records: data?.length ?? 0,
      max_records_checked: LIMIT,
      deletion_enabled: false,
      message: "Simulación completada. Ningún archivo eliminado."
    });
  }
  // Bloque reservado intencionalmente: no se entrega una rutina destructiva
  // hasta implementar transacciones de estado, auditoría, verificación de
  // ausencia en Storage, idempotencia y autorización de tarea programada.
  return json({ error: "Eliminación no implementada ni activada" }, 501);
});
