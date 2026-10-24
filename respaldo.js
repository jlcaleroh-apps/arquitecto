/* respaldo.js · Componente común de las apps de jlcaleroh-apps
   (Trazos de Arquitecto, Números, Mi Rutina, Robot Sílabo y las que vengan).

   Qué hace
   - Guarda en un archivo el progreso de TODOS los niños de la app (Archivos, AirDrop, correo…).
   - Restaura ese archivo en el mismo iPad o en otro.
   - Muestra la fecha del último respaldo y avisa si pasaron más de 2 semanas.
   - Pide al navegador que no borre los datos de la app (storage.persist).

   Cómo se usa (igual en todas las apps; copia este archivo SIN cambios)
     <script src="respaldo.js"></script>          ← antes del script de la app
     Respaldo.iniciar({
       app: 'silabas',                            // id corto y único de la app
       nombre: 'Robot Sílabo',                    // nombre visible
       clave: k => k === 'robotSilabo.v2',        // qué claves de localStorage son de esta app
       idioma: () => 'es',                        // 'es' o 'en'
       antes: () => save(),                       // opcional: guardar lo pendiente antes de exportar
       claseBoton: 's-btn',                       // opcional: clase de botón de la app
       extra: { guardar: async () => obj, restaurar: async obj => {} },  // opcional: datos fuera de localStorage
       convertir: d => datos | null,              // opcional: leer respaldos con formato anterior
       renombrar: k => k,                         // opcional: nombre nuevo de una clave guardada en respaldos viejos
       ultimoAntiguo: () => ms                    // opcional: fecha de un respaldo hecho con el sistema anterior
     });
     Respaldo.montar(elemento);                   // dibuja el bloque dentro del panel del adulto

   Importante: todas las apps viven en el mismo dominio (jlcaleroh-apps.github.io) y comparten
   localStorage, por eso cada app declara con `clave` cuáles son sus claves. */
