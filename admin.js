(() => {
'use strict';
const cfg=window.ESCUDO_ANALYTICS||{}, $=id=>document.getElementById(id);
const message=t=>$('message').textContent=t;
if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url)||!cfg.anonKey||!window.supabase){message('Panel pendiente de configurar. Consulta SETUP_ANALYTICS.md.');$('login-form').querySelector('button').disabled=true;return;}
const client=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
function ui(logged){$('login').hidden=logged;$('dashboard').hidden=!logged;$('refresh').hidden=!logged;$('logout').hidden=!logged;}
async function load(){
 const {data:{session}}=await client.auth.getSession();
 if(!session){ui(false);return;}
 // RLS en Supabase decide si el usuario está autorizado. No dependemos de ocultar la URL.
 const {data,error}=await client.from('analysis_events').select('created_at,risk,mode,flagged_domain,signal_count,url_count').order('created_at',{ascending:false}).limit(500);
 if(error){ui(false);message('No se pueden leer eventos. Comprueba que tu usuario esté autorizado en admin_users. '+error.message);return;}
 ui(true);message('');
 const events=data||[];$('total').textContent=events.length;$('high').textContent=events.filter(x=>x.risk==='alto').length;$('warning').textContent=events.filter(x=>x.risk==='precaucion').length;$('domains').textContent=new Set(events.map(x=>x.flagged_domain).filter(Boolean)).size;
 $('rows').replaceChildren();
 for(const e of events){const tr=document.createElement('tr');const vals=[e.created_at?.replace('T',' ').slice(0,19)||'',e.risk,e.mode,e.flagged_domain||'—',e.signal_count,e.url_count];for(const val of vals){const td=document.createElement('td');td.textContent=String(val??'');tr.appendChild(td)}$('rows').appendChild(tr);}
}
$('password-login-form').addEventListener('submit',async event=>{
 event.preventDefault();
 const button=$('password-login-button');button.disabled=true;button.textContent='Verificando acceso...';
 message('');
 try{
   const email=$('email-password').value.trim();
   const password=$('login-password').value;
   const {error}=await client.auth.signInWithPassword({email,password});
   $('login-password').value='';
   if(error){message('No se pudo iniciar sesión. Comprueba que tu cuenta tenga contraseña y que los datos sean correctos. '+(error.message||''));}
   else {await load();}
 }catch(_){message('No se pudo conectar con el servicio de autenticación. Intenta nuevamente.');}
 finally {button.disabled=false;button.textContent='Entrar al panel';}
});
$('login-form').addEventListener('submit',async event=>{event.preventDefault();message('Enviando acceso...');const {error}=await client.auth.signInWithOtp({email:$('email').value,options:{emailRedirectTo:location.origin+location.pathname}});message(error?'Error: '+error.message:'Si el correo está habilitado, revisa tu bandeja de entrada.');});

async function retentionTest(){
 const button=$('retention-test'), output=$('retention-result');
 button.disabled=true;output.textContent='Consultando expedientes vencidos sin eliminar archivos...';
 try{
  const {data:{session},error:sessionError}=await client.auth.getSession();
  if(sessionError || !session?.access_token){output.textContent='Tu sesión terminó. Inicia sesión nuevamente.';return;}
  const response=await fetch((cfg.url.endsWith('/') ? cfg.url.slice(0,-1) : cfg.url)+'/functions/v1/escudo-retention',{
   method:'POST',
   headers:{'Authorization':'Bearer '+session.access_token,'apikey':cfg.anonKey,'Content-Type':'application/json'},
   body:'{}',cache:'no-store'
  });
  const data=await response.json().catch(()=>({}));
  if(response.ok && data.mode==='dry_run' && data.deletion_enabled===false){
    output.textContent='Simulación completada: '+Number(data.expired_records||0)+' expedientes vencidos (máximo 50 consultados). Ningún archivo eliminado.';
  } else if(response.status===401){
    output.textContent='HTTP 401: autenticación rechazada. La verificación JWT legado de Edge Functions puede impedir que el token de sesión llegue a la función. No desactives protecciones todavía.';
  } else if(response.status===403){
    output.textContent='HTTP 403: esta cuenta no tiene permiso de ejecución. Revisa admin_users.';
  } else {
    output.textContent='No se completó el Dry Run (HTTP '+response.status+'). '+String(data.error||data.message||'Verifica los registros de Edge Functions.').slice(0,240);
  }
 } catch(error){output.textContent='No se pudo contactar la función. Comprueba la conexión y los registros de Edge Functions.'}
 finally{button.disabled=false;}
}

$('set-password-form').addEventListener('submit', async (event)=>{
 event.preventDefault();
 const first=$('new-password'), second=$('confirm-password'), status=$('set-password-status'), button=$('set-password-btn');
 status.textContent='';
 if(first.value.length<12){status.textContent='Usa por lo menos 12 caracteres.';return;}
 if(first.value!==second.value){status.textContent='Las contraseñas no coinciden.';return;}
 const {data:{session}}=await client.auth.getSession();
 if(!session){status.textContent='No hay una sesión activa. Vuelve a iniciar sesión.';return;}
 button.disabled=true;button.textContent='Actualizando...';
 try{
   const {error}=await client.auth.updateUser({password:first.value});
   if(error){status.textContent='No se pudo actualizar la contraseña: '+error.message+' Si se solicita reautenticación, no cierres la sesión actual hasta resolverlo.';}
   else {status.textContent='Contraseña establecida. Ya puedes iniciar sesión con correo y contraseña en otros dispositivos.';first.value='';second.value='';}
 }catch(_){status.textContent='No se pudo contactar Supabase. Vuelve a intentarlo.'}
 finally{button.disabled=false;button.textContent='Crear o cambiar contraseña';}
});

$('retention-test').addEventListener('click',retentionTest);

$('refresh').addEventListener('click',load);$('logout').addEventListener('click',async()=>{await client.auth.signOut();ui(false);message('Sesión cerrada.')});client.auth.onAuthStateChange(()=>setTimeout(load,0));load();
})();
