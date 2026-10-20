/* Consentimiento opcional de imágenes. En esta fase NO se suben ni almacenan fotos. */
(function(){
 'use strict';
 const key='escudo-image-consent-v1';
 const dialog=document.getElementById('privacy-dialog');
 const info=document.getElementById('privacy-current');
 const notice=document.getElementById('privacy-feedback');
 function read(){try{return localStorage.getItem(key)||''}catch(_){return ''}}
 function store(value){try{localStorage.setItem(key,value)}catch(_){/* sin persistencia: pedir en siguiente visita */}}
 function refresh(){
   const value=read();
   info.textContent=value==='accepted'?'Autorizaste el almacenamiento futuro, pero la subida de imágenes aún NO está activada.':value==='declined'?'No autorizaste almacenar fotografías. Los análisis siguen disponibles.':'Aún no elegiste una opción.';
 }
 function open(){dialog.hidden=false;document.body.style.overflow='hidden';document.getElementById('privacy-decline').focus();}
 function close(){dialog.hidden=true;document.body.style.overflow='';refresh()}
 document.getElementById('privacy-accept').addEventListener('click',()=>{store('accepted');close();notice.textContent='Preferencia guardada. La subida de fotos todavía está desactivada.'});
 document.getElementById('privacy-decline').addEventListener('click',()=>{store('declined');close();notice.textContent='Puedes seguir analizando imágenes sin almacenarlas.'});
 document.getElementById('privacy-manage').addEventListener('click',open);
 document.getElementById('privacy-revoke').addEventListener('click',()=>{store('declined');close();notice.textContent='Permiso revocado para futuras subidas. No hay subida de fotografías activa en esta versión. Si alguna vez se habilita, los datos ya conservados requerirán un mecanismo de eliminación independiente.'});
 refresh();
 if(!read())open();
 window.EscudoImagePrivacy={allowed:()=>read()==='accepted'};
})();
