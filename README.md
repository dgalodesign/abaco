# Autogestor

Segundo check fiscal para autónomos en España. Recalcula tus modelos 303, 130 y 349 desde tus facturas, los compara con lo que presenta tu gestoría, estima tu Renta y vigila plazos, ahorros y ayudas.

Tu IA lee las facturas; un motor con las reglas fiscales hace las cuentas, siempre igual y al céntimo. Todo se queda en tu ordenador.

> Autogestor no es una gestoría ni asesoramiento profesional. No presenta nada ante Hacienda. Te ayuda a revisar y a preguntar mejor.

## Para quién es

- Autónomos en **estimación directa** (normal o simplificada) con **IVA general**: 303, 130 y 349.
- También si además trabajas por cuenta ajena (lee tus nóminas para la Renta).
- Parámetros autonómicos incluidos: **Andalucía**. Otras comunidades se pueden añadir en `src/rules/irpf.ts`.

Todavía no cubre módulos, recargo de equivalencia, IVA franquiciado ni sociedades.

## Qué hace

| | |
|---|---|
| **Comparar un trimestre** | 303, 130, 349 y libro, factura a factura, contra lo presentado por la gestoría. Explica cada diferencia. |
| **Panel** | Página local con avisos, próximos plazos, declaraciones, cifras del año, Renta estimada, ahorro y ayudas. |
| **Renta** | Estimación con nóminas y actividad, tipo marginal y margen hasta los límites de las deducciones. |
| **Ahorro y ayudas** | Propuestas con importe y un catálogo de ayudas (`datos/ayudas.json`) con su fuente oficial. |

## Instalar

Necesitas [Node.js](https://nodejs.org) 20 o posterior.

### Claude Code (plugin)

```bash
claude plugin marketplace add <ruta o URL de este repositorio>
```

```bash
claude plugin install autogestor@autogestor
```

Al activarlo te pide la **carpeta del autónomo**: la carpeta donde guardas facturas y declaraciones. Después di «configura autogestor» y la skill `configurar` te hará las preguntas del perfil.

### Claude Desktop y otras IA compatibles con MCP

El motor es un servidor MCP en un solo archivo (`plugin/server/autogestor-mcp.mjs`). Añádelo a la configuración de servidores MCP de tu aplicación (en Claude Desktop, `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "autogestor": {
      "command": "node",
      "args": ["C:/ruta/a/autogestor/plugin/server/autogestor-mcp.mjs"],
      "env": { "AUTOGESTOR_DIR": "C:/ruta/a/tu/carpeta/de/autonomo" }
    }
  }
}
```

Las skills de `plugin/skills/` explican a la IA cómo usar las herramientas. Si tu aplicación no carga skills, pégale su contenido como instrucciones.

## Herramientas del servidor MCP

| Herramienta | Para qué |
|---|---|
| `estructura_carpeta` | Qué hay en la carpeta y qué falta |
| `esquema_perfil` · `guardar_perfil` | Configurar el perfil del autónomo |
| `esquema_registro` · `guardar_registro` | Escribir el registro de facturas de un trimestre |
| `comparar_trimestre` | Comparar con la gestoría |
| `leer_modelo` | Leer las casillas de un PDF de la AEAT |
| `analizar_renta` | Renta estimada, ahorro y ayudas |
| `generar_panel` | Panel HTML local |
| `plazos` | Calendario fiscal del año |

## Tu carpeta

```text
<carpeta del autónomo>/
├── 2026/
│   └── T3/
│       ├── Declaraciones/      303+3T+2026.pdf, 130+3T+2026.pdf, 349+3T+2026.pdf, libro de la gestoría
│       ├── Facturas-Gastos/    T3 • 07 Proveedor.pdf
│       └── Facturas-Ingresos/  F-0032.pdf
├── _Entrada/                   lo nuevo sin revisar
└── _autogestor/                perfil.json, seguimiento.json, registros/, informes/, panel/
```

## Privacidad

Los datos fiscales nunca salen de tu ordenador: el servidor solo lee y escribe en tu carpeta. El panel es un archivo HTML local; lo único que descarga de internet son las tipografías.

## Desarrollo

```bash
npm install
```

```bash
npm test
```

```bash
npm run build:plugin
```

```bash
node scripts/probar-mcp.mjs
```

- `src/calc/`: cálculo de modelos, deducibles y Renta. `src/rules/`: parámetros fiscales y calendario, con su fuente oficial.
- `src/parsers/`: PDF de la AEAT, nóminas y libros de la gestoría.
- `src/mcp.ts`: servidor MCP. `npm run build:plugin` lo empaqueta en `plugin/server/`.

Los parámetros fiscales están validados con el Manual práctico de Renta 2025 de la AEAT. Revísalos cada año.
