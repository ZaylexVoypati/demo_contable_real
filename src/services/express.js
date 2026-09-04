/**
 * SERVICIO EXPRESS (vpt_express)
 * ==============================
 * Envíos (Shipment), billeteras de conductores (DriverWallet) y la regla real
 * 90/10 sobre la tarifa:
 *   - driver_profit = base × 0.90   (serializers.py:927)
 *   - commission_voypati = base × 10% (wallets/utils.py:56)
 *
 * Liquidación de un envío completado:
 *   - Conductor: recibe el 90% de la tarifa en su billetera
 *   - VoyPati:   registra ingreso por comisión (10% de la tarifa)
 *   - Caja mercado: egresa el 90% al conductor y el 10% a VoyPati
 */

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export function deliverShipment(world, driverId, cajaId, order, date) {
  const fare = order.fare;
  const driverProfit = round2(fare * 0.9);
  const voypatiCommission = round2(fare * 0.1);

  // Conductor: 90% en su billetera
  world.post(driverId, {
    date, ref: `DRIVER:${order.number}`, description: `Entrega ${order.number} — profit conductor 90% (${driverProfit} CUP)`,
    lines: [
      { account: "1001", debit: driverProfit },
      { account: "4004", credit: driverProfit },
    ],
  });

  // VoyPati: ingreso por comisión (10% de la tarifa)
  world.post("voypati", {
    date, ref: `COMM-EXP:${order.number}`, description: `Comisión express 10% de tarifa ${order.number} (${voypatiCommission} CUP)`,
    lines: [
      { account: "1001", debit: voypatiCommission },
      { account: "4003", credit: voypatiCommission },
    ],
  });

  // Caja del mercado: egresos (90% conductor + 10% VoyPati)
  world.post(cajaId, {
    date, ref: `PAY-DRV:${order.number}`, description: `Pago a conductor ${driverId} por ${order.number}`,
    lines: [
      { account: "5008", debit: driverProfit },
      { account: "1001", credit: driverProfit },
    ],
  });
  world.post(cajaId, {
    date, ref: `PAY-VPT:${order.number}`, description: `Comisión express a VoyPati por ${order.number}`,
    lines: [
      { account: "5008", debit: voypatiCommission },
      { account: "1001", credit: voypatiCommission },
    ],
  });

  world.emit({ type: "express.shipment.delivered", entity: driverId, payload: { order: order.number, fare, driverProfit, voypatiCommission } });
  return { driverProfit, voypatiCommission };
}

export function driverSnapshot(world, driverId) {
  const b = world.balances(driverId);
  return {
    id: driverId,
    wallet: b["1001"]?.natural_balance ?? 0,
    earnings: b["4004"]?.natural_balance ?? 0,
  };
}