# KLU.CHECK — Retención de evidencias (prototipo NO desplegado)

Código preparado en `supabase/functions/escudo-retention/index.ts`.

## Estado de seguridad
- `DELETION_ENABLED = false`: el endpoint solo devuelve `dry_run`. No se elimina ningún archivo.
- GitHub y Supabase Edge Functions son entornos separados: **editar el archivo en GitHub NO actualiza la función desplegada en Supabase**.
- Antes de desplegar, revisar compatibilidad del runtime, pruebas de errores, RLS y la función anterior.
- La rama de borrado propuesta queda inalcanzable. Requiere evaluación de la verificación de ausencia (`info` y HTTP 404), casos de fallos parciales, concurrencia e idempotencia.
- No introducir `service_role` ni ninguna clave secreta en código del navegador o en GitHub.
- **No existe programación automática activada**, ni supresión por revocación todavía.

## Plan de pruebas antes de activar
1. Probar simulación con cuenta administradora y secundaria.
2. Usar objetos ficticios vencidos y no vencidos; comprobar selección correcta.
3. Hacer pruebas separadas en entorno de ensayo con permisos de backend, errores de red y eliminación repetida.
4. Crear log de auditoría independiente e inmutable, con actor/motivo/fechas, sin datos sensibles.
5. Probar borrado físico de Storage y ausencia confirmada, reintentos y alertas de fallos.
6. Configurar ejecutor de confianza programado con secreto y cron, no el login de un administrador.
7. Implementar revocación de consentimiento que derive en solicitudes verificables de supresión.
8. Aprobar protección de datos y habilitar subida después de pruebas integrales.
