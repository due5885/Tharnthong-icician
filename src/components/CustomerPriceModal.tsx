import React, { useState, useEffect } from 'react';
import { CustomerAccount, IceProduct } from '../types';

interface CustomerPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerAccount | null;
  products: IceProduct[];
  onSavePrices: (customerId: string, customPrices: Partial<Record<string, number>> | undefined) => void;
  onShowToast: (msg: string) => void;
}

export const CustomerPriceModal: React.FC<CustomerPriceModalProps> = ({
  isOpen,
  onClose,
  customer,
  products,
  onSavePrices,
  onShowToast,
}) => {
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (customer) {
      const initial: Record<string, number> = {};
      products.forEach((p) => {
        initial[p.key] =
          customer.customPrices && customer.customPrices[p.key] !== undefined
            ? customer.customPrices[p.key]!
            : p.pricePerUnit;
      });
      setPrices(initial);
    }
  }, [customer, products]);

  if (!isOpen || !customer) return null;

  const handlePriceChange = (key: string, val: number) => {
    setPrices((prev) => ({
      ...prev,
      [key]: isNaN(val) ? 0 : val,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePrices(customer.id, prices);
    onShowToast(`ตั้งราคาเฉพาะสำหรับ "${customer.name}" เรียบร้อยแล้ว`);
    onClose();
  };

  const handleResetDefault = () => {
    onSavePrices(customer.id, undefined);
    onShowToast(`รีเซ็ตราคาของ "${customer.name}" ให้เป็นราคามาตรฐานแล้ว`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#D2E0EB] shadow-2xl relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#64748B] hover:text-[#1E293B] p-1 rounded-full cursor-pointer"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h3 className="text-xl font-bold text-[#1E3A5F] mb-1 flex items-center gap-2 font-sans">
          <span className="material-symbols-outlined text-[#0284C7]">tune</span>
          แก้ไขราคาเฉพาะลูกค้า
        </h3>
        <p className="text-xs text-[#0284C7] font-semibold mb-3 bg-[#E0F2FE] p-2 rounded-xl border border-[#BAE6FD]">
          ร้านค้า / ลูกค้า: <span className="font-bold">{customer.name}</span>
        </p>

        <form onSubmit={handleSave} className="space-y-3 flex-1 overflow-y-auto no-scrollbar pr-1">
          <div className="space-y-2">
            {products.map((prod) => (
              <div
                key={prod.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-[#D2E0EB] bg-[#F8FAFC]"
              >
                <div className="flex items-center gap-2">
                  {prod.imageUrl ? (
                    <img
                      src={prod.imageUrl}
                      alt={prod.labelTh}
                      className="w-8 h-8 rounded-lg object-cover border border-[#CBD5E1] shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-[#1E3A5F] text-lg">
                      {prod.icon || 'ac_unit'}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-[#1E293B]">
                    {prod.labelTh}
                  </span>
                  <span className="text-xs text-[#64748B]">({prod.unit})</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-[#64748B]">฿</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={prices[prod.key] ?? prod.pricePerUnit}
                    onChange={(e) => handlePriceChange(prod.key, parseFloat(e.target.value))}
                    className="w-20 px-2 py-1 border border-[#D2E0EB] rounded-lg text-center font-bold text-sm text-[#1E3A5F] data-mono bg-white focus:ring-2 focus:ring-[#1E3A5F]"
                    required
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#D2E0EB] flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleResetDefault}
              className="py-2.5 px-3 rounded-xl border border-[#D2E0EB] text-xs font-bold text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
            >
              ใช้ราคามาตรฐาน
            </button>
            <div className="flex gap-2 flex-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-[#D2E0EB] text-xs font-bold text-[#1E293B] hover:bg-[#F1F5F9] cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#1E3A5F] text-white text-xs font-bold hover:bg-[#152C4A] active:scale-95 transition-all cursor-pointer"
              >
                บันทึกราคา
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
