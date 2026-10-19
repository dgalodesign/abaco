---
name: revision-trimestral
description: "Comprueba un trimestre fiscal de un autónomo (303, 130, 349 y libro) contra lo que presentó su gestoría. Úsalo cuando el usuario diga \"revisa el T4\", \"compara con la gestoría\", \"han llegado los modelos del trimestre\" o deje documentos nuevos en la bandeja _Entrada."
---

# Revisión trimestral

La IA lee los documentos; el motor de ábaco hace las cuentas. Nunca calcules casillas a mano: escribe el registro y llama a `comparar_trimestre`.

## Pasos

1. **Situación.** Llama a `estructura_carpeta`. Si la carpeta tiene un `ESTADO.md` u otro archivo de estado, léelo antes: puede haber decisiones ya tomadas que no se reabren. Si falta el perfil, usa la skill `configurar`.
2. **Bandeja.** Clasifica cada archivo de `_Entrada/` y muévelo a su sitio con los nombres de `convenciones`. El libro que exporta la gestoría va como `T<n>_de_<año>-Libro_de_ingresos_y_gastos.xlsx` en `Declaraciones/`. Si dudas, pregunta. Duplicados exactos a la papelera, nunca borrado definitivo.
3. **Registro propio.** Llama a `esquema_registro`. Lee cada factura del trimestre (PDF) y crea un apunte por factura con sus importes, no con los del libro de la gestoría: el valor está en la independencia. Guárdalo con `guardar_registro` y corrige lo que devuelva como error. Si una factura no se puede leer (PDF protegido, otra moneda), toma el dato de otra fuente y explícalo en `nota`.
4. **Comparar.** Llama a `comparar_trimestre`. Para el 130 hacen falta los trimestres anteriores del año: si no hay registro propio, el motor usa el 130 presentado del trimestre anterior y lo indica.
5. **Explicar.** Para cada ⚠, busca la causa antes de llamarla error de la gestoría: una factura que falta, otra fecha, un criterio distinto (afectación de suministros, bienes de inversión) o un error real. Las diferencias de criterio se explican, no se reclaman. Valida cualquier afirmación legal con fuentes oficiales y enlázalas. Anota en `_autogestor/seguimiento.json` → `revisiones["<año>-T<n>"]` el estado (`coincide`, `explicadas` o `diferencias`) y un resumen de una línea.
6. **Cerrar.** Resume en pocas líneas qué coincide y qué no. Propón un mensaje breve a la gestoría solo si hay un error real con un importe que merezca la pena. Regenera el panel con `generar_panel`.
