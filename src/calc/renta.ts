import { r2 } from './deducible.js';
import { IRPF, aplicarEscala, tipoMarginal } from '../rules/irpf.js';

export interface DatosRenta {
  ccaa: string;
  edad: number;
  trabajo: { bruto: number; seguridadSocial: number; retenciones: number };
  actividad: { ingresos: number; gastos: number; retenciones: number; pagos130: number };
  gananciasAhorro: number;
  alquilerAnual: number;
  aportacionPlanPensiones: number;
  dificilJustificacion: { pct: number; maximo: number };
}

export interface ResultadoRenta {
  /** Rendimiento neto reducido del trabajo (después de los 2.000 € de otros gastos y de la reducción del art. 20). */
  rendimientoTrabajo: number;
  /** Reducción por obtención de rendimientos del trabajo (art. 20 LIRPF). */
  reduccionTrabajo: number;
  rendimientoActividad: number;
  baseGeneral: number;
  baseAhorro: number;
  reduccionPlanPensiones: number;
  cuotaEstatal: number;
  cuotaAutonomica: number;
  cuotaAhorro: number;
  deduccionAlquiler: number;
  /** Deducción por obtención de rendimientos del trabajo (DA 61.ª LIRPF). */
  deduccionTrabajo: number;
  cuotaLiquida: number;
  pagosACuenta: number;
  /** Positivo: a pagar. Negativo: a devolver. */
  resultado: number;
  tipoMarginal: number;
  /** Margen hasta el límite de base imponible de las deducciones andaluzas de alquiler y vivienda. */
  margenLimiteAlquiler: number;
}

/** Reducción del art. 20 LIRPF sobre el rendimiento neto previo del trabajo (íntegro − gastos a–e del art. 19.2). */
export function reduccionArt20(netoPrevio: number): number {
  const t = IRPF.reduccionTrabajo;
  if (netoPrevio <= 0 || netoPrevio >= t.hasta3) return 0;
  if (netoPrevio <= t.hasta1) return t.maxima;
  if (netoPrevio <= t.hasta2) return r2(t.maxima - t.pct1 * (netoPrevio - t.hasta1));
  return r2(Math.max(0, t.base3 - t.pct2 * (netoPrevio - t.hasta2)));
}

/** Deducción de la DA 61.ª LIRPF según los rendimientos íntegros del trabajo, antes del límite de cuota. */
export function deduccionDa61(integro: number): number {
  const t = IRPF.deduccionTrabajo;
  if (integro <= 0 || integro >= t.hasta2) return 0;
  if (integro <= t.hasta1) return t.importe;
  return r2(Math.max(0, t.importe - t.pct * (integro - t.hasta1)));
}

/** Estimación de la Renta (tributación individual) de un asalariado, autónomo o ambas cosas. */
export function estimarRenta(d: DatosRenta): ResultadoRenta {
  const escalaAut = IRPF.escalaAutonomica[d.ccaa];
  const minAut = IRPF.minimoPersonalAutonomico[d.ccaa];
  if (!escalaAut || minAut === undefined) throw new Error(`Comunidad autónoma sin parámetros: ${d.ccaa}`);

  // Actividad: 5 % de difícil justificación sobre el rendimiento previo, con su máximo
  const previo = d.actividad.ingresos - d.actividad.gastos;
  const dj = Math.min(Math.max(0, previo * d.dificilJustificacion.pct), d.dificilJustificacion.maximo);
  const rendimientoActividad = r2(previo - dj);

  // Las demás rentas (netas de gastos, antes de reducciones) deciden si hay reducción del art. 20 y deducción de la DA 61.ª
  const otrasRentasBajas = rendimientoActividad + d.gananciasAhorro <= IRPF.limiteOtrasRentasReduccionTrabajo;

  // Trabajo: cotizaciones, 2.000 € de otros gastos y reducción del art. 20, sin dejar el rendimiento en negativo
  const previoTrabajo = d.trabajo.bruto - d.trabajo.seguridadSocial;
  const netoTrabajo = Math.max(0, previoTrabajo - Math.min(IRPF.otrosGastosTrabajo, Math.max(0, previoTrabajo)));
  const reduccionTrabajo = otrasRentasBajas ? Math.min(reduccionArt20(previoTrabajo), netoTrabajo) : 0;
  const rendimientoTrabajo = r2(netoTrabajo - reduccionTrabajo);

  const baseGeneral = r2(rendimientoTrabajo + rendimientoActividad);
  const baseAhorro = r2(Math.max(0, d.gananciasAhorro));
  const pp = IRPF.planPensiones;
  const reduccionPlanPensiones = r2(Math.max(0, Math.min(d.aportacionPlanPensiones, pp.general, (netoTrabajo + rendimientoActividad) * pp.pctRendimientos)));
  const blg = Math.max(0, baseGeneral - reduccionPlanPensiones);

  const cuotaEstatal = aplicarEscala(blg, IRPF.escalaEstatal) - aplicarEscala(Math.min(IRPF.minimoPersonalEstatal, blg), IRPF.escalaEstatal);
  const cuotaAutonomica = aplicarEscala(blg, escalaAut) - aplicarEscala(Math.min(minAut, blg), escalaAut);
  const cuotaAhorro = aplicarEscala(baseAhorro, IRPF.escalaAhorro);

  const alq = IRPF.andalucia.alquiler;
  const cumpleAlquiler = d.ccaa === 'andalucia' && d.edad < alq.edadMax && baseGeneral + baseAhorro <= alq.limiteBase;
  const deduccionAlquiler = cumpleAlquiler ? r2(Math.min(d.alquilerAnual * alq.pct, alq.maximo)) : 0;

  // DA 61.ª: hasta la parte de las cuotas íntegras (estatal + autonómica) que corresponde a los rendimientos del trabajo
  const parteTrabajo = baseGeneral > 0 ? Math.min(1, Math.max(0, rendimientoTrabajo / baseGeneral)) : 0;
  const deduccionTrabajo = otrasRentasBajas ? r2(Math.min(deduccionDa61(d.trabajo.bruto), (cuotaEstatal + cuotaAutonomica) * parteTrabajo)) : 0;

  const cuotaLiquida = r2(Math.max(0, cuotaEstatal + cuotaAutonomica + cuotaAhorro - deduccionAlquiler - deduccionTrabajo));
  const pagosACuenta = r2(d.trabajo.retenciones + d.actividad.retenciones + d.actividad.pagos130);
  return {
    rendimientoTrabajo,
    reduccionTrabajo: r2(reduccionTrabajo),
    rendimientoActividad,
    baseGeneral,
    baseAhorro,
    reduccionPlanPensiones,
    cuotaEstatal: r2(cuotaEstatal),
    cuotaAutonomica: r2(cuotaAutonomica),
    cuotaAhorro: r2(cuotaAhorro),
    deduccionAlquiler,
    deduccionTrabajo,
    cuotaLiquida,
    pagosACuenta,
    resultado: r2(cuotaLiquida - pagosACuenta),
    tipoMarginal: tipoMarginal(blg, IRPF.escalaEstatal) + tipoMarginal(blg, escalaAut),
    margenLimiteAlquiler: r2(alq.limiteBase - baseGeneral - baseAhorro),
  };
}
