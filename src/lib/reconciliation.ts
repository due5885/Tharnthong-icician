import { DeliveryRecord, IceProduct, RouteItem, RouteType, TruckStockRecord } from '../types';

export interface RouteReconciliation {
  truckRecordId: string;
  routeId: string;
  routeName: string;
  routeType: RouteType;
  timeRound: string;
  shift: string;
  expectedFromStock: number;
  billedCash: number;
  billedDebt: number;
  billedCredit: number;
  billedOther: number;
  billedTotal: number;
  cashExpected: number;
  cashCollected: number;
  stockVsBilledVariance: number;
  cashVsCollectedVariance: number;
}

function isCashLikeStatus(status: DeliveryRecord['status']): boolean {
  return status === 'Cash' || status === 'NewAndOld' || status === 'OldPayment';
}

export function buildRouteReconciliations(
  date: string,
  truckRecords: TruckStockRecord[],
  deliveries: DeliveryRecord[],
  products: IceProduct[],
  routes: RouteItem[]
): RouteReconciliation[] {
  const todaysTruckRecords = truckRecords.filter((r) => r.date === date);
  const todaysDeliveries = deliveries.filter((d) => d.date === date);

  return todaysTruckRecords.map((rec) => {
    let expectedFromStock = 0;
    products.forEach((p) => {
      const loaded = rec.loadedQuantities[p.key] || 0;
      const returned = rec.returnedQuantities[p.key] || 0;
      const sold = Math.max(0, loaded - returned);
      expectedFromStock += sold * p.pricePerUnit;
    });

    const matchedDeliveries = todaysDeliveries.filter(
      (d) => d.routeId === rec.routeId && d.timeRound === rec.timeRound
    );

    let billedCash = 0;
    let billedDebt = 0;
    let billedCredit = 0;
    let billedOther = 0;
    let cashExpected = 0;

    matchedDeliveries.forEach((d) => {
      if (d.status === 'Cash') billedCash += d.totalAmount;
      else if (d.status === 'Debt') billedDebt += d.totalAmount;
      else if (d.status === 'Credit') billedCredit += d.totalAmount;
      else billedOther += d.totalAmount;

      if (isCashLikeStatus(d.status)) cashExpected += d.totalAmount;
    });

    const billedTotal = billedCash + billedDebt + billedCredit + billedOther;
    const cashCollected = rec.cashCollected || 0;
    const routeType: RouteType = routes.find((r) => r.id === rec.routeId)?.type || 'mobile';

    return {
      truckRecordId: rec.id,
      routeId: rec.routeId,
      routeName: rec.routeName,
      routeType,
      timeRound: rec.timeRound || rec.shift,
      shift: rec.shift,
      expectedFromStock,
      billedCash,
      billedDebt,
      billedCredit,
      billedOther,
      billedTotal,
      cashExpected,
      cashCollected,
      stockVsBilledVariance: expectedFromStock - billedTotal,
      cashVsCollectedVariance: cashExpected - cashCollected,
    };
  });
}
