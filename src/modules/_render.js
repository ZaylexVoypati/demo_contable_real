/** Helpers de renderizado compartidos. */
const fmt = (n) => (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtI = (n) => (Math.round(n * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });

export function box(title, rows, width = 104) {
  const w = Math.min(Math.max(title.length, ...rows.map((r) => r.length)) + 4, width);
  const bar = "─".repeat(w);
  const pad = Math.floor((w - title.length) / 2);
  const out = [`┌${bar}┐`, `│${" ".repeat(pad)}${title}${" ".repeat(w - pad - title.length)}│`, `├${bar}┤`];
  for (const r of rows) out.push(`│ ${r.padEnd(w - 2)} │`);
  out.push(`└${bar}┘`);
  return out.join("\n");
}

export function trialRows(world, entityId) {
  const tb = world.trialBalance(entityId);
  const rows = [];
  for (const b of Object.values(tb.balances)) {
    const nat = b.type === "asset" || b.type === "expense" ? "deudora" : "acreedora";
    rows.push(` ${b.code}   ${b.name.padEnd(38)} ${fmt(b.debit).padStart(12)} ${fmt(b.credit).padStart(12)} ${fmt(b.natural_balance).padStart(10)}  ${nat}`);
  }
  rows.push(` TOTALES ${"".padEnd(38)} ${fmt(tb.totalDebit).padStart(12)} ${fmt(tb.totalCredit).padStart(12)}  ${tb.balanced ? "✔ CUADRA" : "✘ NO CUADRA"} (${tb.entries} asientos)`);
  return { rows, balanced: tb.balanced, totalDebit: tb.totalDebit, entries: tb.entries };
}

export function plRows(world, entityId) {
  const pl = world.incomeStatement(entityId);
  const rows = [];
  for (const r of pl.byRevenue) rows.push(`   Ingreso  ${r.name.padEnd(38)} ${fmt(r.natural_balance).padStart(10)} CUP`);
  for (const e of pl.byExpense) rows.push(`   Gasto    ${e.name.padEnd(38)} ${fmt(e.natural_balance).padStart(10)} CUP`);
  rows.push(`   NETO     ${"".padEnd(38)} ${fmt(pl.net_income).padStart(10)} CUP`);
  return { rows, ...pl };
}

export { fmt, fmtI };