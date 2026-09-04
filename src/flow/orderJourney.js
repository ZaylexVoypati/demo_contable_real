/**
 * VIAJE END-TO-END DE UNA ORDEN — TODO EL ECOSISTEMA
 * ===================================================
 * Cómo hoy una orden atraviesa los servicios reales y se contabiliza en cada uno:
 *
 *  1. MERCADO  (vpt_mercado)     → el cliente paga en la caja del almacén
 *  2. EXPRESS  (vpt_express)     → el conductor entrega: gana 90% de la tarifa,
 *                                  VoyPati cobra 10% (commission_voypati)
 *  3. PROVEEDORES (vpt_proveedores) → el negocio recibe el neto (90% del total)
 *                                  tras la comisión 10% (Transaction.create_from_order)
 *  4. VOYPATI  (accounting)      → ingreso por comisiones (10% orden + 10% tarifa)
 *  5. CORE     (vpt-core)        → outbox + referidos (comisión de promotor)
 */

import * as mercado from "../services/mercado.js";
import * as express from "../services/express.js";
import * as proveedores from "../services/proveedores.js";
import * as core from "../services/core.js";

export function runOrderJourney(world, order, { cajaId, date }) {
  // 1) Cliente paga en la caja del mercado
  mercado.payAtCashRegister(world, cajaId, order, date);

  // 2) Express: entrega → 90% conductor + 10% VoyPati (sobre la tarifa)
  express.deliverShipment(world, order.driver, cajaId, order, date);

  // 3) Proveedores: neto 90% del total al negocio (costo vs inventario)
  proveedores.bookBusinessSale(world, order.business, order, date);

  // 4) VoyPati: comisión 10% del total de la orden
  world.post("voypati", {
    date, ref: `COMM-BIZ:${order.number}`, description: `Comisión de negocio 10% ${order.number} (${order.client_commission} CUP)`,
    lines: [
      { account: "1001", debit: order.client_commission },
      { account: "4003", credit: order.client_commission },
    ],
  });

  // 5) Caja del mercado liquida: neto al negocio + comisión a VoyPati
  const net = Math.round((order.products_total - order.client_commission) * 100) / 100;
  world.post(cajaId, {
    date, ref: `PAY-BIZ:${order.number}`, description: `Liquidación neta a ${order.business} (${net} CUP)`,
    lines: [
      { account: "5008", debit: net },
      { account: "1001", credit: net },
    ],
  });
  world.post(cajaId, {
    date, ref: `PAY-VPT-BIZ:${order.number}`, description: `Comisión negocio a VoyPati (${order.client_commission} CUP)`,
    lines: [
      { account: "5008", debit: order.client_commission },
      { account: "1001", credit: order.client_commission },
    ],
  });

  // 6) Core: outbox + referidos
  core.onOrderCompleted(world, order, { date });

  order.status = "completed";
  order.is_paid = true;
  order.events.push({ at: date, status: "completed" });
  return order;
}

/** Escenario: fabrica las órdenes del día distribuidas entre negocios y conductores. */
export function buildScenario(rnd, n) {
  const businesses = ["business:HUE1", "business:LMN", "business:CRN"];
  const drivers = ["driver:D1", "driver:D2", "driver:D3"];
  const refs = ["REF-ALEX", "REF-MARIA", null, null, null];
  const products = [
    { name: "Arroz 5kg", price: 220, cost: 155 },
    { name: "Aceite 1L", price: 90, cost: 64 },
    { name: "Detergente", price: 65, cost: 46 },
    { name: "Café 250g", price: 120, cost: 85 },
    { name: "Azúcar 1kg", price: 55, cost: 38 },
    { name: "Leche en polvo", price: 180, cost: 128 },
  ];
  const orders = [];
  const now = new Date("2026-09-04T09:00:00");
  for (let i = 1; i <= n; i++) {
    now.setMinutes(now.getMinutes() + 8 + Math.floor(rnd() * 18));
    const p = products[Math.floor(rnd() * products.length)];
    const qty = 1 + Math.floor(rnd() * 3);
    const fare = 25 + Math.floor(rnd() * 5) * 5;
    const order = mercado.createOrder({
      number: `ORD-${String(i).padStart(4, "0")}`,
      business: businesses[Math.floor(rnd() * businesses.length)],
      driver: drivers[Math.floor(rnd() * drivers.length)],
      items: [{ name: p.name, price: p.price, cost: p.cost, quantity: qty }],
      fare,
      payment_method: mercado.PAYMENT_METHODS[Math.floor(rnd() * mercado.PAYMENT_METHODS.length)],
      coupon: rnd() < 0.15 ? { code: "VOY10", discount_percentage: 10 } : null,
      referral_code: rnd() < 0.3 ? refs[Math.floor(rnd() * refs.length)] : null,
    });
    order.created_at = now.toISOString();
    orders.push(order);
  }
  return orders;
}