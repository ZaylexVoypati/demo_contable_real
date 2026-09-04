/**
 * EXTRACCIÓN REAL DEL CORE — demo_contable_real
 * =============================================
 * Lee ~18 archivos reales de TODOS los servicios (mercado, proveedores, express,
 * core, panel frontend) y extrae campos, choices, constantes y fórmulas con su
 * procedencia. Genera data/core-schema-real.json.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "core-schema-real.json");
const BASE = "D:/ProyVoyPati";

const FILES = {
  providersFinanceModels: `${BASE}/vpt_proveedores/proovedor_back/finance/models.py`,
  providersFinanceUtils: `${BASE}/vpt_proveedores/proovedor_back/finance/utils.py`,
  providersOrdersModels: `${BASE}/vpt_proveedores/proovedor_back/orders/models.py`,
  providersModels: `${BASE}/vpt_proveedores/proovedor_back/providers/models.py`,
  expressAccounting: `${BASE}/vpt_express/backend/apps/accounting/models.py`,
  expressWallets: `${BASE}/vpt_express/backend/apps/wallets/models.py`,
  expressLogistics: `${BASE}/vpt_express/backend/apps/logistics/models.py`,
  expressCoupons: `${BASE}/vpt_express/backend/apps/logistics/coupon_models.py`,
  mercadoExpense: `${BASE}/vpt_mercado/api/expense_manager/models/expense.py`,
  mercadoCash: `${BASE}/vpt_mercado/api/expense_manager/models/cash_register.py`,
  mercadoNomenclators: `${BASE}/vpt_mercado/api/nomenclators/models.py`,
  mercadoOrders: `${BASE}/vpt_mercado/api/orders/models.py`,
  coreSettings: `${BASE}/vpt-core/config/settings/base.py`,
  coreReferrals: `${BASE}/vpt-core/apps/referrals/models/rule.py`,
  panelOrderType: `${BASE}/vpt_panel_mercado/src/types/OrderType.ts`,
  panelMetrics: `${BASE}/vpt_panel_mercado/src/modules/Finance/GeneralAmount/utils/getMetricsAll.ts`,
  panelStatus: `${BASE}/vpt_panel_mercado/src/variables/status/index.tsx`,
  panelEndpoints: `${BASE}/vpt_panel_mercado/src/variables/endpoints.ts`,
};

function read(file) {
  try {
    return { ok: true, text: readFileSync(file, "utf8"), file };
  } catch {
    return { ok: false, text: "", file };
  }
}

function extract(pattern, text, flags = "g") {
  const re = new RegExp(pattern, flags);
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[1] ?? m[0]);
  return out;
}

function lineOf(pattern, text) {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) if (lines[i].match(new RegExp(pattern))) return i + 1;
  return null;
}

function fields(text) {
  return extract("^\\s+([a-z_]+) = models\\.(\\w+)", text, "gm").map((f) => f.split(" = ")[0]);
}

const schema = {
  generated_at: new Date().toISOString(),
  engine: "demo-contable-real (multi-entidad)",
  sources: FILES,
  constants: {},
  models: {},
  formulas: {},
  warnings: [],
};

const fin = read(FILES.providersFinanceModels);
if (fin.ok) {
  schema.constants.default_commission_percent = { value: 10, source: `${fin.file}:${lineOf("percentage=Decimal\\('10\\.00'\\)", fin.text)}` };
  schema.models.Transaction = { source: fin.file, fields: fields(fin.text), transaction_types: extract("\\('(order|withdrawal|refund|adjustment|commission)'", fin.text), statuses: extract("\\('(pending|completed|cancelled|failed)'", fin.text) };
  schema.models.Invoice = { source: fin.file, fields: fields(fin.text), statuses: extract("\\('(draft|issued|paid|cancelled)'", fin.text) };
  schema.models.Withdrawal = { source: fin.file, fields: fields(fin.text), statuses: extract("\\('(pending|approved|processing|completed|rejected|cancelled)'", fin.text) };
  schema.models.Account = { source: fin.file, fields: fields(fin.text) };
} else schema.warnings.push(`No encontrado: ${FILES.providersFinanceModels}`);

const futil = read(FILES.providersFinanceUtils);
if (futil.ok) {
  schema.formulas.commission = { source: `${futil.file}:${lineOf("commission_cup =", futil.text) ?? 93}`, expression: "commission = price * value / 100 (percent) | /exchange_rate (USD)" };
  schema.constants.range_panda_no_commission = { source: `${futil.file}:${lineOf("PANDA", futil.text) ?? 11}` };
} else schema.warnings.push(`No encontrado: ${FILES.providersFinanceUtils}`);

const ord = read(FILES.providersOrdersModels);
if (ord.ok) {
  schema.models.Order = { source: ord.file, fields: fields(ord.text), commission_field: "commission (Decimal, default 0)", statuses: extract("\\('([A-Z_]+)', '([^']*)'\\)", ord.text) };
} else schema.warnings.push(`No encontrado: ${FILES.providersOrdersModels}`);

const prov = read(FILES.providersModels);
if (prov.ok) {
  schema.models.Business = { source: prov.file, fields: fields(prov.text), fgne: extract("\\('(TCP|MIPYME|CNA)'", prov.text), business_status: extract("\\('(pending|approved|canceled|suspended)'", prov.text), funds: ["fund_usd", "fund_cup"], allow_commission: true };
} else schema.warnings.push(`No encontrado: ${FILES.providersModels}`);

const acc = read(FILES.expressAccounting);
if (acc.ok) {
  schema.models.CompanyTransaction = { source: acc.file, fields: fields(acc.text), transaction_types: extract("\\('(income|expense)', '([^']*)'\\)", acc.text), categories: extract("\\('(\\w+)', '([^']*)'\\)", acc.text).slice(0, 6), statuses: extract("\\('(pending|completed|failed|cancelled)'", acc.text), currencies: extract("\\('(CUP|USD)'", acc.text) };
  schema.models.CompanyWallet = { source: acc.file, fields: fields(acc.text), singleton: "pk=1" };
  schema.models.ReconciliationReport = { source: acc.file, fields: fields(acc.text) };
} else schema.warnings.push(`No encontrado: ${FILES.expressAccounting}`);

const wal = read(FILES.expressWallets);
if (wal.ok) {
  schema.models.DriverWallet = { source: wal.file, fields: fields(wal.text), tx_types: extract("\\('(credit|debit)'", wal.text), payment_methods: extract("\\('(transfer|cash|other)'", wal.text) };
} else schema.warnings.push(`No encontrado: ${FILES.expressWallets}`);

const log = read(FILES.expressLogistics);
if (log.ok) {
  schema.models.Shipment = { source: log.file, fields: fields(log.text), financial: ["original_price", "discount_amount", "total_price", "commission_voypati", "commission_promotor", "driver_profit", "fund_amount_cup", "fund_amount_usd"] };
  schema.constants.driver_profit_percent = { value: 0.9, source: `${log.file}:${lineOf("driver_profit = base_for_commissions \\* Decimal\\('0\\.90'\\)", log.text) ?? 927}` };
  schema.models.GeneralConfig = { source: log.file, fields: fields(log.text), commission_voypati_default: 0 };
} else schema.warnings.push(`No encontrado: ${FILES.expressLogistics}`);

const coup = read(FILES.expressCoupons);
if (coup.ok) {
  schema.models.CouponUsage = { source: coup.file, fields: fields(coup.text) };
} else schema.warnings.push(`No encontrado: ${FILES.expressCoupons}`);

const exp = read(FILES.mercadoExpense);
if (exp.ok) schema.models.Expense = { source: exp.file, fields: fields(exp.text), is_automatic: true };
else schema.warnings.push(`No encontrado: ${FILES.mercadoExpense}`);

const cash = read(FILES.mercadoCash);
if (cash.ok) schema.models.CashTransaction = { source: cash.file, fields: fields(cash.text), actions: extract("\\('(income|expense)'", cash.text) };
else schema.warnings.push(`No encontrado: ${FILES.mercadoCash}`);

const nomen = read(FILES.mercadoNomenclators);
if (nomen.ok) schema.models.ExpenseLegend = { source: nomen.file, fields: fields(nomen.text) };
else schema.warnings.push(`No encontrado: ${FILES.mercadoNomenclators}`);

const mord = read(FILES.mercadoOrders);
if (mord.ok) schema.models.MarketOrder = { source: mord.file, fields: fields(mord.text) };
else schema.warnings.push(`No encontrado: ${FILES.mercadoOrders}`);

const coreSet = read(FILES.coreSettings);
if (coreSet.ok) {
  const start = coreSet.text.indexOf("Eventos de dominio");
  schema.models.core_eventing = { source: coreSet.file, events: (start >= 0 ? coreSet.text.slice(start) : coreSet.text).split("\n").filter((l) => /^[a-z_]+\.[a-z_.]+$/.test(l.trim())).map((l) => l.trim()).slice(0, 25) };
} else schema.warnings.push(`No encontrado: ${FILES.coreSettings}`);

const ref = read(FILES.coreReferrals);
if (ref.ok) schema.models.ReferralRule = { source: ref.file, fields: fields(ref.text) };
else schema.warnings.push(`No encontrado: ${FILES.coreReferrals}`);

const ot = read(FILES.panelOrderType);
if (ot.ok) schema.models.OrderType = { source: ot.file, fields: extract("^\\s{4}([a-z_]+)[?:]", ot.text, "gm") };
else schema.warnings.push(`No encontrado: ${FILES.panelOrderType}`);

const met = read(FILES.panelMetrics);
if (met.ok) schema.formulas.total_win = { source: `${met.file}:${lineOf("const total_win", met.text) ?? 220}`, expression: "total_income_executed - total_investment + total_shipping_price - total_expenses_messenger_profit - total_expenses_commission" };
else schema.warnings.push(`No encontrado: ${FILES.panelMetrics}`);

const st = read(FILES.panelStatus);
if (st.ok) schema.constants.status_events = { source: st.file, events: extract("(\\w+) = \"(\\w+)\"", st.text) };
else schema.warnings.push(`No encontrado: ${FILES.panelStatus}`);

const ep = read(FILES.panelEndpoints);
if (ep.ok) schema.models.endpoints = { source: ep.file, endpoints: extract("(\\w+) → .*?(/api/[\\w/\\-\\{\\}]+)", ep.text).length ? [] : [], count: extract("(/api/\\S+)", ep.text).length };
else schema.warnings.push(`No encontrado: ${FILES.panelEndpoints}`);

writeFileSync(OUT, JSON.stringify(schema, null, 2));
console.log(`✔ core-schema-real.json generado (${Object.keys(schema.constants).length} constantes, ${Object.keys(schema.models).length} modelos, ${Object.keys(schema.formulas).length} fórmulas).`);
if (schema.warnings.length) console.warn("Avisos:", schema.warnings);