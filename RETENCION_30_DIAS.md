# Retención de evidencias: siguiente etapa

La eliminación automática aún no está habilitada. El próximo paso requiere una Edge Function de Supabase de acceso restringido, una prueba de simulación y pruebas con archivos ficticios.

No coloques secretos en GitHub ni actives subidas públicas. Eliminar filas en SQL no elimina los archivos de Storage.

Plan: preparar función que seleccione expedientes vencidos, borre archivos mediante Storage API, verifique ausencia, registre resultado y permita reintentos. Después configurar tarea diaria protegida mediante Vault y cron.
