import { z } from 'zod';

const Fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato AAAA-MM-DD');

/** Cómo trata el IVA cada factura. */
export const RegimenIva = z.enum([
  'interior', // IVA español repercutido en la factura
  'intracomunitaria', // proveedor o cliente de la UE con NIF-IVA, sin IVA (inversión del sujeto pasivo, art. 84 LIVA)
  'inversion_sp', // proveedor de fuera de la UE sin IVA (inversión del sujeto pasivo, casillas 12/13)
  'no_sujeta', // ingreso no sujeto por reglas de localización (cliente fuera de la UE, casilla 120)
  'exenta', // sin IVA por exención (seguros, cuotas de la Seguridad Social)
]);

export const Categoria = z.enum([
  'servicios', // ingresos de la actividad
  'suministro', // luz, agua, gas: afectación parcial de la vivienda
  'telefonia',
  'software',
  'asesoria',
  'equipo',
  'seguro_salud',
  'cuota_reta',
  'formacion',
  'amortizacion', // cuota de amortización de un bien de inversión (no llega como factura)
  'otros',
]);

export const BienInversion = z.object({
  descripcion: z.string(),
  fechaAlta: Fecha,
  /** Valor de adquisición amortizable (sin IVA deducible). */
  valor: z.number(),
  /** Coeficiente lineal máximo anual de la tabla simplificada (p. ej. 0.26 equipos informáticos). */
  coeficiente: z.number(),
});
export type BienInversion = z.infer<typeof BienInversion>;

export const Apunte = z.object({
  tipo: z.enum(['ingreso', 'gasto']),
  archivo: z.string().optional(),
  numero: z.string(),
  fecha: Fecha,
  fechaDevengo: Fecha.optional(),
  contraparte: z.string(),
  nif: z.string().optional(),
  pais: z.string().length(2),
  concepto: z.string().optional(),
  base: z.number(),
  ivaPct: z.number().default(0),
  cuotaIva: z.number().default(0),
  /** Importe sin IVA que no forma parte de la base (cánones, tasas no sujetas). */
  noSujeto: z.number().default(0),
  irpfPct: z.number().default(0),
  cuotaIrpf: z.number().default(0),
  total: z.number(),
  categoria: Categoria,
  regimenIva: RegimenIva,
  /** Bien de inversión: no se deduce como gasto; se amortiza (ver perfil.bienesInversion). */
  bienInversion: z.boolean().default(false),
  nota: z.string().optional(),
});
export type Apunte = z.infer<typeof Apunte>;

export const Registro = z.object({
  ejercicio: z.number(),
  trimestre: z.number().min(1).max(4),
  apuntes: z.array(Apunte),
});
export type Registro = z.infer<typeof Registro>;

