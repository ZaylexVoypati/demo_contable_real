/**
 * SERVICIO MERCADO (vpt_mercado)
 * ==============================
 * Marketplace: órdenes, caja por almacén (CashRegister), gastos con leyenda
 * (ExpenseLegend) y nómina de mensajeros (PayrollMessenger).
 *
 * La caja del mercado (CashRegister) actúa como hub de liquidación:
 * el cliente paga la orden + el envío, y la caja liquida a las entidades
 * (negocio, conductor y VoyPati) exactamente según las reglas reales.
 */

import { randomUUID } from "node:crypto";

export const PAYMENT_METHODS = ["payment_on_delivery", "wallet", "troypay", "qvapay"];
export const LEGENDS = [
  "Alquiler de local",
  "Servicios (luz/internet)",
  "Mantenimiento de vehículos",
  "Materiales de empaque",
  "Publicidad",
];

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Crea una orden de mercado (campos reales de OrderType del panel). */
export function createOrder({
  number,
  business,
  driver,
  items = [],
  fare = 0,                       // shipping_price (tarifa del envío)
  payment_method = "payment_on_delivery",
  coupon = null,
  referral_code = null,
}) {
  const subtotal = round2(items.reduce((a, it) => a + it.price * it.quantity, 0));
  const discount = coupon ? round2((subtotal * coupon.discount_percentage) / 100) : 0;
  const total_price = round2(subtotal - discount + fare);
  const investment = round2(items.reduce((a, it) => a + (it.cost ?? 0) * it.quantity, 0));
  const products_total = round2(subtotal - discount);
  return {
    id: randomUUID(),
    number,
    business,
    driver,
    items,
    fare: round2(fare),
    subtotal,
    discount,
    total_price,
    products_total,
    investment,
    coupon,
    referral_code,
    payment_method,
    client_commission: round2(products_total * 0.1),
    messenger_profit: round2(fare * 0.9),
    status: "pending",
    is_paid: false,
    events: [{ at: new Date().toISOString(), status: "pending" }],
  };
}

/** El cliente paga en la caja del almacén (CashRegister.income). */
export function payAtCashRegister(world, cajaId, order, date) {
  const amount = round2(order.total_price);
  world.post(cajaId, {
    date, ref: `CASH-IN:${order.number}`, description: `Pago de cliente ${order.number} (${order.payment_method})`,
    lines: [
      { account: "1001", debit: amount },
      { account: "4001", credit: amount },
    ],
  });
}

/** Gasto con leyenda (ExpenseLegend) — is_automatic distingue automático/manual. */
export function registerExpense(world, cajaId, { date, legend, amount, is_automatic = false, description = "" }) {
  world.post(cajaId, {
    date, ref: `EXP:${legend}`, description: `Gasto ${is_automatic ? "automático" : "manual"} — ${legend} (${amount} CUP) ${description}`.trim(),
    lines: [
      { account: "5008", debit: amount },
      { account: "1001", credit: amount },
    ],
  });
  world.emit({ type: "market.expense.created", entity: cajaId, payload: { legend, amount, is_automatic } });
}

/** Nómina de mensajeros (PayrollMessenger) — gasto de la caja del mercado. */
export function registerPayroll(world, cajaId, { date, amount, messenger }) {
  world.post(cajaId, {
    date, ref: "PAYROLL", description: `Nómina mensajero ${messenger} — ${amount} CUP`,
    lines: [
      { account: "5008", debit: amount },
      { account: "1001", credit: amount },
    ],
  });
}

/**
 * Consolidado de mercado con la FÓRMULA REAL del panel (getMetricsAll.ts:220):
 * win = income_executed − investment + shipping − messenger_profit − commission
 */
export function consolidado(orders) {
  const paid = orders.filter((o) => o.is_paid);
  const sum = (f) => round2(paid.reduce((a, o) => a + f(o), 0));
  const total_income_executed = sum((o) => o.total_price);
  const total_investment = sum((o) => o.investment);
  const total_shipping_price = sum((o) => o.fare);
  const total_expenses_messenger_profit = sum((o) => o.messenger_profit);
  const total_expenses_commission = sum((o) => o.client_commission);
  return {
    total_expected_income: sum((o) => o.subtotal),
    total_income_executed,
    total_investment,
    total_shipping_price,
    total_expenses_messenger_profit,
    total_expenses_commission,
    total_win: round2(total_income_executed - total_investment + total_shipping_price - total_expenses_messenger_profit - total_expenses_commission),
  };
}