/* voz.js · Componente común de las apps de jlcaleroh-apps
   (Trazos de Arquitecto, Números, Mi Rutina, Robot Sílabo y las que vengan).

   Qué hace
   - Bloque "Prueba de voz" para el panel del adulto: elegir la voz del dispositivo (por idioma),
     ajustar la velocidad y escuchar ejemplos de la app para comprobar que se pronuncian bien.
   - La elección se guarda en este dispositivo (cada iPad tiene voces distintas) y no viaja en el respaldo.

   Cómo se usa (igual en todas las apps; copia este archivo SIN cambios)
     <script src="voz.js"></script>               ← antes del script de la app
     Voz.iniciar({
       app: 'numeros',                            // id corto y único de la app
       idioma: () => 'es',                        // 'es' o 'en'
       ejemplos: lang => [{t:'1', d:'uno'}],      // t = lo que se ve en el botón, d = lo que se dice
       frase: lang => '¡Muy bien!',               // una frase típica de la app
       decir: (texto, lang) => {},                // opcional: usar el habla propia de la app
       claseBoton: 'small-btn',                   // opcional
       sinTitulo: false,                          // opcional
       grabar: true,                              // opcional: botón "Grabar" en cada ejemplo (voz del adulto)
     });
     Voz.montar(elemento);                        // dibuja el bloque
     // En el habla de la app:
     const v = Voz.elegida(lang); if (v) u.voice = v, u.lang = v.lang;   // voz elegida por el adulto (o null)
     u.rate *= Voz.velocidad(lang);                                      // 1 = normal
     // Para una letra, sílaba o palabra sola: usa la grabación del adulto si existe; si no, la voz del iPad.
     Voz.decirUnidad('ma');            // devuelve una promesa que termina al acabar el audio
     // Respaldo: Voz.exportarGrabaciones() → {texto: dataURL}; Voz.importarGrabaciones(obj)
*/
(function () {
  'use strict';
  const TXT = {
    es: {
      titulo: 'Prueba de voz',
      ayuda: 'Toca los ejemplos. Si alguno suena mal (por ejemplo, con acento de otro idioma o deletreado), prueba otra voz o cambia la velocidad.',
      voz: 'Voz', auto: 'Automática (la que elige la app)', vel: 'Velocidad', frase: 'Oír una frase',
      sinVoces: 'No encontré voces en español en este dispositivo. En el iPad: Ajustes → Accesibilidad → Contenido leído → Voces → Español.',
      sinVocesEn: 'No encontré voces en inglés en este dispositivo. En el iPad: Ajustes → Accesibilidad → Contenido leído → Voces → Inglés.',
      sinHabla: 'Este navegador no tiene voz.',
      normal: 'normal', lenta: 'más lenta', rapida: 'más rápida',
      grabar: 'Grabar', miVoz: 'Mi voz ✓', hablando: 'Hablando…', sinMic: 'Sin micrófono',
      notaGrabar: 'Grabar: toca y di la palabra en 2 segundos. «Mi voz ✓» = se usa tu grabación; tócalo para borrarla. Las grabaciones viajan en el respaldo.',
    },
    en: {
      titulo: 'Voice check',
      ayuda: 'Tap the examples. If one sounds wrong (another language accent or spelled out), try another voice or change the speed.',
      voz: 'Voice', auto: 'Automatic (chosen by the app)', vel: 'Speed', frase: 'Hear a sentence',
      sinVoces: 'No Spanish voices found on this device. On iPad: Settings → Accessibility → Spoken Content → Voices → Spanish.',
      sinVocesEn: 'No English voices found on this device. On iPad: Settings → Accessibility → Spoken Content → Voices → English.',
      sinHabla: 'This browser has no voice.',
      normal: 'normal', lenta: 'slower', rapida: 'faster',
      grabar: 'Record', miVoz: 'My voice ✓', hablando: 'Speaking…', sinMic: 'No microphone',
      notaGrabar: 'Record: tap and say the word within 2 seconds. “My voice ✓” = your recording is used; tap it to delete. Recordings travel in the backup.',
    },
  };
  let C = null;
  const hayHabla = () => 'speechSynthesis' in window;
  const lang = () => { try { return (C && C.idioma && C.idioma()) === 'en' ? 'en' : 'es'; } catch (e) { return 'es'; } };
  const T = () => TXT[lang()];
  const clave = () => 'voz:' + C.app;
  function prefs() { try { return JSON.parse(localStorage.getItem(clave())) || {}; } catch (e) { return {}; } }
  function guardarPrefs(p) { try { localStorage.setItem(clave(), JSON.stringify(p)); } catch (e) {} }
  function voces(L) {
    if (!hayHabla()) return [];
    try { return speechSynthesis.getVoices().filter(v => v.lang.replace('_', '-').toLowerCase().startsWith(L)); } catch (e) { return []; }
  }
  function elegida(L) {
    L = L === 'en' ? 'en' : 'es';
    const uri = (prefs()[L] || {}).uri; if (!uri || !hayHabla()) return null;
    try { return speechSynthesis.getVoices().find(v => v.voiceURI === uri) || null; } catch (e) { return null; }
  }
  function velocidad(L) {
    L = L === 'en' ? 'en' : 'es';
    const r = +((prefs()[L] || {}).rate); return r > 0 ? r : 1;
  }
  function decir(texto) {
    const L = lang();
    if (C.decir) { try { C.decir(texto, L); return; } catch (e) {} }
    if (!hayHabla()) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(texto);
      const v = elegida(L);
      u.lang = v ? v.lang : (L === 'en' ? 'en-US' : 'es-MX'); if (v) u.voice = v;
      u.rate = Math.max(.5, Math.min(1.6, velocidad(L)));
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  /* ---------- grabaciones del adulto (IndexedDB, claves "app:texto") ---------- */
  const clips = {};                 // texto -> Blob (solo de esta app)
  let db = null, listo = null;
  function abrirDB() {
    if (listo) return listo;
    listo = new Promise(res => {
      try {
        const r = indexedDB.open('jlcaleroh-voz', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('clips');
        r.onsuccess = () => { db = r.result; try {
          const pre = C.app + ':', cur = db.transaction('clips').objectStore('clips').openCursor();
          cur.onsuccess = () => { const c = cur.result; if (c) { if (String(c.key).startsWith(pre)) clips[String(c.key).slice(pre.length)] = c.value; c.continue(); } else res(db); };
          cur.onerror = () => res(db);
        } catch (e) { res(db); } };
        r.onerror = () => res(null);
      } catch (e) { res(null); }
    });
    return listo;
  }
  function guardarClip(t, blob) { clips[t] = blob; try { db && db.transaction('clips', 'readwrite').objectStore('clips').put(blob, C.app + ':' + t); } catch (e) {} }
  function borrarClip(t) { delete clips[t]; try { db && db.transaction('clips', 'readwrite').objectStore('clips').delete(C.app + ':' + t); } catch (e) {} }
  const puedeGrabar = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  function decirUnidad(texto, dicho) {
    const blob = clips[texto];
    if (!blob) { decir(dicho || texto); return new Promise(r => setTimeout(r, 600 + String(dicho || texto).length * 90)); }
    return new Promise(res => {
      try { hayHabla() && speechSynthesis.cancel(); } catch (e) {}
      const url = URL.createObjectURL(blob), a = new Audio(url);
      const fin = () => { URL.revokeObjectURL(url); res(); };
      a.onended = fin; a.onerror = fin;
      a.play().catch(() => { fin(); decir(dicho || texto); });
      setTimeout(res, 4000);
    });
  }
  const aDataURL = bl => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsDataURL(bl); });
  async function exportarGrabaciones() { await abrirDB(); const out = {}; for (const [k, bl] of Object.entries(clips)) { const u = await aDataURL(bl); if (u) out[k] = u; } return out; }
  async function importarGrabaciones(obj) {
    await abrirDB();
    for (const [k, u] of Object.entries(obj || {})) {
      try { const bl = u instanceof Blob ? u : await (await fetch(u)).blob(); guardarClip(k, bl); } catch (e) {}
    }
    await new Promise(r => setTimeout(r, 300));
  }
  let grabando = false;
  async function grabar(texto, boton, alTerminar) {
    if (clips[texto]) { borrarClip(texto); alTerminar(); return; }
    if (grabando) return; grabando = true;
    const t = T();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      const rec = new MediaRecorder(stream), partes = [];
      rec.ondataavailable = e => { if (e.data && e.data.size) partes.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach(x => x.stop()); grabando = false;
        if (partes.length) { guardarClip(texto, new Blob(partes, {type: rec.mimeType || 'audio/mp4'})); setTimeout(() => decirUnidad(texto), 150); }
        alTerminar();
      };
      boton.textContent = t.hablando; rec.start(); setTimeout(() => { try { rec.stop(); } catch (e) {} }, 1800);
    } catch (e) { grabando = false; boton.textContent = t.sinMic; setTimeout(alTerminar, 1800); }
  }

  function estilos() {
    if (document.getElementById('voz-css')) return;
    const s = document.createElement('style'); s.id = 'voz-css';
    s.textContent = `.voz{display:flex;flex-direction:column;gap:8px}
.voz-t{font-weight:700}
.voz p.voz-p{margin:0;font-size:14px;font-weight:400;line-height:1.35;opacity:.85}
.voz select{font:inherit;font-size:15px;padding:6px 8px;border-radius:10px;max-width:100%}
.voz input[type=range]{width:100%;max-width:320px}
.voz-g{display:flex;flex-wrap:wrap;gap:6px}
.voz-b{font:inherit;font-weight:700;border:0;border-radius:12px;padding:8px 14px;cursor:pointer;background:#2e2770;color:#fff;min-width:44px}
.voz-lbl{font-size:.9em;font-weight:600}
.voz-it{display:inline-flex;gap:3px;align-items:stretch}
.voz-it .voz-r{font-size:12px;padding:6px 8px;min-width:0;opacity:.9}
.voz-it .voz-r.voz-tiene{outline:3px solid #3f9a4c;outline-offset:-3px}`;
    document.head.appendChild(s);
  }
  function btn(texto, extra) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = texto;
    b.className = (C.claseBoton || 'voz-b') + (extra ? ' ' + extra : '');
    return b;
  }
  let montados = [];
  function pintar(el) {
    const t = T(), L = lang();
    el.innerHTML = '';
    const caja = document.createElement('div'); caja.className = 'voz';
    if (!C.sinTitulo) { const h = document.createElement('div'); h.className = 'voz-t'; h.textContent = t.titulo; caja.appendChild(h); }
    if (!hayHabla()) { const p = document.createElement('p'); p.className = 'voz-p'; p.textContent = t.sinHabla; caja.appendChild(p); el.appendChild(caja); return; }
    const p = document.createElement('p'); p.className = 'voz-p'; p.textContent = t.ayuda; caja.appendChild(p);
    const vs = voces(L), pr = prefs(), cur = pr[L] || {};
    // voz
    const lv = document.createElement('label'); lv.className = 'voz-lbl'; lv.textContent = t.voz;
    const sel = document.createElement('select');
    sel.innerHTML = `<option value="">${t.auto}</option>` + vs.map(v => `<option value="${v.voiceURI.replace(/"/g, '&quot;')}">${v.name} · ${v.lang}</option>`).join('');
    sel.value = vs.some(v => v.voiceURI === cur.uri) ? cur.uri : '';
    sel.onchange = () => { const q = prefs(); q[L] = Object.assign({}, q[L], {uri: sel.value || null}); guardarPrefs(q); decir(ej()[0] ? ej()[0].d : t.voz); };
    lv.appendChild(document.createElement('br')); lv.appendChild(sel); caja.appendChild(lv);
    if (!vs.length) { const n = document.createElement('p'); n.className = 'voz-p'; n.textContent = L === 'en' ? t.sinVocesEn : t.sinVoces; caja.appendChild(n); }
    // velocidad
    const lr = document.createElement('label'); lr.className = 'voz-lbl';
    const rate = velocidad(L);
    const nombreVel = r => r < .95 ? t.lenta : r > 1.05 ? t.rapida : t.normal;
    lr.textContent = `${t.vel}: `; const vv = document.createElement('span'); vv.textContent = nombreVel(rate); lr.appendChild(vv);
    const rg = document.createElement('input'); rg.type = 'range'; rg.min = '0.7'; rg.max = '1.3'; rg.step = '0.05'; rg.value = String(rate);
    rg.oninput = () => { vv.textContent = nombreVel(+rg.value); };
    rg.onchange = () => { const q = prefs(); q[L] = Object.assign({}, q[L], {rate: +rg.value}); guardarPrefs(q); decir(ej()[0] ? ej()[0].d : ''); };
    lr.appendChild(document.createElement('br')); lr.appendChild(rg); caja.appendChild(lr);
    // ejemplos
    const g = document.createElement('div'); g.className = 'voz-g';
    const conGrabar = C.grabar && puedeGrabar();
    ej().forEach(x => {
      const b = btn(x.t); b.onclick = () => decirUnidad(x.t, x.d);
      if (!conGrabar) { g.appendChild(b); return; }
      const it = document.createElement('span'); it.className = 'voz-it';
      const r = btn(clips[x.t] ? t.miVoz : t.grabar, 'voz-r' + (clips[x.t] ? ' voz-tiene' : ''));
      r.onclick = () => grabar(x.t, r, () => { r.textContent = clips[x.t] ? t.miVoz : t.grabar; r.classList.toggle('voz-tiene', !!clips[x.t]); });
      it.append(b, r); g.appendChild(it);
    });
    caja.appendChild(g);
    if (conGrabar) { const n = document.createElement('p'); n.className = 'voz-p'; n.textContent = t.notaGrabar; caja.appendChild(n); }
    if (C.frase) { const f = btn(t.frase); f.onclick = () => { try { decir(C.frase(L)); } catch (e) {} }; const w = document.createElement('div'); w.appendChild(f); caja.appendChild(w); }
    el.appendChild(caja);
  }
  function ej() { try { return (C.ejemplos && C.ejemplos(lang())) || []; } catch (e) { return []; } }
  function refrescar() { montados = montados.filter(e => e.isConnected); montados.forEach(pintar); }
  if (hayHabla()) { try { speechSynthesis.addEventListener('voiceschanged', () => { if (C) refrescar(); }); } catch (e) {} }

  window.Voz = {
    iniciar(cfg) { C = cfg; estilos(); abrirDB().then(() => refrescar()); return this; },
    montar(el) { if (!C || !el) return; if (!montados.includes(el)) montados.push(el); pintar(el); },
    decirUnidad: (texto, dicho) => C ? decirUnidad(texto, dicho) : Promise.resolve(),
    tieneGrabacion: texto => !!clips[texto],
    exportarGrabaciones: () => C ? exportarGrabaciones() : Promise.resolve({}),
    importarGrabaciones: obj => C ? importarGrabaciones(obj) : Promise.resolve(),
    elegida: L => C ? elegida(L) : null,
    velocidad: L => C ? velocidad(L) : 1,
    version: 2,
  };
})();
