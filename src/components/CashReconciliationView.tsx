import React from 'react';
import { DeliveryRecord, IceProduct, RouteItem, TruckStockRecord } from '../types';
import { buildRouteReconciliations } from '../lib/reconciliation';
import { useHorizontalWheelScroll } from '../lib/useHorizontalWheelScroll';
import { formatShortDate } from '../lib/statementExport';
import { DateInput } from './DateInput';

interface CashReconciliationViewProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  routes: RouteItem[];
  products: IceProduct[];
  truckRecords: TruckStockRecord[];
  deliveries: DeliveryRecord[];
  onUpdateTruckRecord: (id: string, updated: Partial<TruckStockRecord>) => void;
}

const VARIANCE_THRESHOLD = 20;

function varianceClass(variance: number): string {
  if (Math.abs(variance) <= VARIANCE_THRESHOLD) return 'text-[#16A34A]';
  return 'text-[#DC2626]';
}

export const CashReconciliationView: React.FC<CashReconciliationViewProps> = ({
  selectedDate,
  onDateChange,
  routes,
  products,
  truckRecords,
  deliveries,
  onUpdateTruckRecord,
}) => {
  const tableScrollRef = useHorizontalWheelScroll<HTMLDivElement>();
  const rows = buildRouteReconciliations(selectedDate, truckRecords, deliveries, products, routes);

  const totals = rows.reduce(
    (acc, r) => ({
      expectedFromStock: acc.expectedFromStock + r.expectedFromStock,
      billedTotal: acc.billedTotal + r.billedTotal,
      cashExpected: acc.cashExpected + r.cashExpected,
      cashCollected: acc.cashCollected + r.cashCollected,
    }),
    { expectedFromStock: 0, billedTotal: 0, cashExpected: 0, cashCollected: 0 }
  );

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <section className="bg-white p-4 sm:p-5 rounded-2xl border border-[#D2E0EB] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-[#1E3A5F] flex items-center gap-2 font-sans">
              <span className="material-symbols-outlined text-[#0284C7]">fact_check</span>
              กระทบยอดเงินสด (Cash Reconciliation)
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              เทียบมูลค่าจากสต๊อกขึ้นรถ-เหลือกลับ กับยอดบิลจริง และเงินสดที่ส่งเข้าจริง แยกรายสาย/รอบ
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#CBD5E1] px-3 py-1.5 rounded-xl">
            <span className="material-symbols-outlined text-sm text-[#0284C7]">calendar_today</span>
            <span className="text-xs font-bold text-[#1E3A5F]">เลือกวัน:</span>
            <DateInput
              value={selectedDate}
              onChange={onDateChange}
              className="bg-transparent text-xs font-bold text-[#0284C7] data-mono outline-none cursor-pointer w-24"
            />
          </div>
        </div>
      </section>

      {/* Reconciliation Table */}
      <section className="bg-white rounded-2xl border border-[#D2E0EB] shadow-xs overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-[#64748B] text-sm">
            ยังไม่มีข้อมูลขึ้นน้ำแข็งบนรถ (Truck Stock) สำหรับวันที่ {formatShortDate(selectedDate)}
          </div>
        ) : (
          <div ref={tableScrollRef} className="overflow-x-auto thin-scrollbar">
            <table className="w-full text-left border-collapse zebra-table min-w-[900px]">
              <thead className="bg-[#1E3A5F] text-white">
                <tr>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider">สายส่ง</th>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider">รอบ</th>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-right">
                    ขายจริงจากสต๊อก
                  </th>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-right">
                    ยอดบิลจริง
                  </th>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-right">
                    ส่วนต่างสต๊อก
                  </th>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-right">
                    เงินสดที่ควรได้
                  </th>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-right">
                    เงินสดที่ส่งจริง
                  </th>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-right">
                    ส่วนต่างเงินสด
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D2E0EB] text-sm">
                {rows.map((r) => (
                  <tr key={r.truckRecordId} className="hover:bg-[#EBF1F7]/80 transition-colors">
                    <td className="px-3 py-3">
                      <div className="font-bold text-[#1E293B]">{r.routeName}</div>
                      <span
                        className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          r.routeType === 'storefront'
                            ? 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]'
                            : 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]'
                        }`}
                      >
                        {r.routeType === 'storefront' ? 'มีหน้าร้าน' : 'รถกระบะ'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-[#64748B] font-medium whitespace-nowrap">
                      {r.timeRound}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-[#1E3A5F] data-mono whitespace-nowrap">
                      ฿ {r.expectedFromStock.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-[#1E3A5F] data-mono whitespace-nowrap">
                      ฿ {r.billedTotal.toLocaleString()}
                      <div className="text-[10px] text-[#64748B] font-normal">
                        สด {r.billedCash.toLocaleString()} / ค้าง {r.billedDebt.toLocaleString()} / เครดิต{' '}
                        {r.billedCredit.toLocaleString()}
                      </div>
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-bold data-mono whitespace-nowrap ${varianceClass(
                        r.stockVsBilledVariance
                      )}`}
                    >
                      {r.stockVsBilledVariance > 0 ? '+' : ''}
                      {r.stockVsBilledVariance.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-[#1E3A5F] data-mono whitespace-nowrap">
                      ฿ {r.cashExpected.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        value={r.cashCollected || ''}
                        placeholder="0"
                        onChange={(e) =>
                          onUpdateTruckRecord(r.truckRecordId, {
                            cashCollected: Math.max(0, parseFloat(e.target.value) || 0),
                          })
                        }
                        className="w-28 text-right font-bold text-sm text-[#0284C7] bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2 py-1 data-mono focus:ring-2 focus:ring-[#0284C7] outline-none"
                      />
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-bold data-mono whitespace-nowrap ${varianceClass(
                        r.cashVsCollectedVariance
                      )}`}
                    >
                      {r.cashVsCollectedVariance > 0 ? '+' : ''}
                      {r.cashVsCollectedVariance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#F8FAFC] border-t-2 border-[#1E3A5F]">
                <tr>
                  <td colSpan={2} className="px-3 py-3 font-bold text-xs uppercase text-[#1E3A5F]">
                    รวมทั้งหมด ({rows.length} รายการ)
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-[#1E3A5F] data-mono">
                    ฿ {totals.expectedFromStock.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-[#1E3A5F] data-mono">
                    ฿ {totals.billedTotal.toLocaleString()}
                  </td>
                  <td
                    className={`px-3 py-3 text-right font-bold data-mono ${varianceClass(
                      totals.expectedFromStock - totals.billedTotal
                    )}`}
                  >
                    {(totals.expectedFromStock - totals.billedTotal).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-[#1E3A5F] data-mono">
                    ฿ {totals.cashExpected.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-[#1E3A5F] data-mono">
                    ฿ {totals.cashCollected.toLocaleString()}
                  </td>
                  <td
                    className={`px-3 py-3 text-right font-bold data-mono ${varianceClass(
                      totals.cashExpected - totals.cashCollected
                    )}`}
                  >
                    {(totals.cashExpected - totals.cashCollected).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
