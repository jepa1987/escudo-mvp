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
$('login-form').addEventListener('submit',async event=>{event.preventDefault();message('Enviando acceso...');const {error}=await client.auth.signInWithOtp({email:$('email').value,options:{emailRedirectTo:location.origin+location.pathname}});message(error?'Error: '+error.message:'Si el correo está habilitado, revisa tu bandeja de entrada.');});
$('refresh').addEventListener('click',load);$('logout').addEventListener('click',async()=>{await client.auth.signOut();ui(false);message('Sesión cerrada.')});client.auth.onAuthStateChange(()=>setTimeout(load,0));load();
})();
