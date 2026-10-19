/* ábaco · el contenido, una sola vez. Todas las navegaciones lo leen de aquí. Cifras de ejemplo. */
window.CONTENIDO = {
  titular: { etiqueta: 'Para autónomos en España', antes: 'Tus impuestos, ', marca: 'cuenta por cuenta.', entradilla: 'ábaco recalcula tus impuestos desde tus facturas, revisa lo que presenta tu gestoría y te avisa de lo que te puedes ahorrar. Para que cada trimestre cuadre y sepas por qué.', nota: 'Funciona con Claude, el asistente de IA. Tus datos no salen de tu ordenador.' },
  problema: {
    etiqueta: 'El problema', titulo: 'Pagas a una gestoría. ¿Sabes si lo hace bien?',
    texto: 'Firmas lo que te mandan cada trimestre. Si hay un error, la responsabilidad ante Hacienda es tuya, no de tu gestoría.',
    preguntas: ['¿Me han deducido todas las facturas, o se les ha escapado alguna?', '¿Por qué este trimestre pago más que el anterior?', '¿Cuánto me va a salir la Renta? ¿Me estoy pasando de algún límite?', '¿Hay alguna deducción o ayuda para mí que nadie me ha contado?', '¿Qué vence este mes, y quién se encarga?'],
  },
  como: {
    etiqueta: 'Cómo funciona', titulo: 'Tú guardas las facturas. ábaco hace las cuentas.',
    pasos: [
      { t: 'Deja tus documentos en una carpeta', d: 'Facturas, nóminas y lo que te envía tu gestoría. Sin plantillas ni formularios: los PDF tal cual.' },
      { t: 'Claude los lee, ábaco calcula', d: 'Claude extrae los datos de cada factura. Un motor con las reglas fiscales recalcula el 303, el 130 y el 349: siempre igual y al céntimo.' },
      { t: 'Compara y te lo explica', d: 'Casilla a casilla y factura a factura frente a lo presentado. Si algo no cuadra, te dice por qué y si merece la pena reclamarlo.' },
    ],
  },
  herramienta: { etiqueta: 'La herramienta', titulo: 'Así comprueba ábaco tu trimestre', texto: 'Todo lo que ves aquí funciona con datos de ejemplo. Pruébalo.' },
  ahorro: {
    etiqueta: 'Más que revisar', titulo: 'Todo lo que tu gestoría no te cuenta', texto: 'Todas las cifras son de ejemplo.',
    funciones: [
      { t: 'Tu Renta, antes de tiempo', d: 'Con tus nóminas y tu actividad, ábaco estima la Renta del año y te dice cuánto retener para no llevarte un susto en junio.', filas: [['Renta estimada', '≈ 640 € a pagar'], ['Retención para cubrirla', '8 % → 11,5 %']] },
      { t: 'Límites que cuestan dinero', d: 'Muchas deducciones se pierden por pasarte unos euros de un límite. ábaco te avisa antes de que pase.', filas: [['Deducción del alquiler (600 €)', 'a 450 € del límite', 'alerta']], barra: true },
      { t: 'Ayudas que encajan contigo', d: 'Cruza tu perfil con ayudas y deducciones vigentes, siempre con su fuente oficial, y vigila cuándo abren.', filas: [['Bono Alquiler Joven', 'hasta 6.000 €', 'ok'], ['Deducción por compra de vivienda', 'al comprar', 'chip']] },
      { t: 'Plazos y avisos', d: 'Lo que vence, quién se encarga y lo que ya está presentado. Te avisa una semana antes.', filas: [['303 · 130 · 349 · 390', '1 feb'], ['Límite del seguro de salud', 'quedan 40 €', 'alerta']] },
    ],
  },
  privacidad: { etiqueta: 'Privacidad', titulo: 'Tus impuestos no salen de tu ordenador.', texto: 'ábaco no es una web donde subes tus facturas. Es un motor que corre en tu ordenador junto a Claude, y solo lee y escribe en tu carpeta.', puntos: ['Sin cuentas ni servidores con tus datos fiscales.', 'Normativa validada con fuentes oficiales (BOE, Agencia Tributaria, Seguridad Social), con el enlace a cada una.', 'Funciona con Claude y está preparado para otros asistentes de IA.'] },
  paraQuien: { etiqueta: 'Para quién es', titulo: 'Autónomos que quieren entender sus números', si: ['Estimación directa con IVA general (303, 130, 349).', 'Tienes gestoría o una app de impuestos y quieres revisar lo que presenta.', 'También si además trabajas por cuenta ajena.', 'Comunidades autónomas: empezamos por Andalucía.', 'Necesitas un ordenador y una suscripción de pago a Claude.'], no: ['Todavía no: módulos, recargo de equivalencia ni sociedades.'] },
  rumbo: { etiqueta: 'Hacia dónde va', titulo: 'De revisar a llevarlo tú', pasos: [['Hoy', 'Revisar trimestres, estimar la Renta, avisos, ahorro y ayudas.'], ['Siguiente', 'Más comunidades autónomas y la Renta completa.'], ['Después', 'Preparar tus modelos para que los presentes tú, sin depender de nadie.']] },
  autor: { etiqueta: 'Quién está detrás', titulo: 'Lo hice para mí', parrafos: ['Soy Edgar, diseñador UX/UI y autónomo. Cada trimestre firmaba lo que me mandaba mi gestoría sin entender del todo qué estaba firmando, y la Renta siempre llegaba con sorpresa.', 'Así que construí ábaco con Claude para revisar mis propios impuestos. La primera comprobación cuadró al céntimo, y por el camino encontró un límite de deducción que estaba a punto de perder.'], enlace: 'https://dgalodesign.com' },
  lista: { etiqueta: 'Lista de espera', titulo: 'Que tus impuestos cuadren. Siempre.', texto: 'ábaco está en pruebas. Escríbeme y te aviso cuando puedas usarlo.', email: 'dgalodesign@gmail.com', privacidad: '../../privacidad.html' },
  pie: 'ábaco no es una gestoría ni asesoramiento fiscal profesional, y no presenta declaraciones. Te ayuda a revisar tus números y a preguntar mejor.',
};
