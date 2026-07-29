import React, { useState, useEffect } from 'react';
import { CustomerAccount, IceProduct, RouteItem } from '../types';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: RouteItem[];
  products: IceProduct[];
  onAddCustomer: (customer: Omit<CustomerAccount, 'id'>) => void;
  onShowToast: (msg: string) => void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  routes,
  products,
  onAddCustomer,
  onShowToast,
}) => {
  const [name, setName] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [code, setCode] = useState('');

  // Set default route when modal opens or routes change
  useEffect(() => {
    if (isOpen) {
      if (routes && routes.length > 0) {
        setSelectedRoute(routes[0].name);
      } else {
        setSelectedRoute('สายส่ง A');
      }
    }
  }, [isOpen, routes]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onShowToast('กรุณาระบุชื่อร้านค้าหรือลูกค้า');
      return;
    }

    const targetRoute = selectedRoute || (routes[0]?.name || 'สายส่ง A');
    const generatedCode =
      code.trim() ||
      `C-${Math.floor(100 + Math.random() * 900)}`;

    // Build initial quantities object dynamically for all current products
    const initialQuantities: Record<string, number> = {};
    products.forEach((p) => {
      initialQuantities[p.key] = 0;
    });

    onAddCustomer({
      code: generatedCode,
      name: name.trim(),
      route: targetRoute,
      quantities: initialQuantities,
      extraAmount: 0,
      totalAmount: 0,
      status: 'Cash',
    });

    onShowToast(`เพิ่มลูกค้า "${name.trim()}" ใน "${targetRoute}" เรียบร้อยแล้ว`);
    setName('');
    setCode('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#D2E0EB] shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-[#64748B] hover:text-[#1E293B] p-1 rounded-full cursor-pointer"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h3 className="text-xl font-bold text-[#1E3A5F] mb-1 flex items-center gap-2 font-sans">
          <span className="material-symbols-outlined text-[#0284C7]">person_add</span>
          เพิ่มลูกค้านอกรอบ / เพิ่มลูกค้าใหม่
        </h3>
        <p className="text-xs text-[#64748B] mb-4">
          เพิ่มชื่อลูกค้ารายใหม่ลงในระบบบัญชีตามสายส่งที่เลือก
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-1">
              ชื่อร้านค้า / ลูกค้า <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              placeholder="เช่น ร้านเจ๊เล็ก ซอย 5, ครัวคุณอ๋อย..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D2E0EB] text-sm focus:ring-2 focus:ring-[#0284C7] text-[#1E293B] outline-none"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-1">
              สายส่งน้ำแข็ง <span className="text-[#DC2626]">*</span>
            </label>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="w-full py-2.5 px-3.5 rounded-xl border border-[#D2E0EB] bg-white text-sm font-medium focus:ring-2 focus:ring-[#0284C7] text-[#1E293B] outline-none cursor-pointer"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
              <option value="ลูกค้าประจำ">ลูกค้าประจำ (VIP)</option>
              <option value="หน้าร้าน / รับเอง">หน้าร้าน / รับเอง</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-1">
              รหัสลูกค้า (ระบบจะสุ่มให้อัตโนมัติหากไม่ระบุ)
            </label>
            <input
              type="text"
              placeholder="เช่น A09, B12..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D2E0EB] text-sm focus:ring-2 focus:ring-[#0284C7] text-[#1E293B] outline-none data-mono"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#D2E0EB] font-bold text-[#1E293B] text-xs hover:bg-[#F1F5F9] cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#0284C7] text-white font-bold text-xs hover:bg-[#0369A1] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              เพิ่มลูกค้าใหม่
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
