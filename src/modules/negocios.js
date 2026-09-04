/**
 * PANEL DE NEGOCIOS — cuentas por negocio (vpt_proveedores/finance Account)
 */

import { box, fmt } from "./_render.js";
import { businessSnapshot } from "../services/proveedores.js";

export function renderNegocios(world, businessIds, invoices) {
  const rows = [];
  const per = businessIds.map((id) => {
    const s = businessSnapshot(world, id);
    rows.push(` ${id.padEnd(16)} Caja ${fmt(s.caja).padStart(10)} | Ventas ${fmt(s.ventas).padStart(10)} | COGS ${fmt(s.cogs).padStart(8)} | Inv. ${fmt(s.inventario).padStart(8)} | Neto ${fmt(s.net_income).padStart(10)} | ${s.balanced ? "✔" : "✘"}`);
    return s;
  });
  rows.push(` `);
  rows.push(` FACTURAS DE COMISIÓN EMITIDAS (Invoice FAC-2026-XXXXX):`);
  for (const inv of invoices) {
    rows.push(`   ${inv.number}  ${inv.business.padEnd(24)} subtotal ${fmt(inv.subtotal).padStart(9)} + impuesto ${fmt(inv.tax_amount).padStart(6)} = ${fmt(inv.total).padStart(9)} CUP`);
  }
  return box("NEGOCIOS — CUENTAS FINANCIERAS (PROVEEDORES)", rows);
}