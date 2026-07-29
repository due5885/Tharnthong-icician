import React, { useState } from 'react';
import { AdminUser, RoleLevel } from '../types';

interface ManageAdminsModalProps {
  isOpen: boolean;
  onClose: () => void;
  admins: AdminUser[];
  activeAdminId: string | null;
  onAddAdmin: (name: string, role: string, roleLevel: RoleLevel, pin: string) => void;
  onUpdateAdmin: (id: string, updated: Partial<AdminUser>) => void;
  onDeleteAdmin: (id: string) => void;
  onShowToast: (msg: string) => void;
}

const ROLE_LABELS: Record<RoleLevel, string> = {
  owner: 'เจ้าของร้าน',
  accountant: 'ฝ่ายบัญชี',
  staff: 'พนักงานส่ง',
};

const ROLE_BADGE_CLASS: Record<RoleLevel, string> = {
  owner: 'bg-[#0284C7] text-white',
  accountant: 'bg-[#7C3AED] text-white',
  staff: 'bg-[#E2E8F0] text-[#64748B]',
};

export const ManageAdminsModal: React.FC<ManageAdminsModalProps> = ({
  isOpen,
  onClose,
  admins,
  activeAdminId,
  onAddAdmin,
  onUpdateAdmin,
  onDeleteAdmin,
  onShowToast,
}) => {
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('พนักงานกะ / คนส่ง');
  const [newRoleLevel, setNewRoleLevel] = useState<RoleLevel>('staff');
  const [newPin, setNewPin] = useState('');

  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [pinDraft, setPinDraft] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    if (newPin.length < 4 || isNaN(Number(newPin))) {
      onShowToast('รหัส PIN ต้องเป็นตัวเลขอย่างน้อย 4 หลัก');
      return;
    }
    onAddAdmin(newName.trim(), newRole.trim() || 'พนักงาน', newRoleLevel, newPin);
    setNewName('');
    setNewPin('');
    setNewRoleLevel('staff');
    onShowToast(`เพิ่มผู้ใช้งาน "${newName.trim()}" เรียบร้อยแล้ว`);
  };

  const handleDelete = (id: string, name: string) => {
    if (admins.length <= 1) {
      onShowToast('ไม่สามารถลบได้ ต้องมีผู้ใช้งานอย่างน้อย 1 ท่าน');
      return;
    }
    if (confirm(`คุณต้องการลบรายชื่อผู้ใช้งาน "${name}" หรือไม่?`)) {
      onDeleteAdmin(id);
      onShowToast(`ลบรายชื่อ "${name}" เรียบร้อยแล้ว`);
    }
  };

  const startEditPin = (admin: AdminUser) => {
    setEditingPinId(admin.id);
    setPinDraft('');
  };

  const handleSavePin = (id: string) => {
    if (pinDraft.length < 4 || isNaN(Number(pinDraft))) {
      onShowToast('รหัส PIN ต้องเป็นตัวเลขอย่างน้อย 4 หลัก');
      return;
    }
    onUpdateAdmin(id, { pin: pinDraft });
    setEditingPinId(null);
    onShowToast('เปลี่ยนรหัส PIN เรียบร้อยแล้ว');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-[#D2E0EB] shadow-2xl relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#64748B] hover:text-[#1E293B] p-1 rounded-full cursor-pointer"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h3 className="text-xl font-bold text-[#1E3A5F] mb-1 flex items-center gap-2 font-sans">
          <span className="material-symbols-outlined text-[#0284C7]">manage_accounts</span>
          จัดการผู้ใช้งานและสิทธิ์
        </h3>
        <p className="text-xs text-[#64748B] mb-4">
          กำหนดบทบาท (เจ้าของ/บัญชี/พนักงานส่ง) และรหัส PIN ส่วนตัวสำหรับ login ของแต่ละคน
        </p>

        {/* Existing Admin List */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1 mb-4 no-scrollbar">
          {admins.map((admin) => {
            const isActive = admin.id === activeAdminId;

            return (
              <div
                key={admin.id}
                className={`p-3 rounded-xl border transition-all ${
                  isActive ? 'border-[#0284C7] bg-[#E0F2FE]/50' : 'border-[#D2E0EB] bg-[#F8FAFC]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${ROLE_BADGE_CLASS[admin.roleLevel]}`}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {admin.roleLevel === 'owner' ? 'admin_panel_settings' : 'person'}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={admin.name}
                          onChange={(e) => onUpdateAdmin(admin.id, { name: e.target.value })}
                          className="font-bold text-sm text-[#1E293B] bg-transparent border-b border-transparent focus:border-[#0284C7] focus:bg-white px-0.5 outline-none min-w-0"
                        />
                        {isActive && (
                          <span className="text-[10px] font-bold bg-[#0284C7] text-white px-2 py-0.5 rounded-full shrink-0">
                            กำลังใช้งาน
                          </span>
                        )}
                      </div>
                      <select
                        value={admin.roleLevel}
                        onChange={(e) =>
                          onUpdateAdmin(admin.id, { roleLevel: e.target.value as RoleLevel })
                        }
                        className="text-[11px] font-semibold text-[#64748B] bg-transparent outline-none cursor-pointer mt-0.5"
                      >
                        <option value="owner">{ROLE_LABELS.owner}</option>
                        <option value="accountant">{ROLE_LABELS.accountant}</option>
                        <option value="staff">{ROLE_LABELS.staff}</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditPin(admin)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-[#0284C7] bg-[#E0F2FE] hover:bg-[#BAE6FD] cursor-pointer"
                    >
                      เปลี่ยน PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(admin.id, admin.name)}
                      className="p-1.5 text-[#64748B] hover:text-[#DC2626] rounded-lg cursor-pointer transition-colors"
                      title="ลบรายชื่อ"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>

                {editingPinId === admin.id && (
                  <div className="mt-2 pt-2 border-t border-[#E2E8F0] flex items-center gap-2">
                    <input
                      type="password"
                      maxLength={12}
                      placeholder="PIN ใหม่ (4+ หลัก)"
                      value={pinDraft}
                      onChange={(e) => setPinDraft(e.target.value)}
                      className="w-32 px-3 py-1.5 rounded-lg border border-[#0284C7] text-sm text-center font-bold data-mono bg-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSavePin(admin.id)}
                      className="px-3 py-1.5 bg-[#0284C7] text-white font-bold text-xs rounded-lg hover:bg-[#0369A1] cursor-pointer"
                    >
                      บันทึก
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPinId(null)}
                      className="px-3 py-1.5 text-xs font-bold text-[#64748B] cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Form to Add New User */}
        <form onSubmit={handleAdd} className="pt-3 border-t border-[#D2E0EB] space-y-3">
          <span className="block text-xs font-bold text-[#1E293B]">+ เพิ่มผู้ใช้งานใหม่</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="ชื่อผู้ใช้งาน..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#D2E0EB] text-sm focus:ring-2 focus:ring-[#1E3A5F] text-[#1E293B]"
              required
            />
            <input
              type="text"
              placeholder="หน้าที่ / ตำแหน่ง..."
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#D2E0EB] text-sm focus:ring-2 focus:ring-[#1E3A5F] text-[#1E293B]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={newRoleLevel}
              onChange={(e) => setNewRoleLevel(e.target.value as RoleLevel)}
              className="px-3 py-2 rounded-xl border border-[#D2E0EB] text-sm font-bold text-[#1E3A5F] cursor-pointer"
            >
              <option value="owner">{ROLE_LABELS.owner}</option>
              <option value="accountant">{ROLE_LABELS.accountant}</option>
              <option value="staff">{ROLE_LABELS.staff}</option>
            </select>
            <input
              type="password"
              maxLength={12}
              placeholder="PIN (4+ หลัก)"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#D2E0EB] text-sm text-center font-bold data-mono focus:ring-2 focus:ring-[#1E3A5F]"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#D2E0EB] text-xs font-bold text-[#1E293B] hover:bg-[#F1F5F9] cursor-pointer"
            >
              ปิด
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#1E3A5F] text-white text-xs font-bold hover:bg-[#152C4A] active:scale-95 transition-all cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              เพิ่มผู้ใช้งาน
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
