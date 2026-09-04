/**
 * PANEL DE CONDUCTORES — DriverWallet (vpt_express/apps/wallets)
 */

import { box, fmt } from "./_render.js";
import { driverSnapshot } from "../services/express.js";

export function renderConductores(world, driverIds) {
  const rows = [];
  let totalWallet = 0;
  let totalEarn = 0;
  for (const id of driverIds) {
    const s = driverSnapshot(world, id);
    totalWallet += s.wallet;
    totalEarn += s.earnings;
    rows.push(` ${id.padEnd(12)} Billetera ${fmt(s.wallet).padStart(10)} CUP | Ingresos por entregas ${fmt(s.earnings).padStart(10)} CUP`);
  }
  rows.push(` `);
  rows.push(` TOTAL CONDUCTORES  Billeteras ${fmt(totalWallet).padStart(10)} CUP | Ingresos ${fmt(totalEarn).padStart(10)} CUP`);
  return box("CONDUCTORES — BILLETERAS (DriverWallet, 90% de tarifas)", rows);
}