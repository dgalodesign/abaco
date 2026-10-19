import { describe, expect, it } from 'vitest';
import { Perfil, type Apunte } from '../tipos.js';
import { amortizaciones, deducible } from './deducible.js';
import { calcular130, calcular303, calcular349 } from './modelos.js';

const perfil = Perfil.parse({
  nombre: 'Prueba',
  nif: '00000000T',
  cuotaReta: 300,
  suministros: { afectacion: 0.1, factorIrpf: 0.3, criterioIva: 'irpf' },
  bienesInversion: [{ descripcion: 'Portátil', fechaAlta: '2026-04-09', valor: 554, coeficiente: 0.26 }],
});

const ap = (a: Partial<Apunte>): Apunte =>
  ({ tipo: 'gasto', numero: 'X', fecha: '2026-07-01', contraparte: 'X', pais: 'ES', base: 0, ivaPct: 0, cuotaIva: 0, noSujeto: 0, irpfPct: 0, cuotaIrpf: 0, total: 0, categoria: 'otros', regimenIva: 'interior', ...a }) as Apunte;

describe('deducible', () => {
  it('suministros: 30 % de la parte afecta en IRPF y en IVA (criterio de la gestoría)', () => {
    const d = deducible(ap({ categoria: 'suministro', base: 109.12, cuotaIva: 22.92, total: 132.04 }), perfil);
    expect(d).toEqual({ gasto: 3.27, baseIva: 3.27, cuotaIva: 0.69 });
  });
  it('agua: la parte no sujeta cuenta como gasto pero no como base de IVA', () => {
    const d = deducible(ap({ categoria: 'suministro', base: 28.9, cuotaIva: 2.89, noSujeto: 9.31, total: 41.1 }), perfil);
    expect(d.gasto).toBe(1.15);
    expect(d.cuotaIva).toBe(0.09);
  });
  it('inversión del sujeto pasivo: autorrepercute el 21 %', () => {
    expect(deducible(ap({ regimenIva: 'intracomunitaria', base: 18, total: 18 }), perfil).cuotaIva).toBe(3.78);
  });
});

describe('amortizaciones', () => {
  it('lineal por días del trimestre', () => {
    expect(amortizaciones(2026, 3, perfil)[0].base).toBe(36.31); // 554 × 26 % × 92/365
    expect(amortizaciones(2026, 1, perfil)).toEqual([]);
  });
});

describe('modelos', () => {
  const apuntes = [
    ap({ tipo: 'ingreso', base: 800, ivaPct: 21, cuotaIva: 168, irpfPct: 15, cuotaIrpf: 120, total: 848, categoria: 'servicios' }),
    ap({ tipo: 'ingreso', base: 660, total: 660, pais: 'US', categoria: 'servicios', regimenIva: 'no_sujeta' }),
    ap({ base: 18, total: 18, pais: 'IE', nif: 'IE4276970QH', categoria: 'software', regimenIva: 'intracomunitaria' }),
    ap({ base: 192, total: 192, pais: 'US', categoria: 'software', regimenIva: 'inversion_sp' }),
    ap({ base: 39.9, ivaPct: 21, cuotaIva: 8.38, total: 48.28, categoria: 'asesoria' }),
  ];

  it('303', () => {
    const c = calcular303(apuntes, perfil);
    expect(c['09']).toBe(168);
    expect(c['11']).toBe(3.78);
    expect(c['13']).toBe(40.32);
    expect(c['27']).toBe(212.1);
    expect(c['29']).toBe(48.7);
    expect(c['46']).toBe(159.62);
    expect(c['120']).toBe(660);
  });

  it('130 con difícil justificación y pagos previos', () => {
    const c = calcular130(apuntes, perfil, { ingresos: 1000, gastos: 200, retenciones: 0, pagosPrevios: 100, negativosPrevios: 0 });
    // gastos = 200 + 249,9 = 449,9; DJ = 5 % de (2460 − 449,9) = 100,51
    expect(c['02']).toBe(550.41);
    expect(c['04']).toBe(381.92);
    expect(c['07']).toBe(161.92);
  });

  it('349 agrupa por operador', () => {
    expect(calcular349([...apuntes, apuntes[2]])).toEqual([{ pais: 'IE', nif: '4276970QH', nombre: 'X', clave: 'I', base: 36 }]);
  });
});
