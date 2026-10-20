# Escudo / Evidencias privadas: instalación segura (fase 1)

Estado: **preparado para configurar, NO conectado ni probado en Supabase**. Escudo continúa analizando capturas localmente y NO sube imágenes.

## Paso 1. Bucket
En Supabase > Storage > New bucket crea `escudo-evidencias`: **Private**, máximo **5 MB** por imagen, tipos MIME **image/jpeg** y **image/png**. No actives Public ni políticas amplias de subida. Probar con capturas ficticias sin datos reales.

## Paso 2. SQL
En SQL Editor ejecuta `supabase_evidence_private.sql`. Crea metadatos con expiración a 30 días y acceso de lectura a los administradores ya incluidos en `admin_users`. No abre inserción anónima ni acceso de lectura a clientes.

Verifica las políticas de Storage: ninguna política ya existente debe permitir leer o subir objetos en `escudo-evidencias` a anon ni a personas no autorizadas. Las políticas RLS se combinan de modo permisivo si hay otras adicionales.

## Paso 3. Validaciones de seguridad antes de habilitar subidas
- Anónimo: listar, descargar, subir y borrar al bucket deben fallar.
- Usuario autenticado NO registrado en admin_users: las mismas operaciones deben fallar.
- Administrador: lectura de un archivo de prueba debe funcionar; borrado mediante Storage API debe funcionar. No almacenar fotografías reales en esta prueba.
- Nunca subir service_role/secret keys al repositorio o navegador.
- Hacer evaluación de privacidad, finalidad, aviso, proceso de revocación y supresión.
- Diseñar backend autenticado y antiabuso que compruebe consentimiento vigente, MIME real, tamaño, redacción de datos sensibles y asociación al expediente antes de admitir fotos reales.

## Retención y verificación
La fecha `expires_at` en SQL marca vencimiento, **no borra el archivo por sí sola**. La automatización futura debe ejecutarse en un entorno servidor autorizado: seleccionar pendientes vencidos, eliminarlos mediante **Storage API remove()**, confirmar que el objeto ya no está disponible, actualizar estado `deleted` y `deleted_at`, y reintentar fallos. Programación diaria y alertas de errores. No hacer `DELETE FROM storage.objects`: deja archivos huérfanos. Registrar auditoría y gestionar copias/backups de acuerdo con políticas institucionales.

## Estado final de esta fase
**No se ha habilitado ninguna subida pública ni se ha programado borrado automático.** Primero confirmar bucket, SQL, controles y prueba de eliminación.
