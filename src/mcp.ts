/**
 * Servidor MCP de ábaco: expone el motor (comparar trimestres, panel, Renta, ayudas) a cualquier IA
 * compatible con MCP. La carpeta del autónomo llega en AUTOGESTOR_DIR; nada sale del ordenador.
 */
import fs from 'node:fs';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Perfil, Registro, tieneActividad } from './tipos.js';
import { comparar, rutasTrimestre } from './comparar.js';
import { informeMarkdown } from './informe.js';
import { generarPanel } from './panel.js';
import { analizar } from './asesor.js';
import { leerDeclaracion } from './parsers/aeat.js';
import { plazosDelAño } from './rules/calendario.js';

const VERSION = '0.4.0';

// El protocolo usa la salida estándar: los avisos de las librerías (p. ej. pdf.js) van a stderr
console.log = (...a: unknown[]) => console.error(...a);
console.warn = (...a: unknown[]) => console.error(...a);
const hoy = () => new Date().toISOString().slice(0, 10);
const texto = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });
const json = (x: unknown) => texto(JSON.stringify(x, null, 2));
const error = (e: unknown) => ({ ...texto(`Error: ${e instanceof Error ? e.message : String(e)}`), isError: true });

function carpeta(): string {
  const dir = process.env.AUTOGESTOR_DIR;
  if (!dir) throw new Error('Falta AUTOGESTOR_DIR: la carpeta del autónomo no está configurada.');
  if (!fs.existsSync(dir)) throw new Error(`La carpeta del autónomo no existe: ${dir}`);
  return dir;
}

/** Ejecuta una herramienta y devuelve su error como texto en lugar de romper el servidor. */
const seguro =
  <A>(fn: (a: A) => Promise<ReturnType<typeof texto>>) =>
  async (a: A) => {
    try {
      return await fn(a);
    } catch (e) {
      return error(e);
    }
  };

const año = z.number().int().min(2020).max(2100).describe('Ejercicio, p. ej. 2026');
const trimestre = z.number().int().min(1).max(4).describe('Trimestre: 1, 2, 3 o 4');

