import React, { useState } from 'react';
import { ExpenseCategory } from '../types';
import { EXPENSE_ICON_CHOICES } from '../data/initialData';

interface ExpenseCategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ExpenseCategory[];
  onAddCategory: (category: Omit<ExpenseCategory, 'id'>) => void;
  onDeleteCategory: (id: string) => void;
  onShowToast: (msg: string) => void;
}

export const ExpenseCategoryManagerModal: React.FC<ExpenseCategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onAddCategory,
  onDeleteCategory,
  onShowToast,
}) => {
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState(EXPENSE_ICON_CHOICES[0]);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) {
      onShowToast('กรุณากรอกชื่อหมวดหมู่');
      return;
    }
    onAddCategory({
      key: `custom_${Date.now()}`,
      labelTh: newLabel.trim(),
      icon: newIcon,
    });
    onShowToast(`เพิ่มหมวดหมู่ "${newLabel.trim()}" เรียบร้อยแล้ว`);
    setNewLabel('');
    setNewIcon(EXPENSE_ICON_CHOICES[0]);
  };

  const handleDelete = (cat: ExpenseCategory) => {
    if (categories.length <= 1) {
      onShowToast('ต้องมีหมวดหมู่รายจ่ายอย่างน้อย 1 หมวด');
      return;
    }
    if (confirm(`คุณต้องการลบหมวดหมู่ "${cat.labelTh}" หรือไม่?`)) {
      onDeleteCategory(cat.id);
      onShowToast(`ลบหมวดหมู่ "${cat.labelTh}" เรียบร้อยแล้ว`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-[#BAE6FD] max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E0F2FE] flex items-center justify-center text-[#0284C7]">
              <span className="material-symbols-outlined text-xl">category</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1E3A5F]">จัดการหมวดหมู่รายจ่าย</h3>
              <p className="text-xs text-[#64748B]">เพิ่มหรือลบหมวดหมู่ พร้อมเลือกไอคอนเอง</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:bg-[#F1F5F9] rounded-full transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Existing Categories List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2 no-scrollbar">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-1">
            หมวดหมู่ในระบบ ({categories.length})
          </h4>
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between gap-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl"
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-lg">{cat.icon}</span>
                </div>
                <span className="font-bold text-sm text-[#1E293B] truncate">{cat.labelTh}</span>
              </div>
              <button
                onClick={() => handleDelete(cat)}
                className="p-1.5 text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-xl transition-colors cursor-pointer shrink-0"
                title="ลบหมวดหมู่"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          ))}
        </div>

        {/* Add New Category Form */}
        <form onSubmit={handleAdd} className="pt-4 border-t border-[#E2E8F0] space-y-3">
          <h4 className="text-xs font-bold text-[#1E3A5F]">เพิ่มหมวดหมู่ใหม่</h4>

          <input
            type="text"
            placeholder="เช่น ค่าเช่า, ค่าโทรศัพท์"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="w-full px-3 py-2.5 border border-[#CBD5E1] rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#0284C7] outline-none"
            required
          />

          <div>
            <label className="text-[11px] font-semibold text-[#64748B] block mb-1.5">เลือกไอคอน</label>
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
              {EXPENSE_ICON_CHOICES.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setNewIcon(icon)}
                  className={`aspect-square rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    newIcon === icon
                      ? 'bg-[#0284C7] text-white shadow-xs ring-2 ring-[#0284C7] ring-offset-1'
                      : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                  }`}
                  title={icon}
                >
                  <span className="material-symbols-outlined text-lg">{icon}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#CBD5E1] text-[#64748B] rounded-xl text-xs font-bold hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            >
              ปิด
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0284C7] text-white rounded-xl text-xs font-bold hover:bg-[#0369A1] transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              เพิ่มหมวดหมู่
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
