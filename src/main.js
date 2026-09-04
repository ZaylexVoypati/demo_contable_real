#!/usr/bin/env node
/**
 * DEMO CONTABLE REAL — CLI
 *   node src/main.js            → día completo del ecosistema
 *   node src/main.js extract    → regenera data/core-schema-real.json
 *   node src/main.js github     → regenera data/github-org-snapshot.json
 */

import { runEcosystemDay } from "./simulate.js";

const cmd = process.argv[2] ?? "demo";

console.log(`
  ╔═══════════════════════════════════════════════════════════════╗
  ║  DEMO CONTABLE REAL — TODO EL ECOSISTEMA VOYPATI              ║
  ║  Mercado · Proveedores · Express · Core · Accounting          ║
  ╚═══════════════════════════════════════════════════════════════╝`);

switch (cmd) {
  case "extract":
    await import("../scripts/extract-core-real.js");
    break;
  case "github":
    await import("../scripts/github-org-snapshot.js");
    break;
  case "demo":
  case "day":
    await runEcosystemDay();
    break;
  default:
    console.log(`Comando desconocido: "${cmd}"`);
    console.log("Usa: demo | day | extract | github");
}