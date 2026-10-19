/* ábaco · cinco formas de navegar el mismo contenido. Cada una: nombre, html(p), iniciar(raiz), sinScroll.
   1 Relato · 2 Recorrido guiado · 3 Mosaico · 4 Historias · 5 Conversación */
(function () {
  'use strict';
  var A = window.Abaco, C = A.C;
  var N = window.NAVEGACIONES = {};

  function cabecera(enlaces, extra) {
    return '<header class="cabecera"><div class="envoltura"><a class="logo" href="#inicio" aria-label="ábaco, inicio">' + A.logo + 'ábaco</a>' + (extra || '') +
      '<nav class="navegacion" aria-label="Principal">' + enlaces.map(function (e) { return '<a href="#' + e[0] + '">' + e[1] + '</a>'; }).join('') + '<a class="boton" href="#lista">Quiero probarlo</a></nav></div></header>';
  }
  function irA(id) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: A.quieto ? 'auto' : 'smooth', block: 'start' });
  }
  function enlacesInternos(raiz) {
    A.escuchar(raiz, 'click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute('href').length < 2) return;
      e.preventDefault();
      irA(a.getAttribute('href').slice(1));
    });
  }
  function cabeceraConBorde() {
    var cab = A.$('.cabecera');
    if (!cab) return;
    A.escuchar(window, 'scroll', function () { cab.classList.toggle('con-sombra', scrollY > 8); }, { passive: true });
  }

  /* ---------- 1 · Relato: una página larga, navegación fija y progreso hecho de cuentas ---------- */
  N[1] = {
    nombre: 'Relato',
    html: function (p) {
      var t = C.titular;
      var secciones = ['inicio', 'problema', 'como', 'mas', 'privacidad', 'quien', 'autor'];
      return cabecera([['como', 'Cómo funciona'], ['mas', 'Ahorro'], ['privacidad', 'Privacidad']], '<div class="progreso" aria-hidden="true">' + secciones.map(function () { return '<i></i>'; }).join('') + '</div>') +
        '<main class="n1">' +
        '<section class="envoltura hero" id="inicio" data-seccion><div class="hero-texto"><span class="etiqueta">' + t.etiqueta + '</span>' + A.titular() + '<p class="entradilla">' + t.entradilla + '</p><div class="acciones"><a class="boton" href="#lista">Apúntate a la lista</a><a class="boton secundario" href="#como">Cómo funciona</a></div><p class="nota-hero">' + t.nota + '</p></div>' + p.html() + '</section>' +
        '<section class="banda" id="problema" data-seccion><div class="envoltura" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr));gap:clamp(2rem,5vw,5rem);align-items:start"><div class="cabeza-seccion" data-revelar><span class="etiqueta">' + C.problema.etiqueta + '</span><h2>' + C.problema.titulo + '</h2><p class="entradilla">' + C.problema.texto + '</p></div><div data-revelar>' + A.preguntas() + '</div></div></section>' +
        '<section class="banda" id="como" data-seccion style="background:var(--fondo-2)"><div class="envoltura"><div class="cabeza-seccion" data-revelar><span class="etiqueta">' + C.como.etiqueta + '</span><h2>' + C.como.titulo + '</h2></div>' + A.pasos() + '</div></section>' +
        '<section class="banda" id="mas" data-seccion><div class="envoltura"><div class="cabeza-seccion" data-revelar><span class="etiqueta">' + C.ahorro.etiqueta + '</span><h2>' + C.ahorro.titulo + '</h2><p class="entradilla">' + C.ahorro.texto + '</p></div>' + A.funciones() + '</div></section>' +
        '<section class="banda" id="privacidad" data-seccion style="background:var(--fondo-2)"><div class="envoltura">' + A.privacidad() + '</div></section>' +
        '<section class="banda" id="quien" data-seccion><div class="envoltura">' + A.paraQuien() + '</div></section>' +
        '<section class="banda" id="autor" data-seccion style="background:var(--fondo-2)"><div class="envoltura">' + A.autor() + '</div></section>' +
        '<section class="banda" id="lista"><div class="envoltura">' + A.cierre() + '</div></section></main>' + A.pie();
    },
    iniciar: function (raiz) {
      enlacesInternos(raiz); cabeceraConBorde();
      if (!A.hayGsap) return;
      var puntos = A.$$('.progreso i', raiz);
      A.$$('[data-seccion]', raiz).forEach(function (s, i) {
        ScrollTrigger.create({ trigger: s, start: 'top 55%', end: 'bottom 55%', onToggle: function (self) {
          if (!self.isActive) return;
          puntos.forEach(function (pt, j) { pt.classList.toggle('lleno', j <= i); });
          A.$$('.navegacion a[href^="#"]', raiz).forEach(function (a) { a.classList.toggle('activo', a.getAttribute('href') === '#' + s.id); });
        } });
      });
    },
  };

  /* ---------- 2 · Recorrido guiado: capítulos y escenario fijo que se transforma ---------- */
  N[2] = {
    nombre: 'Recorrido guiado',
    html: function (p) {
      var t = C.titular;
      var caps = [
        ['El problema', 'Firmas cada trimestre sin saber si cuadra', C.problema.texto],
        ['Tus facturas', 'Deja los PDF en una carpeta', C.como.pasos[0].d],
        ['La herramienta', 'Claude lee, ábaco calcula al céntimo', C.como.pasos[1].d + ' ' + C.herramienta.texto],
        ['La comparación', 'Casilla a casilla con tu gestoría', C.como.pasos[2].d],
        ['El ahorro', 'Lo que nadie te ha contado', 'Tu Renta antes de tiempo, los límites que te pueden costar una deducción y las ayudas que encajan contigo, con su fuente oficial.'],
        ['Tu privacidad', C.privacidad.titulo, C.privacidad.texto],
      ];
      var escenas = [
        '<span class="etiqueta">Modelo 303 · T3 2026</span><p class="grande">¿Cuadra lo que firmas?</p><div class="doc"><span>Resultado a ingresar</span><span class="num">212,40 €</span></div><div class="doc"><span>Firmado por</span><span>tú</span></div><div class="doc"><span>Revisado por</span><span class="chip alerta">nadie</span></div>',
        '<span class="etiqueta">Carpeta · T3 2026</span><div class="abanico"><div class="doc"><span>F-0032 · Cliente SL.pdf</span><span class="num">1.452,00 €</span></div><div class="doc"><span>F-0033 · Estudio Norte.pdf</span><span class="num">968,00 €</span></div><div class="doc"><span>Software · Irlanda.pdf</span><span class="num">83,00 €</span></div><div class="doc"><span>Luz e internet.pdf</span><span class="num">1.196,17 €</span></div></div>',
        p.html(),
        '<span class="etiqueta">Tu gestoría vs. ábaco</span><div class="comparar"><span class="etiqueta">Casilla</span><span class="etiqueta" style="text-align:right">Gestoría</span><span class="etiqueta" style="text-align:right">ábaco</span><span></span><span class="num">27</span><span class="n">437,43</span><span class="n">437,43</span><span class="ok-icono">✓</span><span class="num">45</span><span class="n">225,03</span><span class="n">225,03</span><span class="ok-icono">✓</span><span class="num">71</span><span class="n">212,40</span><span class="n">212,40</span><span class="ok-icono">✓</span></div><div class="doc"><span>Diferencia total</span><strong class="num" style="color:var(--ok)">0,00 €</strong></div>',
        '<span class="etiqueta">Renta 2026 · estimación</span><p class="grande" style="color:var(--rojo)">A pagar ≈ 640 €</p><div class="barra" style="--lleno:98%" aria-hidden="true"><span></span></div><p style="color:var(--tinta-suave);font-size:.9rem">A 450 € del límite de la deducción del alquiler (600 €).</p><div class="doc"><span>Bono Alquiler Joven</span><span class="chip ok">hasta 6.000 €</span></div>',
        '<span class="etiqueta">Privacidad</span><p class="grande">Tus datos no salen de tu ordenador</p>' + C.privacidad.puntos.map(function (x) { return '<div class="doc"><span>' + x + '</span><span class="ok-icono">✓</span></div>'; }).join(''),
      ];
      return cabecera([['recorrido', 'Recorrido'], ['autor', 'Quién lo hace']]) +
        '<main><section class="envoltura" id="inicio" style="padding-block:clamp(3rem,8vw,6rem) 2rem;display:grid;gap:1.4rem;justify-items:start;max-width:62rem"><span class="etiqueta">' + t.etiqueta + '</span>' + A.titular() + '<p class="entradilla" style="max-width:52ch">' + t.entradilla + '</p><div class="acciones"><a class="boton" href="#recorrido">Haz el recorrido</a><a class="boton secundario" href="#lista">Apúntate</a></div><p class="nota-hero">6 pasos · 2 minutos · ' + t.nota + '</p></section>' +
        '<section class="envoltura recorrido" id="recorrido" aria-label="Recorrido en 6 pasos"><div class="capitulos">' +
        caps.map(function (c, i) { return '<article class="capitulo"><span class="num-cap">0' + (i + 1) + ' · ' + c[0] + '</span><h2>' + c[1] + '</h2><p>' + c[2] + '</p></article>'; }).join('') +
        '</div><div class="lado"><ol class="paso-nav" aria-label="Pasos">' + caps.map(function (c, i) { return '<li><button type="button"><b>0' + (i + 1) + '</b><span>' + c[0].replace('Tus ', '').replace('Tu ', '').replace('La ', '').replace('El ', '') + '</span></button></li>'; }).join('') +
        '</ol><div class="escenario" aria-live="polite">' + escenas.map(function (e, i) { return '<div class="escena" data-n="' + i + '">' + e + '</div>'; }).join('') + '</div></div></section>' +
        '<section class="banda" id="autor" style="background:var(--fondo-2)"><div class="envoltura">' + A.autor() + '</div></section>' +
        '<section class="banda" id="lista"><div class="envoltura">' + A.cierre() + '</div></section></main>' + A.pie();
    },
    iniciar: function (raiz) {
      enlacesInternos(raiz); cabeceraConBorde();
      var escenas = A.$$('.escena', raiz), pasos = A.$$('.paso-nav button', raiz), caps = A.$$('.capitulo', raiz), actual = -1;
      function ir(i) {
        if (i === actual) return; actual = i;
        escenas.forEach(function (e, j) { e.classList.toggle('activa', j === i); });
        pasos.forEach(function (b, j) { b.setAttribute('aria-current', j === i ? 'step' : 'false'); b.classList.toggle('hecho', j < i); });
        A.animarEntrada(escenas[i]);
        if (A.hayGsap && !A.quieto) gsap.fromTo(escenas[i].children, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .5, ease: 'power3.out', stagger: .07, overwrite: true });
      }
      pasos.forEach(function (b, i) { A.escuchar(b, 'click', function () { caps[i].scrollIntoView({ behavior: A.quieto ? 'auto' : 'smooth', block: 'center' }); }); });
      var linea = matchMedia('(max-width: 52rem)').matches ? '80%' : '55%';
      if (A.hayGsap) caps.forEach(function (c, i) { ScrollTrigger.create({ trigger: c, start: 'top ' + linea, end: 'bottom ' + linea, onToggle: function (s) { if (s.isActive) ir(i); } }); });
      ir(0);
    },
  };

  /* ---------- 3 · Mosaico: una cuadrícula de tarjetas; cada una se expande a su detalle ---------- */
  N[3] = {
    nombre: 'Mosaico',
    sinScroll: true,
    html: function (p) {
      var t = C.titular;
      var losa = function (id, clase, cuerpo) { return '<button type="button" class="losa ' + clase + '" data-detalle="' + id + '" data-flip-id="' + id + '" data-entra><span class="abrir" aria-hidden="true">+</span>' + cuerpo + '</button>'; };
      return '<header class="cabecera"><div class="envoltura"><a class="logo" href="#" aria-label="ábaco">' + A.logo + 'ábaco</a><nav class="navegacion" aria-label="Principal"><span class="etiqueta">Pulsa una tarjeta</span><a class="boton" href="#" data-abrir="lista">Quiero probarlo</a></nav></div></header>' +
        '<main class="envoltura mosaico" id="inicio">' +
        '<div class="losa titular" data-entra><span class="etiqueta" style="color:inherit;opacity:.75">' + t.etiqueta + '</span>' + A.titular() + '<p>' + t.entradilla + '</p><div class="acciones"><a class="boton secundario" href="#" data-abrir="lista" style="color:inherit;box-shadow:inset 0 0 0 1.5px currentColor">Apúntate a la lista</a></div></div>' +
        '<div class="losa herramienta" data-entra><span class="etiqueta">' + C.herramienta.etiqueta + ' · pruébala</span>' + p.html() + '</div>' +
        losa('problema', '', '<span class="etiqueta">' + C.problema.etiqueta + '</span><h2>¿Sabes si tu gestoría lo hace bien?</h2><p>5 preguntas que deberías poder responder.</p>') +
        losa('como', '', '<span class="etiqueta">' + C.como.etiqueta + '</span><h2>3 pasos</h2><p>Carpeta, cálculo y comparación.</p>') +
        losa('renta', 'ancha', '<span class="etiqueta">Tu Renta, antes de tiempo</span><span class="num-grande">≈ 640 €</span><p>A pagar en junio (ejemplo). A 450 € de perder la deducción del alquiler.</p>') +
        losa('privacidad', '', '<span class="etiqueta">' + C.privacidad.etiqueta + '</span><h2>Nada sale de tu ordenador</h2>') +
        losa('quien', '', '<span class="etiqueta">' + C.paraQuien.etiqueta + '</span><h2>Autónomos en estimación directa</h2>') +
        losa('autor', '', '<span class="etiqueta">' + C.autor.etiqueta + '</span><h2>' + C.autor.titulo + '</h2>') +
        losa('lista', 'cta', '<span class="etiqueta" style="color:inherit;opacity:.7">' + C.lista.etiqueta + '</span><h2>Quiero probarlo</h2><p>Te aviso cuando esté listo.</p>') +
        '</main>' + A.pie() +
        '<template id="t-problema"><span class="etiqueta">' + C.problema.etiqueta + '</span><h2>' + C.problema.titulo + '</h2><p class="entradilla">' + C.problema.texto + '</p>' + A.preguntas() + '</template>' +
        '<template id="t-como"><span class="etiqueta">' + C.como.etiqueta + '</span><h2>' + C.como.titulo + '</h2>' + A.pasos() + '</template>' +
        '<template id="t-renta"><span class="etiqueta">' + C.ahorro.etiqueta + '</span><h2>' + C.ahorro.titulo + '</h2><p class="entradilla">' + C.ahorro.texto + '</p>' + A.funciones() + '</template>' +
        '<template id="t-privacidad">' + A.privacidad() + '</template>' +
        '<template id="t-quien">' + A.paraQuien() + '</template>' +
        '<template id="t-autor">' + A.autor() + '</template>' +
        '<template id="t-lista">' + A.cierre() + '</template>';
    },
    iniciar: function (raiz) {
      cabeceraConBorde();
      if (A.hayGsap && !A.quieto) gsap.from(A.$$('.mosaico [data-entra]', raiz), { y: 30, autoAlpha: 0, duration: .7, ease: 'power3.out', stagger: .06 });
      var abierta = null;
      function abrir(id, desde) {
        if (abierta) return;
        var tpl = document.getElementById('t-' + id);
        if (!tpl) return;
        var fondo = document.createElement('div'); fondo.className = 'detalle-fondo';
        var det = document.createElement('div'); det.className = 'detalle'; det.setAttribute('role', 'dialog'); det.setAttribute('aria-modal', 'true'); det.setAttribute('data-flip-id', id);
        det.innerHTML = '<button class="cerrar" type="button" aria-label="Cerrar">✕</button><div class="detalle-cuerpo"></div>';
        det.querySelector('.detalle-cuerpo').appendChild(tpl.content.cloneNode(true));
        var estado = desde && A.hayGsap && !A.quieto ? Flip.getState(desde) : null;
        document.body.appendChild(fondo); document.body.appendChild(det);
        abierta = { det: det, fondo: fondo, desde: desde };
        if (estado) { Flip.from(estado, { targets: det, duration: .6, ease: 'power3.inOut', absolute: true, scale: true, fade: true }); gsap.from(fondo, { autoAlpha: 0, duration: .4 }); }
        A.temporizador(function () { A.animarEntrada(det); }, A.quieto ? 0 : 450);
        det.querySelector('.cerrar').addEventListener('click', cerrar);
        fondo.addEventListener('click', cerrar);
        A.$$('.copiar', det).forEach(function (b) { b.addEventListener('click', function () { var d = b.parentNode.querySelector('[data-direccion]'); if (navigator.clipboard) navigator.clipboard.writeText(d.textContent).then(function () { b.textContent = 'Copiado ✓'; }); }); });
        det.querySelector('.cerrar').focus();
      }
      function cerrar() {
        if (!abierta) return;
        var a = abierta; abierta = null;
        var fin = function () { a.det.remove(); a.fondo.remove(); if (a.desde) a.desde.focus(); };
        if (A.hayGsap && !A.quieto) { gsap.to(a.det, { autoAlpha: 0, scale: .96, duration: .25, ease: 'power2.in', onComplete: fin }); gsap.to(a.fondo, { autoAlpha: 0, duration: .25 }); } else fin();
      }
      A.al(function () { if (abierta) { abierta.det.remove(); abierta.fondo.remove(); abierta = null; } });
      A.escuchar(raiz, 'click', function (e) {
        var l = e.target.closest('[data-detalle]'); if (l) return abrir(l.dataset.detalle, l);
        var x = e.target.closest('[data-abrir]'); if (x) { e.preventDefault(); abrir(x.dataset.abrir, A.$('[data-detalle="' + x.dataset.abrir + '"]', raiz)); }
      });
      A.escuchar(document, 'keydown', function (e) { if (e.key === 'Escape') cerrar(); });
    },
  };

  /* ---------- 4 · Historias: pantallas completas con barras de progreso, como las stories ---------- */
  N[4] = {
    nombre: 'Historias',
    sinScroll: true,
    html: function (p) {
      var t = C.titular;
      var d = [
        ['', '<span class="etiqueta" data-entra>' + t.etiqueta + '</span><div data-entra>' + A.titular() + '</div><p data-entra>' + t.entradilla + '</p>'],
        ['', '<span class="etiqueta" data-entra>' + C.problema.etiqueta + '</span><h2 data-entra>' + C.problema.titulo + '</h2><div data-entra>' + A.preguntas() + '</div>'],
        ['dos', '<div style="display:grid;gap:1rem"><span class="etiqueta" data-entra>' + C.herramienta.etiqueta + '</span><h2 data-entra>' + C.herramienta.titulo + '</h2><p data-entra>' + C.herramienta.texto + '</p></div><div data-entra>' + p.html() + '</div>'],
        ['', '<span class="etiqueta" data-entra>' + C.como.etiqueta + '</span><h2 data-entra>' + C.como.titulo + '</h2><div data-entra>' + A.pasos() + '</div>'],
        ['', '<span class="etiqueta" data-entra>' + C.ahorro.etiqueta + '</span><h2 data-entra>' + C.ahorro.titulo + '</h2><div data-entra>' + A.funciones() + '</div>'],
        ['', '<div data-entra>' + A.privacidad() + '</div>'],
        ['', '<div data-entra>' + A.autor() + '</div>'],
        ['', '<div data-entra>' + A.cierre() + '</div>'],
      ];
      return '<main class="historias" id="inicio" aria-roledescription="historias">' +
        '<div class="barras" role="tablist" aria-label="Historias">' + d.map(function (_, i) { return '<button type="button" role="tab" aria-label="Historia ' + (i + 1) + ' de ' + d.length + '"><span></span></button>'; }).join('') + '</div>' +
        '<div class="historia-cab"><a class="logo" href="#" aria-label="ábaco">' + A.logo + 'ábaco</a><div class="controles"><button type="button" class="pausa" aria-label="Pausar">❚❚</button><button type="button" class="atras-b" aria-label="Anterior">←</button><button type="button" class="adelante-b" aria-label="Siguiente">→</button></div></div>' +
        '<button class="zona atras" type="button" aria-label="Anterior"></button><button class="zona adelante" type="button" aria-label="Siguiente"></button>' +
        d.map(function (x, i) { return '<section class="diapositiva ' + x[0] + '" aria-label="Historia ' + (i + 1) + '"><div class="contenido-d">' + x[1] + '</div></section>'; }).join('') +
        '<span class="pistas-h">Toca a los lados · ← → · espacio para pausar</span></main>';
    },
    iniciar: function (raiz) {
      document.body.classList.add('con-historias');
      A.al(function () { document.body.classList.remove('con-historias'); });
      var dias = A.$$('.diapositiva', raiz), barras = A.$$('.barras button', raiz), i = -1, pausado = A.quieto, tl = null;
      var DURACION = 9;
      var pausa = A.$('.pausa', raiz);
      function ir(n) {
        n = Math.max(0, Math.min(dias.length - 1, n));
        i = n;
        dias.forEach(function (d, j) { d.classList.toggle('activa', j === n); });
        barras.forEach(function (b, j) { b.classList.toggle('vista', j < n); b.setAttribute('aria-selected', String(j === n)); var s = b.firstChild; if (A.hayGsap) gsap.set(s, { scaleX: j < n ? 1 : 0 }); });
        A.animarEntrada(dias[n]);
        if (tl) tl.kill();
        if (A.hayGsap && !A.quieto) {
          tl = gsap.to(barras[n].firstChild, { scaleX: 1, duration: DURACION, ease: 'none', onComplete: function () { if (n < dias.length - 1) ir(n + 1); } });
          if (pausado) tl.pause();
        }
      }
      function alternar() { pausado = !pausado; pausa.textContent = pausado ? '▶' : '❚❚'; pausa.setAttribute('aria-label', pausado ? 'Reanudar' : 'Pausar'); if (tl) pausado ? tl.pause() : tl.resume(); }
      if (A.quieto) { pausa.textContent = '▶'; }
      A.escuchar(A.$('.zona.atras', raiz), 'click', function () { ir(i - 1); });
      A.escuchar(A.$('.zona.adelante', raiz), 'click', function () { ir(i + 1); });
      A.escuchar(A.$('.atras-b', raiz), 'click', function () { ir(i - 1); });
      A.escuchar(A.$('.adelante-b', raiz), 'click', function () { ir(i + 1); });
      A.escuchar(pausa, 'click', alternar);
      barras.forEach(function (b, j) { A.escuchar(b, 'click', function () { ir(j); }); });
      A.escuchar(document, 'keydown', function (e) {
        if (e.target.closest('input, textarea, .mezclador')) return;
        if (e.key === 'ArrowRight') { ir(i + 1); e.preventDefault(); } else if (e.key === 'ArrowLeft') { ir(i - 1); e.preventDefault(); } else if (e.key === ' ') { alternar(); e.preventDefault(); }
      });
      // Deslizar con el dedo
      var x0 = null;
      A.escuchar(raiz, 'pointerdown', function (e) { x0 = e.clientX; });
      A.escuchar(raiz, 'pointerup', function (e) { if (x0 === null) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 60) ir(i + (dx < 0 ? 1 : -1)); });
      // Al pasar el ratón por el contenido se pausa, como al mantener pulsado en el móvil
      A.$$('.contenido-d', raiz).forEach(function (c) {
        A.escuchar(c, 'mouseenter', function () { if (tl && !pausado) tl.pause(); });
        A.escuchar(c, 'mouseleave', function () { if (tl && !pausado) tl.resume(); });
      });
      A.al(function () { if (tl) tl.kill(); });
      ir(0);
    },
  };

  /* ---------- 5 · Conversación: la navegación son preguntas; Ctrl+K para buscar ---------- */
  N[5] = {
    nombre: 'Conversación',
    sinScroll: true,
    html: function (p) {
      var temas = [
        ['gestoria', '¿Lo hace bien mi gestoría?', '<h2>Lo comprobamos casilla a casilla</h2><p>' + C.como.pasos[1].d + ' ' + C.herramienta.texto + '</p>' + p.html() + '<p>' + C.como.pasos[2].d + '</p>'],
        ['renta', '¿Cuánto me saldrá la Renta?', '<h2>Te lo digo meses antes</h2>' + A.funcion(C.ahorro.funciones[0]) + A.funcion(C.ahorro.funciones[1]) + '<p>Si te pasas 450 € de base imponible, pierdes los 600 € de deducción.</p>'],
        ['ayudas', '¿Hay ayudas para mí?', '<h2>Cruzo tu perfil con las ayudas vigentes</h2>' + A.funcion(C.ahorro.funciones[2])],
        ['plazos', '¿Qué vence y quién se encarga?', '<h2>Un panel que se actualiza solo</h2>' + A.funcion(C.ahorro.funciones[3])],
        ['como', '¿Cómo funciona?', '<h2>' + C.como.titulo + '</h2>' + A.pasos()],
        ['privacidad', '¿Dónde van mis datos?', A.privacidad()],
        ['quien', '¿Quién está detrás?', A.autor('h3')],
        ['probar', 'Quiero probarlo', A.cierre()],
      ];
      return '<header class="cabecera"><div class="envoltura"><a class="logo" href="#" aria-label="ábaco">' + A.logo + 'ábaco</a><nav class="navegacion" aria-label="Principal" style="gap:.8rem"><button class="chips-k boton secundario" type="button" data-paleta>Buscar un tema · Ctrl K</button></nav></div></header>' +
        '<main class="conversa"><div class="saludo"><span class="etiqueta">' + C.titular.etiqueta + '</span><h1 data-partir>Pregúntale a <span class="marca-texto">ábaco.</span></h1><p class="entradilla">' + C.titular.entradilla + ' ¿Por dónde empezamos?</p><div class="chips" data-chips-inicio></div></div><div class="hilo" aria-live="polite"></div>' +
        '<div class="almacen">' + temas.map(function (x) { return '<section class="respuesta" data-tema="' + x[0] + '" data-pregunta="' + x[1] + '">' + x[2] + '</section>'; }).join('') + '</div></main>' + A.pie() +
        '<dialog class="paleta" aria-label="Buscar un tema" style="border:1px solid var(--linea);border-radius:var(--radio-grande);background:var(--tarjeta);color:var(--tinta);padding:0;width:min(34rem,calc(100vw - 2rem));margin-top:14vh"><input type="text" placeholder="¿Qué quieres saber?" aria-label="Buscar un tema" style="width:100%;border:0;border-bottom:1px solid var(--linea);background:transparent;color:var(--tinta);font:500 1.05rem var(--texto);padding:1rem 1.2rem;outline:none"><ul role="listbox" style="list-style:none;margin:0;padding:.4rem;max-height:50vh;overflow:auto"></ul></dialog>';
    },
    iniciar: function (raiz) {
      cabeceraConBorde();
      var respuestas = A.$$('.almacen > .respuesta', raiz), hilo = A.$('.hilo', raiz), vistos = {};
      var temas = respuestas.map(function (r) { return { id: r.dataset.tema, pregunta: r.dataset.pregunta, nodo: r }; });
      var avatar = '<svg viewBox="0 0 32 32"><path d="M6 11h20M6 21h20" stroke="var(--sobre-marca)" stroke-opacity=".6" stroke-width="1.5"/><circle cx="12" cy="11" r="3.6" fill="var(--cuenta)"/><circle cx="20" cy="21" r="3.6" fill="var(--cuenta-2)"/></svg>';
      function chips(c, excluir) {
        c.innerHTML = '';
        temas.forEach(function (t) {
          if (excluir && (vistos[t.id] || t.id === excluir)) return;
          var b = document.createElement('button'); b.type = 'button'; b.textContent = t.pregunta;
          if (t.id === 'probar') b.className = 'principal';
          if (vistos[t.id]) b.classList.add('vista');
          b.addEventListener('click', function () { preguntar(t.id); });
          c.appendChild(b);
        });
      }
      var inicio = A.$('[data-chips-inicio]', raiz);
      function preguntar(id) {
        var t = temas.filter(function (x) { return x.id === id; })[0]; if (!t) return;
        if (vistos[id]) { t.nodo.scrollIntoView({ behavior: A.quieto ? 'auto' : 'smooth', block: 'start' }); return; }
        vistos[id] = true; chips(inicio);
        var turno = document.createElement('div'); turno.className = 'turno';
        turno.innerHTML = '<div class="burbuja-tu"></div><div class="burbuja-abaco"><div class="avatar">' + avatar + '</div><div class="escribiendo" aria-label="ábaco está escribiendo"><i></i><i></i><i></i></div></div>';
        turno.querySelector('.burbuja-tu').textContent = t.pregunta;
        hilo.appendChild(turno);
        turno.scrollIntoView({ behavior: A.quieto ? 'auto' : 'smooth', block: 'start' });
        A.temporizador(function () {
          var fila = turno.querySelector('.burbuja-abaco');
          fila.replaceChild(t.nodo, fila.querySelector('.escribiendo'));
          A.$$('*', t.nodo).forEach(function (x) { if (x.matches('h2, h3, p, .presentacion, .tarjeta, .ejemplo, .preguntas, ol, .privacidad, .autor, .cierre')) x.setAttribute('data-entra', ''); });
          A.animarEntrada(t.nodo);
          var sigue = document.createElement('div'); sigue.className = 'sigue';
          var c = document.createElement('div'); c.className = 'chips'; chips(c, id);
          if (c.children.length) { sigue.innerHTML = '<span class="etiqueta">También te puede interesar</span>'; sigue.appendChild(c); turno.appendChild(sigue); }
        }, A.quieto ? 0 : 750);
      }
      chips(inicio);
      // Paleta Ctrl+K
      var dlg = A.$('dialog.paleta', raiz), input = dlg.querySelector('input'), lista = dlg.querySelector('ul'), sel = 0, filtrados = [];
      var norm = function (s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
      function pintar() {
        var q = norm(input.value.trim());
        filtrados = temas.filter(function (t) { return !q || norm(t.pregunta + ' ' + t.id).indexOf(q) >= 0; });
        sel = Math.min(sel, Math.max(0, filtrados.length - 1));
        lista.innerHTML = '';
        filtrados.forEach(function (t, j) {
          var li = document.createElement('li'), b = document.createElement('button');
          b.type = 'button'; b.setAttribute('role', 'option'); b.setAttribute('aria-selected', String(j === sel));
          b.style.cssText = 'width:100%;text-align:left;border:0;background:' + (j === sel ? 'var(--fondo)' : 'transparent') + ';color:var(--tinta);font:500 1rem var(--texto);padding:.65rem .8rem;border-radius:10px;cursor:pointer';
          b.textContent = t.pregunta + (vistos[t.id] ? '  ·  ya respondida' : '');
          b.addEventListener('click', function () { dlg.close(); preguntar(t.id); });
          li.appendChild(b); lista.appendChild(li);
        });
      }
      function abrir() { input.value = ''; sel = 0; pintar(); dlg.showModal(); input.focus(); }
      A.al(function () { if (dlg.open) dlg.close(); });
      A.escuchar(A.$('[data-paleta]', raiz), 'click', abrir);
      A.escuchar(document, 'keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dlg.open ? dlg.close() : abrir(); } });
      A.escuchar(input, 'input', function () { sel = 0; pintar(); });
      A.escuchar(input, 'keydown', function (e) {
        if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, filtrados.length - 1); pintar(); e.preventDefault(); }
        else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); pintar(); e.preventDefault(); }
        else if (e.key === 'Enter' && filtrados[sel]) { var id = filtrados[sel].id; dlg.close(); preguntar(id); }
      });
    },
  };
})();
