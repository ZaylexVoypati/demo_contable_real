/**
 * RESUMEN FINAL DEL ECOSISTEMA
 * Métricas de todas las entidades + actividad real de GitHub (todos los repos).
 */

import { box, fmt, fmtI } from "./_render.js";
import { consolidado } from "../services/mercado.js";
import { businessSnapshot } from "../services/proveedores.js";
import { driverSnapshot } from "../services/express.js";

export function renderResumen({ world, orders, businessIds, driverIds, invoices, withdrawals, expenses, github, schema }) {
  const paid = orders.filter((o) => o.is_paid);
  const con = consolidado(orders);
  const voypati = world.incomeStatement("voypati");
  const voypatiCash = world.cashByCurrency("voypati");
  const vCup = voypatiCash.cup.reduce((a, m) => a + (m.kind === "in" ? m.amount : -m.amount), 0);

  const bizNet = businessIds.reduce((a, id) => a + businessSnapshot(world, id).net_income, 0);
  const drvWallet = driverIds.reduce((a, id) => a + driverSnapshot(world, id).wallet, 0);
  const expenseTotal = expenses.reduce((a, e) => a + e.amount, 0);
  const invoiceTotal = invoices.reduce((a, i) => a + i.total, 0);
  const withdrawalTotal = withdrawals.reduce((a, w) => a + w.amount, 0);

  const rows = [];
  const R = (label, value) => rows.push(`   ${label.padEnd(42)} ${String(value).padStart(14)}`);

  rows.push(` ── MERCADO (vpt_mercado) ──`);
  R("Órdenes procesadas", `${paid.length} de ${orders.length}`);
  R("Volumen vendido (GMV)", `${fmt(con.total_income_executed)} CUP`);
  R("Ganancia del mercado (win)", `${fmt(con.total_win)} CUP`);
  R("Gastos con leyenda", `${expenses.length} gastos · ${fmt(expenseTotal)} CUP`);
  rows.push(` ── PROVEEDORES (vpt_proveedores) ──`);
  R("Resultado neto de negocios", `${fmt(bizNet)} CUP`);
  R("Facturas de comisión emitidas", `${invoices.length} (total ${fmt(invoiceTotal)} CUP)`);
  R("Retiros de negocios", `${withdrawals.length} (total ${fmt(withdrawalTotal)} CUP)`);
  rows.push(` ── EXPRESS (vpt_express) ──`);
  R("Billeteras de conductores", `${fmt(drvWallet)} CUP`);
  rows.push(` ── VOYPATI CORPORATIVO (accounting) ──`);
  R("Ingresos por comisiones", `${fmt(voypati.revenue)} CUP`);
  R("Gastos corporativos", `${fmt(voypati.expenses)} CUP`);
  R("Resultado neto VoyPati", `${fmt(voypati.net_income)} CUP`);
  R("Saldo de caja VoyPati", `${fmt(vCup)} CUP`);
  R("ROI VoyPati (neto/ingresos)", `${fmt((voypati.revenue > 0 ? (voypati.net_income / voypati.revenue) * 100 : 0))} %`);
  rows.push(` ── GITHUB REAL (${github?.repo_count ?? 0} repos de voypati-tech) ──`);
  if (github?.repos) {
    for (const r of github.repos.slice(0, 22)) {
      if (r.error) continue;
      R(r.name, `${fmtI(r.pulls_total)} PRs · ${fmtI(r.pulls_merged)} mergeados · ${fmtI(r.commits_recent)} commits`);
    }
  }
  rows.push(` ── CORE (esquema real extraído) ──`);
  R("Modelos del core", Object.keys(schema?.models ?? {}).length + " modelos");
  R("Constantes de negocio", Object.keys(schema?.constants ?? {}).length + " (comisión 10%, profit 90%, …)");

  const title = " RESUMEN DEL ECOSISTEMA — CONTABILIDAD REAL ";
  const width = Math.min(Math.max(title.length, ...rows.map((r) => r.length)) + 4, 118);
  const bar = "─".repeat(width);
  const pad = Math.floor((width - title.length) / 2);
  const out = [`┌${bar}┐`, `│${" ".repeat(pad)}${title}${" ".repeat(width - pad - title.length)}│`, `├${bar}┤`];
  for (const r of rows) out.push(`│ ${r.padEnd(width - 2)} │`);
  out.push(`└${bar}┘`);
  return out.join("\n");
}