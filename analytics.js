/* Registro mínimo y opcional. Nunca transmite OCR, mensajes ni URLs completas. */
(function(){
  'use strict';
  const cfg = window.ESCUDO_ANALYTICS || {};
  const configured = cfg.enabled === true && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url) && typeof cfg.anonKey === 'string' && cfg.anonKey.length > 20;
  const allowedRisk = new Set(['alto','precaucion','indeterminado']);
  const allowedMode = new Set(['capture','text']);
  const consent = document.getElementById('analytics-consent');
  const status = document.getElementById('analytics-status');
  if(status) status.textContent = configured ? 'Registro anónimo opcional' : 'Telemetría desactivada (pendiente de configuración)';
  function safeDomain(value) {
    const host = String(value||'').toLowerCase().replace(/\.$/,'');
    if(host.length > 100 || !/^[a-z0-9.-]+$/.test(host) || !host.includes('.') || host.includes('..')) return null;
    return host;
  }
  function submit(result,mode) {
    if(!configured || !consent?.checked || !result || !allowedRisk.has(result.level) || !allowedMode.has(mode))return;
    // Solo se conserva UN dominio con indicador de riesgo. Nunca URLs completas.
    const flagged=(result.urls||[]).find(u=>u.suspicious && safeDomain(u.domain));
    const payload={
      risk:result.level,
      mode,
      flagged_domain:flagged?safeDomain(flagged.domain):null,
      signal_count:Math.min(30,Math.max(0,Number(result.signals?.length||0))),
      url_count:Math.min(12,Math.max(0,Number(result.urls?.length||0)))
    };
    fetch(cfg.url.replace(/\/$/,'')+'/rest/v1/analysis_events',{
      method:'POST',mode:'cors',keepalive:true,
      headers:{'Content-Type':'application/json','apikey':cfg.anonKey,'Authorization':'Bearer '+cfg.anonKey,'Prefer':'return=minimal'},
      body:JSON.stringify(payload)
    }).catch(()=>{}); // Nunca bloquear un análisis por problemas de conexión.
  }
  window.EscudoAnalytics={submit,configured};
})();
