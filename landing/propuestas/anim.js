/* ábaco · animaciones y microinteracciones de las propuestas.
   Librerías (gratuitas): GSAP 3.13 + ScrollTrigger + SplitText, canvas-confetti 1.9.3.
   Con «reducir movimiento» activado no se anima nada: todo aparece en su sitio final. */
(function () {
  'use strict';
  var raiz = document.documentElement;
  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hayGsap = typeof window.gsap !== 'undefined';
  if (hayGsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  if (hayGsap && window.SplitText) gsap.registerPlugin(SplitText);
  var eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  var eur0 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var guardar = function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };
  var leer = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var color = function (v) { return getComputedStyle(raiz).getPropertyValue(v).trim(); };

  /* ---------- Selector de propuesta visual ---------- */
  function ponerTema(t) {
    raiz.setAttribute('data-tema', t);
    $$('.selector [data-elegir]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.elegir === t)); });
    guardar('abaco-tema', t);
    if (hayGsap && window.ScrollTrigger) setTimeout(function () { ScrollTrigger.refresh(); }, 50);
  }
  var pedido = new URLSearchParams(location.search).get('tema');
  ponerTema(/^[abc]$/.test(pedido || '') ? pedido : (leer('abaco-tema') || raiz.getAttribute('data-tema') || 'a'));
  $$('.selector [data-elegir]').forEach(function (b) { b.addEventListener('click', function () { ponerTema(b.dataset.elegir); }); });

  /* ---------- Cabecera con borde al bajar ---------- */
  var cab = $('.cabecera');
  if (cab) addEventListener('scroll', function () { cab.classList.toggle('con-sombra', scrollY > 8); }, { passive: true });

  /* ---------- Confeti de cuentas ---------- */
  function celebrar(origen) {
    if (quieto || typeof window.confetti !== 'function') return;
    var r = origen.getBoundingClientRect();
    if (!r.width) return; // oculto: sin confeti
    window.confetti({
      particleCount: 70, spread: 75, startVelocity: 34, gravity: 1.1, scalar: 1.15, ticks: 160, shapes: ['circle'],
      colors: [color('--cuenta'), color('--cuenta-2'), color('--cuenta-3'), color('--cuenta-4')],
      origin: { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height * 0.3) / innerHeight },
      disableForReducedMotion: true,
    });
  }

  /* Las vistas que se muestran después (pestañas, conversación) llaman a esto para recolocar las cuentas */
  var recolocadores = [];
  window.abacoRecolocar = function () { recolocadores.forEach(function (fn) { fn(); }); };

  /* ---------- El ábaco jugable ----------
     Cada varilla: data-cuentas (total), data-objetivo (cuentas a la izquierda cuando cuadra), data-valor (€ por cuenta).
     Pulsar una cuenta la mueve con todas las de su lado, como en un ábaco de verdad. */
  $$('.abaco').forEach(function (abaco) {
    var filas = $$('.fila', abaco);
    var estado = [];
    var total = $('[data-total]', abaco);
    var avisado = false;

    filas.forEach(function (fila, f) {
      var varilla = $('.varilla', fila);
      var n = +varilla.dataset.cuentas, objetivo = +varilla.dataset.objetivo, valor = +varilla.dataset.valor || 10;
      var cuentas = [];
      for (var i = 0; i < n; i++) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'cuenta';
        b.setAttribute('aria-label', 'Cuenta ' + (i + 1) + ' de ' + n + ' en la varilla del modelo ' + $('.modelo', fila).firstChild.textContent.trim());
        varilla.appendChild(b); cuentas.push(b);
      }
      // Arranca descuadrada para que la entrada la ponga en su sitio
      var inicio = quieto ? objetivo : Math.max(0, Math.min(n, objetivo + (f % 2 ? -2 : 2)));
      estado[f] = { varilla: varilla, cuentas: cuentas, n: n, objetivo: objetivo, valor: valor, izquierda: inicio, resultado: $('.resultado', fila) };
      cuentas.forEach(function (b, i) {
        b.addEventListener('click', function () {
          var e = estado[f];
          e.izquierda = i < e.izquierda ? i : i + 1; // mover el bloque, como en un ábaco
          colocar(f, true);
          comprobar(true);
        });
      });
    });

    function x(f, i) {
      var e = estado[f], ancho = e.varilla.clientWidth, w = Math.min(e.cuentas[0].offsetWidth + 3, ancho / e.n); // si la varilla es corta, se juntan
      return i < e.izquierda ? i * w : ancho - (e.n - i) * w;
    }
    function colocar(f, animar) {
      estado[f].cuentas.forEach(function (b, i) {
        if (hayGsap && animar && !quieto) gsap.to(b, { x: x(f, i), duration: .55, ease: 'back.out(2.2)', overwrite: true });
        else if (hayGsap) { gsap.killTweensOf(b); gsap.set(b, { x: x(f, i) }); } // corta animaciones pendientes de cuando estaba oculto
        else b.style.transform = 'translateX(' + x(f, i) + 'px)';
      });
    }
    function comprobar(porUsuario) {
      var suma = 0;
      estado.forEach(function (e) {
        var dif = (e.izquierda - e.objetivo) * e.valor;
        suma += Math.abs(dif);
        e.resultado.textContent = dif === 0 ? '0,00 €' : (dif > 0 ? '+' : '−') + eur.format(Math.abs(dif)).replace('-', '');
        e.resultado.classList.toggle('descuadre', dif !== 0);
      });
      if (total) total.textContent = eur.format(suma);
      if (total) total.style.color = suma ? 'var(--alerta)' : '';
      if (suma === 0 && porUsuario && !avisado) { celebrar(abaco); avisado = true; }
      if (suma !== 0) avisado = false;
      if (hayGsap && suma === 0 && !quieto) gsap.fromTo(abaco.querySelectorAll('.resultado'), { scale: .85 }, { scale: 1, duration: .5, ease: 'back.out(3)', stagger: .06 });
    }
    filas.forEach(function (_, f) { colocar(f, false); });
    comprobar(false);
    var recolocar = function () { if (!abaco.offsetWidth) return; filas.forEach(function (_, f) { colocar(f, false); }); };
    recolocadores.push(recolocar);
    addEventListener('resize', recolocar);

    // Entrada: las varillas se cuadran una a una y la diferencia baja a cero
    if (!quieto && hayGsap && abaco.offsetWidth) { // si empieza oculto, aparece ya cuadrado
      var t = gsap.timeline({ delay: .5 });
      estado.forEach(function (e, f) {
        t.add(function () { e.izquierda = e.objetivo; colocar(f, true); comprobar(false); }, f * .45);
      });
      t.add(function () { celebrar(abaco); }, estado.length * .45 + .3);
    } else {
      estado.forEach(function (e, f) { e.izquierda = e.objetivo; colocar(f, false); });
      comprobar(false);
    }
  });

  /* ---------- Titular palabra a palabra ---------- */
  if (hayGsap && !quieto && window.SplitText) {
    $$('[data-partir]').forEach(function (h) {
      var s = SplitText.create(h, { type: 'words', mask: 'words' });
      gsap.from(s.words, { yPercent: 110, duration: .9, ease: 'power3.out', stagger: .06, delay: .1 });
    });
  }

  if (!hayGsap || !window.ScrollTrigger || quieto) {
    $$('.preguntas li').forEach(function (li) { li.classList.add('marcada'); });
    return iniciarRecorrido(false);
  }

  /* ---------- Revelado al hacer scroll ---------- */
  ScrollTrigger.batch('[data-revelar]', {
    start: 'top 88%', once: true,
    onEnter: function (els) { gsap.fromTo(els, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .8, ease: 'power3.out', stagger: .09, overwrite: true }); },
  });

  /* Casillas que se marcan solas, una a una */
  $$('.preguntas').forEach(function (lista) {
    ScrollTrigger.create({ trigger: lista, start: 'top 75%', once: true, onEnter: function () {
      $$('li', lista).forEach(function (li, i) { setTimeout(function () { li.classList.add('marcada'); }, 250 + i * 260); });
    } });
  });

  /* Contadores y barras */
  $$('[data-contar]').forEach(function (el) {
    var fin = +el.dataset.contar, prefijo = el.dataset.prefijo || '', o = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () {
      gsap.to(o, { v: fin, duration: 1.4, ease: 'power2.out', onUpdate: function () { el.textContent = prefijo + eur0.format(Math.round(o.v)); } });
    } });
  });
  $$('.barra span').forEach(function (b) {
    gsap.fromTo(b, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'power2.out', scrollTrigger: { trigger: b, start: 'top 92%', once: true } });
  });

  /* Progreso de lectura con cuentas + enlace activo (estructura 1) */
  var puntos = $$('.progreso i');
  var secciones = $$('[data-seccion]');
  secciones.forEach(function (s, i) {
    ScrollTrigger.create({
      trigger: s, start: 'top 55%', end: 'bottom 55%',
      onToggle: function (self) {
        if (!self.isActive) return;
        puntos.forEach(function (p, j) { p.classList.toggle('lleno', j <= i); });
        $$('.navegacion a[href^="#"]').forEach(function (a) { a.classList.toggle('activo', a.getAttribute('href') === '#' + s.id); });
      },
    });
  });

  iniciarRecorrido(true);

  /* ---------- Recorrido guiado (estructura 2) ---------- */
  function iniciarRecorrido(animado) {
    var rec = $('.recorrido');
    if (!rec) return;
    var escenario = $('.escenario', rec), pasos = $$('.paso-nav button'), caps = $$('.capitulo', rec);
    function ir(i) {
      escenario.setAttribute('data-escena', String(i));
      pasos.forEach(function (b, j) { b.setAttribute('aria-current', j === i ? 'step' : 'false'); b.classList.toggle('hecho', j < i); });
      if (animado) gsap.fromTo($('.escena[data-n="' + i + '"]', escenario).children, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .55, ease: 'power3.out', stagger: .07, overwrite: true });
    }
    pasos.forEach(function (b, i) { b.addEventListener('click', function () { caps[i].scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'center' }); }); });
    if (!animado) { ir(0); caps.forEach(function (c, i) { new IntersectionObserver(function (es) { if (es[0].isIntersecting) ir(i); }, { rootMargin: '-45% 0px -45% 0px' }).observe(c); }); return; }
    var linea = matchMedia('(max-width: 52rem)').matches ? '80%' : '55%';
    caps.forEach(function (c, i) { ScrollTrigger.create({ trigger: c, start: 'top ' + linea, end: 'bottom ' + linea, onToggle: function (s) { if (s.isActive) ir(i); } }); });
    ir(0);
  }
})();

/* ---------- Copiar el correo ---------- */
(function () {
  var b = document.getElementById('copiar'), d = document.getElementById('direccion');
  if (!b || !d) return;
  b.addEventListener('click', function () {
    var listo = function () {
      b.textContent = 'Copiado ✓'; b.classList.add('hecho');
      if (window.gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches) gsap.fromTo(b, { scale: .9 }, { scale: 1, duration: .45, ease: 'back.out(3)' });
      setTimeout(function () { b.textContent = 'Copiar'; b.classList.remove('hecho'); }, 1800);
    };
    var seleccionar = function () { getSelection().selectAllChildren(d); };
    if (navigator.clipboard) navigator.clipboard.writeText(d.textContent).then(listo, seleccionar); else seleccionar();
  });
})();
