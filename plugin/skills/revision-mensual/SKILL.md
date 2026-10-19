---
name: revision-mensual
description: "Revisión mensual de un autónomo con autogestor: Renta estimada, límites de deducciones, ahorro posible, ayudas y novedades fiscales, y panel actualizado. Úsalo cuando pida \"revisión del mes\", \"cómo voy con la Renta\", \"¿hay ayudas para mí?\" o desde una tarea programada."
---

# Revisión mensual

1. **Situación.** `estructura_carpeta`; si hay un `ESTADO.md` u otro archivo de estado, léelo (las decisiones tomadas no se reabren).
2. **Renta y límites.** `analizar_renta` con el año en curso. Cuenta, en este orden: el resultado estimado, el margen hasta los límites de base imponible de las deducciones (p. ej. 25.000 € del alquiler en Andalucía) y los supuestos de la estimación. Si el margen es pequeño, di cuánto más se podría facturar antes de perder la deducción.
3. **Ahorro.** Solo propuestas concretas con importe estimado: gastos deducibles no aprovechados, plan de pensiones, retención en nómina, compras previstas (vivienda, coche). Explica los contras.
4. **Ayudas y novedades.** Busca lo publicado en el último mes que afecte al perfil (BOE, boletín y web de su comunidad autónoma, sede de la AEAT, Seguridad Social, ayuntamiento): autónomos, jóvenes, alquiler, vivienda, digitalización. Valida cada dato con la fuente oficial. El catálogo de ayudas de autogestor está en `datos/ayudas.json` dentro del plugin: si encuentras una ayuda nueva que encaje, díselo al usuario con su fuente.
5. **Seguimiento y panel.** Actualiza `_autogestor/seguimiento.json` (pendientes con fecha, quién y nivel; previsiones con importe) y, si existe, el archivo de estado del usuario. Después `generar_panel`.
6. **Resultado.** 5–8 líneas: qué es nuevo, el ahorro posible en euros y qué tiene que decidir o hacer el usuario.

No subas datos fiscales a ningún servicio externo. No envíes mensajes por el usuario. No persigas importes de unos pocos euros.
