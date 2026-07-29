import React, { useState } from 'react';
import { CustomerAccount, PaymentStatusDetails } from '../types';

interface NewAndOldPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerAccount | null;
  onSavePayment: (
    customerId: string,
    details: PaymentStatusDetails
  ) => void;
  onShowToast: (msg: string) => void;
}

export const NewAndOldPaymentModal: React.FC<NewAndOldPaymentModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSavePayment,
  onShowToast,
}) => {
  if (!isOpen || !customer) return null;

  const [newPaidAmount, setNewPaidAmount] = useState<number>(customer.totalAmount || 0);
  const [oldDebtPaid, setOldDebtPaid] = useState<number>(0);

  const grandTotalReceived = (newPaidAmount || 0) + (oldDebtPaid || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePayment(customer.id, {
      status: 'NewAndOld',
      newAmountPaid: Math.max(0, newPaidAmount),
      oldDebtPaid: Math.max(0, oldDebtPaid),
    });
    onShowToast(`บันทึกการชำระเงิน "จ่ายใหม่ (฿${newPaidAmount}) + จ่ายเก่า (฿${oldDebtPaid})" ของคุณ ${customer.name} เรียบร้อยแล้ว`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-[#BAE6FD]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FEF3C7] flex items-center justify-center text-[#D97706]">
              <span className="material-symbols-outlined text-xl">payments</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1E3A5F]">ชำระยอดของใหม่ + ยอดเก่า</h3>
              <p className="text-xs text-[#64748B]">ลูกค้า: {customer.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:bg-[#F1F5F9] rounded-full transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl flex justify-between items-center">
            <span className="text-xs font-semibold text-[#64748B]">ยอดขายบิลปัจจุบัน:</span>
            <span className="text-base font-bold text-[#0284C7] data-mono">
              ฿ {customer.totalAmount.toLocaleString()}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-[#1E3A5F] block mb-1">
                1. จำนวนเงินที่ชำระสำหรับบิลใหม่วันนี้ (บาท)
              </label>
              <input
                type="number"
                min="0"
                value={newPaidAmount}
                onChange={(e) => setNewPaidAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 border border-[#CBD5E1] rounded-xl font-bold text-sm text-[#0284C7] data-mono focus:ring-2 focus:ring-[#0284C7] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#1E3A5F] block mb-1">
                2. จำนวนเงินที่นำมาใช้ชำระหนี้เก่าเพิ่ม (บาท)
              </label>
              <input
                type="number"
                min="0"
                placeholder="0.00"
                value={oldDebtPaid}
                onChange={(e) => setOldDebtPaid(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 border border-[#CBD5E1] rounded-xl font-bold text-sm text-[#D97706] data-mono focus:ring-2 focus:ring-[#D97706] outline-none"
              />
            </div>
          </div>

          <div className="p-4 bg-[#E0F2FE] border border-[#BAE6FD] rounded-2xl flex justify-between items-center mt-2">
            <div>
              <span className="text-xs font-bold text-[#0369A1] uppercase block">
                รวมเงินสดที่รับมาจริง
              </span>
              <span className="text-[11px] text-[#0284C7]">บิลใหม่ + หนี้เก่า</span>
            </div>
            <span className="text-2xl font-bold text-[#0369A1] data-mono">
              ฿ {grandTotalReceived.toLocaleString()}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#CBD5E1] text-[#64748B] rounded-xl text-xs font-bold hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#D97706] text-white rounded-xl text-xs font-bold hover:bg-[#B45309] transition-colors cursor-pointer shadow-xs flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">check_circle</span>
              บันทึกชำระเงิน
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
