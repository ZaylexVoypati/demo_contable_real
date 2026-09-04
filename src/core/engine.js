/**
 * WORLD — MOTOR MULTI-ENTIDAD DEL ECOSISTEMA VOYPATI
 * ===================================================
 * Cada entidad del ecosistema tiene su propio libro mayor de partida doble:
 *   - voypati   : CompanyWallet corporativa (vpt_express/apps/accounting)
 *   - business:X: Account por negocio (vpt_proveedores/finance)
 *   - driver:X : DriverWallet por conductor (vpt_express/apps/wallets)
 *   - caja:X   : CashRegister por tienda/almacén (vpt_mercado/expense_manager)
 *
 * Toda operación se registra con asientos (Debe = Haber) en la entidad que
 * corresponde, replicando cómo los servicios reales contabilizan cada evento.
 */

import { randomUUID } from "node:crypto";

export const ACCOUNT_META = {
  voypati: {
    "1001": { name: "Caja VoyPati (CUP)", type: "asset" },
    "1002": { name: "Caja VoyPati (USD)", type: "asset" },
    "1200": { name: "Comisiones por Cobrar a Negocios", type: "asset" },
    "2001": { name: "Impuestos por Pagar", type: "liability" },
    "2200": { name: "Deuda con Mensajeros", type: "liability" },
    "3001": { name: "Capital VoyPati", type: "equity" },
    "4003": { name: "Ingresos por Comisiones", type: "revenue" },
    "4004": { name: "Otros Ingresos", type: "revenue" },
    "5002": { name: "Gasto de Mensajería (profit 90%)", type: "expense" },
    "5003": { name: "Gasto Marketing (Cupones)", type: "expense" },
    "5004": { name: "Comisiones de Promotores", type: "expense" },
    "5005": { name: "Gastos de Nómina", type: "expense" },
    "5006": { name: "Gastos Operativos", type: "expense" },
    "5007": { name: "Gastos por Impuestos", type: "expense" },
    "5008": { name: "Otros Gastos", type: "expense" },
  },
  business: {
    "1001": { name: "Caja del Negocio (CUP)", type: "asset" },
    "1100": { name: "Cuentas por Cobrar (ventas)", type: "asset" },
    "1300": { name: "Inventario de Productos", type: "asset" },
    "2200": { name: "Comisiones por Pagar a VoyPati", type: "liability" },
    "3001": { name: "Capital del Negocio", type: "equity" },
    "4001": { name: "Ingresos por Ventas", type: "revenue" },
    "5001": { name: "Costo de Mercancía (COGS)", type: "expense" },
    "5008": { name: "Otros Gastos", type: "expense" },
  },
  driver: {
    "1001": { name: "Billetera del Conductor (CUP)", type: "asset" },
    "4004": { name: "Ingresos por Entregas", type: "revenue" },
    "5008": { name: "Gastos", type: "expense" },
  },
  caja: {
    "1001": { name: "Caja / Almacén (CUP)", type: "asset" },
    "4001": { name: "Ingresos de Caja", type: "revenue" },
    "5008": { name: "Egresos de Caja (liquidaciones)", type: "expense" },
  },
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export class World {
  constructor() {
    this.ledgers = new Map(); // entityId -> { type, entries: [], accounts: {} }
    this.events = [];         // outbox / eventing (vpt-core)
  }

  ledger(entityId, type = entityId.split(":")[0]) {
    if (!this.ledgers.has(entityId)) {
      this.ledgers.set(entityId, { type, entries: [], accounts: {} });
    }
    return this.ledgers.get(entityId);
  }

  post(entityId, { date, ref, description, lines }) {
    const meta = ACCOUNT_META[entityId.split(":")[0]];
    if (!meta) throw new Error(`Tipo de entidad desconocido para "${entityId}"`);
    const ledger = this.ledger(entityId);
    const clean = lines
      .filter((l) => (l.debit ?? 0) !== 0 || (l.credit ?? 0) !== 0)
      .map((l) => ({ account: l.account, debit: round2(l.debit ?? 0), credit: round2(l.credit ?? 0) }));
    const tDebit = round2(clean.reduce((a, l) => a + l.debit, 0));
    const tCredit = round2(clean.reduce((a, l) => a + l.credit, 0));
    if (Math.abs(tDebit - tCredit) > 0.001) {
      throw new Error(`Asiento desbalanceado en ${entityId} — "${description}": ${tDebit} ≠ ${tCredit}`);
    }
    const entry = { id: randomUUID(), date, ref, description, total: tDebit, lines: clean };
    ledger.entries.push(entry);
    for (const l of clean) {
      const acc = ledger.accounts[l.account] || (ledger.accounts[l.account] = { debit: 0, credit: 0, count: 0 });
      acc.debit = round2(acc.debit + l.debit);
      acc.credit = round2(acc.credit + l.credit);
      acc.count += 1;
    }
    return entry;
  }

  /** Emitir evento de dominio al outbox (patrón Outbox de vpt-core). */
  emit({ type, entity, payload = {} }) {
    const ev = { id: randomUUID(), type, entity, payload, created_at: new Date().toISOString() };
    this.events.push(ev);
    return ev;
  }

  balances(entityId) {
    const ledger = this.ledger(entityId);
    const meta = ACCOUNT_META[ledger.type];
    const out = {};
    for (const [code, acc] of Object.entries(ledger.accounts)) {
      const m = meta[code] || { name: code, type: "asset" };
      const natural = m.type === "asset" || m.type === "expense" ? "debit" : "credit";
      out[code] = {
        code,
        name: m.name,
        type: m.type,
        debit: round2(acc.debit),
        credit: round2(acc.credit),
        balance: round2(acc.debit - acc.credit),
        natural_balance: round2(natural === "debit" ? acc.debit - acc.credit : acc.credit - acc.debit),
        count: acc.count,
      };
    }
    return out;
  }

  trialBalance(entityId) {
    const b = this.balances(entityId);
    const td = round2(Object.values(b).reduce((a, x) => a + x.debit, 0));
    const tc = round2(Object.values(b).reduce((a, x) => a + x.credit, 0));
    return { balances: b, totalDebit: td, totalCredit: tc, balanced: Math.abs(td - tc) < 0.01, entries: this.ledger(entityId).entries.length };
  }

  incomeStatement(entityId) {
    const b = this.balances(entityId);
    const byRevenue = Object.values(b).filter((x) => x.type === "revenue");
    const byExpense = Object.values(b).filter((x) => x.type === "expense");
    const revenue = round2(byRevenue.reduce((a, x) => a + x.natural_balance, 0));
    const expenses = round2(byExpense.reduce((a, x) => a + x.natural_balance, 0));
    return { revenue, expenses, net_income: round2(revenue - expenses), byRevenue, byExpense };
  }

  cashByCurrency(entityId, cupAccounts = ["1001"], usdAccounts = ["1002"]) {
    const entries = this.ledger(entityId).entries;
    const cup = [], usd = [];
    for (const e of entries) {
      for (const l of e.lines) {
        if (cupAccounts.includes(l.account)) {
          cup.push({ date: e.date, ref: e.ref, description: e.description, kind: l.debit > 0 ? "in" : "out", amount: l.debit > 0 ? l.debit : l.credit });
        } else if (usdAccounts.includes(l.account)) {
          usd.push({ date: e.date, ref: e.ref, description: e.description, kind: l.debit > 0 ? "in" : "out", amount: l.debit > 0 ? l.debit : l.credit });
        }
      }
    }
    return { cup, usd };
  }
}