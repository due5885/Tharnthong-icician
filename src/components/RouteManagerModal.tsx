import React, { useState } from 'react';
import { RouteItem, RouteType } from '../types';

interface RouteManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: RouteItem[];
  onAddRoute: (route: Omit<RouteItem, 'id'>) => void;
  onUpdateRoute: (id: string, updated: Partial<RouteItem>) => void;
  onDeleteRoute: (id: string) => void;
  onMoveRoute: (index: number, direction: 'up' | 'down') => void;
  onShowToast: (msg: string) => void;
}

export const RouteManagerModal: React.FC<RouteManagerModalProps> = ({
  isOpen,
  onClose,
  routes,
  onAddRoute,
  onUpdateRoute,
  onDeleteRoute,
  onMoveRoute,
  onShowToast,
}) => {
  const [newName, setNewName] = useState('');
  const [newDriver, setNewDriver] = useState('');
  const [newType, setNewType] = useState<RouteType>('mobile');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      onShowToast('กรุณากรอกชื่อสายส่ง');
      return;
    }

    onAddRoute({
      name: newName.trim(),
      driverName: newDriver.trim() || 'ไม่ระบุพนักงาน',
      type: newType,
    });

    setNewName('');
    setNewDriver('');
    setNewType('mobile');
    onShowToast(`เพิ่มสายส่ง "${newName}" เรียบร้อยแล้ว`);
  };

  const handleConfirmDelete = (id: string, name: string) => {
    onDeleteRoute(id);
    setDeletingId(null);
    onShowToast(`ลบสายส่ง "${name}" เรียบร้อยแล้ว`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-[#BAE6FD] max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E0F2FE] flex items-center justify-center text-[#0284C7]">
              <span className="material-symbols-outlined text-xl">alt_route</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1E3A5F]">จัดการสายส่งน้ำแข็ง & คนส่ง</h3>
              <p className="text-xs text-[#64748B]">
                เพิ่ม ลบ ปรับลำดับขึ้น-ลง และเปลี่ยนชื่อสายส่งและพนักงานประจำสาย
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:bg-[#F1F5F9] rounded-full transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Existing Routes List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 no-scrollbar">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              สายส่งทั้งหมดในระบบ ({routes.length})
            </h4>
            <span className="text-[11px] text-[#0284C7] font-semibold">
              * ปุ่มลูกศรใช้ปรับลำดับการแสดงผล
            </span>
          </div>

          {routes.map((route, idx) => (
            <div
              key={route.id}
              className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl hover:bg-[#F1F5F9] transition-all space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                {/* Reorder Up/Down Buttons */}
                <div className="flex items-center gap-1 shrink-0 bg-white p-1 rounded-xl border border-[#CBD5E1]">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => onMoveRoute(idx, 'up')}
                    className="p-1 text-[#0284C7] hover:bg-[#E0F2FE] disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer"
                    title="เลื่อนขึ้นข้างบน"
                  >
                    <span className="material-symbols-outlined text-base">arrow_upward</span>
                  </button>
                  <button
                    type="button"
                    disabled={idx === routes.length - 1}
                    onClick={() => onMoveRoute(idx, 'down')}
                    className="p-1 text-[#0284C7] hover:bg-[#E0F2FE] disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer"
                    title="เลื่อนลงข้างล่าง"
                  >
                    <span className="material-symbols-outlined text-base">arrow_downward</span>
                  </button>
                </div>

                {/* Editable Fields */}
                <div className="grid grid-cols-2 gap-2 flex-1 min-w-0">
                  <div>
                    <label className="text-[10px] text-[#64748B] font-semibold block">ชื่อสายส่ง</label>
                    <input
                      type="text"
                      value={route.name}
                      onChange={(e) => onUpdateRoute(route.id, { name: e.target.value })}
                      className="font-bold text-sm text-[#1E3A5F] bg-transparent border-b border-transparent focus:border-[#0284C7] focus:bg-white px-1 py-0.5 rounded-sm outline-none w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#64748B] font-semibold block">คนส่งประจำสาย</label>
                    <input
                      type="text"
                      value={route.driverName || ''}
                      onChange={(e) => onUpdateRoute(route.id, { driverName: e.target.value })}
                      placeholder="ระบุชื่อคนส่ง"
                      className="text-xs font-semibold text-[#0284C7] bg-transparent border-b border-transparent focus:border-[#0284C7] focus:bg-white px-1 py-0.5 rounded-sm outline-none w-full"
                    />
                  </div>
                </div>

                {/* Route Type Selector */}
                <div className="shrink-0">
                  <label className="text-[10px] text-[#64748B] font-semibold block mb-0.5">ประเภทสาย</label>
                  <select
                    value={route.type || 'mobile'}
                    onChange={(e) => onUpdateRoute(route.id, { type: e.target.value as RouteType })}
                    className="text-[11px] font-bold text-[#1E3A5F] bg-white border border-[#CBD5E1] rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-[#0284C7] cursor-pointer"
                  >
                    <option value="mobile">รถกระบะ (ไม่มีหน้าร้าน)</option>
                    <option value="storefront">มีหน้าร้าน</option>
                  </select>
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => setDeletingId(deletingId === route.id ? null : route.id)}
                  className="p-2 text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-xl transition-colors cursor-pointer shrink-0"
                  title="ลบสายส่ง"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>

              {/* In-Modal Inline Confirm Delete Banner */}
              {deletingId === route.id && (
                <div className="p-2.5 bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl flex items-center justify-between gap-2 animate-fadeIn">
                  <span className="text-xs font-bold text-[#DC2626]">
                    ยืนยันต้องการลบสายส่ง "{route.name}" หรือไม่?
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setDeletingId(null)}
                      className="px-2.5 py-1 bg-white border border-[#CBD5E1] text-[#475569] text-xs font-bold rounded-lg cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmDelete(route.id, route.name)}
                      className="px-2.5 py-1 bg-[#DC2626] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-[#B91C1C]"
                    >
                      ยืนยันลบ
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add New Route Form */}
        <form onSubmit={handleAdd} className="pt-4 border-t border-[#E2E8F0] space-y-3">
          <h4 className="text-xs font-bold text-[#1E3A5F]">เพิ่มสายส่งใหม่</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-[#64748B]">ชื่อสายส่ง</label>
              <input
                type="text"
                placeholder="เช่น สายส่ง C (ฝั่งขวา)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0284C7] outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#64748B]">พนักงานส่งประจำสาย</label>
              <input
                type="text"
                placeholder="เช่น นายศักดิ์ชัย"
                value={newDriver}
                onChange={(e) => setNewDriver(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0284C7] outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-[#64748B]">ประเภทสาย</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as RouteType)}
                className="w-full mt-1 px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#1E3A5F] focus:ring-2 focus:ring-[#0284C7] outline-none cursor-pointer"
              >
                <option value="mobile">รถกระบะ (ไม่มีหน้าร้าน) — จบงานจอดที่หน้าร้านใหญ่</option>
                <option value="storefront">มีหน้าร้าน</option>
              </select>
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
              เพิ่มสายส่ง
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
