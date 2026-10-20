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


  // Lista de dominios autorizados proporcionada por KLU para el MVP.
  // Comparación EXACTA de hostname: otros subdominios no se autorizan por herencia.
  const OFFICIAL_KLU_HOSTS = new Set(['klu.mx', 'www.klu.mx', 'corporate.klu.mx']);
  const VERIFIED_BRANDS = [
    { id:'klu', name:'KLU', rootDomain:'klu.mx',
      brand:/(?:^|[^a-z0-9])klu(?:$|[^a-z0-9])/i,
      siteStyle:/\bklu\b.{0,85}\b(?:plataforma financiera|plataforma digital|sistema financiero|iniciar sesion|inicia sesion|accede a tu cuenta|abre tu cuenta|cuenta empresarial|servicios financieros|finanzas empresariales)\b|\bklu\s+mexico\s*[|—:-]/i }
  ];
  function looksLikeKluDomain(hostname) {
    const h = String(hostname || '').toLowerCase();
    if (h.includes('klu')) return true;
    // Errores frecuentes y sustitución visual de un carácter.
    // Buscar también fragmentos separados por guion: corporate-k1u.one.
    // No es una prueba concluyente de fraude; genera una alerta preventiva.
    return h.split(/[.-]/).some(label =>
      /^(?:k1u|kiu|kllu|kluu|clu|klv|k1uu)$/.test(label)
    ) || /(?:^|[.-])k-l-u(?:[.-]|$)/.test(h);
  }
  function normalizeOCRUrls(s) {
    return String(s || '').replace(/([a-z0-9-])\s*\.\s*(com|mx|net|org|gob|edu|io|co|app|site|info|xyz|click|online)\b/giu, '$1.$2');
  }

  function extractUrls(text) {
    const input = normalizeOCRUrls(defang(text)).replace(/hxxps?:\/\//gi, x => x.replace(/^hxx/i,'htt'));
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
    const officialKluDomain = OFFICIAL_KLU_HOSTS.has(domain);
    const kluLookalike = !officialKluDomain && looksLikeKluDomain(domain);
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
    if (kluLookalike) reasons.push('El dominio se parece a KLU, pero no coincide con los tres dominios autorizados para esta prueba. Posible suplantación.');
    if (/(?:verifica|validac|cuenta-segura|bloqueo|actualiza|premio|support|security|login-seguro|seguridad|acceso)/i.test(domain) && /(banco|bank|kl[uú]|bbva|santander|banamex|paypal|mercadopago|amazon|netflix)/i.test(domain)) {
      reasons.push('El dominio combina una marca o entidad con palabras de verificación o seguridad.');
    }
    return { original: raw, domain, reasons, suspicious: reasons.length > 0, officialKluDomain, kluLookalike };
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
      signals.push({ id:'enlaces', weight:0, title:'Contiene enlaces', description:'No abras enlaces hasta comprobar el destino y el dominio por otra vía.' });
      score += 8;
    }
    if (hasRiskyUrl) {
      signals.push({ id:'url_anomala', weight:0, title:'Dirección web que requiere revisión', description:'Se detectaron elementos en el enlace que justifican precaución.' });
      score += 25;
    }
    // Sólo se reconocen los hostnames exactos facilitados por el responsable.
    // Un dominio externo que simplemente menciona KLU no es necesariamente phishing.
    for (const brand of VERIFIED_BRANDS) {
      const foreign = [...new Set(urls.filter(url =>
        url.domain !== 'No se pudo interpretar' && !OFFICIAL_KLU_HOSTS.has(url.domain)
      ).map(url => url.domain))];
      if (!foreign.length) continue;
      const officialStyle = brand.siteStyle.test(normalized);
      const domainNamesBrand = foreign.some(looksLikeKluDomain);
      if (officialStyle || domainNamesBrand) {
        signals.unshift({
          id:'marca_dominio', weight:0,
          title:'Posible suplantación de ' + brand.name + ': dominio no reconocido',
          description:'Se detectó «' + foreign.slice(0, 2).join('», «') + '». No coincide con los dominios autorizados en esta prueba: klu.mx, www.klu.mx y corporate.klu.mx. Verifica con KLU antes de interactuar.'
        });
        score = Math.max(score + 65, 75);
        for (const url of urls) {
          if (foreign.includes(url.domain)) {
            if (!url.reasons.some(reason => reason.includes('Posible suplantación'))) {
              url.reasons.push('La captura parece atribuir a KLU un dominio no autorizado para esta prueba.');
            }
            url.suspicious = true;
          }
        }
      } else if (brand.brand.test(normalized)) {
        signals.push({
          id:'marca_externa', weight:0, title:'Referencia a ' + brand.name + ' desde un sitio externo',
          description:'El sitio externo puede estar mencionando a KLU con fines informativos. No es un dominio autorizado de KLU; verifica el contexto.'
        });
        score += 16;
      }
    }
    if (urls.length && SIGNALS.some(s => s.id === 'datos' && s.re.test(normalized))) score += 22;
    if (urls.length && SIGNALS.some(s => s.id === 'urgencia' && s.re.test(normalized))) score += 12;
    const level = score >= 55 ? 'alto' : score >= 22 ? 'precaucion' : 'indeterminado';
    return {
      level, score,
      title: level === 'alto' ? 'Señales de riesgo elevado' : level === 'precaucion' ? 'Señales que requieren precaución' : 'Evaluación no concluyente',
      summary: level === 'alto' ? 'Se detectaron indicadores que podrían señalar fraude o suplantación. No entres ni sigas instrucciones antes de validar por un canal oficial independiente.' : level === 'precaucion' ? 'Antes de actuar, confirma la identidad del remitente y la legitimidad de cualquier enlace.' : 'No se detectaron señales con las reglas actuales. Esto NO significa que el enlace sea legítimo: un fraude puede no mostrar señales obvias y el OCR puede omitir detalles.',
      signals, urls, analyzedCharacters: input.length
    };
  }
  return { analyze, extractUrls, inspectUrl };
});