export const Perfil = z.object({
  /** Cómo llamar al usuario en el panel (opcional). */
  nombre: z.string().optional(),
  /** @deprecated No se usa en ningún cálculo; se acepta en perfiles antiguos. */
  nif: z.string().optional(),
  /** 'autonomo': tiene actividad económica (303, 130, 349). 'asalariado': solo trabajo por cuenta ajena; solo hace la Renta. */
  tipo: z.enum(['autonomo', 'asalariado']).default('autonomo'),
  /** Cuota mensual del RETA (gasto deducible que no llega como factura). Obligatoria para autónomos. */
  cuotaReta: z.number().optional(),
  /** Obligatorio para autónomos. */
  suministros: z.object({
    /** Parte de la vivienda afecta a la actividad (m² despacho / m² totales). */
    afectacion: z.number(),
    /** Porcentaje deducible en IRPF sobre la parte afecta (art. 30.2.5.ª.b LIRPF: 30 %). */
    factorIrpf: z.number().default(0.3),
    /**
     * Criterio del IVA deducible de suministros:
     * 'irpf' = mismo porcentaje que en IRPF (afectación × 30 %), el criterio que aplica la gestoría;
     * 'afectacion' = solo la afectación (criterio de proporción de m²).
     */
    criterioIva: z.enum(['irpf', 'afectacion']).default('irpf'),
  }).optional(),
  /** Afectación de telefonía e internet (1 = 100 %). */
  afectacionTelefonia: z.number().default(1),
  dificilJustificacion: z.object({ pct: z.number().default(0.05), maximo: z.number().default(2000) }).default({ pct: 0.05, maximo: 2000 }),
  /** Bienes de inversión que se amortizan (no se deducen enteros en el año de compra). */
  bienesInversion: z.array(BienInversion).default([]),
  /** Límite anual deducible de primas de seguro de salud (art. 30.2.5.ª LIRPF): 500 € por persona asegurada. */
  limiteSeguroSalud: z.number().default(500),
  /** Minoración del 130 (art. 110.3.c RIRPF), € por trimestre. */
  minoracion130: z.number().default(0),
  /** Quién presenta los modelos y la Renta: el panel lo muestra como responsable de cada plazo. Sin gestoría, «Gestoría» para los trimestres y «Tú» para la Renta de un asalariado. */
  gestoria: z.object({ nombre: z.string().default('Gestoría'), incluyeRenta: z.boolean().default(true) }).optional(),
  /** Datos para la Renta, las deducciones y las ayudas. Solo lo imprescindible: nada que identifique a la persona. */
  personal: z
    .object({
      /** Año de nacimiento: basta para los requisitos de edad (p. ej. menos de 35 años a 31/12). */
      añoNacimiento: z.number().int().min(1900).max(2100).optional(),
      /** @deprecated Perfiles antiguos: se usa solo su año. Usa añoNacimiento. */
      fechaNacimiento: Fecha.optional(),
      ccaa: z.string().default('andalucia'),
      /** Alquiler mensual de la vivienda habitual que paga el contribuyente (su parte). */
      alquilerMensual: z.number().optional(),
      /** @deprecated Perfiles antiguos: alquiler del año. Si está, manda sobre alquilerMensual × 12. */
      alquilerAnual: z.number().optional(),
      /** Carpeta de nóminas, relativa a la carpeta de trabajo, con una subcarpeta por año. Por defecto «Nóminas». */
      carpetaNominas: z.string().optional(),
      /** Ganancias netas estimadas de inversiones del año (base del ahorro). 0 si no ha vendido nada. */
      gananciasAhorro: z.number().default(0),
      aportacionPlanPensiones: z.number().default(0),
      /** Tiene hijos, ascendientes a cargo o discapacidad reconocida: la estimación no los calcula y lo avisa. */
      circunstanciasFamiliares: z.boolean().default(false),
      /** @deprecated Ya no se pregunta; se respeta en perfiles antiguos (p. ej. «coche»). */
      planes: z.array(z.string()).default([]),
    })
    .superRefine((p, ctx) => {
      if (p.añoNacimiento === undefined && !p.fechaNacimiento) ctx.addIssue({ code: 'custom', path: ['añoNacimiento'], message: 'Falta el año de nacimiento' });
    })
    .optional(),
  /** Diferencia a partir de la cual se avisa, en euros. */
  tolerancia: z.number().default(0.05),
}).superRefine((p, ctx) => {
  if (p.tipo !== 'autonomo') return;
  if (p.cuotaReta === undefined) ctx.addIssue({ code: 'custom', path: ['cuotaReta'], message: 'Obligatoria para autónomos (tipo "autonomo")' });
  if (!p.suministros) ctx.addIssue({ code: 'custom', path: ['suministros'], message: 'Obligatorio para autónomos (tipo "autonomo")' });
});
export type Perfil = z.infer<typeof Perfil>;

/** El perfil tiene actividad económica (y por tanto trimestres, 303, 130 y 349). */
export const tieneActividad = (p: Perfil) => p.tipo === 'autonomo';

type Personal = NonNullable<Perfil['personal']>;
/** Año de nacimiento, del campo nuevo o de la fecha de perfiles antiguos. */
export const añoNacimiento = (p: Personal) => p.añoNacimiento ?? Number(p.fechaNacimiento!.slice(0, 4));
/** Alquiler del año: el importe anual de perfiles antiguos o 12 mensualidades. */
export const alquilerAnual = (p: Personal) => p.alquilerAnual ?? (p.alquilerMensual ?? 0) * 12;

/** Casillas de un modelo: número de casilla → importe. */
export type Casillas = Record<string, number>;

export interface Operador349 {
  pais: string;
  nif: string;
  nombre: string;
  clave: string;
  base: number;
}
