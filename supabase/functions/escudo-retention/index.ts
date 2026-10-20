// Escudo: función de retención. Simulación únicamente hasta validar seguridad.
// No expone endpoint de eliminación en esta etapa.
import { createClient } from 'npm:@supabase/supabase-js@2';
Deno.serve(async () => {
  return Response.json({
    active:false,
    message:'La eliminación automática está desactivada. Pendiente de autenticación servidor a servidor, pruebas de permisos y borrado verificable.'
  }, {status:503});
});
