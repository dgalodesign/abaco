import { describe, expect, it } from 'vitest';
import { deduccionDa61, estimarRenta, reduccionArt20 } from './renta.js';

const datos = {
  ccaa: 'andalucia',
  edad: 28,
  trabajo: { bruto: 19_648.09, seguridadSocial: 1_277.13, retenciones: 1_620.95 },
  actividad: { ingresos: 14_373.33, gastos: 6_006.62, retenciones: 825, pagos130: 407.44 },
  gananciasAhorro: 0,
  alquilerAnual: 4_125,
  aportacionPlanPensiones: 0,
  dificilJustificacion: { pct: 0.05, maximo: 2_000 },
};

describe('estimarRenta', () => {
  it('cuotas estatal y andaluza con mínimo personal (escalas del manual de Renta 2025)', () => {
    const r = estimarRenta(datos);
    expect(r.rendimientoTrabajo).toBe(16_370.96);
    expect(r.rendimientoActividad).toBe(7_948.37);
    expect(r.cuotaEstatal).toBe(2_203.4); // 2.730,65 − 527,25
    expect(r.cuotaAutonomica).toBe(2_139.85); // 2.689,90 − 550,05
    expect(r.deduccionAlquiler).toBe(618.75);
    expect(r.tipoMarginal).toBe(30);
  });
  it('pierde la deducción del alquiler por encima de 25.000 € de base', () => {
    const r = estimarRenta({ ...datos, gananciasAhorro: 1_000 });
    expect(r.deduccionAlquiler).toBe(0);
    expect(r.margenLimiteAlquiler).toBeLessThan(0);
  });
  it('el plan de pensiones reduce la base liquidable, no la imponible', () => {
    const r = estimarRenta({ ...datos, aportacionPlanPensiones: 1_500 });
    expect(r.reduccionPlanPensiones).toBe(1_500);
    expect(r.baseGeneral).toBe(24_319.33);
    expect(r.cuotaEstatal + r.cuotaAutonomica).toBeCloseTo(2_203.4 + 2_139.85 - 450, 1);
  });
  it('con actividad de más de 6.500 € no hay reducción del art. 20 ni deducción de la DA 61.ª', () => {
    const r = estimarRenta(datos);
    expect(r.reduccionTrabajo).toBe(0);
    expect(r.deduccionTrabajo).toBe(0);
  });
});

const soloNomina = {
  ccaa: 'andalucia',
  edad: 40,
  trabajo: { bruto: 16_000, seguridadSocial: 1_016, retenciones: 600 },
  actividad: { ingresos: 0, gastos: 0, retenciones: 0, pagos130: 0 },
  gananciasAhorro: 0,
  alquilerAnual: 0,
  aportacionPlanPensiones: 0,
  dificilJustificacion: { pct: 0.05, maximo: 2_000 },
};

describe('reducción del art. 20 y deducción de la DA 61.ª (manual de Renta 2025)', () => {
  it('tramos de la reducción sobre el rendimiento neto previo', () => {
    expect(reduccionArt20(12_000)).toBe(7_302);
    expect(reduccionArt20(14_852)).toBe(7_302);
    expect(reduccionArt20(14_984)).toBe(7_071); // 7.302 − 1,75 × 132
    expect(reduccionArt20(17_673.52)).toBeCloseTo(2_364.34, 2);
    expect(reduccionArt20(18_673.52)).toBe(1_224.34); // 2.364,34 − 1,14 × 1.000
    expect(reduccionArt20(19_747.5)).toBe(0);
  });
  it('importe de la deducción según los rendimientos íntegros', () => {
    expect(deduccionDa61(16_576)).toBe(340);
    expect(deduccionDa61(17_576)).toBe(140); // 340 − 0,2 × 1.000
    expect(deduccionDa61(18_276)).toBe(0);
  });
  it('solo nómina: aplica la reducción y la deducción hasta la cuota del trabajo', () => {
    const r = estimarRenta(soloNomina);
    // 16.000 − 1.016 = 14.984 previo; − 2.000 − 7.071 = 5.913
    expect(r.reduccionTrabajo).toBe(7_071);
    expect(r.rendimientoTrabajo).toBe(5_913);
    expect(r.rendimientoActividad).toBe(0);
    expect(r.cuotaEstatal).toBe(34.49); // (5.913 − 5.550) × 9,5 %
    expect(r.cuotaAutonomica).toBe(11.69); // (5.913 − 5.790) × 9,5 %
    expect(r.deduccionTrabajo).toBe(46.17); // 340 €, limitada a la cuota íntegra
    expect(r.cuotaLiquida).toBe(0);
    expect(r.resultado).toBe(-600);
  });
  it('la reducción no deja el rendimiento en negativo', () => {
    const r = estimarRenta({ ...soloNomina, trabajo: { bruto: 8_000, seguridadSocial: 508, retenciones: 0 } });
    expect(r.rendimientoTrabajo).toBe(0);
    expect(r.reduccionTrabajo).toBe(5_492);
  });
  it('sin reducción si las demás rentas superan 6.500 €', () => {
    const r = estimarRenta({ ...soloNomina, gananciasAhorro: 7_000 });
    expect(r.reduccionTrabajo).toBe(0);
    expect(r.rendimientoTrabajo).toBe(12_984);
    expect(r.deduccionTrabajo).toBe(0);
  });
});
