/**
 * DÍA COMPLETO DEL ECOSISTEMA — CONTABILIDAD REAL
 * ================================================
 * Orquesta todos los servicios como en producción:
 *   mercado (órdenes/caja) → proveedores (negocios) → express (conductores)
 *   → core (eventos/referidos) → accounting corporativo VoyPati
 *
 *  1) Esquema real del core (18 archivos)
 *  2) Todos los repos de voypati-tech (GitHub org-wide)
 *  3) Apertura de entidades (VoyPati, negocios, conductores, caja)
 *  4) 30 órdenes que viajan por todo el sistema (liquidación entre entidades)
 *  5) Operaciones: gastos con leyenda, nómina, cupones, impuestos,
 *     facturas de comisión (FAC-2026) y retiros de negocios
 *  6) Paneles por entidad + conciliación cruzada + resumen final
 */

import { World } from "./core/engine.js";
import { loadCoreSchema, coreConstant } from "./lib/coreData.js";
import { fetchOrgSnapshot } from "./lib/github.js";
import { runOrderJourney, buildScenario } from "./flow/orderJourney.js";
import * as mercado from "./services/mercado.js";
import * as proveedores from "./services/proveedores.js";
import { renderVoypati, renderVoypatiEvents } from "./modules/voypati.js";
import { renderNegocios } from "./modules/negocios.js";
import { renderConductores } from "./modules/conductores.js";
import { renderCaja, renderGastosMercado } from "./modules/caja.js";
import { buildReconciliation, renderReconciliation } from "./modules/reconciliacion.js";
import { renderResumen } from "./modules/resumen.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "output");

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export async function runEcosystemDay({ seed = 20260904, nOrders = 30, github = true } = {}) {
  const rnd = mulberry32(seed);
  const world = new World();
  const day = "2026-09-04";

  console.log("\n╔════════════════════════════════════════════════════════════════════════╗");
  console.log("║  DÍA REAL DEL ECOSISTEMA VOYPATI — CONTABILIDAD MULTI-ENTIDAD         ║");
  console.log("╚════════════════════════════════════════════════════════════════════════╝");

  // 1) Core real
  const schema = loadCoreSchema();
  if (schema.warning) console.warn(`\n⚠ ${schema.warning}`);
  const commissionPct = coreConstant(schema, "default_commission_percent");
  const profitPct = coreConstant(schema, "driver_profit_percent");
  console.log(`\n[1/7] Esquema real del core (${Object.keys(schema.models ?? {}).length} modelos):`);
  console.log(`   · Comisión VoyPati ${commissionPct}% · Profit conductor ${profitPct * 100}% · Modelos: ${Object.keys(schema.models ?? {}).join(", ")}`);

  // 2) GitHub org-wide
  let githubSnapshot = null;
  if (github) {
    try {
      console.log(`\n[2/7] GitHub MCP — TODOS los repos de voypati-tech...`);
      githubSnapshot = await fetchOrgSnapshot({ save: true });
      console.log(`   · ${githubSnapshot.repo_count} repositorios reales`);
    } catch (err) {
      console.warn(`   · GitHub no disponible (${err.message})`);
    }
  }

  // 3) Apertura de entidades
  console.log(`\n[3/7] Apertura de entidades...`);
  world.post("voypati", { date: `${day}T08:00:00`, ref: "CAPITAL", description: "Capital de VoyPati", lines: [{ account: "1001", debit: 12000 }, { account: "3001", credit: 12000 }] });
  world.post("voypati", { date: `${day}T08:00:00`, ref: "CAPITAL-USD", description: "Capital de VoyPati (USD)", lines: [{ account: "1002", debit: 500 }, { account: "3001", credit: 500 }] });
  for (const b of ["business:HUE1", "business:LMN", "business:CRN"]) {
    proveedores.openBusiness(world, b, { capital_cup: 5000 });
    proveedores.seedInventory(world, b, { amount_cup: 3000 });
  }
  console.log(`   · voypati + 3 negocios + 3 conductores + 1 caja de almacén`);

  // 4) Órdenes del día → viaje por todo el sistema
  console.log(`\n[4/7] ${nOrders} órdenes recorriendo el ecosistema (mercado→proveedores→express→core)...`);
  const orders = buildScenario(rnd, nOrders);
  const expenses = [];
  for (const order of orders) {
    const date = order.created_at;
    runOrderJourney(world, order, { cajaId: "caja:M1", date });
    console.log(`   ✓ ${order.number} ${order.business} → ${order.driver} | total ${order.total_price} CUP | comisión ${order.client_commission} | tarifa ${order.fare} (90% conductor)`);
  }

  // 5) Operaciones corporativas y del mercado
  console.log(`\n[5/7] Operaciones del día...`);
  // Gastos del mercado con leyendas reales
  expenses.push({ legend: "Alquiler de local", amount: 250, is_automatic: false, description: "gasto fijo mensual" });
  expenses.push({ legend: "Servicios (luz/internet)", amount: 120, is_automatic: false, description: "factura servicios" });
  expenses.push({ legend: "Materiales de empaque", amount: 60, is_automatic: true, description: "consumo del día" });
  for (const e of expenses) mercado.registerExpense(world, "caja:M1", { date: `${day}T10:00:00`, ...e });
  // Nómina de mensajeros
  mercado.registerPayroll(world, "caja:M1", { date: `${day}T18:00:00`, amount: 300, messenger: "D1" });
  mercado.registerPayroll(world, "caja:M1", { date: `${day}T18:00:00`, amount: 280, messenger: "D2" });
  mercado.registerPayroll(world, "caja:M1", { date: `${day}T18:00:00`, amount: 250, messenger: "D3" });
  // VoyPati: cupones (suma de descuentos reales)
  const couponTotal = round2(orders.filter((o) => o.is_paid && o.discount > 0).reduce((a, o) => a + o.discount, 0));
  if (couponTotal > 0) world.post("voypati", { date: `${day}T14:00:00`, ref: "COUPONS", description: `Subsidio de cupones del día (${couponTotal} CUP)`, lines: [{ account: "5003", debit: couponTotal }, { account: "1001", credit: couponTotal }] });
  // VoyPati: gastos operativos e impuestos
  world.post("voypati", { date: `${day}T09:00:00`, ref: "OPEX", description: "Gastos operativos VoyPati (servidores, oficina)", lines: [{ account: "5006", debit: 400 }, { account: "1001", credit: 400 }] });
  world.post("voypati", { date: `${day}T16:00:00`, ref: "TAX", description: "Devengo de impuesto", lines: [{ account: "5007", debit: 90 }, { account: "2001", credit: 90 }] });
  world.post("voypati", { date: `${day}T16:30:00`, ref: "TAX-PAY", description: "Pago parcial de impuesto", lines: [{ account: "2001", debit: 45 }, { account: "1001", credit: 45 }] });

  // Facturas de comisión por negocio (Invoice FAC-2026-XXXXX)
  const invoices = [];
  const byBusiness = {};
  for (const o of orders.filter((x) => x.is_paid)) (byBusiness[o.business] = byBusiness[o.business] || []).push(o.client_commission);
  for (const [b, list] of Object.entries(byBusiness)) {
    const sub = round2(list.reduce((a, x) => a + x, 0));
    invoices.push(proveedores.issueInvoice(world, "voypati", { date: `${day}T17:00:00`, business: b, commission_subtotal: sub, tax_percentage: 5 }));
  }

  // Retiros de negocios
  const withdrawals = [];
  withdrawals.push(proveedores.withdrawal(world, "business:HUE1", { date: `${day}T19:00:00`, amount: 800 }));
  withdrawals.push(proveedores.withdrawal(world, "business:LMN", { date: `${day}T19:05:00`, amount: 500 }));

  // 6) Paneles
  console.log(`\n[6/7] Paneles por entidad...`);
  console.log(renderVoypati(world));
  console.log("\n" + renderNegocios(world, ["business:HUE1", "business:LMN", "business:CRN"], invoices));
  console.log("\n" + renderConductores(world, ["driver:D1", "driver:D2", "driver:D3"]));
  console.log("\n" + renderCaja(world, "caja:M1", orders));
  console.log("\n" + renderGastosMercado(expenses));
  console.log("\n" + renderVoypatiEvents(world));

  const reconciliation = buildReconciliation({ world, orders, businessIds: ["business:HUE1", "business:LMN", "business:CRN"], driverIds: ["driver:D1", "driver:D2", "driver:D3"], cajaId: "caja:M1", operatingOutflows: 430 + 830 });
  console.log("\n" + renderReconciliation(reconciliation));

  // 7) Resumen
  console.log(`\n[7/7] Resumen final:`);
  console.log(renderResumen({ world, orders, businessIds: ["business:HUE1", "business:LMN", "business:CRN"], driverIds: ["driver:D1", "driver:D2", "driver:D3"], invoices, withdrawals, expenses, github: githubSnapshot, schema }));

  // Persistir
  mkdirSync(OUT_DIR, { recursive: true });
  const report = {
    generated_at: new Date().toISOString(),
    seed, nOrders,
    core_schema: schema,
    github: githubSnapshot,
    orders,
    invoices,
    withdrawals,
    expenses,
    events: world.events,
    reconciliation: { ...reconciliation, checks: undefined },
    entities: Object.fromEntries([...world.ledgers.entries()].map(([k, v]) => [k, { type: v.type, entries: v.entries.length, accounts: v.accounts }])),
  };
  writeFileSync(join(OUT_DIR, "dia-ecosistema.json"), JSON.stringify(report, null, 2));
  console.log(`\nReporte completo: output/dia-ecosistema.json`);
  return report;
}

// Ejecución directa
import { pathToFileURL } from "node:url";
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  runEcosystemDay().catch((err) => { console.error(err); process.exit(1); });
}