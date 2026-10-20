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
  // IMPLEMENTACIÓN FUTURA (inalcanzable mientras DELETION_ENABLED=false).
  // Requiere además el secreto administrativo solo en el servidor.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return json({ error: "Falta configuración privada" }, 503);
  const service = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const details = await service.from("evidence_records")
    .select("id,storage_path,expires_at,status,delete_attempts")
    .lte("expires_at", now)
    .in("status", ["pending", "delete_error"])
    .order("expires_at", { ascending: true })
    .limit(LIMIT);
  if (details.error) return json({ error: "No fue posible consultar los vencimientos" }, 500);
  const results: { id: string; deleted: boolean; detail: string }[] = [];
  for (const item of details.data ?? []) {
    // Revalidación en servidor para prevenir borrados fuera de plazo.
    if (Date.parse(item.expires_at) > Date.now()) continue;
    const claimed = await service.from("evidence_records")
      .update({
        status: "deleting",
        delete_attempts: (item.delete_attempts ?? 0) + 1,
        last_delete_error: null
      }).eq("id", item.id).eq("status", item.status)
      .eq("expires_at", item.expires_at).select("id");
    if (claimed.error || claimed.data?.length !== 1) continue;
    try {
      const removed = await service.storage.from(BUCKET).remove([item.storage_path]);
      if (removed.error) throw removed.error;
      // Verificación: la operación de lectura de información debe indicar ausencia.
      const check = await service.storage.from(BUCKET).info(item.storage_path);
      if (!check.error) throw new Error("El objeto sigue disponible en Storage");
      // No dar por eliminado en caso de indisponibilidad/red: aceptar solamente 404.
      const status = Number((check.error as { status?: number; statusCode?: string }).status
        ?? (check.error as { statusCode?: string }).statusCode);
      if (status !== 404) throw new Error("No pudo verificarse la ausencia (sin HTTP 404)");
      const updated = await service.from("evidence_records").update({
        status: "deleted", deleted_at: new Date().toISOString(), last_delete_error: null
      }).eq("id", item.id).eq("status", "deleting");
      if (updated.error) throw updated.error;
      results.push({ id: item.id, deleted: true, detail: "Borrado y ausencia confirmada" });
    } catch (e) {
      await service.from("evidence_records").update({
        status: "delete_error",
        last_delete_error: String(e instanceof Error ? e.message : "Error desconocido").slice(0, 300)
      }).eq("id", item.id).eq("status", "deleting");
      results.push({ id: item.id, deleted: false, detail: "Requiere revisión o reintento" });
    }
  }
  return json({ mode: "delete", retention_days: RETENTION_DAYS, results });
});
