import React, { useState } from 'react';
import { PaymentStatusLabels } from '../types';
import { PAYMENT_STATUS_DESCRIPTIONS, PAYMENT_STATUS_ORDER, DEFAULT_PAYMENT_STATUS_LABELS } from '../lib/paymentStatusLabels';

interface PaymentStatusLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  labels: PaymentStatusLabels;
  onSaveLabels: (labels: PaymentStatusLabels) => void;
  onShowToast: (msg: string) => void;
}

export const PaymentStatusLabelsModal: React.FC<PaymentStatusLabelsModalProps> = ({
  isOpen,
  onClose,
  labels,
  onSaveLabels,
  onShowToast,
}) => {
  const [draft, setDraft] = useState<PaymentStatusLabels>(labels);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveLabels(draft);
    onShowToast('บันทึกป้ายชื่อสถานะการชำระเงินเรียบร้อยแล้ว');
    onClose();
  };

  const handleReset = () => {
    setDraft(DEFAULT_PAYMENT_STATUS_LABELS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-[#BAE6FD]">
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E0F2FE] flex items-center justify-center text-[#0284C7]">
              <span className="material-symbols-outlined text-xl">tune</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1E3A5F]">แก้ไขป้ายชื่อสถานะการชำระเงิน</h3>
              <p className="text-xs text-[#64748B]">สำหรับแอดมิน/ฝ่ายบัญชีเท่านั้น</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:bg-[#F1F5F9] rounded-full transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-3">
          {PAYMENT_STATUS_ORDER.map((status) => (
            <div key={status}>
              <label className="text-xs font-bold text-[#1E3A5F] block mb-1">
                {PAYMENT_STATUS_DESCRIPTIONS[status]}
              </label>
              <input
                type="text"
                value={draft[status]}
                onChange={(e) => setDraft((prev) => ({ ...prev, [status]: e.target.value }))}
                required
                className="w-full px-3 py-2.5 border border-[#CBD5E1] rounded-xl font-bold text-sm text-[#1E3A5F] focus:ring-2 focus:ring-[#0284C7] outline-none"
              />
            </div>
          ))}

          <div className="flex justify-between items-center gap-2 pt-3">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 text-[#64748B] rounded-xl text-xs font-bold hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            >
              ใช้ค่าเริ่มต้น
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[#CBD5E1] text-[#64748B] rounded-xl text-xs font-bold hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#0284C7] text-white rounded-xl text-xs font-bold hover:bg-[#0369A1] transition-colors cursor-pointer shadow-xs flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">check_circle</span>
                บันทึก
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
