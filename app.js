/* Escudo MVP. La imagen se lee en memoria local: no existe API de carga ni base de datos. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = { tab: 'capture', file: null, imageURL: null, result: null, rawText: '', running: false };
  const example = 'AVISO URGENTE: Tu cuenta bancaria será bloqueada en 10 minutos. Para evitarlo ingresa a http://klu-validacion-seguridad.com/activar y proporciona tu NIP y código de verificación.';
  const MB = 1024 * 1024;

  function showError(message) { $('error').textContent = message; $('error').hidden = !message; }
  function setTab(tab) {
    state.tab = tab;
    $('view-capture').hidden = tab !== 'capture';
    $('view-text').hidden = tab !== 'text';
    for (const name of ['capture', 'text']) {
      const active = name === tab;
      $('tab-' + name).classList.toggle('active', active);
      $('tab-' + name).setAttribute('aria-selected', String(active));
    }
    showError('');
  }
  $('tab-capture').addEventListener('click', () => setTab('capture'));
  $('tab-text').addEventListener('click', () => setTab('text'));
  function releaseImage() { if (state.imageURL) URL.revokeObjectURL(state.imageURL); state.imageURL = null; }

  function useFile(file) {
    showError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) { showError('Elige un archivo de imagen (JPG, PNG o WEBP).'); return; }
    if (file.size > 10 * MB) { showError('La imagen supera 10 MB. Recórtala o comprímela y vuelve a intentarlo.'); return; }
    if (file.size === 0) { showError('La imagen está vacía. Elige otra.'); return; }
    releaseImage();
    state.file = file;
    state.imageURL = URL.createObjectURL(file);
    $('image-preview').src = state.imageURL;
    $('selected-name').textContent = file.name;
    $('selected-size').textContent = (file.size / MB).toFixed(2) + ' MB';
    $('empty-drop').hidden = true;
    $('selected-drop').hidden = false;
    $('analyze-image').disabled = false;
    $('analyze-image').querySelector('span').textContent = 'Analizar captura';
  }
  $('file-input').addEventListener('change', event => useFile(event.target.files[0]));
  $('dropzone').addEventListener('click', () => { if (!state.running) $('file-input').click(); });
  $('dropzone').addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && !state.running) { event.preventDefault(); $('file-input').click(); }
  });
  for (const action of ['dragenter', 'dragover']) $('dropzone').addEventListener(action, e => { e.preventDefault(); $('dropzone').classList.add('drag'); });
  for (const action of ['dragleave', 'drop']) $('dropzone').addEventListener(action, e => { e.preventDefault(); $('dropzone').classList.remove('drag'); });
  $('dropzone').addEventListener('drop', event => { if (!state.running) useFile(event.dataTransfer.files[0]); });

  function displayProgress(message, value) {
    $('ocr-progress').hidden = false;
    $('progress-stage').textContent = message;
    const progress = Math.round(Math.max(0, Math.min(1, value)) * 100);
    $('progress-bar').style.width = progress + '%';
    $('progress-percent').textContent = progress + '%';
  }
  const stages = {
    'loading tesseract core': 'Cargando lector de imagen',
    'initializing tesseract': 'Preparando lector de imagen',
    'loading language traineddata': 'Cargando idioma español e inglés',
    'initializing api': 'Iniciando reconocimiento',
    'recognizing text': 'Reconociendo texto de la captura'
  };
  async function analyzeImage() {
    if (state.running || !state.file) return;
    showError('');
    if (!window.Tesseract || !window.Tesseract.createWorker) {
      showError('No se pudo cargar el motor OCR. Comprueba tu conexión a Internet, recarga la página o utiliza la pestaña «Texto o URL».');
      return;
    }
    state.running = true;
    $('analyze-image').disabled = true;
    $('analyze-image').querySelector('span').textContent = 'Leyendo imagen...';
    displayProgress('Cargando motor de lectura...', 0);
    let worker;
    try {
      worker = await Tesseract.createWorker(['spa', 'eng'], 1, {
        logger: message => {
          if (message.status) displayProgress(stages[message.status] || 'Procesando la imagen...', message.progress || 0);
        }
      });
      const response = await worker.recognize(state.file);
      const text = (response.data && response.data.text ? response.data.text : '').trim();
      if (!text || text.length < 4) throw new Error('No se pudo leer texto suficiente. Prueba una captura nítida o utiliza la pestaña «Texto o URL».');
      displayProgress('Lectura completada', 1);
      renderAnalysis(text);
    } catch (err) {
      console.warn('OCR:', err);
      showError(err && /texto suficiente/.test(err.message || '') ? err.message : 'No fue posible leer esta imagen. Usa PNG/JPG/WEBP, revisa tu conexión y prueba otra vez. También puedes pegar el texto directamente.');
    } finally {
      if (worker) { try { await worker.terminate(); } catch (_) { /* best effort */ } }
      state.running = false;
      $('analyze-image').disabled = false;
      $('analyze-image').querySelector('span').textContent = 'Volver a leer captura';
      window.setTimeout(() => { $('ocr-progress').hidden = true; }, 900);
    }
  }
  $('analyze-image').addEventListener('click', analyzeImage);
  $('analyze-text').addEventListener('click', () => {
    const text = $('manual-text').value.trim();
    if (!text) { showError('Pega el mensaje o la URL que quieres revisar.'); $('manual-text').focus(); return; }
    showError('');
    renderAnalysis(text);
  });
  $('try-example').addEventListener('click', () => {
    setTab('text');
    $('manual-text').value = example;
    renderAnalysis(example);
  });
  $('reanalyze').addEventListener('click', () => {
    const corrected = $('recognized-text').value.trim();
    if (!corrected) { showError('El texto no puede estar vacío.'); return; }
    showError(''); renderAnalysis(corrected);
  });

  function appendTextElement(parent, tag, className, value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = value;
    parent.appendChild(el);
    return el;
  }
  function renderAnalysis(text) {
    state.rawText = text;
    state.result = EscudoEngine.analyze(text);
    const result = state.result;
    const high = result.level === 'alto';
    const precaution = result.level === 'precaucion';
    const banner = $('risk-banner');
    banner.className = 'risk-banner' + (high ? ' high' : precaution ? '' : ' uncertain');
    banner.setAttribute('role', high ? 'alert' : 'status');
    $('risk-icon').textContent = high ? '⚠' : precaution ? '?' : 'i';
    $('risk-level').textContent = high ? 'ALERTA DE SEGURIDAD · RIESGO ELEVADO' : precaution ? 'PRECAUCIÓN' : 'EVALUACIÓN NO CONCLUYENTE';
    $('risk-title').textContent = high ? '¡POSIBLE ESTAFA!' : result.title;
    $('risk-summary').textContent = result.summary;
    $('risk-action').hidden = !high;
    $('result-tag').textContent = high ? '¡POSIBLE ESTAFA!' : precaution ? 'Precaución' : 'Sin certeza';
    $('result-tag').classList.toggle('high-risk-status', high);
    $('result-tag').style.color = high ? '#a23d37' : precaution ? '#916629' : '#517e92';
    $('signals-count').textContent = String(result.signals.length);
    $('signals-list').replaceChildren();
    if (!result.signals.length) {
      const row = appendTextElement($('signals-list'), 'div', 'signal-item', 'No hay patrones conocidos en el texto. Esto no demuestra legitimidad.');
      row.style.color = '#657d90'; row.style.fontSize = '12px';
    }
    for (const signal of result.signals) {
      const row = document.createElement('div'); row.className = 'signal-item';
      appendTextElement(row, 'div', 'signal-dot', '!');
      const info = document.createElement('div');
      appendTextElement(info, 'strong', '', signal.title);
      appendTextElement(info, 'p', '', signal.description);
      row.appendChild(info); $('signals-list').appendChild(row);
    }
    $('urls-section').hidden = result.urls.length === 0;
    $('urls-count').textContent = String(result.urls.length);
    $('urls-list').replaceChildren();
    for (const url of result.urls) {
      const card = document.createElement('div'); card.className = 'url-item';
      appendTextElement(card, 'div', 'url-host', url.domain);
      appendTextElement(card, 'div', 'url-raw', url.original);
      if (url.officialKluDomain) appendTextElement(card, 'p', 'microcopy', 'Dominio incluido en la lista autorizada de KLU. Esto no certifica que la página o su contenido sean seguros.');
      if (url.reasons.length) {
        for (const reason of url.reasons) appendTextElement(card, 'p', 'url-alert', '⚠ ' + reason);
      } else {
        appendTextElement(card, 'p', 'microcopy', 'Sin anomalías obvias en el formato. No es una validación de seguridad.');
      }
      $('urls-list').appendChild(card);
    }
    $('recognized-text').value = text;
    $('rec-text').textContent = getAdvice(result);
    $('result-empty').hidden = true;
    $('result-content').hidden = false;
    $('copied').hidden = true;
    if (window.innerWidth <= 830) $('results-panel').scrollIntoView({ behavior:'smooth', block:'start' });
  }
  function getAdvice(result) {
    const intro = result.level === 'alto'
      ? 'Detén la acción. No abras el enlace, no transfieras dinero y no compartas claves o códigos.'
      : 'No tomes decisiones solo con esta evaluación. Evita abrir enlaces no verificados y no compartas datos confidenciales.';
    const after = ' Entra a la app o escribe manualmente la dirección oficial de tu institución; nunca uses el enlace del mensaje. Si ya entregaste datos o transferiste dinero, contacta inmediatamente a tu institución por sus canales oficiales, solicita medidas de protección y conserva evidencia.';
    return intro + after;
  }
  $('copy-report').addEventListener('click', async () => {
    if (!state.result) return;
    const result = state.result;
    const report = [
      'ESCUDO — Evaluación preventiva (no certifica fraude ni seguridad)',
      result.title,
      result.summary,
      ...result.signals.map(s => '• ' + s.title + ': ' + s.description),
      ...result.urls.map(u => '• URL ' + u.original + ': ' + (u.reasons.join(' | ') || 'Sin anomalías obvias; NO verificada')),
      'Recomendación: ' + getAdvice(result)
    ].join('\n');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(report);
      else {
        const el = document.createElement('textarea'); el.value = report;
        document.body.appendChild(el); el.select(); document.execCommand('copy'); el.remove();
      }
      $('copied').hidden = false;
    } catch (_) { showError('Tu navegador no permitió copiar el resultado.'); }
  });
  $('reset').addEventListener('click', () => {
    releaseImage(); state.file = null; state.result = null; state.rawText = '';
    $('file-input').value = ''; $('manual-text').value = ''; $('recognized-text').value = '';
    $('selected-drop').hidden = true; $('empty-drop').hidden = false; $('image-preview').removeAttribute('src');
    $('analyze-image').disabled = true;
    $('result-empty').hidden = false; $('result-content').hidden = true;
    $('result-tag').textContent = 'Aún sin evaluar'; $('result-tag').style.color = '';
    $('result-tag').classList.remove('high-risk-status');
    showError('');
    setTab('capture');
    document.querySelector('.input-panel').scrollIntoView({ behavior:'smooth', block:'start' });
  });

  // Cachea solo el código propio; nunca imágenes del usuario ni recursos remotos.
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
})();