(function () {
  'use strict';
  const FORMATO = 'jlcaleroh-apps-respaldo', VERSION = 1, DIAS_AVISO = 14;
  const TXT = {
    es: {
      titulo: 'Respaldo del progreso',
      nunca: 'Aún no hay respaldo. Guarda uno para no perder el progreso si se borran los datos de Safari o cambias de iPad.',
      ultimo: d => `Último respaldo: ${d}.`,
      viejo: ' Ya pasaron más de 2 semanas: guarda uno nuevo.',
      guardar: 'Guardar respaldo', restaurar: 'Restaurar respaldo',
      guardado: 'Respaldo guardado.',
      malo: n => `Este archivo no es un respaldo de ${n}.`,
      ilegible: 'No se pudo leer el archivo.',
      pregunta: (n, f, k) => `¿Restaurar el respaldo de ${n} del ${f}${k ? ` (${k})` : ''}? Reemplaza el progreso actual de esta app en este dispositivo.`,
      si: 'Restaurar', no: 'Cancelar', ok: 'Listo, respaldo restaurado.', cerrar: 'Entendido',
      ninos: n => n === 1 ? '1 niño' : `${n} niños`,
    },
    en: {
      titulo: 'Progress backup',
      nunca: 'No backup yet. Save one so progress is not lost if Safari data is erased or you change iPads.',
      ultimo: d => `Last backup: ${d}.`,
      viejo: ' More than 2 weeks ago: save a new one.',
      guardar: 'Save backup', restaurar: 'Restore backup',
      guardado: 'Backup saved.',
      malo: n => `This file is not a ${n} backup.`,
      ilegible: 'The file could not be read.',
      pregunta: (n, f, k) => `Restore the ${n} backup from ${f}${k ? ` (${k})` : ''}? It replaces this app's current progress on this device.`,
      si: 'Restore', no: 'Cancel', ok: 'Done, backup restored.', cerrar: 'OK',
      ninos: n => n === 1 ? '1 child' : `${n} children`,
    },
  };
  let C = null;
  const lang = () => { try { return (C && C.idioma && C.idioma()) === 'en' ? 'en' : 'es'; } catch (e) { return 'es'; } };
  const T = () => TXT[lang()];
  const marca = () => 'respaldo:' + C.app;

  function persistir() { try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {} }

  function estilos() {
    if (document.getElementById('rsp-css')) return;
    const s = document.createElement('style'); s.id = 'rsp-css';
    s.textContent = `.rsp{display:flex;flex-direction:column;gap:6px}
.rsp-t{font-weight:700}
.rsp p.rsp-info{margin:0;font-size:14px;font-weight:400;line-height:1.35;opacity:.85}
.rsp p.rsp-info.rsp-old{opacity:1;font-weight:600}
.rsp-fila{display:flex;flex-wrap:wrap;gap:8px}
.rsp-fondo{position:fixed;inset:0;z-index:2147483000;background:rgba(10,10,30,.55);display:flex;align-items:center;justify-content:center;padding:20px}
.rsp-caja{background:#fffaf0;color:#1d1b3a;border-radius:20px;padding:20px;max-width:440px;width:100%;font:16px/1.4 system-ui,-apple-system,sans-serif;box-shadow:0 20px 50px rgba(0,0,0,.35)}
.rsp-caja p{margin:0 0 14px}
.rsp-caja .rsp-fila{justify-content:flex-end}
.rsp-b{font:inherit;font-weight:600;border:0;border-radius:12px;padding:10px 16px;cursor:pointer;background:#2e2770;color:#fff}
.rsp-b.rsp-sec{background:#ece5d3;color:#1d1b3a}`;
    document.head.appendChild(s);
  }
  function boton(texto, sec) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = texto;
    b.className = C.claseBoton ? C.claseBoton : ('rsp-b' + (sec ? ' rsp-sec' : ''));
    return b;
  }
  // Diálogo propio (no alert/confirm): se ve igual en todas las apps y funciona dentro de vistas incrustadas.
  function dialogo(texto, si, no) {
    return new Promise(res => {
      estilos();
      const f = document.createElement('div'); f.className = 'rsp-fondo';
      f.innerHTML = '<div class="rsp-caja" role="dialog" aria-modal="true"><p></p><div class="rsp-fila"></div></div>';
      f.querySelector('p').textContent = texto;
      const fila = f.querySelector('.rsp-fila');
      const fin = v => { f.remove(); res(v); };
      if (no) { const b = document.createElement('button'); b.type = 'button'; b.className = 'rsp-b rsp-sec'; b.textContent = no; b.onclick = () => fin(false); fila.appendChild(b); }
      const b = document.createElement('button'); b.type = 'button'; b.className = 'rsp-b'; b.textContent = si; b.onclick = () => fin(true); fila.appendChild(b);
      document.body.appendChild(f); setTimeout(() => { try { b.focus(); } catch (e) {} }, 30);
    });
  }

  function clavesApp() {
    const out = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k !== marca() && C.clave(k)) out.push(k); } } catch (e) {}
    return out;
  }
  function ultimo() {
    let t = 0;
    try { t = +localStorage.getItem(marca()) || 0; } catch (e) {}
    if (!t && C.ultimoAntiguo) { try { t = +C.ultimoAntiguo() || 0; } catch (e) {} }
    return t;
  }
  function fechaTexto(ms, larga) {
    return new Date(ms).toLocaleDateString(lang() === 'en' ? 'en-US' : 'es', larga ? {day: 'numeric', month: 'long', year: 'numeric'} : {day: 'numeric', month: 'long'});
  }

  async function guardar() {
    try { C.antes && C.antes(); } catch (e) {}
    const datos = {};
    clavesApp().forEach(k => { try { datos[k] = localStorage.getItem(k); } catch (e) {} });
    let extra = null;
    if (C.extra && C.extra.guardar) { try { extra = await C.extra.guardar(); } catch (e) { extra = null; } }
    const ninos = C.contarNinos ? (() => { try { return C.contarNinos(); } catch (e) { return null; } })() : null;
    const obj = {formato: FORMATO, version: VERSION, app: C.app, nombre: C.nombre, fecha: new Date().toISOString(), ninos, datos, extra};
    const nombreArchivo = `respaldo-${C.app}-${new Date().toLocaleDateString('sv')}.json`;
    const blob = new Blob([JSON.stringify(obj)], {type: 'application/json'});
    let hecho = false;
    try {
      const file = new File([blob], nombreArchivo, {type: 'application/json'});
      if (navigator.canShare && navigator.canShare({files: [file]})) { await navigator.share({files: [file], title: nombreArchivo}); hecho = true; }
    } catch (e) { if (e && e.name === 'AbortError') return false; }
    if (!hecho) {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombreArchivo;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    }
    try { localStorage.setItem(marca(), String(Date.now())); } catch (e) {}
    refrescar();
    return true;
  }

  function leer(file) {
    return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsText(file); });
  }
  async function restaurarArchivo(file) {
    const txt = await leer(file);
    let d = null; try { d = JSON.parse(txt); } catch (e) {}
    if (!d) { await dialogo(T().ilegible, T().cerrar); return; }
    let datos = null, extra = null, fecha = d.fecha || d.date || null, ninos = d.ninos || null;
    if (d.formato === FORMATO && d.app === C.app && d.datos && typeof d.datos === 'object') { datos = d.datos; extra = d.extra || null; }
    else if (C.convertir) { try { const r = C.convertir(d); if (r) { datos = r.datos || r; ninos = r.ninos || ninos; } } catch (e) { datos = null; } }
    if (!datos) { await dialogo(T().malo(C.nombre), T().cerrar); return; }
    if (C.renombrar) { const r = {}; Object.keys(datos).forEach(k => { let n = k; try { n = C.renombrar(k); } catch (e) {} r[n] = datos[k]; }); datos = r; }
    const f = fecha ? fechaTexto(Date.parse(fecha), true) : '?';
    if (!(await dialogo(T().pregunta(C.nombre, f, ninos ? T().ninos(ninos) : ''), T().si, T().no))) return;
    try {
      clavesApp().forEach(k => localStorage.removeItem(k));
      Object.keys(datos).forEach(k => { if (C.clave(k) && typeof datos[k] === 'string') localStorage.setItem(k, datos[k]); });
    } catch (e) {}
    if (extra && C.extra && C.extra.restaurar) { try { await C.extra.restaurar(extra); } catch (e) {} }
    await dialogo(T().ok, T().cerrar);
    location.reload();
  }

  let montados = [];
  function refrescar() { montados = montados.filter(el => el.isConnected); montados.forEach(pintar); }
  function pintar(el) {
    const t = T(), u = ultimo(), viejo = u && (Date.now() - u > DIAS_AVISO * 864e5);
    el.innerHTML = '';
    const caja = document.createElement('div'); caja.className = 'rsp';
    if (!C.sinTitulo) { const h = document.createElement('div'); h.className = 'rsp-t'; h.textContent = t.titulo; caja.appendChild(h); }
    const p = document.createElement('p'); p.className = 'rsp-info' + (viejo || !u ? ' rsp-old' : '');
    p.textContent = !u ? t.nunca : t.ultimo(fechaTexto(u)) + (viejo ? t.viejo : '');
    caja.appendChild(p);
    const fila = document.createElement('div'); fila.className = 'rsp-fila';
    const bG = boton(t.guardar), bR = boton(t.restaurar, true);
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json'; inp.hidden = true;
    bG.onclick = () => guardar();
    bR.onclick = () => { inp.value = ''; inp.click(); };
    inp.onchange = () => { const f = inp.files && inp.files[0]; if (f) restaurarArchivo(f); };
    fila.append(bG, bR, inp); caja.appendChild(fila); el.appendChild(caja);
  }

  window.Respaldo = {
    iniciar(cfg) { C = cfg; estilos(); persistir(); return this; },
    montar(el) { if (!C || !el) return; if (!montados.includes(el)) montados.push(el); pintar(el); },
    guardar: () => C && guardar(),
    ultimo: () => C ? ultimo() : 0,
    version: VERSION,
  };
})();
