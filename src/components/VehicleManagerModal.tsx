import React, { useState } from 'react';
import { Vehicle } from '../types';

interface VehicleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  onAddVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  onUpdateVehicle: (id: string, updated: Partial<Vehicle>) => void;
  onDeleteVehicle: (id: string) => void;
  onShowToast: (msg: string) => void;
}

export const VehicleManagerModal: React.FC<VehicleManagerModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  onAddVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onShowToast,
}) => {
  const [newPlate, setNewPlate] = useState('');
  const [newNote, setNewNote] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate.trim()) {
      onShowToast('กรุณากรอกทะเบียนรถ');
      return;
    }

    onAddVehicle({ plateNumber: newPlate.trim(), note: newNote.trim() || undefined });
    setNewPlate('');
    setNewNote('');
    onShowToast(`เพิ่มรถทะเบียน "${newPlate}" เรียบร้อยแล้ว`);
  };

  const handleConfirmDelete = (id: string, plate: string) => {
    onDeleteVehicle(id);
    setDeletingId(null);
    onShowToast(`ลบรถทะเบียน "${plate}" เรียบร้อยแล้ว`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-[#BAE6FD] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E0F2FE] flex items-center justify-center text-[#0284C7]">
              <span className="material-symbols-outlined text-xl">local_shipping</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1E3A5F]">จัดการรถกระบะ/ซาเล้ง</h3>
              <p className="text-xs text-[#64748B]">เพิ่ม ลบ แก้ไขทะเบียนรถ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:bg-[#F1F5F9] rounded-full transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3 no-scrollbar">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
            รถทั้งหมด ({vehicles.length})
          </h4>

          {vehicles.length === 0 && (
            <p className="text-sm text-[#94A3B8] text-center py-6">ยังไม่มีรถในระบบ</p>
          )}

          {vehicles.map((v) => (
            <div
              key={v.id}
              className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl hover:bg-[#F1F5F9] transition-all space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="grid grid-cols-2 gap-2 flex-1 min-w-0">
                  <div>
                    <label className="text-[10px] text-[#64748B] font-semibold block">ทะเบียนรถ</label>
                    <input
                      type="text"
                      value={v.plateNumber}
                      onChange={(e) => onUpdateVehicle(v.id, { plateNumber: e.target.value })}
                      className="font-bold text-sm text-[#1E3A5F] bg-transparent border-b border-transparent focus:border-[#0284C7] focus:bg-white px-1 py-0.5 rounded-sm outline-none w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#64748B] font-semibold block">หมายเหตุ</label>
                    <input
                      type="text"
                      value={v.note || ''}
                      onChange={(e) => onUpdateVehicle(v.id, { note: e.target.value })}
                      placeholder="เช่น รถสาย A, ซาเล้งหน้าร้าน"
                      className="text-xs font-semibold text-[#0284C7] bg-transparent border-b border-transparent focus:border-[#0284C7] focus:bg-white px-1 py-0.5 rounded-sm outline-none w-full"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDeletingId(deletingId === v.id ? null : v.id)}
                  className="p-2 text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-xl transition-colors cursor-pointer shrink-0"
                  title="ลบรถ"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>

              {deletingId === v.id && (
                <div className="p-2.5 bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl flex items-center justify-between gap-2 animate-fadeIn">
                  <span className="text-xs font-bold text-[#DC2626]">
                    ยืนยันต้องการลบทะเบียน "{v.plateNumber}" หรือไม่?
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
                      onClick={() => handleConfirmDelete(v.id, v.plateNumber)}
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

        <form onSubmit={handleAdd} className="pt-4 border-t border-[#E2E8F0] space-y-3">
          <h4 className="text-xs font-bold text-[#1E3A5F]">เพิ่มรถใหม่</h4>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="ทะเบียนรถ เช่น กข-1234"
              value={newPlate}
              onChange={(e) => setNewPlate(e.target.value)}
              className="w-full px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0284C7] outline-none"
            />
            <input
              type="text"
              placeholder="หมายเหตุ (ถ้ามี)"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="w-full px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0284C7] outline-none"
            />
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
              เพิ่มรถ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
