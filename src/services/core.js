/**
 * SERVICIO CORE (vpt-core)
 * ========================
 * Eventing/Outbox (patrón real de vpt-core) y referidos (ReferralRule):
 * cuando una orden se completa se emiten eventos que otros servicios consumen;
 * los códigos de referido activan la comisión de promotor (porcentaje sobre
 * la comisión de la orden), como en PlatformCommissionConfig.
 */

/** Registra la orden completada en el outbox y procesa referidos. */
export function onOrderCompleted(world, order, { date }) {
  world.emit({ type: "orders.order.completed", entity: "mercado", payload: { order: order.number, total: order.total_price, referral: order.referral_code } });

  // Si hay referido → comisión de promotor (pct sobre la comisión de la orden)
  if (order.referral_code) {
    const pct = 0.05; // 5% sobre la comisión VoyPati (PlatformCommissionConfig.promotor_commission)
    const amount = Math.round(order.client_commission * pct * 100) / 100;
    world.post("voypati", {
      date, ref: `PROMO:${order.referral_code}`, description: `Comisión de promotor ${pct * 100}% (referido ${order.referral_code}) — ${amount} CUP`,
      lines: [
        { account: "5004", debit: amount },
        { account: "1001", credit: amount },
      ],
    });
    world.emit({ type: "core.referral.claimed", entity: "core", payload: { code: order.referral_code, amount } });
  }
}