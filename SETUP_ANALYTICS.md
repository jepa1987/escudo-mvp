# Escudo · activar el panel privado

## Estado
El frontend y el panel están programados, pero NO envían ni muestran datos reales hasta que configures Supabase. No hay imágenes ni mensajes completos almacenados.

1. Crea un proyecto propio en https://supabase.com y ejecuta `supabase_setup.sql` en **SQL Editor**.
2. En **Authentication > URL Configuration**, agrega `https://jepa1987.github.io/escudo-mvp/admin.html` a **Redirect URLs**.
3. En **Authentication > Users**, crea o invita tu usuario con correo corporativo; copia su UUID.
4. Ejecuta en SQL Editor: `insert into public.admin_users(user_id) values ('TU-UUID-AQUI') on conflict do nothing;`. Solo los UUID registrados pueden consultar la tabla.
5. En **Project Settings > API** copia **Project URL** y **anon / publishable key**. Edita `analytics-config.js` y completa `url`, `anonKey`, `enabled:true`. Nunca uses service_role o secret key.
6. GitHub Pages publicará el archivo automáticamente; prueba la web y abre `https://jepa1987.github.io/escudo-mvp/admin.html`.
7. Haz una prueba voluntaria con el consentimiento activado y verifica el evento en el panel. Si no hay evento, revisa los permisos y configuración en Supabase.

## Privacidad
- Antes de consultar, los usuarios pueden marcar la casilla para autorizar el registro mínimo; desmarcada por defecto.
- Se transmite nivel de riesgo, tipo, recuentos y SOLO un dominio marcado como sospechoso, cuando hay uno. No se envían fotos, OCR, mensajes, URLs completas ni identificadores de persona.
- Algunos dominios pueden ser datos personales si contienen información identificable; revísalos antes del uso real.
- GitHub Pages es público; la privacidad depende de políticas RLS de Supabase y control de usuarios, no de esconder admin.html.
- La API pública de inserción puede recibir spam; ANTES de compartir con clientes, despliega un endpoint con rate limiting / antiabuso, define retención, aviso de privacidad, autorización institucional y evaluación de seguridad.
- Este MVP solo muestra hasta los últimos 500 registros y sus cifras están limitadas a esa muestra.
