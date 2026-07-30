import React, { useMemo, useRef, useState } from 'react';
import { CustomerAccount, IceProduct, IceQuantity, PaymentStatus, PaymentStatusLabels, RoleLevel, RouteItem } from '../types';
import { IceBucketManagerModal } from './IceBucketManagerModal';
import { ConfirmStatusModal } from './ConfirmStatusModal';
import { canEditPaymentStatusLabels } from '../lib/permissions';
import { DateInput } from './DateInput';

const STATUS_BADGE_CLASS: Record<PaymentStatus, string> = {
  Cash: 'bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]',
  Debt: 'bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]',
  Credit: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]',
  OldPayment: 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]',
  NewAndOld: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
};

interface CustomersViewProps {
  customers: CustomerAccount[];
  routes: RouteItem[];
  products: IceProduct[];
  statusLabels: PaymentStatusLabels;
  roleLevel: RoleLevel;
  onUpdateCustomer: (id: string, updated: Partial<CustomerAccount>) => void;
  onConfirmCustomerStatus: (customer: CustomerAccount, status: PaymentStatus) => void;
  onDeleteCustomer: (id: string) => void;
  onOpenPriceModal: (customer: CustomerAccount) => void;
  onOpenNewAndOldModal: (customer: CustomerAccount) => void;
  onOpenRouteManager: () => void;
  onOpenProductManager: () => void;
  onOpenStatusLabelsModal: () => void;
  onSaveAll: () => void;
  onOpenAddModal: () => void;
  onShowToast: (msg: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  currentShift: string;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  routes,
  products,
  statusLabels,
  roleLevel,
  onUpdateCustomer,
  onConfirmCustomerStatus,
  onDeleteCustomer,
  onOpenPriceModal,
  onOpenNewAndOldModal,
  onOpenRouteManager,
  onOpenProductManager,
  onOpenStatusLabelsModal,
  onSaveAll,
  onOpenAddModal,
  onShowToast,
  selectedDate,
  onDateChange,
  currentShift,
}) => {
  const [selectedRoute, setSelectedRoute] = useState<string>('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bucketCustomer, setBucketCustomer] = useState<CustomerAccount | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    customer: CustomerAccount;
    status: PaymentStatus;
  } | null>(null);
  const stickyBarRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const regularCustomers = customers.filter(
    (c) => routes.find((r) => r.name === c.route)?.type !== 'subline'
  );
  const regularRoutes = routes.filter((r) => r.type !== 'subline');

  // Running number per route (1, 2, 3...), stable regardless of the active route filter/search
  const routeIndexById = useMemo(() => {
    const counters: Record<string, number> = {};
    const map: Record<string, number> = {};
    regularCustomers.forEach((c) => {
      counters[c.route] = (counters[c.route] || 0) + 1;
      map[c.id] = counters[c.route];
    });
    return map;
  }, [regularCustomers]);

  const filteredCustomers = regularCustomers.filter((cust) => {
    const matchesRoute =
      selectedRoute === 'ทั้งหมด' || cust.route === selectedRoute;
    const matchesSearch =
      cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cust.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRoute && matchesSearch;
  });

  // "1-20 / 21-40 / ..." quick-jump chunks for long lists
  const JUMP_CHUNK_SIZE = 20;
  const jumpChunks = useMemo(() => {
    const chunks: { startIndex: number; label: string }[] = [];
    for (let i = 0; i < filteredCustomers.length; i += JUMP_CHUNK_SIZE) {
      const end = Math.min(i + JUMP_CHUNK_SIZE, filteredCustomers.length);
      chunks.push({ startIndex: i, label: `${i + 1}-${end}` });
    }
    return chunks;
  }, [filteredCustomers]);

  const handleJumpTo = (index: number) => {
    const target = filteredCustomers[index];
    const el = target && cardRefs.current[target.id];
    if (!el) return;
    const stickyBarHeight = stickyBarRef.current?.offsetHeight || 0;
    const top = el.getBoundingClientRect().top + window.scrollY - stickyBarHeight - 76;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const getUnitPrice = (cust: CustomerAccount, key: string) => {
    if (cust.customPrices && cust.customPrices[key] !== undefined) {
      return cust.customPrices[key]!;
    }
    const cfg = products.find((c) => c.key === key);
    return cfg ? cfg.pricePerUnit : 0;
  };

  const handleQuantityChange = (
    customerId: string,
    key: string,
    val: number
  ) => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;

    const newQuantities = {
      ...cust.quantities,
      [key]: Math.max(0, isNaN(val) ? 0 : val),
    };

    // Recalculate total amount using custom or default unit prices
    let newTotal = products.reduce((sum, cfg) => {
      const price = getUnitPrice(cust, cfg.key);
      return sum + (newQuantities[cfg.key] || 0) * price;
    }, 0);

    newTotal += cust.extraAmount || 0;

    onUpdateCustomer(customerId, {
      quantities: newQuantities,
      totalAmount: newTotal,
    });
  };

  const handleExtraAmountChange = (customerId: string, val: number) => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;

    const extra = isNaN(val) ? 0 : val;

    let baseTotal = products.reduce((sum, cfg) => {
      const price = getUnitPrice(cust, cfg.key);
      return sum + (cust.quantities[cfg.key] || 0) * price;
    }, 0);

    onUpdateCustomer(customerId, {
      extraAmount: extra,
      totalAmount: baseTotal + extra,
    });
  };

  const handleStatusToggle = (customerId: string, newStatus: PaymentStatus) => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;

    if (newStatus === 'NewAndOld') {
      onOpenNewAndOldModal(cust);
      return;
    }

    setPendingStatusChange({ customer: cust, status: newStatus });
  };

  const handleConfirmStatusChange = () => {
    if (!pendingStatusChange) return;
    const { customer, status } = pendingStatusChange;
    const label = statusLabels[status];
    onConfirmCustomerStatus(customer, status);
    onShowToast(`อัปเดตสถานะการชำระเงินเป็น "${label}" เรียบร้อยแล้ว`);
    setPendingStatusChange(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`คุณต้องการลบลูกค้ารายชื่อ "${name}" หรือไม่?`)) {
      onDeleteCustomer(id);
      onShowToast(`ลบชื่อลูกค้า "${name}" เรียบร้อยแล้ว`);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[#1E3A5F] font-sans flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0284C7]">menu_book</span>
            ลงบัญชีลูกค้า
          </h2>
          <div className="flex items-center gap-2 mt-1 text-[#1E293B] text-xs md:text-sm">
            <span className="material-symbols-outlined text-sm text-[#0284C7]">calendar_today</span>
            <DateInput
              value={selectedDate}
              onChange={onDateChange}
              className="data-mono font-bold bg-[#E0F2FE] text-[#0369A1] px-2 py-0.5 rounded-lg border border-[#BAE6FD] cursor-pointer w-24"
            />
            <span className="text-[#64748B]">|</span>
            <span className="font-semibold text-[#1E3A5F]">{currentShift}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canEditPaymentStatusLabels(roleLevel) && (
            <button
              onClick={onOpenStatusLabelsModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#1E3A5F] rounded-xl text-xs font-bold transition-all border border-[#CBD5E1] cursor-pointer"
              title="แก้ไขป้ายชื่อสถานะการชำระเงิน (แอดมิน/ฝ่ายบัญชี)"
            >
              <span className="material-symbols-outlined text-sm text-[#0284C7]">edit_note</span>
              แก้ไขป้ายสถานะ
            </button>
          )}

          <button
            onClick={onOpenRouteManager}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#1E3A5F] rounded-xl text-xs font-bold transition-all border border-[#CBD5E1] cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-[#0284C7]">alt_route</span>
            จัดการสายส่ง
          </button>

          <button
            onClick={onOpenProductManager}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#1E3A5F] rounded-xl text-xs font-bold transition-all border border-[#CBD5E1] cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-[#0284C7]">tune</span>
            จัดการสินค้า/ราคา
          </button>

          <button
            type="button"
            onClick={onSaveAll}
            className="px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">save</span>
            บันทึกทั้งหมด
          </button>
        </div>
      </div>

      {/* Filter and Search Bar — sticky so it stays reachable while scrolling a long customer list */}
      <div
        ref={stickyBarRef}
        className="sticky top-16 z-30 bg-white p-3.5 rounded-2xl border border-[#D2E0EB] shadow-md space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-start items-center justify-between gap-3">
        {/* Route Selector Filter Tabs */}
        <div className="flex items-center gap-1 flex-wrap w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setSelectedRoute('ทั้งหมด')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedRoute === 'ทั้งหมด'
                ? 'bg-[#1E3A5F] text-white shadow-xs'
                : 'text-[#64748B] hover:bg-[#F1F5F9]'
            }`}
          >
            ทั้งหมด ({regularCustomers.length})
          </button>

          {regularRoutes.map((r) => {
            const count = regularCustomers.filter((c) => c.route === r.name).length;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRoute(r.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedRoute === r.name
                    ? 'bg-[#1E3A5F] text-white shadow-xs'
                    : 'text-[#64748B] hover:bg-[#F1F5F9]'
                }`}
              >
                {r.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] text-sm">
            search
          </span>
          <input
            type="text"
            placeholder="ค้นหาชื่อลูกค้าหรือรหัส..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#D2E0EB] bg-[#F8FAFC] text-xs font-medium focus:ring-2 focus:ring-[#1E3A5F] outline-none"
          />
        </div>
        </div>

        {/* Quick-jump row — for long lists, jump straight to a chunk of numbers instead of scrolling manually */}
        {jumpChunks.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[#F1F5F9]">
            <span className="text-[11px] font-bold text-[#64748B] shrink-0">ไปที่ลำดับ:</span>
            {jumpChunks.map((chunk) => (
              <button
                key={chunk.startIndex}
                type="button"
                onClick={() => handleJumpTo(chunk.startIndex)}
                className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-[#E0F2FE] text-[#0284C7] text-[11px] font-bold border border-[#D2E0EB] cursor-pointer transition-colors"
              >
                {chunk.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Customer Ledger Cards/Table (Responsive PC & Mobile) */}
      <div className="space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-[#D2E0EB] text-center text-[#64748B] font-medium text-sm">
            ไม่พบข้อมูลลูกค้าสำหรับเงื่อนไขการค้นหานี้
          </div>
        ) : (
          filteredCustomers.map((customer) => {
            const hasCustomPrice = customer.customPrices && Object.keys(customer.customPrices).length > 0;
            const isRecordedToday = customer.lastUpdated === selectedDate;

            return (
              <div
                key={customer.id}
                ref={(el) => {
                  cardRefs.current[customer.id] = el;
                }}
                className="bg-white rounded-2xl p-4 border border-[#D2E0EB] hover:border-[#0284C7] shadow-xs transition-all space-y-3"
              >
                {/* Top Row: Name, Route & Manage Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#F1F5F9]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#0284C7]">storefront</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-[#1E3A5F]">
                          {routeIndexById[customer.id]}. {customer.name}
                        </span>
                        {hasCustomPrice && (
                          <span className="text-[10px] font-bold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] px-2 py-0.5 rounded-full">
                            ราคาส่วนตัว
                          </span>
                        )}
                        {isRecordedToday ? (
                          <>
                            <span className="text-[10px] font-bold bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[12px]">check_circle</span>
                              บันทึกแล้ว
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE_CLASS[customer.status]}`}
                            >
                              {statusLabels[customer.status]}
                            </span>
                          </>
                        ) : (
                          <span className="text-[10px] font-bold bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0] px-2 py-0.5 rounded-full">
                            ยังไม่บันทึก
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5">
                        <span className="text-xs text-[#64748B] font-medium">
                          สายส่ง: {customer.route} • รหัส {customer.code}
                        </span>
                      </div>
                      {customer.iceBuckets && customer.iceBuckets.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                          <span className="text-[10px] font-bold text-[#0369A1] uppercase tracking-wide">
                            🪣 ถังน้ำแข็งที่ฝากร้านนี้:
                          </span>
                          {customer.iceBuckets.map((b) => (
                            <span
                              key={b.id}
                              className="text-[11px] font-bold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] px-2 py-1 rounded-lg"
                            >
                              {b.bucketSize} × {b.count} ใบ
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setBucketCustomer(customer)}
                      className="px-2 py-1 text-xs font-bold text-[#0369A1] bg-[#F0F9FF] hover:bg-[#E0F2FE] border border-[#BAE6FD] rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                      title="จัดการถังน้ำแข็งที่ฝากร้านนี้"
                    >
                      <span className="material-symbols-outlined text-sm">inventory</span>
                      ถังน้ำแข็ง ({customer.iceBuckets?.reduce((s, b) => s + b.count, 0) || 0})
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenPriceModal(customer)}
                      className="px-2.5 py-1 text-xs font-bold text-[#0284C7] bg-[#E0F2FE] hover:bg-[#BAE6FD] border border-[#BAE6FD] rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                      title="แก้ไขราคาเฉพาะลูกค้า"
                    >
                      <span className="material-symbols-outlined text-sm">tune</span>
                      ตั้งราคาเฉพาะ
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(customer.id, customer.name)}
                      className="p-1.5 text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-xl transition-colors cursor-pointer"
                      title="ลบชื่อลูกค้า"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>

                {/* Product Quantities Input Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
                    {products.map((prod) => {
                      const price = getUnitPrice(customer, prod.key);
                      const qty = customer.quantities[prod.key] || 0;

                      return (
                        <div
                          key={prod.id}
                          className="flex flex-col gap-1 p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl"
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold text-[#64748B]">
                            <span className="truncate">{prod.labelTh}</span>
                            <span className="text-[10px] text-[#0284C7] shrink-0">฿{price}</span>
                          </div>
                          <input
                            type="number"
                            min="0"
                            value={qty || ''}
                            placeholder="0"
                            onChange={(e) =>
                              handleQuantityChange(
                                customer.id,
                                prod.key,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-full h-9 border border-[#CBD5E1] bg-white rounded-lg text-center font-bold text-sm text-[#1E3A5F] data-mono focus:ring-1 focus:ring-[#0284C7] outline-none"
                          />
                        </div>
                      );
                    })}

                    {/* Extra amount (เศษเงิน) */}
                    <div className="flex flex-col gap-1 p-2 bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl col-span-2 sm:col-span-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#64748B]">
                        <span>เศษเงิน</span>
                        <span className="text-[10px] text-[#64748B]">บาท</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={customer.extraAmount || ''}
                        placeholder="0.00"
                        onChange={(e) =>
                          handleExtraAmountChange(
                            customer.id,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full h-9 border border-[#CBD5E1] bg-white rounded-lg text-center font-bold text-sm text-[#1E293B] data-mono focus:ring-1 focus:ring-[#1E3A5F] outline-none"
                      />
                    </div>
                </div>

                {/* Bottom Row: Total Amount & Payment Status Selector */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-[#F1F5F9]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#64748B] uppercase">
                      ยอดรวมบิล:
                    </span>
                    <span className="font-bold text-xl text-[#0284C7] data-mono">
                      ฿ {customer.totalAmount.toLocaleString()}
                    </span>

                    {customer.statusDetails && customer.status === 'NewAndOld' && (
                      <span className="text-xs text-[#D97706] font-semibold bg-[#FEF3C7] px-2 py-0.5 rounded-lg border border-[#FDE68A]">
                        ใหม่ ฿{customer.statusDetails.newAmountPaid} + เก่า ฿{customer.statusDetails.oldDebtPaid}
                      </span>
                    )}
                  </div>

                  {/* Payment Status Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap py-1">
                      <button
                        type="button"
                        onClick={() => handleStatusToggle(customer.id, 'Cash')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          customer.status === 'Cash'
                            ? 'bg-[#0284C7] text-white shadow-xs'
                            : 'border border-[#0284C7] text-[#0284C7] hover:bg-[#0284C7]/10'
                        }`}
                      >
                        {statusLabels.Cash}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusToggle(customer.id, 'Debt')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          customer.status === 'Debt'
                            ? 'bg-[#DC2626] text-white shadow-xs'
                            : 'border border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626]/10'
                        }`}
                      >
                        {statusLabels.Debt}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusToggle(customer.id, 'Credit')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          customer.status === 'Credit'
                            ? 'bg-[#475569] text-white shadow-xs'
                            : 'border border-[#475569] text-[#475569] hover:bg-[#475569]/10'
                        }`}
                      >
                        {statusLabels.Credit}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusToggle(customer.id, 'OldPayment')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          customer.status === 'OldPayment'
                            ? 'bg-[#D97706] text-white shadow-xs'
                            : 'border border-[#D97706] text-[#D97706] hover:bg-[#D97706]/10'
                        }`}
                      >
                        {statusLabels.OldPayment}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusToggle(customer.id, 'NewAndOld')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          customer.status === 'NewAndOld'
                            ? 'bg-[#B45309] text-white shadow-xs'
                            : 'border border-[#B45309] text-[#B45309] hover:bg-[#FEF3C7]'
                        }`}
                      >
                        {statusLabels.NewAndOld}
                      </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Off-Route Customer Button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-2 text-[#1E3A5F] hover:bg-[#1E3A5F]/10 px-6 py-3 rounded-full font-bold text-sm md:text-base transition-colors border border-[#1E3A5F]/30 cursor-pointer"
        >
          <span className="material-symbols-outlined">person_add</span>
          เพิ่มลูกค้านอกรอบ
        </button>
      </div>

      {/* Floating Action Button (FAB) for Mobile Quick Add */}
      <button
        onClick={onOpenAddModal}
        className="fixed bottom-24 right-5 w-14 h-14 bg-[#0284C7] text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all md:hidden z-40 cursor-pointer hover:bg-[#0369A1]"
        title="เพิ่มลูกค้านอกรอบ"
      >
        <span className="material-symbols-outlined text-2xl">add</span>
      </button>

      {/* Ice Bucket Manager Modal */}
      <IceBucketManagerModal
        isOpen={!!bucketCustomer}
        onClose={() => setBucketCustomer(null)}
        customer={bucketCustomer}
        onUpdateCustomer={onUpdateCustomer}
        onShowToast={onShowToast}
      />

      {/* Confirm Payment Status Change Modal */}
      <ConfirmStatusModal
        isOpen={!!pendingStatusChange}
        customer={pendingStatusChange?.customer || null}
        status={pendingStatusChange?.status || null}
        statusLabel={pendingStatusChange ? statusLabels[pendingStatusChange.status] : ''}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setPendingStatusChange(null)}
      />
    </div>
  );
};
