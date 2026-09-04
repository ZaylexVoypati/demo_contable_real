/**
 * PANEL CAJA DEL MERCADO — CashRegister + Consolidado real (getMetricsAll)
 */

import { box, fmt } from "./_render.js";
import { consolidado } from "../services/mercado.js";

export function renderCaja(world, cajaId, orders) {
  const b = world.balances(cajaId);
  const cash = world.cashByCurrency(cajaId);
  const cup = cash.cup.reduce((a, m) => a + (m.kind === "in" ? m.amount : -m.amount), 0);
  const con = consolidado(orders);

  const rows = [
    ` Caja / Almacén ${cajaId}`,
    `   Saldo caja (CUP): ${fmt(cup)}   (debe cuadrar a ~0: es el hub de liquidación)`,
    `   Ingresos de caja: ${fmt(b["4001"]?.natural_balance ?? 0)} CUP`,
    `   Egresos (liquidaciones): ${fmt(b["5008"]?.natural_balance ?? 0)} CUP`,
    ` `,
    ` CONSOLIDADO DE MERCADO (fórmula real getMetricsAll.ts:220):`,
    `   Ingreso esperado        ${fmt(con.total_expected_income).padStart(10)} CUP`,
    `   Ingreso ejecutado       ${fmt(con.total_income_executed).padStart(10)} CUP`,
    `   Inversión (costos)      ${fmt(con.total_investment).padStart(10)} CUP`,
    `   Cobro de mensajería     ${fmt(con.total_shipping_price).padStart(10)} CUP`,
    `   Profit mensajeros       ${fmt(con.total_expenses_messenger_profit).padStart(10)} CUP`,
    `   Comisión VoyPati        ${fmt(con.total_expenses_commission).padStart(10)} CUP`,
    `   GANANCIA (win)          ${fmt(con.total_win).padStart(10)} CUP`,
  ];
  return box("CAJA DEL MERCADO (CASH REGISTER) + CONSOLIDADO", rows);
}

/** GASTOS del mercado con leyendas reales (ExpenseLegend). */
export function renderGastosMercado(expenses) {
  const rows = expenses.map((e) =>
    ` ${e.legend.padEnd(28)} ${fmt(e.amount).padStart(9)} CUP  ${e.is_automatic ? "automático" : "manual"}   ${e.description}`
  );
  const total = expenses.reduce((a, e) => a + e.amount, 0);
  rows.push(` TOTAL GASTOS ${fmt(total).padStart(9)} CUP`);
  return box("GASTOS DEL MERCADO (ExpenseLegend + is_automatic)", rows);
}