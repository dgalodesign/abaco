# Catálogo de librerías gratuitas para animación y microinteracción

Revisado el 18/10/2026. Antes de usar una en un proyecto comercial, confirma la licencia en su repositorio.

## Usadas en las propuestas de ábaco

| Librería | Para qué | Licencia | Cómo cargarla |
|---|---|---|---|
| [GSAP](https://gsap.com) 3.13 | Motor de animación: líneas de tiempo, easings, rendimiento | Gratis, también para uso comercial, desde 2025 (licencia propia de GSAP, no MIT: no permite crear con ella herramientas que compitan con Webflow) | `cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js` |
| GSAP ScrollTrigger | Animar con el scroll, fijar secciones (el recorrido guiado) | Incluido en GSAP | `…/dist/ScrollTrigger.min.js` |
| GSAP SplitText | Partir titulares en palabras o letras para animarlos | Incluido en GSAP (antes era de pago) | `…/dist/SplitText.min.js` |
| [canvas-confetti](https://github.com/catdad/canvas-confetti) 1.9.3 | Confeti con formas y colores propios (las cuentas al cuadrar) | ISC | `cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js` |

## Otros plugins de GSAP, ahora gratis

| Plugin | Para qué |
|---|---|
| Draggable + InertiaPlugin | Arrastrar con inercia (sliders, cartas, un ábaco arrastrable) |
| Flip | Transiciones entre dos estados de un layout (filtros, reordenar tarjetas) |
| MotionPath | Mover elementos por un trazado SVG |
| ScrollSmoother | Scroll suave con efectos de paralaje |
| MorphSVG, DrawSVG | Transformar formas SVG y dibujar trazos |
| TextPlugin, ScrambleText | Escribir texto o «desordenarlo» antes de mostrarlo |

## Alternativas y complementos

| Librería | Para qué | Licencia |
|---|---|---|
| [Motion](https://motion.dev) (antes Framer Motion) | Animación para JavaScript y React, muy ligera | MIT |
| [anime.js](https://animejs.com) v4 | Motor de animación ligero, buena alternativa a GSAP | MIT |
| [Lenis](https://lenis.darkroom.engineering) | Scroll suave (úsalo con cuidado: afecta a la accesibilidad) | MIT |
| [AutoAnimate](https://auto-animate.formkit.com) | Anima solo las listas al añadir, quitar o reordenar; una línea de código | MIT |
| [Lottie](https://airbnb.io/lottie) (lottie-web, dotLottie) | Reproducir animaciones exportadas de After Effects o creadas en LottieFiles | MIT |
| [Rive](https://rive.app) (runtimes) | Animaciones interactivas con estados (botones, personajes, iconos vivos) | Runtimes MIT; editor con plan gratuito |
| [CountUp.js](https://inorganik.github.io/countUp.js) | Cifras que cuentan hasta su valor | MIT |
| [Splitting.js](https://splitting.js.org) | Partir texto en letras o palabras con variables CSS | MIT |
| [Rough Notation](https://roughnotation.com) | Subrayados y círculos «a mano» que se dibujan | MIT |
| [tsParticles](https://particles.js.org) | Partículas y confeti más configurables | MIT |
| [Barba.js](https://barba.js.org) | Transiciones entre páginas | MIT |
| View Transitions API | Transiciones entre estados y páginas nativas del navegador, sin librería | Estándar web |

## Iconos

| Librería | Licencia |
|---|---|
| [Lucide](https://lucide.dev) | ISC |
| [Phosphor](https://phosphoricons.com) | MIT |

## Buenas prácticas

- Respeta `prefers-reduced-motion`: con él activado, nada debería moverse solo.
- Anima `transform` y `opacity`; evita animar `width`, `top` o `box-shadow` en bucles.
- Fija siempre la versión exacta al cargar desde un CDN.
- Que todo se pueda leer sin JavaScript o antes de que termine la animación.
