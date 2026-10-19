import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Perfil, Registro, alquilerAnual, añoNacimiento, tieneActividad } from './tipos.js';
import { amortizaciones, cuotasReta, r2 } from './calc/deducible.js';
import { totales130 } from './calc/modelos.js';
import { estimarRenta, type ResultadoRenta } from './calc/renta.js';
import { rutasTrimestre } from './comparar.js';
import { leerDeclaracion } from './parsers/aeat.js';
import { leerNomina, type Nomina } from './parsers/nomina.js';
import { FUENTES_IRPF, IRPF } from './rules/irpf.js';

export interface Recomendacion {
  id: string;
  titulo: string;
  detalle: string;
  /** Ahorro o efecto estimado en euros (positivo = a favor). */
  impacto: number | null;
  tipo: 'ahorro' | 'aviso' | 'antes-de-decidir';
  fuente?: string;
}

export interface Ayuda {
  id: string;
  nombre: string;
  organismo: string;
  tipo: string;
  importe: string;
  estado: string;
  plazo: string;
  encaje: 'cumples' | 'posible' | 'no';
  motivo: string;
  comoPedirlo: string;
  fuente: string;
  revisado: string;
}

export interface Analisis {
  ejercicio: number;
  renta: ResultadoRenta;
  supuestos: string[];
  recomendaciones: Recomendacion[];
  ayudas: Ayuda[];
}

const edadEn = (nacimiento: string, fecha: string) => {
  const [a, m, d] = nacimiento.split('-').map(Number);
  const [fa, fm, fd] = fecha.split('-').map(Number);
  return fa - a - (fm < m || (fm === m && fd < d) ? 1 : 0);
};
/** Edad mínima y máxima posibles en una fecha: exacta con la fecha de nacimiento, ±1 año si solo se sabe el año. */
const edadesEn = (per: NonNullable<Perfil['personal']>, fecha: string): [number, number] => {
  if (per.fechaNacimiento && per.añoNacimiento === undefined) {
    const e = edadEn(per.fechaNacimiento, fecha);
    return [e, e];
  }
  const e = Number(fecha.slice(0, 4)) - añoNacimiento(per);
  return fecha.slice(5) === '12-31' ? [e, e] : [e - 1, e];
};
const eur = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €';

/** Nóminas del año leídas y número de PDF de la carpeta (para avisar si ninguno se pudo leer). */
async function nominasDelAño(base: string, carpeta: string | undefined, año: number): Promise<{ nominas: Nomina[]; pdfs: number; dir?: string }> {
  if (!carpeta) return { nominas: [], pdfs: 0 };
  const dir = path.join(base, carpeta, String(año));
  if (!fs.existsSync(dir)) return { nominas: [], pdfs: 0, dir };
  const pdfs = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf'));
  const out: Nomina[] = [];
  for (const f of pdfs) {
    try {
      out.push(await leerNomina(path.join(dir, f)));
    } catch {
      /* documentos de la carpeta que no son nóminas */
    }
  }
  return { nominas: out.filter((n) => n.año === año).sort((a, b) => a.mes - b.mes), pdfs: pdfs.length, dir };
}

