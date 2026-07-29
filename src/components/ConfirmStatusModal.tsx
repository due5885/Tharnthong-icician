import React from 'react';
import { CustomerAccount, PaymentStatus } from '../types';

interface ConfirmStatusModalProps {
  isOpen: boolean;
  customer: CustomerAccount | null;
  status: PaymentStatus | null;
  statusLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmStatusModal: React.FC<ConfirmStatusModalProps> = ({
  isOpen,
  customer,
  statusLabel,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-[#BAE6FD]">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[#E2E8F0]">
          <div className="w-10 h-10 rounded-2xl bg-[#E0F2FE] flex items-center justify-center text-[#0284C7]">
            <span className="material-symbols-outlined text-xl">help</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1E3A5F]">ยืนยันบันทึกสถานะการชำระเงิน</h3>
            <p className="text-xs text-[#64748B]">ลูกค้า: {customer.name}</p>
          </div>
        </div>

        <div className="py-4 space-y-3">
          <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl flex justify-between items-center">
            <span className="text-xs font-semibold text-[#64748B]">ยอดรวมบิล:</span>
            <span className="text-base font-bold text-[#0284C7] data-mono">
              ฿ {customer.totalAmount.toLocaleString()}
            </span>
          </div>

          <div className="p-4 bg-[#E0F2FE] border border-[#BAE6FD] rounded-2xl flex justify-between items-center">
            <span className="text-xs font-bold text-[#0369A1] uppercase">สถานะที่จะบันทึก</span>
            <span className="text-base font-bold text-[#0369A1]">{statusLabel}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-[#CBD5E1] text-[#64748B] rounded-xl text-xs font-bold hover:bg-[#F1F5F9] transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2 bg-[#0284C7] text-white rounded-xl text-xs font-bold hover:bg-[#0369A1] transition-colors cursor-pointer shadow-xs flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">check_circle</span>
            ยืนยันบันทึก
          </button>
        </div>
      </div>
    </div>
  );
};
