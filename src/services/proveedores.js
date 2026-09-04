/**
 * SERVICIO PROVEEDORES (vpt_proveedores)
 * ======================================
 * Negocios, cuentas financieras (Account), transacciones (Transaction),
 * facturas de comisión (Invoice FAC-2026-XXXXX) y retiros (Withdrawal).
 *
 * Cuando una orden se completa: Transaction.create_from_order()
 *   gross = order.total_price · commission = 10% · net = gross − commission
 *   Account.update_balance(net, commission)
 */

let invoiceSeq = 1;
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Apertura de un negocio: capital inicial. */
export function openBusiness(world, businessId, { capital_cup = 0 }) {
  if (capital_cup > 0) {
    world.post(businessId, {
      date: "2026-09-04T08:00:00", ref: "CAPITAL", description: `Aporte inicial de capital ${businessId}`,
      lines: [
        { account: "1001", debit: capital_cup },
        { account: "3001", credit: capital_cup },
      ],
    });
  }
}

/** Aporta inventario inicial al negocio. */
export function seedInventory(world, businessId, { amount_cup = 0 }) {
  if (amount_cup > 0) {
    world.post(businessId, {
      date: "2026-09-04T08:10:00", ref: "INV-SEED", description: `Inventario inicial ${businessId}`,
      lines: [
        { account: "1300", debit: amount_cup },
        { account: "1001", credit: amount_cup },
      ],
    });
  }
}

/**
 * Liquidación de venta al negocio: el negocio recibe el NETO de sus productos
 * (90% del valor de productos, tras la comisión 10%). La tarifa del envío es
 * del conductor/VoyPati, no del negocio.
 */
export function bookBusinessSale(world, businessId, order, date) {
  const net = round2(order.products_total - order.client_commission);
  world.post(businessId, {
    date, ref: `SALE:${order.number}`, description: `Liquidación venta ${order.number} (neto ${net} CUP tras comisión 10%)`,
    lines: [
      { account: "1001", debit: net },
      { account: "4001", credit: net },
    ],
  });
  world.post(businessId, {
    date, ref: `COGS:${order.number}`, description: `Costo de mercancía ${order.number}`,
    lines: [
      { account: "5001", debit: order.investment },
      { account: "1300", credit: order.investment },
    ],
  });
}

/** Emite factura de comisiones (Invoice real: FAC-2026-XXXXX, subtotal, tax, total). */
export function issueInvoice(world, voypatiId, { date, business, commission_subtotal, tax_percentage = 5 }) {
  const tax_amount = round2((commission_subtotal * tax_percentage) / 100);
  const number = `FAC-2026-${String(invoiceSeq++).padStart(5, "0")}`;
  // La comisión ya se liquidó en efectivo; la factura documenta el cobro formal.
  world.emit({ type: "finance.invoice.issued", entity: voypatiId, payload: { number, business, commission_subtotal, tax_amount } });
  return { number, business, subtotal: round2(commission_subtotal), tax_percentage, tax_amount, total: round2(commission_subtotal + tax_amount), status: "issued", issue_date: date };
}

/** Retiro del negocio (Withdrawal real: pending→approved→completed). */
export function withdrawal(world, businessId, { date, amount, payment_method = "transfer" }) {
  world.post(businessId, {
    date, ref: `WITHDRAW:${amount}`, description: `Retiro del negocio ${businessId} — ${amount} CUP (${payment_method})`,
    lines: [
      { account: "3001", debit: amount },
      { account: "1001", credit: amount },
    ],
  });
  return { business: businessId, amount, payment_method, status: "completed" };
}

/** Estado financiero del negocio (resumen de su Account real). */
export function businessSnapshot(world, businessId) {
  const b = world.balances(businessId);
  const tb = world.trialBalance(businessId);
  const pl = world.incomeStatement(businessId);
  return {
    id: businessId,
    caja: b["1001"]?.natural_balance ?? 0,
    ventas: b["4001"]?.natural_balance ?? 0,
    cogs: b["5001"]?.natural_balance ?? 0,
    inventario: b["1300"]?.natural_balance ?? 0,
    net_income: pl.net_income,
    balanced: tb.balanced,
  };
}