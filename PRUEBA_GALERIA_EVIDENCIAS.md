# KLU.CHECK — Fase 2: galería privada de evidencias

## Implementado
- Panel privado muestra registros de `public.evidence_records` (hasta 40), con vencimiento, riesgo, dominio y estado.
- Imágenes se solicitan mediante `supabase.storage.from('escudo-evidencias').download(path)` solo después del clic del administrador.
- La autorización se debe comprobar con RLS en `evidence_records` y `storage.objects`. No se usa ninguna secret key en el navegador.
- No hay subida pública ni almacenamiento de imágenes desde la aplicación de clientes.
- Las URLs temporales son de tipo `blob:` local y se revocan al cerrar la vista; esto no elimina el archivo del servidor.

## Prueba manual segura (solo imagen ficticia)
1. En **Storage → escudo-evidencias**, sube una imagen de prueba sin datos personales llamada `demo-prueba.png`.
2. En **SQL Editor**, ejecuta únicamente si el archivo está realmente presente:
```sql
insert into public.evidence_records(storage_path,risk,flagged_domain)
values ('demo-prueba.png','indeterminado',null)
on conflict(storage_path) do nothing;
```
3. Abre `admin.html`, entra con tu administrador y presiona **Consultar evidencias** y luego **Ver imagen**.
4. Comprueba que se muestra la imagen y que un usuario no administrador no puede acceder al archivo.
5. Antes de borrar, identifica también el registro. Eliminar desde Storage no modifica automáticamente la fila de metadatos: hasta implementar un flujo auditado de supresión, hay que coordinar ambas operaciones.

## Antes de almacenar fotos reales
- Aprobar información/aviso de privacidad y consentimiento voluntario granular, posibilidad de revocación y mecanismo de eliminación de expedientes.
- Implementar endpoint privado para subida mediada por servidor (no usar service_role en el navegador), controles antimalware, validación real de MIME/tamaño, re-encoding/redacción de datos personales y rate limiting.
- Validar restricciones de acceso reales de usuarios administradores/no administradores.
- Implementar eliminación programada verificable de Storage y su registro, incluidas revocaciones.
- Evaluar el costo y tratamiento internacional de datos sensibles en Supabase (región US East actual).
