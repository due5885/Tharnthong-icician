import React, { useState } from 'react';
import {
  CustomerAccount,
  DeliveryRecord,
  IceProduct,
  IceQuantity,
  OperationSummaryStats,
  PaymentStatus,
  RoleLevel,
  RouteItem,
  TruckStockRecord,
} from '../types';
import { TruckStockView } from './TruckStockView';
import { useHorizontalWheelScroll } from '../lib/useHorizontalWheelScroll';

interface OperationsViewProps {
  stats: OperationSummaryStats;
  recentDeliveries: DeliveryRecord[];
  customers: CustomerAccount[];
  products: IceProduct[];
  routes: RouteItem[];
  truckRecords: TruckStockRecord[];
  roleLevel: RoleLevel;
  onAddDelivery: (delivery: Omit<DeliveryRecord, 'id'>, quantities: IceQuantity) => void;
  onSaveTruckRecord: (record: Omit<TruckStockRecord, 'id' | 'updatedAt'>) => void;
  onOpenProductManager: () => void;
  onOpenEmployeeManager: () => void;
  onShowToast: (msg: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  currentShift: string;
}

export const OperationsView: React.FC<OperationsViewProps> = ({
  stats,
  recentDeliveries,
  customers,
  products,
  routes,
  truckRecords,
  roleLevel,
  onAddDelivery,
  onSaveTruckRecord,
  onOpenProductManager,
  onOpenEmployeeManager,
  onShowToast,
  selectedDate,
  currentShift,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'truck_stock' | 'quick_sale'>('truck_stock');
  const tableScrollRef = useHorizontalWheelScroll<HTMLDivElement>();

  // Quick Sale Quantities State
  const [quantities, setQuantities] = useState<IceQuantity>(() => {
    const init: IceQuantity = {};
    products.forEach((p) => {
      init[p.key] = 0;
    });
    return init;
  });

  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Cash');
  const [showAllDeliveries, setShowAllDeliveries] = useState<boolean>(false);

  // Quick Sale: Route & Time Round (for cash reconciliation matching)
  const [saleRouteId, setSaleRouteId] = useState<string>(routes[0]?.id || '');
  const timePresetOptions = [
    'รอบเช้า (06:00 น.)',
    'รอบสาย (09:00 น.)',
    'รอบบ่าย (13:00 น.)',
    'รอบเย็น (16:00 น.)',
    'ระบุเวลารอบส่งเอง...',
  ];
  const [saleTimePreset, setSaleTimePreset] = useState<string>('รอบเช้า (06:00 น.)');
  const [saleCustomTimeRound, setSaleCustomTimeRound] = useState<string>('');
  const saleTimeRound =
    saleTimePreset === 'ระบุเวลารอบส่งเอง...'
      ? saleCustomTimeRound.trim() || 'รอบพิเศษ'
      : saleTimePreset;
  const saleRouteObj = routes.find((r) => r.id === saleRouteId) || routes[0];

  // Find if matched customer has custom prices
  const matchedCustomer = customers.find(
    (c) => c.name.toLowerCase() === selectedCustomer.trim().toLowerCase()
  );

  const getUnitPrice = (key: string) => {
    if (matchedCustomer?.customPrices && matchedCustomer.customPrices[key] !== undefined) {
      return matchedCustomer.customPrices[key]!;
    }
    const p = products.find((prod) => prod.key === key);
    return p ? p.pricePerUnit : 0;
  };

  const handleIncrement = (key: string) => {
    setQuantities((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
  };

  const handleDecrement = (key: string) => {
    setQuantities((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) - 1) }));
  };

  const handleQuantityChange = (key: string, val: number) => {
    setQuantities((prev) => ({ ...prev, [key]: Math.max(0, isNaN(val) ? 0 : val) }));
  };

  // Calculate quick bill total
  const calculatedTotal = products.reduce((sum, item) => {
    const price = getUnitPrice(item.key);
    return sum + (quantities[item.key] || 0) * price;
  }, 0);

  const handleSaveTransaction = () => {
    const totalItemsCount = Object.values(quantities).reduce((a: number, b: number) => a + b, 0);
    if (totalItemsCount === 0) {
      onShowToast('กรุณาระบุจำนวนน้ำแข็งอย่างน้อย 1 รายการ');
      return;
    }

    if (!selectedCustomer.trim()) {
      onShowToast('กรุณาระบุชื่อร้านค้า หรือเลือกลูกค้า');
      return;
    }

    // Build summary text
    const itemsParts: string[] = [];
    products.forEach((prod) => {
      const qty = quantities[prod.key] || 0;
      if (qty > 0) {
        itemsParts.push(`${prod.labelTh}(${qty})`);
      }
    });
    const summaryText = itemsParts.join(', ');

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;

    onAddDelivery(
      {
        time: currentTime,
        customerName: selectedCustomer,
        summaryText,
        totalAmount: calculatedTotal,
        status: paymentStatus,
        date: selectedDate,
        routeId: saleRouteObj?.id,
        routeName: saleRouteObj?.name,
        timeRound: saleTimeRound,
      },
      quantities
    );

    onShowToast(`บันทึกรายการส่งน้ำแข็งสำเร็จ (฿${calculatedTotal.toLocaleString()})`);

    // Reset quantities
    const resetObj: IceQuantity = {};
    products.forEach((p) => {
      resetObj[p.key] = 0;
    });
    setQuantities(resetObj);
    setSelectedCustomer('');
  };

  // Filter deliveries for selectedDate
  const filteredDeliveries = recentDeliveries.filter((d) => d.date === selectedDate);
  const deliveriesToDisplayList = filteredDeliveries.length > 0 ? filteredDeliveries : recentDeliveries;

  const displayedDeliveries = showAllDeliveries
    ? deliveriesToDisplayList
    : deliveriesToDisplayList.slice(0, 5);

  return (
    <div className="space-y-6 pb-24">
      {roleLevel !== 'staff' && (
        <div className="flex justify-end">
          <button
            onClick={onOpenEmployeeManager}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#CBD5E1] text-[#1E3A5F] rounded-xl text-xs font-bold hover:bg-[#F1F5F9] transition-colors cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-sm">badge</span>
            จัดการพนักงาน
          </button>
        </div>
      )}

      {/* Today Overview Stat Cards */}
      <section className="mt-1">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Sales Today */}
          <div className="bg-white p-4 rounded-2xl border border-[#D2E0EB] shadow-xs flex flex-col justify-between hover:border-[#1E3A5F] transition-all">
            <span className="text-xs font-semibold text-[#64748B]">ยอดขายวันนี้</span>
            <div className="mt-2">
              <span className="text-xl md:text-2xl font-bold text-[#1E3A5F] data-mono">
                ฿ {stats.todaySales.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Cash Accumulated */}
          <div className="bg-white p-4 rounded-2xl border border-[#D2E0EB] shadow-xs flex flex-col justify-between hover:border-[#0284C7] transition-all">
            <span className="text-xs font-semibold text-[#64748B]">เงินสดสะสม</span>
            <div className="mt-2">
              <span className="text-xl md:text-2xl font-bold text-[#0284C7] data-mono">
                ฿ {stats.cashAccumulated.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Debt Amount */}
          <div className="bg-white p-4 rounded-2xl border border-[#D2E0EB] shadow-xs flex flex-col justify-between hover:border-[#DC2626] transition-all">
            <span className="text-xs font-semibold text-[#64748B]">ค้างชำระ (Debt)</span>
            <div className="mt-2">
              <span className="text-xl md:text-2xl font-bold text-[#DC2626] data-mono">
                ฿ {stats.debtAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Bill Count */}
          <div className="bg-white p-4 rounded-2xl border border-[#D2E0EB] shadow-xs flex flex-col justify-between hover:border-[#1E293B] transition-all">
            <span className="text-xs font-semibold text-[#64748B]">จำนวนบิล</span>
            <div className="mt-2">
              <span className="text-xl md:text-2xl font-bold text-[#1E293B] data-mono">
                {stats.billCount} บิล
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Sub-Tab Navigation Header (Truck Loading vs Quick Sale) */}
      <div className="flex items-center justify-between gap-2 p-1.5 bg-[#E2E8F0] rounded-2xl border border-[#CBD5E1]">
        <button
          onClick={() => setActiveSubTab('truck_stock')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'truck_stock'
              ? 'bg-[#1E3A5F] text-white shadow-sm'
              : 'text-[#475569] hover:text-[#1E3A5F]'
          }`}
        >
          <span className="material-symbols-outlined text-base sm:text-lg">local_shipping</span>
          ขึ้นน้ำแข็งบนรถ & ตรวจนับเหลือกลับ
        </button>

        <button
          onClick={() => setActiveSubTab('quick_sale')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'quick_sale'
              ? 'bg-[#1E3A5F] text-white shadow-sm'
              : 'text-[#475569] hover:text-[#1E3A5F]'
          }`}
        >
          <span className="material-symbols-outlined text-base sm:text-lg">point_of_sale</span>
          ลงบิลขายด่วน / ส่งน้ำแข็งหน้าร้าน
        </button>
      </div>

      {/* Sub-Tab 1: Truck Stock View */}
      {activeSubTab === 'truck_stock' && (
        <TruckStockView
          selectedDate={selectedDate}
          currentShift={currentShift}
          routes={routes}
          products={products}
          truckRecords={truckRecords}
          onSaveTruckRecord={onSaveTruckRecord}
          onOpenProductManager={onOpenProductManager}
          onShowToast={onShowToast}
        />
      )}

      {/* Sub-Tab 2: Quick Sale Stepper Grid */}
      {activeSubTab === 'quick_sale' && (
        <section className="bg-white p-4 md:p-6 rounded-2xl border border-[#D2E0EB] shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#D2E0EB]">
            <h2 className="text-lg md:text-xl font-bold text-[#1E3A5F] flex items-center gap-2 font-sans">
              <span className="material-symbols-outlined text-[#0284C7]">inventory_2</span>
              รายการรับ-ส่งน้ำแข็งด่วน
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenProductManager}
                className="px-2.5 py-1 bg-[#E0F2FE] text-[#0369A1] rounded-lg text-xs font-bold border border-[#BAE6FD] hover:bg-[#BAE6FD] transition-colors cursor-pointer"
              >
                + เพิ่ม/แก้ไขสินค้า
              </button>
              <span className="text-xs font-semibold bg-[#EBF2F7] text-[#1E3A5F] px-3 py-1 rounded-full border border-[#D2E0EB]">
                พนักงาน: {stats.shiftWorker}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {products.map((prod) => {
              const qty = quantities[prod.key] || 0;
              return (
                <div
                  key={prod.id}
                  className="bg-[#F8FAFC] p-3.5 border border-[#D2E0EB] rounded-2xl shadow-xs hover:border-[#1E3A5F] transition-colors group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      {prod.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.labelTh}
                          className="w-14 h-14 rounded-xl object-cover border border-[#CBD5E1] shadow-2xs shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-[#EBF2F7] rounded-xl text-[#1E3A5F] flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-2xl">
                            {prod.icon || 'ac_unit'}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-base text-[#1E293B] block leading-snug">
                          {prod.labelTh}
                        </span>
                        <span className="text-xs text-[#64748B] font-semibold block mt-0.5">
                          ฿{prod.pricePerUnit} / {prod.unit}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDecrement(prod.key)}
                      className="w-11 h-11 flex items-center justify-center bg-[#EBF2F7] text-[#1E293B] rounded-xl active:scale-90 hover:bg-[#DCE7F0] transition-all font-bold text-lg cursor-pointer"
                    >
                      <span className="material-symbols-outlined">remove</span>
                    </button>

                    <input
                      type="number"
                      min="0"
                      value={qty}
                      onChange={(e) =>
                        handleQuantityChange(prod.key, parseInt(e.target.value))
                      }
                      className="w-full text-center border-none font-bold text-2xl text-[#1E3A5F] bg-transparent focus:ring-0 focus:outline-none data-mono"
                    />

                    <button
                      type="button"
                      onClick={() => handleIncrement(prod.key)}
                      className="w-11 h-11 flex items-center justify-center bg-[#1E3A5F] text-white rounded-xl active:scale-90 hover:bg-[#152C4A] transition-all shadow-xs font-bold text-lg cursor-pointer"
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Customer Search & Payment Selection & Submit */}
          <div className="mt-4 pt-4 border-t border-[#D2E0EB] space-y-4">
            {/* Route & Time Round Selector (for cash reconciliation matching) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-[#E2E8F0]">
              <div>
                <label className="text-xs font-bold text-[#1E3A5F] block mb-1">สายส่งของบิลนี้</label>
                <select
                  value={saleRouteId}
                  onChange={(e) => setSaleRouteId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#1E3A5F] focus:ring-2 focus:ring-[#0284C7] outline-none"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.driverName ? `(${r.driverName})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#1E3A5F] block mb-1">รอบเวลา</label>
                <select
                  value={saleTimePreset}
                  onChange={(e) => setSaleTimePreset(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F0F9FF] border border-[#0284C7] rounded-xl text-xs font-bold text-[#0369A1] focus:ring-2 focus:ring-[#0284C7] outline-none"
                >
                  {timePresetOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              {saleTimePreset === 'ระบุเวลารอบส่งเอง...' && (
                <div className="sm:col-span-2 animate-fadeIn">
                  <input
                    type="text"
                    placeholder="เช่น 07:30 น., รอบเสริมพิเศษ..."
                    value={saleCustomTimeRound}
                    onChange={(e) => setSaleCustomTimeRound(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F0F9FF] border border-[#0284C7] rounded-xl text-xs font-bold text-[#0369A1] focus:ring-2 focus:ring-[#0284C7] outline-none"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                  ค้นหาลูกค้า / ร้านค้า
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]">
                    group
                  </span>
                  <input
                    type="text"
                    list="customer-suggestions"
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    placeholder="ชื่อร้านค้า หรือ รหัสลูกค้า..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D2E0EB] bg-white text-sm focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent text-[#1E293B]"
                  />
                  <datalist id="customer-suggestions">
                    {customers.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                  สถานะการชำระเงิน
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full py-2.5 px-3 rounded-xl border border-[#D2E0EB] bg-white text-sm font-medium focus:ring-2 focus:ring-[#1E3A5F] text-[#1E293B]"
                >
                  <option value="Cash">เงินสด (Cash)</option>
                  <option value="Debt">ค้างชำระ (Debt)</option>
                  <option value="Credit">เครดิต (Credit)</option>
                  <option value="OldPayment">จ่ายเก่า</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-sm font-medium text-[#1E293B]">
                ยอดรวมบิลนี้:{' '}
                <span className="text-xl font-bold text-[#1E3A5F] data-mono ml-1">
                  ฿ {calculatedTotal.toLocaleString()}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSaveTransaction}
                className="w-full sm:w-auto bg-[#1E3A5F] hover:bg-[#152C4A] text-white px-8 py-3 rounded-xl font-bold text-base active:scale-95 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined">save</span>
                บันทึกรายการ
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Recent Deliveries Table */}
      <section className="bg-white rounded-2xl border border-[#D2E0EB] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#D2E0EB] flex justify-between items-center bg-[#F8FAFC]">
          <h3 className="font-bold text-base md:text-lg text-[#1E3A5F] flex items-center gap-2 font-sans">
            <span className="material-symbols-outlined text-[#0284C7]">history</span>
            ประวัติการส่งล่าสุด
          </h3>
          <button
            onClick={() => setShowAllDeliveries(!showAllDeliveries)}
            className="text-[#1E3A5F] font-semibold text-xs md:text-sm flex items-center gap-1 hover:underline cursor-pointer"
          >
            {showAllDeliveries ? 'แสดงน้อยลง' : 'ดูทั้งหมด'}
            <span className="material-symbols-outlined text-sm">
              {showAllDeliveries ? 'expand_less' : 'arrow_forward'}
            </span>
          </button>
        </div>

        <div ref={tableScrollRef} className="overflow-x-auto thin-scrollbar">
          <table className="w-full text-left border-collapse zebra-table">
            <thead className="bg-[#1E3A5F] text-white">
              <tr>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">
                  เวลา
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">
                  ลูกค้า
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">
                  รายการ
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-right">
                  ยอดรวม
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-center">
                  สถานะ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D2E0EB] text-sm">
              {displayedDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-[#64748B]">
                    ยังไม่มีรายการส่งน้ำแข็งในวันนี้
                  </td>
                </tr>
              ) : (
                displayedDeliveries.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#EBF1F7]/80 transition-colors"
                  >
                    <td className="px-4 py-3 text-[#64748B] font-medium data-mono whitespace-nowrap">
                      {item.time}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#1E293B]">
                      {item.customerName}
                    </td>
                    <td className="px-4 py-3 text-[#1E293B] text-xs md:text-sm">
                      {item.summaryText}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#1E293B] data-mono whitespace-nowrap">
                      ฿ {item.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {item.status === 'Cash' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1] text-xs font-bold border border-[#BAE6FD]">
                          Cash
                        </span>
                      )}
                      {item.status === 'Debt' && (
                        <span className="px-2.5 py-0.5 rounded-full border border-[#FECACA] text-[#DC2626] text-xs font-bold bg-[#FEE2E2]">
                          Debt
                        </span>
                      )}
                      {item.status === 'Credit' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569] text-xs font-bold border border-[#CBD5E1]">
                          Credit
                        </span>
                      )}
                      {item.status === 'OldPayment' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706] text-xs font-bold">
                          จ่ายเก่า
                        </span>
                      )}
                      {item.status === 'NewAndOld' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#B45309] text-xs font-bold">
                          จ่ายใหม่+เก่า
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
