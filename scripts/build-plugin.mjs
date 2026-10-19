// Empaqueta el servidor MCP en un solo archivo dentro de plugin/ (sin node_modules para quien lo instale)
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(import.meta.dirname, '..');
const plugin = path.join(raiz, 'plugin');

await build({
  entryPoints: [path.join(raiz, 'src', 'mcp.ts')],
  outfile: path.join(plugin, 'server', 'autogestor-mcp.mjs'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  minify: false,
  legalComments: 'none',
  // Las dependencias CommonJS (xlsx) necesitan require dentro de un módulo ES
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: 'warning',
});

fs.mkdirSync(path.join(plugin, 'datos'), { recursive: true });
fs.copyFileSync(path.join(raiz, 'datos', 'ayudas.json'), path.join(plugin, 'datos', 'ayudas.json'));
const kb = (fs.statSync(path.join(plugin, 'server', 'autogestor-mcp.mjs')).size / 1024).toFixed(0);
console.log(`plugin/server/autogestor-mcp.mjs (${kb} KB) y plugin/datos/ayudas.json listos`);
