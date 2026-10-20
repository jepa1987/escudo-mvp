/* Escudo MVP – motor heurístico local y explicable.
   No constituye una lista negra, verificación de dominio ni dictamen definitivo. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.EscudoEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const defang = (s) => String(s || '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\[(?:\.|dot)\]/gi, '.').replace(/\(dot\)/gi, '.');
  const stripAccent = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const cleanText = (s) => stripAccent(defang(s));
  const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"'“”‘’]+|(?:[\p{L}\p{N}][\p{L}\p{N}._-]{0,90}\.)+[\p{L}]{2,24}(?:[:\/][^\s<>"'“”‘’]*)?/giu;
  const SHORTENERS = new Set(['bit.ly', 'tinyurl.com', 't.co', 'cutt.ly', 'is.gd', 'rebrand.ly', 'shorturl.at', 'rb.gy', 'ow.ly', 'tiny.cc', 'goo.gl']);
  const WATCH_TLDS = new Set(['xyz', 'top', 'click', 'icu', 'tk', 'pw', 'vip']);

  function extractUrls(text) {
    const input = defang(text).replace(/hxxps?:\/\//gi, x => x.replace(/^hxx/i,'htt'));
    const result = [], seen = new Set();
    for (const match of input.matchAll(URL_PATTERN)) {
      let original = match[0].replace(/[),;!?\]}]+$/g, '').replace(/\.$/, '');
      if (original.length > 320) original = original.slice(0, 320);
      if (seen.has(original.toLowerCase())) continue;
      seen.add(original.toLowerCase());
      result.push(original);
      if (result.length === 12) break;
    }
    return result;
  }

  function inspectUrl(raw) {
    const reasons = [];
    let parsed;
    try {
      parsed = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw);
    } catch (_) {
      return { original: raw, domain: 'No se pudo interpretar', reasons: ['La dirección no tiene un formato verificable.'], suspicious: true };
    }
    const domain = parsed.hostname.toLowerCase().replace(/\.$/, '');
    const parts = domain.split('.');
    const tld = parts[parts.length - 1];
    if (!domain || (!domain.includes('.') && domain !== 'localhost')) reasons.push('No parece un dominio público válido.');
    if (parsed.protocol === 'http:') reasons.push('Usa HTTP sin cifrado de transporte.');
    if (raw.includes('@') || parsed.username || parsed.password) reasons.push('Contiene @ o credenciales que pueden ocultar el destino real.');
    if (/\bxn--/.test(domain) || /[\u0400-\u04FF]/.test(raw)) reasons.push('Dominio internacionalizado: conviene revisar caracteres parecidos.');
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(domain)) reasons.push('El destino utiliza una dirección IP en lugar de un dominio.');
    if (SHORTENERS.has(domain) || [...SHORTENERS].some(short => domain.endsWith('.' + short))) reasons.push('Enlace acortado: el destino no es evidente.');
    if (WATCH_TLDS.has(tld)) reasons.push('Extensión de dominio que merece revisión adicional (no implica fraude por sí misma).');
    if ((domain.match(/-/g) || []).length >= 2) reasons.push('El dominio tiene varios guiones: revisa posibles imitaciones.');
    if (parts.length >= 5) reasons.push('La dirección contiene muchos subdominios.');
    if (/(?:verifica|validac|cuenta-segura|bloqueo|actualiza|premio|support|security|login-seguro|seguridad|acceso)/i.test(domain) && /(banco|bank|kl[uú]|bbva|santander|banamex|paypal|mercadopago|amazon|netflix)/i.test(domain)) {
      reasons.push('El dominio combina una marca o entidad con palabras de verificación o seguridad.');
    }
    return { original: raw, domain, reasons, suspicious: reasons.length > 0 };
  }

  const SIGNALS = [
    { id:'datos', weight:38, title:'Solicita datos confidenciales', description:'Menciona contraseñas, NIP, CVV, token o códigos de acceso.', re:/\b(nip|cvv|cvc|token|contrasena|password|clave de acceso|codigo de (seguridad|verificacion|autenticacion)|codigo sms|codigo otp|codigo de 6 digitos|numero completo de (tu )?tarjeta|datos bancarios)\b/i },
    { id:'urgencia', weight:23, title:'Presión o amenaza de bloqueo', description:'Busca que tomes una decisión apresurada.', re:/(urgente|inmediatamente|ahora mismo|ultim[ao] (oportunidad|aviso)|en (5|10|15|30|60) minutos|quedara bloquead|sera suspendid|cuenta bloqueada|evita la suspension|tienes (24|48) horas|actua ya|se cancelara tu cuenta)/i },
    { id:'dinero', weight:24, title:'Petición de dinero o transferencia', description:'Pide enviar dinero, hacer un anticipo o liberar fondos.', re:/(transfier[ae]|realiza una transferencia|haz una transferencia|deposit[ae]|manda dinero|envia dinero|paga un anticipo|libera (tus )?fondos|comision por adelantado|pago para liberar)/i },
    { id:'premio', weight:15, title:'Promesa de premio o beneficio inesperado', description:'Ofrece recompensas o usa un incentivo para generar confianza.', re:/(ganaste|ganador|has sido seleccionad|premio|regalo gratis|bono especial|dinero facil|rendimiento garantizado|inversion sin riesgo)/i },
    { id:'suplantacion', weight:12, title:'Se presenta como una institución', description:'Menciona soporte, autoridad o una entidad financiera; confirma por canales oficiales.', re:/(soporte tecnico|atencion al cliente|area de seguridad|departamento de fraude|tu banco|somos del banco|autoridad bancaria|servicio de paqueteria)/i }
  ];

  function analyze(text) {
    const input = String(text || '').trim().slice(0, 15000);
    const normalized = cleanText(input);
    const urls = extractUrls(input).map(inspectUrl);
    const signals = SIGNALS.filter(item => item.re.test(normalized)).map(({ id, weight, title, description }) => ({ id, weight, title, description }));
    const hasRiskyUrl = urls.some(item => item.suspicious);
    let score = signals.reduce((sum, s) => sum + s.weight, 0);
    if (urls.length) {
      signals.push({ id:'enlaces', weight:0, title:'Contiene enlaces', description:'No abras enlaces hasta comprobar el destinatario y el dominio por otra vía.' });
      score += 8;
    }
    if (hasRiskyUrl) {
      signals.push({ id:'url_anomala', weight:0, title:'Dirección web que requiere revisión', description:'Se detectaron elementos en el enlace que justifican precaución.' });
      score += 25;
    }
    if (urls.length && SIGNALS.some(s => s.id === 'datos' && s.re.test(normalized))) score += 22;
    if (urls.length && SIGNALS.some(s => s.id === 'urgencia' && s.re.test(normalized))) score += 12;
    const level = score >= 55 ? 'alto' : score >= 22 ? 'precaucion' : 'indeterminado';
    return {
      level,
      score,
      title: level === 'alto' ? 'Señales de riesgo elevado' : level === 'precaucion' ? 'Señales que requieren precaución' : 'No encontramos señales claras',
      summary: level === 'alto' ? 'No sigas instrucciones del mensaje hasta verificar su origen con la institución por un canal independiente.' : level === 'precaucion' ? 'Antes de actuar, confirma la identidad del remitente y la legitimidad de cualquier enlace.' : 'Esto NO significa que sea legítimo: un fraude puede no mostrar señales obvias y el OCR puede omitir detalles.',
      signals, urls,
      analyzedCharacters: input.length
    };
  }
  return { analyze, extractUrls, inspectUrl };
});
