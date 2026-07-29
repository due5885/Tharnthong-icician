import React, { useMemo, useState } from 'react';
import { IcePurchaseItemEntry, IcePurchaseItemType, IcePurchaseRecord, IceSupplier } from '../types';
import { DateInput } from './DateInput';

interface IcePurchaseViewProps {
  suppliers: IceSupplier[];
  itemTypes: IcePurchaseItemType[];
  purchases: IcePurchaseRecord[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onAddPurchase: (record: IcePurchaseRecord) => void;
  onDeletePurchase: (id: string) => void;
  onAddSupplier: (name: string) => IceSupplier;
  onUpdateSupplierItemPrice: (supplierId: string, key: string, pricePerUnit: number) => void;
  onShowToast: (msg: string) => void;
}

const emptyItems = (itemTypes: IcePurchaseItemType[]): IcePurchaseItemEntry[] =>
  itemTypes.map((it) => ({ name: it.labelTh, quantity: 0, amount: 0 }));

export const IcePurchaseView: React.FC<IcePurchaseViewProps> = ({
  suppliers,
  itemTypes,
  purchases,
  selectedDate,
  onDateChange,
  onAddPurchase,
  onDeletePurchase,
  onAddSupplier,
  onUpdateSupplierItemPrice,
  onShowToast,
}) => {
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [items, setItems] = useState<IcePurchaseItemEntry[]>(() => emptyItems(itemTypes));
  const [totalOverride, setTotalOverride] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'Cash' | 'Debt'>('Cash');
  const [note, setNote] = useState('');
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [showPriceSettings, setShowPriceSettings] = useState(false);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  const suggestedTotal = useMemo(() => items.reduce((sum, it) => sum + (it.amount || 0), 0), [items]);
  const total = totalOverride !== '' ? Number(totalOverride) || 0 : suggestedTotal;

  const todayPurchases = purchases.filter((p) => p.date === selectedDate);
  const todayTotal = todayPurchases.reduce((sum, p) => sum + p.totalAmount, 0);

  const handleSelectSupplier = (id: string) => {
    setSupplierId(id);
    // Recompute amounts for any quantities already entered, using the newly selected supplier's prices
    const supplier = suppliers.find((s) => s.id === id);
    setItems((prev) =>
      prev.map((it, i) => {
        const price = supplier?.itemPrices[itemTypes[i]?.key] || 0;
        return it.quantity > 0 && price > 0 ? { ...it, amount: it.quantity * price } : it;
      })
    );
  };

  const handleQuantityChange = (index: number, value: string) => {
    const num = value === '' ? 0 : Number(value);
    const quantity = Number.isFinite(num) ? num : 0;
    const price = selectedSupplier?.itemPrices[itemTypes[index]?.key] || 0;
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, quantity, amount: price > 0 ? quantity * price : it.amount } : it))
    );
  };

  const handleAmountChange = (index: number, value: string) => {
    const num = value === '' ? 0 : Number(value);
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, amount: Number.isFinite(num) ? num : 0 } : it)));
  };

  const resetForm = () => {
    setItems(emptyItems(itemTypes));
    setTotalOverride('');
    setPaymentType('Cash');
    setNote('');
  };

  const handleAddSupplier = () => {
    if (!newSupplierName.trim()) return;
    const created = onAddSupplier(newSupplierName.trim());
    setSupplierId(created.id);
    setNewSupplierName('');
    setShowAddSupplier(false);
  };

  const handleSave = () => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) {
      onShowToast('กรุณาเลือกผู้ขายก่อนบันทึก');
      return;
    }
    if (total <= 0) {
      onShowToast('กรุณากรอกยอดเงินหรือจำนวนสินค้าก่อนบันทึก');
      return;
    }

    const record: IcePurchaseRecord = {
      id: `ICEPUR-${Date.now()}`,
      date: selectedDate,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      supplierId: supplier.id,
      supplierName: supplier.name,
      items: items.filter((it) => it.quantity > 0 || it.amount > 0),
      totalAmount: total,
      paymentType,
      note: note.trim() || undefined,
    };
    onAddPurchase(record);
    resetForm();
    onShowToast('บันทึกการซื้อน้ำแข็งเรียบร้อยแล้ว');
  };

  const hasUnsetPrices = itemTypes.some((it) => (selectedSupplier?.itemPrices[it.key] || 0) <= 0);

  return (
    <div className="space-y-6 pb-28">
      <section className="bg-white p-4 sm:p-5 rounded-2xl border border-[#D2E0EB] shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-[#1E3A5F] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0284C7]">shopping_cart</span>
            บันทึกซื้อน้ำแข็งรายวัน
          </h2>
          <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#CBD5E1] px-3 py-1.5 rounded-xl">
            <span className="material-symbols-outlined text-sm text-[#0284C7]">calendar_today</span>
            <DateInput
              value={selectedDate}
              onChange={onDateChange}
              className="bg-transparent text-sm font-bold text-[#0284C7] data-mono outline-none cursor-pointer w-24"
            />
          </div>
        </div>

        {/* Supplier picker */}
        <div>
          <label className="text-sm font-bold text-[#64748B] block mb-1.5">ซื้อจากผู้ขาย</label>
          <div className="flex flex-wrap items-center gap-2">
            {suppliers.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectSupplier(s.id)}
                className={`px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-colors border ${
                  supplierId === s.id
                    ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                    : 'bg-[#F8FAFC] text-[#1E293B] border-[#E2E8F0] hover:border-[#0284C7]'
                }`}
              >
                {s.name}
              </button>
            ))}

            {!showAddSupplier ? (
              <button
                onClick={() => setShowAddSupplier(true)}
                className="px-4 py-2.5 rounded-xl font-bold text-sm bg-[#F0F9FF] text-[#0284C7] border border-dashed border-[#7DD3FC] cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">add</span>
                เพิ่มผู้ขาย
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  placeholder="ชื่อผู้ขาย เช่น สายอื่นๆ"
                  autoFocus
                  className="px-3 py-2 border border-[#CBD5E1] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0284C7]"
                />
                <button
                  onClick={handleAddSupplier}
                  className="w-9 h-9 rounded-xl bg-[#16A34A] text-white flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">check</span>
                </button>
                <button
                  onClick={() => {
                    setShowAddSupplier(false);
                    setNewSupplierName('');
                  }}
                  className="w-9 h-9 rounded-xl bg-[#F1F5F9] text-[#64748B] flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Price settings — ราคาไม่เปลี่ยนบ่อย ตั้งครั้งเดียวแล้วให้ระบบคูณให้อัตโนมัติทุกครั้ง */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowPriceSettings((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 cursor-pointer"
          >
            <span className="flex items-center gap-2 text-sm font-bold text-[#1E3A5F]">
              <span className="material-symbols-outlined text-lg text-[#0284C7]">tune</span>
              ตั้งราคาต่อหน่วยของ {selectedSupplier?.name || 'ผู้ขาย'}
              {hasUnsetPrices && (
                <span className="text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded-full">
                  ยังไม่ได้ตั้งราคาบางรายการ
                </span>
              )}
            </span>
            <span className="material-symbols-outlined text-[#64748B]">
              {showPriceSettings ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          {showPriceSettings && selectedSupplier && (
            <div className="px-4 pb-4 space-y-2 border-t border-[#E2E8F0] pt-3">
              <p className="text-xs text-[#64748B]">
                ราคาต่อหน่วยล็อคแยกตามผู้ขายแต่ละราย ({selectedSupplier.name}) — ถ้าซื้อจากผู้ขายรายอื่น ราคาจะไม่ปนกัน
                ตั้งครั้งเดียว ระบบจะคูณราคา × จำนวนให้อัตโนมัติทุกครั้งที่กรอกจำนวน (แก้ยอดเงินทีหลังได้เสมอถ้าบิลจริงไม่ตรง)
              </p>
              {itemTypes.map((it) => (
                <div key={it.key} className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-[#1E293B] text-sm">{it.labelTh}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#94A3B8]">฿</span>
                    <input
                      type="number"
                      min={0}
                      value={selectedSupplier.itemPrices[it.key] || ''}
                      onChange={(e) =>
                        onUpdateSupplierItemPrice(selectedSupplier.id, it.key, Number(e.target.value) || 0)
                      }
                      placeholder="0"
                      className="w-24 text-right font-bold data-mono border border-[#CBD5E1] rounded-lg py-1.5 px-2 outline-none focus:ring-2 focus:ring-[#0284C7]"
                    />
                    <span className="text-xs text-[#94A3B8]">/หน่วย</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Item rows — matches the wholesale bill's columns: รายการ / จำนวน / จำนวนเงิน */}
        <div>
          <label className="text-sm font-bold text-[#64748B] block mb-1.5">รายการที่ซื้อ (ตามบิล)</label>
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_5rem_6rem] gap-2 px-1 text-xs font-bold text-[#94A3B8]">
              <span>รายการ</span>
              <span className="text-center">จำนวน</span>
              <span className="text-center">จำนวนเงิน</span>
            </div>
            {items.map((item, idx) => (
              <div key={item.name} className="grid grid-cols-[1fr_5rem_6rem] gap-2 items-center">
                <span className="font-semibold text-[#1E293B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2.5">
                  {item.name}
                  {(selectedSupplier?.itemPrices[itemTypes[idx]?.key] || 0) > 0 && (
                    <span className="text-[#94A3B8] font-normal text-xs">
                      {' '}
                      · ฿{selectedSupplier?.itemPrices[itemTypes[idx].key]}/หน่วย
                    </span>
                  )}
                </span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={item.quantity || ''}
                  onChange={(e) => handleQuantityChange(idx, e.target.value)}
                  placeholder="0"
                  className="stepper-input w-full text-center font-bold data-mono border border-[#CBD5E1] rounded-xl py-2.5 outline-none focus:ring-2 focus:ring-[#0284C7]"
                />
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={item.amount || ''}
                  onChange={(e) => handleAmountChange(idx, e.target.value)}
                  placeholder="0"
                  className="stepper-input w-full text-center font-bold data-mono border border-[#CBD5E1] rounded-xl py-2.5 outline-none focus:ring-2 focus:ring-[#0284C7]"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-bold text-[#64748B] block mb-1">
              รวมเงิน (ค่าเริ่มต้น: รวมจากรายการด้านบน)
            </label>
            <input
              type="number"
              value={totalOverride !== '' ? totalOverride : suggestedTotal || ''}
              onChange={(e) => setTotalOverride(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2.5 border border-[#CBD5E1] rounded-xl text-lg font-bold data-mono outline-none focus:ring-2 focus:ring-[#0284C7]"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-[#64748B] block mb-1">การชำระเงิน</label>
            <div className="flex gap-2">
              <button
                onClick={() => setPaymentType('Cash')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-colors ${
                  paymentType === 'Cash' ? 'bg-[#16A34A] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
              >
                เงินสด
              </button>
              <button
                onClick={() => setPaymentType('Debt')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-colors ${
                  paymentType === 'Debt' ? 'bg-[#DC2626] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
              >
                ค้างจ่าย
              </button>
            </div>
          </div>
        </div>

        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="หมายเหตุ (ถ้ามี)"
          className="w-full px-4 py-2.5 border border-[#CBD5E1] rounded-xl text-base outline-none focus:ring-2 focus:ring-[#0284C7]"
        />

        <button
          onClick={handleSave}
          className="w-full h-14 rounded-2xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-xl">save</span>
          บันทึกการซื้อน้ำแข็ง
        </button>
      </section>

      <section className="bg-white rounded-2xl border border-[#D2E0EB] shadow-xs p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-[#1E3A5F] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0284C7]">history</span>
            รายการซื้อวันนี้ ({selectedDate})
          </h3>
          <span className="text-sm font-bold text-[#1E3A5F] data-mono">รวม ฿{todayTotal.toLocaleString()}</span>
        </div>
        {todayPurchases.length === 0 ? (
          <p className="text-center text-sm text-[#94A3B8] py-6">ยังไม่มีรายการซื้อน้ำแข็งวันนี้</p>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {todayPurchases.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-[#1E293B] truncate">{p.supplierName}</p>
                  <p className="text-sm text-[#94A3B8]">
                    {p.time} ·{' '}
                    <span className={p.paymentType === 'Debt' ? 'text-[#DC2626] font-bold' : 'text-[#16A34A] font-bold'}>
                      {p.paymentType === 'Debt' ? 'ค้างจ่าย' : 'เงินสด'}
                    </span>
                    {p.items.length > 0 && (
                      <> · {p.items.map((it) => `${it.name} ${it.quantity}`).join(', ')}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-[#1E3A5F] data-mono">฿{p.totalAmount.toLocaleString()}</span>
                  <button
                    onClick={() => onDeletePurchase(p.id)}
                    className="w-9 h-9 rounded-xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center cursor-pointer"
                    title="ลบรายการ"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
