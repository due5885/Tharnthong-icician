import React, { useState } from 'react';
import { IceProduct } from '../types';

interface ProductManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: IceProduct[];
  onAddProduct: (product: Omit<IceProduct, 'id'>) => void;
  onUpdateProduct: (id: string, updated: Partial<IceProduct>) => void;
  onDeleteProduct: (id: string) => void;
  onShowToast: (msg: string) => void;
}

export const ProductManagerModal: React.FC<ProductManagerModalProps> = ({
  isOpen,
  onClose,
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onShowToast,
}) => {
  const [newLabel, setNewLabel] = useState('');
  const [newUnit, setNewUnit] = useState('ถุง');
  const [newPrice, setNewPrice] = useState<number>(30);
  const [newIcon, setNewIcon] = useState('ac_unit');
  const [newImageUrl, setNewImageUrl] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) {
      onShowToast('กรุณากรอกชื่อสินค้า');
      return;
    }

    const key = `custom_${Date.now()}`;
    onAddProduct({
      key,
      labelTh: newLabel.trim(),
      unit: newUnit.trim() || 'ถุง',
      icon: newIcon || 'ac_unit',
      imageUrl: newImageUrl.trim() || undefined,
      pricePerUnit: Math.max(0, newPrice),
    });

    setNewLabel('');
    setNewImageUrl('');
    setNewPrice(30);
    onShowToast(`เพิ่มสินค้า "${newLabel}" เรียบร้อยแล้ว`);
  };

  const handleDelete = (prod: IceProduct) => {
    if (confirm(`คุณต้องการลบสินค้า "${prod.labelTh}" หรือไม่?`)) {
      onDeleteProduct(prod.id);
      onShowToast(`ลบสินค้า "${prod.labelTh}" เรียบร้อยแล้ว`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-[#BAE6FD] max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E0F2FE] flex items-center justify-center text-[#0284C7]">
              <span className="material-symbols-outlined text-xl">inventory_2</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1E3A5F]">จัดการประเภทสินค้า / ราคามาตรฐาน</h3>
              <p className="text-xs text-[#64748B]">เพิ่ม ลบ หรือแก้ไขชื่อสินค้าและราคาขายตั้งต้น</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:bg-[#F1F5F9] rounded-full transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Existing Products List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 no-scrollbar">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-1">
            รายการสินค้าในระบบ ({products.length})
          </h4>
          {products.map((prod) => (
            <div
              key={prod.id}
              className="flex items-center justify-between gap-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl hover:bg-[#F1F5F9] transition-all"
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                {prod.imageUrl ? (
                  <img
                    src={prod.imageUrl}
                    alt={prod.labelTh}
                    className="w-10 h-10 rounded-xl object-cover border border-[#CBD5E1] shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-lg">
                      {prod.icon || 'ac_unit'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={prod.labelTh}
                    onChange={(e) => onUpdateProduct(prod.id, { labelTh: e.target.value })}
                    className="font-bold text-sm text-[#1E293B] bg-transparent border-b border-transparent focus:border-[#0284C7] focus:bg-white px-1 py-0.5 rounded-sm outline-none w-full"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white border border-[#CBD5E1] rounded-xl px-2 py-1 text-xs">
                  <span className="text-[#64748B]">฿</span>
                  <input
                    type="number"
                    value={prod.pricePerUnit}
                    onChange={(e) =>
                      onUpdateProduct(prod.id, {
                        pricePerUnit: Math.max(0, parseFloat(e.target.value) || 0),
                      })
                    }
                    className="w-14 font-bold text-[#0284C7] text-center data-mono outline-none"
                  />
                  <span className="text-[#64748B] text-[11px]">/{prod.unit}</span>
                </div>

                <button
                  onClick={() => handleDelete(prod)}
                  className="p-1.5 text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-xl transition-colors cursor-pointer"
                  title="ลบสินค้า"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Product Form */}
        <form onSubmit={handleAdd} className="pt-4 border-t border-[#E2E8F0] space-y-3">
          <h4 className="text-xs font-bold text-[#1E3A5F]">เพิ่มชนิดสินค้าใหม่</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-[11px] font-semibold text-[#64748B]">ชื่อสินค้า</label>
              <input
                type="text"
                placeholder="เช่น หลอดโม่, แพ็ค 5kg"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0284C7] outline-none"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#64748B]">หน่วยนับ</label>
              <input
                type="text"
                placeholder="เช่น ถุง, แพ็ค"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0284C7] outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#64748B]">ราคาขายตั้งต้น (฿)</label>
              <input
                type="number"
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#0284C7] data-mono focus:ring-2 focus:ring-[#0284C7] outline-none"
              />
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
              เพิ่มสินค้า
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
