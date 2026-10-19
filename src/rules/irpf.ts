/**
 * Parámetros del IRPF. Validados con el Manual práctico de Renta 2025 de la AEAT; para 2026 no se
 * ha publicado ningún cambio a 17/10/2026 (revisar con el manual de Renta 2026 cuando salga).
 */
export type Escala = [hasta: number, tipo: number][];

export const FUENTES_IRPF = {
  escalaEstatal: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-general/gravamen-estatal.html',
  escalaAndalucia: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-ayuda-presentacion/irpf-2025/8-cumplimentacion-irpf/8_4-cuota-integra/8_4_3-gravamen-base-liquidable-general/8_4_3_2-cuota-integra-autonomica.html',
  minimoAndalucia: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales/minimo-autonomico-personal-familiar/comunidad-autonoma-andalucia-importes-minimo-familiar.html',
  alquilerAndalucia: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/comunidad-autonoma-andalucia/cantidades-invertidas-alquiler-vivienda-habitual.html',
  viviendaJovenesAndalucia: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/comunidad-autonoma-andalucia/inversion-vivienda-habitual-protegida-personas-jovenes.html',
  planesPensiones: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen/reducciones-base-imponible-general/reducciones-aportaciones-contribuciones-sistemas-prevision-social/normas-comunes-aplicables-aportaciones-sistemas-social/limites-exceso-aportaciones.html',
  seguroSalud: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c07-rendimientos-actividades-economicas-estimacion-directa/fase-1-determinacion-rendimiento-neto/gastos-fiscalmente-deducibles/servicios-exteriores/primas-seguros.html',
  minoracion130: 'https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-130-irpf______esionales-estimacion-directa-fraccionado_/instrucciones.html',
  leyIva: 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740',
  reduccionTrabajo: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo/rendimiento-neto-trabajo-integrar-base-imponible/fase-3-determinacion-rendimiento-neto-reducido.html',
  deduccionTrabajo: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion/deducciones-cuota-liquida-total/deduccion-obtencion-rendimientos-trabajo.html',
  reglamentoIrpf: 'https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820',
} as const;

export const IRPF = {
  /** Art. 63.1 LIRPF. */
  escalaEstatal: [[12_450, 9.5], [20_200, 12], [35_200, 15], [60_000, 18.5], [300_000, 22.5], [Infinity, 24.5]] as Escala,
  /** Art. 23 Ley 5/2021 de Andalucía. */
  escalaAutonomica: { andalucia: [[13_000, 9.5], [21_100, 12], [35_200, 15], [60_000, 18.5], [Infinity, 22.5]] as Escala } as Record<string, Escala>,
  /** Base del ahorro, tipo conjunto estatal + autonómico. */
  escalaAhorro: [[6_000, 19], [50_000, 21], [200_000, 23], [300_000, 27], [Infinity, 30]] as Escala,
  minimoPersonalEstatal: 5_550,
  minimoPersonalAutonomico: { andalucia: 5_790 } as Record<string, number>,
  /** Art. 19.2.f LIRPF: otros gastos del trabajo. */
  otrosGastosTrabajo: 2_000,
  /** La reducción del art. 20 y la deducción de la DA 61.ª no se aplican si las demás rentas (excluidas las exentas) superan este importe. */
  limiteOtrasRentasReduccionTrabajo: 6_500,
  /**
   * Art. 20 LIRPF: reducción por obtención de rendimientos del trabajo, sobre el rendimiento neto previo (íntegro − gastos
   * de las letras a–e del art. 19.2, antes de los 2.000 € de otros gastos). Fuente: FUENTES_IRPF.reduccionTrabajo.
   * Hasta `hasta1` → `maxima`; hasta `hasta2` → maxima − pct1 × (RN − hasta1); hasta `hasta3` → base3 − pct2 × (RN − hasta2).
   */
  reduccionTrabajo: { hasta1: 14_852, hasta2: 17_673.52, hasta3: 19_747.5, maxima: 7_302, pct1: 1.75, base3: 2_364.34, pct2: 1.14 },
  /**
   * DA 61.ª LIRPF: deducción por obtención de rendimientos del trabajo, sobre los rendimientos íntegros del trabajo.
   * Hasta `hasta1` → `importe`; hasta `hasta2` → importe − pct × (RIT − hasta1). No supera la parte de las cuotas íntegras
   * estatal y autonómica que corresponde a los rendimientos del trabajo. Fuente: FUENTES_IRPF.deduccionTrabajo.
   */
  deduccionTrabajo: { hasta1: 16_576, hasta2: 18_276, importe: 340, pct: 0.2 },
  planPensiones: { general: 1_500, autonomosAdicional: 4_250, pctRendimientos: 0.3 },
  andalucia: {
    alquiler: { pct: 0.15, maximo: 1_200, edadMax: 35, limiteBase: 25_000 },
    viviendaJovenes: { pct: 0.06, baseMaxima: 9_040, edadMax: 35, limiteBase: 25_000 },
  },
};

/** Cuota de aplicar una escala progresiva a una base. */
export function aplicarEscala(base: number, escala: Escala): number {
  let cuota = 0;
  let desde = 0;
  for (const [hasta, tipo] of escala) {
    if (base <= desde) break;
    cuota += (Math.min(base, hasta) - desde) * (tipo / 100);
    desde = hasta;
  }
  return cuota;
}

/** Tipo marginal (%) de una base en una escala. */
export const tipoMarginal = (base: number, escala: Escala) => (escala.find(([hasta]) => base < hasta) ?? escala[escala.length - 1])[1];