/** Estima la Renta del año, propone ahorros y cruza el perfil con el catálogo de ayudas. */
export async function analizar(base: string, ejercicio: number, hoy: string): Promise<Analisis> {
  const perfil = Perfil.parse(JSON.parse(fs.readFileSync(path.join(base, '_autogestor', 'perfil.json'), 'utf8')));
  const per = perfil.personal;
  if (!per) throw new Error('Falta el bloque "personal" en perfil.json');
  const supuestos: string[] = [];

  // Trabajo: nóminas leídas + meses que faltan al importe de la última
  const actividad = tieneActividad(perfil);
  const carpetaNominas = per.carpetaNominas ?? 'Nóminas';
  const leidas = await nominasDelAño(base, carpetaNominas, ejercicio);
  const nominas = leidas.nominas;
  // Un autónomo sin nómina no tiene por qué tener la carpeta: solo se avisa si se esperan nóminas
  if ((per.carpetaNominas || !actividad || leidas.pdfs) && !nominas.length) {
    supuestos.push(
      leidas.pdfs
        ? `Hay ${leidas.pdfs} PDF en la carpeta de nóminas de ${ejercicio}, pero ninguno se ha podido leer como nómina de ese año: el sueldo cuenta como 0 € y la estimación no vale. Revisa que sean nóminas en PDF con texto (no escaneadas).`
        : `No hay nóminas de ${ejercicio} en ${path.join(carpetaNominas, String(ejercicio))}: el sueldo cuenta como 0 €.`,
    );
  }
  const trabajo = { bruto: 0, seguridadSocial: 0, retenciones: 0 };
  for (const n of nominas) {
    trabajo.bruto += n.devengado;
    trabajo.seguridadSocial += n.seguridadSocial;
    trabajo.retenciones += n.retencion;
  }
  const ultima = nominas[nominas.length - 1];
  if (ultima && ultima.mes < 12) {
    const faltan = 12 - ultima.mes;
    trabajo.bruto += faltan * ultima.devengado;
    trabajo.seguridadSocial += faltan * ultima.seguridadSocial;
    trabajo.retenciones += faltan * ultima.retencion;
    supuestos.push(`Sueldo de ${ultima.mes === 11 ? 'diciembre' : `los ${faltan} meses que faltan`} igual al de la última nómina (${eur(ultima.devengado)} brutos, retención del ${ultima.retencionPct.toLocaleString('es-ES')} %).`);
  }

  // Actividad: trimestres con registro propio + media de esos trimestres para los que faltan
  const act = { ingresos: 0, gastos: 0, retenciones: 0, pagos130: 0 };
  const trimestres: { ingresos: number; gastos: number }[] = [];
  for (let t = 1; t <= 4 && actividad; t++) {
    const rutas = rutasTrimestre(base, ejercicio, t);
    if (!fs.existsSync(rutas.registro)) continue;
    const ap = [...Registro.parse(JSON.parse(fs.readFileSync(rutas.registro, 'utf8'))).apuntes, ...cuotasReta(ejercicio, t, perfil), ...amortizaciones(ejercicio, t, perfil)];
    const tot = totales130(ap, perfil);
    trimestres.push(tot);
    act.ingresos += tot.ingresos;
    act.gastos += tot.gastos;
    act.retenciones += tot.retenciones;
    if (fs.existsSync(rutas.m130)) act.pagos130 += Math.max(0, (await leerDeclaracion(rutas.m130)).casillas['19'] ?? 0);
  }
  if (trimestres.length && trimestres.length < 4) {
    const faltan = 4 - trimestres.length;
    const media = (k: 'ingresos' | 'gastos') => trimestres.reduce((s, x) => s + x[k], 0) / trimestres.length;
    act.ingresos += faltan * media('ingresos');
    act.gastos += faltan * media('gastos');
    supuestos.push(`Actividad ${faltan === 1 ? 'del trimestre que falta' : `de los ${faltan} trimestres que faltan`} igual a la media de los anteriores (${eur(media('ingresos'))} de ingresos y ${eur(media('gastos'))} de gastos por trimestre), sin retenciones ni pagos del 130 nuevos.`);
  }
  if (!per.gananciasAhorro) supuestos.push('Sin ganancias de inversiones. Si este año has vendido acciones, fondos o cripto, dile a Claude el importe aproximado.');
  if (per.circunstanciasFamiliares) supuestos.push('No incluye los mínimos ni las deducciones por hijos, ascendientes a cargo o discapacidad: el resultado real será mejor que esta estimación.');

  const [edad] = edadesEn(per, `${ejercicio}-12-31`);
  const alquiler = alquilerAnual(per);
  const datos = {
    ccaa: per.ccaa,
    edad,
    trabajo,
    actividad: act,
    gananciasAhorro: per.gananciasAhorro,
    alquilerAnual: alquiler,
    aportacionPlanPensiones: per.aportacionPlanPensiones,
    dificilJustificacion: perfil.dificilJustificacion,
  };
  const renta = estimarRenta(datos);
  if (renta.reduccionTrabajo) supuestos.push(`Incluye la reducción por rendimientos del trabajo del art. 20 LIRPF (${eur(renta.reduccionTrabajo)}).`);
  if (renta.deduccionTrabajo) supuestos.push(`Incluye la deducción por rendimientos del trabajo de la DA 61.ª LIRPF (${eur(renta.deduccionTrabajo)}). Comprueba que aparece en el borrador.`);

  // Recomendaciones
  const rec: Recomendacion[] = [];
  const marginal = renta.tipoMarginal / 100;

  if (renta.resultado > 0 && trabajo.bruto > 0) {
    const pct = Math.ceil(((trabajo.retenciones + renta.resultado) / trabajo.bruto) * 1000) / 10;
    rec.push({
      id: 'retencion-nomina',
      titulo: `La Renta ${ejercicio} saldría a pagar: unos ${eur(renta.resultado)}`,
      detalle: `Para no pagar de golpe en la Renta del año que viene, pide por escrito a tu empresa una retención del ${pct.toLocaleString('es-ES')} % (ahora ${ultima?.retencionPct.toLocaleString('es-ES') ?? '?'} %). Lo aplican si lo pides al menos 5 días antes de hacer la nómina (art. 88.5 RIRPF). No ahorras impuestos: solo repartes el pago.`,
      impacto: null,
      tipo: 'aviso',
      fuente: FUENTES_IRPF.reglamentoIrpf,
    });
  }

  if (per.aportacionPlanPensiones < IRPF.planPensiones.general) {
    const aporte = IRPF.planPensiones.general - per.aportacionPlanPensiones;
    rec.push({
      id: 'plan-pensiones',
      titulo: `Plan de pensiones: hasta ${eur(r2(aporte * marginal))} menos de IRPF al año`,
      detalle: `Es un ahorro para la jubilación: lo que aportas (hasta ${eur(IRPF.planPensiones.general)} al año${actividad ? `; como autónomo, hasta ${eur(IRPF.planPensiones.general + IRPF.planPensiones.autonomosAdicional)} con un plan de empleo simplificado` : ''}) se resta de la base y te ahorra tu tipo marginal (${renta.tipoMarginal} %). Contras: el dinero queda inmovilizado, en general hasta la jubilación o pasados 10 años, y al cobrarlo tributa como sueldo. No ayuda con el límite de 25.000 € del alquiler, que mira la base imponible antes de esta reducción.`,
      impacto: r2(aporte * marginal),
      tipo: 'ahorro',
      fuente: FUENTES_IRPF.planesPensiones,
    });
  }

  const margen = renta.margenLimiteAlquiler;
  const sueldoMes = ultima ? ultima.devengado - ultima.seguridadSocial : 0;
  // Diferencia de rendimiento del trabajo entre un año completo y este (p. ej. si se empezó a trabajar a mitad de enero)
  const extraProximo = r2(Math.max(0, 12 * sueldoMes - (trabajo.bruto - trabajo.seguridadSocial)));
  rec.push({
    id: 'limite-alquiler',
    titulo: margen >= 0 ? `Margen hasta el límite del alquiler: ${eur(margen)}` : `Base imponible ${eur(-margen)} por encima del límite del alquiler`,
    detalle:
      (margen >= 0
        ? `La deducción del alquiler (${eur(renta.deduccionAlquiler)} en ${ejercicio}) exige que la base imponible no supere ${eur(IRPF.andalucia.alquiler.limiteBase)}. `
        : `Se pierde la deducción del alquiler (hasta ${eur(Math.min(alquiler * IRPF.andalucia.alquiler.pct, IRPF.andalucia.alquiler.maximo))}). `) +
      (extraProximo > 100 ? `En ${ejercicio + 1}, con 12 meses de sueldo completos, la base subiría unos ${eur(extraProximo)}, hasta ≈ ${eur(renta.baseGeneral + renta.baseAhorro + extraProximo)}${actividad ? ', si la actividad sigue igual' : ''}. ` : '') +
      (actividad && margen >= 0 && margen < 2_000 ? `Vas justo: si en lo que queda de año facturas más de ${eur(margen / 0.95)} por encima de lo previsto, perderías la deducción entera. Los gastos de la actividad que de verdad necesites (equipo, software, formación) cuentan si los pagas antes del 31/12. ` : '') +
      (actividad ? 'Solo la bajan los gastos deducibles reales de la actividad; el plan de pensiones no.' : 'El plan de pensiones no la baja: el límite mira la base imponible antes de esa reducción.'),
    impacto: margen >= 0 ? null : -Math.min(alquiler * IRPF.andalucia.alquiler.pct, IRPF.andalucia.alquiler.maximo),
    tipo: 'aviso',
    fuente: FUENTES_IRPF.alquilerAndalucia,
  });

  if (actividad && renta.rendimientoActividad <= 9_000) {
    rec.push({
      id: 'minoracion-130',
      titulo: `Minoración del 130 en ${ejercicio + 1}: 100 € menos por trimestre`,
      detalle: `Tu rendimiento de la actividad de ${ejercicio} (≈ ${eur(renta.rendimientoActividad)}) no supera 9.000 €, así que en ${ejercicio + 1} puedes restar 100 € en cada pago fraccionado (casilla 13, art. 110.3.c RIRPF). Recuérdaselo a la gestoría. Es liquidez, no ahorro: se regulariza en la Renta.`,
      impacto: null,
      tipo: 'aviso',
      fuente: FUENTES_IRPF.minoracion130,
    });
  }

  if (actividad && per.planes.includes('coche')) {
    rec.push({
      id: 'coche',
      titulo: 'Antes de comprar el coche',
      detalle: 'Un turismo solo es gasto deducible en IRPF si se usa exclusivamente para la actividad (art. 22.4 RIRPF), algo muy difícil de justificar. En IVA se presume afectado al 50 % (art. 95.Tres LIVA): podrías deducir la mitad del IVA de la compra, de las reparaciones y del combustible si lo usas para trabajar, y la AEAT puede discutirlo. Pregúntaselo a la gestoría antes de comprar y pon la factura a tu nombre con tu NIF.',
      impacto: null,
      tipo: 'antes-de-decidir',
      fuente: FUENTES_IRPF.leyIva,
    });
  }

  // Ayudas
  const catalogo = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'datos', 'ayudas.json'), 'utf8')) as (Omit<Ayuda, 'encaje' | 'motivo'> & {
    condiciones: { ccaa?: string; edadMax?: number; requiereAlquiler?: boolean; requiereCompraVivienda?: boolean; limiteBase?: number; limiteIngresos?: number; limiteIngresosUnidad?: number; notaIngresos?: string; soloNuevosAutonomos?: boolean };
  })[];
  const baseTotal = renta.baseGeneral + renta.baseAhorro;
  const [edadMin, edadMaxPosible] = edadesEn(per, hoy);
  const ayudas: Ayuda[] = catalogo.map(({ condiciones: c, ...a }) => {
    const no: string[] = [];
    const dudas: string[] = [];
    if (c.ccaa && c.ccaa !== per.ccaa) no.push('es de otra comunidad autónoma');
    if (c.edadMax !== undefined && edadMin > c.edadMax) no.push(`hay que tener ${c.edadMax} años o menos`);
    else if (c.edadMax !== undefined && edadMaxPosible > c.edadMax) dudas.push(`hay que tener ${c.edadMax} años o menos: depende de si ya has cumplido años este año`);
    if (c.requiereAlquiler && !alquiler) no.push('requiere vivir de alquiler');
    if (c.soloNuevosAutonomos) no.push('es para quien se da de alta por primera vez');
    if (c.limiteBase !== undefined && baseTotal > c.limiteBase) no.push(`tu base imponible estimada (${eur(baseTotal)}) supera ${eur(c.limiteBase)}`);
    if (c.limiteIngresos !== undefined && baseTotal > c.limiteIngresos) {
      if (c.limiteIngresosUnidad && baseTotal <= c.limiteIngresosUnidad) dudas.push(`tus ingresos superan el límite individual pero no el de la unidad de convivencia: depende también de los ingresos de quien conviva contigo`);
      else no.push(`tus ingresos estimados (${eur(baseTotal)}) superan el límite de ${eur(c.limiteIngresos)}`);
    } else if (c.limiteIngresosUnidad) dudas.push('si cuenta la unidad de convivencia, se suman los ingresos de quien viva contigo');
    if (c.requiereCompraVivienda) dudas.push(per.planes.includes('vivienda') ? 'aplica cuando compres vivienda' : 'solo si compras vivienda');
    if (c.notaIngresos) dudas.push(c.notaIngresos);
    const encaje = no.length ? 'no' : dudas.length ? 'posible' : 'cumples';
    return { ...a, encaje, motivo: no.length ? `No encaja: ${no.join('; ')}.` : dudas.join(' ') || 'Cumples los requisitos conocidos.' };
  });

  return { ejercicio, renta, supuestos, recomendaciones: rec, ayudas };
}
