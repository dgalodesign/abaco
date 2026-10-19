/* ábaco · utilidades comunes del mezclador: piezas de HTML, el ábaco jugable, revelados, contadores y confeti.
   Cada render registra lo que crea para poder deshacerlo al cambiar de combinación. */
(function () {
  'use strict';
  var C = window.CONTENIDO;
  var quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hayGsap = typeof window.gsap !== 'undefined';
  if (hayGsap) gsap.registerPlugin(ScrollTrigger, SplitText, Flip);
  var eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  var eur0 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  var limpiezas = [];
  var recolocadores = [];

  var A = window.Abaco = {
    C: C, quieto: quieto, hayGsap: hayGsap, eur: eur, eur0: eur0,
    al: function (fn) { limpiezas.push(fn); },
    /** Deshace todo lo del render anterior: ScrollTriggers, oyentes, temporizadores */
    limpiar: function () {
      limpiezas.splice(0).forEach(function (fn) { try { fn(); } catch (e) { /* ya no existe */ } });
      recolocadores.length = 0;
      if (hayGsap) { ScrollTrigger.getAll().forEach(function (t) { t.kill(); }); gsap.globalTimeline.clear(); }
    },
    escuchar: function (el, ev, fn, op) { el.addEventListener(ev, fn, op); limpiezas.push(function () { el.removeEventListener(ev, fn, op); }); },
    temporizador: function (fn, ms) { var id = setTimeout(fn, ms); limpiezas.push(function () { clearTimeout(id); }); return id; },
    recolocar: function () { recolocadores.forEach(function (fn) { fn(); }); },
    $: function (s, c) { return (c || document).querySelector(s); },
    $$: function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); },
    color: function (v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); },
  };

  /* ---------- Piezas de HTML reutilizables ---------- */
  A.logo = '<svg class="logo-svg" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--marca)"/><path d="M6 11h20M6 21h20" stroke="var(--sobre-marca)" stroke-opacity=".55" stroke-width="1.5"/><circle cx="12" cy="11" r="3.6" fill="var(--cuenta)"/><circle cx="20" cy="21" r="3.6" fill="var(--cuenta-2)"/></svg>';
  A.marcaAutor = '<svg viewBox="0 0 120 120" aria-hidden="true" style="max-width:13rem"><rect width="120" height="120" rx="24" fill="var(--marca-suave)"/><path d="M18 40h84M18 60h84M18 80h84" stroke="var(--varilla)" stroke-width="2"/><circle cx="36" cy="40" r="8" fill="var(--cuenta)"/><circle cx="54" cy="40" r="8" fill="var(--cuenta)"/><circle cx="74" cy="60" r="8" fill="var(--cuenta-2)"/><circle cx="46" cy="80" r="8" fill="var(--cuenta-4)"/><circle cx="64" cy="80" r="8" fill="var(--cuenta-4)"/><circle cx="82" cy="80" r="8" fill="var(--cuenta-4)"/></svg>';
  A.titular = function (tag) { tag = tag || 'h1'; return '<' + tag + ' data-partir>' + C.titular.antes + '<span class="marca-texto">' + C.titular.marca + '</span></' + tag + '>'; };
  A.botonLista = function (texto) { return '<a class="boton" href="mailto:' + C.lista.email + '?subject=Quiero%20probar%20%C3%A1baco">' + (texto || 'Quiero probar ábaco') + '</a>'; };
  A.preguntas = function () {
    return '<ul class="preguntas">' + C.problema.preguntas.map(function (p, i) {
      return '<li><span class="casilla"><span>0' + (i + 1) + '</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-9"/></svg></span><span>' + p + '</span></li>';
    }).join('') + '</ul>';
  };
  A.pasos = function () {
    return '<ol style="list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr));gap:1.1rem">' + C.como.pasos.map(function (p, i) {
      return '<li class="tarjeta funcion" data-revelar><span class="chip">Paso ' + (i + 1) + '</span><h3>' + p.t + '</h3><p>' + p.d + '</p></li>';
    }).join('') + '</ol>';
  };
  A.funcion = function (f) {
    return '<article class="tarjeta funcion" data-revelar><h3>' + f.t + '</h3><p>' + f.d + '</p><div class="ejemplo">' + f.filas.map(function (r) {
      var v = r[2] === 'ok' ? '<span class="chip ok">' + r[1] + '</span>' : r[2] === 'alerta' ? '<span class="chip alerta">' + r[1] + '</span>' : r[2] === 'chip' ? '<span class="chip">' + r[1] + '</span>' : '<span class="num">' + r[1] + '</span>';
      return '<div class="linea-ej"><span>' + r[0] + '</span>' + v + '</div>';
    }).join('') + (f.barra ? '<div class="barra" aria-hidden="true"><span></span></div>' : '') + '</div></article>';
  };
  A.funciones = function () { return '<div class="funciones">' + C.ahorro.funciones.map(A.funcion).join('') + '</div>'; };
  A.privacidad = function () {
    var p = C.privacidad;
    return '<div class="privacidad" data-revelar><div style="display:grid;gap:1rem"><span class="etiqueta" style="color:inherit;opacity:.7">' + p.etiqueta + '</span><h2>' + p.titulo + '</h2><p>' + p.texto + '</p></div><ul>' + p.puntos.map(function (x) { return '<li><span>' + x + '</span></li>'; }).join('') + '</ul></div>';
  };
  A.paraQuien = function () {
    var q = C.paraQuien, r = C.rumbo;
    return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr));gap:clamp(2rem,5vw,4rem)">' +
      '<div data-revelar><span class="etiqueta">' + q.etiqueta + '</span><h2 style="margin-top:1rem">' + q.titulo + '</h2><ul class="lista">' + q.si.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul><ul class="lista no">' + q.no.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>' +
      '<div data-revelar><span class="etiqueta">' + r.etiqueta + '</span><h2 style="margin-top:1rem">' + r.titulo + '</h2><ul class="lista">' + r.pasos.map(function (x) { return '<li><b>' + x[0] + '.</b> ' + x[1] + '</li>'; }).join('') + '</ul></div></div>';
  };
  A.autor = function (tag) {
    var a = C.autor;
    return '<div class="autor" data-revelar>' + A.marcaAutor + '<div class="autor-texto"><span class="etiqueta">' + a.etiqueta + '</span><' + (tag || 'h2') + '>' + a.titulo + '</' + (tag || 'h2') + '>' + a.parrafos.map(function (p) { return '<p>' + p + '</p>'; }).join('') + '<p><a href="' + a.enlace + '">Mi portfolio</a></p></div></div>';
  };
  A.cierre = function () {
    var l = C.lista;
    return '<div class="cierre" data-revelar><span class="etiqueta">' + l.etiqueta + '</span><h2>' + l.titulo + '</h2><p class="entradilla">' + l.texto + '</p>' + A.botonLista() +
      '<p class="correo">Solo uso tu email para responderte y avisarte. <a href="' + l.privacidad + '">Cómo trato tus datos</a>.</p>' +
      '<p class="correo">O escribe a <code data-direccion>' + l.email + '</code> <button class="copiar" type="button">Copiar</button></p></div>';
  };
  A.pie = function () { return '<div class="envoltura"><footer><p>' + C.pie + '</p><p>Un proyecto de <a href="https://dgalodesign.com">D Galo Design</a> · <a href="' + C.lista.privacidad + '">Privacidad</a></p></footer></div>'; };

  /* ---------- Confeti de cuentas ---------- */
  A.celebrar = function (origen) {
    if (quieto || typeof window.confetti !== 'function') return;
    var r = origen.getBoundingClientRect();
    if (!r.width) return;
    window.confetti({ particleCount: 70, spread: 75, startVelocity: 34, gravity: 1.1, scalar: 1.15, ticks: 160, shapes: ['circle'], colors: [A.color('--cuenta'), A.color('--cuenta-2'), A.color('--cuenta-3'), A.color('--cuenta-4')], origin: { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height * 0.3) / innerHeight }, disableForReducedMotion: true });
  };

  /* ---------- El ábaco jugable ---------- */
  A.iniciarAbaco = function (abaco) {
    var filas = A.$$('.fila', abaco), estado = [], total = A.$('[data-total]', abaco), avisado = false;
    filas.forEach(function (fila, f) {
      var varilla = A.$('.varilla', fila);
      var n = +varilla.dataset.cuentas, objetivo = +varilla.dataset.objetivo, valor = +varilla.dataset.valor || 10;
      varilla.innerHTML = '';
      var cuentas = [];
      for (var i = 0; i < n; i++) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'cuenta';
        b.setAttribute('aria-label', 'Cuenta ' + (i + 1) + ' de ' + n + ' en la varilla del modelo ' + A.$('.modelo', fila).firstChild.textContent.trim());
        varilla.appendChild(b); cuentas.push(b);
      }
      var visible = abaco.offsetWidth > 0;
      var inicio = quieto || !visible ? objetivo : Math.max(0, Math.min(n, objetivo + (f % 2 ? -2 : 2)));
      estado[f] = { varilla: varilla, cuentas: cuentas, n: n, objetivo: objetivo, valor: valor, izquierda: inicio, resultado: A.$('.resultado', fila) };
      cuentas.forEach(function (b, i) {
        b.addEventListener('click', function () { var e = estado[f]; e.izquierda = i < e.izquierda ? i : i + 1; colocar(f, true); comprobar(true); });
      });
    });
    function x(f, i) { var e = estado[f], ancho = e.varilla.clientWidth, w = Math.min(e.cuentas[0].offsetWidth + 3, ancho / e.n); return i < e.izquierda ? i * w : ancho - (e.n - i) * w; }
    function colocar(f, animar) {
      estado[f].cuentas.forEach(function (b, i) {
        if (hayGsap && animar && !quieto) gsap.to(b, { x: x(f, i), duration: .55, ease: 'back.out(2.2)', overwrite: true });
        else if (hayGsap) { gsap.killTweensOf(b); gsap.set(b, { x: x(f, i) }); } else b.style.transform = 'translateX(' + x(f, i) + 'px)';
      });
    }
    function comprobar(porUsuario) {
      var suma = 0;
      estado.forEach(function (e) {
        var dif = (e.izquierda - e.objetivo) * e.valor; suma += Math.abs(dif);
        e.resultado.textContent = dif === 0 ? '0,00 €' : (dif > 0 ? '+' : '−') + eur.format(Math.abs(dif));
        e.resultado.classList.toggle('descuadre', dif !== 0);
      });
      if (total) { total.textContent = eur.format(suma); total.style.color = suma ? 'var(--alerta)' : ''; }
      if (suma === 0 && porUsuario && !avisado) { A.celebrar(abaco); avisado = true; }
      if (suma !== 0) avisado = false;
    }
    function recolocar() { if (!abaco.offsetWidth) return; filas.forEach(function (_, f) { colocar(f, false); }); }
    recolocadores.push(recolocar);
    filas.forEach(function (_, f) { colocar(f, false); });
    comprobar(false);
    if (!quieto && hayGsap && abaco.offsetWidth) {
      var t = gsap.timeline({ delay: .5 });
      estado.forEach(function (e, f) { t.add(function () { e.izquierda = e.objetivo; colocar(f, true); comprobar(false); }, f * .45); });
      t.add(function () { A.celebrar(abaco); }, estado.length * .45 + .3);
    }
  };

  /* ---------- Lo que se activa en cada render ---------- */
  A.activar = function (raiz, opciones) {
    opciones = opciones || {};
    // Titulares palabra a palabra
    if (hayGsap && !quieto) A.$$('[data-partir]', raiz).forEach(function (h) {
      if (!h.offsetWidth) return;
      var s = SplitText.create(h, { type: 'words', mask: 'words' });
      gsap.from(s.words, { yPercent: 110, duration: .9, ease: 'power3.out', stagger: .06, delay: .1 });
      A.al(function () { s.revert(); });
    });
    // Copiar el correo
    A.$$('.copiar', raiz).forEach(function (b) {
      A.escuchar(b, 'click', function () {
        var d = b.parentNode.querySelector('[data-direccion]');
        var listo = function () { b.textContent = 'Copiado ✓'; b.classList.add('hecho'); if (hayGsap && !quieto) gsap.fromTo(b, { scale: .9 }, { scale: 1, duration: .45, ease: 'back.out(3)' }); A.temporizador(function () { b.textContent = 'Copiar'; b.classList.remove('hecho'); }, 1800); };
        var sel = function () { getSelection().selectAllChildren(d); };
        if (navigator.clipboard) navigator.clipboard.writeText(d.textContent).then(listo, sel); else sel();
      });
    });
    if (!hayGsap || quieto || opciones.sinScroll) {
      A.$$('.preguntas li', raiz).forEach(function (li) { li.classList.add('marcada'); });
      return;
    }
    ScrollTrigger.batch(A.$$('[data-revelar]', raiz), { start: 'top 90%', once: true, onEnter: function (els) { gsap.fromTo(els, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .8, ease: 'power3.out', stagger: .09, overwrite: true }); } });
    A.$$('.preguntas', raiz).forEach(function (lista) {
      ScrollTrigger.create({ trigger: lista, start: 'top 80%', once: true, onEnter: function () { A.$$('li', lista).forEach(function (li, i) { A.temporizador(function () { li.classList.add('marcada'); }, 250 + i * 240); }); } });
    });
    A.$$('.barra span', raiz).forEach(function (b) { gsap.fromTo(b, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'power2.out', scrollTrigger: { trigger: b, start: 'top 95%', once: true } }); });
  };

  /* Para vistas que aparecen sin scroll (historias, mosaico, conversación) */
  A.animarEntrada = function (el) {
    A.recolocar();
    A.$$('.presentacion', el).forEach(function (p) { if (p.__intentar) setTimeout(p.__intentar, 60); });
    if (!hayGsap || quieto) { A.$$('.preguntas li', el).forEach(function (li) { li.classList.add('marcada'); }); return; }
    gsap.fromTo(el.querySelectorAll('[data-entra]'), { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .6, ease: 'power3.out', stagger: .08, overwrite: true });
    A.$$('.barra span', el).forEach(function (b) { gsap.fromTo(b, { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'power2.out', delay: .2 }); });
    A.$$('.preguntas li', el).forEach(function (li, i) { li.classList.remove('marcada'); A.temporizador(function () { li.classList.add('marcada'); }, 300 + i * 200); });
  };
})();
