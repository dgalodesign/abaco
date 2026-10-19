import fs from 'node:fs';
import path from 'node:path';
import { comparar } from './comparar.js';
import { informeMarkdown } from './informe.js';
import { generarPanel } from './panel.js';

const AYUDA = `Uso: autogestor comparar <año> <trimestre> [--dir <carpeta del autónomo>]
     autogestor panel <año> [--hoy AAAA-MM-DD] [--dir <carpeta del autónomo>]
La carpeta también puede indicarse con la variable AUTOGESTOR_DIR.`;

async function main(argv: string[]) {
  const [cmd, año, trim] = argv;
  const i = argv.indexOf('--dir');
  const base = i >= 0 ? argv[i + 1] : process.env.AUTOGESTOR_DIR;
  if (cmd === 'panel' && año && base) {
    const h = argv.indexOf('--hoy');
    const hoy = h >= 0 ? argv[h + 1] : new Date().toISOString().slice(0, 10);
    const { html, datos } = await generarPanel(base, Number(año), hoy);
    for (const [k, v] of Object.entries(datos)) console.log(k.padEnd(12), v.length, 'filas');
    console.log(`Panel: ${html}`);
    return;
  }
  if (cmd !== 'comparar' || !año || !trim || !base) {
    console.error(AYUDA);
    process.exit(1);
  }
  const t = Number(String(trim).replace(/^T/i, ''));
  const res = await comparar(base, Number(año), t);
  const md = informeMarkdown(res);
  const salida = path.join(base, '_autogestor', 'informes', `${año}-T${t}.md`);
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.writeFileSync(salida, md);
  console.log(md);
  console.log(`Informe guardado en ${salida}`);
}

main(process.argv.slice(2)).catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
