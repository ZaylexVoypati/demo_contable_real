/**
 * PANEL VOYPATI — contabilidad corporativa (CompanyWallet + CompanyTransaction)
 */

import { box, trialRows, plRows, fmt } from "./_render.js";

export function renderVoypati(world) {
  const t = trialRows(world, "voypati");
  const p = plRows(world, "voypati");
  const cash = world.cashByCurrency("voypati");
  const cup = cash.cup.reduce((a, m) => a + (m.kind === "in" ? m.amount : -m.amount), 0);
  const usd = cash.usd.reduce((a, m) => a + (m.kind === "in" ? m.amount : -m.amount), 0);

  const rows = [
    ` Saldo de caja: ${fmt(cup)} CUP | ${fmt(usd)} USD`,
    ` `,
    ` ESTADO DE RESULTADOS (VoyPati):`,
    ...p.rows,
    ` `,
    ` BALANCE DE COMPROBACIÓN:`,
    ...t.rows,
  ];
  return box("VOYPATI — CONTABILIDAD CORPORATIVA (CompanyWallet)", rows);
}

export function renderVoypatiEvents(world) {
  const events = world.events.filter((e) => e.type !== "market.expense.created");
  const rows = events.map((e) => ` ${e.type.padEnd(32)} ${e.entity.padEnd(16)} ${JSON.stringify(e.payload)}`);
  return box(`OUTBOX / EVENTING (${events.length} eventos de dominio — vpt-core)`, rows);
}