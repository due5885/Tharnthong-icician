import React, { useState } from 'react';
import { IceProduct, IceQuantity, RouteItem, TruckStockRecord } from '../types';
import { formatShortDate } from '../lib/statementExport';

interface TruckStockViewProps {
  selectedDate: string;
  currentShift: string;
  routes: RouteItem[];
  products: IceProduct[];
  truckRecords: TruckStockRecord[];
  onSaveTruckRecord: (record: Omit<TruckStockRecord, 'id' | 'updatedAt'>) => void;
  onOpenProductManager: () => void;
  onShowToast: (msg: string) => void;
}

export const TruckStockView: React.FC<TruckStockViewProps> = ({
  selectedDate,
  currentShift,
  routes,
  products,
  truckRecords,
  onSaveTruckRecord,
  onOpenProductManager,
  onShowToast,
}) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>(routes[0]?.id || '');

  const selectedRouteObj = routes.find((r) => r.id === selectedRouteId) || routes[0];

  const [driverName, setDriverName] = useState<string>(selectedRouteObj?.driverName || '');

  // Vehicle Type & License Plate
  const vehicleTypeOptions = ['รถกระบะ', 'รถซาเล้ง', 'ระบุเอง...'];
  const [vehicleTypePreset, setVehicleTypePreset] = useState<string>('รถกระบะ');
  const [customVehicleType, setCustomVehicleType] = useState<string>('');
  const [licensePlate, setLicensePlate] = useState<string>('');
  const actualVehicleType =
    vehicleTypePreset === 'ระบุเอง...'
      ? customVehicleType.trim()
      : vehicleTypePreset;

  // Request #4: Time Round Selection (รอบเช้า, สาย, บ่าย, เย็น หรือระบุเวลาเอง)
  const [selectedTimePreset, setSelectedTimePreset] = useState<string>('รอบเช้า (06:00 น.)');
  const [customTimeRound, setCustomTimeRound] = useState<string>('');

  const timePresetOptions = [
    'รอบเช้า (06:00 น.)',
    'รอบสาย (09:00 น.)',
    'รอบบ่าย (13:00 น.)',
    'รอบเย็น (16:00 น.)',
    'ระบุเวลารอบส่งเอง...',
  ];

  const actualTimeRound =
    selectedTimePreset === 'ระบุเวลารอบส่งเอง...'
      ? customTimeRound.trim() || 'รอบพิเศษ'
      : selectedTimePreset;

  // Quantities loaded and returned
  const [loadedQuantities, setLoadedQuantities] = useState<IceQuantity>(() => {
    const init: IceQuantity = {};
    products.forEach((p) => {
      init[p.key] = 0;
    });
    return init;
  });

  const [returnedQuantities, setReturnedQuantities] = useState<IceQuantity>(() => {
    const init: IceQuantity = {};
    products.forEach((p) => {
      init[p.key] = 0;
    });
    return init;
  });

  // Keep state synced when switching routes
  const handleRouteSelect = (id: string) => {
    setSelectedRouteId(id);
    const r = routes.find((item) => item.id === id);
    if (r) {
      setDriverName(r.driverName || '');
    }
  };

  const handleLoadedChange = (key: string, val: number) => {
    setLoadedQuantities((prev) => ({ ...prev, [key]: Math.max(0, isNaN(val) ? 0 : val) }));
  };

  const handleReturnedChange = (key: string, val: number) => {
    setReturnedQuantities((prev) => ({ ...prev, [key]: Math.max(0, isNaN(val) ? 0 : val) }));
  };

  // Calculations
  let totalLoadedCount = 0;
  let totalReturnedCount = 0;
  let totalSoldCount = 0;
  let totalSalesRevenue = 0;

  products.forEach((p) => {
    const loaded = loadedQuantities[p.key] || 0;
    const returned = returnedQuantities[p.key] || 0;
    const sold = Math.max(0, loaded - returned);

    totalLoadedCount += loaded;
    totalReturnedCount += returned;
    totalSoldCount += sold;
    totalSalesRevenue += sold * p.pricePerUnit;
  });

  const handleSave = () => {
    if (!selectedRouteObj) {
      onShowToast('กรุณาเลือกสายส่ง');
      return;
    }

    onSaveTruckRecord({
      date: selectedDate,
      shift: currentShift,
      timeRound: actualTimeRound,
      routeId: selectedRouteObj.id,
      routeName: selectedRouteObj.name,
      driverName: driverName || selectedRouteObj.driverName || 'ไม่ระบุพนักงาน',
      vehicleType: actualVehicleType || undefined,
      licensePlate: licensePlate.trim() || undefined,
      loadedQuantities,
      returnedQuantities,
    });

    onShowToast(
      `บันทึกขึ้นน้ำแข็ง [${actualTimeRound}] ของ "${selectedRouteObj.name}" เรียบร้อยแล้ว`
    );
  };

  // Filter records for selected date
  const filteredRecords = truckRecords.filter((r) => r.date === selectedDate);

  return (
    <div className="space-y-6">
      {/* Selector & Setup Card */}
      <div className="bg-white rounded-2xl border border-[#BAE6FD] p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0284C7] text-2xl">
              local_shipping
            </span>
            <div>
              <h3 className="font-bold text-base text-[#1E3A5F]">
                ใบบันทึกขึ้นน้ำแข็งบนรถ & ตรวจนับน้ำแข็งเหลือกลับ
              </h3>
              <p className="text-xs text-[#64748B]">
                คำนวณจำนวนขายสุทธิ (ขึ้นรถ - เหลือกลับ) ตามรอบเวลาจัดส่ง
              </p>
            </div>
          </div>

          <button
            onClick={onOpenProductManager}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#0369A1] rounded-xl text-xs font-bold transition-all cursor-pointer border border-[#BAE6FD]"
          >
            <span className="material-symbols-outlined text-sm">tune</span>
            จัดการชนิดสินค้า/ราคาขาย
          </button>
        </div>

        {/* Route, Driver, Vehicle, and Time Round Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Route Selector */}
          <div>
            <label className="text-xs font-bold text-[#1E3A5F] block mb-1">
              เลือกสายส่งน้ำแข็ง
            </label>
            <select
              value={selectedRouteId}
              onChange={(e) => handleRouteSelect(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#1E3A5F] focus:ring-2 focus:ring-[#0284C7] outline-none"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.driverName ? `(${r.driverName})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Driver Name */}
          <div>
            <label className="text-xs font-bold text-[#1E3A5F] block mb-1">
              พนักงานส่งประจำรถ
            </label>
            <input
              type="text"
              placeholder="ระบุชื่อพนักงานคนส่ง"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-medium text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] outline-none"
            />
          </div>

          {/* 3. Vehicle Type Selector */}
          <div>
            <label className="text-xs font-bold text-[#1E3A5F] block mb-1">
              ประเภทรถ
            </label>
            <select
              value={vehicleTypePreset}
              onChange={(e) => setVehicleTypePreset(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#1E3A5F] focus:ring-2 focus:ring-[#0284C7] outline-none"
            >
              {vehicleTypeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* 4. License Plate */}
          <div>
            <label className="text-xs font-bold text-[#1E3A5F] block mb-1">
              เลขทะเบียนรถ
            </label>
            <input
              type="text"
              placeholder="เช่น กข-1234"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-medium text-[#1E293B] focus:ring-2 focus:ring-[#0284C7] outline-none"
            />
          </div>

          {/* 5. Request #4: Time Round Selector */}
          <div>
            <label className="text-xs font-bold text-[#1E3A5F] block mb-1 flex items-center justify-between">
              <span>รอบเวลาการขึ้นรถ</span>
              <span className="text-[10px] text-[#0284C7] font-semibold">เช้า/สาย/บ่าย/เย็น</span>
            </label>
            <select
              value={selectedTimePreset}
              onChange={(e) => setSelectedTimePreset(e.target.value)}
              className="w-full px-3 py-2 bg-[#F0F9FF] border border-[#0284C7] rounded-xl text-xs font-bold text-[#0369A1] focus:ring-2 focus:ring-[#0284C7] outline-none"
            >
              {timePresetOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Vehicle Type Input if selected */}
        {vehicleTypePreset === 'ระบุเอง...' && (
          <div className="pt-2 animate-fadeIn">
            <label className="text-xs font-bold text-[#1E3A5F] block mb-1">
              ระบุประเภทรถเอง
            </label>
            <input
              type="text"
              placeholder="เช่น รถบรรทุก 6 ล้อ, มอเตอร์ไซค์พ่วงข้าง..."
              value={customVehicleType}
              onChange={(e) => setCustomVehicleType(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#1E3A5F] focus:ring-2 focus:ring-[#0284C7] outline-none"
            />
          </div>
        )}

        {/* Custom Time Round Input if selected */}
        {selectedTimePreset === 'ระบุเวลารอบส่งเอง...' && (
          <div className="pt-2 animate-fadeIn">
            <label className="text-xs font-bold text-[#0369A1] block mb-1">
              ระบุเวลารอบส่ง หรือชื่อรอบพิเศษ
            </label>
            <input
              type="text"
              placeholder="เช่น 07:30 น., รอบเสริมพิเศษ, รอบส่งด่วน..."
              value={customTimeRound}
              onChange={(e) => setCustomTimeRound(e.target.value)}
              className="w-full px-3 py-2 bg-[#F0F9FF] border border-[#0284C7] rounded-xl text-xs font-bold text-[#0369A1] focus:ring-2 focus:ring-[#0284C7] outline-none"
            />
          </div>
        )}
      </div>

      {/* Stock Entry Table */}
      <div className="bg-white rounded-2xl border border-[#BAE6FD] shadow-xs overflow-hidden">
        <div className="bg-[#1E3A5F] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-[#7DD3FC]">inventory_2</span>
            ตารางรายการน้ำแข็งบนรถ ({products.length} หมวดสินค้า)
          </h4>
          <div className="flex items-center gap-2">
            <span className="bg-[#0284C7] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[#38BDF8]">
              {actualTimeRound}
            </span>
            <span className="text-[11px] text-[#7DD3FC] font-medium">
              {selectedRouteObj?.name} | {currentShift}
            </span>
          </div>
        </div>

        {/* Product Rows */}
        <div className="divide-y divide-[#E2E8F0]">
          {products.map((prod) => {
            const loaded = loadedQuantities[prod.key] || 0;
            const returned = returnedQuantities[prod.key] || 0;
            const sold = Math.max(0, loaded - returned);
            const lineTotal = sold * prod.pricePerUnit;

            return (
              <div
                key={prod.id}
                className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center hover:bg-[#F8FAFC] transition-colors"
              >
                {/* Item Name & Icon / Image */}
                <div className="sm:col-span-3 flex items-center gap-2.5">
                  {prod.imageUrl ? (
                    <img
                      src={prod.imageUrl}
                      alt={prod.labelTh}
                      className="w-10 h-10 rounded-xl object-cover border border-[#CBD5E1] shadow-2xs shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-lg">
                        {prod.icon || 'ac_unit'}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="font-bold text-sm text-[#1E3A5F] block truncate">
                      {prod.labelTh}
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      ฿{prod.pricePerUnit} / {prod.unit}
                    </span>
                  </div>
                </div>

                {/* Input 1: Loaded Quantity */}
                <div className="sm:col-span-3 flex items-center gap-2 bg-[#F1F5F9] p-2 rounded-xl border border-[#CBD5E1]">
                  <span className="text-[11px] font-bold text-[#0369A1] whitespace-nowrap min-w-[65px]">
                    ขึ้นรถ:
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={loaded || ''}
                    placeholder="0"
                    onChange={(e) =>
                      handleLoadedChange(prod.key, parseInt(e.target.value) || 0)
                    }
                    className="w-full h-8 text-center font-bold text-sm text-[#1E3A5F] bg-white border border-[#CBD5E1] rounded-lg data-mono focus:ring-1 focus:ring-[#0284C7] outline-none"
                  />
                  <span className="text-[11px] text-[#64748B] font-medium min-w-[25px]">
                    {prod.unit}
                  </span>
                </div>

                {/* Input 2: Returned Quantity */}
                <div className="sm:col-span-3 flex items-center gap-2 bg-[#FEF2F2] p-2 rounded-xl border border-[#FCA5A5]">
                  <span className="text-[11px] font-bold text-[#DC2626] whitespace-nowrap min-w-[65px]">
                    เหลือกลับ:
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={returned || ''}
                    placeholder="0"
                    onChange={(e) =>
                      handleReturnedChange(prod.key, parseInt(e.target.value) || 0)
                    }
                    className="w-full h-8 text-center font-bold text-sm text-[#DC2626] bg-white border border-[#FCA5A5] rounded-lg data-mono focus:ring-1 focus:ring-[#DC2626] outline-none"
                  />
                  <span className="text-[11px] text-[#64748B] font-medium min-w-[25px]">
                    {prod.unit}
                  </span>
                </div>

                {/* Calculated Sold & Value */}
                <div className="sm:col-span-3 flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E2E8F0]">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] uppercase text-[#64748B] font-bold block">
                      ขายได้จริง
                    </span>
                    <span className="font-bold text-sm text-[#1E3A5F] data-mono">
                      {sold.toLocaleString()} {prod.unit}
                    </span>
                  </div>

                  <div className="text-right min-w-[80px]">
                    <span className="text-[10px] uppercase text-[#64748B] font-bold block">
                      มูลค่ารวม
                    </span>
                    <span className="font-bold text-sm text-[#0284C7] data-mono">
                      ฿ {lineTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Calculation Summary */}
        <div className="bg-[#E0F2FE] p-4 sm:p-5 border-t border-[#BAE6FD] grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
          <div>
            <span className="text-[11px] font-bold text-[#0369A1] uppercase block">
              ขึ้นรถรวมทั้งหมด
            </span>
            <span className="text-xl font-bold text-[#1E3A5F] data-mono">
              {totalLoadedCount.toLocaleString()} รายการ
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-[#DC2626] uppercase block">
              เหลือกลับรวม
            </span>
            <span className="text-xl font-bold text-[#DC2626] data-mono">
              {totalReturnedCount.toLocaleString()} รายการ
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-[#0369A1] uppercase block">
              ยอดขายได้จริง
            </span>
            <span className="text-xl font-bold text-[#0369A1] data-mono">
              {totalSoldCount.toLocaleString()} รายการ
            </span>
          </div>

          <div className="text-right sm:text-right">
            <span className="text-[11px] font-bold text-[#0369A1] uppercase block">
              มูลค่าขายสุทธิ
            </span>
            <span className="text-2xl font-bold text-[#0284C7] data-mono">
              ฿ {totalSalesRevenue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Save Button Bar */}
        <div className="p-4 bg-white border-t border-[#E2E8F0] flex justify-end">
          <button
            onClick={handleSave}
            className="w-full sm:w-auto px-6 py-3 bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">save</span>
            บันทึกการขึ้นน้ำแข็ง [{actualTimeRound}]
          </button>
        </div>
      </div>

      {/* History Records Table for Today */}
      {filteredRecords.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#CBD5E1] p-4 space-y-3">
          <h4 className="font-bold text-sm text-[#1E3A5F] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0284C7]">history</span>
            ประวัติการขึ้น-เหลือกลับ ประจำวันที่ {formatShortDate(selectedDate)} ({filteredRecords.length} รายการ)
          </h4>

          <div className="space-y-2">
            {filteredRecords.map((rec) => {
              let recSoldTotal = 0;
              let recRevenue = 0;

              products.forEach((p) => {
                const l = rec.loadedQuantities[p.key] || 0;
                const r = rec.returnedQuantities[p.key] || 0;
                const s = Math.max(0, l - r);
                recSoldTotal += s;
                recRevenue += s * p.pricePerUnit;
              });

              return (
                <div
                  key={rec.id}
                  className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[#1E3A5F]">{rec.routeName}</span>
                      <span className="bg-[#0284C7] text-white px-2 py-0.5 rounded-full font-bold text-[10px]">
                        {rec.timeRound || rec.shift || 'รอบปกติ'}
                      </span>
                      <span className="bg-[#E0F2FE] text-[#0284C7] px-2 py-0.5 rounded-full font-bold">
                        {rec.shift}
                      </span>
                      <span className="text-[#64748B]">คนส่ง: {rec.driverName}</span>
                      {rec.vehicleType && (
                        <span className="text-[#64748B]">
                          รถ: {rec.vehicleType}
                          {rec.licensePlate ? ` (${rec.licensePlate})` : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#64748B]">
                      บันทึกเมื่อ: {new Date(rec.updatedAt).toLocaleTimeString('th-TH')}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-[#1E293B]">
                      ขายได้สุทธิ: <strong className="data-mono text-[#0284C7]">{recSoldTotal}</strong> รายการ
                    </span>
                    <span className="font-bold text-sm text-[#0284C7] data-mono">
                      ฿ {recRevenue.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