export function crearServidor(): McpServer {
  const s = new McpServer({ name: 'abaco', version: VERSION });

  s.registerTool(
    'estructura_carpeta',
    {
      title: 'Ver la estructura de la carpeta',
      description: 'Describe cómo se organiza la carpeta del autónomo y qué falta (perfil, registros, modelos presentados). Úsalo al empezar una sesión.',
      inputSchema: {},
    },
    seguro(async () => {
      const base = carpeta();
      const dir = path.join(base, '_autogestor');
      const perfil = fs.existsSync(path.join(dir, 'perfil.json'));
      const años = fs.readdirSync(base).filter((d) => /^\d{4}$/.test(d)).sort();
      const trimestres = años.flatMap((a) =>
        [1, 2, 3, 4].map((t) => {
          const r = rutasTrimestre(base, Number(a), t);
          return { periodo: `${a}-T${t}`, registroPropio: fs.existsSync(r.registro), m303: fs.existsSync(r.m303), m130: fs.existsSync(r.m130), m349: fs.existsSync(r.m349) };
        }),
      ).filter((x) => x.registroPropio || x.m303 || x.m130);
      const entrada = path.join(base, '_Entrada');
      return json({
        carpeta: base,
        perfil: perfil ? 'ok' : 'falta _autogestor/perfil.json: usa guardar_perfil',
        bandeja: fs.existsSync(entrada) ? fs.readdirSync(entrada) : 'no existe _Entrada/',
        trimestres,
        convenciones: {
          gastos: '<año>/T<n>/Facturas-Gastos/T<n> • <MM> <Proveedor>.pdf',
          ingresos: '<año>/T<n>/Facturas-Ingresos/<nº factura>.pdf',
          modelos: '<año>/T<n>/Declaraciones/<modelo>+<n>T+<año>.pdf (p. ej. 303+3T+2026.pdf)',
          libroGestoria: '<año>/T<n>/Declaraciones/T<n>_de_<año>-Libro_de_ingresos_y_gastos.xlsx',
          registroPropio: '_autogestor/registros/<año>-T<n>.json',
        },
      });
    }),
  );

  s.registerTool(
    'esquema_registro',
    {
      title: 'Esquema del registro de facturas',
      description: 'Devuelve el esquema JSON del registro propio de un trimestre y las reglas para rellenarlo. Léelo antes de escribir un registro a partir de las facturas.',
      inputSchema: {},
    },
    seguro(async () =>
      json({
        esquema: z.toJSONSchema(Registro, { io: 'input' }),
        reglas: [
          'Un apunte por factura, con los importes de la factura (no los del libro de la gestoría).',
          "regimenIva: 'interior' si lleva IVA español; 'intracomunitaria' si es de la UE con NIF-IVA y sin IVA; 'inversion_sp' si es de fuera de la UE sin IVA; 'exenta' para seguros; 'no_sujeta' para ingresos de clientes de fuera de la UE.",
          'Suministros: base = base imponible del IVA; noSujeto = cánones o tasas sin IVA.',
          'No incluyas cuotas del RETA ni amortizaciones: las añade el motor.',
          'Un bien de más de 300 € que dura más de un año va con bienInversion: true y se añade a perfil.bienesInversion.',
        ],
      }),
    ),
  );

  s.registerTool(
    'esquema_perfil',
    {
      title: 'Esquema del perfil',
      description: 'Devuelve el esquema JSON de _autogestor/perfil.json (datos del autónomo) y el perfil actual si existe. Léelo antes de guardar_perfil.',
      inputSchema: {},
    },
    seguro(async () => {
      const ruta = path.join(carpeta(), '_autogestor', 'perfil.json');
      return json({ esquema: z.toJSONSchema(Perfil, { io: 'input' }), actual: fs.existsSync(ruta) ? JSON.parse(fs.readFileSync(ruta, 'utf8')) : null });
    }),
  );

  s.registerTool(
    'guardar_registro',
    {
      title: 'Guardar el registro de un trimestre',
      description: 'Valida y guarda el registro propio de un trimestre (las facturas leídas por la IA). Si no es válido, devuelve los errores sin guardar.',
      inputSchema: { año, trimestre, apuntes: z.array(z.record(z.string(), z.unknown())).describe('Apuntes según esquema_registro') },
    },
    seguro(async ({ año: a, trimestre: t, apuntes }) => {
      const base = carpeta();
      const r = Registro.safeParse({ ejercicio: a, trimestre: t, apuntes });
      if (!r.success) return error(z.prettifyError(r.error));
      const ruta = rutasTrimestre(base, a, t).registro;
      fs.mkdirSync(path.dirname(ruta), { recursive: true });
      fs.writeFileSync(ruta, JSON.stringify(r.data, null, 2));
      return texto(`Guardados ${r.data.apuntes.length} apuntes en ${ruta}.`);
    }),
  );

  s.registerTool(
    'comparar_trimestre',
    {
      title: 'Comparar un trimestre con la gestoría',
      description: 'Recalcula el 303, el 130 y el 349 desde el registro propio y los compara con los modelos presentados y el libro de la gestoría. Devuelve el informe en Markdown y lo guarda en _autogestor/informes/.',
      inputSchema: { año, trimestre },
    },
    seguro(async ({ año: a, trimestre: t }) => {
      const base = carpeta();
      const md = informeMarkdown(await comparar(base, a, t));
      const ruta = path.join(base, '_autogestor', 'informes', `${a}-T${t}.md`);
      fs.mkdirSync(path.dirname(ruta), { recursive: true });
      fs.writeFileSync(ruta, md);
      return texto(md);
    }),
  );

  s.registerTool(
    'leer_modelo',
    {
      title: 'Leer un modelo de la AEAT',
      description: 'Lee las casillas de un PDF del 303, 130 o 349 de la AEAT (presentado o borrador).',
      inputSchema: { ruta: z.string().describe('Ruta del PDF, absoluta o relativa a la carpeta del autónomo') },
    },
    seguro(async ({ ruta }) => json(await leerDeclaracion(path.isAbsolute(ruta) ? ruta : path.join(carpeta(), ruta)))),
  );

  s.registerTool(
    'analizar_renta',
    {
      title: 'Estimar la Renta y buscar ahorro y ayudas',
      description: 'Estima la Renta del año (nóminas + actividad), calcula el margen hasta los límites de las deducciones, propone ahorros y cruza el perfil con el catálogo de ayudas. Requiere perfil.personal.',
      inputSchema: { año },
    },
    seguro(async ({ año: a }) => json(await analizar(carpeta(), a, hoy()))),
  );

  s.registerTool(
    'generar_panel',
    {
      title: 'Generar el panel',
      description: 'Genera el panel HTML local (avisos, plazos, declaraciones, cifras, Renta, ayudas) en _autogestor/panel/panel.html. Los pendientes y previsiones salen de _autogestor/seguimiento.json.',
      inputSchema: { año },
    },
    seguro(async ({ año: a }) => {
      const { html, datos } = await generarPanel(carpeta(), a, hoy());
      return json({ panel: html, filas: Object.fromEntries(Object.entries(datos).map(([k, v]) => [k, v.length])) });
    }),
  );

  s.registerTool(
    'plazos',
    {
      title: 'Plazos fiscales del año',
      description: 'Calendario general de un autónomo en estimación directa: trimestrales, 390, 347, Renta y cambio de base del RETA. Si el perfil es de solo asalariado (tipo "asalariado"), solo la Renta. Las fechas no tienen en cuenta festivos.',
      inputSchema: { año },
    },
    seguro(async ({ año: a }) => {
      const ruta = path.join(carpeta(), '_autogestor', 'perfil.json');
      const perfil = fs.existsSync(ruta) ? Perfil.safeParse(JSON.parse(fs.readFileSync(ruta, 'utf8'))) : undefined;
      return json(plazosDelAño(a, { actividad: perfil?.success ? tieneActividad(perfil.data) : true }));
    }),
  );

  s.registerTool(
    'guardar_perfil',
    {
      title: 'Guardar el perfil',
      description: 'Valida y guarda _autogestor/perfil.json (tipo autonomo o asalariado; para autónomos, cuota del RETA, afectación de la vivienda y gestoría; para la Renta, solo año de nacimiento, comunidad, alquiler mensual y pocos datos más: nada que identifique a la persona). Crea también la bandeja _Entrada/ y seguimiento.json si faltan.',
      inputSchema: { perfil: z.record(z.string(), z.unknown()).describe('Objeto con la forma de Perfil (src/tipos.ts)') },
    },
    seguro(async ({ perfil }) => {
      const base = carpeta();
      const r = Perfil.safeParse(perfil);
      if (!r.success) return error(z.prettifyError(r.error));
      const dir = path.join(base, '_autogestor');
      fs.mkdirSync(path.join(dir, 'registros'), { recursive: true });
      fs.mkdirSync(path.join(base, '_Entrada'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'perfil.json'), JSON.stringify(r.data, null, 2));
      const seg = path.join(dir, 'seguimiento.json');
      if (!fs.existsSync(seg)) fs.writeFileSync(seg, JSON.stringify({ pendientes: [], previsiones: [], revisiones: {} }, null, 2));
      return texto(`Perfil guardado en ${path.join(dir, 'perfil.json')}.`);
    }),
  );

  return s;
}

const esPrincipal = process.argv[1] && /mcp\.(ts|js|mjs)$|autogestor-mcp/.test(process.argv[1]);
if (esPrincipal) {
  await crearServidor().connect(new StdioServerTransport());
}
