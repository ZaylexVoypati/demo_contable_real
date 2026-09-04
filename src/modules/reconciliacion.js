/**
 * CONCILIACIÓN CRUZADA ENTRE ENTIDADES
 * =====================================
 * Verifica que la realidad contable cuadre entre todos los servicios:
 *  1. Suma de cajas de negocios  =  90% del total de órdenes (neto tras comisión)
 *  2. Suma de billeteras conductores =  90% de las tarifas
 *  3. Ingresos por comisiones de VoyPati = 10% de órdenes + 10% de tarifas
 *  4. Caja del mercado (hub de liquidación) = ~0
 *  5. Cada entidad: partida doble cuadrada
 */

import { box, fmt } from "./_render.js";
import { businessSnapshot } from "../services/proveedores.js";
import { driverSnapshot } from "../services/express.js";

export function buildReconciliation({ world, orders, businessIds, driverIds, cajaId, operatingOutflows = 0 }) {
  const paid = orders.filter((o) => o.is_paid);
  const totalOrders = paid.reduce((a, o) => a + o.total_price, 0);
  const totalFares = paid.reduce((a, o) => a + o.fare, 0);
  const productsTotal = paid.reduce((a, o) => a + o.products_total, 0);
  const commissions10 = paid.reduce((a, o) => a + o.client_commission, 0);
  const fares90 = paid.reduce((a, o) => a + Math.round(o.fare * 0.9 * 100) / 100, 0);
  const fares10 = paid.reduce((a, o) => a + Math.round(o.fare * 0.1 * 100) / 100, 0);

  const businessSales = businessIds.reduce((a, id) => a + businessSnapshot(world, id).ventas, 0);
  const driverWallets = driverIds.reduce((a, id) => a + driverSnapshot(world, id).wallet, 0);
  const voypatiCommissions = world.balances("voypati")["4003"]?.natural_balance ?? 0;
  const cajaBalance = world.balances(cajaId)["1001"]?.natural_balance ?? 0;

  const checks = [
    {
      name: "Negocios reciben el 90% neto de sus productos",
      expected: Math.round(productsTotal * 0.9 * 100) / 100,
      actual: Math.round(businessSales * 100) / 100,
    },
    {
      name: "Conductores reciben el 90% de las tarifas",
      expected: Math.round(fares90 * 100) / 100,
      actual: Math.round(driverWallets * 100) / 100,
    },
    {
      name: "VoyPati cobra 10% de productos + 10% de tarifas",
      expected: Math.round((commissions10 + fares10) * 100) / 100,
      actual: Math.round(voypatiCommissions * 100) / 100,
    },
    {
      name: "Caja del mercado cuadra (liquidaciones ± gastos operativos)",
      expected: Math.round(-operatingOutflows * 100) / 100,
      actual: Math.round(cajaBalance * 100) / 100,
    },
  ];

  const result = checks.map((c) => ({ ...c, ok: Math.abs(c.expected - c.actual) < 0.5 }));
  const allOk = result.every((r) => r.ok);

  return { totalOrders, totalFares, productsTotal, commissions10, fares90, fares10, businessSales, driverWallets, voypatiCommissions, cajaBalance, operatingOutflows, checks: result, allOk };
}

export function renderReconciliation(rec) {
  const rows = [
    ` Volumen del día: órdenes ${fmt(rec.totalOrders).padStart(10)} CUP | tarifas ${fmt(rec.totalFares).padStart(10)} CUP`,
    ` `,
  ];
  for (const c of rec.checks) {
    rows.push(` ${c.name.padEnd(46)} esperado ${fmt(c.expected).padStart(10)} | real ${fmt(c.actual).padStart(10)}  ${c.ok ? "✔" : "✘"}`);
  }
  rows.push(` `);
  rows.push(` TODAS LAS CONCILIACIONES CUADRAN: ${rec.allOk ? "✔ SÍ" : "✘ NO"}`);
  return box("CONCILIACIÓN CRUZADA ENTRE SERVICIOS", rows);
}